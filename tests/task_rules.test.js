// TASK_RULES in src/assignments.js, the one place that says when a task is done: every rule at the
// edges of its window, and which kind of action checks which list of rules.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = ['task_done', 'add_event'];
const originals = {};

// In the middle of no window: nothing is done with these values.
const NEUTRAL = {
  K: 1, T_i: 0.1, T_d: 0, T_1: 0.6, k_1: 4, k_2: 2, k_3: 3, k_4: 2.5, w: 5, z: 0.4,
  T_2: 0.6, T_3: 2, T_6: 1.5, T_7: 1.1, T_8: 0.7, L: 1,
};

const rule_list = (name) => global_value('TASK_RULES')[name];
const rule_of = (list, task) => rule_list(list).find((rule) => rule.task === task);
const done_with = (list, task, values, changed) => {
  set_sliders(values);
  return rule_of(list, task).done(changed);
};

function set_sliders(values) {
  const variables = global_value('range_slider_variables');
  const position = global_value('variable_position');
  for (const [name, value] of Object.entries({ ...NEUTRAL, ...values })) variables[position[name]] = value;
}

function use_graphs(...graphs) {
  const list = global_value('bode_graphs');
  list.length = 0;
  list.push(...graphs);
}

const preset = (name) => global_value(name).formula;
const called = () => window.task_done.mock.calls.map((call) => call[0]);

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
  const position = global_value('variable_position');
  global_value('range_slider_alphabet').forEach((name, i) => { position[name] = i; });
});

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  set_globals({
    improvement_enabled: false, we_need_faster_calculations_right_now: false, clicked_on_time_response_graph_no: -1,
    clicked_on_bode_mag_graph_no: -1, clicked_on_bode_phase_graph_no: -1, clicked_on_pole_zero_graph_no: -1,
    current_assignment: 'none',
  });
  use_graphs();
  set_sliders({});
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
});

describe('windows of the slider rules', () => {
  test.each([
    // list, task, values, done
    ['after_any_release', 'PID_(K>1)', { K: 1.01 }, true],
    ['after_any_release', 'PID_(K>1)', { K: 1 }, false],
    ['after_any_release', 'PID_(T_i)>(T_1)', { T_i: 0.61 }, true],
    ['after_any_release', 'PID_(T_i)>(T_1)', { T_i: 0.6 }, false],
    ['after_any_release', 'PID_(Td=0,T_1=1)', { T_1: 0.9 }, true],
    ['after_any_release', 'PID_(Td=0,T_1=1)', { T_1: 1.09 }, true],
    ['after_any_release', 'PID_(Td=0,T_1=1)', { T_1: 0.89 }, false],
    ['after_any_release', 'PID_(Td=0,T_1=1)', { T_1: 1.1 }, false],
    ['after_any_release', 'PID_(Td=0,T_1=1)', { T_1: 1, T_d: 0.1 }, false],
    ['after_any_release', 'PID_(k_1)', { k_1: 0.51 }, true],
    ['after_any_release', 'PID_(k_1)', { k_1: 0.69 }, true],
    ['after_any_release', 'PID_(k_1)', { k_1: 0.5 }, false],
    ['after_any_release', 'PID_(k_1)', { k_1: 0.7 }, false],
    ['after_any_release', 'PID_(T_d!=0)', { T_d: 0.1 }, true],
    ['after_any_release', 'PID_(T_d!=0)', { T_d: 0 }, false],
    ['after_any_release', 'PID_Load', { K: 2, T_i: 1, T_d: 0 }, true],
    ['after_any_release', 'PID_Load', { K: 1, T_i: 2, T_d: 0 }, true],
    ['after_any_release', 'PID_Load', { K: 1, T_i: 1, T_d: 1 }, true],
    ['after_any_release', 'PID_Load', { K: 1, T_i: 1, T_d: 0 }, false],
    ['after_any_release', 'w=8,z=0.05,k_3=1', { k_3: 0.9, w: 7.3, z: 0.02 }, true],
    ['after_any_release', 'w=8,z=0.05,k_3=1', { k_3: 1.1, w: 8.7, z: 0.07 }, true],
    ['after_any_release', 'w=8,z=0.05,k_3=1', { k_3: 0.89, w: 8, z: 0.05 }, false],
    ['after_any_release', 'w=8,z=0.05,k_3=1', { k_3: 1.11, w: 8, z: 0.05 }, false],
    ['after_any_release', 'w=8,z=0.05,k_3=1', { k_3: 1, w: 7.29, z: 0.05 }, false],
    ['after_any_release', 'w=8,z=0.05,k_3=1', { k_3: 1, w: 8.71, z: 0.05 }, false],
    ['after_any_release', 'w=8,z=0.05,k_3=1', { k_3: 1, w: 8, z: 0.019 }, false],
    ['after_any_release', 'w=8,z=0.05,k_3=1', { k_3: 1, w: 8, z: 0.071 }, false],
    ['after_any_release', 'w=2,z=0.7,k3=0.7', { k_3: 0.6, w: 1.88, z: 0.66 }, true],
    ['after_any_release', 'w=2,z=0.7,k3=0.7', { k_3: 0.8, w: 2.15, z: 0.75 }, true],
    ['after_any_release', 'w=2,z=0.7,k3=0.7', { k_3: 0.59, w: 2, z: 0.7 }, false],
    ['after_any_release', 'w=2,z=0.7,k3=0.7', { k_3: 0.81, w: 2, z: 0.7 }, false],
    ['after_any_release', 'w=2,z=0.7,k3=0.7', { k_3: 0.7, w: 1.87, z: 0.7 }, false],
    ['after_any_release', 'w=2,z=0.7,k3=0.7', { k_3: 0.7, w: 2.16, z: 0.7 }, false],
    ['after_any_release', 'w=2,z=0.7,k3=0.7', { k_3: 0.7, w: 2, z: 0.65 }, false],
    ['after_any_release', 'w=2,z=0.7,k3=0.7', { k_3: 0.7, w: 2, z: 0.76 }, false],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.65, T_6: 8, T_7: 0.33, T_8: 1.5 }, true],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.85, T_6: 0.7, T_7: 10, T_8: 2.5 }, true],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.64, T_6: 9, T_7: 0.5, T_8: 2 }, false],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.86, T_6: 9, T_7: 0.5, T_8: 2 }, false],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 9, T_7: 0.32, T_8: 2 }, false],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 9, T_7: 0.71, T_8: 2 }, false],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 7.9, T_7: 0.5, T_8: 2 }, false],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 10.1, T_7: 0.5, T_8: 2 }, false],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 9, T_7: 0.5, T_8: 1.4 }, false],
    ['after_any_release', 'k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 9, T_7: 0.5, T_8: 2.6 }, false],
    ['after_step_response_drag', 'k1=2.9', { k_1: 2.81 }, true],
    ['after_step_response_drag', 'k1=2.9', { k_1: 2.99 }, true],
    ['after_step_response_drag', 'k1=2.9', { k_1: 2.8 }, false],
    ['after_step_response_drag', 'k1=2.9', { k_1: 3 }, false],
    ['after_step_response_drag', 'L=3', { L: 2.93 }, true],
    ['after_step_response_drag', 'L=3', { L: 3.09 }, true],
    ['after_step_response_drag', 'L=3', { L: 2.92 }, false],
    ['after_step_response_drag', 'L=3', { L: 3.1 }, false],
    ['after_step_response_drag', 'T2,T3=0.05_and_5', { T_2: 0.035, T_3: 4 }, true],
    ['after_step_response_drag', 'T2,T3=0.05_and_5', { T_2: 5.8, T_3: 0.07 }, true],
    ['after_step_response_drag', 'T2,T3=0.05_and_5', { T_2: 0.034, T_3: 5 }, false],
    ['after_step_response_drag', 'T2,T3=0.05_and_5', { T_2: 0.071, T_3: 5 }, false],
    ['after_step_response_drag', 'T2,T3=0.05_and_5', { T_2: 0.05, T_3: 3.9 }, false],
    ['after_step_response_drag', 'T2,T3=0.05_and_5', { T_2: 0.05, T_3: 5.9 }, false],
    ['after_bode_drag', 'T1_k1_bode', { k_1: 0.55, T_1: 1.82 }, true],
    ['after_bode_drag', 'T1_k1_bode', { k_1: 0.75, T_1: 2.25 }, true],
    ['after_bode_drag', 'T1_k1_bode', { k_1: 0.54, T_1: 2 }, false],
    ['after_bode_drag', 'T1_k1_bode', { k_1: 0.76, T_1: 2 }, false],
    ['after_bode_drag', 'T1_k1_bode', { k_1: 0.65, T_1: 1.81 }, false],
    ['after_bode_drag', 'T1_k1_bode', { k_1: 0.65, T_1: 2.26 }, false],
    ['after_bode_drag', 'T2=10,T3=0.5', { T_2: 9, T_3: 0.45 }, true],
    ['after_bode_drag', 'T2=10,T3=0.5', { T_2: 0.55, T_3: 11 }, true],
    ['after_bode_drag', 'T2=10,T3=0.5', { T_2: 10, T_3: 0.44 }, false],
    ['after_bode_drag', 'T2=10,T3=0.5', { T_2: 10, T_3: 0.56 }, false],
    ['after_bode_drag', 'T2=10,T3=0.5', { T_2: 8.9, T_3: 0.5 }, false],
    ['after_bode_drag', 'T2=10,T3=0.5', { T_2: 11.1, T_3: 0.5 }, false],
    ['after_pole_zero_drag', 'T1_pole=-2', { T_1: 0.45 }, true],
    ['after_pole_zero_drag', 'T1_pole=-2', { T_1: 0.55 }, true],
    ['after_pole_zero_drag', 'T1_pole=-2', { T_1: 0.44 }, false],
    ['after_pole_zero_drag', 'T1_pole=-2', { T_1: 0.56 }, false],
    ['after_pole_zero_drag', 'T1_unstable', { T_1: -0.01 }, true],
    ['after_pole_zero_drag', 'T1_unstable', { T_1: 0 }, false],
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.49, T_2: 1, T_3: 1 }, true],
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.51, T_2: 0.55, T_3: 1.65 }, true],
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.48, T_2: 1, T_3: 1 }, false],
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.52, T_2: 1, T_3: 1 }, false],
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.5, T_2: 0.54, T_3: 1.3 }, false],
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.5, T_2: 0.6, T_3: 1.66 }, false],
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.5, T_2: 0.8, T_3: 0.9 }, false], // sum 1.7
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.5, T_2: 1.2, T_3: 1.2 }, false], // sum 2.4
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.5, T_2: 0.875, T_3: 0.875 }, true], // sum 1.75
    ['after_pole_zero_drag', 'T2,T3=1,k2=0.5', { k_2: 0.5, T_2: 1.15, T_3: 1.15 }, true], // sum 2.3
    ['after_pole_zero_drag', 'w=0.9,z=0.0', { w: 0.85, z: 0.05 }, true],
    ['after_pole_zero_drag', 'w=0.9,z=0.0', { w: 0.95, z: 0 }, true],
    ['after_pole_zero_drag', 'w=0.9,z=0.0', { w: 0.84, z: 0 }, false],
    ['after_pole_zero_drag', 'w=0.9,z=0.0', { w: 0.96, z: 0 }, false],
    ['after_pole_zero_drag', 'w=0.9,z=0.0', { w: 0.9, z: 0.051 }, false],
    ['after_pole_zero_drag', 'w=1.6,z=0.2', { w: 1.55, z: 0.15 }, true],
    ['after_pole_zero_drag', 'w=1.6,z=0.2', { w: 1.65, z: 0.25 }, true],
    ['after_pole_zero_drag', 'w=1.6,z=0.2', { w: 1.54, z: 0.2 }, false],
    ['after_pole_zero_drag', 'w=1.6,z=0.2', { w: 1.66, z: 0.2 }, false],
    ['after_pole_zero_drag', 'w=1.6,z=0.2', { w: 1.6, z: 0.14 }, false],
    ['after_pole_zero_drag', 'w=1.6,z=0.2', { w: 1.6, z: 0.26 }, false],
    ['after_pole_zero_drag', 'k4,T6,T7=1,T8=1.5_poles', { k_4: 1.05, T_8: -1.7, T_6: 0.9, T_7: 0.8 }, true],
    ['after_pole_zero_drag', 'k4,T6,T7=1,T8=1.5_poles', { k_4: 0.96, T_8: -1.35, T_6: 1.2, T_7: 1.1 }, true],
    ['after_pole_zero_drag', 'k4,T6,T7=1,T8=1.5_poles', { k_4: 0.95, T_8: -1.5, T_6: 1, T_7: 1 }, false],
    ['after_pole_zero_drag', 'k4,T6,T7=1,T8=1.5_poles', { k_4: 1.06, T_8: -1.5, T_6: 1, T_7: 1 }, false],
    ['after_pole_zero_drag', 'k4,T6,T7=1,T8=1.5_poles', { k_4: 1, T_8: -1.71, T_6: 1, T_7: 1 }, false],
    ['after_pole_zero_drag', 'k4,T6,T7=1,T8=1.5_poles', { k_4: 1, T_8: -1.34, T_6: 1, T_7: 1 }, false],
    ['after_pole_zero_drag', 'k4,T6,T7=1,T8=1.5_poles', { k_4: 1, T_8: -1.5, T_6: 0.8, T_7: 0.8 }, false],
    ['after_pole_zero_drag', 'k4,T6,T7=1,T8=1.5_poles', { k_4: 1, T_8: -1.5, T_6: 1.2, T_7: 1.2 }, false],
  ])('%s: %s with %j is %s', (list, task, values, done) => {
    expect(done_with(list, task, values)).toBe(done);
  });
});

describe('rules on the graphs', () => {
  const graph = (preset_name, metrics) => ({ bode_formula: preset(preset_name), ...metrics });
  const is_done = (task) => rule_of('after_any_release', task).done();

  test.each([[53, true], [57, true], [52.9, false], [57.1, false]])('phasemargin=55 at %s degrees: %s', (margin, done) => {
    use_graphs(graph('GRAPH_TWO_REAL_POLES', { bode_phase_margin: margin }));
    expect(is_done('phasemargin=55')).toBe(done);
  });

  test.each([[2.8, true], [3.2, true], [2.79, false], [3.21, false]])('gaincrossover=3 at %s rad/s: %s', (freq, done) => {
    use_graphs(graph('GRAPH_TWO_REAL_POLES', { bode_gain_crossover_freq: freq }));
    expect(is_done('gaincrossover=3')).toBe(done);
  });

  test.each([[1.91, true], [2.1, true], [1.9, false], [2.11, false]])('L_gain_margin=2 at a factor %s: %s', (factor, done) => {
    use_graphs(graph('GRAPH_TIME_DELAY', { bode_gain_margin: 20 * Math.log10(factor) + (done ? 1e-12 * Math.sign(2 - factor) : 0) }));
    expect(is_done('L_gain_margin=2')).toBe(done);
  });

  test.each([
    [4.8, 1.9, true], [5.2, 2.1, true], [4.7, 2, false], [5.3, 2, false], [5, 1.89, false], [5, 2.11, false],
  ])('gainm=5_phasex=2 at a factor %s and %s rad/s: %s', (factor, freq, done) => {
    const margin = 20 * Math.log10(factor) + (factor === 4.8 ? 1e-12 : -1e-12);
    use_graphs(graph('GRAPH_FOUR_POLES', { bode_gain_margin: margin, bode_phase_crossover_freq: freq }));
    expect(is_done('gainm=5_phasex=2')).toBe(done);
  });

  test.each([[42, true], [48, true], [41.9, false], [48.1, false]])('phasemargin=45 at %s degrees: %s', (margin, done) => {
    use_graphs(graph('GRAPH_FOUR_POLES', { bode_phase_margin: margin }));
    expect(is_done('phasemargin=45')).toBe(done);
  });

  test('a margin only counts on the graph of the right preset', () => {
    use_graphs(graph('GRAPH_ONE_REAL_POLE', { bode_phase_margin: 55, bode_gain_crossover_freq: 3 }));
    expect(is_done('phasemargin=55')).toBe(false);
    expect(is_done('gaincrossover=3')).toBe(false);
  });

  test('any graph of the preset will do, not only the first', () => {
    use_graphs(graph('GRAPH_TWO_REAL_POLES', { bode_phase_margin: 10 }), graph('GRAPH_TWO_REAL_POLES', { bode_phase_margin: 55 }));
    expect(is_done('phasemargin=55')).toBe(true);
  });

  test('a graph without a margin (NaN) does not count', () => {
    use_graphs(graph('GRAPH_TIME_DELAY', { bode_gain_margin: NaN }));
    expect(is_done('L_gain_margin=2')).toBe(false);
  });
});

describe('the Nyquist task', () => {
  const task = 'k4=1,T6=2.5,T7=1,T8=6';
  // Largest gain 5, reaching 3 along the real axis and from -4 to 2 along the imaginary one.
  const shape = (gain = 1, re = 1, top = 1, bottom = 1) => ({
    bode_gain_array: [1 * gain, 5 * gain],
    bode_complex_array: [{ re: 1 * re, im: 2 * top }, { re: NaN, im: NaN }, { re: 3 * re, im: -4 * bottom }],
  });
  const done_after_bode_drag = (k_4 = 1) => done_with('after_bode_drag', task, { k_4 });

  test.each([
    ['identical curves', [1, 1, 1, 1], true],
    ['gain at the low edge', [0.92, 1, 1, 1], true],
    ['gain at the high edge', [1.07, 1, 1, 1], true],
    ['gain too low', [0.91, 1, 1, 1], false],
    ['gain too high', [1.08, 1, 1, 1], false],
    ['real reach too low', [1, 0.91, 1, 1], false],
    ['real reach too high', [1, 1.08, 1, 1], false],
    ['upper reach too low', [1, 1, 0.91, 1], false],
    ['upper reach too high', [1, 1, 1.08, 1], false],
    ['lower reach too small', [1, 1, 1, 0.91], false],
    ['lower reach too large', [1, 1, 1, 1.08], false],
  ])('%s', (_, scales, done) => {
    use_graphs(shape(), shape(...scales));
    expect(done_after_bode_drag()).toBe(done);
  });

  test.each([[0.95, true], [1.05, true], [0.94, false], [1.06, false]])('k_4 = %s: %s', (k_4, done) => {
    use_graphs(shape(), shape());
    expect(done_after_bode_drag(k_4)).toBe(done);
  });

  test('without a ghost graph there is nothing to compare with', () => {
    use_graphs(shape());
    expect(done_after_bode_drag()).toBe(false);
  });
});

describe('after_slider_change', () => {
  test.each([[1.9, true], [2.12, true], [1.89, false], [2.13, false]])('T_1 = %s gives T1=2: %s', (T_1, done) => {
    expect(done_with('after_slider_change', 'T1=2', { T_1 }, 'T_1')).toBe(done);
  });

  test.each([[-0.01, true], [0, false]])('T_1 = %s gives T1_unstable: %s', (T_1, done) => {
    expect(done_with('after_slider_change', 'T1_unstable', { T_1 }, 'T_1')).toBe(done);
  });

  test('the T_1 rules want T_1 to be what changed', () => {
    expect(done_with('after_slider_change', 'T1=2', { T_1: 2 }, 'k_1')).toBe(false);
    expect(done_with('after_slider_change', 'T1_unstable', { T_1: -1 }, 'k_1')).toBe(false);
  });

  test('the other rules look at the values, whichever slider moved', () => {
    expect(done_with('after_slider_change', 'T2,T3=0.05_and_5', { T_2: 0.05, T_3: 5 }, 'k_1')).toBe(true);
    expect(done_with('after_slider_change', 'w=8,z=0.05,k_3=1', { k_3: 1, w: 8, z: 0.05 }, 'k_1')).toBe(true);
  });
});

describe('which action checks which rules', () => {
  // Each of these is only done by its own kind of drag.
  const VALUES = { k_1: 2.9, T_1: 0.5, L: 3 };

  test.each([
    ['clicked_on_time_response_graph_no', ['k1=2.9', 'L=3'], ['T1_pole=-2']],
    ['clicked_on_pole_zero_graph_no', ['T1_pole=-2'], ['k1=2.9', 'L=3']],
  ])('after a drag with %s', (flag, wanted, unwanted) => {
    set_sliders(VALUES);
    set_globals({ [flag]: 0 });
    window.mouseReleased();
    for (const task of wanted) expect(called()).toContain(task);
    for (const task of unwanted) expect(called()).not.toContain(task);
  });

  test.each(['clicked_on_bode_mag_graph_no', 'clicked_on_bode_phase_graph_no'])('a drag with %s checks the Bode tasks', (flag) => {
    set_sliders({ k_1: 0.65, T_1: 2 });
    set_globals({ [flag]: 0 });
    window.mouseReleased();
    expect(called()).toContain('T1_k1_bode');
  });

  test('a drag on another graph than the first checks none of the drag rules', () => {
    set_sliders({ k_1: 0.65, T_1: 2, L: 3 });
    set_globals({
      clicked_on_time_response_graph_no: 1, clicked_on_bode_mag_graph_no: 1,
      clicked_on_bode_phase_graph_no: 1, clicked_on_pole_zero_graph_no: 1,
    });
    window.mouseReleased();
    expect(called()).not.toContain('T1_k1_bode');
    expect(called()).not.toContain('L=3');
  });

  test('a release checks the general rules, and the clicked state is cleared afterwards', () => {
    set_sliders({ K: 2 });
    set_globals({ clicked_on_pole_zero_graph_no: 0 });
    window.mouseReleased();
    expect(called()).toContain('PID_(K>1)');
    expect(global_value('clicked_on_pole_zero_graph_no')).toBe(-1);
  });
});

describe('check_tasks', () => {
  test('calls task_done for the rules that are done, in order, and hands on the changed variable', () => {
    const done = jest.fn((changed) => changed === 'x');
    window.check_tasks([{ task: 'a', done }, { task: 'b', done: () => false }, { task: 'c', done }], 'x');
    expect(called()).toEqual(['a', 'c']);
    expect(done).toHaveBeenCalledWith('x');
  });
});

describe('the table itself', () => {
  const lists = () => Object.values(global_value('TASK_RULES'));

  test('every rule is for a task that exists', () => {
    const all_tasks = global_value('all_tasks');
    for (const rule of lists().flat()) expect(all_tasks).toHaveProperty([rule.task]);
  });

  test('every task of every assignment has a rule, apart from the help tasks and the placeholder of "no assignment"', () => {
    const with_rule = new Set(lists().flat().map((rule) => rule.task));
    const assignments = Object.values(global_value('all_assignments'));
    const tasks = assignments.flatMap((assignment) => assignment.tasks || []);
    expect(tasks.length).toBeGreaterThan(20);
    const without_rule = tasks.filter((task) => !with_rule.has(task) && !task.startsWith('pid_help_'));
    expect(without_rule).toEqual(['impossible']);
  });
});

describe('is_pid_assignment', () => {
  test.each([
    ['pid_controller', true], ['pid_controller_S', true], ['pid_controller_YL', true], ['pid_controller_OL', true],
    ['one_pole', false], ['none', false], ['pid_controller_X', false],
  ])('%s: %s', (current_assignment, expected) => {
    set_globals({ current_assignment });
    expect(window.is_pid_assignment()).toBe(expected);
  });
});

describe('largest_value', () => {
  test('passes over NaN, and is -100 at the least', () => {
    expect(window.largest_value([1, NaN, 3, 2])).toBe(3);
    expect(window.largest_value([NaN])).toBe(-100);
    expect(window.largest_value([-200])).toBe(-100);
    expect(window.largest_value([])).toBe(-100);
  });
});
