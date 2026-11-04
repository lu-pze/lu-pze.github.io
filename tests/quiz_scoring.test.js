/** @jest-environment jsdom */
// Characterization tests for src/quiz_scoring.js: answer routing (quiz_clicked), scoring state
// (quiz_correct / quiz_incorrect / timeline), the highscore parser (read_highscores) and the
// contract between the event string that quiz_time_is_up POSTs and the regexes that
// read_highscores uses to parse it. They record current behaviour, quirks included.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const NOW = new Date('2026-11-03T12:00:00');

// Functions that quiz_clicked & co. call by global name; tests swap them for spies.
const SPYABLE = [
  'quiz_correct', 'quiz_incorrect', 'quiz_perhaps', 'quiz_clicked', 'update_quiz', 'next_quiz',
  'add_event', 'play_jingle', 'read_highscores', 'show_quiz_wrong_text', 'removeAllGraphs',
];
const originals = {};

class FakeXHR {
  constructor() {
    this.listeners = {};
    this.opened = null;
    this.sent = null;
    FakeXHR.instances.push(this);
  }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  open(method, url) { this.opened = { method, url }; }
  setRequestHeader() {}
  send(body) { this.sent = body; }
  respond(response) { this.listeners.load({ target: { response } }); }
}
FakeXHR.instances = [];

function spy_on(names) {
  for (const name of names) window[name] = jest.fn();
}

function reset_state(overrides = {}) {
  const difficulties = {};
  const streaks = {};
  for (const question of global_value('quiz_questions')) {
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
    ...overrides,
  });
}

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
});

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  FakeXHR.instances = [];
  window.XMLHttpRequest = FakeXHR;
  reset_state();
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// quiz_clicked: which verdict does each (question type, clicked place) give?
// ---------------------------------------------------------------------------
describe('quiz_clicked routing', () => {
  beforeEach(() => spy_on(['quiz_correct', 'quiz_incorrect', 'quiz_perhaps', 'update_quiz', 'add_event']));

  // Runs one click and returns {verdict, message}. verdict is 'none' when no handler fired.
  function click(current_quiz, state, all) {
    window.quiz_correct.mockClear();
    window.quiz_incorrect.mockClear();
    window.quiz_perhaps.mockClear();
    set_globals({ current_quiz, ...state });
    window.quiz_clicked(all);
    const calls = {
      correct: window.quiz_correct.mock.calls,
      incorrect: window.quiz_incorrect.mock.calls,
      perhaps: window.quiz_perhaps.mock.calls,
    };
    const fired = Object.keys(calls).filter((verdict) => calls[verdict].length > 0);
    expect(fired.length).toBeLessThanOrEqual(1);
    if (fired.length === 0) return { verdict: 'none', message: undefined };
    return { verdict: fired[0], message: calls[fired[0]][0][0] };
  }

  test('always logs the click and refreshes the quiz, whatever the verdict', () => {
    click('none', {}, { where: 'Bmag', graph_no: 1 });
    expect(window.add_event).toHaveBeenCalledWith(expect.stringMatching(/^quiz_clicked:where=Bmag,graph_no=1,/));
    expect(window.update_quiz).toHaveBeenCalledTimes(1);
  });

  test('no verdict when no quiz question is active', () => {
    expect(click('none', {}, { where: 'Bmag', frequency: 1 }).verdict).toBe('none');
  });

  describe('click_freq', () => {
    const state = (quiz_freq) => ({ quiz_freq });
    test.each([
      ['Bmag', 10, 'correct'], ['Bphase', 10, 'correct'], ['Bmag_xaxis', 10, 'correct'],
      ['Bphase_xaxis', 6.667, 'correct'], // lower edge of the 0.6667 * f tolerance
      ['Bmag', 14, 'correct'], // upper edge (1.4 * f)
      ['Bmag', 6.6, 'incorrect'], ['Bphase', 14.01, 'incorrect'],
    ])('target 10 rad/s: click on %s at %s -> %s', (where, frequency, verdict) => {
      expect(click('click_freq', state(10), { where, frequency }).verdict).toBe(verdict);
    });

    test('too-far-off message quotes both frequencies', () => {
      const { message } = click('click_freq', state(10), { where: 'Bmag', frequency: 20 });
      expect(message).toBe('No. You did click the correct graph, but your 20.00 is too far off the correct 10.00.');
    });

    test('clicking a y axis is "not a frequency"', () => {
      expect(click('click_freq', state(10), { where: 'Bmag_yaxis', magnitude: 3 }).message)
        .toBe('No, the Bode magnitude is not a frequency. Try again!');
      expect(click('click_freq', state(10), { where: 'Bphase_yaxis', phase: -45 }).message)
        .toBe('No, the Bode phase is not a frequency. Try again!');
    });

    test('quiz_freq 0 accepts any Bode click', () => {
      for (const where of ['Bmag', 'Bmag_xaxis', 'Bmag_yaxis', 'Bphase', 'Bphase_xaxis', 'Bphase_yaxis']) {
        expect(click('click_freq', state(0), { where, frequency: 123 }).verdict).toBe('correct');
      }
    });

    test('quiz_freq -1 asks for the magnitude plot, -2 for the phase plot', () => {
      expect(click('click_freq', state(-1), { where: 'Bmag_yaxis' }).verdict).toBe('correct');
      expect(click('click_freq', state(-1), { where: 'Bphase' })).toEqual(
        { verdict: 'incorrect', message: 'No. The Bode <i>magnitude</i> plot is above this one.' });
      expect(click('click_freq', state(-2), { where: 'Bphase_xaxis' }).verdict).toBe('correct');
      expect(click('click_freq', state(-2), { where: 'Bmag' })).toEqual(
        { verdict: 'incorrect', message: 'No. The Bode <i>phase</i> plot is below this one.' });
    });

    test.each([['Nyq', 'incorrect'], ['time', 'incorrect'], ['time_xaxis', 'incorrect'], ['pz', 'perhaps']])(
      'click on %s -> %s', (where, verdict) => {
        expect(click('click_freq', state(10), { where }).verdict).toBe(verdict);
      });
  });

  describe('click_time', () => {
    const state = (quiz_time_to_click) => ({ quiz_time_to_click });
    test.each([
      ['time', 2.5, 'correct'], ['time_xaxis', 3.5, 'correct'], ['time', 3, 'correct'],
      ['time', 2.49, 'incorrect'], ['time_xaxis', 3.51, 'incorrect'],
    ])('target 3 s: click on %s at t=%s -> %s', (where, time, verdict) => {
      expect(click('click_time', state(3), { where, time }).verdict).toBe(verdict);
    });

    test('too-far-away message quotes both times', () => {
      expect(click('click_time', state(3), { where: 'time', time: 7.25 }).message)
        .toBe('No. You did click the right graph, but at the wrong position. Your 7.3 is too far away from the desired 3.0.');
    });

    test('target -1 accepts any click on a time axis', () => {
      expect(click('click_time', state(-1), { where: 'time', time: 99 }).verdict).toBe('correct');
      expect(click('click_time', state(-1), { where: 'time_xaxis', time: 99 }).verdict).toBe('correct');
    });

    test.each(['Bmag', 'Bphase', 'Bmag_xaxis', 'Bphase_xaxis', 'Bmag_yaxis', 'Bphase_yaxis', 'Nyq'])(
      'click on %s is incorrect', (where) => {
        expect(click('click_time', state(3), { where }).verdict).toBe('incorrect');
      });

    test('pole-zero map is only "perhaps", with a message that depends on the target', () => {
      expect(click('click_time', state(-1), { where: 'pz' })).toEqual(
        { verdict: 'perhaps', message: 'No. The pole-zero map is not the place to find time.' });
      expect(click('click_time', state(3), { where: 'pz' })).toEqual(
        { verdict: 'perhaps', message: 'No. The pole-zero map is not the place to find 3.0 seconds.' });
    });
  });

  describe('click_nyquist_angle', () => {
    const state = (quiz_nyquist_angle_to_click) => ({ quiz_nyquist_angle_to_click });
    test.each([
      [-90, -90, 'correct'], [-90, -105, 'correct'], [-90, -75, 'correct'],
      [-90, -105.1, 'incorrect'], [-90, -74.9, 'incorrect'],
      [80, -280, 'correct'], // 80 deg and -280 deg are the same direction: difference is wrapped
      [1000, -123, 'correct'], // 1000 means "any angle"
    ])('target %s deg, click at %s deg -> %s', (target, phase, verdict) => {
      expect(click('click_nyquist_angle', state(target), { where: 'Nyq', phase }).verdict).toBe(verdict);
    });

    test('message prints clicked angles below -270 shifted up by 360', () => {
      expect(click('click_nyquist_angle', state(-90), { where: 'Nyq', phase: -300 }).message)
        .toBe('No. You did click the right graph, but at the wrong angle. Your 60° is too far away from the desired -90°.');
      expect(click('click_nyquist_angle', state(-90), { where: 'Nyq', phase: -200 }).message)
        .toBe('No. You did click the right graph, but at the wrong angle. Your -200° is too far away from the desired -90°.');
    });

    test.each([
      ['time', 'incorrect'], ['Bmag', 'incorrect'], ['Bmag_xaxis', 'incorrect'], ['Bmag_yaxis', 'incorrect'],
      ['Bphase', 'perhaps'], ['Bphase_xaxis', 'incorrect'], ['Bphase_yaxis', 'perhaps'], ['pz', 'incorrect'],
    ])('click on %s -> %s', (where, verdict) => {
      expect(click('click_nyquist_angle', state(-90), { where }).verdict).toBe(verdict);
    });
  });

  describe('click_system', () => {
    // graph_no 0 = first order line, 1 = second order, 2 = fourth order
    test.each([
      [1, 0, 'correct', null], [1, 1, 'incorrect', 'second-order'], [1, 2, 'incorrect', 'fourth-order'],
      [2, 0, 'incorrect', 'first-order'], [2, 1, 'correct', null], [2, 2, 'incorrect', 'fourth-order'],
      [4, 0, 'incorrect', 'first-order'], [4, 1, 'incorrect', 'second-order'], [4, 2, 'correct', null],
    ])('target order %s, click on graph %s -> %s', (target, graph_no, verdict, named) => {
      const result = click('click_system', { quiz_system_to_click: target }, { where: 'Bmag', graph_no });
      expect(result.verdict).toBe(verdict);
      if (named) expect(result.message).toContain(named);
    });

    test.each(['time', 'Bmag', 'Bphase', 'pz'])('click on %s counts as a click on a system', (where) => {
      expect(click('click_system', { quiz_system_to_click: 1 }, { where, graph_no: 0 }).verdict).toBe('correct');
    });

    test('graph_no -1 (missed the line) is "perhaps"; Nyquist is "perhaps"; axes give no verdict', () => {
      const state = { quiz_system_to_click: 1 };
      expect(click('click_system', state, { where: 'Bmag', graph_no: -1 }).verdict).toBe('perhaps');
      expect(click('click_system', state, { where: 'Nyq', graph_no: 0 }).verdict).toBe('perhaps');
      expect(click('click_system', state, { where: 'time_xaxis', graph_no: 0 }).verdict).toBe('none');
    });
  });

  describe('click_wrong', () => {
    // quiz_click_wrong: 0 = Bode magnitude, 1 = Bode phase, 2 = step response, 3 = Nyquist
    const places = [['Bmag', 0], ['Bphase', 1], ['time', 2], ['Nyq', 3]];
    test.each(places)('clicking %s is correct only when it is the odd-one-out (%s)', (where, index) => {
      for (let odd = 0; odd < 4; odd++) {
        const verdict = click('click_wrong', { quiz_click_wrong: odd }, { where }).verdict;
        expect(verdict).toBe(odd === index ? 'correct' : 'incorrect');
      }
    });

    test('other places (pole-zero map, axes) give no verdict', () => {
      for (const where of ['pz', 'Bmag_xaxis', 'time_xaxis']) {
        expect(click('click_wrong', { quiz_click_wrong: 0 }, { where }).verdict).toBe('none');
      }
    });
  });
});

describe('quiz_clicked_* wrappers', () => {
  beforeEach(() => spy_on(['quiz_clicked']));
  const cases = [
    ['quiz_clicked_pole_zero', [2, -1, 3, 'T'], { where: 'pz', graph_no: 2, real: -1, imaginary: 3, time_variable: 'T' }],
    ['quiz_clicked_time_response', [1, 4, 0.5, 'T'], { where: 'time', graph_no: 1, time: 4, amplitude: 0.5, time_variable: 'T' }],
    ['quiz_clicked_time_response_xaxis', [4], { where: 'time_xaxis', time: 4 }],
    ['quiz_clicked_bode_mag', [0, 10, -3, 'T'], { where: 'Bmag', graph_no: 0, frequency: 10, magnitude: -3, time_variable: 'T' }],
    ['quiz_clicked_bode_mag_xaxis', [10], { where: 'Bmag_xaxis', frequency: 10 }],
    ['quiz_clicked_bode_mag_yaxis', [-3], { where: 'Bmag_yaxis', magnitude: -3 }],
    ['quiz_clicked_bode_phase', [0, 10, -45, 'T'], { where: 'Bphase', graph_no: 0, frequency: 10, phase: -45, time_variable: 'T' }],
    ['quiz_clicked_bode_phase_xaxis', [10], { where: 'Bphase_xaxis', frequency: 10 }],
    ['quiz_clicked_bode_phase_yaxis', [-45], { where: 'Bphase_yaxis', phase: -45 }],
    ['quiz_clicked_nyquist', [2, -90], { where: 'Nyq', magnitude: 2, phase: -90 }],
  ];
  test.each(cases)('%s forwards a tagged click', (name, args, expected) => {
    window[name](...args);
    expect(window.quiz_clicked).toHaveBeenCalledWith(expected);
  });
});

// ---------------------------------------------------------------------------
// Scoring state
// ---------------------------------------------------------------------------
describe('quiz_correct', () => {
  beforeEach(() => spy_on(['next_quiz', 'add_event', 'play_jingle']));

  test('counts the answer, extends the streak and schedules the next question after 50 ms', () => {
    window.quiz_correct();
    window.quiz_correct();
    expect(global_value('quiz_nof_done')).toBe(2);
    expect(global_value('quiz_nof_correct')).toBe(2);
    expect(global_value('quiz_nof_tries')).toBe(2);
    expect(global_value('quiz_current_streak')).toBe(2);
    expect(global_value('quiz_longest_streak')).toBe(2);
    expect(window.next_quiz).not.toHaveBeenCalled();
    jest.advanceTimersByTime(49);
    expect(window.next_quiz).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(window.next_quiz).toHaveBeenCalledTimes(2);
  });

  test('adaptive difficulty rises by 7.5 + 5 * per-question streak', () => {
    window.quiz_correct(); // 50 + 7.5 + 5*0
    expect(global_value('quiz_difficulties').click_freq).toBe(57.5);
    window.quiz_correct(); // + 7.5 + 5*1
    expect(global_value('quiz_difficulties').click_freq).toBe(70);
    expect(global_value('quiz_streaks').click_freq).toBe(2);
    expect(global_value('quiz_difficulties').click_time).toBe(50); // other question types untouched
  });

  test('difficulty is capped at 100', () => {
    set_globals({ quiz_difficulties: { click_freq: 99 } });
    window.quiz_correct();
    expect(global_value('quiz_difficulties').click_freq).toBe(100);
  });

  test('with adaptive difficulty off, difficulty and per-question streak stay put', () => {
    set_globals({ adaptive_difficulty_enabled: false });
    window.quiz_correct();
    expect(global_value('quiz_difficulties').click_freq).toBe(50);
    expect(global_value('quiz_streaks').click_freq).toBe(0);
    expect(global_value('quiz_nof_correct')).toBe(1);
  });

  test('plays the jingle only when sound is enabled', () => {
    window.quiz_correct();
    expect(window.play_jingle).not.toHaveBeenCalled();
    set_globals({ sound_enabled: true });
    window.quiz_correct();
    expect(window.play_jingle).toHaveBeenCalledTimes(1);
  });

  test('is silent while the audio is still to be initialised (sound_enabled 1, and 1 == true)', () => {
    set_globals({ sound_enabled: 1 });
    window.quiz_correct();
    expect(window.play_jingle).not.toHaveBeenCalled();
  });

  test('shoots three confetti bursts from the mouse position', () => {
    window.confetti = jest.fn();
    window.mouseX = 640;
    window.mouseY = 200;
    window.quiz_correct();
    expect(window.confetti).toHaveBeenCalledTimes(3);
    expect(global_value('confetti_defaults').origin).toEqual({ x: 640 / 1280, y: 200 / 800 });
  });

  test('records a correct answer in the timeline', () => {
    window.quiz_correct();
    expect(global_value('quiz_timeline')).toEqual([{ t: 0, r: 57.5 / 5 + 50 * 4 / 5, q: 0, a: 1 }]);
  });
});

describe('quiz_incorrect', () => {
  beforeEach(() => spy_on(['update_quiz', 'add_event']));

  test('resets the streaks, counts a try but not a completed question', () => {
    set_globals({ quiz_current_streak: 4, quiz_longest_streak: 4, quiz_nof_done: 4, quiz_nof_correct: 4, quiz_nof_tries: 4 });
    set_globals({ quiz_streaks: { click_freq: 3 } });
    window.quiz_incorrect('No.');
    expect(global_value('quiz_current_streak')).toBe(0);
    expect(global_value('quiz_longest_streak')).toBe(4);
    expect(global_value('quiz_streaks').click_freq).toBe(0);
    expect(global_value('quiz_nof_tries')).toBe(5);
    expect(global_value('quiz_nof_done')).toBe(4);
    expect(global_value('quiz_nof_correct')).toBe(4);
  });

  test('adaptive difficulty drops by 20, floored at 0', () => {
    window.quiz_incorrect('No.');
    expect(global_value('quiz_difficulties').click_freq).toBe(30);
    window.quiz_incorrect('No.');
    window.quiz_incorrect('No.');
    expect(global_value('quiz_difficulties').click_freq).toBe(0);
  });

  test('with adaptive difficulty off, difficulty is unchanged', () => {
    set_globals({ adaptive_difficulty_enabled: false });
    window.quiz_incorrect('No.');
    expect(global_value('quiz_difficulties').click_freq).toBe(50);
  });

  test('shows the explanation, records a wrong answer and refreshes the quiz', () => {
    window.quiz_incorrect('<i>Nope</i>');
    expect(document.getElementById('quiz_answer').innerHTML).toBe('<i>Nope</i>');
    expect(global_value('quiz_timeline')).toEqual([{ t: 0, r: 30 / 5 + 50 * 4 / 5, q: 0, a: 0 }]);
    expect(window.update_quiz).toHaveBeenCalledTimes(1);
  });
});

describe('quiz_perhaps', () => {
  test('shows the text without scoring anything', () => {
    window.quiz_perhaps('Maybe');
    expect(document.getElementById('quiz_answer').innerHTML).toBe('Maybe');
    expect(global_value('quiz_nof_tries')).toBe(0);
    expect(global_value('quiz_timeline')).toEqual([]);
  });
});

describe('show_quiz_wrong_text positioning', () => {
  const style = () => document.querySelector('.quiz_answer').style;
  test.each([
    // mouseX, mouseY, expected --left, expected --top (window is 1280 x 800)
    [0, 400, '1%', '50%'],
    [640, 400, '51%', '50%'],
    [1280, 400, '75%', '50%'], // left is capped at 75%
    [100, 0, `${100 * 100 / 1280 + 1}%`, '3%'], // top has a 3% minimum
    [100, 800, `${100 * 100 / 1280 + 1}%`, '84%'], // and an 84% maximum
  ])('mouse at (%s, %s)', (mouseX, mouseY, left, top) => {
    window.mouseX = mouseX;
    window.mouseY = mouseY;
    window.show_quiz_wrong_text('x');
    expect(style().getPropertyValue('--left')).toBe(left);
    expect(style().getPropertyValue('--top')).toBe(top);
  });
});

describe('add_to_quiz_timeline', () => {
  test('stores elapsed seconds, mean difficulty over all question types, question index and correctness', () => {
    set_globals({
      current_quiz: 'click_system',
      quiz_difficulties: { click_freq: 10, click_time: 20, click_nyquist_angle: 30, click_system: 40, click_wrong: 50 },
    });
    jest.advanceTimersByTime(2500);
    window.add_to_quiz_timeline(1);
    expect(global_value('quiz_timeline')).toEqual([{ t: 2.5, r: 30, q: 3, a: 1 }]);
  });
});

describe('quiz settings handlers', () => {
  beforeEach(() => spy_on(['update_quiz', 'next_quiz', 'add_event']));

  test('set_difficulty_level resets every question type to the chosen level', () => {
    set_globals({ quiz_streaks: { click_freq: 5 }, enabled_quiz_types: { click_freq: true } });
    window.set_difficulty_level({ value: '80' });
    expect(global_value('quiz_difficulty')).toBe(80);
    for (const question of global_value('quiz_questions')) {
      expect(global_value('quiz_difficulties')[question]).toBe(80);
      expect(global_value('quiz_streaks')[question]).toBe(0);
      expect(global_value('quiz_questions_nof_done')[question]).toBe(0);
    }
    expect(global_value('enabled_quiz_types').click_freq).toBe(true); // existing choice kept
    expect(global_value('enabled_quiz_types').click_wrong).toBe(false); // missing ones default to off
    expect(window.update_quiz).toHaveBeenCalledTimes(1);
  });

  test('select_quiz_type toggles the type and asks for a new question', () => {
    window.select_quiz_type({ target: { id: 'click_time', checked: true } });
    expect(global_value('enabled_quiz_types').click_time).toBe(true);
    window.select_quiz_type({ target: { id: 'click_time', checked: false } });
    expect(global_value('enabled_quiz_types').click_time).toBe(false);
    expect(window.next_quiz).toHaveBeenCalledTimes(2);
    expect(window.update_quiz).toHaveBeenCalledTimes(2);
  });

  test('toggle_adaptive_difficulty follows the checkbox', () => {
    window.toggle_adaptive_difficulty({ checked: false });
    expect(global_value('adaptive_difficulty_enabled')).toBe(false);
    window.toggle_adaptive_difficulty({ checked: true });
    expect(global_value('adaptive_difficulty_enabled')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Highscores
// ---------------------------------------------------------------------------
describe('read_highscores', () => {
  // One logged quiz result, in the format quiz_time_is_up sends and lu-pze_compete.php stores.
  const result = ({ place_nick, total, correct, streak, time }) =>
    `T100.5;U123;L${place_nick};quiz_time_is_up.click_freq=50.0,total=${total},nof_correct=${correct},` +
    `longest_streak=${streak},nof_questions=${correct},#server_time=${time}`;

  const LOG = [
    result({ place_nick: 'FRTF05_Alice', total: '63.5', correct: 12, streak: 5, time: '2026/10/20 10:00:00' }),
    result({ place_nick: 'FRTF05_Alice', total: '70.2', correct: 15, streak: 4, time: '2026/10/25 09:00:00' }),
    result({ place_nick: 'FRTF05_Bob', total: '70.2', correct: 15, streak: 9, time: '2026/10/26 09:00:00' }),
    result({ place_nick: 'HOME_Pex', total: '70.2', correct: 15, streak: 2, time: '2026/10/27 09:00:00' }),
    result({ place_nick: 'FRTF05_Carol', total: '88.0', correct: 30, streak: 20, time: '2026/05/01 09:00:00' }), // too old
    result({ place_nick: 'FRTF05_Dave', total: '100.0', correct: 40, streak: 31, time: '2026/09/10 09:00:00' }),
    result({ place_nick: 'FRTF05_AVeryLongNicknameIndeed', total: '40.0', correct: 3, streak: 1, time: '2026/10/30 09:00:00' }),
    'T5;U9;quiz_time_is_up.click_freq=50.0,total=20.0,nof_correct=2,longest_streak=2,#server_time=2026/10/31 08:00:00', // no ;L; -> _Anonymous
    'E1;T2;Aread_highscores;', // not a result line (starts with E): ignored
    'garbage',
    '',
  ].join('\n');

  // Splits the generated HTML into its <h2> sections: {title: "row<br>row<br>"}.
  function sections() {
    const html = document.getElementById('quiz_highscores').innerHTML;
    return Object.fromEntries([...html.matchAll(/<h2>(.*?)<\/h2>([^<]*(?:<(?!h2)[^<]*)*)/g)].map((m) => [m[1], m[2]]));
  }
  const rows = (text) => text.split('<br>').filter((row) => row !== '');
  const plain = (row) => row.replaceAll('&nbsp;', ' ');

  function load(log) {
    window.read_highscores();
    const request = FakeXHR.instances[FakeXHR.instances.length - 1];
    request.respond(log);
    return request;
  }

  beforeEach(() => spy_on(['add_event']));

  test('GETs the compete endpoint', () => {
    const request = load('');
    expect(request.opened).toEqual({ method: 'GET', url: 'https://livet.se/lu-pze_compete.php' });
  });

  test('renders the five sections in order', () => {
    load(LOG);
    expect(Object.keys(sections())).toEqual([
      'High score last 3 months', 'Latest quizzers', 'Legends', 'Longest streak', 'Most answered questions',
    ]);
  });

  test('high score list: best result per player, ranked by total + 0.01*correct, only the last 3 months', () => {
    load(LOG);
    // Carol (88.0) is too old to be listed but still uses up rank 2, and ties leave the rank blank:
    // both are current behaviour. "Pex" is penalised by 0.001 so he sorts after equal scores.
    expect(rows(sections()['High score last 3 months']).map(plain)).toEqual([
      ' 1. 100.0 FRTF05 Dave, after 40 questions',
      ' 3.  70.2 FRTF05 Alice, after 15 questions',
      '     70.2 FRTF05 Bob, after 15 questions',
      '     70.2 HOME   Pex, after 15 questions',
      ' 6.  40.0 FRTF05 AVeryLongNicknam..., after 3 questions',
      ' 7.  20.0        Anonymous, after 2 questions',
    ]);
  });

  test('a better result replaces a worse one from the same player, but "after N questions" follows the best total', () => {
    load([
      result({ place_nick: 'A_x', total: '50.0', correct: 99, streak: 1, time: '2026/10/20 10:00:00' }),
      result({ place_nick: 'A_x', total: '60.0', correct: 5, streak: 1, time: '2026/10/21 10:00:00' }),
      result({ place_nick: 'A_x', total: '55.0', correct: 50, streak: 1, time: '2026/10/22 10:00:00' }),
    ].join('\n'));
    expect(rows(sections()['High score last 3 months']).map(plain)).toEqual([' 1.  60.0 A      x, after 5 questions']);
    // ...whereas "Most answered questions" tracks the maximum count separately:
    expect(rows(sections()['Most answered questions']).map(plain)).toEqual([' 1. 99 A      x']);
  });

  test('a nickname containing "Pex" loses ties even when logged first', () => {
    load([
      result({ place_nick: 'HOME_Pex', total: '70.0', correct: 10, streak: 1, time: '2026/10/20 10:00:00' }),
      result({ place_nick: 'HOME_Anna', total: '70.0', correct: 10, streak: 1, time: '2026/10/21 10:00:00' }),
    ].join('\n'));
    expect(rows(sections()['High score last 3 months']).map(plain)).toEqual([
      ' 1.  70.0 HOME   Anna, after 10 questions',
      '     70.0 HOME   Pex, after 10 questions',
    ]);
  });

  test('latest quizzers: newest first, at most 10', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      result({ place_nick: `P_n${i}`, total: '10.0', correct: 1, streak: 1, time: `2026/10/${String(10 + i).padStart(2, '0')} 10:00:00` }));
    load(many.join('\n'));
    const latest = rows(sections()['Latest quizzers']).map(plain);
    expect(latest).toHaveLength(10);
    expect(latest[0]).toBe('2026/10/21 10:00:00 P      n11');
    expect(latest[9]).toBe('2026/10/12 10:00:00 P      n2');
  });

  test('legends: players whose best total is 100, regardless of age, with month and year', () => {
    load(LOG);
    expect(rows(sections().Legends).map(plain)).toEqual([' 1. 100.0 FRTF05 Dave, 40 questions, Sep 2026']);
  });

  test('longest streak and most answered: ranked, ties share a blank rank, nicknames over 24 chars are cut', () => {
    load(LOG);
    expect(rows(sections()['Longest streak']).map(plain)).toEqual([
      ' 1. 31 FRTF05 Dave',
      ' 2. 20 FRTF05 Carol',
      ' 3.  9 FRTF05 Bob',
      ' 4.  5 FRTF05 Alice',
      ' 5.  2 HOME   Pex',
      '     2        Anonymous',
      ' 7.  1 FRTF05 AVeryLongNicknameIndeed',
    ]);
    expect(rows(sections()['Most answered questions']).map(plain)).toEqual([
      ' 1. 40 FRTF05 Dave',
      ' 2. 30 FRTF05 Carol',
      ' 3. 15 FRTF05 Alice',
      '    15 FRTF05 Bob',
      '    15 HOME   Pex',
      ' 6.  3 FRTF05 AVeryLongNicknameIndeed',
      ' 7.  2        Anonymous',
    ]);
    load(result({ place_nick: 'P_' + 'x'.repeat(30), total: '1.0', correct: 1, streak: 1, time: '2026/10/20 10:00:00' }));
    expect(rows(sections()['Longest streak']).map(plain)).toEqual([' 1.  1 P      ' + 'x'.repeat(21) + '...']);
  });

  test('a response with no result lines still renders the headings', () => {
    load('');
    expect(Object.values(sections()).every((text) => text === '')).toBe(true);
  });

  test('a failed request only logs', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    window.read_highscores();
    FakeXHR.instances[0].listeners.error({ type: 'error' });
    expect(log).toHaveBeenCalledWith('Error');
    log.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// quiz_time_is_up: end-of-quiz summary and the result message sent to the server
// ---------------------------------------------------------------------------
describe('quiz_time_is_up', () => {
  const difficulties = { click_freq: 40, click_time: 90, click_nyquist_angle: 60, click_system: 10, click_wrong: 50 };

  beforeEach(() => {
    spy_on(['add_event', 'removeAllGraphs']);
    reset_state({
      quiz_nof_done: 7, quiz_nof_correct: 7, quiz_nof_tries: 8, quiz_longest_streak: 4, quiz_difficulty: 62.5,
      quiz_difficulties: difficulties, client_nick: 'Zed', client_place: 'TEST', client_cookid: 17,
      quiz_timeline: [{ t: 1.5, r: 50, q: 0, a: 1 }, { t: 3, r: 45.5, q: 3, a: 0 }],
    });
  });

  const intro = () => document.getElementById('quiz_intro').innerHTML;

  test('summarises the result, names the best and weakest topic, and ends the quiz', () => {
    window.quiz_time_is_up();
    expect(intro()).toContain("Zed, Time's up!");
    expect(intro()).toContain('You got 7 correct answers,<br>with a longest streak of 4 correct answers.');
    expect(intro()).toContain('You answered 7 questions in 8 clicks,<br>which is a 87.50% accuracy.');
    expect(intro()).toContain("You're really good at clicking on linear x axes, but you could focus on learning more about understanding a system's order.");
    expect(global_value('current_quiz')).toBe('none');
    expect(global_value('quiz_is_running')).toBe(0);
    expect(window.removeAllGraphs).toHaveBeenCalled();
  });

  test('practice mode logs the result but does not POST it', () => {
    window.quiz_time_is_up();
    expect(FakeXHR.instances).toHaveLength(0);
    expect(window.add_event).toHaveBeenCalledTimes(1);
    expect(window.add_event.mock.calls[0][0]).toBe(
      'quiz_time_is_up.click_time=90.0,click_nyquist_angle=60.0,click_wrong=50.0,click_freq=40.0,click_system=10.0,' +
      'total=62.5,nof_correct=7,longest_streak=4,nof_questions=7,accuracy=87.50%,nof_clicks=8,nof_quiz_started=0,' +
      'quiz_practice=false,quiz_compete=false,cookid=17,qt=[{t1.5,r50,q0,a1},{t3,r45.5,q3,a0},].');
  });

  test('zero clicks: no accuracy figure and no division by zero', () => {
    reset_state({ quiz_nof_correct: 0, quiz_nof_done: 0, quiz_nof_tries: 0, quiz_difficulties: difficulties });
    window.quiz_time_is_up();
    expect(intro()).toContain('You answered 0 questions in 0 clicks.<br>');
    expect(intro()).not.toContain('accuracy');
    expect(window.add_event).not.toHaveBeenCalled(); // nothing is logged when nothing was answered correctly
  });

  test('competing POSTs the result as "e=T<seconds>;U<id>;L<place>_<nick>;<result>" and refreshes the list', () => {
    set_globals({ quiz_compete: true });
    window.quiz_time_is_up();
    expect(global_value('have_done_a_compete_quiz')).toBe(true);
    const [post] = FakeXHR.instances;
    expect(post.opened).toEqual({ method: 'POST', url: 'https://livet.se/lu-pze_compete.php' });
    const sent = decodeURIComponent(post.sent.replace(/\+/g, ' '));
    expect(sent).toMatch(/^e=T5;U\d+;LTEST_Zed;quiz_time_is_up\./);
    expect(sent).toContain(',total=62.5,nof_correct=7,longest_streak=4,');
    window.read_highscores = jest.fn();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {}); // the handler logs the response
    post.listeners.load({ target: { response: 'OK' } });
    log.mockRestore();
    expect(window.read_highscores).toHaveBeenCalledTimes(1);
  });

  test('contract: what is POSTed is parsed back correctly by read_highscores', () => {
    set_globals({ quiz_compete: true });
    window.quiz_time_is_up();
    const sent = decodeURIComponent(FakeXHR.instances[0].sent.replace(/\+/g, ' ')).slice('e='.length);
    window.read_highscores = originals.read_highscores;
    window.read_highscores();
    FakeXHR.instances[1].respond(`${sent},#server_time=2026/11/01 10:00:00.\n`);
    const html = document.getElementById('quiz_highscores').innerHTML.replaceAll('&nbsp;', ' ');
    expect(html).toContain(' 1.  62.5 TEST   Zed, after 7 questions<br>');
    expect(html).toContain('2026/11/01 10:00:00 TEST   Zed<br>');
    expect(html).toContain(' 1.  4 TEST   Zed<br>'); // longest streak
    expect(html).toContain(' 1.  7 TEST   Zed<br>'); // most answered
  });
});
