/** @jest-environment jsdom */
// Tests for the assignment logic in src/assignments.js and the task checks that complete
// assignment tasks (mouseReleased in src/mouse_pressed.js, the typed-in slider value in
// src/graph_ui.js), plus how the PID controller's zeros are drawn (src/bode_graph.js).
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = ['add_event', 'play_jingle', 'achievement_done', 'show_answer_to_task', 'redraw_canvas_gain'];
const originals = {};

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
  const alphabet = global_value('range_slider_alphabet');
  const variable_position = global_value('variable_position');
  alphabet.forEach((name, i) => { variable_position[name] = i; });
});

// Every slider gets its default value. In the PID assignments createRangeSlider starts T_1 at 6.0.
function set_default_sliders({ T_1 = 0.6 } = {}) {
  const defaults = global_value('default_variable_values');
  const variable_position = global_value('variable_position');
  const variables = global_value('range_slider_variables');
  for (const [name, { value }] of Object.entries(defaults)) {
    if (name in variable_position) variables[variable_position[name]] = value;
  }
  variables[variable_position.T_1] = T_1;
}

function set_sliders(values) {
  const variable_position = global_value('variable_position');
  const variables = global_value('range_slider_variables');
  for (const [name, value] of Object.entries(values)) variables[variable_position[name]] = value;
}

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  set_globals({
    assignments_enabled: true, current_assignment: 'none', done_tasks: [], quiz_is_running: 0,
    sound_enabled: false, improvement_enabled: false, assignment_grade: 0, bode_graphs: [],
    we_need_faster_calculations_right_now: false,
    clicked_on_time_response_graph_no: -1, clicked_on_bode_mag_graph_no: -1,
    clicked_on_bode_phase_graph_no: -1, clicked_on_pole_zero_graph_no: -1,
  });
  set_default_sliders();
  window.mouseX = 0;
  window.mouseY = 0;
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
});

const done = () => global_value('done_tasks');

describe('PID tasks checked on mouse release', () => {
  beforeEach(() => set_default_sliders({ T_1: 6.0 }));

  test.each(['pid_controller', 'pid_controller_YL'])('no task in %s is done at the default slider values', (assignment) => {
    set_globals({ current_assignment: assignment });
    window.mouseReleased();
    expect(done()).toEqual([]);
  });

  // The T_i zero of the controller lies left of the system's pole in the Bode plot when T_i > T_1.
  test.each([[6.0, false], [6.01, true]])('PID_(T_i)>(T_1) with T_i=%s and T_1=6: done=%s', (T_i, expected) => {
    set_globals({ current_assignment: 'pid_controller' });
    set_sliders({ T_i });
    window.mouseReleased();
    expect(done().includes('PID_(T_i)>(T_1)')).toBe(expected);
  });

  test.each([{ K: 1.01 }, { T_i: 0.99 }, { T_d: 0.01 }])('PID_Load is done when only %o changes', (change) => {
    set_globals({ current_assignment: 'pid_controller_YL' });
    set_sliders(change);
    window.mouseReleased();
    expect(done()).toContain('PID_Load');
  });
});

describe('typing a slider value for the resonance-peak task', () => {
  // A real z slider, so that the onchange handler of its text field is the one the app uses.
  let text_field;
  beforeAll(() => {
    const z_index = global_value('variable_position').z;
    // The button id is split on "_", so the formula id must not contain one.
    window.createRangeSlider({ target: { id: `BTNS_999_${z_index}`, remove: () => {} } });
    text_field = document.getElementById(`variable_${z_index}`);
  });

  test.each([[0.019, false], [0.02, true], [0.05, true], [0.07, true], [0.071, false], [0.5, false]])(
    'w=8, k_3=1, z=%s: done=%s', (z, expected) => {
      set_globals({ current_assignment: 'two_complex_poles' });
      set_sliders({ w: 8, k_3: 1, z });
      text_field.onchange();
      expect(done().includes('w=8,z=0.05,k_3=1')).toBe(expected);
    });
});

describe('task_done', () => {
  test('keeps the popup inside the window at the bottom edge', () => {
    set_globals({ current_assignment: 'one_pole' });
    window.mouseX = 0.1 * window.windowWidth;
    window.mouseY = 0.95 * window.windowHeight;
    window.task_done('T1=2');
    const popup = document.querySelector('.achievement_text').style;
    expect(popup.getPropertyValue('--top')).toBe('90%');
    expect(popup.getPropertyValue('--left')).toBe('10%');
  });
});

describe('update_tasks', () => {
  test('the badge shows the new grade', () => {
    // 5 of the 30 tasks is 16.7 %, which is bronze (grade 1).
    set_globals({ current_assignment: 'one_pole', done_tasks: global_value('all_assignments').one_pole.tasks });
    window.update_tasks();
    expect(global_value('assignment_grade')).toBe(1);
    expect(document.getElementById('assignment_0').getAttribute('src')).toBe('images/assignment_1.webp');
  });

  test('the link of a finished assignment opens the assignments window', () => {
    set_globals({ current_assignment: 'time_delay', done_tasks: global_value('all_assignments').time_delay.tasks });
    window.update_tasks();
    document.querySelector('#task_list .clickable-link').click();
    expect(document.querySelector('.assignments_box').classList.contains('active')).toBe(true);
  });
});

describe('update_assignments', () => {
  const MESSAGES = [
    'Better get started!', "You're getting up to speed!", 'So get on with the next one!', 'Good job!',
    "You're halfway there!", 'Keep going!', 'You can smell the finish line!', 'Only one left!', "You're a legend!",
  ];
  test.each(MESSAGES.map((message, n) => [n, message]))('%i of 8 assignments done: "%s"', (n, message) => {
    const assignments = global_value('all_assignments');
    const finished = Object.keys(assignments).filter((id) => id !== 'none').slice(0, n);
    set_globals({ done_tasks: finished.flatMap((id) => assignments[id].tasks) });
    window.update_assignments();
    const text = document.querySelector('.assignments_box').textContent;
    expect(text).toContain(`${n}/8 done so far. ${message}`);
  });
});

describe('PID controller pole-zero map', () => {
  test('draws the integrator pole at 0, and -1/T_i and -1/T_d as zeros', () => {
    set_sliders({ T_i: 2, T_d: 0.5 });
    const graph = Object.create(global_value('bode_graph').prototype);
    Object.assign(graph, { bode_formula: global_value('GRAPH_PID').formula, bode_hue: 0 });
    graph.plot_pole = jest.fn();
    graph.plot_zero = jest.fn();
    graph.draw_pole_zero(false);
    expect(graph.plot_pole.mock.calls).toEqual([[0, 0]]);
    expect(graph.plot_zero.mock.calls).toEqual([[-0.5, 0], [-2, 0]]);
  });
});
