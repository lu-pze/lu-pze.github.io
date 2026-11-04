// The state src/feedback.js starts with, before anything has changed it. The feedback suite resets
// these globals in beforeEach, so it cannot see the initial values.
// Cases added after Stryker mutation testing (npm run test:mutation) showed that no test noticed
// these changes to src/feedback.js.
const { loadApp, global_value } = require('./helpers/load_app');

beforeAll(() => loadApp());

test('no question has been answered and no compete quiz has been done', () => {
  expect(global_value('done_fb')).toEqual([]);
  expect(global_value('have_done_a_compete_quiz')).toBe(false);
  expect(global_value('feedback_is_visible')).toBe(0);
});
