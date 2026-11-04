/** @jest-environment jsdom */
// Tests for the quiz state and flow in src/quiz.js: enabling the quiz, starting and stopping it,
// nickname handling, the 90 second countdown, the compete/practice start-up, the status panel
// (update_quiz) with its cap grades, and the perturbations used by the "click the wrong graph"
// question. Question generation itself is covered by tests/next_quiz.test.js.
// Cross-file functions are replaced by jest.fn() spies (see "Testing gotchas" in CLAUDE.md).
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = [
  'add_event', 'removeAllGraphs', 'next_quiz', 'read_highscores', 'achievement_done',
  'remove_splash_screen', 'restart_lupze', 'quiz_time_is_up', 'redraw',
];
const originals = {};
const QUESTIONS = ['click_freq', 'click_time', 'click_nyquist_angle', 'click_system', 'click_wrong'];

let random_spy;
// Math.random returns the given values in order, then 0.5. Throws on runaway loops.
function script_random(...values) {
  let next = 0;
  let calls = 0;
  random_spy = jest.spyOn(Math, 'random').mockImplementation(() => {
    if (++calls > 1000) throw new Error('Math.random called over 1000 times: runaway loop in the test script');
    return next < values.length ? values[next++] : 0.5;
  });
}

const events = () => window.add_event.mock.calls.map(([text]) => text);
const by_id = (id) => document.getElementById(id);
const active = (selector) => document.querySelector(selector).classList.contains('active');

function difficulties_of(level) {
  const difficulties = {};
  for (const question of QUESTIONS) difficulties[question] = level;
  return difficulties;
}

function reset_state(overrides = {}) {
  set_globals({
    quiz_enabled: false, current_quiz: 'none',
    quiz_nof_done: 0, quiz_nof_tries: 0, quiz_current_streak: 0, quiz_longest_streak: 0,
    quiz_nof_correct: 0, quiz_no: 0, quiz_is_running: 0, quiz_seconds_left: -1,
    quiz_compete: false, quiz_practice: false, quiz_experience: 50,
    quiz_difficulty: 50, quiz_difficulties: difficulties_of(50),
    quiz_streaks: {}, quiz_questions_nof_done: {},
    enabled_quiz_types: {}, adaptive_difficulty_enabled: true,
    nof_quiz_started: 0, cap_grade: 0, debug_mode: false,
    client_nick: '', splash_screen_active: false, current_assignment: 'some_assignment',
    improvement_enabled: false, light_mode: 'dark',
    ...overrides,
  });
}

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
});

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  reset_state();
  for (const element of document.querySelectorAll('.quiz_intro, .quiz_highscores')) element.classList.remove('active');
  by_id('welcome_text').innerHTML = '';
  by_id('quiz_timer').innerHTML = '';
  by_id('task_list').innerHTML = '';
  by_id('nickname_area').style.background = '';
  by_id('quiz_icon').style.display = 'none';
  by_id('quiz_icon_svg').style.fill = '';
  by_id('assignment_icon_svg').style.fill = '';
});

afterEach(() => {
  jest.useRealTimers();
  random_spy?.mockRestore();
  random_spy = undefined;
  for (const name of SPYABLE) window[name] = originals[name];
});

// ---------------------------------------------------------------------------
describe('toggle_quiz_enabled', () => {
  test('enabling shows the quiz icon, disabling hides it again', () => {
    window.toggle_quiz_enabled();
    expect(global_value('quiz_enabled')).toBe(true);
    expect(by_id('quiz_icon').style.display).toBe('inline');

    window.toggle_quiz_enabled();
    expect(global_value('quiz_enabled')).toBe(false);
    expect(by_id('quiz_icon').style.display).toBe('none');
    expect(window.restart_lupze).not.toHaveBeenCalled();
  });

  test('a quiz in progress is stopped first, whichever way the switch goes', () => {
    set_globals({ current_quiz: 'click_freq', quiz_enabled: true });
    window.toggle_quiz_enabled();
    expect(events()).toContain('stop_quiz');
    expect(window.restart_lupze).toHaveBeenCalledTimes(1);
    expect(global_value('quiz_enabled')).toBe(false);
    expect(by_id('quiz_icon').style.display).toBe('none');

    set_globals({ current_quiz: 'click_freq' });
    window.toggle_quiz_enabled();
    expect(window.restart_lupze).toHaveBeenCalledTimes(2);
    expect(global_value('quiz_enabled')).toBe(true);
    expect(by_id('quiz_icon').style.display).toBe('inline');
  });
});

describe('toggle_quiz', () => {
  test('starts the quiz when none is running', () => {
    window.toggle_quiz();
    expect(global_value('quiz_is_running')).toBe(1);
    expect(events()).toContain('view_quiz');
    expect(window.restart_lupze).not.toHaveBeenCalled();
  });

  test('stops the quiz when one is running', () => {
    set_globals({ current_quiz: 'click_time' });
    window.toggle_quiz();
    expect(events()).toContain('stop_quiz');
    expect(window.restart_lupze).toHaveBeenCalledTimes(1);
    expect(events()).not.toContain('view_quiz');
  });
});

// ---------------------------------------------------------------------------
describe('set_quiz_experience and set_nickname', () => {
  test('the experience slider value is stored as a number and logged', () => {
    window.set_quiz_experience({ value: '37' });
    expect(global_value('quiz_experience')).toBe(37);
    expect(events()).toEqual(['set_quiz_experience=37']);
  });

  test('a clean nickname is kept as typed and logged', () => {
    window.set_nickname({ value: 'Pex123' });
    expect(global_value('client_nick')).toBe('Pex123');
    expect(events()).toEqual(['set_quiz_nickname=Pex123']);
  });

  test('letters including åäö are allowed, every other character becomes an underscore', () => {
    window.set_nickname({ value: 'ÅäÖ åö' });
    expect(global_value('client_nick')).toBe('ÅäÖ_åö');
    window.set_nickname({ value: 'a;b=c\nd"<x>é-1' });
    expect(global_value('client_nick')).toBe('a_b_c_d__x___1');
    expect(events()[1]).toBe('set_quiz_nickname=a_b_c_d__x___1');
  });

  test('an empty nickname stays empty', () => {
    set_globals({ client_nick: 'old' });
    window.set_nickname({ value: '' });
    expect(global_value('client_nick')).toBe('');
  });

  test('the nickname field in the quiz window is wired to set_nickname', () => {
    const input = by_id('nickname');
    input.value = 'Ada Lovelace!';
    input.dispatchEvent(new Event('input'));
    // The inline oninput handler reads `this.value`.
    expect(global_value('client_nick')).toBe('Ada_Lovelace_');
  });
});

// ---------------------------------------------------------------------------
describe('init_quiz', () => {
  test('resets the counters and creates a zeroed streak and question count for every type', () => {
    set_globals({ quiz_nof_done: 7, quiz_nof_tries: 9, quiz_current_streak: 3, quiz_nof_correct: 6, quiz_longest_streak: 5 });
    window.init_quiz();
    expect(global_value('quiz_nof_done')).toBe(0);
    expect(global_value('quiz_nof_tries')).toBe(0);
    expect(global_value('quiz_current_streak')).toBe(0);
    expect(global_value('quiz_nof_correct')).toBe(0);
    const zeroes = Object.fromEntries(QUESTIONS.map((question) => [question, 0]));
    expect(global_value('quiz_streaks')).toEqual(zeroes);
    expect(global_value('quiz_questions_nof_done')).toEqual(zeroes);
  });

  test('does not touch the longest streak or the difficulties', () => {
    set_globals({ quiz_longest_streak: 5 });
    window.init_quiz();
    expect(global_value('quiz_longest_streak')).toBe(5);
    expect(global_value('quiz_difficulties')).toEqual(difficulties_of(50));
  });
});

// ---------------------------------------------------------------------------
describe('start_quiz', () => {
  test('opens the intro and highscore windows, loads the highscores and logs view_quiz', () => {
    by_id('welcome_text').innerHTML = '<b>Take the initial quiz</b>';
    set_globals({ quiz_longest_streak: 8 });
    window.start_quiz();

    expect(global_value('quiz_is_running')).toBe(1);
    expect(global_value('quiz_longest_streak')).toBe(0);
    expect(by_id('welcome_text').innerHTML).toBe('');
    expect(active('.quiz_intro')).toBe(true);
    expect(active('.quiz_highscores')).toBe(true);
    expect(window.achievement_done).toHaveBeenCalledWith('start_quiz');
    expect(window.removeAllGraphs).toHaveBeenCalledTimes(1);
    expect(window.read_highscores).toHaveBeenCalledTimes(1);
    expect(events()).toEqual(['view_quiz']);
  });

  test('closes the other windows before opening the quiz ones', () => {
    document.querySelector('.feedback').classList.add('active');
    document.querySelector('.info').classList.add('active');
    window.start_quiz();
    expect(active('.feedback')).toBe(false);
    expect(active('.info')).toBe(false);
    expect(active('.quiz_intro')).toBe(true);
  });

  test('the assignment icon loses its highlight', () => {
    by_id('assignment_icon_svg').style.fill = '#5050ff';
    window.start_quiz();
    expect(by_id('assignment_icon_svg').style.fill).toBe('');
  });

  test('the nickname field gets focus', () => {
    const input = by_id('nickname');
    const focus = jest.spyOn(input, 'focus');
    window.start_quiz();
    expect(focus).toHaveBeenCalledTimes(1);
    focus.mockRestore();
  });

  test('works when the nickname field does not exist (only the initial quiz window has it)', () => {
    const input = by_id('nickname');
    input.removeAttribute('id');
    try {
      expect(() => window.start_quiz()).not.toThrow();
      expect(events()).toEqual(['view_quiz']);
    } finally {
      input.id = 'nickname';
    }
  });

  test('the splash screen is removed only while it is active', () => {
    window.start_quiz();
    expect(window.remove_splash_screen).not.toHaveBeenCalled();

    set_globals({ splash_screen_active: true });
    window.start_quiz();
    expect(window.remove_splash_screen).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe('stop_quiz', () => {
  test('hides the quiz windows, clears the timer, logs both events in order and restarts the app', () => {
    document.querySelector('.quiz_intro').classList.add('active');
    document.querySelector('.quiz_highscores').classList.add('active');
    by_id('quiz_timer').innerHTML = 'Time left: 12s';
    set_globals({ quiz_is_running: 1 });

    window.stop_quiz();

    expect(active('.quiz_intro')).toBe(false);
    expect(active('.quiz_highscores')).toBe(false);
    expect(by_id('quiz_timer').innerHTML).toBe('');
    expect(global_value('quiz_is_running')).toBe(0);
    expect(events()).toEqual(['hide_quiz', 'stop_quiz']);
    expect(window.restart_lupze).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe('quiz_lets_go_compete', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T12:00:00'));
    document.querySelector('.quiz_intro').classList.add('active');
  });

  test('without a nickname the nickname area turns red and nothing starts', () => {
    window.quiz_lets_go_compete();
    expect(by_id('nickname_area').style.background).toBe('rgb(255, 0, 0)');
    expect(events()).toEqual(['tried_start_quiz_compete_but_no_nickname']);
    expect(global_value('quiz_compete')).toBe(false);
    expect(global_value('quiz_is_running')).toBe(0);
    expect(window.next_quiz).not.toHaveBeenCalled();
    expect(window.removeAllGraphs).not.toHaveBeenCalled();
    expect(active('.quiz_intro')).toBe(true);
  });

  test('with a nickname it resets the score and difficulty, and starts the countdown', () => {
    set_globals({
      client_nick: 'Pex', quiz_nof_done: 4, quiz_nof_tries: 6, quiz_current_streak: 2,
      quiz_longest_streak: 3, quiz_nof_correct: 4, quiz_difficulty: 80, quiz_practice: true,
      quiz_difficulties: difficulties_of(80),
      quiz_streaks: { click_freq: 5 }, quiz_questions_nof_done: { click_freq: 5 },
    });

    window.quiz_lets_go_compete();

    expect(by_id('nickname_area').style.background).toBe('');
    expect(global_value('quiz_compete')).toBe(true);
    expect(global_value('quiz_practice')).toBe(false);
    expect(global_value('quiz_is_running')).toBe(1);
    for (const name of ['quiz_nof_done', 'quiz_nof_tries', 'quiz_current_streak', 'quiz_longest_streak', 'quiz_nof_correct']) {
      expect(global_value(name)).toBe(0);
    }
    // update_quiz has not run with a quiz in progress (current_quiz is "none"), so the mean
    // difficulty is still the reset value.
    expect(global_value('quiz_difficulty')).toBe(50);
    expect(global_value('quiz_difficulties')).toEqual(difficulties_of(50));
    const zeroes = Object.fromEntries(QUESTIONS.map((question) => [question, 0]));
    expect(global_value('quiz_streaks')).toEqual(zeroes);
    expect(global_value('quiz_questions_nof_done')).toEqual(zeroes);
    expect(events().slice(0, 2)).toEqual(['start_quiz_compete', 'set_difficulty_level=50']);
    // quiz_lets_go ran:
    expect(active('.quiz_intro')).toBe(false);
    expect(window.next_quiz).toHaveBeenCalledTimes(1);
    expect(global_value('quiz_seconds_left')).toBe(90);
    expect(by_id('quiz_timer').innerHTML).toBe('Time left: 90s');
  });

  test('question types that were never configured are initialised as disabled, existing choices are kept', () => {
    set_globals({ client_nick: 'Pex', enabled_quiz_types: { click_time: true } });
    window.quiz_lets_go_compete();
    expect(global_value('enabled_quiz_types')).toEqual({
      click_freq: false, click_time: true, click_nyquist_angle: false, click_system: false, click_wrong: false,
    });
  });

  test('update_quiz is called (the status panel is filled) once a quiz is in progress', () => {
    set_globals({ client_nick: 'Pex', current_quiz: 'click_freq' });
    window.quiz_lets_go_compete();
    // The spied next_quiz does not set current_quiz, but update_quiz is real here and rendered.
    expect(by_id('task_list').innerHTML).toContain('Quiz time!');
  });
});

describe('quiz_lets_go_practice', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T12:00:00'));
  });

  test('is practice mode, needs no nickname and keeps the score', () => {
    set_globals({ quiz_compete: true, quiz_nof_correct: 3, quiz_difficulty: 66 });
    window.quiz_lets_go_practice();
    expect(events()[0]).toBe('start_quiz_practice');
    expect(global_value('quiz_compete')).toBe(false);
    expect(global_value('quiz_practice')).toBe(true);
    expect(global_value('quiz_nof_correct')).toBe(3);
    expect(global_value('quiz_difficulty')).toBe(66);
    expect(window.next_quiz).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe('quiz_lets_go', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T12:00:00'));
  });

  test('starts the clock and prepares the first question', () => {
    set_globals({ quiz_no: 7, quiz_started_at: null, nof_quiz_started: 2 });
    global_value('quiz_timeline').push({ stale: true });
    document.querySelector('.quiz_intro').classList.add('active');
    document.querySelector('.quiz_highscores').classList.add('active');

    window.quiz_lets_go();

    expect(global_value('quiz_timeline')).toEqual([]);
    expect(global_value('quiz_started_at')).toBe(new Date('2026-11-03T12:00:00').getTime());
    expect(global_value('quiz_is_running')).toBe(1);
    expect(active('.quiz_intro')).toBe(false);
    expect(active('.quiz_highscores')).toBe(false);
    expect(by_id('quiz_icon_svg').style.fill).toBe('#5050ff');
    expect(global_value('quiz_seconds_left')).toBe(90);
    expect(by_id('quiz_timer').innerHTML).toBe('Time left: 90s');
    expect(global_value('nof_quiz_started')).toBe(3);
    expect(global_value('current_assignment')).toBe('none');
    expect(window.removeAllGraphs).toHaveBeenCalledTimes(1);
    // quiz_no is reset before next_quiz() runs (the spy does not increment it).
    expect(global_value('quiz_no')).toBe(0);
    expect(window.next_quiz).toHaveBeenCalledTimes(1);
  });

  test('the countdown ticks once per second down to 0, then reports that time is up', () => {
    window.quiz_lets_go();
    expect(by_id('quiz_timer').innerHTML).toBe('Time left: 90s');

    jest.advanceTimersByTime(999);
    expect(global_value('quiz_seconds_left')).toBe(90);
    jest.advanceTimersByTime(1);
    expect(global_value('quiz_seconds_left')).toBe(89);
    expect(by_id('quiz_timer').innerHTML).toBe('Time left: 89s');

    jest.advanceTimersByTime(88 * 1000);
    expect(by_id('quiz_timer').innerHTML).toBe('Time left: 1s');
    expect(window.quiz_time_is_up).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    // At 0 seconds the countdown is still running and shows "0s" ...
    expect(global_value('quiz_seconds_left')).toBe(0);
    expect(by_id('quiz_timer').innerHTML).toBe('Time left: 0s');
    expect(window.quiz_time_is_up).not.toHaveBeenCalled();

    // ... and only the tick after that ends the quiz.
    jest.advanceTimersByTime(1000);
    expect(window.quiz_time_is_up).toHaveBeenCalledTimes(1);
    expect(global_value('quiz_is_running')).toBe(2);
    expect(global_value('quiz_seconds_left')).toBe(0);

    jest.advanceTimersByTime(10 * 1000);
    expect(window.quiz_time_is_up).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('quiz_countdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    by_id('quiz_timer').innerHTML = 'untouched';
  });

  test('does nothing unless the quiz is running', () => {
    for (const state of [0, 2]) {
      set_globals({ quiz_is_running: state, quiz_seconds_left: 30 });
      window.quiz_countdown();
      expect(global_value('quiz_seconds_left')).toBe(30);
      expect(by_id('quiz_timer').innerHTML).toBe('untouched');
      expect(jest.getTimerCount()).toBe(0);
    }
  });

  test('a stopped quiz ends the tick chain (stop_quiz sets quiz_is_running to 0)', () => {
    window.quiz_lets_go();
    jest.advanceTimersByTime(3000);
    expect(global_value('quiz_seconds_left')).toBe(87);
    set_globals({ quiz_is_running: 0 });
    jest.advanceTimersByTime(60 * 1000);
    expect(global_value('quiz_seconds_left')).toBe(87);
    expect(window.quiz_time_is_up).not.toHaveBeenCalled();
  });

  test('a seconds_left below zero is clamped to 0 and ends the quiz at once', () => {
    window.quiz_lets_go();
    set_globals({ quiz_seconds_left: 0 });
    jest.advanceTimersByTime(1000);
    expect(global_value('quiz_seconds_left')).toBe(0);
    expect(global_value('quiz_is_running')).toBe(2);
    expect(window.quiz_time_is_up).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe('update_quiz', () => {
  const panel = () => by_id('task_list').innerHTML;

  test('does nothing when no quiz is in progress', () => {
    set_globals({ current_quiz: 'none', quiz_difficulties: difficulties_of(90) });
    by_id('task_list').innerHTML = 'before';
    window.update_quiz();
    expect(panel()).toBe('before');
    expect(global_value('quiz_difficulty')).toBe(50);
  });

  test('the shown difficulty is the mean over the question types', () => {
    set_globals({
      current_quiz: 'click_freq',
      quiz_difficulties: { click_freq: 10, click_time: 20, click_nyquist_angle: 30, click_system: 40, click_wrong: 55 },
    });
    window.update_quiz();
    expect(global_value('quiz_difficulty')).toBe(31);
    expect(by_id('cap_0_text').innerHTML).toBe('31/100&nbsp;');
    expect(panel()).toContain('id="difficulty_level" value="31"');
  });

  test('the difficulty is rounded to whole points in the badge', () => {
    set_globals({ current_quiz: 'click_freq', quiz_difficulties: { ...difficulties_of(50), click_freq: 52.9 } });
    window.update_quiz();
    // mean = 50.58
    expect(by_id('cap_0_text').innerHTML).toBe('51/100&nbsp;');
  });

  test.each([
    [69.99, 0], [70, 1], [79.99, 1], [80, 2], [97.99, 2], [98, 3], [100, 3], [0, 0],
  ])('difficulty %p gives cap grade %p (bronze at 70, silver at 80, gold at 98)', (level, grade) => {
    set_globals({ current_quiz: 'click_freq', cap_grade: grade === 0 ? 3 : 0, quiz_difficulties: difficulties_of(level) });
    window.update_quiz();
    expect(global_value('cap_grade')).toBe(grade);
    expect(by_id('cap_0').getAttribute('src')).toBe('images/cap_' + grade + '.webp');
    expect(by_id('cap_0').style.animation).toContain('new_badge_anim');
  });

  test('the badge is only replaced (and animated) when the grade changes', () => {
    set_globals({ current_quiz: 'click_freq', cap_grade: 0, quiz_difficulties: difficulties_of(75) });
    window.update_quiz();
    expect(global_value('cap_grade')).toBe(1);

    const cap = by_id('cap_0');
    cap.setAttribute('src', 'marker.webp');
    cap.style.animation = 'none';
    window.update_quiz();
    expect(cap.getAttribute('src')).toBe('marker.webp');
    expect(cap.style.animation).toBe('none');
    expect(global_value('cap_grade')).toBe(1);
  });

  describe('status text', () => {
    const render = (extra) => {
      set_globals({ current_quiz: 'click_freq', ...extra });
      window.update_quiz();
      return panel();
    };

    test('shows the counts and the accuracy as done / tries', () => {
      const html = render({ quiz_nof_correct: 3, quiz_current_streak: 2, quiz_nof_done: 3, quiz_nof_tries: 4, quiz_longest_streak: 2 });
      expect(html).toContain('<b>Quiz time!</b>');
      expect(html).toContain("you've got 3 correct answers,<br>");
      expect(html).toContain('with a streak of 2 immediately correct answers.<br>');
      expect(html).toContain("You've answered 3 questions in 4 tries,<br>which is a 75.00% accuracy.<br>");
    });

    test('no accuracy is shown before the first answered question', () => {
      const html = render({ quiz_nof_done: 0, quiz_nof_tries: 2 });
      expect(html).toContain("You've answered 0 questions in 2 tries.<br>");
      expect(html).not.toContain('accuracy');
      expect(html).not.toContain('NaN');
    });

    test.each([
      [0, 'Better get started!'],
      [1, 'Nice going!'], [3, 'Nice going!'],
      [4, "You're doing good!"], [6, "You're doing good!"],
      [7, 'You deserve a longer streak - go and make one!'], [9, 'You deserve a longer streak - go and make one!'],
      [10, 'Keep it up, Legend!'], [25, 'Keep it up, Legend!'],
    ])('longest streak %p is commented with "%s"', (streak, comment) => {
      const html = render({ quiz_longest_streak: streak });
      expect(html).toContain('Longest streak so far ' + streak + '. ' + comment + '<br>');
      for (const other of ['Better get started!', 'Nice going!', "You're doing good!", 'longer streak - go', 'Legend']) {
        if (!comment.includes(other)) expect(html).not.toContain(other);
      }
    });
  });

  describe('difficulty slider and debug extras', () => {
    test('outside debug mode the slider is disabled and there are no debug controls', () => {
      set_globals({ current_quiz: 'click_freq', debug_mode: false });
      window.update_quiz();
      const slider = by_id('difficulty_level');
      expect(slider.disabled).toBe(true);
      expect(by_id('adaptive_difficulty')).toBeNull();
      expect(by_id('click_freq')).toBeNull();
      expect(by_id('task_list').innerHTML).not.toContain('Your stats');
      for (const label of ['Novice', 'Intermediate', 'Professor']) expect(by_id('task_list').innerHTML).toContain(label);
    });

    test('in debug mode the slider is enabled and shows adaptive toggle and per-type stats', () => {
      set_globals({
        current_quiz: 'click_freq', debug_mode: true, adaptive_difficulty_enabled: true,
        quiz_difficulties: { click_freq: 10, click_time: 20, click_nyquist_angle: 30, click_system: 40, click_wrong: 55 },
        enabled_quiz_types: { click_time: true },
      });
      window.update_quiz();
      expect(by_id('difficulty_level').disabled).toBe(false);
      expect(by_id('adaptive_difficulty').checked).toBe(true);
      expect(panel_text()).toContain('click_freq: 10.0');
      expect(panel_text()).toContain('click_wrong: 55.0');
      expect(panel_text()).toContain('Total: 31.0');
      expect(by_id('click_time').checked).toBe(true);
      expect(by_id('click_freq').checked).toBe(false);
      expect(document.getElementsByName('quiz_type')).toHaveLength(QUESTIONS.length);
    });

    test('the adaptive toggle reflects adaptive_difficulty_enabled', () => {
      set_globals({ current_quiz: 'click_freq', debug_mode: true, adaptive_difficulty_enabled: false });
      window.update_quiz();
      expect(by_id('adaptive_difficulty').checked).toBe(false);
    });

    function panel_text() { return by_id('task_list').textContent; }
  });
});

// ---------------------------------------------------------------------------
describe('next_quiz error path', () => {
  test('an unknown question type is reported on the console and the quiz number still advances', () => {
    window.next_quiz = originals.next_quiz;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const real_pick = window.pick_next_quiz_type;
    window.pick_next_quiz_type = () => { set_globals({ current_quiz: 'click_banana' }); };
    set_globals({ quiz_questions_nof_done: { click_banana: 0 }, quiz_difficulties: { click_banana: 50 }, quiz_no: 4 });
    try {
      window.next_quiz();
      expect(log).toHaveBeenCalledWith("ERROR, the current_quiz was a value I don't handle:click_banana");
      expect(global_value('quiz_no')).toBe(5);
      expect(events()).toContain('next_quiz=click_banana');
    } finally {
      window.pick_next_quiz_type = real_pick;
      log.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
describe('perturb_wrong_bode_magnitude', () => {
  const base = () => ({ k: 1, t: 1, z: 1, w: 1 });
  const perturbed = (random_values, level) => {
    script_random(...random_values);
    const p = base();
    window.perturb_wrong_bode_magnitude(p, level);
    return p;
  };

  test('k/w branch, level below 50: k is scaled by 8..22, w by 10..24, in the chosen directions', () => {
    // branch (<0.5 = k/w), k up, factor 8 + 14*0 ; w divided, factor 10 + 14*0
    let p = perturbed([0.1, 0.1, 0, 0.1, 0], 49);
    expect(p).toEqual({ k: 8, t: 1, z: 1, w: 1 / 10 });
    // k down, w up
    p = perturbed([0.1, 0.9, 1, 0.9, 1], 49);
    expect(p.k).toBeCloseTo(1 / 22, 10);
    expect(p.w).toBeCloseTo(24, 10);
    expect(p.t).toBe(1);
    expect(p.z).toBe(1);
  });

  test('k/w branch, level 50 and above: k is scaled by 2..42', () => {
    let p = perturbed([0.1, 0.1, 0, 0.1, 0], 50);
    expect(p.k).toBe(2);
    p = perturbed([0.1, 0.9, 1, 0.1, 0], 50);
    expect(p.k).toBeCloseTo(1 / 42, 10);
    p = perturbed([0.1, 0.1, 1, 0.1, 0], 100);
    expect(p.k).toBeCloseTo(42, 10);
  });

  test('t/z branch: t is scaled by 18..32 and z by 10..24, level does not matter', () => {
    let p = perturbed([0.9, 0.1, 0, 0.1, 0], 10);
    expect(p).toEqual({ k: 1, t: 18, z: 1 / 10, w: 1 });
    p = perturbed([0.9, 0.9, 1, 0.9, 1], 90);
    expect(p.t).toBeCloseTo(1 / 32, 10);
    expect(p.z).toBeCloseTo(24, 10);
    expect(p.k).toBe(1);
    expect(p.w).toBe(1);
  });

  test('the branch threshold is exactly 0.5', () => {
    expect(perturbed([0.4999, 0.1, 0, 0.1, 0], 10).k).not.toBe(1);
    expect(perturbed([0.5, 0.1, 0, 0.1, 0], 10).t).toBe(18);
  });
});
