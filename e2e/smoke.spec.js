// Browser smoke tests: catch broken <script> order, missing globals and
// runtime errors that jsdom stubs cannot show.
const { test, expect } = require('@playwright/test');
const { block_production, open_app, start_from_splash } = require('./helpers');

test.beforeEach(async ({ page }) => block_production(page));

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

test.describe('the tracking checkbox on the splash screen', () => {
  const POST_DELAY = 6500; // add_event sends after 5 seconds
  const events_sent = (page) => {
    const sent = [];
    page.on('request', (request) => {
      if (request.url().includes('lu-pze.php')) sent.push(request.postData());
    });
    return sent;
  };
  const cookie_names = async (page) => (await page.context().cookies()).map((cookie) => cookie.name);

  test('with the box ticked, events are sent', async ({ page }) => {
    const sent = events_sent(page);
    await open_app(page);
    await page.waitForTimeout(POST_DELAY);
    expect(sent.length).toBeGreaterThan(0);
  });

  test('turning it off drops the queue and the id, and is remembered', async ({ page }) => {
    const sent = events_sent(page);
    const errors = await open_app(page);
    await page.locator('#tracking_checkbox').uncheck();
    expect(await cookie_names(page)).toContain('tracking_off');
    expect(await cookie_names(page)).not.toContain('cookid');
    await page.waitForTimeout(POST_DELAY);
    expect(sent).toEqual([]);

    await page.reload();
    await page.waitForSelector('#sketch_holder canvas');
    await expect(page.locator('#tracking_checkbox')).not.toBeChecked();
    await page.waitForTimeout(POST_DELAY);
    expect(sent).toEqual([]);

    await page.locator('#tracking_checkbox').check();
    expect(await cookie_names(page)).not.toContain('tracking_off');
    expect(await cookie_names(page)).toContain('cookid');
    expect(errors).toEqual([]);
  });
});

