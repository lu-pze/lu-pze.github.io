/** @jest-environment jsdom */
// Tests for src/mouse_drag.js: mouseDragged() and the helpers it uses (drag_T_in_Bode, drag_k_in_Bode,
// drag_T_in_step_response, drag_k_in_step_response, set_T_in_pz_map, redraw_canvas_gain_for_variables).
// Each test starts a drag the way mousePressed() does (clicked_on_* globals and initial_mouseX/Y),
// moves the mouse to a point and checks the slider variables, the DOM fields, the achievements
// and which graphs were recalculated.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = ['achievement_done', 'redraw_canvas_gain', 'handle_questions', 'draw', 'draw_hover_nyquist'];
const originals = {};

// One graph per preset the drag code knows about, in this order. bode_id is 'id_<NAME>'.
const PRESETS = [
  'GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TWO_COMPLEX_POLES', 'GRAPH_TIME_DELAY',
  'GRAPH_ONE_ZERO_TWO_POLES', 'GRAPH_FOUR_POLES', 'GRAPH_ONE_ZERO', 'GRAPH_PID',
];
const index_of = (preset) => PRESETS.indexOf(preset);
const id_of = (preset) => 'id_' + preset;

// Sliders are 100 x 100 pixels, so one pixel of mouse movement is 0.01 in mouseDiffX / mouseDiffY.
// Pole-zero map i spans x in [100, 180] and y in [100 * i, 100 * i + 80]: real = (dx / 80) * 4 - 3, imaginary = 2 - (dy / 80) * 4.
const MAP_X = 100;
const MAP_SIZE = 80;
const map_y = (preset) => 100 * index_of(preset);
const GEOMETRY = {
  graph_step_response_width: 100, graph_step_response_height: 100,
  min_y_timerep: 0, max_y_timerep: 20,
  pole_zero_width: MAP_SIZE, pole_zero_height: MAP_SIZE,
  pole_zero_graph_x: PRESETS.map(() => MAP_X), pole_zero_graph_y: PRESETS.map((_, i) => 100 * i),
  graph_nyquist_x: 1000, graph_nyquist_y: 1000, graph_nyquist_width: 200, graph_nyquist_height: 150,
};

const position = (name) => global_value('variable_position')[name];
const get = (name) => global_value('range_slider_variables')[position(name)];
const set = (values) => {
  for (const [name, value] of Object.entries(values)) global_value('range_slider_variables')[position(name)] = value;
};
const text_field = (name) => document.getElementById('variable_' + position(name)).value;
const range_field = (name) => document.getElementById('RANGE_' + position(name)).value;
const achievements = () => window.achievement_done.mock.calls.map(([name]) => name);
const redrawn = () => window.redraw_canvas_gain.mock.calls.map(([id]) => id);

// Presses on a plot (clicked_on_* as mousePressed leaves them) at `from`, then drags to `to`.
function drag({ time = null, mag = null, phase = null, variable = '', from = [0, 0], to }) {
  const no = (preset) => (preset === null ? -1 : index_of(preset));
  set_globals({
    clicked_on_time_response_graph_no: no(time), clicked_on_bode_mag_graph_no: no(mag),
    clicked_on_bode_phase_graph_no: no(phase), clicked_on_time_variable: variable,
    initial_mouseX: from[0], initial_mouseY: from[1],
  });
  window.mouseX = to[0];
  window.mouseY = to[1];
  return window.mouseDragged();
}

// Drags inside the pole-zero map of `preset` to the point (real, imaginary)'s pixel, given as offsets inside the map.
function drag_in_map(preset, dx, dy, variable = '') {
  return drag({ variable, to: [MAP_X + dx, map_y(preset) + dy] });
}
// Pixel offsets (inside an 80 x 80 map) of a real part, with imaginary part 1.
const dx_for_real = (real, size = MAP_SIZE) => Math.round(((real + 3) / 4) * size);

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
  const alphabet = global_value('range_slider_alphabet');
  const variable_position = global_value('variable_position');
  alphabet.forEach((name, i) => {
    variable_position[name] = i;
    for (const prefix of ['variable_', 'RANGE_']) {
      const field = document.createElement('input');
      field.id = prefix + i;
      document.body.appendChild(field);
    }
  });
});

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  set_globals({
    ...GEOMETRY, improvement_enabled: false, questions_enabled: false, quiz_is_running: 0,
    direction_of_T_drag: 0, bode_3_real: -1, bode_3_imaginary: 0.5,
    clicked_on_time_response_graph_no: -1, clicked_on_bode_mag_graph_no: -1, clicked_on_bode_phase_graph_no: -1,
    bode_graphs: PRESETS.map((preset) => ({
      bode_formula: global_value(preset).formula, bode_id: id_of(preset), bode_displaybool: true,
    })),
  });
  window.mouseButton = 'left';
  const variables = global_value('range_slider_variables');
  variables.fill(1);
  for (const field of document.querySelectorAll('input[id^="variable_"], input[id^="RANGE_"]')) field.value = '';
  for (const element of document.querySelectorAll('.active')) element.classList.remove('active');
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
  jest.restoreAllMocks();
});

describe('helpers', () => {
  test('drag_T_in_Bode scales T by (1 - 10 * diff) and updates both fields', () => {
    set({ T_1: 2 });
    window.drag_T_in_Bode('T_1', 0.05);
    expect(get('T_1')).toBeCloseTo(1);
    expect(text_field('T_1')).toBe('1.00');
    expect(range_field('T_1')).toBe('1.00');
  });

  test('drag_T_in_Bode can flip the sign of T', () => {
    set({ T_1: 2 });
    window.drag_T_in_Bode('T_1', 0.2);
    expect(get('T_1')).toBeCloseTo(-2);
    expect(text_field('T_1')).toBe('-2.00');
  });

  test('drag_k_in_Bode scales k by (1 - 12 * diff) and updates both fields', () => {
    set({ k_1: 5 });
    window.drag_k_in_Bode('k_1', 0.05);
    expect(get('k_1')).toBeCloseTo(2);
    expect(text_field('k_1')).toBe('2.00');
    expect(range_field('k_1')).toBe('2.00');
  });

  test('drag_T_in_step_response follows the sign of T: dragging right grows |T|, also for negative T', () => {
    set({ T_1: 2, T_2: -2 });
    window.drag_T_in_step_response('T_1', 0.05);
    expect(get('T_1')).toBeCloseTo(2.5);
    expect(global_value('direction_of_T_drag')).toBe(1);

    set_globals({ direction_of_T_drag: 0 });
    window.drag_T_in_step_response('T_2', 0.05);
    expect(get('T_2')).toBeCloseTo(-2.5);
    expect(global_value('direction_of_T_drag')).toBe(-1);
    expect(text_field('T_2')).toBe('-2.50');
    expect(range_field('T_2')).toBe('-2.50');
  });

  test('drag_T_in_step_response treats T = 0 as positive and keeps the direction chosen earlier', () => {
    set({ T_1: 0, T_2: -3 });
    window.drag_T_in_step_response('T_1', 0.1);
    expect(get('T_1')).toBeCloseTo(1);
    expect(global_value('direction_of_T_drag')).toBe(1);
    // The direction is not recomputed for the next variable while a drag is in progress:
    window.drag_T_in_step_response('T_2', 0.1);
    expect(get('T_2')).toBeCloseTo(-2);
  });

  test('drag_k_in_step_response moves k down when the mouse moves down, scaled by the y range', () => {
    set({ k_1: 3 });
    window.drag_k_in_step_response('k_1', 0.1, 20);
    expect(get('k_1')).toBeCloseTo(1);
    expect(text_field('k_1')).toBe('1.00');
    expect(range_field('k_1')).toBe('1.00');
    window.drag_k_in_step_response('k_1', -0.1, 20);
    expect(get('k_1')).toBeCloseTo(3);
  });

  test('set_T_in_pz_map sets T = -1 / real', () => {
    window.set_T_in_pz_map('T_2', -0.5);
    expect(get('T_2')).toBeCloseTo(2);
    expect(text_field('T_2')).toBe('2');
    expect(range_field('T_2')).toBe('2');
    window.set_T_in_pz_map('T_2', 0.25);
    expect(get('T_2')).toBeCloseTo(-4);
    expect(text_field('T_2')).toBe('-4');
  });

  test('set_T_in_pz_map shows T rounded to two decimals', () => {
    window.set_T_in_pz_map('T_2', -3);
    expect(get('T_2')).toBeCloseTo(1 / 3);
    expect(text_field('T_2')).toBe('0.33');
    expect(range_field('T_2')).toBe('0.33');
  });

  describe('redraw_canvas_gain_for_variables', () => {
    const graph = (id, formula, bode_displaybool = true) => ({ bode_id: id, bode_formula: formula, bode_displaybool });

    test('recalculates exactly the displayed graphs whose formula uses one of the variables, once each', () => {
      set_globals({
        bode_graphs: [
          graph('a', 'k_1/(1+T_1*s)'),
          graph('hidden', 'k_1/(1+T_1*s)', false),
          graph('b', 'K + K / (s * T_i)'),
          graph('both', 'k_1*T_1*s'),
          graph('c', 'T_1*s'),
        ],
      });
      window.redraw_canvas_gain_for_variables(['k_1']);
      expect(redrawn()).toEqual(['a', 'both']);
      window.redraw_canvas_gain.mockClear();
      window.redraw_canvas_gain_for_variables(['k_1', 'T_1']);
      expect(redrawn()).toEqual(['a', 'both', 'c']);
      window.redraw_canvas_gain.mockClear();
      window.redraw_canvas_gain_for_variables(['K', 'T_i']);
      expect(redrawn()).toEqual(['b']);
    });

    test('does nothing for no variables or no graphs', () => {
      window.redraw_canvas_gain_for_variables([]);
      set_globals({ bode_graphs: [] });
      window.redraw_canvas_gain_for_variables(['k_1']);
      expect(redrawn()).toEqual([]);
    });
  });
});

describe('mouseDragged: which events are handled', () => {
  test('right button: only runs the help handler (when enabled), changes nothing', () => {
    window.mouseButton = 'right';
    set({ T_1: 2 });
    expect(drag({ time: 'GRAPH_ONE_REAL_POLE', to: [50, 50] })).toBeUndefined();
    expect(window.handle_questions).not.toHaveBeenCalled();

    set_globals({ questions_enabled: true });
    drag({ time: 'GRAPH_ONE_REAL_POLE', to: [50, 50] });
    expect(window.handle_questions).toHaveBeenCalledTimes(1);
    expect(get('T_1')).toBe(2);
    expect(achievements()).toEqual([]);
  });

  test('a drag that starts inside an open box is left to the browser and returns true', () => {
    set({ T_1: 2 });
    const toolbox = document.querySelector('.toolbox');
    toolbox.classList.add('active');
    toolbox.getBoundingClientRect = () => ({ left: 0, right: 50, top: 0, bottom: 50 });
    expect(drag({ time: 'GRAPH_ONE_REAL_POLE', to: [10, 10] })).toBe(true);
    expect(get('T_1')).toBe(2);
    expect(global_value('initial_mouseX')).toBe(0);
    // Outside the box the drag works as usual:
    drag({ time: 'GRAPH_ONE_REAL_POLE', to: [60, 60] });
    expect(get('T_1')).not.toBe(2);
    delete toolbox.getBoundingClientRect;
  });

  test('a box that is not active does not block the drag', () => {
    const toolbox = document.querySelector('.toolbox');
    toolbox.getBoundingClientRect = () => ({ left: 0, right: 50, top: 0, bottom: 50 });
    set({ T_1: 2 });
    expect(drag({ time: 'GRAPH_ONE_REAL_POLE', to: [10, 10] })).toBeUndefined();
    expect(get('T_1')).not.toBe(2);
    delete toolbox.getBoundingClientRect;
  });

  test('a drag in the step response takes priority over magnitude and phase, magnitude over phase', () => {
    set({ T_1: 2 });
    drag({ time: 'GRAPH_ONE_REAL_POLE', mag: 'GRAPH_ONE_REAL_POLE', phase: 'GRAPH_ONE_REAL_POLE', to: [5, 0] });
    expect(get('T_1')).toBeCloseTo(2.5); // step response: additive
    expect(achievements()).toEqual([]);

    set({ T_1: 2 });
    drag({ mag: 'GRAPH_ONE_REAL_POLE', phase: 'GRAPH_ONE_REAL_POLE', to: [5, 0] });
    expect(get('T_1')).toBeCloseTo(1); // magnitude: multiplicative
    expect(achievements()).toContain('drag_bode_mag');
    expect(achievements()).not.toContain('drag_bode_phase');
  });

  test('each handled drag ends by remembering the mouse position as the start of the next move', () => {
    drag({ time: 'GRAPH_ONE_REAL_POLE', from: [3, 4], to: [30, 40] });
    expect([global_value('initial_mouseX'), global_value('initial_mouseY')]).toEqual([30, 40]);
    drag({ mag: 'GRAPH_ONE_REAL_POLE', from: [3, 4], to: [31, 41] });
    expect([global_value('initial_mouseX'), global_value('initial_mouseY')]).toEqual([31, 41]);
    drag({ phase: 'GRAPH_ONE_REAL_POLE', from: [3, 4], to: [32, 42] });
    expect([global_value('initial_mouseX'), global_value('initial_mouseY')]).toEqual([32, 42]);
  });

  test('a drag on a graph with no drag handling changes nothing but still advances the start position', () => {
    const before = [...global_value('range_slider_variables')];
    drag({ time: 'GRAPH_ONE_ZERO', from: [0, 0], to: [20, 20] });
    drag({ mag: 'GRAPH_TIME_DELAY', from: [0, 0], to: [20, 20] });
    drag({ phase: 'GRAPH_TIME_DELAY', from: [0, 0], to: [20, 20] });
    expect(global_value('range_slider_variables')).toEqual(before);
    expect(achievements()).toEqual([]);
    expect(redrawn()).toEqual([]);
  });
});

describe('mouseDragged in the step response', () => {
  test('one real pole: T_1 grows 0.1 per pixel to the right, k_1 drops with y, recalculates graphs that use them', () => {
    set({ T_1: 2, k_1: 3 });
    drag({ time: 'GRAPH_ONE_REAL_POLE', from: [10, 10], to: [15, 20] }); // diff (0.05, 0.1), y range 20
    expect(get('T_1')).toBeCloseTo(2.5);
    expect(get('k_1')).toBeCloseTo(1);
    expect(text_field('T_1')).toBe('2.50');
    expect(range_field('k_1')).toBe('1.00');
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_REAL_POLE')]);
    expect(achievements()).toEqual([]);
    expect([global_value('initial_mouseX'), global_value('initial_mouseY')]).toEqual([15, 20]);
  });

  test('one real pole: achievement k_above_or_equal_100 exactly at k = 100, not at 99.99', () => {
    set({ k_1: 99.99 });
    drag({ time: 'GRAPH_ONE_REAL_POLE', to: [0, 0] });
    expect(achievements()).toEqual([]);
    set({ k_1: 100 });
    drag({ time: 'GRAPH_ONE_REAL_POLE', to: [0, 0] });
    expect(achievements()).toEqual(['k_above_or_equal_100']);
  });

  test('one real pole: dragging up (negative dy) increases k', () => {
    set({ k_1: 99 });
    drag({ time: 'GRAPH_ONE_REAL_POLE', from: [0, 50], to: [0, 45] }); // diffY -0.05 * 20 = +1
    expect(get('k_1')).toBeCloseTo(100);
    expect(achievements()).toEqual(['k_above_or_equal_100']);
  });

  test('two real poles: changes the clicked time constant and k_2', () => {
    set({ T_2: 1, T_3: 2, k_2: 3 });
    drag({ time: 'GRAPH_TWO_REAL_POLES', variable: 'T_3', to: [10, 10] });
    expect(get('T_2')).toBe(1);
    expect(get('T_3')).toBeCloseTo(3);
    expect(get('k_2')).toBeCloseTo(1);
    expect(redrawn()).toEqual([id_of('GRAPH_TWO_REAL_POLES')]);
  });

  test.each([
    ['T_2 / T_3 = 0.01', { T_2: 1, T_3: 100 }, true],
    ['T_2 / T_3 just above 0.01', { T_2: 1, T_3: 99.99 }, false],
    ['T_2 / T_3 = 100', { T_2: 100, T_3: 1 }, true],
    ['T_2 / T_3 just below 100', { T_2: 99.99, T_3: 1 }, false],
    ['negative ratio uses the absolute value', { T_2: -100, T_3: 1 }, true],
  ])('two real poles: T2_T3_far_apart for %s', (_, values, expected) => {
    set(values);
    drag({ time: 'GRAPH_TWO_REAL_POLES', variable: 'T_2', to: [0, 0] });
    expect(achievements().includes('T2_T3_far_apart')).toBe(expected);
  });

  test('two real poles: k_above_or_equal_100 at the boundary', () => {
    set({ k_2: 99.99 });
    drag({ time: 'GRAPH_TWO_REAL_POLES', variable: 'T_2', to: [0, 0] });
    expect(achievements()).not.toContain('k_above_or_equal_100');
    set({ k_2: 100 });
    drag({ time: 'GRAPH_TWO_REAL_POLES', variable: 'T_2', to: [0, 0] });
    expect(achievements()).toContain('k_above_or_equal_100');
  });

  test('two complex poles: dragging right lengthens T = 1/w, down raises the damping z', () => {
    set({ w: 2, z: 0.5 });
    drag({ time: 'GRAPH_TWO_COMPLEX_POLES', to: [5, 10] }); // T = 0.5 + 0.5, z = 0.5 + 0.1 * 1.7
    expect(get('w')).toBeCloseTo(1);
    expect(get('z')).toBeCloseTo(0.67);
    expect(text_field('w')).toBe('1.00');
    expect(range_field('w')).toBe('1.00');
    expect(text_field('z')).toBe('0.67');
    expect(range_field('z')).toBe('0.67');
    expect(achievements()).toEqual(['drag_time_response']);
    expect(redrawn()).toEqual([id_of('GRAPH_TWO_COMPLEX_POLES')]);
  });

  test('two complex poles: T is clamped at 0.001 (w at most 1000)', () => {
    set({ w: 2, z: 0.5 });
    drag({ time: 'GRAPH_TWO_COMPLEX_POLES', to: [-100, 0] });
    expect(get('w')).toBeCloseTo(1000);
  });

  test('two complex poles: z is clamped to [0, 1.2] and low_z is awarded at z <= 0.1', () => {
    set({ w: 1, z: 0.5 });
    drag({ time: 'GRAPH_TWO_COMPLEX_POLES', to: [0, 100] });
    expect(get('z')).toBeCloseTo(1.2);
    expect(achievements()).not.toContain('low_z');

    drag({ time: 'GRAPH_TWO_COMPLEX_POLES', from: [0, 100], to: [0, 0] });
    expect(get('z')).toBe(0);
    expect(achievements()).toContain('low_z');
  });

  test.each([[0.1, true], [0.1001, false]])('two complex poles: z = %s gives low_z %s', (z, expected) => {
    set({ w: 1, z });
    drag({ time: 'GRAPH_TWO_COMPLEX_POLES', to: [0, 0] });
    expect(achievements().includes('low_z')).toBe(expected);
  });

  test('time delay: L grows with x, is clamped at 0, and awards change_L', () => {
    set({ L: 1 });
    drag({ time: 'GRAPH_TIME_DELAY', to: [5, 0] });
    expect(get('L')).toBeCloseTo(1.5);
    expect(text_field('L')).toBe('1.50');
    expect(range_field('L')).toBe('1.50');
    expect(achievements()).toEqual(['change_L']);
    expect(redrawn()).toEqual([id_of('GRAPH_TIME_DELAY')]);

    drag({ time: 'GRAPH_TIME_DELAY', from: [5, 0], to: [-50, 0] });
    expect(get('L')).toBe(0);
    expect(text_field('L')).toBe('0.00');

    set({ L: 0.05 });
    drag({ time: 'GRAPH_TIME_DELAY', from: [1, 0], to: [0, 0] }); // would be -0.05
    expect(get('L')).toBe(0);
  });

  test('one zero two poles: moves the clicked T and k_4 (T_8 may become negative)', () => {
    set({ T_8: 0.5, k_4: 3 });
    drag({ time: 'GRAPH_ONE_ZERO_TWO_POLES', variable: 'T_8', to: [-10, 10] });
    expect(get('T_8')).toBeCloseTo(-0.5);
    expect(text_field('T_8')).toBe('-0.50');
    expect(range_field('T_8')).toBe('-0.50');
    expect(get('k_4')).toBeCloseTo(1);
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_ZERO_TWO_POLES')]);
  });

  test.each(['T_6', 'T_7'])('one zero two poles: pole time constant %s is clamped at 0', (variable) => {
    set({ [variable]: 0.5 });
    drag({ time: 'GRAPH_ONE_ZERO_TWO_POLES', variable, to: [-10, 0] });
    expect(get(variable)).toBe(0);
    expect(text_field(variable)).toBe('0.00');
  });

  test('one zero two poles: a negative T_8 is dragged in the negative direction and sticks to it', () => {
    set({ T_8: -1 });
    drag({ time: 'GRAPH_ONE_ZERO_TWO_POLES', variable: 'T_8', to: [5, 0] });
    expect(get('T_8')).toBeCloseTo(-1.5);
    expect(global_value('direction_of_T_drag')).toBe(-1);
  });

  test('one zero two poles: k_above_or_equal_100 at the boundary', () => {
    set({ k_4: 99.99 });
    drag({ time: 'GRAPH_ONE_ZERO_TWO_POLES', variable: 'T_6', to: [0, 0] });
    expect(achievements()).toEqual([]);
    set({ k_4: 100 });
    drag({ time: 'GRAPH_ONE_ZERO_TWO_POLES', variable: 'T_6', to: [0, 0] });
    expect(achievements()).toEqual(['k_above_or_equal_100']);
  });

  test('four poles: T_5 and k_5', () => {
    set({ T_5: 2, k_5: 3 });
    drag({ time: 'GRAPH_FOUR_POLES', to: [5, 10] });
    expect(get('T_5')).toBeCloseTo(2.5);
    expect(get('k_5')).toBeCloseTo(1);
    expect(redrawn()).toEqual([id_of('GRAPH_FOUR_POLES')]);
  });

  test('four poles: k_above_or_equal_100 at the boundary', () => {
    set({ k_5: 99.99 });
    drag({ time: 'GRAPH_FOUR_POLES', to: [0, 0] });
    expect(achievements()).toEqual([]);
    set({ k_5: 100 });
    drag({ time: 'GRAPH_FOUR_POLES', to: [0, 0] });
    expect(achievements()).toEqual(['k_above_or_equal_100']);
  });
});

describe('mouseDragged in the Bode magnitude plot', () => {
  test('one real pole: T_1 and k_1 scale multiplicatively', () => {
    set({ T_1: 2, k_1: 5 });
    drag({ mag: 'GRAPH_ONE_REAL_POLE', to: [5, 5] });
    expect(get('T_1')).toBeCloseTo(1);
    expect(get('k_1')).toBeCloseTo(2);
    expect(text_field('T_1')).toBe('1.00');
    expect(range_field('k_1')).toBe('2.00');
    expect(achievements()).toEqual(['drag_bode_mag']);
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_REAL_POLE')]);
  });

  test('one real pole: k_above_or_equal_100 at the boundary', () => {
    set({ k_1: 99.99 });
    drag({ mag: 'GRAPH_ONE_REAL_POLE', to: [0, 0] });
    expect(achievements()).toEqual(['drag_bode_mag']);
    set({ k_1: 100 });
    drag({ mag: 'GRAPH_ONE_REAL_POLE', to: [0, 0] });
    expect(achievements()).toEqual(['drag_bode_mag', 'drag_bode_mag', 'k_above_or_equal_100']);
  });

  test('two real poles: the clicked T and k_2 scale; far-apart and big-k achievements', () => {
    set({ T_2: 1, T_3: 200, k_2: 100 });
    drag({ mag: 'GRAPH_TWO_REAL_POLES', variable: 'T_2', to: [5, 5] });
    expect(get('T_2')).toBeCloseTo(0.5);
    expect(get('T_3')).toBe(200);
    expect(get('k_2')).toBeCloseTo(40);
    expect(achievements()).toEqual(['drag_bode_mag', 'T2_T3_far_apart']);
    expect(redrawn()).toEqual([id_of('GRAPH_TWO_REAL_POLES')]);

    window.achievement_done.mockClear();
    set({ T_2: 1, T_3: 1, k_2: 100 });
    drag({ mag: 'GRAPH_TWO_REAL_POLES', variable: 'T_2', to: [0, 0] });
    expect(achievements()).toEqual(['drag_bode_mag', 'k_above_or_equal_100']);
  });

  test.each([
    [{ T_2: 1, T_3: 100 }, true], [{ T_2: 1, T_3: 99.99 }, false],
    [{ T_2: 100, T_3: 1 }, true], [{ T_2: 99.99, T_3: 1 }, false],
  ])('two real poles: T2_T3_far_apart for %j is %s', (values, expected) => {
    set(values);
    drag({ mag: 'GRAPH_TWO_REAL_POLES', variable: 'T_2', to: [0, 0] });
    expect(achievements().includes('T2_T3_far_apart')).toBe(expected);
  });

  test('two complex poles: w scales as 1 / (1 - 10 dx), z moves with y', () => {
    set({ w: 2, z: 0.5 });
    drag({ mag: 'GRAPH_TWO_COMPLEX_POLES', to: [5, 10] }); // T = 0.5 * 0.5, z = 0.5 + 0.17
    expect(get('w')).toBeCloseTo(4);
    expect(get('z')).toBeCloseTo(0.67);
    expect(text_field('w')).toBe('4.00');
    expect(range_field('z')).toBe('0.67');
    expect(achievements()).toEqual(['drag_bode_mag']);
    expect(redrawn()).toEqual([id_of('GRAPH_TWO_COMPLEX_POLES')]);
  });

  test('two complex poles: T is clamped at 0.0001, z to [0, 1.2], low_z when z <= 0.1', () => {
    set({ w: 2, z: 0.5 });
    drag({ mag: 'GRAPH_TWO_COMPLEX_POLES', to: [20, 100] }); // 1 - 10 * 0.2 = -1 -> negative T -> clamp
    expect(get('w')).toBeCloseTo(10000);
    expect(get('z')).toBeCloseTo(1.2);
    expect(achievements()).not.toContain('low_z');

    drag({ mag: 'GRAPH_TWO_COMPLEX_POLES', from: [0, 100], to: [0, 0] });
    expect(get('z')).toBe(0);
    expect(achievements()).toContain('low_z');
  });

  test.each([[0.1, true], [0.1001, false]])('two complex poles: z = %s gives low_z %s', (z, expected) => {
    set({ w: 1, z });
    drag({ mag: 'GRAPH_TWO_COMPLEX_POLES', to: [0, 0] });
    expect(achievements().includes('low_z')).toBe(expected);
  });

  test('one zero: T_4 only, no vertical movement', () => {
    set({ T_4: 2, k_4: 7 });
    drag({ mag: 'GRAPH_ONE_ZERO', to: [5, 50] });
    expect(get('T_4')).toBeCloseTo(1);
    expect(get('k_4')).toBe(7);
    expect(achievements()).toEqual(['drag_bode_mag']);
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_ZERO')]);
  });

  test('one zero two poles: the clicked T and k_4, big-k achievement at the boundary', () => {
    set({ T_7: 2, k_4: 100 });
    drag({ mag: 'GRAPH_ONE_ZERO_TWO_POLES', variable: 'T_7', to: [5, 0] });
    expect(get('T_7')).toBeCloseTo(1);
    expect(get('k_4')).toBe(100);
    expect(achievements()).toEqual(['drag_bode_mag', 'k_above_or_equal_100']);

    window.achievement_done.mockClear();
    set({ k_4: 99.99 });
    drag({ mag: 'GRAPH_ONE_ZERO_TWO_POLES', variable: 'T_7', to: [0, 0] });
    expect(achievements()).toEqual(['drag_bode_mag']);
    expect(redrawn()).toEqual(Array(2).fill(id_of('GRAPH_ONE_ZERO_TWO_POLES')));
  });

  test('four poles: T_5 and k_5', () => {
    set({ T_5: 2, k_5: 5 });
    drag({ mag: 'GRAPH_FOUR_POLES', to: [5, 5] });
    expect(get('T_5')).toBeCloseTo(1);
    expect(get('k_5')).toBeCloseTo(2);
    expect(achievements()).toEqual(['drag_bode_mag']);
    expect(redrawn()).toEqual([id_of('GRAPH_FOUR_POLES')]);
  });

  test('PID: the clicked T (T_i or T_d) and K; only graphs that use K, T_i or T_d are recalculated', () => {
    set({ T_i: 2, T_d: 3, K: 5 });
    set_globals({
      bode_graphs: [
        ...global_value('bode_graphs'),
        { bode_formula: 'k_1/(1+T_1*s)', bode_id: 'unrelated', bode_displaybool: true },
        { bode_formula: global_value('GRAPH_ONE_POLE_WITH_PID_YR').formula, bode_id: 'closed_loop', bode_displaybool: true },
      ],
    });
    drag({ mag: 'GRAPH_PID', variable: 'T_i', to: [5, 5] });
    expect(get('T_i')).toBeCloseTo(1);
    expect(get('T_d')).toBe(3);
    expect(get('K')).toBeCloseTo(2);
    expect(achievements()).toEqual(['drag_bode_mag']);
    expect(redrawn()).toEqual([id_of('GRAPH_PID'), 'closed_loop']);
  });
});

describe('mouseDragged in the Bode phase plot', () => {
  test('one real pole: T_1 only; the redraw is limited to graphs that use T_1', () => {
    set({ T_1: 2, k_1: 5 });
    drag({ phase: 'GRAPH_ONE_REAL_POLE', to: [5, 50] });
    expect(get('T_1')).toBeCloseTo(1);
    expect(get('k_1')).toBe(5);
    expect(achievements()).toEqual(['drag_bode_phase']);
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_REAL_POLE')]);
  });

  test('two real poles: the clicked T, with the far-apart achievement at its boundaries', () => {
    set({ T_2: 2, T_3: 1 });
    drag({ phase: 'GRAPH_TWO_REAL_POLES', variable: 'T_2', to: [5, 0] });
    expect(get('T_2')).toBeCloseTo(1);
    expect(achievements()).toEqual(['drag_bode_phase']);
    expect(redrawn()).toEqual([id_of('GRAPH_TWO_REAL_POLES')]);

    for (const [values, expected] of [
      [{ T_2: 1, T_3: 100 }, true], [{ T_2: 1, T_3: 99.99 }, false],
      [{ T_2: 100, T_3: 1 }, true], [{ T_2: 99.99, T_3: 1 }, false],
    ]) {
      window.achievement_done.mockClear();
      set(values);
      drag({ phase: 'GRAPH_TWO_REAL_POLES', variable: 'T_2', to: [0, 0] });
      expect(achievements().includes('T2_T3_far_apart')).toBe(expected);
    }
  });

  test('two complex poles: only w changes, T is clamped at 0.0001', () => {
    set({ w: 2, z: 0.5 });
    drag({ phase: 'GRAPH_TWO_COMPLEX_POLES', to: [5, 80] });
    expect(get('w')).toBeCloseTo(4);
    expect(get('z')).toBe(0.5);
    expect(text_field('w')).toBe('4.00');
    expect(range_field('w')).toBe('4.00');
    expect(achievements()).toEqual(['drag_bode_phase']);
    expect(redrawn()).toEqual([id_of('GRAPH_TWO_COMPLEX_POLES')]);

    drag({ phase: 'GRAPH_TWO_COMPLEX_POLES', from: [0, 0], to: [50, 0] });
    expect(get('w')).toBeCloseTo(10000);
  });

  test('one zero: T_4', () => {
    set({ T_4: 2 });
    drag({ phase: 'GRAPH_ONE_ZERO', to: [5, 0] });
    expect(get('T_4')).toBeCloseTo(1);
    expect(achievements()).toEqual(['drag_bode_phase']);
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_ZERO')]);
  });

  test('one zero two poles: the clicked T', () => {
    set({ T_6: 2 });
    drag({ phase: 'GRAPH_ONE_ZERO_TWO_POLES', variable: 'T_6', to: [5, 0] });
    expect(get('T_6')).toBeCloseTo(1);
    expect(achievements()).toEqual(['drag_bode_phase']);
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_ZERO_TWO_POLES')]);
  });

  test('four poles: T_5', () => {
    set({ T_5: 2 });
    drag({ phase: 'GRAPH_FOUR_POLES', to: [5, 0] });
    expect(get('T_5')).toBeCloseTo(1);
    expect(achievements()).toEqual(['drag_bode_phase']);
    expect(redrawn()).toEqual([id_of('GRAPH_FOUR_POLES')]);
  });

  test('PID: the clicked T, K is untouched', () => {
    set({ T_d: 2, K: 5 });
    drag({ phase: 'GRAPH_PID', variable: 'T_d', to: [5, 50] });
    expect(get('T_d')).toBeCloseTo(1);
    expect(get('K')).toBe(5);
    expect(achievements()).toEqual(['drag_bode_phase']);
    expect(redrawn()).toEqual([id_of('GRAPH_PID')]);
  });
});

describe('mouseDragged over the Nyquist diagram', () => {
  // Inside when 65 < mouseX - 1000 < 65 + 200 and 45 < mouseY - 1000 - ... see mouseDragged:
  // (mouseY - y - y_offset) must be in (0, height).
  const X0 = 1000 + 65;
  const Y0 = 1000 + 45;
  const hovers = (x, y) => {
    window.draw.mockClear();
    window.draw_hover_nyquist.mockClear();
    drag({ to: [x, y] });
    return window.draw.mock.calls.length + window.draw_hover_nyquist.mock.calls.length;
  };

  test('redraws with the hover overlay inside the diagram', () => {
    expect(hovers(X0 + 100, Y0 + 75)).toBe(2);
    expect(window.draw).toHaveBeenCalledTimes(1);
    expect(window.draw_hover_nyquist).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['left edge', X0, Y0 + 75, 0], ['just inside left', X0 + 1, Y0 + 75, 2],
    ['right edge', X0 + 200, Y0 + 75, 0], ['just inside right', X0 + 199, Y0 + 75, 2],
    ['top edge', X0 + 100, Y0, 0], ['just inside top', X0 + 100, Y0 + 1, 2],
    ['bottom edge', X0 + 100, Y0 + 150, 0], ['just inside bottom', X0 + 100, Y0 + 149, 2],
  ])('%s', (_, x, y, calls) => {
    expect(hovers(x, y)).toBe(calls);
  });
});

describe('mouseDragged in the pole-zero maps', () => {
  test('nothing happens outside every map', () => {
    const before = [...global_value('range_slider_variables')];
    drag({ to: [50, 50] });
    drag({ to: [MAP_X + 40, 1500] });
    expect(global_value('range_slider_variables')).toEqual(before);
    expect(achievements()).toEqual([]);
    expect(redrawn()).toEqual([]);
  });

  test.each([
    ['left edge', 0, 40, false], ['one pixel inside the left edge', 1, 40, true],
    ['right edge', MAP_SIZE, 40, false], ['one pixel inside the right edge', MAP_SIZE - 1, 40, true],
    ['top edge', 40, 0, false], ['one pixel inside the top edge', 40, 1, true],
    ['bottom edge', 40, MAP_SIZE, false], ['one pixel inside the bottom edge', 40, MAP_SIZE - 1, true],
  ])('%s of a map', (_, dx, dy, inside) => {
    set({ T_1: 7 });
    drag_in_map('GRAPH_ONE_REAL_POLE', dx, dy);
    expect(get('T_1') !== 7).toBe(inside);
  });

  test('a map that is not displayed is ignored', () => {
    set({ T_1: 7 });
    global_value('bode_graphs')[index_of('GRAPH_ONE_REAL_POLE')].bode_displaybool = false;
    drag_in_map('GRAPH_ONE_REAL_POLE', 40, 40);
    expect(get('T_1')).toBe(7);
    expect(achievements()).toEqual([]);
  });

  test('the drag is routed to the map the mouse is in', () => {
    set({ T_1: 7, T_4: 7 });
    drag_in_map('GRAPH_ONE_ZERO', dx_for_real(-1), 40);
    expect(get('T_1')).toBe(7);
    expect(get('T_4')).toBeCloseTo(1);
  });

  test('one real pole: the pole at s = real gives T_1 = -1 / real', () => {
    set({ T_1: 7 });
    drag_in_map('GRAPH_ONE_REAL_POLE', dx_for_real(-0.5), 40);
    expect(get('T_1')).toBeCloseTo(2);
    expect(text_field('T_1')).toBe('2');
    expect(range_field('T_1')).toBe('2');
    expect(achievements()).toEqual(['drag_pole']);
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_REAL_POLE')]);
  });

  test('one real pole: a pole in the right half-plane gives negative T and the achievement', () => {
    drag_in_map('GRAPH_ONE_REAL_POLE', dx_for_real(0.5), 40);
    expect(get('T_1')).toBeCloseTo(-2);
    expect(achievements()).toEqual(['drag_pole', 'drag_pole_to_right_half_plane']);
  });

  // 1 / 0: a pole dragged onto the imaginary axis exactly (reachable: dx = 60 of 80 pixels).
  test.failing('one real pole: dragging exactly onto the imaginary axis keeps T_1 finite', () => {
    drag_in_map('GRAPH_ONE_REAL_POLE', dx_for_real(0), 40);
    expect(Number.isFinite(get('T_1'))).toBe(true);
  });

  test('two real poles: sets the clicked time constant', () => {
    set({ T_2: 7, T_3: 7 });
    drag_in_map('GRAPH_TWO_REAL_POLES', dx_for_real(-2), 40, 'T_3');
    expect(get('T_2')).toBe(7);
    expect(get('T_3')).toBeCloseTo(0.5);
    expect(achievements()).toEqual(['drag_pole']);
    expect(redrawn()).toEqual([id_of('GRAPH_TWO_REAL_POLES')]);
  });

  test('two real poles: right half-plane achievement only for positive real part', () => {
    drag_in_map('GRAPH_TWO_REAL_POLES', dx_for_real(0.25), 40, 'T_2');
    expect(get('T_2')).toBeCloseTo(-4);
    expect(achievements()).toEqual(['drag_pole', 'drag_pole_to_right_half_plane']);
  });

  test('two complex poles: w is the distance to the origin and z the cosine of the angle', () => {
    set({ w: 7, z: 7 });
    drag_in_map('GRAPH_TWO_COMPLEX_POLES', dx_for_real(-1), 20); // imaginary part 1
    expect(global_value('bode_3_real')).toBeCloseTo(-1);
    expect(global_value('bode_3_imaginary')).toBeCloseTo(1);
    expect(get('w')).toBeCloseTo(Math.SQRT2);
    expect(get('z')).toBeCloseTo(Math.SQRT1_2);
    expect(text_field('w')).toBe('1.41');
    expect(range_field('w')).toBe('1.41');
    expect(text_field('z')).toBe('0.71');
    expect(range_field('z')).toBe('0.71');
    expect(achievements()).toEqual(['drag_pole', 'drag_complex_pole']);
    expect(redrawn()).toEqual([id_of('GRAPH_TWO_COMPLEX_POLES')]);
  });

  test('two complex poles: a point in the right half-plane is clamped to the imaginary axis', () => {
    drag_in_map('GRAPH_TWO_COMPLEX_POLES', dx_for_real(0.5), 20);
    expect(global_value('bode_3_real')).toBe(0);
    expect(get('w')).toBeCloseTo(1);
    expect(get('z')).toBeCloseTo(0);
    expect(achievements()).toContain('low_z');
  });

  test('two complex poles: a point just inside the right half-plane is also clamped', () => {
    drag_in_map('GRAPH_TWO_COMPLEX_POLES', dx_for_real(0.05), 20);
    expect(global_value('bode_3_real')).toBe(0);
    expect(get('w')).toBeCloseTo(1);
  });

  test('two complex poles: a point below the real axis is mirrored to the upper half-plane', () => {
    drag_in_map('GRAPH_TWO_COMPLEX_POLES', dx_for_real(-1), 60); // imaginary part -1
    expect(global_value('bode_3_imaginary')).toBeCloseTo(1);
    expect(get('w')).toBeCloseTo(Math.SQRT2);
    expect(get('z')).toBeCloseTo(Math.SQRT1_2);
  });

  test('two complex poles: a pole on the real axis has z = 1 and w = |real|', () => {
    drag_in_map('GRAPH_TWO_COMPLEX_POLES', dx_for_real(-2), 40);
    expect(get('w')).toBeCloseTo(2);
    expect(get('z')).toBeCloseTo(1);
    expect(achievements()).not.toContain('low_z');
  });

  test.each([
    ['close to the imaginary axis', -0.15, true], ['a bit further out', -0.25, false],
  ])('two complex poles: low_z when the pole is %s', (_, real, expected) => {
    drag_in_map('GRAPH_TWO_COMPLEX_POLES', dx_for_real(real), 1); // imaginary part 1.95
    expect(achievements().includes('low_z')).toBe(expected);
  });

  test('one zero: T_4 = -1 / real, with the zero achievements', () => {
    drag_in_map('GRAPH_ONE_ZERO', dx_for_real(-2), 40);
    expect(get('T_4')).toBeCloseTo(0.5);
    expect(achievements()).toEqual(['drag_zero']);
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_ZERO')]);

    window.achievement_done.mockClear();
    drag_in_map('GRAPH_ONE_ZERO', dx_for_real(0.5), 40);
    expect(get('T_4')).toBeCloseTo(-2);
    expect(achievements()).toEqual(['drag_zero', 'drag_zero_to_right_half_plane']);
  });

  test('one zero two poles: the zero T_8 is not clamped', () => {
    drag_in_map('GRAPH_ONE_ZERO_TWO_POLES', dx_for_real(0.5), 40, 'T_8');
    expect(get('T_8')).toBeCloseTo(-2);
    expect(achievements()).toEqual(['drag_zero', 'drag_zero_to_right_half_plane']);
    expect(redrawn()).toEqual([id_of('GRAPH_ONE_ZERO_TWO_POLES')]);

    window.achievement_done.mockClear();
    drag_in_map('GRAPH_ONE_ZERO_TWO_POLES', dx_for_real(-1), 40, 'T_8');
    expect(get('T_8')).toBeCloseTo(1);
    expect(achievements()).toEqual(['drag_zero']);
  });

  test.each(['T_6', 'T_7'])('one zero two poles: pole %s cannot be dragged further right than real = 0.06777777', (variable) => {
    drag_in_map('GRAPH_ONE_ZERO_TWO_POLES', dx_for_real(0.5), 40, variable);
    expect(get(variable)).toBeCloseTo(-1 / 0.06777777);
    expect(achievements()).toEqual(['drag_pole', 'drag_pole_to_right_half_plane']);
  });

  test('one zero two poles: a pole slightly in the right half-plane is not clamped, one in the left half-plane gives no achievement', () => {
    drag_in_map('GRAPH_ONE_ZERO_TWO_POLES', dx_for_real(0.05), 40, 'T_6');
    expect(get('T_6')).toBeCloseTo(-20);
    expect(achievements()).toEqual(['drag_pole', 'drag_pole_to_right_half_plane']);

    window.achievement_done.mockClear();
    drag_in_map('GRAPH_ONE_ZERO_TWO_POLES', dx_for_real(-0.5), 40, 'T_7');
    expect(get('T_7')).toBeCloseTo(2);
    expect(achievements()).toEqual(['drag_pole']);
  });

  test('four poles: T_5, clamped at real = 0.0677777', () => {
    drag_in_map('GRAPH_FOUR_POLES', dx_for_real(-1), 40);
    expect(get('T_5')).toBeCloseTo(1);
    expect(achievements()).toEqual(['drag_pole']);
    expect(redrawn()).toEqual([id_of('GRAPH_FOUR_POLES')]);

    window.achievement_done.mockClear();
    drag_in_map('GRAPH_FOUR_POLES', dx_for_real(0.5), 40);
    expect(get('T_5')).toBeCloseTo(-1 / 0.0677777);
    expect(achievements()).toEqual(['drag_pole', 'drag_pole_to_right_half_plane']);
  });

  // A wider map (400 px, 0.01 per pixel) to land just either side of the clamp.
  test.each([
    ['T_6', 'GRAPH_ONE_ZERO_TWO_POLES', 0.06777777], ['T_5', 'GRAPH_FOUR_POLES', 0.0677777],
  ])('%s is clamped just above its limit and not just below it', (variable, preset, limit) => {
    set_globals({ pole_zero_width: 400, pole_zero_height: 400 });
    drag_in_map(preset, dx_for_real(0.07, 400), 200, variable);
    expect(get(variable)).toBeCloseTo(-1 / limit, 3);
    drag_in_map(preset, dx_for_real(0.06, 400), 200, variable);
    expect(get(variable)).toBeCloseTo(-1 / 0.06, 3);
  });

  // On the imaginary axis itself (real = 0) a pole or zero is not yet in the right half-plane.
  test.each([
    ['GRAPH_ONE_REAL_POLE', ''], ['GRAPH_TWO_REAL_POLES', 'T_2'], ['GRAPH_ONE_ZERO', ''],
    ['GRAPH_ONE_ZERO_TWO_POLES', 'T_8'], ['GRAPH_ONE_ZERO_TWO_POLES', 'T_6'],
    ['GRAPH_FOUR_POLES', ''], ['GRAPH_PID', 'T_i'],
  ])('%s %s: no right half-plane achievement for real = 0', (preset, variable) => {
    drag_in_map(preset, dx_for_real(0), 40, variable);
    expect(achievements().filter((name) => name.includes('right_half_plane'))).toEqual([]);
    expect(achievements().length).toBe(1);
  });

  test('four poles: a pole slightly in the right half-plane is not clamped', () => {
    drag_in_map('GRAPH_FOUR_POLES', dx_for_real(0.05), 40);
    expect(get('T_5')).toBeCloseTo(-20);
  });

  test('PID: sets the clicked T_i or T_d', () => {
    set({ T_i: 7, T_d: 7 });
    drag_in_map('GRAPH_PID', dx_for_real(-1.25), 40, 'T_d');
    expect(get('T_i')).toBe(7);
    expect(get('T_d')).toBeCloseTo(0.8);
    expect(text_field('T_d')).toBe('0.8');
    expect(achievements()).toEqual(['drag_pole']);
    expect(redrawn()).toEqual([id_of('GRAPH_PID')]);

    window.achievement_done.mockClear();
    drag_in_map('GRAPH_PID', dx_for_real(0.5), 40, 'T_i');
    expect(get('T_i')).toBeCloseTo(-2);
    expect(achievements()).toEqual(['drag_pole', 'drag_pole_to_right_half_plane']);
  });

  test('a map of a preset with no draggable pole-zero handling changes nothing', () => {
    const before = [...global_value('range_slider_variables')];
    drag_in_map('GRAPH_TIME_DELAY', 40, 40);
    expect(global_value('range_slider_variables')).toEqual(before);
    expect(achievements()).toEqual([]);
  });
});

describe('achievements reach the event log', () => {
  test('the first drag logs one achievement_done event, a repeated drag logs none', () => {
    window.achievement_done = originals.achievement_done;
    const add_event = jest.spyOn(window, 'add_event').mockImplementation(() => {});
    set_globals({ done_achievements: [], gamification_enabled: false });
    set({ T_1: 2 });
    drag({ mag: 'GRAPH_ONE_REAL_POLE', to: [5, 0] });
    drag({ mag: 'GRAPH_ONE_REAL_POLE', to: [5, 0] });
    expect(add_event.mock.calls.map(([event]) => event)).toEqual(['achievement_done=drag_bode_mag']);
  });
});
