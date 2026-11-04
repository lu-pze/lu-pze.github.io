// The state src/assignments.js starts with, before anything has changed it. The other assignment
// suites reset these globals in beforeEach, so they cannot see the initial values.
const { loadApp, global_value } = require('./helpers/load_app');

beforeAll(() => loadApp());

test('assignments are off, no assignment is selected and nothing is done', () => {
  expect(global_value('assignments_enabled')).toBe(false);
  expect(global_value('current_assignment')).toBe('none');
  expect(global_value('done_tasks')).toEqual([]);
  expect(global_value('nof_assignments_done')).toBe(0);
  expect(global_value('assignment_grade')).toBe(0);
});
