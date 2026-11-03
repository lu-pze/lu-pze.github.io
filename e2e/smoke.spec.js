// Browser smoke tests: catch broken <script> order, missing globals and
// runtime errors that jsdom stubs cannot show.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // Never talk to the production logging/highscore server from tests.
  await page.route(/livet\.se/, (route) => route.abort());
});

// Opens the page and returns the list of uncaught errors seen so far.
async function open_app(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // The aborted livet.se requests show up as failed-resource errors.
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
      errors.push(message.text());
    }
  });
  await page.goto('/index.html');
  await page.waitForSelector('#sketch_holder canvas');
  return errors;
}

// The first click only removes the splash screen, which then adds the starting graphs.
async function start_from_splash(page) {
  await page.locator('#sketch_holder canvas').click();
  await expect.poll(() => page.evaluate(() => bode_graphs.length)).toBe(4);
}

test('loads without errors and adds the starting graphs after the splash click', async ({ page }) => {
  const errors = await open_app(page);
  expect(await page.evaluate(() => splash_screen_active)).toBe(true);
  await start_from_splash(page);
  expect(await page.evaluate(() => splash_screen_active)).toBe(false);
  expect(errors).toEqual([]);
});

test('canvas is not blank', async ({ page }) => {
  await open_app(page);
  await start_from_splash(page);
  await page.waitForTimeout(500); // let a few frames draw
  const distinct_colors = await page.evaluate(() => {
    const canvas = document.querySelector('#sketch_holder canvas');
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const colors = new Set();
    for (let i = 0; i < data.length; i += 4 * 97) colors.add(data.slice(i, i + 4).join(','));
    return colors.size;
  });
  expect(distinct_colors).toBeGreaterThan(5);
});

test('adding a graph creates an equation field and a bode_graph', async ({ page }) => {
  const errors = await open_app(page);
  await start_from_splash(page);
  const before = await page.evaluate(() => bode_graphs.length);
  await page.locator('button.add-graph').click();
  await expect.poll(() => page.evaluate(() => bode_graphs.length)).toBe(before + 1);
  await expect(page.locator('.equations math-field.formula:not(#input-formula)')).toHaveCount(before + 1);
  expect(errors).toEqual([]);
});

test('quiz window opens', async ({ page }) => {
  const errors = await open_app(page);
  await page.evaluate(() => start_quiz());
  await expect(page.locator('.quiz_intro')).toHaveClass(/active/);
  expect(errors).toEqual([]);
});
