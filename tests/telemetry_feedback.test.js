// Tests for src/banner_telemetry.js (right-click banner, add_event / periodic_send event
// logging, opt_out_tracking) and src/feedback.js (survey popups, set_fb_*). They record current
// behaviour; the one `test.failing` case marks a suspected bug (see the comment on it).
// No real network traffic: window.XMLHttpRequest is replaced by a fake and timers are faked.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const NOW = new Date('2026-11-03T12:00:00');
const SESSION_AGE_MS = 3500; // session_started_at is this long before NOW
const SERVER_URL = 'https://livet.se/lu-pze.php';

const SPYABLE = ['add_event'];
const originals = {};

class FakeXHR {
  constructor() {
    this.listeners = {};
    this.opened = null;
    this.headers = {};
    this.sent = null;
    FakeXHR.instances.push(this);
  }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  open(method, url, async) { this.opened = { method, url, async }; }
  setRequestHeader(name, value) { this.headers[name] = value; }
  send(body) { this.sent = body; }
  respond(status, response) { this.listeners.load({ target: { status, response } }); }
  fail(event) { this.listeners.error(event); }
}
FakeXHR.instances = [];

const last_xhr = () => FakeXHR.instances[FakeXHR.instances.length - 1];
// The pending queue as plain text, e.g. "E0;T3.5;Afoo;E1;T3.5;Abar;".
const pending_text = () => global_value('pending').join('');

function reset_telemetry(overrides = {}) {
  window.clearTimeout(global_value('periodic_timer_id'));
  set_globals({
    improvement_enabled: true,
    pending: [],
    event_no: 0,
    periodic_timer_id: 0,
    server_error: '',
    client_id: 1234,
    client_nick: 'Ann B',
    client_place: 'lund',
    debug_mode: false,
    session_started_at: NOW.getTime() - SESSION_AGE_MS,
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
  reset_telemetry();
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// add_event: queueing and scheduling
// ---------------------------------------------------------------------------
describe('add_event', () => {
  test('queues "E<n>;T<seconds since session start>;A<text>;" and numbers events consecutively', () => {
    window.add_event('first');
    window.add_event('second');
    expect(global_value('pending')).toEqual(['E0;T3.5;Afirst;', 'E1;T3.5;Asecond;']);
    expect(global_value('event_no')).toBe(2);
  });

  test('the timestamp follows the clock', () => {
    window.add_event('early');
    jest.setSystemTime(NOW.getTime() + 1250);
    window.add_event('later');
    expect(global_value('pending')).toEqual(['E0;T3.5;Aearly;', 'E1;T4.75;Alater;']);
  });

  test('a named event is sent 1500 ms later, not before', () => {
    window.add_event('foo');
    jest.advanceTimersByTime(1499);
    expect(FakeXHR.instances).toHaveLength(0);
    jest.advanceTimersByTime(1);
    expect(FakeXHR.instances).toHaveLength(1);
  });

  test('each new named event restarts the 1500 ms timer, so a burst goes out as one request', () => {
    window.add_event('a');
    jest.advanceTimersByTime(1000);
    window.add_event('b');
    jest.advanceTimersByTime(1000);
    expect(FakeXHR.instances).toHaveLength(0);
    jest.advanceTimersByTime(500);
    expect(FakeXHR.instances).toHaveLength(1);
    expect(decodeURIComponent(last_xhr().sent.replace(/\+/g, ' '))).toContain('E0;T3.5;Aa;E1;T4.5;Ab;');
  });

  test('an empty event is a heartbeat: no "A" field, sent after 5000 ms', () => {
    window.add_event('');
    expect(global_value('pending')).toEqual(['E0;T3.5;']);
    jest.advanceTimersByTime(4999);
    expect(FakeXHR.instances).toHaveLength(0);
    jest.advanceTimersByTime(1);
    expect(FakeXHR.instances).toHaveLength(1);
  });

  test('a heartbeat does not postpone an already scheduled send', () => {
    window.add_event('named');
    jest.advanceTimersByTime(1000);
    window.add_event('');
    jest.advanceTimersByTime(500);
    expect(FakeXHR.instances).toHaveLength(1);
    expect(pending_text()).toBe('E0;T3.5;Anamed;E1;T4.5;');
  });

  test('a named event pulls a pending 5000 ms heartbeat timer forward to 1500 ms', () => {
    window.add_event('');
    jest.advanceTimersByTime(4000);
    window.add_event('named');
    jest.advanceTimersByTime(1500);
    expect(FakeXHR.instances).toHaveLength(1);
  });

  test('only one send timer is ever outstanding', () => {
    window.add_event('');
    window.add_event('');
    window.add_event('');
    expect(jest.getTimerCount()).toBe(1);
  });

  test('only the first ";" in the text is replaced, because the protocol is ";"-separated', () => {
    window.add_event('a;b');
    expect(global_value('pending')).toEqual(['E0;T3.5;Aa_b;']);
  });

  // Free text from the feedback textareas (set_fb_text, set_fb_liketext) must not inject extra
  // fields into the ";"-separated "E<n>;T<t>;A<text>;" protocol, so every ";" is replaced.
  test('every ";" in the text is replaced so the event stays one field', () => {
    window.add_event('a;b;c');
    expect(global_value('pending')).toEqual(['E0;T3.5;Aa_b_c;']);
  });

  test('with improvement_enabled false nothing is queued and no timer is set', () => {
    reset_telemetry({ improvement_enabled: false });
    window.add_event('secret');
    expect(global_value('pending')).toEqual([]);
    expect(global_value('event_no')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('debug_mode logs "Event:<text>" to the console, even when tracking is off', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    reset_telemetry({ debug_mode: true, improvement_enabled: false });
    window.add_event('hello');
    expect(log).toHaveBeenCalledWith('Event:hello');
    expect(global_value('pending')).toEqual([]);
  });

  test('without debug_mode nothing is logged', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    window.add_event('hello');
    expect(log).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// periodic_send: request format
// ---------------------------------------------------------------------------
describe('periodic_send request', () => {
  test('does nothing when the queue is empty', () => {
    window.periodic_send();
    expect(FakeXHR.instances).toHaveLength(0);
  });

  test('POSTs the url-encoded body to livet.se, asynchronously, with the form content type', () => {
    window.add_event('foo');
    jest.advanceTimersByTime(1500);
    const xhr = last_xhr();
    expect(xhr.opened).toEqual({ method: 'POST', url: SERVER_URL, async: true });
    expect(xhr.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
    // T<elapsed at sending: 3.5 s + the 1.5 s timer>;U<client_id>;L<place>_<nick>;<events>, with the spaces as "+" and ";" as %3B
    expect(xhr.sent).toBe('e=T5%3BU1234%3BLlund_Ann+B%3BE0%3BT3.5%3BAfoo%3B');
  });

  test('the header uses the time of sending, and a nick with ";" or "&" is percent-encoded', () => {
    reset_telemetry({ client_nick: 'a&b=c;d', client_place: '' });
    window.add_event('x');
    jest.setSystemTime(NOW.getTime() + 2000);
    jest.advanceTimersByTime(1500);
    expect(last_xhr().sent).toBe('e=T7%3BU1234%3BL_a%26b%3Dc%3Bd%3BE0%3BT3.5%3BAx%3B');
  });

  test('sends every queued event in order', () => {
    window.add_event('a');
    window.add_event('');
    window.add_event('b');
    jest.advanceTimersByTime(1500);
    expect(decodeURIComponent(last_xhr().sent.replace(/\+/g, ' '))).toBe(
      'e=T5;U1234;Llund_Ann B;E0;T3.5;Aa;E1;T3.5;E2;T3.5;Ab;');
  });

  test('clears periodic_timer_id when it fires', () => {
    window.add_event('a');
    jest.advanceTimersByTime(1500);
    expect(global_value('periodic_timer_id')).toBe(0);
  });

  test('the request is fire-and-forget: sent events stay queued until the server acknowledges', () => {
    window.add_event('a');
    jest.advanceTimersByTime(1500);
    expect(pending_text()).toBe('E0;T3.5;Aa;');
  });
});

// ---------------------------------------------------------------------------
// periodic_send: server responses
// ---------------------------------------------------------------------------
describe('periodic_send responses', () => {
  function send_three_events() {
    window.add_event('a');
    window.add_event('b');
    window.add_event('c');
    jest.advanceTimersByTime(1500);
    return last_xhr();
  }

  test('"E<n>;" acknowledges all events up to and including n', () => {
    const xhr = send_three_events();
    xhr.respond(200, 'E1;');
    expect(global_value('pending')).toEqual(['E2;T3.5;Ac;']);
  });

  test('acknowledging everything empties the queue and schedules no retry', () => {
    const xhr = send_three_events();
    xhr.respond(200, 'E2;');
    expect(global_value('pending')).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('events still pending after an answer are retried 20 s later, with the same body', () => {
    const xhr = send_three_events();
    const first_body = xhr.sent;
    xhr.respond(200, 'E0;');
    jest.advanceTimersByTime(19999);
    expect(FakeXHR.instances).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(FakeXHR.instances).toHaveLength(2);
    expect(decodeURIComponent(last_xhr().sent)).toContain('E1;T3.5;Ab;E2;T3.5;Ac;');
    expect(decodeURIComponent(last_xhr().sent)).not.toContain('E0;');
    expect(last_xhr().sent).not.toBe(first_body);
  });

  test('"CID<n>" in the answer replaces client_id, which the next request then uses', () => {
    const xhr = send_three_events();
    xhr.respond(200, 'E0;CID987;');
    expect(global_value('client_id')).toBe(987);
    jest.advanceTimersByTime(20000);
    expect(last_xhr().sent).toContain('U987%3B');
  });

  test('"CID" before the "E" field is parsed too', () => {
    const xhr = send_three_events();
    xhr.respond(200, 'E5;CID42;');
    expect(global_value('client_id')).toBe(42);
    expect(global_value('pending')).toEqual([]);
  });

  test('an answer starting with "ERROR" is stored in server_error and nothing is removed', () => {
    const xhr = send_three_events();
    xhr.respond(200, 'ERROR bad request');
    expect(global_value('server_error')).toBe('ERROR bad request');
    expect(global_value('pending')).toHaveLength(3);
    jest.advanceTimersByTime(20000);
    expect(FakeXHR.instances).toHaveLength(2);
  });

  test('an answer that is neither "E..." nor "ERROR..." removes nothing but still retries', () => {
    const xhr = send_three_events();
    xhr.respond(200, 'garbage');
    expect(global_value('pending')).toHaveLength(3);
    jest.advanceTimersByTime(20000);
    expect(FakeXHR.instances).toHaveLength(2);
  });

  test('a non-200 status is ignored completely: nothing removed, no retry scheduled', () => {
    const xhr = send_three_events();
    xhr.respond(500, 'E2;CID5;');
    expect(global_value('pending')).toHaveLength(3);
    expect(global_value('client_id')).toBe(1234);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('no second retry timer when a send timer was already scheduled meanwhile', () => {
    const xhr = send_three_events();
    window.add_event('d'); // schedules the 1500 ms timer
    xhr.respond(200, 'E0;');
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(1500);
    expect(FakeXHR.instances).toHaveLength(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('a network error is logged to the console and keeps the queue', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const xhr = send_three_events();
    const event = { type: 'error' };
    xhr.fail(event);
    expect(log).toHaveBeenNthCalledWith(1, 'Error');
    expect(log).toHaveBeenNthCalledWith(2, event);
    expect(global_value('pending')).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// opt_out_tracking
// ---------------------------------------------------------------------------
describe('opt_out_tracking', () => {
  test('turns improvement_enabled off', () => {
    expect(global_value('improvement_enabled')).toBe(true);
    window.opt_out_tracking();
    expect(global_value('improvement_enabled')).toBe(false);
  });

  test('events after opting out are neither queued nor sent', () => {
    window.opt_out_tracking();
    window.add_event('a');
    window.add_event('');
    jest.advanceTimersByTime(60000);
    expect(global_value('pending')).toEqual([]);
    expect(FakeXHR.instances).toHaveLength(0);
  });

  test('opting out twice (the page wires it to both the label and the checkbox) is harmless', () => {
    window.opt_out_tracking();
    window.opt_out_tracking();
    expect(global_value('improvement_enabled')).toBe(false);
  });

  // SUSPECTED BUG (not fixed): opt_out_tracking only stops *new* events. Events queued before the
  // opt-out stay in `pending`, and the already scheduled timer still POSTs them to livet.se.
  test.failing('events queued before opting out are not sent afterwards', () => {
    window.add_event('before');
    window.opt_out_tracking();
    jest.advanceTimersByTime(60000);
    expect(FakeXHR.instances).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Right-click banner
// ---------------------------------------------------------------------------
describe('banner', () => {
  const banner_element = () => document.getElementById('banner');

  beforeEach(() => {
    window.add_event = jest.fn();
    set_globals({
      have_asked_questions: false, banner_is_visible: false,
      this_is_a_touch_device: false, quiz_is_running: 0,
    });
    banner_element().innerHTML = '';
    banner_element().style.opacity = '';
  });

  test('prepare_banner shows the banner after 60 s', () => {
    window.prepare_banner();
    jest.advanceTimersByTime(59999);
    expect(global_value('banner_is_visible')).toBe(false);
    jest.advanceTimersByTime(1);
    expect(global_value('banner_is_visible')).toBe(true);
  });

  test('trigger_banner shows two images (the second one hidden, for layout) and logs banner_enter', () => {
    window.trigger_banner();
    expect(global_value('banner_is_visible')).toBe(true);
    const images = banner_element().querySelectorAll('img');
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute('src')).toBe('images/Right_click_banner_small.webp');
    expect(images[0].getAttribute('alt')).toBe('Right click to ask questions!');
    expect(images[0].className).toBe('banner');
    expect(images[1].style.visibility).toBe('hidden');
    expect(banner_element().style.animation).toBe('banner_anim_in 7s ease-out 1');
    expect(window.add_event).toHaveBeenCalledTimes(1);
    expect(window.add_event).toHaveBeenCalledWith('banner_enter');
  });

  test('nothing happens once the user has asked a question', () => {
    set_globals({ have_asked_questions: true });
    window.trigger_banner();
    expect(global_value('banner_is_visible')).toBe(false);
    expect(banner_element().innerHTML).toBe('');
    expect(window.add_event).not.toHaveBeenCalled();
  });

  test('nothing happens on a touch device (there is no right click)', () => {
    set_globals({ this_is_a_touch_device: true });
    window.trigger_banner();
    expect(global_value('banner_is_visible')).toBe(false);
    expect(banner_element().innerHTML).toBe('');
    expect(window.add_event).not.toHaveBeenCalled();
  });

  test.each([1, 2])('during a quiz (quiz_is_running=%i) the banner is postponed by 120 s', (state) => {
    set_globals({ quiz_is_running: state });
    window.trigger_banner();
    expect(global_value('banner_is_visible')).toBe(false);
    expect(window.add_event).not.toHaveBeenCalled();
    jest.advanceTimersByTime(119999);
    expect(global_value('banner_is_visible')).toBe(false);
    set_globals({ quiz_is_running: 0 });
    jest.advanceTimersByTime(1);
    expect(global_value('banner_is_visible')).toBe(true);
    expect(window.add_event).toHaveBeenCalledWith('banner_enter');
  });

  test('remove_banner_if_needed fades a visible banner out and logs banner_removed', () => {
    window.trigger_banner();
    window.add_event.mockClear();
    window.remove_banner_if_needed();
    expect(global_value('banner_is_visible')).toBe(false);
    expect(banner_element().querySelectorAll('img')).toHaveLength(1);
    expect(banner_element().style.animation).toBe('banner_anim_out 5s ease-out 1');
    expect(banner_element().style.opacity).toBe('0');
    expect(window.add_event).toHaveBeenCalledTimes(1);
    expect(window.add_event).toHaveBeenCalledWith('banner_removed');
  });

  test('remove_banner_if_needed does nothing when no banner is showing, and only acts once', () => {
    window.remove_banner_if_needed();
    expect(window.add_event).not.toHaveBeenCalled();
    expect(banner_element().innerHTML).toBe('');
    window.trigger_banner();
    window.remove_banner_if_needed();
    window.remove_banner_if_needed();
    expect(window.add_event.mock.calls.filter(([name]) => name === 'banner_removed')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Feedback survey popups
// ---------------------------------------------------------------------------
describe('feedback', () => {
  const feedback_element = () => document.querySelector('.feedback');
  const feedback_text = () => document.getElementById('feedback_text');
  const logged = () => window.add_event.mock.calls.map(([text]) => text);
  // "none" is the placeholder assignment ("...no assignment", one impossible task): it has no survey.
  const assignment_ids = () => Object.keys(global_value('all_assignments')).filter((id) => id !== 'none');

  // Every question id start_feedback can pick.
  const ALL_FB = [
    'fb_quiz_new', 'fb_quiz_knowledge', 'fb_quiz_enjoy', 'fb_quiz_many', 'fb_quiz_highscore',
    'fb_ass_new', 'fb_ass_knowledge', 'fb_ass_enjoy', 'fb_achievements', 'fb_liketext', 'fb_text',
    'fb_edu', 'fb_questions', 'fb_bode', 'fb_nyquist', 'fb_polezero', 'fb_increased',
    'fb_good_learning', 'fb_gamified', 'fb_bode2', 'fb_nyquist2', 'fb_polezero2',
  ];
  const ASSIGNMENT_FB = [
    'fb_one_pole', 'fb_two_real_poles', 'fb_two_complex_poles', 'fb_time_delay',
    'fb_one_zero_two_poles', 'fb_four_poles', 'fb_pid_controller', 'fb_pid_controller_YL',
  ];

  // A state in which every question is available.
  function unlock_everything() {
    const completed = {};
    for (const id of assignment_ids()) completed[id] = global_value('all_assignments')[id].tasks.length;
    set_globals({
      nof_quiz_started: 2, nof_assignments_done: 2,
      nof_times_achievements_window_opened: 1, achievement_score: 20,
      have_done_a_compete_quiz: true,
      done_assignments: completed,
      session_started_at: NOW.getTime() - (20 * 60 * 1000 + 1),
    });
  }

  // Which question id a rendered survey belongs to, read from its inline handler.
  function question_id_of(html) {
    const assignment = /set_fb_all_assignments\('(fb_\w+)'/.exec(html);
    if (assignment) return assignment[1];
    return /\bset_(fb_\w+)\(/.exec(html)[1];
  }

  // Lists the questions that are currently available by answering them one at a time.
  function available_questions() {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const found = [];
    for (;;) {
      const html = window.get_next_fb_text();
      if (html === '') break;
      const id = question_id_of(html);
      found.push(id);
      global_value('done_fb').push(id);
    }
    Math.random.mockRestore();
    set_globals({ done_fb: [] });
    return found;
  }

  // Shows exactly one question by marking every other one as answered.
  function show_only(id) {
    unlock_everything();
    set_globals({ done_fb: [...ALL_FB, ...ASSIGNMENT_FB].filter((other) => other !== id) });
    window.start_feedback();
  }

  beforeEach(() => {
    window.add_event = jest.fn();
    set_globals({
      feedback_is_visible: 0, done_fb: [], quiz_is_running: 0,
      nof_quiz_started: 0, nof_assignments_done: 0, nof_times_achievements_window_opened: 0,
      achievement_score: 0, have_done_a_compete_quiz: false, done_assignments: {},
    });
    feedback_element().classList.remove('active');
    feedback_text().innerHTML = '';
  });

  describe('availability', () => {
    test('a fresh session has no question, so start_feedback shows nothing', () => {
      window.start_feedback();
      expect(feedback_element().classList.contains('active')).toBe(false);
      expect(global_value('feedback_is_visible')).toBe(0);
      expect(feedback_text().innerHTML).toBe('');
      expect(window.add_event).not.toHaveBeenCalled();
    });

    test('questions unlock after 40 s, 4, 7, 10, 13 and 20 minutes (strictly after)', () => {
      const unlocked_at = (ms) => {
        set_globals({ session_started_at: NOW.getTime() - ms });
        return available_questions().sort();
      };
      const min = 60 * 1000;
      expect(unlocked_at(40 * 1000)).toEqual([]);
      expect(unlocked_at(40 * 1000 + 1)).toEqual(['fb_edu']);
      expect(unlocked_at(4 * min)).toEqual(['fb_edu']);
      expect(unlocked_at(4 * min + 1)).toEqual(['fb_edu', 'fb_questions']);
      expect(unlocked_at(7 * min)).toEqual(['fb_edu', 'fb_questions']);
      expect(unlocked_at(7 * min + 1)).toEqual(['fb_bode', 'fb_edu', 'fb_nyquist', 'fb_polezero', 'fb_questions']);
      expect(unlocked_at(10 * min)).not.toContain('fb_increased');
      expect(unlocked_at(10 * min + 1)).toContain('fb_increased');
      expect(unlocked_at(13 * min)).not.toContain('fb_good_learning');
      expect(unlocked_at(13 * min + 1)).toEqual(expect.arrayContaining(['fb_good_learning', 'fb_gamified']));
      expect(unlocked_at(20 * min)).not.toContain('fb_bode2');
      expect(unlocked_at(20 * min + 1)).toEqual(expect.arrayContaining(['fb_bode2', 'fb_nyquist2', 'fb_polezero2']));
    });

    test('quiz questions need started quizzes; fb_quiz_many needs two', () => {
      set_globals({ nof_quiz_started: 1 });
      expect(available_questions().sort()).toEqual(['fb_quiz_enjoy', 'fb_quiz_knowledge', 'fb_quiz_new']);
      set_globals({ nof_quiz_started: 2 });
      expect(available_questions()).toContain('fb_quiz_many');
    });

    test('assignment questions need two finished assignments', () => {
      set_globals({ nof_assignments_done: 1 });
      expect(available_questions()).toEqual([]);
      set_globals({ nof_assignments_done: 2 });
      expect(available_questions().sort()).toEqual(['fb_ass_enjoy', 'fb_ass_knowledge', 'fb_ass_new']);
    });

    test('fb_achievements needs an opened achievements window and a score of at least 20', () => {
      set_globals({ nof_times_achievements_window_opened: 1, achievement_score: 19 });
      expect(available_questions()).toEqual([]);
      set_globals({ nof_times_achievements_window_opened: 0, achievement_score: 20 });
      expect(available_questions()).toEqual([]);
      set_globals({ nof_times_achievements_window_opened: 1, achievement_score: 20 });
      expect(available_questions()).toEqual(['fb_achievements']);
    });

    test('fb_quiz_highscore needs a compete quiz', () => {
      set_globals({ have_done_a_compete_quiz: true });
      expect(available_questions()).toEqual(['fb_quiz_highscore']);
    });

    test('fb_liketext needs the quiz, assignment and achievement answers; fb_text needs fb_liketext', () => {
      set_globals({ done_fb: ['fb_quiz_new', 'fb_ass_new'] });
      expect(available_questions()).toEqual([]);
      set_globals({ done_fb: ['fb_quiz_new', 'fb_ass_new', 'fb_achievements'] });
      const html = window.get_next_fb_text();
      expect(question_id_of(html)).toBe('fb_liketext');
      set_globals({ done_fb: ['fb_liketext'] });
      expect(question_id_of(window.get_next_fb_text())).toBe('fb_text');
    });

    test('a finished assignment unlocks its own question only when all its tasks are done', () => {
      const tasks = global_value('all_assignments').time_delay.tasks.length;
      set_globals({ done_assignments: { time_delay: tasks - 1 } });
      expect(available_questions()).toEqual([]);
      set_globals({ done_assignments: { time_delay: tasks } });
      expect(available_questions()).toEqual(['fb_time_delay']);
    });

    test('every assignment question is reachable', () => {
      unlock_everything();
      const available = available_questions();
      expect(available).toEqual(expect.arrayContaining(ASSIGNMENT_FB));
      expect(available.sort()).toEqual([...ALL_FB, ...ASSIGNMENT_FB].sort());
    });

    test('answered questions are not offered again', () => {
      unlock_everything();
      set_globals({ done_fb: ALL_FB.filter((id) => id !== 'fb_bode') });
      set_globals({ done_fb: [...global_value('done_fb'), ...ASSIGNMENT_FB] });
      expect(question_id_of(window.get_next_fb_text())).toBe('fb_bode');
      set_globals({ done_fb: [...ALL_FB, ...ASSIGNMENT_FB] });
      expect(window.get_next_fb_text()).toBe('');
    });

    test('the question is picked uniformly with Math.random', () => {
      set_globals({ session_started_at: NOW.getTime() - (7 * 60 * 1000 + 1) });
      // available, in push order: fb_edu, fb_questions, fb_bode, fb_nyquist, fb_polezero
      const spy = jest.spyOn(Math, 'random');
      spy.mockReturnValue(0);
      expect(question_id_of(window.get_next_fb_text())).toBe('fb_edu');
      spy.mockReturnValue(0.5);
      expect(question_id_of(window.get_next_fb_text())).toBe('fb_bode');
      spy.mockReturnValue(0.999);
      expect(question_id_of(window.get_next_fb_text())).toBe('fb_polezero');
    });
  });

  describe('start_feedback / stop_feedback / done_feedback / timer_feedback', () => {
    beforeEach(() => set_globals({ session_started_at: NOW.getTime() - 41 * 1000 }));

    test('shows the question, marks the popup active and logs start_fb', () => {
      window.start_feedback();
      expect(feedback_element().classList.contains('active')).toBe(true);
      expect(global_value('feedback_is_visible')).toBe(1);
      expect(feedback_text().querySelectorAll('input[name="fb_edu"]')).toHaveLength(5);
      expect(logged()).toEqual(['start_fb']);
    });

    test('does not replace a question that is already showing', () => {
      window.start_feedback();
      window.add_event.mockClear();
      feedback_text().innerHTML = 'kept';
      window.start_feedback();
      expect(feedback_text().innerHTML).toBe('kept');
      expect(window.add_event).not.toHaveBeenCalled();
    });

    test('stop_feedback hides the popup and logs stop_fb', () => {
      window.start_feedback();
      window.add_event.mockClear();
      window.stop_feedback();
      expect(feedback_element().classList.contains('active')).toBe(false);
      expect(global_value('feedback_is_visible')).toBe(0);
      expect(logged()).toEqual(['stop_fb']);
    });

    test('done_feedback logs done_fb and then stop_fb', () => {
      window.start_feedback();
      window.add_event.mockClear();
      window.done_feedback();
      expect(logged()).toEqual(['done_fb', 'stop_fb']);
      expect(feedback_element().classList.contains('active')).toBe(false);
    });

    test('timer_feedback shows a question when no quiz has started', () => {
      window.timer_feedback();
      expect(global_value('feedback_is_visible')).toBe(1);
    });

    test.each([1, 2])('timer_feedback stays quiet while a quiz is running or ended (state %i)', (state) => {
      set_globals({ quiz_is_running: state });
      window.timer_feedback();
      expect(global_value('feedback_is_visible')).toBe(0);
      expect(window.add_event).not.toHaveBeenCalled();
    });

    test('the app wires timer_feedback to a 12 s interval', () => {
      expect(global_value('fb_popup_interval')).toBe(12);
    });
  });

  describe('slider questions', () => {
    // [question id, text shown, handler called by the slider, slider width]
    const SLIDERS = [
      ['fb_quiz_new', 'I learned something new from the quiz', 'set_fb_quiz_new'],
      ['fb_quiz_knowledge', 'The quiz', 'set_fb_quiz_knowledge'],
      ['fb_quiz_enjoy', 'I enjoyed doing the quiz', 'set_fb_quiz_enjoy'],
      ['fb_quiz_highscore', 'The highscore table motivates me', 'set_fb_quiz_highscore'],
      ['fb_achievements', 'The achievements', 'set_fb_achievements'],
      ['fb_increased', 'This webpage increases my interest', 'set_fb_increased'],
      ['fb_good_learning', 'Interactive tools are good for learning', 'set_fb_good_learning'],
      ['fb_gamified', 'Teaching in general should be more gamified', 'set_fb_gamified'],
      ['fb_ass_new', 'I learned something new from the assignments', 'set_fb_ass_new'],
      ['fb_ass_knowledge', 'The assignments', 'set_fb_ass_knowledge'],
      ['fb_ass_enjoy', 'I enjoy doing the assignments', 'set_fb_ass_enjoy'],
      ['fb_questions', 'The right-click questions helped me', 'set_fb_questions'],
      ['fb_bode', 'Bode plots and step responses', 'set_fb_bode'],
      ['fb_nyquist', 'Nyquist diagrams and Bode plots', 'set_fb_nyquist'],
      ['fb_polezero', 'pole-zero maps and step responses', 'set_fb_polezero'],
      ['fb_bode2', 'Bode plots and step responses', 'set_fb_bode2'],
      ['fb_nyquist2', 'Nyquist diagrams and Bode plots', 'set_fb_nyquist2'],
      ['fb_polezero2', 'pole-zero maps and step responses', 'set_fb_polezero2'],
    ];

    test.each(SLIDERS)('%s renders a 0-100 slider starting at 50 with Agree / Don\'t agree labels', (id, text, handler) => {
      show_only(id);
      const slider = feedback_text().querySelector('input[type="range"]');
      expect(slider.id).toBe(id);
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
      expect(slider.step).toBe('1');
      expect(slider.value).toBe('50');
      expect(slider.getAttribute('onchange')).toBe(`${handler}(this)`);
      expect(feedback_text().textContent).toContain(text);
      expect(feedback_text().textContent).toMatch(/Don't\s+agreeAgree/);
      expect(feedback_element().classList.contains('active')).toBe(true);
      expect(logged()).toEqual(['start_fb']);
    });

    test.each(SLIDERS)('%s: moving the slider logs "<handler>=<value>", marks it answered and closes the popup', (id, text, handler) => {
      show_only(id);
      const slider = feedback_text().querySelector('input[type="range"]');
      slider.value = '73';
      window.add_event.mockClear();
      slider.dispatchEvent(new Event('change'));
      expect(logged()).toEqual([`${handler}=73`, 'stop_fb']);
      expect(global_value('done_fb')).toContain(id);
      // Every other question is answered, so nothing follows.
      expect(feedback_element().classList.contains('active')).toBe(false);
      expect(global_value('feedback_is_visible')).toBe(0);
    });

    test('answering one question immediately shows the next available one', () => {
      unlock_everything();
      const open_questions = ['fb_bode', 'fb_edu'];
      set_globals({ done_fb: [...ALL_FB, ...ASSIGNMENT_FB].filter((id) => !open_questions.includes(id)) });
      jest.spyOn(Math, 'random').mockReturnValue(0);
      window.start_feedback();
      // fb_edu is pushed to the available list before fb_bode, so it comes first.
      expect(feedback_text().querySelectorAll('input[name="fb_edu"]')).toHaveLength(5);
      window.add_event.mockClear();
      window.set_fb_edu({ value: 'student' });
      expect(logged()).toEqual(['set_fb_edu=student', 'stop_fb', 'start_fb']);
      expect(feedback_element().classList.contains('active')).toBe(true);
      expect(feedback_text().querySelector('input[type="range"]').id).toBe('fb_bode');
    });
  });

  describe('assignment questions', () => {
    const TEXTS = {
      fb_one_pole: 'systems with one pole',
      fb_two_real_poles: 'systems with two real poles',
      fb_two_complex_poles: 'systems with two complex poles',
      fb_time_delay: 'systems with time delay',
      fb_one_zero_two_poles: 'systems with one zero and two poles',
      fb_four_poles: 'systems with four poles',
      fb_pid_controller: 'a PID controller with a one-pole system',
      fb_pid_controller_YL: 'a PID controller and a system with a load',
    };

    test.each(ASSIGNMENT_FB)('%s renders its own sentence and a shared slider id', (id) => {
      show_only(id);
      expect(feedback_text().textContent).toContain(`I have learnt more about ${TEXTS[id]} from this assignment:`);
      const slider = feedback_text().querySelector('input[type="range"]');
      expect(slider.id).toBe('fb_all_assignments');
      expect(slider.value).toBe('50');
      expect(slider.getAttribute('onchange')).toBe(`set_fb_all_assignments('${id}',this)`);
    });

    test.each(ASSIGNMENT_FB)('%s: the answer is logged under the assignment id without a set_ prefix', (id) => {
      show_only(id);
      const slider = feedback_text().querySelector('input[type="range"]');
      slider.value = '88';
      window.add_event.mockClear();
      slider.dispatchEvent(new Event('change'));
      expect(logged()).toEqual([`${id}=88`, 'stop_fb']);
      expect(global_value('done_fb')).toContain(id);
    });
  });

  describe('radio questions', () => {
    test('fb_edu offers five education levels', () => {
      show_only('fb_edu');
      const radios = [...feedback_text().querySelectorAll('input[type="radio"]')];
      expect(radios.map((radio) => radio.value)).toEqual(['nothing', 'student', 'have_studied', 'phd', 'professor']);
      expect(radios.every((radio) => radio.name === 'fb_edu')).toBe(true);
      expect(feedback_text().textContent).toContain('Automatic control:');
    });

    test.each(['nothing', 'student', 'have_studied', 'phd', 'professor'])('fb_edu: choosing "%s" is logged', (value) => {
      show_only('fb_edu');
      const radio = feedback_text().querySelector(`input[value="${value}"]`);
      window.add_event.mockClear();
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
      expect(logged()).toEqual([`set_fb_edu=${value}`, 'stop_fb']);
      expect(global_value('done_fb')).toContain('fb_edu');
    });

    test('fb_quiz_many offers five motivations', () => {
      show_only('fb_quiz_many');
      const radios = [...feedback_text().querySelectorAll('input[type="radio"]')];
      expect(radios.map((radio) => radio.value)).toEqual(
        ['fun_compete', 'good_practice', 'challenge_myself', 'professor', 'other']);
      expect(feedback_text().textContent).toContain('What makes you do more quizzes?');
    });

    test.each(['fun_compete', 'good_practice', 'challenge_myself', 'professor', 'other'])(
      'fb_quiz_many: choosing "%s" is logged', (value) => {
        show_only('fb_quiz_many');
        const radio = feedback_text().querySelector(`input[value="${value}"]`);
        window.add_event.mockClear();
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
        expect(logged()).toEqual([`set_fb_quiz_many=${value}`, 'stop_fb']);
        expect(global_value('done_fb')).toContain('fb_quiz_many');
      });
  });

  describe('free-text questions', () => {
    test('fb_text: typing logs every change but does not finish; the Done button does', () => {
      show_only('fb_text');
      const area = feedback_text().querySelector('textarea#fb_text');
      expect(area.getAttribute('oninput')).toBe('set_fb_text(this)');
      expect(feedback_text().textContent).toContain('Suggestions for improvement:');
      window.add_event.mockClear();
      area.value = 'more poles';
      area.dispatchEvent(new Event('input'));
      expect(logged()).toEqual(['set_fb_text=more poles']);
      expect(global_value('done_fb')).not.toContain('fb_text');
      expect(feedback_element().classList.contains('active')).toBe(true);

      feedback_text().querySelector('td.yellow_hover').click();
      expect(global_value('done_fb')).toContain('fb_text');
      expect(logged()).toEqual(['set_fb_text=more poles', 'stop_fb']);
      expect(feedback_element().classList.contains('active')).toBe(false);
    });

    test('fb_liketext: typing logs every change; Done marks it answered', () => {
      show_only('fb_liketext');
      const area = feedback_text().querySelector('textarea#fb_liketext');
      expect(feedback_text().textContent).toContain('What did you like the most here:');
      window.add_event.mockClear();
      area.value = 'the quiz';
      area.dispatchEvent(new Event('input'));
      expect(logged()).toEqual(['set_fb_liketext=the quiz']);
      expect(global_value('done_fb')).not.toContain('fb_liketext');

      feedback_text().querySelector('td.yellow_hover').click();
      expect(global_value('done_fb')).toContain('fb_liketext');
      expect(logged()).toEqual(['set_fb_liketext=the quiz', 'stop_fb']);
    });

    test('finishing fb_liketext makes fb_text the next question', () => {
      show_only('fb_liketext');
      set_globals({ done_fb: [...ALL_FB, ...ASSIGNMENT_FB].filter((id) => id !== 'fb_liketext' && id !== 'fb_text') });
      window.done_fb_liketext();
      expect(feedback_text().querySelector('textarea#fb_text')).not.toBeNull();
      expect(feedback_element().classList.contains('active')).toBe(true);
    });
  });

  describe('direct handler calls', () => {
    const HANDLERS = [
      'set_fb_quiz_new', 'set_fb_quiz_knowledge', 'set_fb_quiz_enjoy', 'set_fb_quiz_highscore',
      'set_fb_achievements', 'set_fb_increased', 'set_fb_good_learning', 'set_fb_gamified',
      'set_fb_ass_new', 'set_fb_ass_knowledge', 'set_fb_ass_enjoy', 'set_fb_questions',
      'set_fb_bode', 'set_fb_nyquist', 'set_fb_polezero', 'set_fb_bode2', 'set_fb_nyquist2',
      'set_fb_polezero2', 'set_fb_edu', 'set_fb_quiz_many',
    ];

    test.each(HANDLERS)('%s records the answer under its own question id', (handler) => {
      window[handler]({ value: '5' });
      expect(global_value('done_fb')).toEqual([handler.replace('set_', '')]);
      expect(logged()).toEqual([`${handler}=5`, 'stop_fb']);
    });

    test('set_fb_all_assignments records the passed assignment id', () => {
      window.set_fb_all_assignments('fb_four_poles', { value: '9' });
      expect(global_value('done_fb')).toEqual(['fb_four_poles']);
      expect(logged()).toEqual(['fb_four_poles=9', 'stop_fb']);
    });

    test('fb_all_assignments_ids match the assignment sentences', () => {
      expect(Object.keys(global_value('fb_all_assignments')).sort()).toEqual([...ASSIGNMENT_FB].sort());
    });
  });

  // Cases added after Stryker mutation testing (npm run test:mutation) showed that no test noticed
  // these changes to src/feedback.js.
  describe('mutation gaps: after an answer the next question is shown', () => {
    const ANSWERS = [
      'set_fb_quiz_new', 'set_fb_quiz_knowledge', 'set_fb_quiz_enjoy', 'set_fb_quiz_highscore',
      'set_fb_achievements', 'set_fb_increased', 'set_fb_good_learning', 'set_fb_gamified',
      'set_fb_ass_new', 'set_fb_ass_knowledge', 'set_fb_ass_enjoy', 'set_fb_questions',
      'set_fb_bode', 'set_fb_nyquist', 'set_fb_polezero', 'set_fb_bode2', 'set_fb_nyquist2',
      'set_fb_polezero2', 'set_fb_edu', 'set_fb_quiz_many',
    ];
    let real_start_feedback;
    beforeEach(() => {
      real_start_feedback = window.start_feedback;
      window.start_feedback = jest.fn();
    });
    afterEach(() => { window.start_feedback = real_start_feedback; });

    test.each(ANSWERS)('%s closes the question and then asks for the next one', (handler) => {
      window[handler]({ value: '5' });
      expect(window.start_feedback).toHaveBeenCalledTimes(1);
    });

    test('set_fb_all_assignments, done_fb_text and done_fb_liketext do the same', () => {
      window.set_fb_all_assignments('fb_four_poles', { value: '5' });
      window.done_fb_text();
      window.done_fb_liketext();
      expect(window.start_feedback).toHaveBeenCalledTimes(3);
    });

    test('set_fb_text and set_fb_liketext only log what is typed', () => {
      window.set_fb_text({ value: 'a' });
      window.set_fb_liketext({ value: 'b' });
      expect(window.start_feedback).not.toHaveBeenCalled();
      expect(logged()).toEqual(['set_fb_text=a', 'set_fb_liketext=b']);
    });
  });

  describe('mutation gaps: fb_liketext needs all of the quiz, assignment and achievement questions answered', () => {
    const THREE = ['fb_quiz_new', 'fb_ass_new', 'fb_achievements'];
    test.each([
      [[]], [['fb_quiz_new']], [['fb_ass_new']], [['fb_achievements']],
      [['fb_quiz_new', 'fb_ass_new']], [['fb_quiz_new', 'fb_achievements']], [['fb_ass_new', 'fb_achievements']],
    ])('with only %j answered it is not offered', (answered) => {
      unlock_everything();
      set_globals({ done_fb: answered });
      expect(available_questions_with(answered)).not.toContain('fb_liketext');
    });

    test('with all three answered it is offered', () => {
      unlock_everything();
      expect(available_questions_with(THREE)).toContain('fb_liketext');
    });

    // The questions that can be picked, found by drawing with many different random values.
    // (Nothing is answered meanwhile, so the answers given to the others stay as they were.)
    function available_questions_with(answered) {
      set_globals({ done_fb: answered });
      const found = new Set();
      for (let i = 0; i < 40; i++) {
        jest.spyOn(Math, 'random').mockReturnValue(i / 40);
        const html = window.get_next_fb_text();
        Math.random.mockRestore();
        if (html !== '') found.add(question_id_of(html));
      }
      set_globals({ done_fb: [] });
      return [...found];
    }
  });

  describe('mutation gaps: the exact markup of the surveys that were only checked in part', () => {
    const html_of = (id) => {
      show_only(id);
      return feedback_text().innerHTML;
    };
    const slider = (id, handler, width = 60) =>
      `<fieldset style="border:0"><label for="${id}">Don't&nbsp;agree</label>` +
      `<input type="range" min="0" max="100" step="1" class="quiz-slider" id="${id}" value="50" style="width:${width}%" onchange="${handler}">` +
      `<label for="${id}">Agree</label></fieldset>`;

    test('an assignment question: sentence, line break, slider with both labels', () => {
      const html = html_of('fb_four_poles');
      expect(html).toBe(
        'I have learnt more about systems with four poles from this assignment:<br>' +
        slider('fb_all_assignments', "set_fb_all_assignments('fb_four_poles',this)"));
    });

    test('fb_text: a text area and a Done button in a table cell', () => {
      const html = html_of('fb_text');
      expect(html.startsWith('Suggestions for improvement:<br><textarea rows="3" cols="60" id="fb_text" name="fb_text"')).toBe(true);
      expect(html).toContain('oninput="set_fb_text(this)"></textarea>');
      const button = feedback_text().querySelector('table > tbody > tr > td.yellow_hover > span#fb_done_button');
      expect(button.textContent).toBe('Done!');
      expect(button.nextElementSibling.tagName).toBe('BR');
      expect(feedback_text().querySelector('td.yellow_hover').getAttribute('onclick')).toBe('done_fb_text()');
    });

    test('fb_liketext: a text area and a Done button in a table cell', () => {
      const html = html_of('fb_liketext');
      expect(html.startsWith('What did you like the most here:<br><textarea rows="5" cols="40" id="fb_liketext" name="fb_liketext"')).toBe(true);
      const button = feedback_text().querySelector('table > tbody > tr > td.yellow_hover > span#fb_done_button');
      expect(button.textContent).toBe('Done!');
      expect(button.nextElementSibling.tagName).toBe('BR');
      expect(feedback_text().querySelector('td.yellow_hover').getAttribute('onclick')).toBe('done_fb_liketext()');
    });

    test.each([
      ['fb_edu', 'Automatic control:', [
        ['nothing', 'I know nothing.'], ['student', "I'm studying it."], ['have_studied', 'I have studied it.'],
        ['phd', "I'm an Automatic Control PhD student."], ['professor', "I'm an Automatic Control Professor."],
      ]],
      ['fb_quiz_many', 'What makes you do more quizzes?', [
        ['fun_compete', 'It’s fun to compete'], ['good_practice', 'Good practice'], ['challenge_myself', 'Fun to challenge myself'],
        ['professor', 'Want to reach professor level'], ['other', 'Other'],
      ]],
    ])('%s: a heading and one label per choice, each followed by a line break', (id, heading, choices) => {
      const expected = `<table><tbody><tr><td>${heading}<br>` +
        choices.map(([value, text]) =>
          `<label><input type="radio" id="${id}" name="${id}" value="${value}" onchange="set_${id}(this)">${text}</label><br>`).join('') +
        '</td></tr></tbody></table>';
      expect(html_of(id)).toBe(expected);
    });
  });
});
