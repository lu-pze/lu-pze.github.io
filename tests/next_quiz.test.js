// Characterization tests for next_quiz() in src/quiz.js: which question type is picked, and the
// target value / graphs generated for each type at each difficulty level. Math.random is replaced
// by a scripted sequence (0.5 once the script runs out), and removeAllGraphs/addNewGraph are
// spies, so no real graphs are built.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = ['removeAllGraphs', 'addNewGraph', 'add_event', 'redraw'];
const originals = {};
let random_spy;

// Math.random returns the given values in order, then 0.5.
function script_random(...values) {
  let next = 0;
  let calls = 0;
  random_spy = jest.spyOn(Math, 'random').mockImplementation(() => {
    // A "pick a value different from last time" loop that keeps getting the same value would
    // otherwise spin until the heap is exhausted.
    if (++calls > 1000) throw new Error('Math.random called over 1000 times: runaway loop in the test script');
    return next < values.length ? values[next++] : 0.5;
  });
}

const QUESTIONS = ['click_freq', 'click_time', 'click_nyquist_angle', 'click_system', 'click_wrong'];

// Sets up a quiz in which only `type` is enabled, at the given difficulty level, so next_quiz
// asks for that type without drawing a random number.
function single_type(type, level, extra = {}) {
  window.addNewGraph.mockClear(); // tests call this several times; graphs() should only show the latest question
  const difficulties = {};
  const enabled = {};
  const nof_done = {};
  for (const question of QUESTIONS) {
    difficulties[question] = 50;
    enabled[question] = question === type;
    nof_done[question] = 0;
  }
  difficulties[type] = level;
  set_globals({
    quiz_difficulties: difficulties, enabled_quiz_types: enabled, quiz_questions_nof_done: nof_done,
    current_quiz: 'none', quiz_no: 0,
    // Sentinels that no generated value equals, so the "pick a new value" loops end at once.
    quiz_freq: 12345, quiz_time_to_click: 12345, quiz_nyquist_angle_to_click: 12345,
    quiz_system_to_click: 12345, quiz_click_wrong: 12345,
    improvement_enabled: false, light_mode: 'dark',
    ...extra,
  });
}

const quiz_text = () => document.getElementById('quiz_text').innerHTML;
const graphs = () => window.addNewGraph.mock.calls.map(([, graph]) => graph);

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
});

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  document.getElementById('quiz_text').innerHTML = '';
});

afterEach(() => {
  random_spy?.mockRestore();
  random_spy = undefined;
  for (const name of SPYABLE) window[name] = originals[name];
});

// ---------------------------------------------------------------------------
describe('choosing the question type', () => {
  const three_types = (extra) => {
    single_type('click_freq', 50);
    set_globals({
      enabled_quiz_types: { click_freq: true, click_time: true, click_nyquist_angle: false, click_system: false, click_wrong: true },
      quiz_difficulties: { click_freq: 50, click_time: 0, click_nyquist_angle: 50, click_system: 50, click_wrong: 100 },
      quiz_questions_nof_done: { click_freq: 0, click_time: 0, click_nyquist_angle: 0, click_system: 0, click_wrong: 0 },
      current_quiz: 'click_freq', quiz_no: 10,
      ...extra,
    });
  };

  test('starts by removing all graphs', () => {
    single_type('click_time', 0);
    window.next_quiz();
    expect(window.removeAllGraphs).toHaveBeenCalledTimes(1);
  });

  test('a single enabled type is always asked, without drawing a random number', () => {
    single_type('click_time', 0, { current_quiz: 'click_time' });
    script_random();
    window.next_quiz();
    expect(global_value('current_quiz')).toBe('click_time');
    expect(random_spy).not.toHaveBeenCalled();
  });

  test('later questions are drawn among the other enabled types, weighted by (104 - level) / 104', () => {
    // time has level 0 -> weight 1, wrong has level 100 -> weight 4/104; freq is the current one.
    three_types();
    script_random(0.9);
    window.next_quiz();
    expect(global_value('current_quiz')).toBe('click_time');

    three_types();
    script_random(0.99);
    window.next_quiz();
    expect(global_value('current_quiz')).toBe('click_wrong');
  });

  test('never repeats the current type back to back', () => {
    three_types();
    for (const r of [0, 0.3, 0.6, 0.999]) {
      set_globals({ current_quiz: 'click_freq' });
      script_random(r);
      window.next_quiz();
      expect(global_value('current_quiz')).not.toBe('click_freq');
      random_spy.mockRestore();
    }
  });

  test('the first round asks every enabled type once: only types not yet done are candidates', () => {
    three_types({
      quiz_no: 0,
      quiz_questions_nof_done: { click_freq: 1, click_time: 0, click_nyquist_angle: 0, click_system: 0, click_wrong: 0 },
    });
    script_random(0.1);
    window.next_quiz();
    expect(global_value('current_quiz')).toBe('click_time');

    three_types({
      quiz_no: 0,
      quiz_questions_nof_done: { click_freq: 1, click_time: 0, click_nyquist_angle: 0, click_system: 0, click_wrong: 0 },
    });
    script_random(0.9);
    window.next_quiz();
    expect(global_value('current_quiz')).toBe('click_wrong');
  });

  test('once quiz_no reaches the number of enabled types, types already done are candidates again', () => {
    three_types({
      quiz_no: 3,
      quiz_questions_nof_done: { click_freq: 1, click_time: 1, click_nyquist_angle: 0, click_system: 0, click_wrong: 0 },
    });
    script_random(0.5);
    window.next_quiz();
    expect(global_value('current_quiz')).toBe('click_time'); // not "the only one not yet done" (click_wrong)
  });

  test('with nothing enabled, every type is a candidate (except the current one)', () => {
    three_types({ enabled_quiz_types: { click_freq: false, click_time: false, click_nyquist_angle: false, click_system: false, click_wrong: false } });
    script_random(0);
    window.next_quiz();
    expect(global_value('current_quiz')).toBe('click_time');
  });

  test('counts the question and logs it', () => {
    single_type('click_time', 0);
    window.next_quiz();
    window.next_quiz();
    expect(global_value('quiz_no')).toBe(2);
    expect(global_value('quiz_questions_nof_done').click_time).toBe(2);
    expect(window.add_event).toHaveBeenCalledWith('next_quiz=click_time');
    expect(window.add_event).toHaveBeenCalledWith('level=0');
    expect(window.add_event).toHaveBeenCalledWith('quiz_text=' + quiz_text());
    expect(window.redraw).toHaveBeenCalledTimes(2);
  });

  test('styles the question text for dark and light mode', () => {
    const norepeat = document.getElementById('quiz_text_norepeat');
    single_type('click_time', 0);
    window.next_quiz();
    expect(norepeat.style.color).not.toBe('');
    const dark = [norepeat.style.color, norepeat.style.animation];
    set_globals({ light_mode: 'light' });
    window.next_quiz();
    expect([norepeat.style.color, norepeat.style.animation]).not.toEqual(dark);
    expect(norepeat.style.animation).toContain('quiz_fade_light_mode');
  });
});

// ---------------------------------------------------------------------------
describe('click_freq', () => {
  const ask = (level, ...random) => {
    single_type('click_freq', level);
    script_random(...random);
    window.next_quiz();
    random_spy.mockRestore();
  };

  test.each([[0], [5.9]])('level %s: any Bode plot will do', (level) => {
    ask(level);
    expect(global_value('quiz_freq')).toBe(0);
    expect(quiz_text()).toBe('Click on any of the Bode plots to the left');
  });

  test.each([[6], [16.9]])('level %s: alternates between the magnitude plot and the phase plot', (level) => {
    ask(level);
    expect(global_value('quiz_freq')).toBe(-1);
    expect(quiz_text()).toBe('Click on the Bode magnitude plot');
    set_globals({ quiz_freq: -1 });
    script_random();
    window.next_quiz();
    expect(global_value('quiz_freq')).toBe(-2);
    expect(quiz_text()).toBe('Click on the Bode phase plot');
  });

  test('level 17-39: powers of ten from 0.01 to 100 rad/s', () => {
    for (const [r, expected] of [[0, 0.01], [0.2, 0.1], [0.4, 1], [0.6, 10], [0.99, 100]]) {
      ask(20, r);
      expect(global_value('quiz_freq')).toBeCloseTo(expected, 10);
      expect(quiz_text()).toBe(`Click on the frequency ${expected.toFixed(2)} rad/s`);
    }
  });

  test('level 40-74: a mantissa of 1-4 times a power of ten', () => {
    ask(50, 0.99, 0.4); // mantissa 4, power 0
    expect(global_value('quiz_freq')).toBe(4);
    ask(50, 0, 0.99); // mantissa 1, power 2
    expect(global_value('quiz_freq')).toBe(100);
  });

  test('level 75 and up: a mantissa of 1-9 times a power of ten', () => {
    ask(80, 0.99, 0); // mantissa 9, power -2
    expect(global_value('quiz_freq')).toBeCloseTo(0.09, 10);
    ask(100, 0.5, 0.5); // mantissa 5, power 0
    expect(global_value('quiz_freq')).toBe(5);
    expect(quiz_text()).toBe('Click on the frequency 5.00 rad/s');
  });

  test('level boundaries: 6, 17, 40 and 75', () => {
    // first draw is the mantissa where there is one (levels 40+), then the power of ten
    const kinds = (level) => {
      ask(level, 0.99, 0.99);
      return global_value('quiz_freq');
    };
    expect(kinds(5.99)).toBe(0); // any plot
    expect(kinds(6)).toBe(-1); // magnitude / phase plot
    expect(kinds(16.99)).toBe(-1);
    expect(kinds(17)).toBe(100); // 1 * 10^2: mantissa fixed at 1
    expect(kinds(39.99)).toBe(100);
    expect(kinds(40)).toBe(400); // mantissa 1-4
    expect(kinds(74.99)).toBe(400);
    expect(kinds(75)).toBe(900); // mantissa 1-9
  });

  test('asks for a different frequency than last time', () => {
    single_type('click_freq', 20, { quiz_freq: 1 });
    script_random(0.4, 0.2); // first draw gives 1 again, the second gives 0.1
    window.next_quiz();
    expect(global_value('quiz_freq')).toBeCloseTo(0.1, 10);
  });
});

// ---------------------------------------------------------------------------
describe('click_time', () => {
  const ask = (level, ...random) => {
    single_type('click_time', level);
    script_random(...random);
    window.next_quiz();
    random_spy.mockRestore();
  };

  test('level below 6: any time will do', () => {
    ask(5);
    expect(global_value('quiz_time_to_click')).toBe(-1);
    expect(quiz_text()).toBe('Click on the Step input response graph. It has time on the horizontal axis.');
  });

  test('level 6-39: whole seconds 0-10', () => {
    ask(6, 0.73);
    expect(global_value('quiz_time_to_click')).toBe(7);
    expect(quiz_text()).toBe('Click on the time 7 seconds in the Step input response graph');
  });

  test('level 40-69: tenths of a second', () => {
    ask(40, 0.456);
    expect(global_value('quiz_time_to_click')).toBe(4.6);
    expect(quiz_text()).toBe('Click on the time 4.6 s');
  });

  test('level 70 and up: hundredths of a second', () => {
    ask(70, 0.4567);
    expect(global_value('quiz_time_to_click')).toBe(4.57);
    expect(quiz_text()).toBe('Click on the time 4.57 s');
  });

  test('asks for a different time than last time', () => {
    single_type('click_time', 20, { quiz_time_to_click: 5 });
    script_random(0.5, 0.2);
    window.next_quiz();
    expect(global_value('quiz_time_to_click')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
describe('click_nyquist_angle', () => {
  const ask = (level, r, extra) => {
    single_type('click_nyquist_angle', level, extra);
    script_random(r);
    window.next_quiz();
    random_spy.mockRestore();
    return global_value('quiz_nyquist_angle_to_click');
  };
  const angle_text = (angle) => `Click on the angle ${angle}° in the Nyquist diagram`;

  test('level below 6: any point on the diagram will do', () => {
    expect(ask(5, 0.5)).toBe(1000);
    expect(quiz_text()).toBe(
      'Click on the Nyquist diagram. It has a unit circle, and the critical point -1 is at the left edge of the unit circle.');
  });

  test('level 6-19: 0, -90 or -180', () => {
    expect([0, 0.4, 0.99].map((r) => ask(10, r) + 0)).toEqual([0, -90, -180]);
    expect(quiz_text()).toBe(angle_text(-180));
  });

  test('level 20-39: 90 down to -270 in steps of 90', () => {
    expect([0, 0.25, 0.5, 0.75, 0.99].map((r) => ask(30, r))).toEqual([90, 0, -90, -180, -270]);
  });

  test('level 40-69: 90 down to -270 in steps of 45', () => {
    expect([0, 0.5, 0.99].map((r) => ask(50, r))).toEqual([90, 90 - 45 * 4, 90 - 45 * 8]);
    expect(quiz_text()).toBe(angle_text(-270));
  });

  test('level 70 and up: any whole angle from 90 down to -269', () => {
    expect([0, 0.5, 0.9999].map((r) => ask(90, r))).toEqual([90, -90, -269]);
  });

  test('asks for a different angle than last time', () => {
    single_type('click_nyquist_angle', 30, { quiz_nyquist_angle_to_click: 90 });
    script_random(0, 0.3);
    window.next_quiz();
    expect(global_value('quiz_nyquist_angle_to_click')).toBe(0);
  });

  // Contract with quiz_clicked: clicking exactly on the requested angle is always accepted.
  test('every generable angle is judged correct when clicked exactly', () => {
    window.quiz_correct = jest.fn();
    window.quiz_incorrect = jest.fn();
    window.update_quiz = jest.fn();
    try {
      for (let degrees = 90; degrees >= -269; degrees--) {
        set_globals({ current_quiz: 'click_nyquist_angle', quiz_nyquist_angle_to_click: degrees });
        window.quiz_clicked({ where: 'Nyq', phase: degrees });
      }
      expect(window.quiz_correct).toHaveBeenCalledTimes(360);
      expect(window.quiz_incorrect).not.toHaveBeenCalled();
    } finally {
      delete window.quiz_correct;
      delete window.quiz_incorrect;
      delete window.update_quiz;
    }
  });
});

// ---------------------------------------------------------------------------
describe('click_system', () => {
  const ask = (level, ...random) => {
    single_type('click_system', level);
    script_random(...random);
    window.next_quiz();
    random_spy.mockRestore();
    return graphs();
  };

  test('adds three graphs: first, second and fourth order', () => {
    // random: colour 0.5 -> 2, k 0.5 -> 2.25, second graph 0.5 -> the 8 rad/s resonance, k4 0.5 -> 2.25
    const [first, second, fourth] = ask(10);
    expect(window.addNewGraph).toHaveBeenCalledTimes(3);
    expect(window.addNewGraph.mock.calls.every(([event]) => event === null)).toBe(true);
    expect(first).toEqual({ name: 'GhostMPTNIE_', mf: '\\frac{2.25}{1+1s}', formula: '(2.25)/((1+1s))' });
    expect(second).toEqual({
      name: 'GhostMPTNIE_', mf: '\\frac{8^2}{s^2+2*0.05*8*s+8^2}', formula: '8^2/(s^2+2*0.05*8*s+8^2)',
    });
    expect(fourth).toEqual({ name: 'GhostMPTNIE_', mf: '\\frac{2.25}{(1+1s)^4}', formula: '2.25/((1+1s)^4)' });
    expect(global_value('next_graph_no_to_add')).toBe(2);
    expect(global_value('id_bank')).toBe(2);
  });

  test.each([
    [0.1, '\\frac{0.5}{1+2s+s^2}'], [0.3, '\\frac{1}{(1+5s)(1+0.05s)}'],
    [0.6, '\\frac{8^2}{s^2+2*0.05*8*s+8^2}'], [0.9, '\\frac{0.7*2^2}{s^2+2*0.7*2*s+2^2}'],
  ])('second graph for random %s is %s', (r, mf) => {
    // draws: colour, k, then the selector for the second graph
    expect(ask(10, 0.5, 0.5, r)[1].mf).toBe(mf);
  });

  test.each([
    [10, [0.5], ['GhostMPTNIE_', 'GhostMPTNIE_', 'GhostMPTNIE_']],
    // 30-59: one of three display subsets shared by all graphs (draws: colour, selector)
    [40, [0.5, 0.1], ['GhostMP...._', 'GhostMP...._', 'GhostMP...._']],
    [40, [0.5, 0.5], ['Ghost..TN.._', 'Ghost..TN.._', 'Ghost..TN.._']],
    [40, [0.5, 0.9], ['GhostM.T..._', 'GhostM.T..._', 'GhostM.T..._']],
    // 60-89: the graphs are only shown in one place
    [70, [0.5, 0.1], ['GhostM....._', 'GhostM....._', 'GhostM....._']],
    [70, [0.5, 0.5], ['Ghost.P...._', 'Ghost.P...._', 'Ghost.P...._']],
    [70, [0.5, 0.9], ['Ghost..T..._', 'Ghost..T..._', 'Ghost..T..._']],
    // 90 and up: each graph in its own plot, in a random permutation
    [95, [0.5, 0.1], ['GhostM....._', 'Ghost.P...._', 'Ghost..T..._']],
    [95, [0.5, 0.5], ['Ghost..T..._', 'GhostM....._', 'Ghost.P...._']],
    [95, [0.5, 0.9], ['Ghost.P...._', 'Ghost..T..._', 'GhostM....._']],
  ])('level %s with draws %j shows the graphs in %j', (level, random, names) => {
    expect(ask(level, ...random).map((graph) => graph.name)).toEqual(names);
  });

  test('time constants stay at 1 up to level 30 and vary above it; negative gains only above level 70', () => {
    // draws: colour, selector (levels 30+), k, [sign], decimal, power, second graph, k4, [sign], ...
    expect(ask(30, 0.5, 0.5)[0].formula).toBe('(2.25)/((1+1s))');
    expect(ask(31, 0.5, 0.5, 0.5, 0.5, 0.5)[0].formula).toBe('(2.25)/((1+0.2s))'); // t = 1 / (5 * 10^0)
    expect(ask(70, 0.5, 0.5, 0.5)[0].formula).toMatch(/^\(2\.25\)/);
    expect(ask(71, 0.5, 0.5, 0.5, 0.2)[0].formula).toMatch(/^\(-2\.25\)/);
  });

  test('asks for a different order than last time and words the question accordingly', () => {
    for (const [r, order, text] of [
      [0.1, 1, 'Click a first-order system'], [0.5, 2, 'Click a second-order system'], [0.9, 3, 'Click a fourth-order system'],
    ]) {
      single_type('click_system', 10);
      // 4 draws (colour, k, second graph, k4) precede the order choice below level 30
      script_random(0.5, 0.5, 0.5, 0.5, r);
      window.next_quiz();
      random_spy.mockRestore();
      expect(global_value('quiz_system_to_click')).toBe(order);
      expect(quiz_text()).toBe(text);
    }
    single_type('click_system', 10, { quiz_system_to_click: 2 });
    script_random(0.5, 0.5, 0.5, 0.5, 0.5, 0.9); // the first draw gives 2 again, the next gives 4th order
    window.next_quiz();
    expect(global_value('quiz_system_to_click')).not.toBe(2);
  });

  test('above level 95 the input may be switched to a Dirac impulse', () => {
    set_globals({ input_formula: '1/s' });
    // 11 draws precede the impulse decision at this level
    ask(96, ...Array(11).fill(0.5), 0.1);
    expect(global_value('input_formula')).toBe('1');
    expect(document.getElementById('input-formula').value).toBe('1');
  });

  test('...but not below level 95', () => {
    set_globals({ input_formula: '1/s' });
    ask(94, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1);
    expect(global_value('input_formula')).toBe('1/s');
  });
});

// ---------------------------------------------------------------------------
describe('click_wrong', () => {
  // Which two ghost graphs are added for each possible odd-one-out: the plot that is wrong shows
  // the wrong graph, and the other plots show the correct one.
  const NAMES = [
    ['Ghost.PTN.._', 'GhostM....._'],
    ['GhostM.TN.._', 'Ghost.P...._'],
    ['GhostMP.N.._', 'Ghost..T..._'],
    ['GhostMPT..._', 'Ghost...N.._'],
  ];

  const ask = (level, odd_one_out, ...random) => {
    single_type('click_wrong', level);
    // draws: graph colour, odd-one-out, then whatever the test needs
    script_random(0.5, (odd_one_out + 0.5) / 4, ...random);
    window.next_quiz();
    random_spy.mockRestore();
    return graphs();
  };

  test.each([0, 1, 2, 3])('odd one out %s: a correct and a wrong graph, in the right plots', (odd) => {
    const [correct, wrong] = ask(10, odd);
    expect(global_value('quiz_click_wrong')).toBe(odd);
    expect([correct.name, wrong.name]).toEqual(NAMES[odd]);
    expect(correct.formula).not.toBe(wrong.formula);
    expect(quiz_text()).toBe('Click on the wrong graph');
    expect(window.add_event).toHaveBeenCalledWith(`quiz_click_wrong=${odd}`);
    expect(global_value('next_graph_no_to_add')).toBe(2);
  });

  test('picks a different odd one out than last time', () => {
    single_type('click_wrong', 10, { quiz_click_wrong: 2 });
    script_random(0.5, 0.6, 0.1); // 2 again, then 0
    window.next_quiz();
    expect(global_value('quiz_click_wrong')).toBe(0);
  });

  const second_order = (graph) => graph.formula.includes('s^2');
  test('level 40 or below: both graphs are first order', () => {
    const [correct, wrong] = ask(40, 0, 0.1);
    expect([second_order(correct), second_order(wrong)]).toEqual([false, false]);
  });

  test('level above 40: both graphs are second order or both first order, by a coin flip', () => {
    expect(ask(50, 0, 0.1).map(second_order)).toEqual([true, true]);
    expect(ask(50, 0, 0.9).map(second_order)).toEqual([false, false]);
  });

  test('level above 90: the wrong graph may have a different order from the correct one', () => {
    // draws after colour & odd-one-out: order coin 0.1 -> second order, mismatch coin 0.1 (< 0.4) -> wrong is first order
    const [correct, wrong] = ask(95, 0, 0.1, 0.1);
    expect([second_order(correct), second_order(wrong)]).toEqual([true, false]);
    const [correct2, wrong2] = ask(95, 0, 0.1, 0.9);
    expect([second_order(correct2), second_order(wrong2)]).toEqual([true, true]);
    // the boundaries are "above 40" and "above 90"
    expect(ask(40.5, 0, 0.1).map(second_order)).toEqual([true, true]);
    expect(ask(90, 0, 0.1, 0.1).map(second_order)).toEqual([true, true]);
    expect(ask(90.5, 0, 0.1, 0.1).map(second_order)).toEqual([true, false]);
  });

  test('the graph that is wrong in the Nyquist diagram has a different gain', () => {
    const [correct, wrong] = ask(10, 3);
    expect(correct.mf).not.toBe(wrong.mf);
    expect(correct.mf).toMatch(/^\\frac\{[0-9.]+\}\{1\+1s\}$/);
  });
});

// ---------------------------------------------------------------------------
// Cases added after Stryker mutation testing (npm run test:mutation) showed that no test noticed
// these changes to src/quiz.js.
describe('mutation gaps: choosing the question type', () => {
  const first_round = (random) => {
    single_type('click_freq', 50);
    set_globals({
      enabled_quiz_types: { click_freq: true, click_time: true, click_nyquist_angle: false, click_system: false, click_wrong: true },
      quiz_questions_nof_done: { click_freq: 1, click_time: 0, click_nyquist_angle: 0, click_system: 0, click_wrong: 0 },
      current_quiz: 'click_freq', quiz_no: 0,
    });
    script_random(random);
    window.pick_next_quiz_type();
    return global_value('current_quiz');
  };

  test('the first round never offers a type that is not enabled, even if it was never asked', () => {
    // candidates: time and wrong (weight 1 each). Counting the disabled nyquist type as well would
    // put 0.3 * 4 = 1.2 on it.
    expect(first_round(0.3)).toBe('click_time');
  });

  test('a draw exactly on a cumulative weight picks the earlier candidate', () => {
    expect(first_round(0.5)).toBe('click_time'); // 0.5 * 2 = 1 = weight of the first candidate
    random_spy.mockRestore();
    expect(first_round(0.5001)).toBe('click_wrong');
  });

  test('with no candidate left in the first round nothing is picked (empty type)', () => {
    single_type('click_freq', 50);
    set_globals({
      enabled_quiz_types: { click_freq: true, click_time: true, click_nyquist_angle: false, click_system: false, click_wrong: false },
      quiz_questions_nof_done: { click_freq: 1, click_time: 1, click_nyquist_angle: 0, click_system: 0, click_wrong: 0 },
      current_quiz: 'click_freq', quiz_no: 0,
    });
    script_random(0.5);
    window.pick_next_quiz_type();
    expect(global_value('current_quiz')).toBe('');
  });
});

describe('mutation gaps: question texts', () => {
  test('click_freq at level 40-74 also words the question with the frequency', () => {
    single_type('click_freq', 50);
    script_random(0.99, 0.4); // mantissa 4, power 0
    window.next_quiz();
    expect(quiz_text()).toBe('Click on the frequency 4.00 rad/s');
  });
});

describe('mutation gaps: click_nyquist_angle level boundaries', () => {
  const ask = (level, r) => {
    single_type('click_nyquist_angle', level);
    script_random(r);
    window.next_quiz();
    random_spy.mockRestore();
    return global_value('quiz_nyquist_angle_to_click');
  };

  test('6 is the first level with an angle', () => {
    expect(ask(5.99, 0.5)).toBe(1000);
    expect(ask(6, 0.5)).not.toBe(1000);
  });

  test('20, 40 and 70 switch to the next, finer set of angles', () => {
    expect(ask(19.99, 0.99) + 0).toBe(-180); // steps of 90, 0..-180
    expect(ask(20, 0.99)).toBe(-270); // steps of 90, 90..-270
    expect(ask(30, 0.19)).toBe(90); // still steps of 90 (not 45) in the middle of 20-39
    expect(ask(39.99, 0.19)).toBe(90);
    expect(ask(40, 0.19)).toBe(45); // steps of 45
    expect(ask(69.99, 0.19)).toBe(45);
    expect(ask(70, 0.19)).toBe(22); // whole degrees
  });
});

describe('mutation gaps: ghost systems', () => {
  test('random_ghost_time_constant is 1/(decimal * 10^power), power starting at -1', () => {
    script_random(0.5, 0.2); // decimal 5, power floor(0.2 * 2) - 1 = -1
    expect(window.random_ghost_time_constant(31, 2)).toBeCloseTo(2, 10);
    random_spy.mockRestore();
    script_random(0.5, 0.99); // power 0 for a range of 2
    expect(window.random_ghost_time_constant(31, 2)).toBeCloseTo(0.2, 10);
    random_spy.mockRestore();
    script_random(0.5, 0.99); // power 1 for a range of 3
    expect(window.random_ghost_time_constant(31, 3)).toBeCloseTo(0.02, 10);
    random_spy.mockRestore();
    script_random();
    expect(window.random_ghost_time_constant(30, 3)).toBe(1);
  });

  test('random_ghost_gain: negative only above level 70, and only for a draw below 0.5', () => {
    const gain = (level, k_draw, sign_draw) => {
      script_random(k_draw, sign_draw);
      const k = window.random_ghost_gain(level);
      random_spy.mockRestore();
      return k;
    };
    expect(gain(70, 0.5, 0.2)).toBe(2.25);
    expect(gain(70.5, 0.5, 0.2)).toBe(-2.25);
    expect(gain(70.5, 0.5, 0.5)).toBe(2.25);
    expect(gain(70.5, 0.5, 0.4999)).toBe(-2.25);
  });

  test('second_order_ghost writes the same system for MathLive and for math.js', () => {
    expect(window.second_order_ghost('n', 2, 0.5, 3)).toEqual({
      name: 'n',
      mf: '\\frac{2*(3)^2}{s^2+2*(0.5)*(3)*s+(3)^2}',
      formula: '2*(3)^2/(s^2+2*(0.5)*(3)*s+(3)^2)',
    });
  });

  test('click_system_name_prefixes changes at levels 30, 60 and 90, and at draws 0.33 and 0.67', () => {
    const prefixes = (level, r) => {
      script_random(r);
      const result = window.click_system_name_prefixes(level);
      random_spy.mockRestore();
      return [result.first, result.second, result.fourth];
    };
    const all = (name) => [name, name, name];
    expect(prefixes(29.99, 0.1)).toEqual(all('GhostMPTNIE_'));
    expect(prefixes(30, 0.1)).toEqual(all('GhostMP...._'));
    expect(prefixes(59.99, 0.1)).toEqual(all('GhostMP...._'));
    expect(prefixes(60, 0.1)).toEqual(all('GhostM....._'));
    expect(prefixes(89.99, 0.1)).toEqual(all('GhostM....._'));
    expect(prefixes(90, 0.1)).toEqual(['GhostM....._', 'Ghost.P...._', 'Ghost..T..._']);

    for (const [level, draws] of [
      [40, [[0.3299, 'GhostMP...._'], [0.33, 'Ghost..TN.._'], [0.6699, 'Ghost..TN.._'], [0.67, 'GhostM.T..._']]],
      [70, [[0.3299, 'GhostM....._'], [0.33, 'Ghost.P...._'], [0.6699, 'Ghost.P...._'], [0.67, 'Ghost..T..._']]],
    ]) {
      for (const [r, name] of draws) expect(prefixes(level, r)).toEqual(all(name));
    }
    expect(prefixes(95, 0.3299)).toEqual(['GhostM....._', 'Ghost.P...._', 'Ghost..T..._']);
    expect(prefixes(95, 0.33)).toEqual(['Ghost..T..._', 'GhostM....._', 'Ghost.P...._']);
    expect(prefixes(95, 0.6699)).toEqual(['Ghost..T..._', 'GhostM....._', 'Ghost.P...._']);
    expect(prefixes(95, 0.67)).toEqual(['Ghost.P...._', 'Ghost..T..._', 'GhostM....._']);
  });
});

describe('mutation gaps: click_system graphs', () => {
  const ask = (level, ...random) => {
    single_type('click_system', level);
    script_random(...random);
    window.next_quiz();
    random_spy.mockRestore();
    return graphs();
  };
  // Draws are 0.5 unless the test names the (1-based) position of a draw.
  const draws = (length, overrides = {}) => Array.from({ length }, (_, i) => overrides[i + 1] ?? 0.5);

  test.each([
    [0.1, '\\frac{0.5}{1+2s+s^2}', '0.5/(1+2s+s^2)'],
    [0.25, '\\frac{1}{(1+5s)(1+0.05s)}', '1/(1+5s)*1/(1+0.05s)'],
    [0.4999, '\\frac{1}{(1+5s)(1+0.05s)}', '1/(1+5s)*1/(1+0.05s)'],
    [0.5, '\\frac{8^2}{s^2+2*0.05*8*s+8^2}', '8^2/(s^2+2*0.05*8*s+8^2)'],
    [0.7499, '\\frac{8^2}{s^2+2*0.05*8*s+8^2}', '8^2/(s^2+2*0.05*8*s+8^2)'],
    [0.75, '\\frac{0.7*2^2}{s^2+2*0.7*2*s+2^2}', '0.7*2^2/(s^2+2*0.7*2*s+2^2)'],
    [0.9, '\\frac{0.7*2^2}{s^2+2*0.7*2*s+2^2}', '0.7*2^2/(s^2+2*0.7*2*s+2^2)'],
  ])('second graph for random %s has the exact name, LaTeX and formula', (r, mf, formula) => {
    expect(ask(10, 0.5, 0.5, r)[1]).toEqual({ name: 'GhostMPTNIE_', mf, formula });
  });

  test('the fourth-order time constant: 3/decimal from level 31, 3/(decimal * 10^power) from level 81', () => {
    const fourth = (level, overrides) => ask(level, ...draws(12, overrides))[2].formula;
    // level 85 draws: colour, prefix, k, sign, dec, pow, second, k4, sign4, decimal4 (10), power4 (11)
    expect(fourth(85, { 10: 0.5, 11: 0.99 })).toBe('2.25/((1+0.06s)^4)'); // 3 / (5 * 10)
    expect(fourth(85, { 10: 0.5, 11: 0.2 })).toBe('2.25/((1+0.6s)^4)'); // 3 / (5 * 1)
    expect(fourth(85, { 10: 0.0, 11: 0.99 })).toBe('2.25/((1+0.3s)^4)'); // 3 / (1 * 10)
    // level 80 is still in the middle range: the power draw is not used
    expect(fourth(80, { 10: 0.5, 11: 0.99 })).toBe('2.25/((1+0.6s)^4)');
    expect(fourth(80.5, { 10: 0.5, 11: 0.99 })).toBe('2.25/((1+0.06s)^4)');
    // level 50 draws: colour, prefix, k, dec, pow, second, k4, decimal4 (8)
    expect(fourth(50, { 8: 0.5 })).toBe('2.25/((1+0.6s)^4)');
    expect(fourth(50, { 8: 0.0 })).toBe('2.25/((1+3s)^4)');
    // up to level 30 the time constant stays 1
    expect(fourth(30, {})).toBe('2.25/((1+1s)^4)');
    expect(fourth(30.5, {})).toBe('2.25/((1+0.6s)^4)');
  });

  test('the Dirac impulse is selected by name in the input drop-down', () => {
    const choices = document.getElementById('input-choices');
    choices.value = 'Unit step';
    set_globals({ input_formula: '1/s' });
    ask(96, ...draws(11), 0.1);
    expect(choices.value).toBe('Impulse');
  });

  test('...only for a draw below 0.33, and only above level 95', () => {
    const choices = document.getElementById('input-choices');
    choices.value = 'Unit step';
    set_globals({ input_formula: '1/s' });
    ask(96, ...draws(11), 0.33);
    expect(global_value('input_formula')).toBe('1/s');
    ask(95, ...draws(11), 0.1);
    expect(global_value('input_formula')).toBe('1/s');
    expect(choices.value).toBe('Unit step');
  });
});

describe('mutation gaps: next_quiz logs the difficulty level of every question type', () => {
  test.each(['click_freq', 'click_time', 'click_nyquist_angle', 'click_system', 'click_wrong'])('%s', (type) => {
    single_type(type, 33);
    script_random();
    window.next_quiz();
    expect(window.add_event).toHaveBeenCalledWith('level=33');
  });
});

describe('mutation gaps: click_wrong', () => {
  const ask = (level, odd_one_out, ...random) => {
    single_type('click_wrong', level);
    script_random(0.5, (odd_one_out + 0.5) / 4, ...random);
    window.next_quiz();
    random_spy.mockRestore();
    return graphs();
  };
  const second_order = (graph) => graph.formula.includes('s^2');

  test('the order coin flips at exactly 0.5 and the mismatch coin at exactly 0.4', () => {
    expect(ask(50, 0, 0.5).map(second_order)).toEqual([false, false]);
    expect(ask(50, 0, 0.4999).map(second_order)).toEqual([true, true]);
    expect(ask(95, 0, 0.1, 0.4).map(second_order)).toEqual([true, true]);
    expect(ask(95, 0, 0.1, 0.3999).map(second_order)).toEqual([true, false]);
  });

  test('the correct second-order graph uses z = 2 * draw and w = 0.4 + 4 * draw', () => {
    // level 50 draws after colour & odd-one-out: order coin, k, decimal, power, z (7), w (8)
    const [correct] = ask(50, 0, 0.1, 0.5, 0.5, 0.5, 0.25, 0.25);
    expect(correct.mf).toBe('\\frac{2.25*(1.4)^2}{s^2+2*(0.5)*(1.4)*s+(1.4)^2}');
    expect(correct.formula).toBe('2.25*(1.4)^2/(s^2+2*(0.5)*(1.4)*s+(1.4)^2)');
  });
});
