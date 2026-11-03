/** @jest-environment jsdom */
// Characterization (golden master) tests for mousePressed() in src/mouse_pressed.js: what a press at
// each point of the canvas does, with and without a running quiz, for the graph types that have
// special "which time constant is closest" handling. The snapshot records current behaviour,
// quirks included. Regions are drawn as an ASCII map (one letter per distinct outcome); numeric
// quiz arguments are recorded on a coarser grid.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const QUIZ_CLICKS = [
  'quiz_clicked_pole_zero', 'quiz_clicked_time_response', 'quiz_clicked_time_response_xaxis',
  'quiz_clicked_bode_mag', 'quiz_clicked_bode_mag_xaxis', 'quiz_clicked_bode_mag_yaxis',
  'quiz_clicked_bode_phase', 'quiz_clicked_bode_phase_xaxis', 'quiz_clicked_bode_phase_yaxis',
  'quiz_clicked_nyquist',
];
const SPYABLE = [...QUIZ_CLICKS, 'add_event', 'mouseDragged', 'remove_splash_screen', 'init_jingle', 'disable_questions', 'redraw_canvas_gain', 'initial_graph'];
const originals = {};
let prevent_default;

// Geometry as setGraphDimensions() computes it for a 1295 x 800 window, plus pole-zero maps stacked on the right.
const GEOMETRY = {
  graph_bode_mag_width: 342.3, graph_bode_mag_height: 259.2, graph_bode_mag_x: 0, graph_bode_mag_y: 0,
  graph_bode_phase_width: 342.3, graph_bode_phase_height: 259.2, graph_bode_phase_x: 0, graph_bode_phase_y: 259.2,
  graph_step_response_width: 285.25, graph_step_response_height: 259.2, graph_step_response_x: 442.3, graph_step_response_y: -10,
  graph_nyquist_width: 285.25, graph_nyquist_height: 259.2, graph_nyquist_x: 442.3, graph_nyquist_y: 324.2,
  pole_zero_width: 96, pole_zero_height: 96,
  pole_zero_graph_x: [799, 799, 799, 799], pole_zero_graph_y: [0, 120, 240, 360],
  phase_upper_bound: 0, phase_lower_bound: -180, phase_case_number: 4,
  min_y_timerep: 0, max_y_timerep: 100,
};
// Time constants, chosen so that the "closest one" decisions differ along the axes. T_8 is clamped in the pole-zero maps.
const TIME_CONSTANTS = { T_2: 0.5, T_3: 2.0, T_6: 1.0, T_7: 3.0, T_8: 0.2, T_i: 2.0, T_d: 0.5 };

function make_graph(formula, index, full_name = 'Graph') {
  const array = (length, f) => Array.from({ length }, (_, i) => f(i));
  return {
    bode_formula: formula, full_name,
    bode_displaybool: true, bode_display_bodemag_bool: true, bode_display_bodephase_bool: true, bode_display_timeresponse_bool: true,
    bode_gain_array: array(400, (i) => 20 - 0.15 * i - 12 * index),
    bode_phase_array: array(400, (i) => -(Math.PI / 2) * (1 - Math.exp(-i / 100)) - 0.3 * index),
    bode_timerep_array: array(100, (i) => 100 * (1 - Math.exp(-i / (20 + 10 * index)))),
  };
}

function setup_graphs(with_ghost) {
  const f = (name) => global_value(name).formula;
  const graphs = [
    make_graph(f('GRAPH_ONE_REAL_POLE'), 0), make_graph(f('GRAPH_TWO_REAL_POLES'), 1),
    make_graph(f('GRAPH_ONE_ZERO_TWO_POLES'), 2), make_graph(f('GRAPH_PID'), 3),
  ];
  if (with_ghost) graphs.push(make_graph(f('GRAPH_ONE_REAL_POLE'), 4, 'GhostMPTNIE_ghost'));
  set_globals({ bode_graphs: graphs });
}

const round6 = (value) => (typeof value === 'number' ? Number(value.toPrecision(6)) : value);

// Presses at (x, y) and returns everything observable about the effect.
function press(x, y, { button = 'left' } = {}) {
  for (const name of SPYABLE) window[name].mockClear();
  prevent_default.mockClear();
  set_globals({
    precision: 4, we_need_faster_calculations_right_now: false,
    clicked_on_time_variable: '', initial_mouseX: 0, initial_mouseY: 0,
  });
  window.mouseX = x;
  window.mouseY = y;
  window.mouseButton = button === 'right' ? 'right' : 'left';
  const event = { preventDefault: prevent_default };
  const returned = window.mousePressed(event);
  const called = SPYABLE.filter((name) => window[name].mock.calls.length > 0)
    .map((name) => ({ name, args: window[name].mock.calls.map((args) => args.map(round6)) }));
  return {
    returned, prevented: prevent_default.mock.calls.length > 0, called,
    clicked: ['clicked_on_time_response_graph_no', 'clicked_on_bode_mag_graph_no', 'clicked_on_bode_phase_graph_no',
      'clicked_on_time_variable', 'clicked_on_pole_zero_graph_no'].map(global_value),
    initial: [global_value('initial_mouseX'), global_value('initial_mouseY')],
    fast: global_value('we_need_faster_calculations_right_now'), precision: global_value('precision'),
  };
}

// The part of the outcome that does not depend on exact coordinates.
const structure = (r) => JSON.stringify({
  ret: r.returned, prevented: r.prevented, clicked: r.clicked, fast: r.fast,
  called: r.called.map(({ name, args }) => name === 'add_event' ? `${name}:${args.map((a) => a[0]).join('|')}` : name),
});

// One letter per distinct structure, in order of first appearance; '.' is the "nothing happens" outcome.
function region_map(presses) {
  const letters = new Map();
  const rows = [];
  for (const [y, row] of presses) {
    let line = String(y).padStart(4) + ' ';
    for (const r of row) {
      const key = structure(r);
      if (!letters.has(key)) letters.set(key, letters.size === 0 ? '.' : String.fromCharCode(64 + letters.size));
      line += letters.get(key);
    }
    rows.push(line);
  }
  const legend = [...letters].map(([key, letter]) => `${letter} ${key}`);
  return [...rows, '', ...legend].join('\n');
}

const XS = Array.from({ length: 39 }, (_, i) => i * 25);
const YS = Array.from({ length: 38 }, (_, i) => -20 + i * 20);

function sweep() {
  return YS.map((y) => [y, XS.map((x) => press(x, y))]);
}

// Exact arguments of the quiz callbacks and drag starts on a coarser grid.
function numeric_arguments() {
  const lines = [];
  for (let y = -20; y < 720; y += 40) {
    for (let x = 0; x < 950; x += 50) {
      const r = press(x, y);
      const interesting = r.called.filter(({ name }) => name !== 'add_event');
      if (interesting.length === 0 && r.returned === true) continue;
      lines.push(`${x},${y}: ret=${r.returned} ${JSON.stringify(interesting)} clicked=${JSON.stringify(r.clicked)} initial=${JSON.stringify(r.initial)}`);
    }
  }
  return lines.join('\n');
}

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
});

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  prevent_default = jest.fn();
  set_globals({
    ...GEOMETRY, splash_screen_active: false, current_quiz: 'none', current_assignment: 'none',
    questions_enabled: false, sound_enabled: 0, quiz_is_running: 0,
  });
  const variable_position = global_value('variable_position');
  const variables = global_value('range_slider_variables');
  Object.keys(TIME_CONSTANTS).forEach((name, i) => { variable_position[name] = i; variables[i] = TIME_CONSTANTS[name]; });
  for (const element of document.querySelectorAll('.active')) element.classList.remove('active');
  setup_graphs(false);
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
  jest.restoreAllMocks();
});

describe('mousePressed without a quiz', () => {
  test('outcome of a press at each point of the canvas', () => {
    expect(region_map(sweep())).toMatchSnapshot();
  });

  test('exact drag-start values', () => {
    expect(numeric_arguments()).toMatchSnapshot();
  });
});

describe('mousePressed in a quiz', () => {
  beforeEach(() => {
    set_globals({ current_quiz: 'click_freq' });
    setup_graphs(true); // a ghost graph, which is ignored when picking the graph a drag starts on
  });

  test('outcome of a press at each point of the canvas', () => {
    expect(region_map(sweep())).toMatchSnapshot();
  });

  test('exact arguments of the quiz callbacks', () => {
    expect(numeric_arguments()).toMatchSnapshot();
  });
});

// Which time constant a press picks, for a single graph on screen, along rows across each plot.
// Covers the clamping of poles outside the pole-zero map and the tie-breaking between equal time constants.
const PLOTS = {
  'Bode magnitude': { xs: range(68, 411, 3), ys: range(30, 291, 30) },
  'Bode phase': { xs: range(68, 411, 3), ys: range(369, 630, 30) },
  'step response': { xs: range(507, 793, 3), ys: range(50, 291, 30) },
  'pole-zero map': { xs: range(800, 895, 1), ys: range(5, 91, 15) },
};
const TIME_CONSTANT_CASES = {
  'poles beyond the map edge (T_2, T_6, T_i)': { T_2: 0.3, T_3: 0.37, T_6: 0.3, T_7: 0.37, T_8: 1, T_i: 0.3, T_d: 0.37 },
  'poles beyond the map edge (T_8)': { T_2: 0.37, T_3: 0.3, T_6: 0.37, T_7: 1, T_8: 0.3, T_i: 0.37, T_d: 0.3 },
  'poles beyond the map edge (T_7)': { T_2: 0.37, T_3: 0.3, T_6: 0.37, T_7: 0.3, T_8: 1, T_i: 0.37, T_d: 0.3 },
  'T_6 equal to T_7 and T_8 further away': { T_2: 1, T_3: 1, T_6: 1, T_7: 1, T_8: 0.37, T_i: 1, T_d: 1 },
  'all time constants equal': { T_2: 1, T_3: 1, T_6: 1, T_7: 1, T_8: 1, T_i: 1, T_d: 1 },
};

function range(from, to, step) {
  const values = [];
  for (let v = from; v < to; v += step) values.push(v);
  return values;
}

// "T_2x12,T_3x30,-x5": the picked time constant along the row ('-' if nothing was picked), run-length coded.
function picked_runs(xs, y) {
  const runs = [];
  for (const x of xs) {
    const label = press(x, y).clicked[3] || '-';
    if (runs.length > 0 && runs[runs.length - 1][0] === label) runs[runs.length - 1][1] += 1;
    else runs.push([label, 1]);
  }
  return runs.map(([label, count]) => `${label}x${count}`).join(',');
}

describe('mousePressed, which time constant is picked', () => {
  describe.each(Object.entries(TIME_CONSTANT_CASES))('with %s', (_, constants) => {
    test.each(['GRAPH_TWO_REAL_POLES', 'GRAPH_ONE_ZERO_TWO_POLES', 'GRAPH_PID'])('%s', (preset) => {
      const variable_position = global_value('variable_position');
      const variables = global_value('range_slider_variables');
      Object.entries(constants).forEach(([name, value]) => { variables[variable_position[name]] = value; });
      set_globals({ bode_graphs: [make_graph(global_value(preset).formula, 0)], pole_zero_graph_x: [799], pole_zero_graph_y: [0] });
      const lines = [];
      for (const [plot, { xs, ys }] of Object.entries(PLOTS)) {
        for (const y of ys) {
          const runs = picked_runs(xs, y);
          if (runs !== `-x${xs.length}`) lines.push(`${plot} y=${y}: ${runs}`);
        }
      }
      expect(lines.join('\n')).toMatchSnapshot();
    });
  });
});

describe('mousePressed, special states', () => {
  test('a right-button press is ignored', () => {
    const r = press(100, 100, { button: 'right' });
    expect(r.returned).toBeUndefined();
    expect(r.called).toEqual([]);
  });

  test('the first press removes the splash screen and starts the four starting graphs', () => {
    jest.useFakeTimers();
    const initial_graph = jest.fn();
    window.initial_graph = initial_graph;
    set_globals({ splash_screen_active: true });
    const r = press(100, 100);
    expect(r.returned).toBe(false);
    expect(r.prevented).toBe(true);
    expect(window.remove_splash_screen).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(initial_graph).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  test('no starting graphs while a quiz is running when the splash screen is removed', () => {
    jest.useFakeTimers();
    const initial_graph = jest.fn();
    window.initial_graph = initial_graph;
    set_globals({ splash_screen_active: true, quiz_is_running: 1 });
    press(100, 100);
    jest.advanceTimersByTime(1000);
    expect(initial_graph).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('a press while the quiz intro is shown is passed on to the page', () => {
    document.querySelector('.quiz_intro').classList.add('active');
    const r = press(100, 100);
    expect(r.returned).toBe(true);
    expect(r.called).toEqual([]);
  });

  test('a press while question mode is on only closes the question mode', () => {
    set_globals({ questions_enabled: true });
    const r = press(100, 100);
    expect(r.returned).toBe(false);
    expect(r.prevented).toBe(true);
    expect(window.disable_questions).toHaveBeenCalledTimes(1);
    expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
    expect(window.mouseDragged).not.toHaveBeenCalled();
  });

  test('a press inside an open dialog box is passed on to the page', () => {
    const box = document.querySelector('.toolbox');
    box.classList.add('active');
    box.getBoundingClientRect = () => ({ left: 100, right: 300, top: 100, bottom: 300 });
    const inside = press(150, 150);
    expect(inside.returned).toBe(true);
    expect(inside.called).toEqual([]);
    // Just outside the box the Bode magnitude plot is hit again:
    expect(press(350, 150).returned).toBe(false);
  });

  test.each(['pid_controller', 'pid_controller_S', 'pid_controller_YL', 'pid_controller_OL'])(
    'with assignment %s a press in the Bode magnitude plot switches to fast precision', (assignment) => {
      set_globals({ current_assignment: assignment });
      const r = press(150, 120);
      expect(r.fast).toBe(true);
      expect(r.precision).toBe(global_value('SPEED_PRECISION'));
    });

  test('touchStarted marks the device as a touch device and presses', () => {
    window.mouseX = 150;
    window.mouseY = 120;
    window.touchStarted({ preventDefault: prevent_default });
    expect(global_value('this_is_a_touch_device')).toBe(true);
    expect(window.mouseDragged).toHaveBeenCalledTimes(1);
  });
});
