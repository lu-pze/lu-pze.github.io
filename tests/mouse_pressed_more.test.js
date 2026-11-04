// Tests for the parts of src/mouse_pressed.js that the golden master in mouse_pressed.test.js does not
// reach: mouseReleased (task detection after a drag, fast-precision reset, clicked_on_* reset),
// remove_splash_screen, the Web Audio start-up on a press and the dialog-box hit test.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = ['add_event', 'task_done', 'redraw_canvas_gain', 'init_jingle'];
const originals = {};

// Every slider variable that mouseReleased reads, with a value that completes no task.
const BASELINE = {
  K: 1, T_i: 1, T_d: 0, T_1: 5, k_1: 0, k_2: 0, k_3: 0, k_4: 0,
  w: 0, z: 0.5, L: 0, T_2: 0, T_3: 0, T_6: 0, T_7: 0, T_8: 0,
};
const NO_CLICK = {
  clicked_on_time_response_graph_no: -1, clicked_on_bode_mag_graph_no: -1,
  clicked_on_bode_phase_graph_no: -1, clicked_on_pole_zero_graph_no: -1,
};
// What the user last pressed on, as mousePressed would have recorded it.
const CLICKED = {
  time_response: { ...NO_CLICK, clicked_on_time_response_graph_no: 0 },
  bode_mag: { ...NO_CLICK, clicked_on_bode_mag_graph_no: 0 },
  bode_phase: { ...NO_CLICK, clicked_on_bode_phase_graph_no: 0 },
  pole_zero: { ...NO_CLICK, clicked_on_pole_zero_graph_no: 0 },
};
const EPS = 0.001;

const formula = (preset) => global_value(preset).formula;
const db = (gain) => 20 * Math.log10(gain);
// The gain margin in dB that mouseReleased turns back into exactly this ratio (10^(dB/20) === ratio), so that
// the edges of a range can be hit exactly despite rounding. Throws if there is no such dB value nearby.
function db_for_exact_ratio(ratio) {
  const start = db(ratio);
  const ulp = start * Number.EPSILON;
  for (let step = 0; step < 5000; step++) {
    for (const candidate of [start + step * ulp, start - step * ulp]) {
      if (Math.pow(10, candidate / 20) === ratio) return candidate;
    }
  }
  throw new Error(`no dB value gives exactly ${ratio}`);
}

function make_graph(preset, props = {}) {
  return {
    bode_formula: preset === null ? 'not a preset' : formula(preset),
    bode_phase_margin: 0, bode_gain_crossover_freq: 0, bode_gain_margin: 0, bode_phase_crossover_freq: 0,
    bode_gain_array: [], bode_complex_array: [],
    ...props,
  };
}

// Releases the mouse after setting the slider variables (on top of BASELINE), the graphs and what was clicked.
// Returns the names of the tasks that were reported as done.
function release(variables = {}, { graphs = [], clicked = NO_CLICK } = {}) {
  const slider_values = global_value('range_slider_variables');
  const variable_position = global_value('variable_position');
  for (const [name, value] of Object.entries({ ...BASELINE, ...variables })) slider_values[variable_position[name]] = value;
  set_globals({ bode_graphs: graphs, ...clicked });
  window.task_done.mockClear();
  window.mouseReleased();
  return window.task_done.mock.calls.map(([task]) => task);
}

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
});

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  set_globals({
    improvement_enabled: false, splash_screen_active: false, current_quiz: 'none', current_assignment: 'none',
    questions_enabled: false, sound_enabled: 0, quiz_is_running: 0, precision: 4,
    we_need_faster_calculations_right_now: false, bode_graphs: [], ...NO_CLICK,
  });
  const variable_position = global_value('variable_position');
  Object.keys(BASELINE).forEach((name, i) => { variable_position[name] = i + 1; });
  for (const element of document.querySelectorAll('.active')) element.classList.remove('active');
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
  jest.restoreAllMocks();
});

describe('mouseReleased, bookkeeping', () => {
  test('logs the release, and completes no task when nothing was changed', () => {
    expect(release()).toEqual([]);
    expect(window.add_event).toHaveBeenCalledWith('mouse_released');
  });

  test('after a fast-precision drag the default precision is restored and the plots are redrawn', () => {
    set_globals({ we_need_faster_calculations_right_now: true, precision: global_value('SPEED_PRECISION') });
    release();
    expect(global_value('we_need_faster_calculations_right_now')).toBe(false);
    expect(global_value('precision')).toBe(global_value('DEFAULT_PRECISION'));
    expect(window.redraw_canvas_gain).toHaveBeenCalledTimes(1);
    expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
  });

  test('without a fast-precision drag the precision is left alone and nothing is redrawn', () => {
    set_globals({ precision: 7 });
    release();
    expect(global_value('precision')).toBe(7);
    expect(window.redraw_canvas_gain).not.toHaveBeenCalled();
  });

  test('forgets what was pressed on', () => {
    set_globals({
      clicked_on_time_response_graph_no: 2, clicked_on_bode_mag_graph_no: 3, clicked_on_bode_phase_graph_no: 1,
      clicked_on_pole_zero_graph_no: 0, clicked_on_time_variable: 'T_2',
    });
    window.mouseReleased();
    expect(['clicked_on_time_response_graph_no', 'clicked_on_bode_mag_graph_no', 'clicked_on_bode_phase_graph_no',
      'clicked_on_pole_zero_graph_no'].map(global_value)).toEqual([-1, -1, -1, -1]);
    expect(global_value('clicked_on_time_variable')).toBe('');
  });

  test('completes a task for real when the assignment asks for it', () => {
    set_globals({ assignments_enabled: true, current_assignment: 'one_pole', done_tasks: [] });
    window.task_done = originals.task_done;
    const slider_values = global_value('range_slider_variables');
    const variable_position = global_value('variable_position');
    for (const [name, value] of Object.entries({ ...BASELINE, k_1: 2.9 })) slider_values[variable_position[name]] = value;
    set_globals(CLICKED.time_response);
    window.mouseReleased();
    expect(global_value('done_tasks')).toContain('k1=2.9');
    expect(window.add_event).toHaveBeenCalledWith('task_done=k1=2.9');
    set_globals({ assignments_enabled: false });
  });
});

// Each row: [task, slider variables on top of BASELINE, whether the task is completed].
// The bounds of a task are checked by range_rows: inside, on each edge and just outside each edge.
// bounds: { variable: [low, high, low_included, high_included] }, null for an open end.
function range_rows(task, inside, bounds) {
  const rows = [[task, inside, true]];
  for (const [name, [low, high, low_included = true, high_included = true]] of Object.entries(bounds)) {
    if (low !== null) {
      rows.push([task, { ...inside, [name]: low }, low_included]);
      rows.push([task, { ...inside, [name]: low - EPS }, false]);
    }
    if (high !== null) {
      rows.push([task, { ...inside, [name]: high }, high_included]);
      rows.push([task, { ...inside, [name]: high + EPS }, false]);
    }
  }
  return rows;
}

function run_rows(rows, clicked) {
  test.each(rows)('%s with %j: done is %s', (task, variables, expected) => {
    expect(release(variables, { clicked }).includes(task)).toBe(expected);
  });
}

describe('mouseReleased, PID and slider tasks (no graph needs to be pressed)', () => {
  describe('K>1', () => run_rows([
    ['PID_(K>1)', { K: 1 }, false],
    ['PID_(K>1)', { K: 1.01 }, true],
  ]));

  describe('T_i > T_1', () => run_rows([
    ['PID_(T_i)>(T_1)', { T_i: 1, T_1: 1 }, false],
    ['PID_(T_i)>(T_1)', { T_i: 1.01, T_1: 1 }, true],
    ['PID_(T_i)>(T_1)', { T_i: 1, T_1: 5 }, false],
  ]));

  describe('Td=0 and T_1 close to 1', () => run_rows([
    ['PID_(Td=0,T_1=1)', { T_d: 0, T_1: 1 }, true],
    ['PID_(Td=0,T_1=1)', { T_d: 0, T_1: 0.89 }, false], // open at 0.89
    ['PID_(Td=0,T_1=1)', { T_d: 0, T_1: 0.9 }, true],
    ['PID_(Td=0,T_1=1)', { T_d: 0, T_1: 1.09 }, true],
    ['PID_(Td=0,T_1=1)', { T_d: 0, T_1: 1.1 }, false], // open at 1.1
    ['PID_(Td=0,T_1=1)', { T_d: 0.1, T_1: 1 }, false],
  ]));

  describe('k_1 between 0.5 and 0.7', () => run_rows([
    ['PID_(k_1)', { k_1: 0.5 }, false],
    ['PID_(k_1)', { k_1: 0.51 }, true],
    ['PID_(k_1)', { k_1: 0.69 }, true],
    ['PID_(k_1)', { k_1: 0.7 }, false],
  ]));

  describe('T_d different from 0', () => run_rows([
    ['PID_(T_d!=0)', { T_d: 0 }, false],
    ['PID_(T_d!=0)', { T_d: 0.1 }, true],
    ['PID_(T_d!=0)', { T_d: -0.1 }, true],
  ]));

  describe('PID parameter loaded away from its default', () => run_rows([
    ['PID_Load', {}, false],
    ['PID_Load', { K: 2 }, true],
    ['PID_Load', { T_i: 2 }, true],
    ['PID_Load', { T_d: 1 }, true],
  ]));

  describe('w=8, z=0.05, k_3=1', () => run_rows(
    range_rows('w=8,z=0.05,k_3=1', { k_3: 1, w: 8, z: 0.05 },
      { k_3: [0.9, 1.1], w: [7.3, 8.7], z: [0.02, 0.07] })));

  describe('w=2, z=0.7, k_3=0.7', () => run_rows(
    range_rows('w=2,z=0.7,k3=0.7', { k_3: 0.7, w: 2, z: 0.7 },
      { k_3: [0.6, 0.8], w: [1.88, 2.15], z: [0.66, 0.75] })));

  test('the two w, z, k_3 tasks exclude each other', () => {
    const first = release({ k_3: 1, w: 8, z: 0.05 });
    expect(first).toContain('w=8,z=0.05,k_3=1');
    expect(first).not.toContain('w=2,z=0.7,k3=0.7');
    const second = release({ k_3: 0.7, w: 2, z: 0.7 });
    expect(second).toContain('w=2,z=0.7,k3=0.7');
    expect(second).not.toContain('w=8,z=0.05,k_3=1');
  });

  describe('k4=0.75, T6=9.25, T7=0.5, T8=2', () => {
    run_rows(range_rows('k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 9.25, T_7: 0.5, T_8: 2 },
      { k_4: [0.65, 0.85], T_7: [0.33, 0.7], T_6: [8, 10], T_8: [1.5, 2.5] }));
    // It does not matter which of T_6 and T_7 is the larger one:
    run_rows([
      ['k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 0.5, T_7: 9.25, T_8: 2 }, true],
      ['k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 0.2, T_7: 9.25, T_8: 2 }, false],
      ['k4=0.75,T6=9.25,T7=0.5,T8=2', { k_4: 0.75, T_6: 0.5, T_7: 10.5, T_8: 2 }, false],
    ]);
  });
});

describe('mouseReleased, preset graphs', () => {
  function with_graphs(preset, props, task) {
    return release({}, { graphs: [make_graph(preset, props)] }).includes(task);
  }

  describe('two real poles: phase margin and gain crossover', () => {
    test.each([
      [52.9, false], [53, true], [55, true], [57, true], [57.1, false],
    ])('phase margin %s: phasemargin=55 done is %s', (margin, expected) => {
      expect(with_graphs('GRAPH_TWO_REAL_POLES', { bode_phase_margin: margin }, 'phasemargin=55')).toBe(expected);
    });

    test.each([
      [2.79, false], [2.8, true], [3, true], [3.2, true], [3.21, false],
    ])('gain crossover %s: gaincrossover=3 done is %s', (frequency, expected) => {
      expect(with_graphs('GRAPH_TWO_REAL_POLES', { bode_gain_crossover_freq: frequency }, 'gaincrossover=3')).toBe(expected);
    });

    test('both tasks are reported for a graph that fulfils both', () => {
      const tasks = release({}, { graphs: [make_graph('GRAPH_TWO_REAL_POLES', { bode_phase_margin: 55, bode_gain_crossover_freq: 3 })] });
      expect(tasks).toEqual(['phasemargin=55', 'gaincrossover=3']);
    });

    test('only graphs with that formula count, and any such graph is enough', () => {
      const wrong_formula = make_graph('GRAPH_ONE_REAL_POLE', { bode_phase_margin: 55, bode_gain_crossover_freq: 3 });
      expect(release({}, { graphs: [wrong_formula] })).toEqual([]);
      const right_formula = make_graph('GRAPH_TWO_REAL_POLES', { bode_phase_margin: 55 });
      expect(release({}, { graphs: [wrong_formula, make_graph('GRAPH_TWO_REAL_POLES'), right_formula] })).toEqual(['phasemargin=55']);
    });
  });

  describe('time delay: gain margin of 2', () => {
    test.each([
      [1.9, false], [1.915, true], [2, true], [2.095, true], [2.11, false],
    ])('gain margin %s (as a ratio): L_gain_margin=2 done is %s', (gain, expected) => {
      expect(with_graphs('GRAPH_TIME_DELAY', { bode_gain_margin: db(gain) }, 'L_gain_margin=2')).toBe(expected);
    });

    test.each([1.91, 2.1])('the edge %s itself is included', (gain) => {
      expect(with_graphs('GRAPH_TIME_DELAY', { bode_gain_margin: db_for_exact_ratio(gain) }, 'L_gain_margin=2')).toBe(true);
    });

    test('is not reported for another formula', () => {
      expect(with_graphs('GRAPH_FOUR_POLES', { bode_gain_margin: db(2) }, 'L_gain_margin=2')).toBe(false);
    });
  });

  describe('four poles: gain margin 5 at phase crossover 2, and phase margin 45', () => {
    const gain_margin_5 = { bode_gain_margin: db(5), bode_phase_crossover_freq: 2 };

    test.each([
      ['both in range', gain_margin_5, true],
      ['gain margin below range', { ...gain_margin_5, bode_gain_margin: db(4.75) }, false],
      ['gain margin lowest accepted', { ...gain_margin_5, bode_gain_margin: db(4.85) }, true],
      ['gain margin exactly 4.8', { ...gain_margin_5, bode_gain_margin: db_for_exact_ratio(4.8) }, true],
      ['gain margin highest accepted', { ...gain_margin_5, bode_gain_margin: db(5.15) }, true],
      ['gain margin above range', { ...gain_margin_5, bode_gain_margin: db(5.25) }, false],
      ['phase crossover below range', { ...gain_margin_5, bode_phase_crossover_freq: 1.89 }, false],
      ['phase crossover at lower edge', { ...gain_margin_5, bode_phase_crossover_freq: 1.9 }, true],
      ['phase crossover at upper edge', { ...gain_margin_5, bode_phase_crossover_freq: 2.1 }, true],
      ['phase crossover above range', { ...gain_margin_5, bode_phase_crossover_freq: 2.11 }, false],
    ])('%s: gainm=5_phasex=2 done is %s', (_, props, expected) => {
      expect(with_graphs('GRAPH_FOUR_POLES', props, 'gainm=5_phasex=2')).toBe(expected);
    });

    test.each([
      [41.9, false], [42, true], [45, true], [48, true], [48.1, false],
    ])('phase margin %s: phasemargin=45 done is %s', (margin, expected) => {
      expect(with_graphs('GRAPH_FOUR_POLES', { bode_phase_margin: margin }, 'phasemargin=45')).toBe(expected);
    });

    test('a two-real-poles graph with margin 45 does not complete the four-poles task', () => {
      expect(with_graphs('GRAPH_TWO_REAL_POLES', { bode_phase_margin: 45 }, 'phasemargin=45')).toBe(false);
    });
  });
});

describe('mouseReleased, tasks that depend on which plot was pressed', () => {
  const T2_T3 = 'T2,T3=0.05_and_5';
  const t2_t3_rows = [
    ...range_rows(T2_T3, { T_2: 0.05, T_3: 5 }, { T_2: [0.035, 0.07], T_3: [4, 5.8] }),
    [T2_T3, { T_2: 5, T_3: 0.05 }, true], // either order
    [T2_T3, { T_2: 5.9, T_3: 0.05 }, false],
  ];

  describe.each([
    ['step response', CLICKED.time_response],
    ['Bode magnitude', CLICKED.bode_mag],
    ['Bode phase', CLICKED.bode_phase],
    ['pole-zero map', CLICKED.pole_zero],
  ])('%s of graph 0', (_, clicked) => {
    run_rows(t2_t3_rows, clicked);
  });

  test('the T_2, T_3 task needs graph number 0 to have been pressed', () => {
    const inside = { T_2: 0.05, T_3: 5 };
    expect(release(inside, { clicked: NO_CLICK })).not.toContain(T2_T3);
    expect(release(inside, { clicked: { ...NO_CLICK, clicked_on_time_response_graph_no: 1 } })).not.toContain(T2_T3);
    expect(release(inside, { clicked: { ...NO_CLICK, clicked_on_bode_mag_graph_no: 1 } })).not.toContain(T2_T3);
    expect(release(inside, { clicked: { ...NO_CLICK, clicked_on_bode_phase_graph_no: 1 } })).not.toContain(T2_T3);
    expect(release(inside, { clicked: { ...NO_CLICK, clicked_on_pole_zero_graph_no: 1 } })).not.toContain(T2_T3);
  });

  describe('step response of graph 0', () => {
    run_rows([
      ['k1=2.9', { k_1: 2.8 }, false], // open at 2.8
      ['k1=2.9', { k_1: 2.81 }, true],
      ['k1=2.9', { k_1: 2.99 }, true], // closed at 2.99
      ['k1=2.9', { k_1: 2.991 }, false],
      ['L=3', { L: 2.92 }, false],
      ['L=3', { L: 2.93 }, true], // closed at 2.93
      ['L=3', { L: 3.09 }, true],
      ['L=3', { L: 3.1 }, false], // open at 3.1
    ], CLICKED.time_response);

    test('the tasks are not reported when another plot was pressed', () => {
      const tasks = release({ k_1: 2.9, L: 3 }, { clicked: CLICKED.bode_mag });
      expect(tasks).not.toContain('k1=2.9');
      expect(tasks).not.toContain('L=3');
    });
  });

  describe('Bode plots of graph 0', () => {
    describe.each([['magnitude', CLICKED.bode_mag], ['phase', CLICKED.bode_phase]])('%s', (_, clicked) => {
      run_rows(range_rows('T1_k1_bode', { k_1: 0.65, T_1: 2 }, { k_1: [0.55, 0.75], T_1: [1.82, 2.25] }), clicked);
      run_rows([
        ...range_rows('T2=10,T3=0.5', { T_2: 0.5, T_3: 10 }, { T_2: [0.45, 0.55], T_3: [9, 11] }),
        ['T2=10,T3=0.5', { T_2: 10, T_3: 0.5 }, true],
      ], clicked);
    });

    test('the Bode tasks are not reported when only the step response was pressed', () => {
      const tasks = release({ k_1: 0.65, T_1: 2, T_2: 0.5, T_3: 10 }, { clicked: CLICKED.time_response });
      expect(tasks).not.toContain('T1_k1_bode');
      expect(tasks).not.toContain('T2=10,T3=0.5');
    });
  });

  describe('Bode plots of graph 0, matching Nyquist diagrams', () => {
    const TASK = 'k4=1,T6=2.5,T7=1,T8=6';
    // graph 0 is the user's graph, graph 1 the ghost it has to match
    const user = { bode_gain_array: [1, 2, 3], bode_complex_array: [{ re: 1, im: 2 }, { re: 0.5, im: -2 }, { re: 0.2, im: 0 }] };
    const scaled = (props) => ({
      bode_gain_array: user.bode_gain_array.map((v) => v * (props.gain ?? 1)),
      bode_complex_array: user.bode_complex_array.map(({ re, im }) => ({
        re: re * (props.re ?? 1), im: im * (im > 0 ? props.im_max ?? 1 : props.im_min ?? 1),
      })),
    });
    const done = (ghost_props, variables = { k_4: 1 }, clicked = CLICKED.bode_mag) => {
      const graphs = [make_graph(null, user), make_graph(null, scaled(ghost_props))];
      return release(variables, { graphs, clicked }).includes(TASK);
    };

    test('an identical ghost completes the task, from either Bode plot', () => {
      expect(done({})).toBe(true);
      expect(done({}, { k_4: 1 }, CLICKED.bode_phase)).toBe(true);
    });

    test.each([
      ['gain', 'gain'], ['real part', 're'], ['largest imaginary part', 'im_max'], ['smallest imaginary part', 'im_min'],
    ])('the %s of the ghost has to be within -8 / +7 percent', (_, key) => {
      expect(done({ [key]: 0.91 })).toBe(false);
      expect(done({ [key]: 0.93 })).toBe(true);
      expect(done({ [key]: 1.06 })).toBe(true);
      expect(done({ [key]: 1.08 })).toBe(false);
    });

    test.each([
      [0.949, false], [0.95, true], [1.05, true], [1.051, false],
    ])('k_4 = %s: done is %s', (k_4, expected) => {
      expect(done({}, { k_4 })).toBe(expected);
    });

    test('nothing happens when the step response or the pole-zero map was pressed', () => {
      expect(done({}, { k_4: 1 }, CLICKED.time_response)).toBe(false);
      expect(done({}, { k_4: 1 }, CLICKED.pole_zero)).toBe(false);
    });

    // Without the ghost graph (deleted or never added) bode_graphs[1] is undefined: the release of
    // the mouse must not throw, it just does not complete the task.
    test('a single graph does not make mouseReleased throw', () => {
      expect(() => release({ k_4: 1 }, { graphs: [make_graph(null, user)], clicked: CLICKED.bode_mag })).not.toThrow();
      expect(window.task_done).not.toHaveBeenCalledWith(TASK);
    });

    test('no graph at all does not make mouseReleased throw', () => {
      expect(() => release({ k_4: 1 }, { graphs: [], clicked: CLICKED.bode_mag })).not.toThrow();
    });
  });

  describe('pole-zero map of graph 0', () => {
    describe('one pole', () => {
      run_rows([
        ['T1_pole=-2', { T_1: 0.44 }, false],
        ['T1_pole=-2', { T_1: 0.45 }, true],
        ['T1_pole=-2', { T_1: 0.55 }, true],
        ['T1_pole=-2', { T_1: 0.56 }, false],
        ['T1_unstable', { T_1: -0.001 }, true],
        ['T1_unstable', { T_1: 0 }, false],
        ['T1_unstable', { T_1: 0.5 }, false],
      ], CLICKED.pole_zero);
    });

    describe('two real poles with k_2 = 0.5', () => {
      const TASK = 'T2,T3=1,k2=0.5';
      run_rows([
        [TASK, { k_2: 0.5, T_2: 1, T_3: 1 }, true],
        [TASK, { k_2: 0.49, T_2: 1, T_3: 1 }, true],
        [TASK, { k_2: 0.51, T_2: 1, T_3: 1 }, true],
        [TASK, { k_2: 0.489, T_2: 1, T_3: 1 }, false],
        [TASK, { k_2: 0.511, T_2: 1, T_3: 1 }, false],
        [TASK, { k_2: 0.5, T_2: 0.55, T_3: 1.2 }, true], // smallest accepted: T_2 at 0.55, sum 1.75
        [TASK, { k_2: 0.5, T_2: 0.54, T_3: 1.3 }, false],
        [TASK, { k_2: 0.5, T_2: 0.6, T_3: 1.65 }, true], // largest accepted T_3
        [TASK, { k_2: 0.5, T_2: 0.6, T_3: 1.66 }, false],
        [TASK, { k_2: 0.5, T_2: 1.2, T_3: 0.55 }, true], // either order
        [TASK, { k_2: 0.5, T_2: 1, T_3: 0.75 }, true], // smallest accepted sum, 1.75
        [TASK, { k_2: 0.5, T_2: 1, T_3: 0.7 }, false],
        [TASK, { k_2: 0.5, T_2: 1.15, T_3: 1.15 }, true], // largest accepted sum, 2.3
        [TASK, { k_2: 0.5, T_2: 1.16, T_3: 1.15 }, false],
      ], CLICKED.pole_zero);
    });

    describe('complex poles', () => {
      run_rows(range_rows('w=0.9,z=0.0', { w: 0.9, z: 0 }, { w: [0.85, 0.95], z: [null, 0.05] }), CLICKED.pole_zero);
      run_rows(range_rows('w=1.6,z=0.2', { w: 1.6, z: 0.2 }, { w: [1.55, 1.65], z: [0.15, 0.25] }), CLICKED.pole_zero);
    });

    describe('one zero and two poles', () => {
      const TASK = 'k4,T6,T7=1,T8=1.5_poles';
      const inside = { k_4: 1, T_8: -1.5, T_6: 1, T_7: 1 };
      run_rows([
        ...range_rows(TASK, inside, { k_4: [0.95, 1.05, false, true], T_8: [-1.7, -1.35], T_6: [0.7, 1.3] }),
        [TASK, { ...inside, T_6: 1.5, T_7: 0.5 }, true], // only the sum of T_6 and T_7 counts
        [TASK, { ...inside, T_7: 0.7, T_6: 1 }, true],
        [TASK, { ...inside, T_7: 0.69, T_6: 1 }, false],
      ], CLICKED.pole_zero);
    });

    test('the pole-zero tasks are not reported when only a Bode plot was pressed', () => {
      // (k_4 = 1 makes the Nyquist comparison of the Bode tasks run, which needs a graph and its ghost.)
      const graphs = [make_graph(null), make_graph(null)];
      const tasks = release({ T_1: 0.5, w: 0.9, z: 0, k_4: 1, T_8: -1.5, T_6: 1, T_7: 1 }, { graphs, clicked: CLICKED.bode_mag });
      for (const task of ['T1_pole=-2', 'w=0.9,z=0.0', 'k4,T6,T7=1,T8=1.5_poles']) expect(tasks).not.toContain(task);
    });
  });
});

describe('remove_splash_screen', () => {
  const LOGOS = ['pze_logo', 'lu_logo', 'explorer_1', 'explorer_2'];

  test('fades out the logos and starts them at animation: none first', () => {
    set_globals({ splash_screen_active: true });
    window.remove_splash_screen();
    for (const id of LOGOS) {
      const style = document.getElementById(id).style;
      expect(style.opacity).toBe('0');
      expect(style.animation).toBe(`${id}_anim_out 1s ease-out 1`);
    }
  });

  test('marks the splash screen as gone, resets the text colour and logs it', () => {
    set_globals({ splash_screen_active: true });
    window.text_color = null;
    window.eval('text_color = null');
    window.remove_splash_screen();
    expect(global_value('splash_screen_active')).toBe(false);
    expect(global_value('text_color')).toEqual(['hsb(0,0%,100%)']);
    expect(window.add_event).toHaveBeenCalledWith('splash_screen_remove');
  });
});

describe('mousePressed, starting the Web Audio API', () => {
  const press = () => window.mousePressed({ preventDefault: jest.fn() });
  let saved_audio;

  beforeEach(() => {
    saved_audio = { AudioContext: window.AudioContext, webkitAudioContext: window.webkitAudioContext, audioContext: window.audioContext };
    window.mouseX = -50; // outside every plot, so the press itself does nothing more
    window.mouseY = -50;
    window.mouseButton = 'left';
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(saved_audio)) {
      if (value === undefined) delete window[name];
      else window[name] = value;
    }
  });

  test('sound_enabled == 1 creates the audio context, switches sound on and loads the jingle', () => {
    const created = jest.fn();
    window.AudioContext = class { constructor() { created(); } };
    set_globals({ sound_enabled: 1 });
    press();
    expect(created).toHaveBeenCalledTimes(1);
    expect(window.audioContext).toBeInstanceOf(window.AudioContext);
    expect(global_value('sound_enabled')).toBe(true);
    expect(window.init_jingle).toHaveBeenCalledTimes(1);
  });

  test('falls back to webkitAudioContext', () => {
    const created = jest.fn();
    delete window.AudioContext;
    window.webkitAudioContext = class { constructor() { created(); } };
    set_globals({ sound_enabled: 1 });
    press();
    expect(created).toHaveBeenCalledTimes(1);
    expect(global_value('sound_enabled')).toBe(true);
  });

  test('without Web Audio support sound stays "to be initialised" and the jingle is still requested', () => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    set_globals({ sound_enabled: 1 });
    press();
    expect(log).toHaveBeenCalledWith('No Web Audio API support');
    expect(global_value('sound_enabled')).toBe(1);
    expect(window.init_jingle).toHaveBeenCalledTimes(1);
  });

  test.each([0, false])('sound_enabled = %s does not touch the audio', (value) => {
    const created = jest.fn();
    window.AudioContext = class { constructor() { created(); } };
    set_globals({ sound_enabled: value });
    press();
    expect(created).not.toHaveBeenCalled();
    expect(window.init_jingle).not.toHaveBeenCalled();
    expect(global_value('sound_enabled')).toBe(value);
  });

  // sound_enabled becomes true once the audio is up, and `true == 1` in JavaScript, so a loose
  // comparison would create yet another AudioContext and download the jingle on every later press.
  test('a second press does not create another audio context', () => {
    const created = jest.fn();
    window.AudioContext = class { constructor() { created(); } };
    set_globals({ sound_enabled: 1 });
    press();
    press();
    expect(created).toHaveBeenCalledTimes(1);
  });
});

describe('mouse_is_in_a_box', () => {
  const rect = { left: 100, right: 300, top: 50, bottom: 250 };

  function open_box(selector) {
    const box = document.querySelector(selector);
    box.classList.add('active');
    box.getBoundingClientRect = () => rect;
  }

  test.each(['.download_script_box', '.toolbox', '.info', '.achievements_box', '.assignments_box'])('%s is checked when active', (selector) => {
    open_box(selector);
    expect(window.mouse_is_in_a_box(200, 150)).toBe(true);
  });

  test('no box is active', () => {
    expect(window.mouse_is_in_a_box(200, 150)).toBe(false);
  });

  test.each([
    ['left edge', 100, 150, true], ['right edge', 300, 150, true], ['top edge', 200, 50, true], ['bottom edge', 200, 250, true],
    ['left of the box', 99.9, 150, false], ['right of the box', 300.1, 150, false],
    ['above the box', 200, 49.9, false], ['below the box', 200, 250.1, false],
  ])('the %s of an active box', (_, x, y, expected) => {
    open_box('.info');
    expect(window.mouse_is_in_a_box(x, y)).toBe(expected);
  });

  test('a box that is not active is ignored even if the point is inside its rectangle', () => {
    const box = document.querySelector('.info');
    box.getBoundingClientRect = () => rect;
    expect(window.mouse_is_in_a_box(200, 150)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cases added after Stryker mutation testing (npm run test:mutation) showed that no test noticed
// these changes to src/mouse_pressed.js.

// Plot geometry with a different, non-zero value for every position and size, so that a swapped
// sign anywhere moves an edge. The offsets (graph_*_x_offset ...) are constants of the app.
const DISTINCT_GEOMETRY = {
  graph_step_response_x: 11, graph_step_response_y: 13, graph_step_response_width: 200, graph_step_response_height: 100,
  graph_bode_mag_x: 17, graph_bode_mag_y: 19, graph_bode_mag_width: 150, graph_bode_mag_height: 90,
  graph_bode_phase_x: 23, graph_bode_phase_y: 29, graph_bode_phase_width: 160, graph_bode_phase_height: 80,
  graph_nyquist_x: 31, graph_nyquist_y: 37, graph_nyquist_width: 120, graph_nyquist_height: 110,
};

describe('mutation gaps: the regions of the canvas that react to a press', () => {
  beforeEach(() => set_globals(DISTINCT_GEOMETRY));

  // Each region is described by its edges as absolute canvas coordinates:
  // [low, high, low edge belongs to the region, high edge belongs to the region].
  function regions() {
    const g = global_value;
    const sx = g('graph_step_response_x') + g('graph_step_response_x_offset');
    const sy = g('graph_step_response_y') + g('graph_step_response_y_offset');
    const mx = g('graph_bode_mag_x') + g('graph_bode_mag_x_offset');
    const my = g('graph_bode_mag_y') + g('graph_bode_mag_y_offset');
    const px = g('graph_bode_phase_x') + g('graph_bode_phase_x_offset');
    const py = g('graph_bode_phase_y') + g('graph_bode_phase_y_offset');
    const nx = g('graph_nyquist_x') + g('graph_nyquist_x_offset');
    const ny = g('graph_nyquist_y') + g('graph_nyquist_y_offset');
    const step_x = [sx, sx + g('graph_step_response_width'), false, false];
    const step_bottom = sy + g('graph_step_response_height');
    const mag_x = [mx, mx + g('graph_bode_mag_width'), false, false];
    const mag_bottom = my + g('graph_bode_mag_height');
    const phase_x = [px, px + g('graph_bode_phase_width'), false, false];
    const phase_bottom = py + g('graph_bode_phase_height');
    return {
      mouse_in_step_response_time_axis: { x: step_x, y: [step_bottom, step_bottom + g('graph_step_response_timeaxis_height'), true, true] },
      mouse_in_step_response: { x: step_x, y: [sy, step_bottom, false, false] },
      mouse_in_bode_mag_frequency_axis: { x: mag_x, y: [mag_bottom, mag_bottom + g('graph_bode_phase_axis_height'), true, false] },
      mouse_in_bode_mag_yaxis: { x: [g('graph_bode_mag_x'), g('graph_bode_mag_x') + g('graph_bode_mag_x_offset'), false, true], y: [my, mag_bottom, false, false] },
      mouse_in_bode_mag: { x: mag_x, y: [my, mag_bottom, false, false] },
      mouse_in_nyquist: { x: [nx, nx + g('graph_nyquist_width'), false, false], y: [ny, ny + g('graph_nyquist_height'), false, false] },
      mouse_in_bode_phase_frequency_axis: { x: phase_x, y: [phase_bottom, phase_bottom + g('graph_bode_phase_axis_height'), true, false] },
      mouse_in_bode_phase_yaxis: { x: [g('graph_bode_phase_x'), g('graph_bode_phase_x') + g('graph_bode_mag_x_offset'), false, true], y: [py, phase_bottom, false, false] },
      mouse_in_bode_phase: { x: phase_x, y: [py, phase_bottom, false, false] },
    };
  }

  const hit = (name, x, y) => {
    window.mouseX = x;
    window.mouseY = y;
    return window[name]();
  };

  test.each(Object.keys({
    mouse_in_step_response_time_axis: 0, mouse_in_step_response: 0, mouse_in_bode_mag_frequency_axis: 0,
    mouse_in_bode_mag_yaxis: 0, mouse_in_bode_mag: 0, mouse_in_nyquist: 0, mouse_in_bode_phase_frequency_axis: 0,
    mouse_in_bode_phase_yaxis: 0, mouse_in_bode_phase: 0,
  }))('%s: inside, just outside and exactly on every edge', (name) => {
    const { x, y } = regions()[name];
    const middle = (edges) => (edges[0] + edges[1]) / 2;
    const mid_x = middle(x);
    const mid_y = middle(y);
    expect(hit(name, mid_x, mid_y)).toBe(true);
    for (const [axis, edges] of [['x', x], ['y', y]]) {
      const at = (value) => (axis === 'x' ? hit(name, value, mid_y) : hit(name, mid_x, value));
      const [low, high, low_included, high_included] = edges;
      expect([at(low - 0.25), at(low), at(low + 0.25)]).toEqual([false, low_included, true]);
      expect([at(high - 0.25), at(high), at(high + 0.25)]).toEqual([true, high_included, false]);
    }
  });
});

describe('mutation gaps: mouse_is_in_a_box on a scrolled page', () => {
  const rect = { left: 100, right: 300, top: 50, bottom: 250 };
  const saved = {};

  function scroll({ page_x = 0, page_y = 0, document_left = 0, document_top = 0 }) {
    for (const name of ['pageXOffset', 'pageYOffset']) saved[name] ??= Object.getOwnPropertyDescriptor(window, name);
    Object.defineProperty(window, 'pageXOffset', { configurable: true, value: page_x });
    Object.defineProperty(window, 'pageYOffset', { configurable: true, value: page_y });
    Object.defineProperty(document.documentElement, 'scrollLeft', { configurable: true, value: document_left });
    Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, value: document_top });
  }

  beforeEach(() => {
    const box = document.querySelector('.toolbox');
    box.classList.add('active');
    box.getBoundingClientRect = () => rect;
  });

  afterEach(() => {
    for (const [name, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(window, name, descriptor);
      else delete window[name];
    }
    delete document.documentElement.scrollLeft;
    delete document.documentElement.scrollTop;
  });

  // The box (viewport coordinates) is moved by the scroll to find where it is on the page.
  test.each([
    ['the page offset', { page_x: 30, page_y: 40 }, 30, 40],
    ['the document element when the page offset is 0', { document_left: 25, document_top: 35 }, 25, 35],
    ['the page offset rather than the document element when both are set', { page_x: 30, page_y: 40, document_left: 25, document_top: 35 }, 30, 40],
  ])('uses %s', (_, scrolling, dx, dy) => {
    scroll(scrolling);
    const middle_x = 200 + dx;
    const middle_y = 150 + dy;
    const at = (x, y) => window.mouse_is_in_a_box(x, y);
    expect([at(rect.left + dx - 0.1, middle_y), at(rect.left + dx, middle_y)]).toEqual([false, true]);
    expect([at(rect.right + dx, middle_y), at(rect.right + dx + 0.1, middle_y)]).toEqual([true, false]);
    expect([at(middle_x, rect.top + dy - 0.1), at(middle_x, rect.top + dy)]).toEqual([false, true]);
    expect([at(middle_x, rect.bottom + dy), at(middle_x, rect.bottom + dy + 0.1)]).toEqual([true, false]);
  });
});

describe('mutation gaps: pressing on the plots in a quiz', () => {
  const QUIZ_SPIES = [
    'quiz_clicked_time_response', 'quiz_clicked_bode_mag', 'quiz_clicked_bode_mag_xaxis', 'quiz_clicked_bode_mag_yaxis',
    'quiz_clicked_bode_phase', 'quiz_clicked_bode_phase_xaxis', 'quiz_clicked_bode_phase_yaxis', 'quiz_clicked_nyquist',
    'mouseDragged', 'push', 'pop', 'stroke', 'strokeWeight', 'line',
  ];
  const saved_functions = {};
  const event = () => ({ preventDefault: jest.fn() });

  const offset = (name) => global_value(name);
  const set_sliders = (values) => {
    const slider_values = global_value('range_slider_variables');
    const variable_position = global_value('variable_position');
    for (const [name, value] of Object.entries(values)) slider_values[variable_position[name]] = value;
  };
  const curve_graph = (preset, props = {}) => ({
    bode_formula: formula(preset), full_name: 'Graph', bode_displaybool: true,
    bode_display_bodemag_bool: true, bode_display_bodephase_bool: true, bode_display_timeresponse_bool: true,
    bode_gain_array: Array(500).fill(20), bode_phase_array: Array(500).fill(0), bode_timerep_array: Array(200).fill(50),
    ...props,
  });

  beforeEach(() => {
    for (const name of QUIZ_SPIES) {
      saved_functions[name] = window[name];
      window[name] = jest.fn();
    }
    set_globals({
      ...DISTINCT_GEOMETRY, current_quiz: 'click_freq', precision: 4, min_y_timerep: 0, max_y_timerep: 100,
      gain_upper_bound: 60, y_case_gain: 6, x_case_gain: 5, min_10power: -2, phase_upper_bound: 90, phase_lower_bound: -90,
      phase_case_number: 4, bode_graphs: [curve_graph('GRAPH_TWO_REAL_POLES')],
      clicked_on_time_variable: '',
    });
  });

  afterEach(() => {
    for (const name of QUIZ_SPIES) window[name] = saved_functions[name];
  });

  test('the frequency axes of both Bode plots measure with the geometry of the phase plot', () => {
    window.mouseX = 100;
    const expected = Math.pow(10, (100 - 23 - offset('graph_bode_phase_x_offset')) / 160 * 5 - 2);
    expect(window.press_bode_mag_frequency_axis(event())).toBe(false);
    expect(window.quiz_clicked_bode_mag_xaxis.mock.calls[0][0]).toBeCloseTo(expected, 8);
    expect(window.press_bode_phase_frequency_axis(event())).toBe(false);
    expect(window.quiz_clicked_bode_phase_xaxis.mock.calls[0][0]).toBeCloseTo(expected, 8);
  });

  test('the magnitude at the mouse follows the Bode magnitude plot', () => {
    window.mouseY = 70;
    const perc = (70 - 19 - offset('graph_bode_mag_y_offset')) / 90;
    expect(window.bode_magnitude_at_mouse_y()).toBeCloseTo(Math.pow(10, (60 - perc * 120) / 20), 8);
  });

  test('a press on the step response draws the vertical line through the plot', () => {
    window.mouseX = 100;
    window.mouseY = 60;
    expect(window.press_step_response(event())).toBe(false);
    const top = 13 + offset('graph_step_response_y_offset');
    expect(window.push).toHaveBeenCalledTimes(1);
    expect(window.stroke).toHaveBeenCalledWith(global_value('text_color'));
    expect(window.strokeWeight).toHaveBeenCalledWith(2);
    expect(window.line).toHaveBeenCalledWith(100, top, 100, top + 100);
    expect(window.pop).toHaveBeenCalledTimes(1);
  });

  test('in a quiz the step response press reports time and amplitude', () => {
    set_globals({ min_y_timerep: -20, max_y_timerep: 100 });
    window.mouseX = 100;
    window.mouseY = 60;
    window.press_step_response(event());
    const time = (100 - 11 - offset('graph_step_response_x_offset')) / 200 * 10;
    const amplitude = 100 - 120 * (60 - 13 - offset('graph_step_response_y_offset')) / 100;
    const [graph_no, reported_time, reported_amplitude, variable] = window.quiz_clicked_time_response.mock.calls[0];
    expect(graph_no).toBe(0);
    expect(reported_time).toBeCloseTo(time, 8);
    expect(reported_amplitude).toBeCloseTo(amplitude, 8);
    expect(variable).toBe(global_value('clicked_on_time_variable'));
  });

  test('a Nyquist press exactly on the real axis counts as the upper half plane (-360 degrees on the right)', () => {
    set_globals({ max_nyquist_y: 2, min_nyquist_y: -2, min_nyquist_x: -3, max_nyquist_x: 1 });
    const real_axis_y = 37 + 55 + offset('graph_nyquist_y_offset'); // origo is in the middle of the 110 px high plot
    window.mouseX = 31 + offset('graph_nyquist_x_offset') + 120 * 0.9; // axis_x = -3 + 4 * 0.9 = 0.6
    window.mouseY = real_axis_y;
    window.press_nyquist(event());
    const [magnitude, angle] = window.quiz_clicked_nyquist.mock.calls[0];
    expect(magnitude).toBeCloseTo(0.6, 8);
    expect(angle).toBeCloseTo(-270 - 90, 8);
  });

  test('a step response outside the plot range counts as being at the edge of the plot', () => {
    const real_map = window.map;
    // p5's map(value, a, b, c, d, true) clamps the result to [c, d]; the stand-in used by the other tests does not.
    window.map = (value, a, b, c, d, clamp) => {
      const result = c + (value - a) * (d - c) / (b - a);
      return clamp ? Math.min(Math.max(c, d), Math.max(Math.min(c, d), result)) : result;
    };
    try {
      set_globals({
        bode_graphs: [
          curve_graph('GRAPH_ONE_REAL_POLE', { bode_timerep_array: Array(200).fill(500) }),
          curve_graph('GRAPH_ONE_REAL_POLE', { bode_timerep_array: Array(200).fill(50) }),
        ],
      });
      window.mouseX = 100;
      window.mouseY = 13 + offset('graph_step_response_y_offset'); // the top of the plot, where 500 is drawn
      window.press_step_response(event());
      expect(global_value('clicked_on_time_response_graph_no')).toBe(0);
    } finally {
      window.map = real_map;
    }
  });

  test.each([
    ['Bode magnitude', 'press_bode_mag', 'bode_mag', 'quiz_clicked_bode_mag', 17, 150, 73],
    ['Bode phase', 'press_bode_phase', 'bode_phase', 'quiz_clicked_bode_phase', 23, 160, 139],
  ])('%s: the closest time constant and the frequency come from the press relative to the plot', (_, press, __, quiz_click, plot_x, plot_width, mouse_y) => {
    // T_2 sits at 60 px and T_3 at 120 px in the frequency axis (width 150, 30 px per decade from 0.01 rad/s).
    set_sliders({ T_2: 1, T_3: 0.01 });
    window.mouseX = 70 + offset('graph_bode_mag_x_offset') + plot_x; // 70 px into the plot: closer to T_2
    window.mouseY = mouse_y;
    expect(window[press](event())).toBe(false);
    expect(global_value('clicked_on_time_variable')).toBe('T_2');
    const [graph_no, frequency, , variable] = window[quiz_click].mock.calls[0];
    expect(graph_no).toBe(0);
    expect(variable).toBe('T_2');
    expect(frequency).toBeCloseTo(Math.pow(10, 70 / plot_width * 5 - 2), 8);
  });

  test('Bode phase: the curve is placed using the phase bounds in radians', () => {
    // Phase bounds -90..90 degrees; graph 0 is at -0.3 rad, graph 1 at 0.7 rad. Pressing on the curve of a graph picks it.
    set_globals({
      bode_graphs: [
        curve_graph('GRAPH_ONE_REAL_POLE', { bode_phase_array: Array(500).fill(-0.3) }),
        curve_graph('GRAPH_ONE_REAL_POLE', { bode_phase_array: Array(500).fill(0.7) }),
      ],
    });
    const y_of = (phase) => 29 + offset('graph_bode_phase_y_offset') + 80 * (1 - (phase + Math.PI / 2) / Math.PI);
    window.mouseX = 200;
    for (const [phase, expected] of [[-0.3, 0], [0.7, 1]]) {
      window.quiz_clicked_bode_phase.mockClear();
      window.mouseY = y_of(phase);
      window.press_bode_phase(event());
      expect(window.quiz_clicked_bode_phase.mock.calls[0][0]).toBe(expected);
    }
  });
});

describe('mutation gaps: choosing the graph and the time constant that a press moves', () => {
  test('graphs_near_press only lists displayed graphs in this plot within less than 70 pixels', () => {
    set_globals({
      bode_graphs: [
        { bode_displaybool: true, full_name: 'Graph', shown: true, d: 69.9 },
        { bode_displaybool: true, full_name: 'Graph', shown: true, d: 70 },
        { bode_displaybool: false, full_name: 'Graph', shown: true, d: 1 },
        { bode_displaybool: true, full_name: 'Graph', shown: false, d: 1 },
        { bode_displaybool: true, full_name: 'GhostMPTNIE_x', shown: true, d: 10 },
      ],
    });
    const near = window.graphs_near_press((graph) => graph.shown, (graph) => graph.d);
    expect(near.queue_with_ghosts).toEqual([[69.9, 0], [10, 4]]);
    expect(near.queue).toEqual([[69.9, 0]]);
  });

  test('graphs_near_press with no graph at all gives two empty lists', () => {
    set_globals({ bode_graphs: [] });
    expect(window.graphs_near_press(() => true, () => 0)).toEqual({ queue: [], queue_with_ghosts: [] });
  });

  test('closest_in_queue picks the smallest distance and the first one of equals', () => {
    expect(window.closest_in_queue([])).toBeUndefined();
    expect(window.closest_in_queue([[5, 0], [3, 1], [3, 2], [4, 3]])).toEqual([3, 1]);
    expect(window.closest_in_queue([[9999, 0]])).toEqual([9999, 0]);
  });
});

describe('mutation gaps: the pole-zero maps', () => {
  const event = () => ({ preventDefault: jest.fn() });
  const map_graph = (preset, props = {}) => ({ bode_formula: formula(preset), bode_displaybool: true, ...props });

  beforeEach(() => {
    set_globals({
      pole_zero_width: 96, pole_zero_height: 96, pole_zero_graph_x: [100, 300], pole_zero_graph_y: [200, 400],
      clicked_on_time_variable: '', current_quiz: 'none',
    });
    window.mouseDragged = jest.fn();
    window.quiz_clicked_pole_zero = jest.fn();
  });

  afterEach(() => {
    delete window.mouseDragged;
    delete window.quiz_clicked_pole_zero;
  });

  test.each(['GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TWO_COMPLEX_POLES', 'GRAPH_ONE_ZERO_TWO_POLES', 'GRAPH_PID'])(
    '%s has a pole-zero map', (preset) => {
      expect(window.graph_has_pole_zero_map(formula(preset))).toBe(true);
    });

  test.each(['GRAPH_TIME_DELAY', 'GRAPH_FOUR_POLES'])('%s has none', (preset) => {
    expect(window.graph_has_pole_zero_map(formula(preset))).toBe(false);
  });

  test('a press just inside each edge of the map is taken, one exactly on the edge is not', () => {
    set_globals({ bode_graphs: [map_graph('GRAPH_ONE_REAL_POLE')] });
    const press = (x, y) => {
      window.mouseX = x;
      window.mouseY = y;
      return window.press_in_pole_zero_maps(event());
    };
    expect(press(148, 248)).toBe(true);
    expect([press(100, 248), press(100.5, 248)]).toEqual([false, true]);
    expect([press(196, 248), press(195.5, 248)]).toEqual([false, true]);
    expect([press(148, 200), press(148, 200.5)]).toEqual([false, true]);
    expect([press(148, 296), press(148, 295.5)]).toEqual([false, true]);
  });

  test('graphs that are hidden or have no map are skipped', () => {
    window.mouseX = 148;
    window.mouseY = 248;
    set_globals({ bode_graphs: [map_graph('GRAPH_ONE_REAL_POLE', { bode_displaybool: false })] });
    expect(window.press_in_pole_zero_maps(event())).toBe(false);
    set_globals({ bode_graphs: [map_graph('GRAPH_TIME_DELAY')] });
    expect(window.press_in_pole_zero_maps(event())).toBe(false);
    expect(global_value('clicked_on_pole_zero_graph_no')).toBe(-1);
  });

  test('a press in the map picks the closest time constant and reports it', () => {
    set_globals({ bode_graphs: [map_graph('GRAPH_TWO_REAL_POLES')] });
    const slider_values = global_value('range_slider_variables');
    const variable_position = global_value('variable_position');
    slider_values[variable_position.T_2] = 0.5; // pole at -2
    slider_values[variable_position.T_3] = 2; // pole at -0.5
    window.mouseX = 148; // real part -1
    window.mouseY = 248;
    window.press_in_pole_zero_maps(event());
    expect(global_value('clicked_on_pole_zero_graph_no')).toBe(0);
    expect(window.add_event).toHaveBeenCalledWith('click_pole_zero_map=0,clicked_on_time_variable=T_3');
    expect(window.mouseDragged).toHaveBeenCalledTimes(1);
  });

  test.each(['pid_controller', 'pid_controller_YL'])('in the %s assignment the plots are redrawn with fast precision', (assignment) => {
    set_globals({ bode_graphs: [map_graph('GRAPH_PID')], current_assignment: assignment, we_need_faster_calculations_right_now: false });
    window.mouseX = 148;
    window.mouseY = 248;
    window.press_in_pole_zero_maps(event());
    expect(global_value('we_need_faster_calculations_right_now')).toBe(true);
    expect(global_value('precision')).toBe(global_value('SPEED_PRECISION'));
  });

  test('in a quiz the press is reported to the quiz instead of dragging', () => {
    set_globals({ bode_graphs: [map_graph('GRAPH_ONE_REAL_POLE')], current_quiz: 'click_freq' });
    window.mouseX = 148;
    window.mouseY = 248;
    window.press_in_pole_zero_maps(event());
    expect(window.quiz_clicked_pole_zero).toHaveBeenCalledWith(0, -1, 0, '');
    expect(window.mouseDragged).not.toHaveBeenCalled();
  });
});

describe('mutation gaps: the first press', () => {
  const event = () => ({ preventDefault: jest.fn() });

  beforeEach(() => {
    jest.useFakeTimers();
    window.initial_graph = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.initial_graph;
  });

  test('starts the four starting graphs 200 ms after the press, 150 ms apart', () => {
    set_globals({ splash_screen_active: true, quiz_is_running: 0 });
    expect(window.press_to_remove_splash_screen(event())).toBe(false);
    const done_at = (ms) => {
      jest.advanceTimersByTime(ms - Date.now() + start);
      return window.initial_graph.mock.calls.length;
    };
    const start = Date.now();
    expect([199, 200, 349, 350, 499, 500, 649, 650].map(done_at)).toEqual([0, 1, 1, 2, 2, 3, 3, 4].map((n) => n));
  });

  test('starts no graphs while a quiz is running', () => {
    set_globals({ splash_screen_active: true, quiz_is_running: 1 });
    window.press_to_remove_splash_screen(event());
    jest.advanceTimersByTime(5000);
    expect(window.initial_graph).not.toHaveBeenCalled();
  });

  test('a press while the help questions are shown logs it and closes them', () => {
    const closed = [];
    const original = window.disable_questions;
    window.disable_questions = () => closed.push('closed');
    try {
      const e = event();
      expect(window.press_to_close_questions(e)).toBe(false);
      expect(window.add_event).toHaveBeenCalledWith('questions_removed');
      expect(e.preventDefault).toHaveBeenCalled();
      expect(closed).toEqual(['closed']);
      expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
    } finally {
      window.disable_questions = original;
    }
  });
});

describe('mutation gaps: tolerance limits of tasks checked on release', () => {
  describe('matching Nyquist diagrams: the 0.92 and 1.07 limits are inclusive', () => {
    const TASK = 'k4=1,T6=2.5,T7=1,T8=6';
    const user = { bode_gain_array: [1, 2, 3], bode_complex_array: [{ re: 1, im: 2 }, { re: 0.5, im: -2 }, { re: 0.2, im: 0 }] };
    const scaled = (key, factor) => ({
      bode_gain_array: user.bode_gain_array.map((v) => v * (key === 'gain' ? factor : 1)),
      bode_complex_array: user.bode_complex_array.map(({ re, im }) => ({
        re: re * (key === 're' ? factor : 1),
        im: im * ((im > 0 && key === 'im_max') || (im < 0 && key === 'im_min') ? factor : 1),
      })),
    });
    const done = (key, factor) => release({ k_4: 1 }, { graphs: [make_graph(null, user), make_graph(null, scaled(key, factor))], clicked: CLICKED.bode_mag }).includes(TASK);

    test.each(['gain', 're', 'im_max', 'im_min'])('%s', (key) => {
      expect(done(key, 0.92)).toBe(true);
      expect(done(key, 1.07)).toBe(true);
    });
  });
});
