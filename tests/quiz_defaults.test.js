// The state src/quiz.js starts with, before anything has changed it. The other quiz suites reset
// these globals in beforeEach, so they cannot see the initial values.
// Cases added after Stryker mutation testing (npm run test:mutation) showed that no test noticed
// these changes to src/quiz.js.
const { loadApp, global_value } = require('./helpers/load_app');

beforeAll(() => loadApp());

test('the quiz is off and nothing has been asked yet', () => {
  expect(global_value('quiz_enabled')).toBe(false);
  expect(global_value('current_quiz')).toBe('none');
  expect(global_value('quiz_no')).toBe(0);
  expect(global_value('quiz_is_running')).toBe(0);
  expect(global_value('quiz_compete')).toBe(false);
  expect(global_value('quiz_practice')).toBe(false);
  expect(global_value('quiz_seconds_left')).toBe(-1);
  expect(global_value('quiz_timeline')).toEqual([]);
  expect(global_value('quiz_started_at')).toBeNull();
});

test('the score counters start at zero', () => {
  for (const name of ['quiz_nof_done', 'quiz_nof_tries', 'quiz_current_streak', 'quiz_longest_streak', 'quiz_nof_correct']) {
    expect(global_value(name)).toBe(0);
  }
});

test('the targets to click start at -1 (nothing requested)', () => {
  expect(global_value('quiz_nyquist_angle_to_click')).toBe(-1);
  expect(global_value('quiz_system_to_click')).toBe(-1);
  expect(global_value('quiz_click_wrong')).toBe(-1);
});

test('the difficulty starts at 50 with adaptive difficulty on and no question type chosen', () => {
  expect(global_value('quiz_difficulty')).toBe(50);
  expect(global_value('quiz_experience')).toBe(50);
  expect(global_value('adaptive_difficulty_enabled')).toBe(true);
  expect(global_value('enabled_quiz_types')).toEqual({});
  expect(global_value('quiz_difficulties')).toEqual({});
  expect(global_value('cap_grade')).toBe(0);
});
