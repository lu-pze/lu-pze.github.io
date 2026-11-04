// The state src/mouse_pressed.js starts with, before anything has changed it. The other mouse suites
// reset these globals in beforeEach, so they cannot see the initial values.
// Cases added after Stryker mutation testing (npm run test:mutation) showed that no test noticed
// these changes to src/mouse_pressed.js.
const { loadApp, global_value } = require('./helpers/load_app');

beforeAll(() => loadApp());

test('nothing has been pressed yet', () => {
  for (const name of [
    'clicked_on_time_response_graph_no', 'clicked_on_bode_mag_graph_no',
    'clicked_on_bode_phase_graph_no', 'clicked_on_pole_zero_graph_no',
  ]) {
    expect(global_value(name)).toBe(-1);
  }
  expect(global_value('clicked_on_time_variable')).toBe('');
  expect(global_value('initial_mouseX')).toBe(0);
  expect(global_value('initial_mouseY')).toBe(0);
});

test('the splash screen is shown and the device is assumed not to be a touch device', () => {
  expect(global_value('splash_screen_active')).toBe(true);
  expect(global_value('this_is_a_touch_device')).toBe(false);
});

test('the third Bode point starts at -1 + 0.5j', () => {
  expect(global_value('bode_3_real')).toBe(-1);
  expect(global_value('bode_3_imaginary')).toBe(0.5);
});
