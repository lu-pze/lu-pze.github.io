// Shared helpers for the Playwright specs.
const { expect } = require('@playwright/test');

// Never talk to the production logging/highscore server from tests. Call from test.beforeEach.
async function block_production(page) {
  await page.route(/livet\.se/, (route) => route.abort());
}

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

// Moves the real mouse to a position given in p5 canvas coordinates (what mouseX/mouseY hold).
async function move_to_canvas(page, x, y, options) {
  const box = await page.locator('#sketch_holder canvas').boundingBox();
  await page.mouse.move(box.x + x, box.y + y, options);
}

module.exports = { block_production, open_app, start_from_splash, move_to_canvas };
