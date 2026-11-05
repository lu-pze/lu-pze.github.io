// The last small gaps that `npm run test:coverage` showed in the other suites: branches and
// one-line `if` bodies that no test reached. Each describe block names the src/ file it covers.
// The expected values are worked out from the maths or the documented behaviour, not copied from
// the output.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

beforeAll(() => loadApp());

// Math.random returns the given values in order, then 0.5. Throws after 1000 calls so that a
// "pick a value different from last time" loop cannot spin until the heap is exhausted.
let random_spy;
function script_random(...values) {
  let next = 0;
  let nof_calls = 0;
  random_spy = jest.spyOn(Math, 'random').mockImplementation(() => {
    if (++nof_calls > 1000) throw new Error('Math.random called over 1000 times: runaway loop in the test script');
    return next < values.length ? values[next++] : 0.5;
  });
}
// Math.random returns the same value every time.
function constant_random(value) {
  random_spy = jest.spyOn(Math, 'random').mockImplementation(() => value);
}
afterEach(() => {
  random_spy?.mockRestore();
  random_spy = undefined;
});

// Replaces functions that other files call by global name; restore_spies undoes it.
const saved_functions = {};
function spy_on(names) {
  for (const name of names) {
    if (!(name in saved_functions)) saved_functions[name] = window[name];
    window[name] = jest.fn();
  }
}
function restore_spies() {
  for (const name of Object.keys(saved_functions)) {
    window[name] = saved_functions[name];
    delete saved_functions[name];
  }
}

// ---------------------------------------------------------------------------
// transfer_math.js
// ---------------------------------------------------------------------------
describe('transfer_math.js', () => {
  const math = () => window.math;

  test('the compiled-formula cache is emptied when it holds 500 formulas, and not before', () => {
    const limit = global_value('MAX_COMPILED_FORMULAS');
    expect(limit).toBe(500);
    const cache = global_value('compiled_formulas');
    cache.clear();
    const first = window.compile_formula('s+0');
    for (let i = 1; i < limit; i++) window.compile_formula('s+' + i);
    expect(cache.size).toBe(limit);
    expect(window.compile_formula('s+0')).toBe(first); // served from the cache
    window.compile_formula('s+' + limit); // one formula too many
    expect(cache.size).toBe(1);
    expect(window.compile_formula('s+0')).not.toBe(first); // compiled again
    cache.clear();
  });

  test('gain_db_at and phase_at give NaN when the formula cannot be evaluated, numbers otherwise', () => {
    const broken = window.bind_formula('1/(1+'); // a syntax error: the binding's evaluation throws
    expect(window.gain_db_at(broken, 1)).toBeNaN();
    expect(window.phase_at(broken, 1)).toBeNaN();
    const lowpass = window.bind_formula('1/(1+s)');
    expect(window.gain_db_at(lowpass, 1)).toBeCloseTo(-10 * Math.log10(2), 12);
    expect(window.phase_at(lowpass, 1)).toBeCloseTo(-Math.PI / 4, 12);
  });

  test('to_rational: unary plus is the identity, operators it does not know are rejected', () => {
    expect(window.to_rational(math().parse('+s'), {})).toEqual({ num: [0, 1], den: [1] });
    expect(() => window.to_rational(math().parse('s%2'), {})).toThrow('not a rational function of s'); // mod
    expect(() => window.to_rational(math().parse('s!'), {})).toThrow('not a rational function of s'); // factorial
  });

  test('a formula with a unary plus gets the exact step response 1 - e^-t', () => {
    const times = [0, 0.5, 1, 1.5]; // evenly spaced, as time_response requires
    const response = window.time_response('1/s', '+1/(1+s)', times);
    times.forEach((t, i) => expect(response[i]).toBeCloseTo(1 - Math.exp(-t), 10));
  });

  test('delay_of_factor: the delay of e^(-L*s), and null when the exponent is not c*s', () => {
    expect(window.delay_of_factor(math().parse('exp(-0.5*s)'), {})).toBeCloseTo(0.5, 12);
    expect(window.delay_of_factor(math().parse('exp(sqrt(s))'), {})).toBeNull(); // exponent is not rational
    expect(window.delay_of_factor(math().parse('e^(sqrt(s))'), {})).toBeNull();
    expect(window.delay_of_factor(math().parse('s+1'), {})).toBeNull(); // not an exponential at all
  });

  test('rational_impulse_response refuses a zero leading coefficient and non-finite coefficients', () => {
    const refused = 'not a rational function of s';
    expect(() => window.rational_impulse_response({ num: [1], den: [0] }, 0, [0, 1])).toThrow(refused);
    expect(() => window.rational_impulse_response({ num: [1], den: [1, NaN] }, 0, [0, 1])).toThrow(refused);
    expect(() => window.rational_impulse_response({ num: [NaN], den: [1, 1] }, 0, [0, 1])).toThrow(refused);
    // A constant denominator (order 0) has no dynamics: 0 after t = 0.
    expect(window.rational_impulse_response({ num: [5], den: [2] }, 0, [0, 1])).toEqual([0, 0]);
  });

  test('a single sample has no step length: the impulse response of 1/(1+s) at t = 0 is 1', () => {
    expect(window.time_response('1', '1/(1+s)', [0])).toHaveLength(1);
    expect(window.time_response('1', '1/(1+s)', [0])[0]).toBeCloseTo(1, 12);
  });

  test('time_response throws for a formula that cannot be parsed', () => {
    expect(() => window.time_response('1/s', '1/(1+', [0, 1])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// quiz_scoring.js
// ---------------------------------------------------------------------------
describe('quiz_scoring.js', () => {
  const NOW = new Date('2026-11-03T12:00:00');

  class FakeXHR {
    constructor() {
      this.listeners = {};
      FakeXHR.instances.push(this);
    }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    open(method, url) { this.opened = { method, url }; }
    setRequestHeader() {}
    send(body) { this.sent = body; }
  }
  FakeXHR.instances = [];

  const QUESTION_TYPES = ['click_freq', 'click_time', 'click_nyquist_angle', 'click_system', 'click_wrong'];

  function reset_state(overrides = {}) {
    const difficulties = {};
    const streaks = {};
    for (const question of QUESTION_TYPES) {
      difficulties[question] = 50;
      streaks[question] = 0;
    }
    set_globals({
      current_quiz: 'click_freq',
      quiz_nof_done: 0, quiz_nof_correct: 0, quiz_nof_tries: 0,
      quiz_current_streak: 0, quiz_longest_streak: 0,
      quiz_difficulty: 50, quiz_difficulties: difficulties, quiz_streaks: streaks,
      adaptive_difficulty_enabled: true,
      sound_enabled: 0,
      quiz_timeline: [],
      quiz_started_at: NOW.getTime(),
      improvement_enabled: false, // add_event must not schedule real XHR
      session_started_at: NOW.getTime() - 5000,
      quiz_compete: false,
      client_nick: '', client_place: 'TEST', client_cookid: 17,
      ...overrides,
    });
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    FakeXHR.instances = [];
    window.XMLHttpRequest = FakeXHR;
    reset_state();
  });
  afterEach(() => {
    restore_spies();
    jest.useRealTimers();
  });

  describe('read_highscores: log lines with missing fields and repeated players', () => {
    // One logged result with only the given fields; the player is "P_<nick>".
    const line = (nick, fields) => `T1;U2;LP_${nick};quiz_time_is_up.click_freq=50.0,${fields}`;

    function load(log) {
      spy_on(['add_event']);
      window.read_highscores();
      const request = FakeXHR.instances[FakeXHR.instances.length - 1];
      request.listeners.load({ target: { response: log } });
    }
    function sections() {
      const html = document.getElementById('quiz_highscores').innerHTML.replaceAll('&nbsp;', ' ');
      return Object.fromEntries([...html.matchAll(/<h2>(.*?)<\/h2>([^<]*(?:<(?!h2)[^<]*)*)/g)]
        .map((match) => [match[1], match[2].split('<br>').filter((row) => row !== '')]));
    }

    test('a line without total=, or without nof_correct=, still counts for the fields it has', () => {
      load([
        line('NoTotal', 'longest_streak=7,nof_correct=3,#server_time=2026/10/20 10:00:00'),
        line('NoCorrect', 'total=40.0,longest_streak=2,#server_time=2026/10/21 10:00:00'),
      ].join('\n'));
      const found = sections();
      // NoTotal has no score and is not ranked; NoCorrect is ranked with 0 answered questions.
      expect(found['High score last 3 months']).toEqual([' 1.  40.0 P      NoCorrect, after 0 questions']);
      expect(found['Longest streak']).toEqual([' 1.  7 P      NoTotal', ' 2.  2 P      NoCorrect']);
      expect(found['Most answered questions']).toEqual([' 1.  3 P      NoTotal']);
    });

    test('a line with only a total has no streak, no answered questions and no time', () => {
      load(line('OnlyTotal', 'total=33.0,'));
      const found = sections();
      expect(found['Longest streak']).toEqual([]);
      expect(found['Most answered questions']).toEqual([]);
      expect(found['Latest quizzers']).toEqual([]);
      // Without a time the date is invalid, and an invalid date is not below the 3 month cutoff,
      // so the result is still listed.
      expect(found['High score last 3 months']).toEqual([' 1.  33.0 P      OnlyTotal, after 0 questions']);
    });

    test('a later, higher longest_streak replaces an earlier one, an equal or lower one does not', () => {
      load([
        line('A', 'total=10.0,nof_correct=1,longest_streak=3,#server_time=2026/10/20 10:00:00'),
        line('A', 'total=10.0,nof_correct=1,longest_streak=9,#server_time=2026/10/21 10:00:00'),
        line('A', 'total=10.0,nof_correct=1,longest_streak=9,#server_time=2026/10/22 10:00:00'),
        line('B', 'total=10.0,nof_correct=1,longest_streak=5,#server_time=2026/10/20 10:00:00'),
        line('B', 'total=10.0,nof_correct=1,longest_streak=4,#server_time=2026/10/21 10:00:00'),
      ].join('\n'));
      expect(sections()['Longest streak']).toEqual([' 1.  9 P      A', ' 2.  5 P      B']);
    });

    test('the latest time of a player is kept when an older line comes after a newer one', () => {
      load([
        line('A', 'total=10.0,nof_correct=1,#server_time=2026/10/25 10:00:00'),
        line('A', 'total=10.0,nof_correct=1,#server_time=2026/10/24 10:00:00'), // older: ignored
      ].join('\n'));
      expect(sections()['Latest quizzers']).toEqual(['2026/10/25 10:00:00 P      A']);
    });

    test('players with the same latest time keep the order they have in the log', () => {
      load(['First', 'Second', 'Third', 'Fourth', 'Fifth'].map((nick) =>
        line(nick, 'total=10.0,nof_correct=1,#server_time=2026/10/25 10:00:00')).join('\n'));
      expect(sections()['Latest quizzers']).toEqual(
        ['First', 'Second', 'Third', 'Fourth', 'Fifth'].map((nick) => `2026/10/25 10:00:00 P      ${nick}`),
      );
    });
  });

  describe('quiz_time_is_up', () => {
    beforeEach(() => spy_on(['add_event', 'removeAllGraphs']));
    const intro = () => document.getElementById('quiz_intro').innerHTML;
    const only_one_high = (level) => ({
      click_freq: level, click_time: 10, click_nyquist_angle: 10, click_system: 10, click_wrong: 10,
    });

    test('without a nickname the heading is just "Time\'s up!"', () => {
      reset_state({ quiz_nof_correct: 1, quiz_nof_done: 1, quiz_nof_tries: 1, client_nick: '' });
      window.quiz_time_is_up();
      expect(intro()).toContain("<h2>Time's up!</h2>");
      reset_state({ quiz_nof_correct: 1, quiz_nof_done: 1, quiz_nof_tries: 1, client_nick: 'Zed' });
      window.quiz_time_is_up();
      expect(intro()).toContain("<h2>Zed, Time's up!</h2>");
    });

    test('"really good" needs a top difficulty above 80: exactly 80 is only "good"', () => {
      reset_state({ quiz_nof_correct: 1, quiz_nof_done: 1, quiz_nof_tries: 1, quiz_difficulties: only_one_high(80) });
      window.quiz_time_is_up();
      expect(intro()).toContain("You're good at reading log scale diagrams, but you could focus on");
      expect(intro()).not.toContain('really');
      reset_state({ quiz_nof_correct: 1, quiz_nof_done: 1, quiz_nof_tries: 1, quiz_difficulties: only_one_high(80.5) });
      window.quiz_time_is_up();
      expect(intro()).toContain("You're really good at reading log scale diagrams");
    });

    test('correct answers but no clicks: the result is logged without an accuracy figure', () => {
      reset_state({
        quiz_nof_correct: 3, quiz_nof_done: 3, quiz_nof_tries: 0, quiz_longest_streak: 3, quiz_difficulty: 60,
        quiz_difficulties: only_one_high(60),
      });
      window.quiz_time_is_up();
      expect(intro()).toContain('You answered 3 questions in 0 clicks.<br>');
      const logged = window.add_event.mock.calls[0][0];
      expect(logged).toContain('nof_questions=3,nof_clicks=0,');
      expect(logged).not.toContain('accuracy');
    });

    test('a failed POST of a competing result only logs the error', () => {
      reset_state({ quiz_nof_correct: 1, quiz_nof_done: 1, quiz_nof_tries: 1, quiz_compete: true });
      window.quiz_time_is_up();
      const [post] = FakeXHR.instances;
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      post.listeners.error({ type: 'error' });
      expect(log).toHaveBeenNthCalledWith(1, 'Error');
      expect(log).toHaveBeenNthCalledWith(2, { type: 'error' });
      log.mockRestore();
    });
  });

  describe('quiz_correct: the longest streak', () => {
    beforeEach(() => spy_on(['next_quiz', 'add_event', 'play_jingle']));

    test('is raised only when the current streak passes it', () => {
      reset_state({ quiz_current_streak: 1, quiz_longest_streak: 5 });
      window.quiz_correct(); // streak 2
      expect(global_value('quiz_longest_streak')).toBe(5);
      set_globals({ quiz_current_streak: 4 });
      window.quiz_correct(); // streak 5: equal, not larger
      expect(global_value('quiz_current_streak')).toBe(5);
      expect(global_value('quiz_longest_streak')).toBe(5);
      window.quiz_correct(); // streak 6
      expect(global_value('quiz_longest_streak')).toBe(6);
    });
  });

  describe('quiz_clicked: a click that matches no case of the question type gives no verdict', () => {
    beforeEach(() => spy_on(['quiz_correct', 'quiz_incorrect', 'quiz_perhaps', 'update_quiz', 'add_event']));

    test.each([
      ['click_freq', { quiz_freq: 10 }],
      ['click_time', { quiz_time_to_click: 3 }],
      ['click_nyquist_angle', { quiz_nyquist_angle_to_click: -90 }],
      ['click_system', { quiz_system_to_click: 1 }],
    ])('%s: unknown place', (current_quiz, state) => {
      set_globals({ current_quiz, ...state });
      window.quiz_clicked({ where: 'somewhere else', graph_no: 0, frequency: 10, time: 3, phase: -90 });
      expect(window.quiz_correct).not.toHaveBeenCalled();
      expect(window.quiz_incorrect).not.toHaveBeenCalled();
      expect(window.quiz_perhaps).not.toHaveBeenCalled();
      expect(window.update_quiz).toHaveBeenCalledTimes(1); // the click is still logged and the quiz refreshed
    });
  });
});

// ---------------------------------------------------------------------------
// quiz.js
// ---------------------------------------------------------------------------
describe('quiz.js', () => {
  const p = () => ({ k: 1, t: 2, z: 0.5, w: 3 });

  describe('perturb_wrong_bode_phase changes t and w, in a random direction each', () => {
    test('draw below 0.5: t multiplied by 18 + 14 r, w divided by 10 + 14 r', () => {
      const parameters = p();
      script_random(0.1, 0.5, 0.1, 0.5);
      window.perturb_wrong_bode_phase(parameters);
      expect(parameters).toEqual({ k: 1, t: 2 * 25, z: 0.5, w: 3 / 17 });
    });

    test('draw of 0.5 or more: t divided, w multiplied', () => {
      const parameters = p();
      script_random(0.9, 0.5, 0.9, 0.5);
      window.perturb_wrong_bode_phase(parameters);
      expect(parameters).toEqual({ k: 1, t: 2 / 25, z: 0.5, w: 3 * 17 });
    });

    test('the direction threshold is 0.5, exclusive', () => {
      let parameters = p();
      script_random(0.4999, 0, 0.4999, 0);
      window.perturb_wrong_bode_phase(parameters);
      expect(parameters.t).toBe(2 * 18);
      expect(parameters.w).toBe(3 / 10);
      parameters = p();
      script_random(0.5, 0, 0.5, 0);
      window.perturb_wrong_bode_phase(parameters);
      expect(parameters.t).toBe(2 / 18);
      expect(parameters.w).toBe(3 * 10);
    });
  });

  describe('perturb_wrong_step_response changes k, w and z', () => {
    test('level below 50, draws below 0.5: k x (8 + 14 r), w and z divided by 10 + 14 r', () => {
      const parameters = p();
      script_random(0.1, 0.5, 0.1, 0.5, 0.1, 0.5);
      window.perturb_wrong_step_response(parameters, 49);
      expect(parameters).toEqual({ k: 15, t: 2, z: 0.5 / 17, w: 3 / 17 });
    });

    test('level below 50, draws of 0.5 or more: k divided, w and z multiplied', () => {
      const parameters = p();
      script_random(0.9, 0.5, 0.9, 0.5, 0.9, 0.5);
      window.perturb_wrong_step_response(parameters, 49);
      expect(parameters).toEqual({ k: 1 / 15, t: 2, z: 0.5 * 17, w: 3 * 17 });
    });

    test('from level 50 the gain factor is 2 + 40 r instead of 8 + 14 r', () => {
      let parameters = p();
      script_random(0.1, 0.5, 0.9, 0.5, 0.9, 0.5);
      window.perturb_wrong_step_response(parameters, 50);
      expect(parameters.k).toBe(22);
      parameters = p();
      script_random(0.9, 0.5, 0.9, 0.5, 0.9, 0.5);
      window.perturb_wrong_step_response(parameters, 50);
      expect(parameters.k).toBe(1 / 22);
    });

    test('the sign of k may flip only above level 80, and then costs one more random draw', () => {
      let parameters = p();
      script_random(0.1, 0.5, 0.1, 0.1, 0.5, 0.1, 0.5);
      window.perturb_wrong_step_response(parameters, 81);
      expect(parameters.k).toBe(-22); // flipped
      expect(random_spy).toHaveBeenCalledTimes(7);
      random_spy.mockRestore();

      parameters = p();
      script_random(0.1, 0.5, 0.5, 0.1, 0.5, 0.1, 0.5); // flip draw of exactly 0.5: no flip
      window.perturb_wrong_step_response(parameters, 81);
      expect(parameters.k).toBe(22);
      expect(random_spy).toHaveBeenCalledTimes(7);
      random_spy.mockRestore();

      parameters = p();
      script_random(0.1, 0.5, 0.1, 0.5, 0.1, 0.5); // level 80: no flip draw at all
      window.perturb_wrong_step_response(parameters, 80);
      expect(parameters.k).toBe(22);
      expect(random_spy).toHaveBeenCalledTimes(6);
    });
  });

  describe('every direction draw is compared with 0.5, exclusive', () => {
    // With one constant draw r for everything, direction and size are tied together: a factor
    // is base + range * r. r = 0.4999 takes every "multiply" branch (k) and "divide" branch (w, z);
    // r = 0.5 takes the opposite ones. `w_changes` is false for perturb_wrong_nyquist.
    test.each([
      ['perturb_wrong_step_response, level 49', (q) => window.perturb_wrong_step_response(q, 49), { k: [8, 14], w_changes: true }],
      ['perturb_wrong_step_response, level 50', (q) => window.perturb_wrong_step_response(q, 50), { k: [2, 40], w_changes: true }],
      ['perturb_wrong_nyquist', (q) => window.perturb_wrong_nyquist(q), { k: [3, 6], w_changes: false }],
    ])('%s', (_, perturb, { k: [k_base, k_range], w_changes }) => {
      const factor = (base, range, r) => base + range * r;
      const below = p();
      constant_random(0.4999);
      perturb(below);
      random_spy.mockRestore();
      const at = p();
      constant_random(0.5);
      perturb(at);
      expect(below.k).toBeCloseTo(factor(k_base, k_range, 0.4999), 12);
      expect(at.k).toBeCloseTo(1 / factor(k_base, k_range, 0.5), 12);
      expect(below.z).toBeCloseTo(0.5 / factor(10, 14, 0.4999), 12);
      expect(at.z).toBeCloseTo(0.5 * factor(10, 14, 0.5), 12);
      expect(below.w).toBeCloseTo(w_changes ? 3 / factor(10, 14, 0.4999) : 3, 12);
      expect(at.w).toBeCloseTo(w_changes ? 3 * factor(10, 14, 0.5) : 3, 12);
    });
  });

  describe('perturb_wrong_nyquist changes k and z', () => {
    test('draws below 0.5: k x (3 + 6 r), z divided by 10 + 14 r', () => {
      const parameters = p();
      script_random(0.1, 0.5, 0.1, 0.5);
      window.perturb_wrong_nyquist(parameters);
      expect(parameters).toEqual({ k: 6, t: 2, z: 0.5 / 17, w: 3 });
    });

    test('draws of 0.5 or more: k divided, z multiplied', () => {
      const parameters = p();
      script_random(0.5, 0.5, 0.5, 0.5);
      window.perturb_wrong_nyquist(parameters);
      expect(parameters).toEqual({ k: 1 / 6, t: 2, z: 0.5 * 17, w: 3 });
    });
  });

  describe('click_system above level 95: the Dirac impulse input is picked with probability 0.33', () => {
    const QUESTIONS = ['click_freq', 'click_time', 'click_nyquist_angle', 'click_system', 'click_wrong'];

    beforeEach(() => spy_on(['removeAllGraphs', 'addNewGraph', 'add_event', 'redraw']));
    afterEach(() => restore_spies());

    function ask_click_system(level, random_value) {
      const difficulties = {};
      const enabled = {};
      const nof_done = {};
      for (const question of QUESTIONS) {
        difficulties[question] = 50;
        enabled[question] = question === 'click_system';
        nof_done[question] = 0;
      }
      difficulties.click_system = level;
      set_globals({
        quiz_difficulties: difficulties, enabled_quiz_types: enabled, quiz_questions_nof_done: nof_done,
        current_quiz: 'none', quiz_no: 0, quiz_freq: 12345, quiz_time_to_click: 12345,
        quiz_nyquist_angle_to_click: 12345, quiz_system_to_click: 12345, quiz_click_wrong: 12345,
        improvement_enabled: false, light_mode: 'dark', input_formula: '1/s',
      });
      document.getElementById('input-formula').value = '1/s';
      constant_random(random_value);
      window.next_quiz();
      random_spy.mockRestore();
    }

    test('a draw of 0.33 or more keeps the step input', () => {
      ask_click_system(96, 0.33);
      expect(global_value('input_formula')).toBe('1/s');
      expect(document.getElementById('input-formula').value).toBe('1/s');
      ask_click_system(96, 0.5);
      expect(global_value('input_formula')).toBe('1/s');
    });

    test('a draw below 0.33 switches to the impulse, but not at level 95 or lower', () => {
      ask_click_system(96, 0.3299);
      expect(global_value('input_formula')).toBe('1');
      expect(document.getElementById('input-formula').value).toBe('1');
      ask_click_system(95, 0.1);
      expect(global_value('input_formula')).toBe('1/s');
    });
  });
});

// ---------------------------------------------------------------------------
// dialogs_scripts.js
// ---------------------------------------------------------------------------
describe('dialogs_scripts.js', () => {
  beforeEach(() => {
    spy_on(['add_event']);
    set_globals({ improvement_enabled: false });
    const variable_position = global_value('variable_position');
    global_value('range_slider_alphabet').forEach((name, i) => { variable_position[name] = i; });
    const variables = global_value('range_slider_variables');
    Object.entries({ k_1: 2, T_1: 1.5, k_3: 2.5, w: 3, z: 0.3 })
      .forEach(([name, value]) => { variables[variable_position[name]] = value; });
    window.eval('bode_graphs.length = 0');
  });
  afterEach(() => {
    restore_spies();
    window.eval('bode_graphs.length = 0');
  });

  test('get_julia_script finds its graph among several by id', () => {
    const preset = (name) => JSON.stringify(global_value(name).formula);
    window.eval(`bode_graphs.push(new bode_graph(3, ${preset('GRAPH_TWO_COMPLEX_POLES')}))`);
    window.eval(`bode_graphs.push(new bode_graph(7, ${preset('GRAPH_ONE_REAL_POLE')}))`);
    const script = window.get_julia_script(7).split('<br>');
    expect(script).toContain('k_1 = 2');
    expect(script).toContain('T_1 = 1.5');
    expect(script).not.toContain('k_3 = 2.5');
    expect(window.get_julia_script(3).split('<br>')).toContain('k_3 = 2.5');
  });
});

// ---------------------------------------------------------------------------
// bode_graph.js
// ---------------------------------------------------------------------------
describe('bode_graph.js', () => {
  const GEOMETRY = {
    graph_bode_mag_width: 300, graph_bode_mag_height: 200,
    graph_bode_phase_width: 300, graph_bode_phase_height: 200,
    graph_step_response_width: 300, graph_step_response_height: 200,
    graph_nyquist_width: 250, graph_nyquist_height: 200, graph_nyquist_x: 400, graph_nyquist_y: 300,
    pole_zero_width: 96, pole_zero_height: 96,
    min_10power: -2, x_case_gain: 5, y_case_gain: 6, gain_upper_bound: 60,
    phase_lower_bound: -180, phase_upper_bound: 0,
    min_y_timerep: -1, max_y_timerep: 3, max_x_timerep: 10, precision: 4,
    min_nyquist_x: -2, max_nyquist_x: 2, min_nyquist_y: -2, max_nyquist_y: 2,
    line_stroke_weight: 2,
    text_color: '#text', line_color: '#grid',
    improvement_enabled: false,
  };
  const SENTINEL = 18012001; // an unset slider
  const SLIDERS = { k_2: 3, T_2: 1, T_3: 0.4, k_3: 2, w: 3, z: 0.3, K: 1.2, T_i: 2, T_d: 0.3 };
  const NOF_SAMPLES = Math.ceil(GEOMETRY.graph_step_response_width / GEOMETRY.precision);
  const RECORDED = ['beginShape', 'ellipse', 'endShape', 'fill', 'line', 'noFill', 'noStroke', 'pop', 'push',
    'stroke', 'strokeWeight', 'text', 'textAlign', 'textSize', 'translate', 'vertex'];
  const originals = {};
  let drawn;

  const calls = (name) => drawn.filter((c) => c.name === name).map((c) => c.args);
  const preset = (name) => global_value(name).formula;

  function set_sliders(overrides = {}) {
    const variable_position = global_value('variable_position');
    global_value('range_slider_alphabet').forEach((name, i) => { variable_position[name] = i; });
    const variables = global_value('range_slider_variables');
    for (let i = 1; i < variables.length; i++) variables[i] = SENTINEL;
    for (const [name, value] of Object.entries({ ...SLIDERS, ...overrides })) {
      variables[variable_position[name]] = value;
    }
  }

  // A graph with its Bode curves computed (and, with an input, its time response).
  function analysed(formula, input_formula = null) {
    const graph = window.eval(`new bode_graph(1, ${JSON.stringify(formula)})`);
    graph.get_complex_p5();
    if (input_formula !== null) {
      set_globals({ input_formula });
      graph.get_timevalues_p5();
    }
    return graph;
  }

  beforeEach(() => {
    for (const name of [...RECORDED, 'map']) originals[name] = window[name];
    drawn = [];
    for (const name of RECORDED) window[name] = (...args) => { drawn.push({ name, args }); };
    window.map = (value, start1, stop1, start2, stop2) =>
      start2 + ((value - start1) * (stop2 - start2)) / (stop1 - start1);
    set_globals(GEOMETRY);
    set_sliders();
  });
  afterEach(() => {
    for (const name of Object.keys(originals)) window[name] = originals[name];
  });

  describe('time responses to an input other than a step or an impulse', () => {
    // A ramp, 1/s^2. The presets only have closed forms for the step and the impulse, so the
    // exact solver in transfer_math.js answers; the expected values below are the Laplace
    // inverse of 1/s^2 times the preset.
    const sample_time = (index) => (index * GEOMETRY.precision * GEOMETRY.max_x_timerep) / GEOMETRY.graph_step_response_width;

    test('two real poles: the ramp response is t - (T_2 + T_3) + (T_2^2 e^(-t/T_2) - T_3^2 e^(-t/T_3))/(T_2 - T_3)', () => {
      const { k_2, T_2, T_3 } = SLIDERS;
      const graph = analysed(preset('GRAPH_TWO_REAL_POLES'), '1/s^2');
      expect(graph.bode_timerep_array).toHaveLength(NOF_SAMPLES);
      for (const index of [0, 1, 10, 40, NOF_SAMPLES - 1]) {
        const t = sample_time(index);
        const expected = k_2 * (t - (T_2 + T_3)
          + (T_2 * T_2 * Math.exp(-t / T_2) - T_3 * T_3 * Math.exp(-t / T_3)) / (T_2 - T_3));
        expect(graph.bode_timerep_array[index]).toBeCloseTo(expected, 8);
      }
    });

    test('two complex poles: the ramp response of k w^2 / (s^2 + 2 z w s + w^2)', () => {
      const { k_3, w, z } = SLIDERS;
      const sigma = z * w;
      const damped = w * Math.sqrt(1 - z * z);
      const graph = analysed(preset('GRAPH_TWO_COMPLEX_POLES'), '1/s^2');
      expect(graph.bode_timerep_array).toHaveLength(NOF_SAMPLES);
      for (const index of [0, 1, 10, 40, NOF_SAMPLES - 1]) {
        const t = sample_time(index);
        const expected = k_3 * (t - (2 * z) / w + Math.exp(-sigma * t)
          * (((2 * z) / w) * Math.cos(damped * t) + ((2 * z * z - 1) / (w * Math.sqrt(1 - z * z))) * Math.sin(damped * t)));
        expect(graph.bode_timerep_array[index]).toBeCloseTo(expected, 8);
      }
    });
  });

  describe('pole-zero maps', () => {
    // The grid and frame draw 10 lines before the first pole or zero. A pole is two lines.
    const GRID_LINES = 10;
    const centre_x = (line) => (line[0] + line[2]) / 2;
    const screen_x = (re) => 48 + (re + 1) * 24; // pole_zero_width = 96
    const draw_map = (graph) => {
      drawn.length = 0;
      graph.draw_pole_zero(true);
    };

    test('two real poles of a negative-frequency system are clamped to +1.2 on the map', () => {
      // z > 1 gives real poles -z*w -/+ w*sqrt(z^2 - 1); a negative w puts both on the right.
      // z = 1.5, w = -10: 10*(1.5 - sqrt(1.25)) = 3.82 and 10*(1.5 + sqrt(1.25)) = 26.2.
      set_sliders({ z: 1.5, w: -10 });
      draw_map(analysed(preset('GRAPH_TWO_COMPLEX_POLES')));
      const poles = calls('line').slice(GRID_LINES);
      expect(poles).toHaveLength(4); // two X, two lines each
      expect(centre_x(poles[0])).toBeCloseTo(screen_x(1.2), 9);
      expect(centre_x(poles[2])).toBeCloseTo(screen_x(1.2), 9);
    });

    test('the same poles are not clamped when they are inside the map', () => {
      // w = -1: 1.5 - 1.118 = 0.382 and 1.5 + 1.118 = 2.618, clamped to 1.2
      set_sliders({ z: 1.5, w: -1 });
      draw_map(analysed(preset('GRAPH_TWO_COMPLEX_POLES')));
      const poles = calls('line').slice(GRID_LINES);
      expect(centre_x(poles[0])).toBeCloseTo(screen_x(1.5 - Math.sqrt(1.25)), 9);
      expect(centre_x(poles[2])).toBeCloseTo(screen_x(1.2), 9);
    });

    test('PID: the zero at -1/T_i is clamped to -3.2 when T_i is small', () => {
      draw_map(analysed(preset('GRAPH_PID')));
      expect(calls('ellipse')[0][0]).toBeCloseTo(screen_x(-1 / 2), 9); // T_i = 2
      set_sliders({ T_i: 0.3125 }); // 1/T_i = 3.2: exactly on the limit
      draw_map(analysed(preset('GRAPH_PID')));
      expect(calls('ellipse')[0][0]).toBeCloseTo(screen_x(-3.2), 9);
      set_sliders({ T_i: 0.1 }); // 1/T_i = 10
      draw_map(analysed(preset('GRAPH_PID')));
      expect(calls('ellipse')[0][0]).toBeCloseTo(screen_x(-3.2), 9);
    });
  });
});

// ---------------------------------------------------------------------------
// hover_nyquist.js
// ---------------------------------------------------------------------------
describe('hover_nyquist.js', () => {
  // Plot geometry; the offsets are constants in the app (see tests/hover_nyquist.test.js):
  //   Bode magnitude plot (68, 368) x (30, 230); Bode phase plot (68, 368) x (310, 510),
  //   frequency axis of the Bode phase plot y in [510, 545).
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
  const RECORDED = ['arc', 'ellipse', 'fill', 'line', 'noFill', 'noStroke', 'pop', 'push', 'rect', 'stroke',
    'strokeWeight', 'text', 'textAlign', 'textSize', 'translate'];
  const SPIED = ['add_event', 'task_done', 'achievement_done', 'redraw'];
  const originals = {};
  let drawn;
  let console_log;

  const calls = (name) => drawn.filter((c) => c.name === name).map((c) => c.args);
  const texts = () => calls('text').map((args) => args[0]);
  const lines = () => calls('line');

  // Assigns a value that cannot be JSON-encoded (an array of objects holding mocks) to a top-level `let`.
  function set_live(name, value) {
    window.__live = value;
    window.eval(`${name} = window.__live`);
    delete window.__live;
  }

  // A graph as bode_graph exposes it to the hover code: a flat 0 dB gain curve (y = 130 in the
  // magnitude plot) and a flat -90 degree phase curve (y = 410 in the phase plot).
  function fake_graph(overrides = {}) {
    return {
      bode_formula: 'not a preset', graph_name: 'Graph', bode_hue: 100,
      bode_displaybool: true, bode_display_bodemag_bool: true, bode_display_bodephase_bool: true,
      bode_display_timeresponse_bool: true, bode_display_nyquist_bool: true,
      bode_gain_array: Array(400).fill(0),
      bode_phase_array: Array(400).fill(-Math.PI / 2),
      bode_timerep_array: Array(100).fill(50),
      draw_nyquist_value: jest.fn(), get_nyquist_value: jest.fn(() => [10, 20]),
      has_pole_zero_map: () => false,
      ...overrides,
    };
  }

  function move(x, y) {
    window.mouseX = x;
    window.mouseY = y;
    drawn.length = 0;
    window.mouseMoved();
  }

  beforeEach(() => {
    for (const name of [...RECORDED, ...SPIED, 'map']) originals[name] = window[name];
    drawn = [];
    for (const name of RECORDED) window[name] = (...args) => { drawn.push({ name, args }); };
    for (const name of SPIED) window[name] = jest.fn();
    window.map = (value, start1, stop1, start2, stop2, constrain = false) => {
      const mapped = start2 + ((value - start1) * (stop2 - start2)) / (stop1 - start1);
      if (!constrain) return mapped;
      return Math.min(Math.max(mapped, Math.min(start2, stop2)), Math.max(start2, stop2));
    };
    window.windowWidth = 1280;
    window.windowHeight = 800;
    window.mouseX = 0;
    window.mouseY = 0;
    set_globals({
      ...GEOMETRY, questions_enabled: false, last_hover_answer_id: '', nof_redraws_in_math_bar: 0,
      improvement_enabled: false, bode_graphs: [],
    });
    document.getElementById('hover_answer').innerHTML = '';
    console_log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    for (const name of Object.keys(originals)) window[name] = originals[name];
    console_log.mockRestore();
  });

  describe('handle_questions: the yellow line to a task answer', () => {
    const saved = {};
    function use_tasks(tasks) {
      // all_questions are emptied (their pos() needs a laid-out page) and all_tasks replaced.
      for (const [name, replacement] of [['all_questions', {}], ['all_tasks', tasks]]) {
        const target = global_value(name);
        saved[name] = { ...target };
        for (const key of Object.keys(target)) delete target[key];
        Object.assign(target, replacement);
      }
    }
    function add_task_span(id, x, y) {
      const span = document.createElement('span');
      span.id = 'task_' + id;
      span.getBoundingClientRect = () => ({ left: x - 5, top: y - 5, width: 10, height: 10 });
      document.body.appendChild(span);
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

    test('a task 499.4 pixels away gets a yellow line, 499.6 pixels (weight below 0.01) only the white one', () => {
      use_tasks({ t: { t: 'Task', a: 'hint' } });
      add_task_span('t', 499.4, 0);
      hover(0, 0);
      expect(global_value('last_hover_answer_id')).toBe('task_t'); // still offered
      expect(lines()).toHaveLength(2);
      expect(calls('stroke')[0]).toEqual(['#ffff0080']);
      expect(calls('strokeWeight')[0][0]).toBeCloseTo(10 - 499.4 / 50, 12);

      document.querySelectorAll('[id^="task_"]').forEach((element) => element.remove());
      add_task_span('t', 499.6, 0);
      set_globals({ last_hover_answer_id: '' });
      hover(0, 0);
      expect(global_value('last_hover_answer_id')).toBe('task_t');
      expect(lines()).toHaveLength(1);
      expect(calls('stroke')).toEqual([['#ffffffff']]);
    });
  });

  describe('Bode magnitude plot', () => {
    test('a curve without Nyquist display is highlighted without drawing a Nyquist value', () => {
      const plain = fake_graph({ graph_name: 'Plain', bode_display_nyquist_bool: false });
      const nyquist = fake_graph({ graph_name: 'Nyquist', bode_gain_array: Array(400).fill(-100) });
      set_live('bode_graphs', [plain, nyquist]);
      move(218, 140); // 'Plain' curve at y = 130: 10 away
      expect(texts()[0]).toBe('Plain');
      expect(plain.draw_nyquist_value).not.toHaveBeenCalled();
      expect(nyquist.draw_nyquist_value).toHaveBeenCalledWith(0.5);
    });
  });

  describe('Bode phase plot, frequency axis', () => {
    test('curves whose magnitude plot is hidden get no Nyquist value, whatever their Nyquist setting', () => {
      const shown = fake_graph();
      const no_magnitude = fake_graph({ bode_display_bodemag_bool: false });
      const hidden = fake_graph({ bode_displaybool: false });
      set_live('bode_graphs', [shown, no_magnitude, hidden]);
      move(218, 520);
      expect(texts()).toEqual(['freq=3.162rad/s']);
      expect(shown.draw_nyquist_value).toHaveBeenCalledWith(0.5);
      expect(no_magnitude.draw_nyquist_value).not.toHaveBeenCalled();
      expect(hidden.draw_nyquist_value).not.toHaveBeenCalled();
    });
  });

  describe('Bode phase plot', () => {
    // Phase 0 is drawn at y = 310 and -180 degrees at y = 510: -45 degrees at 360, -90 at 410, -135 at 460.
    const curve_at = (name, degrees) =>
      fake_graph({ graph_name: name, bode_phase_array: Array(400).fill((degrees * Math.PI) / 180) });

    test('of two curves within 70 pixels the closer one is highlighted, whichever is listed first', () => {
      set_live('bode_graphs', [curve_at('far', -45), curve_at('near', -90)]);
      move(218, 420); // 'far' is 60 away, 'near' 10
      expect(texts()[0]).toBe('near');
      set_live('bode_graphs', [curve_at('near', -90), curve_at('far', -45)]);
      move(218, 420);
      expect(texts()[0]).toBe('near');
    });

    test('at equal distance the first curve wins', () => {
      set_live('bode_graphs', [curve_at('first', -45), curve_at('second', -135)]);
      move(218, 410); // both 50 away
      expect(texts()[0]).toBe('first');
      set_live('bode_graphs', [curve_at('second', -135), curve_at('first', -45)]);
      move(218, 410);
      expect(texts()[0]).toBe('second');
    });

    test('not close to any curve: the horizontal phase line follows the mouse only inside the plot bounds', () => {
      const horizontal_phase_lines = () => lines().filter(([x1, , x2]) => x1 === 68 && x2 === 368);
      set_globals({ phase_lower_bound: -90, phase_upper_bound: 0 }); // the plot now covers 0..-90 degrees
      move(218, 350); // 0 - 180 * 0.2 = -36 degrees: inside
      expect(texts()).toEqual(['freq=3.162rad/s', 'phase=-36°']);
      expect(horizontal_phase_lines()).toHaveLength(1);
      move(218, 430); // 0 - 180 * 0.6 = -108 degrees: below the lower bound
      expect(texts()).toEqual(['freq=3.162rad/s', 'phase=-108°']);
      expect(horizontal_phase_lines()).toEqual([]);
      move(218, 410); // exactly -90 degrees: the bound itself is inside
      expect(texts()).toEqual(['freq=3.162rad/s', 'phase=-90°']);
      expect(horizontal_phase_lines()).toHaveLength(1);
    });
  });
});
