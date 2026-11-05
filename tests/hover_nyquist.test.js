// Tests for src/hover_nyquist.js: the right-click-help hover (handle_questions), the mouseMoved
// hover overlays on every plot (pole-zero map, step response, Bode magnitude/phase, Nyquist),
// draw_hover_nyquist and the grid/axis drawing helpers. The p5 drawing functions are replaced by
// a recorder so the tests can check which lines, dots and texts were drawn where.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

// Plot geometry (top-level `let`s). The offsets are constants in the app: Bode magnitude
// (68, 30), Bode phase (68, 110), axis height 35, step response (65, 40), time axis 35, Nyquist (65, 45).
// This gives the following screen regions (x, y):
//   Bode magnitude plot   (68, 368) x (30, 230)     frequency axis  y in [230, 265)   y-axis  x in (0, 68]
//   Bode phase plot       (68, 368) x (310, 510)    frequency axis  y in [510, 545)   y-axis  x in (0, 68]
//   Step response plot    (465, 715) x (40, 240)    time axis       y in [240, 275]
//   Nyquist plot          (465, 715) x (345, 545)
//   Pole-zero maps        96 x 96 at x = 800, y = 0, 120, 240, 360
const GEOMETRY = {
  canvas_width: 900, canvas_height: 700,
  graph_bode_mag_x: 0, graph_bode_mag_y: 0, graph_bode_mag_width: 300, graph_bode_mag_height: 200,
  graph_bode_phase_x: 0, graph_bode_phase_y: 200, graph_bode_phase_width: 300, graph_bode_phase_height: 200,
  graph_step_response_x: 400, graph_step_response_y: 0, graph_step_response_width: 250, graph_step_response_height: 200,
  graph_nyquist_x: 400, graph_nyquist_y: 300, graph_nyquist_width: 250, graph_nyquist_height: 200,
  pole_zero_width: 96, pole_zero_height: 96,
  pole_zero_graph_x: [800, 800, 800, 800], pole_zero_graph_y: [0, 120, 240, 360],
  min_10power: -2, x_case_gain: 5, y_case_gain: 6, gain_upper_bound: 60,
  phase_lower_bound: -180, phase_upper_bound: 0, phase_case_number: 4,
  min_y_timerep: 0, max_y_timerep: 100, max_x_timerep: 10, precision: 4,
  min_nyquist_x: -2, max_nyquist_x: 2, min_nyquist_y: -2, max_nyquist_y: 2,
  text_color: '#text', angle_color: '#angle', line_color: '#grid', box_background_color: '#box',
  rate: 1.4,
};

const P5_RECORDED = ['arc', 'ellipse', 'fill', 'line', 'noFill', 'noStroke', 'pop', 'push', 'rect', 'stroke',
  'strokeWeight', 'text', 'textAlign', 'textSize', 'translate'];
const SPYABLE = ['add_event', 'task_done', 'achievement_done', 'redraw'];
const REPLACED = [...P5_RECORDED, ...SPYABLE, 'map', 'draw_hover_nyquist', 'handle_questions'];
const originals = {};
let drawn;
let hover_answer;
let console_log;

// p5's map(), including the optional "constrain to the target range" argument that the app uses.
function p5_map(value, start1, stop1, start2, stop2, constrain = false) {
  const mapped = start2 + ((value - start1) * (stop2 - start2)) / (stop1 - start1);
  if (!constrain) return mapped;
  return Math.min(Math.max(mapped, Math.min(start2, stop2)), Math.max(start2, stop2));
}

const calls = (name) => drawn.filter((c) => c.name === name).map((c) => c.args);
const texts = () => calls('text').map((args) => args[0]);
const lines = () => calls('line');
const ellipses = () => calls('ellipse');

// Assigns a value that cannot be JSON-encoded (functions, jest mocks) to a top-level `let`.
function set_live(name, value) {
  window.__live = value;
  window.eval(`${name} = window.__live`);
  delete window.__live;
}

function fake_graph(overrides = {}) {
  // The real class, for its rules about which graph has a pole-zero map.
  return Object.assign(Object.create(global_value('bode_graph').prototype), {
    bode_formula: 'not a preset', graph_name: 'Graph', bode_hue: 100,
    bode_poles_zeros: null, bode_display_pole_zero_bool: true,
    bode_displaybool: true, bode_display_bodemag_bool: true, bode_display_bodephase_bool: true,
    bode_display_timeresponse_bool: true, bode_display_nyquist_bool: true,
    bode_gain_array: Array(400).fill(0), // 0 dB: drawn at y = 130 in the Bode magnitude plot
    bode_phase_array: Array(400).fill(-Math.PI / 2), // -90 degrees: drawn at y = 410 in the Bode phase plot
    bode_timerep_array: Array(100).fill(50), // 50: drawn at y = 140 in the step response plot
    draw_nyquist_value: jest.fn(), get_nyquist_value: jest.fn(() => [10, 20]),
    ...overrides,
  });
}

const preset_formula = (name) => global_value(name).formula;

function move(x, y) {
  window.mouseX = x;
  window.mouseY = y;
  drawn.length = 0;
  window.mouseMoved();
}

beforeAll(() => {
  loadApp();
  for (const name of REPLACED) originals[name] = window[name];
});

beforeEach(() => {
  drawn = [];
  for (const name of P5_RECORDED) window[name] = (...args) => { drawn.push({ name, args }); };
  for (const name of SPYABLE) window[name] = jest.fn();
  window.map = p5_map;
  window.windowWidth = 1280;
  window.windowHeight = 800;
  window.mouseX = 0;
  window.mouseY = 0;
  set_globals({
    ...GEOMETRY, questions_enabled: false, last_hover_answer_id: '', nof_redraws_in_math_bar: 0,
    improvement_enabled: false, bode_graphs: [],
  });
  hover_answer = document.getElementById('hover_answer');
  hover_answer.removeAttribute('style');
  hover_answer.innerHTML = '';
  console_log = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  for (const name of REPLACED) window[name] = originals[name];
  delete hover_answer.getBoundingClientRect;
  console_log.mockRestore();
});

describe('handle_questions', () => {
  const saved = {};
  const question = (x, y, visible = true) => ({ q: 'Question', a: 'Answer', pos: () => ({ visible, x, y }) });

  // Replaces the contents of the const objects all_questions and all_tasks for one test.
  function use_questions(questions, tasks = {}) {
    for (const [name, replacement] of [['all_questions', questions], ['all_tasks', tasks]]) {
      const target = global_value(name);
      if (!(name in saved)) saved[name] = { ...target };
      for (const key of Object.keys(target)) delete target[key];
      Object.assign(target, replacement);
    }
  }

  afterEach(() => {
    for (const name of Object.keys(saved)) {
      const target = global_value(name);
      for (const key of Object.keys(target)) delete target[key];
      Object.assign(target, saved[name]);
      delete saved[name];
    }
    document.querySelectorAll('[id^="task_"]').forEach((element) => element.remove());
  });

  function hover(x, y) {
    window.mouseX = x;
    window.mouseY = y;
    drawn.length = 0;
    window.handle_questions();
  }

  // A <span id="task_<id>"> whose centre is at (x, y).
  function add_task_span(id, x, y) {
    const span = document.createElement('span');
    span.id = 'task_' + id;
    span.getBoundingClientRect = () => ({ left: x - 5, top: y - 5, width: 10, height: 10 });
    document.body.appendChild(span);
  }

  test('redraws the canvas, and with no questions nothing is shown', () => {
    use_questions({});
    hover(10, 10);
    expect(window.redraw).toHaveBeenCalledTimes(1);
    expect(drawn).toEqual([]);
    expect(window.add_event).not.toHaveBeenCalled();
  });

  test('a question near the mouse shows its heading and answer, logs it, and draws yellow and white lines to it', () => {
    use_questions({ seconds: question(100, 200) });
    hover(100, 100); // distance 100: line weight 10 - 100/50 = 8
    expect(hover_answer.innerHTML).toBe('<h2>Question</h2>Answer');
    expect(global_value('last_hover_answer_id')).toBe('seconds');
    expect(window.add_event).toHaveBeenCalledWith('ask_a_question=seconds');
    expect(hover_answer.style.visibility).toBe('');
    expect(calls('strokeWeight')).toEqual([[8], [8]]);
    expect(calls('stroke')).toEqual([['#ffff0080'], ['#ffffffff']]);
    expect(lines()).toEqual([[100, 100, 100, 200], [100, 100, 100, 200]]);
  });

  test('hovering the same question again does not log or rewrite it', () => {
    use_questions({ seconds: question(100, 200) });
    hover(100, 100);
    hover_answer.innerHTML = 'edited';
    hover(100, 100);
    expect(window.add_event).toHaveBeenCalledTimes(1);
    expect(hover_answer.innerHTML).toBe('edited');
  });

  test('a question exactly 500 pixels away is too far, 499 is close enough', () => {
    use_questions({ far: question(500, 0) });
    hover(0, 0);
    expect(global_value('last_hover_answer_id')).toBe('');
    hover(1, 0);
    expect(global_value('last_hover_answer_id')).toBe('far');
  });

  test('the yellow line is skipped when its weight is practically 0, the white line is still drawn', () => {
    // distance 499.9 -> weight 10 - 9.998 = 0.002: no yellow line
    use_questions({ far: question(499.9, 0) });
    hover(0, 0);
    expect(lines()).toHaveLength(1);
    expect(calls('stroke')).toEqual([['#ffffffff']]);
    // distance 499 -> weight 0.02: both lines
    hover(0.9, 0);
    expect(lines()).toHaveLength(2);
  });

  test('invisible questions are ignored', () => {
    use_questions({ hidden: question(10, 10, false) });
    hover(10, 10);
    expect(global_value('last_hover_answer_id')).toBe('');
    expect(drawn).toEqual([]);
  });

  test('the closest of several questions is the one shown', () => {
    use_questions({ left: question(100, 100), near: question(300, 100), right: question(500, 100) });
    hover(280, 100);
    expect(global_value('last_hover_answer_id')).toBe('near');
    expect(window.add_event).toHaveBeenCalledWith('ask_a_question=near');
  });

  test('moving to another question logs and shows the new one', () => {
    use_questions({ a: question(0, 0), b: question(1000, 0) });
    hover(10, 0);
    hover(990, 0);
    expect(window.add_event.mock.calls).toEqual([['ask_a_question=a'], ['ask_a_question=b']]);
    expect(hover_answer.innerHTML).toContain('Answer');
    expect(global_value('last_hover_answer_id')).toBe('b');
  });

  test('moving away hides and clears the answer, only once', () => {
    use_questions({ seconds: question(100, 200) });
    hover(100, 100);
    hover(1000, 1000);
    expect(hover_answer.style.visibility).toBe('hidden');
    expect(hover_answer.innerHTML).toBe('');
    expect(global_value('last_hover_answer_id')).toBe('');
    hover_answer.style.visibility = 'visible';
    hover(1000, 1000);
    expect(hover_answer.style.visibility).toBe('visible'); // untouched: nothing was showing
  });

  describe('questions connected to tasks', () => {
    test('a task with an answer and an on-screen span is offered, with the plain answer text and no heading', () => {
      use_questions({}, { 'T1=2': { t: 'Task', a: '<b>Task hint</b>' } });
      add_task_span('T1=2', 300, 400);
      hover(300, 380); // distance 20
      expect(hover_answer.innerHTML).toBe('<b>Task hint</b>');
      expect(global_value('last_hover_answer_id')).toBe('task_T1=2');
      expect(window.add_event).toHaveBeenCalledWith('ask_a_question=task_T1=2');
      expect(lines()).toEqual([[300, 380, 300, 400], [300, 380, 300, 400]]);
    });

    test('the centre includes the page scroll offsets', () => {
      use_questions({}, { t: { t: 'Task', a: 'hint' } });
      add_task_span('t', 100, 100);
      window.pageXOffset = 50;
      window.pageYOffset = 70;
      hover(150, 170);
      window.pageXOffset = 0;
      window.pageYOffset = 0;
      expect(lines()[0]).toEqual([150, 170, 150, 170]); // line to the span centre at (100 + 50, 100 + 70)
    });

    test('tasks without an answer, or without a span on screen, are ignored', () => {
      use_questions({}, { no_answer: { t: 'Task', a: null }, no_span: { t: 'Task', a: 'hint' } });
      add_task_span('no_answer', 10, 10);
      hover(10, 10);
      expect(global_value('last_hover_answer_id')).toBe('');
    });

    test('a task span exactly 500 pixels away is too far', () => {
      use_questions({}, { t: { t: 'Task', a: 'hint' } });
      add_task_span('t', 500, 0);
      hover(0, 0);
      expect(global_value('last_hover_answer_id')).toBe('');
      hover(1, 0);
      expect(global_value('last_hover_answer_id')).toBe('task_t');
    });

    test('the closest wins between a question and a task', () => {
      use_questions({ q: question(0, 0) }, { t: { t: 'Task', a: 'hint' } });
      add_task_span('t', 100, 0);
      hover(80, 0);
      expect(global_value('last_hover_answer_id')).toBe('task_t');
      hover(20, 0);
      expect(global_value('last_hover_answer_id')).toBe('q');
    });
  });

  test.each([
    ['GRAPH_PID', 'pid_help_PID'],
    ['GRAPH_ONE_POLE_WITH_PID_YR', 'pid_help_YR'],
    ['GRAPH_ONE_POLE_WITH_PID_S', 'pid_help_S'],
    ['GRAPH_ONE_POLE_WITH_PID_YL', 'pid_help_YL'],
    ['GRAPH_ONE_POLE_WITH_PID_OPEN', 'pid_help_OPEN'],
  ])('reading the help of %s completes the task %s', (id, task) => {
    use_questions({ [id]: question(10, 10) });
    hover(10, 10);
    expect(window.task_done.mock.calls).toEqual([[task]]);
    hover(10, 10); // already showing: not completed again
    expect(window.task_done).toHaveBeenCalledTimes(1);
  });

  test('an ordinary question completes no task', () => {
    use_questions({ seconds: question(10, 10) });
    hover(10, 10);
    expect(window.task_done).not.toHaveBeenCalled();
  });

  describe('placement of the answer box', () => {
    const show_with_height = (x, y, height) => {
      hover_answer.getBoundingClientRect = () => ({ height });
      use_questions({ q: question(x, y) });
      set_globals({ last_hover_answer_id: '' }); // show the question afresh
      hover(x, y);
    };

    test('left half of the window: box to the right of the pointer; right half: to the left', () => {
      show_with_height(100, 100, 50);
      expect(hover_answer.style.left).toBe('100px');
      expect(hover_answer.style.right).toBe('');
      show_with_height(900, 100, 50);
      expect(hover_answer.style.left).toBe('');
      expect(hover_answer.style.right).toBe('380px'); // 1280 - 900
    });

    test('exactly in the middle of the window counts as the right half', () => {
      show_with_height(640, 100, 50);
      expect(hover_answer.style.left).toBe('');
      expect(hover_answer.style.right).toBe('640px');
    });

    test('upper half: the box top follows the pointer', () => {
      show_with_height(100, 100, 300);
      expect(hover_answer.style.top).toBe('100px');
      expect(hover_answer.style.bottom).toBe('');
    });

    test('upper half: a box that would end below the window sticks to the bottom', () => {
      show_with_height(100, 390, 410); // 390 + 410 = 800: exactly fits
      expect(hover_answer.style.top).toBe('390px');
      show_with_height(100, 390, 411);
      expect(hover_answer.style.top).toBe('');
      expect(hover_answer.style.bottom).toBe('0px');
    });

    test('lower half: the box bottom follows the pointer', () => {
      show_with_height(100, 500, 300);
      expect(hover_answer.style.top).toBe('');
      expect(hover_answer.style.bottom).toBe('300px'); // 800 - 500
    });

    test('lower half: a box that would reach above the window sticks to the top', () => {
      show_with_height(100, 500, 500); // 500 above the pointer: exactly fits
      expect(hover_answer.style.bottom).toBe('300px');
      show_with_height(100, 500, 501);
      expect(hover_answer.style.top).toBe('0px');
      expect(hover_answer.style.bottom).toBe('');
    });

    test('a box taller than the window minus 10 pixels is pinned to the top', () => {
      show_with_height(100, 10, 790); // not taller than 800 - 10: placed by the pointer
      expect(hover_answer.style.top).toBe('10px');
      show_with_height(100, 100, 791);
      expect(hover_answer.style.top).toBe('0px');
      expect(hover_answer.style.bottom).toBe('');
    });

    test('a box taller than the window is scaled to fit when a new question appears', () => {
      show_with_height(100, 100, 1600);
      expect(hover_answer.style.transform).toContain('scale(0.5)');
    });

    test('a box not taller than the window is not scaled, and an old scaling is removed', () => {
      show_with_height(100, 100, 800);
      expect(hover_answer.style.transform).toBe('');
      show_with_height(100, 100, 1600);
      expect(hover_answer.style.transform).toContain('scale');
      use_questions({ other: question(100, 100) });
      hover_answer.getBoundingClientRect = () => ({ height: 100 });
      hover(100, 100);
      expect(hover_answer.style.transform).toBe('');
    });
  });
});

describe('mouseMoved: redraws', () => {
  test('inside the canvas it redraws every time and resets the counter', () => {
    set_globals({ nof_redraws_in_math_bar: 5 });
    move(100, 100);
    move(101, 100);
    expect(window.redraw).toHaveBeenCalledTimes(2);
    expect(global_value('nof_redraws_in_math_bar')).toBe(0);
  });

  test.each([
    ['right of the canvas', 901, 100],
    ['below the canvas', 100, 701],
  ])('%s it redraws only once', (_name, x, y) => {
    move(x, y);
    move(x, y);
    move(x, y);
    expect(window.redraw).toHaveBeenCalledTimes(1);
    expect(global_value('nof_redraws_in_math_bar')).toBe(3);
  });

  test('exactly on the canvas edge counts as inside', () => {
    move(900, 700);
    move(900, 700);
    expect(window.redraw).toHaveBeenCalledTimes(2);
    expect(global_value('nof_redraws_in_math_bar')).toBe(0);
  });

  test('coming back from the math bar redraws again', () => {
    move(901, 100);
    move(901, 100);
    move(100, 100);
    move(901, 100);
    expect(window.redraw).toHaveBeenCalledTimes(3);
  });

  test('with questions enabled only handle_questions runs, even over a plot', () => {
    window.handle_questions = jest.fn();
    window.draw_hover_nyquist = jest.fn();
    set_globals({ questions_enabled: true });
    set_live('bode_graphs', [fake_graph()]);
    move(590, 445); // inside the Nyquist plot
    expect(window.handle_questions).toHaveBeenCalledTimes(1);
    expect(window.draw_hover_nyquist).not.toHaveBeenCalled();
    expect(drawn).toEqual([]);
  });
});

describe('mouseMoved: pole-zero maps', () => {
  const POLE_ZERO_PRESETS = ['GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TWO_COMPLEX_POLES',
    'GRAPH_FOUR_POLES', 'GRAPH_ONE_ZERO', 'GRAPH_ONE_ZERO_TWO_POLES', 'GRAPH_PID'];
  const COMPUTED_MAP = { poles: [{ re: -1, im: 0 }], zeros: [] };

  function setup_second_graph(formula, overrides = {}) {
    set_live('bode_graphs', [fake_graph(), fake_graph({ bode_formula: formula, ...overrides })]);
  }

  test.each(POLE_ZERO_PRESETS)('shows the position under the mouse for %s (second graph, second map)', (preset) => {
    setup_second_graph(preset_formula(preset));
    move(800 + 24, 120 + 24); // a quarter into the map: Re = -2, Im = 1
    expect(texts()).toEqual(['Re=-2.00', 'Im=1.00']);
    expect(calls('rect')).toEqual([[0, 0, 80, 40]]);
    expect(calls('translate')).toEqual([[824, 144]]);
  });

  test('centre of the map: Re=-1, Im=0', () => {
    setup_second_graph(preset_formula('GRAPH_ONE_REAL_POLE'));
    move(848, 168);
    expect(texts()).toEqual(['Re=-1.00', 'Im=0.00']);
  });

  test('a computed map shows the position too, on a preset or a typed formula', () => {
    setup_second_graph(preset_formula('GRAPH_TIME_DELAY'), { bode_poles_zeros: COMPUTED_MAP });
    move(848, 168);
    expect(texts()).toEqual(['Re=-1.00', 'Im=0.00']);
    setup_second_graph('1/(s+1)', { bode_poles_zeros: COMPUTED_MAP });
    move(848, 168);
    expect(texts()).toEqual(['Re=-1.00', 'Im=0.00']);
  });

  test('a graph without a map, a hidden graph and a quiz ghost show nothing', () => {
    setup_second_graph(preset_formula('GRAPH_TIME_DELAY'));
    move(848, 168);
    expect(texts()).toEqual([]);
    setup_second_graph(preset_formula('GRAPH_ONE_REAL_POLE'), { bode_displaybool: false });
    move(848, 168);
    expect(texts()).toEqual([]);
    setup_second_graph('1/(s+1)', { bode_poles_zeros: COMPUTED_MAP, bode_display_pole_zero_bool: false });
    move(848, 168);
    expect(texts()).toEqual([]);
  });

  test('the map edges are exclusive', () => {
    setup_second_graph(preset_formula('GRAPH_ONE_REAL_POLE'));
    for (const [x, y] of [[800, 168], [896, 168], [848, 120], [848, 216]]) {
      move(x, y);
      expect(texts()).toEqual([]);
    }
    move(801, 121);
    expect(texts()).toHaveLength(2);
    move(895, 215);
    expect(texts()).toHaveLength(2);
  });

  test("another graph's map position does not trigger the hover", () => {
    setup_second_graph(preset_formula('GRAPH_ONE_REAL_POLE')); // index 1: map at y 120..216
    move(848, 48); // inside the first map, but graph 0 is not a pole-zero preset
    expect(texts()).toEqual([]);
  });
});

describe('mouseMoved: step response', () => {
  test('time axis: a grey cursor line and the time under the mouse', () => {
    move(590, 250);
    expect(texts()).toEqual(['time=5.000s']);
    expect(lines()).toEqual([[590, 40, 590, 240]]);
    expect(calls('stroke')[0]).toEqual(['#808080']);
    expect(calls('rect')).toEqual([[0, 0, 200, 90]]);
    expect(calls('translate')).toEqual([[590, 250]]);
  });

  test('time axis edges: top edge included, bottom edge 275 included, 276 and 239 are not', () => {
    move(590, 240);
    expect(texts()).toEqual(['time=5.000s']);
    move(590, 275);
    expect(texts()).toEqual(['time=5.000s']);
    move(590, 276);
    expect(texts()).toEqual([]);
  });

  test('time axis horizontal edges are exclusive: 465 and 715 show nothing', () => {
    move(465, 250);
    expect(texts()).toEqual([]);
    move(715, 250);
    expect(texts()).toEqual([]);
    move(466, 250);
    expect(texts()).toEqual(['time=0.040s']);
  });

  describe('over the plot', () => {
    test('close to a curve: highlights it with its name, time and output', () => {
      set_live('bode_graphs', [fake_graph({ graph_name: 'First', bode_hue: 10 })]);
      move(590, 150); // curve at y = 140: distance 10
      expect(texts()).toEqual(['First', 'time=5.000s', 'output=50.000']);
      expect(calls('fill')).toContainEqual([10, 360, 360]);
      expect(ellipses()).toContainEqual([590, 140, 12, 12]); // dot on the curve
      expect(ellipses()).toContainEqual([715, 140, 12, 12]); // dot at the right edge of the plot
      expect(lines()[0]).toEqual([590, 40, 590, 240]);
    });

    test('the curve sample is the one at the mouse x rounded up to the next sample (4 pixels apart)', () => {
      set_live('bode_graphs', [fake_graph({ bode_timerep_array: Array.from({ length: 100 }, (_, i) => i) })]);
      move(590, 176); // (590 - 465) / 4 = 31.25 -> sample 32, at y = 40 + 200 * (1 - 32 / 100)
      expect(texts()[2]).toBe('output=32.000');
    });

    test('the distance threshold is 70 pixels, exclusive', () => {
      set_live('bode_graphs', [fake_graph()]);
      move(590, 209); // distance 69
      expect(texts()).toContain('output=50.000');
      move(590, 210); // distance 70
      expect(texts()).not.toContain('output=50.000');
      move(590, 71); // distance 69 above
      expect(texts()).toContain('output=50.000');
      move(590, 70);
      expect(texts()).not.toContain('output=50.000');
    });

    test('the closest of several curves is chosen', () => {
      set_live('bode_graphs', [
        fake_graph({ graph_name: 'A', bode_hue: 1, bode_timerep_array: Array(100).fill(50) }), // y 140
        fake_graph({ graph_name: 'B', bode_hue: 2, bode_timerep_array: Array(100).fill(60) }), // y 120
      ]);
      move(590, 125);
      expect(texts()[0]).toBe('B');
      expect(texts()[2]).toBe('output=60.000');
      move(590, 136);
      expect(texts()[0]).toBe('A');
    });

    test('hidden curves and curves without the time response are skipped', () => {
      set_live('bode_graphs', [
        fake_graph({ graph_name: 'hidden', bode_displaybool: false }),
        fake_graph({ graph_name: 'no time response', bode_display_timeresponse_bool: false }),
      ]);
      move(590, 140);
      expect(texts()).toEqual(['time=5.000s', 'output=50.000']); // the value at the mouse, no curve name
    });

    test('not close to any curve: shows the time and the value at the mouse', () => {
      set_live('bode_graphs', [fake_graph()]);
      move(590, 230); // output = 100 - 100 * (230 - 40) / 200 = 5
      expect(texts()).toEqual(['time=5.000s', 'output=5.000']);
      expect(ellipses()).toContainEqual([715, 230, 12, 12]); // white dot follows the mouse height
    });

    test('with no graphs at all it behaves like "not close"', () => {
      move(590, 40 + 100);
      expect(texts()).toEqual(['time=5.000s', 'output=50.000']);
    });

    test('plot edges: the top (y=40) and bottom (y=240) edges are exclusive, 465 and 715 too', () => {
      move(590, 40);
      expect(texts()).toEqual([]);
      move(590, 41);
      expect(texts()).toHaveLength(2);
      move(590, 239);
      expect(texts()).toHaveLength(2);
      move(465, 100);
      expect(texts()).toEqual([]);
      move(715, 100);
      expect(texts()).toEqual([]);
    });

    test('a dot is drawn on the real axis of the Nyquist plot only if the value is inside it', () => {
      set_live('bode_graphs', [fake_graph()]);
      // Value 50 with the Nyquist range -2..2 is far outside the plot.
      move(590, 150);
      const nyquist_dots = () => ellipses().filter(([x, y]) => y === 445 && x > 465 && x < 715);
      expect(nyquist_dots()).toEqual([]);
      // Widen the range to -100..100: x = 400 + 65 + (50 + 100) / 200 * 250 = 652.5, y on the real axis.
      set_globals({ min_nyquist_x: -100, max_nyquist_x: 100 });
      move(590, 150);
      expect(nyquist_dots()).toEqual([[652.5, 445, 12, 12]]);
    });
  });
});

describe('mouseMoved: Bode magnitude', () => {
  test('frequency axis: vertical cursor lines in both Bode plots, the frequency, and Nyquist dots', () => {
    const shown = fake_graph();
    const no_nyquist = fake_graph({ bode_display_nyquist_bool: false });
    const hidden = fake_graph({ bode_displaybool: false });
    const no_mag = fake_graph({ bode_display_bodemag_bool: false });
    set_live('bode_graphs', [shown, no_nyquist, hidden, no_mag]);
    move(218, 240); // 150 pixels into 300: half way, 10^(0.5 * 5 - 2)
    expect(texts()).toEqual(['freq=3.162rad/s']);
    expect(lines()).toEqual([[218, 310, 218, 510], [218, 30, 218, 230]]);
    expect(shown.draw_nyquist_value).toHaveBeenCalledWith(0.5);
    expect(no_nyquist.draw_nyquist_value).not.toHaveBeenCalled();
    expect(hidden.draw_nyquist_value).not.toHaveBeenCalled();
    expect(no_mag.draw_nyquist_value).not.toHaveBeenCalled();
  });

  test('frequency axis edges: y=230 included, 265 excluded; x=68 and 368 excluded', () => {
    move(218, 230);
    expect(texts()).toEqual(['freq=3.162rad/s']);
    move(218, 264);
    expect(texts()).toEqual(['freq=3.162rad/s']);
    move(218, 265);
    expect(texts()).toEqual([]);
    move(68, 240);
    expect(texts()).toEqual([]);
    move(368, 240);
    expect(texts()).toEqual([]);
    move(69, 240);
    expect(texts()).toEqual(['freq=0.010rad/s'.replace('0.010', (Math.pow(10, (1 / 300) * 5 - 2)).toFixed(3))]);
  });

  describe('y-axis (magnitude)', () => {
    test('shows the magnitude, a magnitude circle in the Nyquist plot, and a horizontal line', () => {
      move(30, 130); // half way: 60 - 0.5 * 120 = 0 dB
      expect(texts()).toEqual(['magnitude=1.000']);
      // circle of radius |G| = 1 around the origin of the Nyquist plot (centre (590, 445), 125 x 100 per unit)
      expect(ellipses()).toEqual([[590, 445, 125, 100]]);
      expect(lines()).toEqual([[68, 130, 368, 130]]);
    });

    test('30 dB is a magnitude of 31.623', () => {
      move(30, 80);
      expect(texts()).toEqual(['magnitude=31.623']);
    });

    test('edges: x=0 excluded, x=68 included, y=30 and y=230 excluded', () => {
      move(0, 130);
      expect(texts()).toEqual([]);
      move(68, 130);
      expect(texts()).toEqual(['magnitude=1.000']);
      move(30, 30);
      expect(texts()).toEqual([]);
      move(30, 230);
      expect(texts()).toEqual([]);
    });
  });

  describe('plot', () => {
    test('close to a curve: shows name, frequency and the curve magnitude, with a dot on the curve', () => {
      const graph = fake_graph({ graph_name: 'Curve', bode_hue: 55 });
      set_live('bode_graphs', [graph]);
      move(218, 140); // 0 dB curve at y = 30 + 100 = 130: distance 10
      expect(texts()).toEqual(['Curve', 'freq=3.162rad/s', 'magnitude=1.000']);
      expect(ellipses()[0]).toEqual([218, 130, 12, 12]);
      expect(calls('fill')).toContainEqual([55, 360, 360]);
      expect(lines()).toContainEqual([68, 130, 368, 130]); // horizontal line at the curve
      expect(graph.draw_nyquist_value).toHaveBeenCalledWith(0.5);
    });

    test('the magnitude of a 20 dB curve is 10', () => {
      set_live('bode_graphs', [fake_graph({ bode_gain_array: Array(400).fill(20) })]);
      // 20 dB at y = 30 + 200 * (60 - 20) / 120 = 96.67
      move(218, 100);
      expect(texts()[2]).toBe('magnitude=10.000');
    });

    test('the distance threshold is 70 pixels, exclusive', () => {
      set_live('bode_graphs', [fake_graph()]); // curve at y = 130
      move(218, 199);
      expect(texts()[0]).toBe('Graph');
      move(218, 200);
      expect(texts()[0]).toBe('freq=3.162rad/s');
      move(218, 61);
      expect(texts()[0]).toBe('Graph');
      move(218, 60);
      expect(texts()[0]).toBe('freq=3.162rad/s');
    });

    test('the distance is measured from the Bode magnitude plot, not from the step response plot', () => {
      set_live('graph_step_response_y', -10); // as in the real layout; the magnitude plot is at y = 0
      set_live('bode_graphs', [fake_graph()]); // curve at y = 130
      move(218, 199); // distance 69
      expect(texts()[0]).toBe('Graph');
      move(218, 60); // distance 70, exclusive
      expect(texts()[0]).toBe('freq=3.162rad/s');
    });

    test('not close to a curve: shows the frequency and the magnitude at the mouse, and a horizontal line at the mouse', () => {
      set_live('bode_graphs', [fake_graph()]);
      move(218, 60); // 60 - 0.15 * 120 = 42 dB
      expect(texts()).toEqual(['freq=3.162rad/s', 'magnitude=125.893']);
      expect(lines()).toContainEqual([68, 60, 368, 60]);
      expect(lines()).toContainEqual([218, 30, 218, 230]); // vertical cursor in the magnitude plot
      expect(lines()).toContainEqual([218, 310, 218, 510]); // and in the phase plot
    });

    test('the closest curve is chosen, and curves without bode magnitude are skipped', () => {
      set_live('bode_graphs', [
        fake_graph({ graph_name: 'low', bode_gain_array: Array(400).fill(-20) }), // y = 30 + 200 * 80 / 120 = 163
        fake_graph({ graph_name: 'high', bode_gain_array: Array(400).fill(20) }), // y = 96.7
        fake_graph({ graph_name: 'off', bode_display_bodemag_bool: false, bode_gain_array: Array(400).fill(0) }),
      ]);
      move(218, 150);
      expect(texts()[0]).toBe('low');
      move(218, 110);
      expect(texts()[0]).toBe('high');
      move(218, 130); // exactly where the skipped curve is: 'low' (33 away) and 'high' (33.3 away)
      expect(texts()[0]).toBe('low');
    });

    test('edges are exclusive: x=68 (that is the y-axis), x=368, y=30, y=230 (that is the frequency axis)', () => {
      move(68, 130);
      expect(texts()).toEqual(['magnitude=1.000']); // y-axis box, no frequency
      move(368, 130);
      expect(texts()).toEqual([]);
      move(218, 30);
      expect(texts()).toEqual([]);
      move(218, 31);
      expect(texts()).toHaveLength(2);
      move(218, 229);
      expect(texts()).toHaveLength(2);
      move(218, 230);
      expect(texts()).toEqual(['freq=3.162rad/s']);
    });
  });
});

describe('mouseMoved: Nyquist plot', () => {
  beforeEach(() => {
    window.draw_hover_nyquist = jest.fn();
  });

  test('calls draw_hover_nyquist inside the plot', () => {
    move(590, 445);
    expect(window.draw_hover_nyquist).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['left edge 465', 465, 445, 0], ['right edge 715', 715, 445, 0],
    ['top edge 345', 590, 345, 0], ['bottom edge 545', 590, 545, 0],
    ['just inside left', 466, 445, 1], ['just inside right', 714, 445, 1],
    ['just inside top', 590, 346, 1], ['just inside bottom', 590, 544, 1],
  ])('%s', (_name, x, y, expected_calls) => {
    move(x, y);
    expect(window.draw_hover_nyquist).toHaveBeenCalledTimes(expected_calls);
  });
});

describe('mouseMoved: Bode phase', () => {
  describe('frequency axis', () => {
    test('shows the frequency, cursor lines in both Bode plots, and Nyquist dots', () => {
      const graph = fake_graph();
      const no_nyquist = fake_graph({ bode_display_nyquist_bool: false });
      set_live('bode_graphs', [graph, no_nyquist]);
      move(218, 520);
      expect(texts()).toEqual(['freq=3.162rad/s']);
      expect(lines()).toEqual([[218, 310, 218, 510], [218, 30, 218, 230]]);
      expect(graph.draw_nyquist_value).toHaveBeenCalledWith(0.5);
      expect(no_nyquist.draw_nyquist_value).not.toHaveBeenCalled();
    });

    test('edges: y=510 included, 545 excluded; x=68 and x=368 excluded', () => {
      move(218, 510);
      expect(texts()).toEqual(['freq=3.162rad/s']);
      move(218, 544);
      expect(texts()).toEqual(['freq=3.162rad/s']);
      move(218, 545);
      expect(texts()).toEqual([]);
      move(68, 520);
      expect(texts()).toEqual([]);
      move(368, 520);
      expect(texts()).toEqual([]);
    });
  });

  describe('y-axis (phase)', () => {
    test('negative phase: text, arc over the unit circle, line to the phase angle and horizontal line in the plot', () => {
      move(30, 360); // a quarter of the way down: 0 - 45 * 4 * 0.25 = -45 degrees
      expect(texts()).toEqual(['phase=-45°']);
      const [arc_args] = calls('arc');
      expect(arc_args.slice(0, 4)).toEqual([590, 445, 125, 100]);
      expect(arc_args[4]).toBe(0);
      expect(arc_args[5]).toBeCloseTo(Math.PI / 4);
      // line from the Nyquist origin to the point 1.2 away at -45 degrees
      const [from_x, from_y, to_x, to_y] = lines()[0];
      expect([from_x, from_y]).toEqual([590, 445]);
      expect(to_x).toBeCloseTo(465 + ((1.2 * Math.cos(-Math.PI / 4) + 2) / 4) * 250);
      expect(to_y).toBeCloseTo(345 + ((2 + 1.2 * Math.sin(Math.PI / 4)) / 4) * 200);
      // horizontal line at -45 degrees: 200 + 110 + 50
      expect(lines()[1]).toEqual([68, 360, 368, 360]);
    });

    test('positive phase draws the arc the other way round', () => {
      set_globals({ phase_upper_bound: 180, phase_lower_bound: -180, phase_case_number: 8 });
      move(30, 360); // 180 - 45 * 8 * 0.25 = 90
      expect(texts()).toEqual(['phase=90°']);
      const [arc_args] = calls('arc');
      expect(arc_args[4]).toBeCloseTo(-Math.PI / 2);
      expect(arc_args[5]).toBe(0);
      expect(lines()[1]).toEqual([68, 360, 368, 360]); // 90 degrees is half way up the plot: 200 + 50 + 110
    });

    test('a phase outside the plot bounds gets no horizontal line', () => {
      set_globals({ phase_upper_bound: 180, phase_lower_bound: 0, phase_case_number: 4 });
      move(30, 360); // 180 - 180 * 0.25 = 135, inside; 135 is within 0..180
      expect(lines()).toHaveLength(2);
      set_globals({ phase_upper_bound: 0, phase_lower_bound: -90, phase_case_number: 2 });
      move(30, 360); // 0 - 90 * 0.25 = -22.5, inside bounds
      expect(lines()).toHaveLength(2);
      set_globals({ phase_upper_bound: 0, phase_lower_bound: -20, phase_case_number: 2 });
      move(30, 360); // -22.5 < -20
      expect(lines()).toHaveLength(1);
    });

    test('edges: x=0 excluded, x=68 included, y=310 and y=510 excluded', () => {
      move(0, 360);
      expect(texts()).toEqual([]);
      move(68, 360);
      expect(texts()).toHaveLength(1);
      move(30, 310);
      expect(texts()).toEqual([]);
      move(30, 311);
      expect(texts()).toHaveLength(1);
      move(30, 510);
      expect(texts()).toEqual([]);
    });
  });

  describe('plot', () => {
    test('close to a curve: highlights it with name, frequency, phase, nyquist marker and gain-curve link', () => {
      const graph = fake_graph({ graph_name: 'Curve', bode_hue: 77 });
      set_live('bode_graphs', [graph]);
      move(218, 420); // curve (-90 degrees) at y = 200 + 110 + 100 = 410
      expect(texts()).toEqual(['Curve', 'freq=3.162rad/s', 'phase=-90.0°']);
      expect(ellipses()[0]).toEqual([218, 410, 12, 12]);
      expect(calls('fill')).toContainEqual([77, 360, 360]);
      // arc in the Nyquist plot, from the real axis down to -90 degrees
      const [arc_args] = calls('arc');
      expect(arc_args[4]).toBe(0);
      expect(arc_args[5]).toBeCloseTo(Math.PI / 2);
      // horizontal phase line at the curve and the white line from the Nyquist origin to the hovered point
      expect(lines()).toContainEqual([68, 410, 368, 410]);
      expect(graph.get_nyquist_value).toHaveBeenCalledWith(0.5);
      expect(lines()).toContainEqual([125, 100, 10, 20]);
      // the vertical cursor goes through the phase plot and down from the gain curve (0 dB: y = 130) to the bottom of the mag plot
      expect(lines()).toContainEqual([218, 310, 218, 510]);
      expect(lines()).toContainEqual([218, 130, 218, 230]);
      expect(ellipses()).toContainEqual([218, 130, 12, 12]);
    });

    test('the gain-curve link is not drawn when the gain curve is below the magnitude plot', () => {
      set_live('bode_graphs', [fake_graph({ bode_gain_array: Array(400).fill(-100) })]);
      move(218, 420);
      expect(texts()[0]).toBe('Graph');
      expect(ellipses()).toEqual([[218, 410, 12, 12], [18, 18, 20, 20]]); // the dot on the phase curve and the colour key, no dot in the magnitude plot
      expect(lines().filter(([x1, , x2]) => x1 === 218 && x2 === 218)).toEqual([[218, 310, 218, 510]]); // only the cursor in the phase plot
    });

    test('a curve without Nyquist display gets no arc and no line from the origin', () => {
      const graph = fake_graph({ bode_display_nyquist_bool: false });
      set_live('bode_graphs', [graph]);
      move(218, 420);
      expect(texts()[0]).toBe('Graph');
      expect(calls('arc')).toEqual([]);
      expect(graph.get_nyquist_value).toHaveBeenCalled(); // computed anyway, not drawn
      expect(lines()).not.toContainEqual([125, 100, 10, 20]);
      expect(graph.draw_nyquist_value).not.toHaveBeenCalled();
    });

    test('a positive phase draws the Nyquist arc the other way round', () => {
      set_globals({ phase_upper_bound: 180, phase_lower_bound: -180, phase_case_number: 8 });
      // +90 degrees: y = 200 + 110 + 200 * (1 - 270 / 360) = 360
      set_live('bode_graphs', [fake_graph({ bode_phase_array: Array(400).fill(Math.PI / 2) })]);
      move(218, 360);
      expect(texts()[2]).toBe('phase=90.0°');
      const [arc_args] = calls('arc');
      expect(arc_args[4]).toBeCloseTo(-Math.PI / 2);
      expect(arc_args[5]).toBe(0);
    });

    test('a phase outside the plot bounds gets no horizontal line', () => {
      const horizontal_phase_lines = () => lines().filter(([x1, , x2]) => x1 === 68 && x2 === 368);
      set_live('bode_graphs', [fake_graph()]);
      move(218, 350);
      expect(texts()[2]).toBe('phase=-90.0°');
      expect(horizontal_phase_lines()).toHaveLength(1);
      // The plot now only covers -280..-100 degrees; the curve at -90 is above it, 51 px from the mouse.
      set_globals({ phase_upper_bound: -100, phase_lower_bound: -280 });
      move(218, 350);
      expect(texts()[2]).toBe('phase=-90.0°');
      expect(horizontal_phase_lines()).toEqual([]);
    });

    test('the distance threshold is 70 pixels, exclusive', () => {
      set_live('bode_graphs', [fake_graph()]); // curve at y = 410 (distance counted from y - phase_y = 210)
      move(218, 479);
      expect(texts()[0]).toBe('Graph');
      move(218, 480);
      expect(texts()[0]).toBe('freq=3.162rad/s');
      move(218, 341);
      expect(texts()[0]).toBe('Graph');
      move(218, 340);
      expect(texts()[0]).toBe('freq=3.162rad/s');
    });

    test('not close: frequency and phase at the mouse, cursor lines, arc and phase line', () => {
      set_live('bode_graphs', [fake_graph()]);
      move(218, 480); // 0 - 180 * (170 / 200) = -153 degrees
      expect(texts()).toEqual(['freq=3.162rad/s', 'phase=-153°']);
      expect(lines()).toContainEqual([218, 30, 218, 230]);
      expect(lines()).toContainEqual([218, 310, 218, 510]);
      const [arc_args] = calls('arc');
      expect(arc_args[5]).toBeCloseTo((153 / 180) * Math.PI);
      expect(lines()).toContainEqual([68, 480, 368, 480]); // -153 degrees: 200 + 110 + 200 * (1 - 27 / 180)
    });

    test('not close, with a positive phase', () => {
      set_globals({ phase_upper_bound: 180, phase_lower_bound: -180, phase_case_number: 8 });
      set_live('bode_graphs', []);
      move(218, 360); // 180 - 360 * 0.25 = 90 degrees
      expect(texts()).toEqual(['freq=3.162rad/s', 'phase=90°']);
      const [arc_args] = calls('arc');
      expect(arc_args[4]).toBeCloseTo(-Math.PI / 2);
      expect(arc_args[5]).toBe(0);
    });

    test('the closest of several curves is chosen, and curves without bode phase are skipped', () => {
      set_live('bode_graphs', [
        fake_graph({ graph_name: 'steep', bode_phase_array: Array(400).fill(-Math.PI) }), // y = 110 + 200 = 310 + ...
        fake_graph({ graph_name: 'flat', bode_phase_array: Array(400).fill(0) }),
        fake_graph({ graph_name: 'off', bode_display_bodephase_bool: false, bode_phase_array: Array(400).fill(-Math.PI / 2) }),
      ]);
      // 'flat' sits at y = 200 + 110 = 310 - hmm: 0 rad is the top of the plot; 'steep' (-pi) at the bottom (510)
      move(218, 330);
      expect(texts()[0]).toBe('flat');
      move(218, 490);
      expect(texts()[0]).toBe('steep');
    });

    test('edges are exclusive: x=68 (that is the y-axis), x=368, y=310, y=510 (that is the frequency axis)', () => {
      move(68, 410);
      expect(texts()).toEqual(['phase=-90°']); // y-axis box, no frequency
      move(368, 400);
      expect(texts()).toEqual([]);
      move(218, 310);
      expect(texts()).toEqual([]);
      move(218, 311);
      expect(texts()).toHaveLength(2);
      move(218, 509);
      expect(texts()).toHaveLength(2);
      move(218, 510);
      expect(texts()).toEqual(['freq=3.162rad/s']);
    });
  });
});

describe('draw_hover_nyquist', () => {
  // The screen position of a point of the Nyquist plane (range -2..2 both ways, plot at (465, 345), 250 x 200).
  const at = (re, im) => ({ x: 465 + ((re + 2) / 4) * 250, y: 345 + ((2 - im) / 4) * 200 });

  function hover_nyquist_at(re, im) {
    const { x, y } = at(re, im);
    window.mouseX = x;
    window.mouseY = y;
    drawn.length = 0;
    window.draw_hover_nyquist();
  }

  test('draws a line from the origin, the angle arc, and horizontal lines at the angle and magnitude', () => {
    hover_nyquist_at(1, -1); // -45 degrees, |G| = sqrt(2)
    expect(lines()[0]).toEqual([590, 445, 652.5, 495]);
    const [arc_args] = calls('arc');
    expect(arc_args.slice(0, 4)).toEqual([590, 445, 125, 100]);
    expect(arc_args[4]).toBe(0);
    expect(arc_args[5]).toBeCloseTo(Math.PI / 4);
    expect(calls('stroke').map(([colour]) => colour)).toContain('#angle');
    // Bode phase plot: -45 degrees is a quarter of the way down: 200 + 110 + 50
    expect(lines()).toContainEqual([68, 360, 368, 360]);
    // Bode magnitude plot: 3.01 dB, y = 30 + 200 * (60 - 3.0103) / 120
    const magnitude_line = lines()[lines().length - 1];
    expect(magnitude_line[0]).toBe(68);
    expect(magnitude_line[2]).toBe(368);
    expect(magnitude_line[1]).toBeCloseTo(30 + (200 * (60 - 20 * Math.log10(Math.SQRT2))) / 120);
    expect(magnitude_line[3]).toBe(magnitude_line[1]);
  });

  test('angles in the lower half plane are measured from the right: (-1, -1) is -135 degrees', () => {
    hover_nyquist_at(-1, -1);
    const [arc_args] = calls('arc');
    expect(arc_args[5]).toBeCloseTo((135 / 180) * Math.PI);
    // -135 degrees: 45 degrees from the bottom of -180..0, y = 200 + 110 + 200 * (1 - 45 / 180)
    expect(lines()).toContainEqual([68, 460, 368, 460]);
  });

  test('angles in the upper half plane are drawn as positive angles (+360): (1, 1) is 45 degrees', () => {
    set_globals({ phase_lower_bound: -360, phase_upper_bound: 360 });
    hover_nyquist_at(1, 1);
    // angle -315 is reported first, then +45 (angle + 360): both inside -360..360
    const phase_lines = lines().filter(([x1, , x2]) => x1 === 68 && x2 === 368);
    expect(phase_lines).toHaveLength(3); // -315, +45 and the magnitude line
    // -315: 310 + 200 * (360 - (-315)) / 720 ... mapped from the top: (360 - angle) / 720 * 200
    expect(phase_lines[0][1]).toBeCloseTo(310 + (200 * (360 + 315)) / 720);
    expect(phase_lines[1][1]).toBeCloseTo(310 + (200 * (360 - 45)) / 720);
  });

  test('no phase line when neither the angle nor angle + 360 is inside the phase bounds', () => {
    // (1,-1) is -45; +315 is outside -180..0 and -45 is inside, so move to a bound that excludes both
    set_globals({ phase_lower_bound: -180, phase_upper_bound: -100 });
    hover_nyquist_at(1, -1);
    expect(lines().filter(([x1, , x2]) => x1 === 68 && x2 === 368)).toHaveLength(1); // only the magnitude line
  });

  test('phase bounds are inclusive', () => {
    set_globals({ phase_lower_bound: -90, phase_upper_bound: -90 });
    hover_nyquist_at(0, -1); // exactly -90 degrees (atan(0) = 0)
    expect(lines().filter(([x1, , x2]) => x1 === 68 && x2 === 368)).toHaveLength(2); // phase line and magnitude line
    set_globals({ phase_lower_bound: -89.9, phase_upper_bound: -89.9 });
    hover_nyquist_at(0, -1);
    expect(lines().filter(([x1, , x2]) => x1 === 68 && x2 === 368)).toHaveLength(1);
    set_globals({ phase_lower_bound: -90.1, phase_upper_bound: -90.1 });
    hover_nyquist_at(0, -1);
    expect(lines().filter(([x1, , x2]) => x1 === 68 && x2 === 368)).toHaveLength(1);
  });

  describe('achievement hover_nyquist_-90', () => {
    test('awarded for a magnitude near 1 at an angle near -90 degrees', () => {
      hover_nyquist_at(0, -1);
      expect(window.achievement_done).toHaveBeenCalledWith('hover_nyquist_-90');
    });

    test.each([[0.81, true], [0.79, false], [1.19, true], [1.21, false]])('magnitude %s -> awarded: %s', (magnitude, awarded) => {
      hover_nyquist_at(0, -magnitude);
      expect(window.achievement_done.mock.calls.length).toBe(awarded ? 1 : 0);
    });

    test.each([[-76, true], [-74, false], [-104, true], [-106, false]])('angle %s degrees -> awarded: %s', (degrees, awarded) => {
      const radians = (degrees * Math.PI) / 180;
      hover_nyquist_at(Math.cos(radians), Math.sin(radians));
      expect(window.achievement_done.mock.calls.length).toBe(awarded ? 1 : 0);
    });
  });
});

describe('draw_loglines', () => {
  test('draws 10 vertical lines per decade, the first of each decade thicker', () => {
    window.draw_loglines(2);
    const vertical = lines();
    expect(vertical).toHaveLength(20);
    const weights = calls('strokeWeight').map(([w]) => w);
    expect(weights).toEqual([2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    // decade starts at 0 and 150 (300 / 2), and every line spans the whole plot height
    expect(vertical[0][0]).toBe(0);
    expect(vertical[10][0]).toBe(150);
    for (const [x1, y1, x2, y2] of vertical) {
      expect(x1).toBe(x2);
      expect([y1, y2]).toEqual([0, 200]);
    }
  });

  test('lines within a decade are spaced logarithmically and end at the next decade start', () => {
    window.draw_loglines(1);
    const xs = lines().map(([x]) => x);
    // the gaps between the lines shrink by the factor `rate` (1.4) from line to line
    const sum = (1 - Math.pow(1 / 1.4, 9)) / (1 - 1 / 1.4);
    const step = 300 / sum;
    let expected = 0;
    xs.forEach((x, i) => {
      expect(x).toBeCloseTo(expected);
      expected += step / Math.pow(1.4, i);
    });
    expect(xs[9]).toBeCloseTo(300); // the last line of a decade is where the next decade starts
    expect(calls('stroke')).toEqual([['#grid']]);
  });
});

describe('draw_timelines', () => {
  test('picks round axis limits and labels the time and output axes', () => {
    window.draw_timelines(); // 0..100 and 10 s -> output axis 0..110 in steps of 10
    expect(global_value('min_y_timerep')).toBe(0);
    expect(global_value('max_y_timerep')).toBe(110);
    const labels = texts();
    expect(labels.slice(0, 11)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(labels.slice(11)).toEqual(['110.00', '100.00', '90.00', '80.00', '70.00', '60.00', '50.00', '40.00', '30.00', '20.00', '10.00', '0.00']);
    // time labels are centred under the vertical grid lines (25 px wide) and below the plot
    const text_calls = calls('text');
    expect(text_calls[1].slice(1)).toEqual([25, 225]);
    expect(text_calls[11].slice(1)).toEqual([-30, 5]);
    expect(calls('textAlign')).toEqual([['center']]);
  });

  test('the x = 0 line and the y = 0 line are thicker', () => {
    window.draw_timelines();
    const weights = calls('strokeWeight').map(([w]) => w);
    expect(weights[0]).toBe(3);
    expect(weights[1]).toBe(1);
    expect(weights[weights.length - 1]).toBe(3);
    // the y = 0 line is at the bottom of the 0..110 axis
    expect(lines()[lines().length - 1]).toEqual([0, 200, 250, 200]);
  });

  test('a negative lower limit moves the zero line up', () => {
    set_globals({ min_y_timerep: -20, max_y_timerep: 100 });
    window.draw_timelines();
    expect(global_value('min_y_timerep')).toBe(-20);
    expect(global_value('max_y_timerep')).toBe(110);
    const last = lines()[lines().length - 1];
    expect(last[0]).toBe(0);
    expect(last[1]).toBeCloseTo(200 * (110 / 130));
    expect(texts()[texts().length - 1]).toBe('-20.00');
  });
});

describe('draw_nyquist_lines', () => {
  test('widens the limits by one grid step and labels both axes', () => {
    window.draw_nyquist_lines(); // -2..2 -> step 0.4 -> -2.4..2.4
    expect(global_value('min_nyquist_x')).toBe(-2.4);
    expect(global_value('max_nyquist_x')).toBe(2.4);
    expect(global_value('min_nyquist_y')).toBe(-2.4);
    expect(global_value('max_nyquist_y')).toBe(2.4);
    const labels = texts();
    expect(labels).toHaveLength(26);
    expect(labels.slice(0, 13)).toEqual(['-2.4', '-2.0', '-1.6', '-1.2', '-0.8', '-0.4', '0.0', '0.4', '0.8', '1.2', '1.6', '2.0', '2.4']);
    expect(labels.slice(13)).toEqual(['2.4', '2.0', '1.6', '1.2', '0.8', '0.4', '0.0', '-0.4', '-0.8', '-1.2', '-1.6', '-2.0', '-2.4']);
  });

  // The imaginary-axis label at 0 is computed as 2.4 - 6 * 0.4 = -4.4e-16; it must not print as "-0.0".
  test('the label at imaginary = 0 is "0.0", not "-0.0"', () => {
    window.draw_nyquist_lines();
    expect(texts().slice(13)[6]).toBe('0.0');
  });

  test('draws thick axes through the origin', () => {
    window.draw_nyquist_lines();
    const all_lines = lines();
    expect(all_lines).toHaveLength(13 + 13 + 2);
    expect(all_lines[26]).toEqual([125, 0, 125, 200]); // real = 0
    expect(all_lines[27]).toEqual([0, 100, 250, 100]); // imaginary = 0
    expect(calls('strokeWeight').slice(-1)).toEqual([[3]]);
  });

  test('an off-centre range keeps the origin at the right place', () => {
    set_globals({ min_nyquist_x: -3, max_nyquist_x: 1, min_nyquist_y: -1, max_nyquist_y: 1 });
    window.draw_nyquist_lines();
    const all_lines = lines();
    const [x1, y1, x2, y2] = all_lines[all_lines.length - 2];
    expect([x1 === x2, y1, y2]).toEqual([true, 0, 200]);
    expect(x1).toBeCloseTo(250 * (0 - global_value('min_nyquist_x')) / (global_value('max_nyquist_x') - global_value('min_nyquist_x')));
  });
});

describe('x_axis_steps_text', () => {
  test('labels the frequency axes above and below the plots with powers of ten', () => {
    window.x_axis_steps_text();
    const labels = texts();
    // for each of the 6 powers: "10" and its exponent, on both axes
    expect(labels.filter((t) => t === '10')).toHaveLength(12);
    const exponents = labels.filter((t) => t !== '10');
    expect(exponents.filter((_, i) => i % 2 === 0)).toEqual(['-2', '-1', '0', '1', '2', '3']);
    expect(exponents.filter((_, i) => i % 2 === 1)).toEqual(['-2', '-1', '0', '1', '2', '3']);
    const translations = calls('translate');
    expect(translations[0]).toEqual([0, -25]);
    expect(translations[1]).toEqual([0, 255]); // 200 + 80 - 25
    expect(translations[2]).toEqual([60, -25]); // 300 / 5 per decade
    expect(translations[translations.length - 1]).toEqual([300, 255]);
  });
});
