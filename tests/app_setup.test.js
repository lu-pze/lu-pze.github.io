// Tests for src/app_setup.js: fullscreen toggling, cookies, p5 setup() (URL parameters, client
// cookie id, telemetry events), ready() (DOM wiring) and the start-up hook.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

// Cross-file globals replaced by spies (see "Testing gotchas" in CLAUDE.md).
const SPYABLE = [
  'add_event', 'achievement_done', 'addNewGraph', 'setGraphDimensions', 'init_quiz',
  'createCanvas', 'colorMode', 'noLoop', 'color', 'str',
  'addNewGraphClicked', 'view_settings', 'updateInputFormula', 'toggle_gamification',
  'toggle_assignments', 'set_difficulty_level', 'toggle_quiz_enabled', 'start_quiz',
  'restart_lupze', 'questionsToggle', 'prepare_banner', 'timer_feedback',
];
const originals = {};

const events = () => window.add_event.mock.calls.map((call) => call[0]);
const clear_cookies = () => {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0].trim();
    if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }
};
const set_url = (query) => window.history.pushState({}, '', '/' + query);

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
});

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  window.createCanvas = jest.fn(() => ({ parent: jest.fn() }));
  window.str = String;
  window.color = jest.fn((...args) => args);
  set_globals({
    improvement_enabled: false, debug_mode: false, client_place: '', client_cookid: -1,
    is_fullscreen: false, graph_no: 0, next_graph_no_to_add: 0, nof_quiz_started: 0,
  });
  clear_cookies();
  set_url('');
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
  jest.restoreAllMocks();
});

describe('fullscreen', () => {
  const ELEM_METHODS = ['requestFullscreen', 'webkitRequestFullscreen', 'msRequestFullscreen'];
  const DOC_METHODS = ['exitFullscreen', 'webkitExitFullscreen', 'msExitFullscreen'];
  const remove_methods = () => {
    for (const name of ELEM_METHODS) delete document.documentElement[name];
    for (const name of DOC_METHODS) delete document[name];
  };
  beforeEach(remove_methods);
  afterEach(remove_methods);

  test('toggle_fullscreen when windowed logs, awards the achievement and opens fullscreen', () => {
    document.documentElement.requestFullscreen = jest.fn();
    window.toggle_fullscreen();
    expect(window.add_event).toHaveBeenCalledWith('go_fullscreen');
    expect(window.achievement_done).toHaveBeenCalledWith('go_fullscreen');
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(global_value('is_fullscreen')).toBe(true);
  });

  test('toggle_fullscreen when fullscreen closes it without logging again', () => {
    document.exitFullscreen = jest.fn();
    set_globals({ is_fullscreen: true });
    window.toggle_fullscreen();
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(global_value('is_fullscreen')).toBe(false);
    expect(window.add_event).not.toHaveBeenCalled();
    expect(window.achievement_done).not.toHaveBeenCalled();
  });

  test('openFullscreen falls back to the webkit, then the ms, prefixed method', () => {
    document.documentElement.webkitRequestFullscreen = jest.fn();
    window.openFullscreen();
    expect(document.documentElement.webkitRequestFullscreen).toHaveBeenCalledTimes(1);
    expect(global_value('is_fullscreen')).toBe(true);

    delete document.documentElement.webkitRequestFullscreen;
    set_globals({ is_fullscreen: false });
    document.documentElement.msRequestFullscreen = jest.fn();
    window.openFullscreen();
    expect(document.documentElement.msRequestFullscreen).toHaveBeenCalledTimes(1);
    expect(global_value('is_fullscreen')).toBe(true);
  });

  test('openFullscreen prefers the standard method over the prefixed ones', () => {
    document.documentElement.requestFullscreen = jest.fn();
    document.documentElement.webkitRequestFullscreen = jest.fn();
    window.openFullscreen();
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(document.documentElement.webkitRequestFullscreen).not.toHaveBeenCalled();
  });

  test('openFullscreen without any fullscreen API leaves the flag unchanged', () => {
    window.openFullscreen();
    expect(global_value('is_fullscreen')).toBe(false);
  });

  test('closeFullscreen falls back to the webkit, then the ms, prefixed method', () => {
    set_globals({ is_fullscreen: true });
    document.webkitExitFullscreen = jest.fn();
    window.closeFullscreen();
    expect(document.webkitExitFullscreen).toHaveBeenCalledTimes(1);
    expect(global_value('is_fullscreen')).toBe(false);

    delete document.webkitExitFullscreen;
    set_globals({ is_fullscreen: true });
    document.msExitFullscreen = jest.fn();
    window.closeFullscreen();
    expect(document.msExitFullscreen).toHaveBeenCalledTimes(1);
    expect(global_value('is_fullscreen')).toBe(false);
  });

  test('closeFullscreen prefers the standard method over the prefixed ones', () => {
    document.exitFullscreen = jest.fn();
    document.webkitExitFullscreen = jest.fn();
    window.closeFullscreen();
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(document.webkitExitFullscreen).not.toHaveBeenCalled();
  });

  test('closeFullscreen without any fullscreen API leaves the flag unchanged', () => {
    set_globals({ is_fullscreen: true });
    window.closeFullscreen();
    expect(global_value('is_fullscreen')).toBe(true);
  });
});

describe('initial_graph', () => {
  const welcome = () => document.getElementById('welcome_text');

  test('adds the next preset graph and advances the counters', () => {
    window.initial_graph();
    expect(window.addNewGraph).toHaveBeenLastCalledWith(null, global_value('GRAPH_ORDER')[0]);
    expect(global_value('graph_no')).toBe(1);
    expect(global_value('next_graph_no_to_add')).toBe(1);
    window.initial_graph();
    expect(window.addNewGraph).toHaveBeenLastCalledWith(null, global_value('GRAPH_ORDER')[1]);
    expect(global_value('graph_no')).toBe(2);
    expect(global_value('next_graph_no_to_add')).toBe(2);
  });

  test('offers the initial quiz while no quiz has been started', () => {
    window.initial_graph();
    expect(welcome().querySelector('#initial_quiz_icon')).not.toBeNull();
    expect(welcome().textContent).toContain('Take the initial quiz');
    expect(welcome().querySelector('span').getAttribute('onclick')).toBe('toggle_quiz()');
  });

  test('clears the welcome text once a quiz has been started', () => {
    welcome().innerHTML = '<b>old</b>';
    set_globals({ nof_quiz_started: 1 });
    window.initial_graph();
    expect(welcome().innerHTML).toBe('');
  });
});

describe('cookies', () => {
  test('set_cookie stores a value for the whole site, expiring exdays from now', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const writes = [];
      Object.defineProperty(document, 'cookie', {
        configurable: true, get: () => '', set: (value) => { writes.push(value); },
      });
      window.set_cookie('cookid', '123', 50);
      delete document.cookie;
      expect(writes).toEqual(['cookid=123;expires=Fri, 20 Feb 2026 00:00:00 GMT;path=/']);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a cookie written by set_cookie is read back by get_cookie', () => {
    window.set_cookie('cookid', '987654321', 50);
    expect(window.get_cookie('cookid')).toBe('987654321');
  });

  test('get_cookie returns an empty string for a missing cookie', () => {
    expect(window.get_cookie('cookid')).toBe('');
  });

  test('get_cookie picks the right cookie among several, ignoring spaces', () => {
    window.set_cookie('first', 'a', 1);
    window.set_cookie('cookid', '42', 1);
    window.set_cookie('last', 'z', 1);
    expect(window.get_cookie('first')).toBe('a');
    expect(window.get_cookie('cookid')).toBe('42');
    expect(window.get_cookie('last')).toBe('z');
  });

  test('get_cookie does not match a cookie whose name only ends with the wanted name', () => {
    window.set_cookie('xcookid', '1', 1);
    expect(window.get_cookie('cookid')).toBe('');
  });

  test('get_cookie URI-decodes the value', () => {
    document.cookie = 'name=a%20b%3Bc;path=/';
    expect(window.get_cookie('name')).toBe('a b');
  });

  test('a cookie with a negative lifetime is removed', () => {
    window.set_cookie('cookid', '5', 1);
    window.set_cookie('cookid', '5', -1);
    expect(window.get_cookie('cookid')).toBe('');
  });
});

describe('setup()', () => {
  // A fake WebGL context with the debug renderer extension.
  const fake_gl = (extension = { UNMASKED_RENDERER_WEBGL: 'ur', UNMASKED_VENDOR_WEBGL: 'uv' }) => ({
    RENDERER: 'r',
    getParameter: (key) => ({ r: 'GPU', ur: 'Unmasked GPU', uv: 'Vendor X' }[key]),
    getExtension: jest.fn(() => extension),
  });
  const use_gl = (gl) => jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => gl);
  const use_user_agent = (value) => jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue(value);
  const dark_mode = (matches) => { window.matchMedia = jest.fn(() => ({ matches })); };

  beforeEach(() => {
    use_gl(null);
    dark_mode(false);
  });
  afterEach(() => { delete window.matchMedia; });

  describe('URL parameters', () => {
    test('?debug switches debug_mode on', () => {
      set_url('?debug');
      window.setup();
      expect(global_value('debug_mode')).toBe(true);
    });

    test('without ?debug debug_mode stays off', () => {
      set_url('?other=1');
      window.setup();
      expect(global_value('debug_mode')).toBe(false);
    });

    test('?p=<place> tags the session with the place', () => {
      set_url('?p=Lund');
      window.setup();
      expect(global_value('client_place')).toBe('Lund');
    });

    test('the place keeps Swedish letters and digits and replaces everything else with _', () => {
      set_url('?p=' + encodeURIComponent('Åre ÄÖ åäö 2024/x-y.z'));
      window.setup();
      expect(global_value('client_place')).toBe('Åre_ÄÖ_åäö_2024_x_y_z');
    });

    test('a semicolon or backslash in the place is neutralised', () => {
      set_url('?p=' + encodeURIComponent('a;b\\c'));
      window.setup();
      expect(global_value('client_place')).toBe('a_b_c');
    });

    test('every semicolon and backslash in the place is neutralised, not just the first', () => {
      set_url('?p=' + encodeURIComponent('a;b;c\\d\\e'));
      window.setup();
      expect(global_value('client_place')).toBe('a_b_c_d_e');
    });

    test('without ?p the place is left alone', () => {
      set_url('?debug');
      set_globals({ client_place: 'kept' });
      window.setup();
      expect(global_value('client_place')).toBe('kept');
    });

    test('?p and ?debug work together', () => {
      set_url('?debug&p=Room_1');
      window.setup();
      expect(global_value('client_place')).toBe('Room_1');
      expect(global_value('debug_mode')).toBe(true);
    });

    test('an empty ?p= gives an empty place', () => {
      set_url('?p=');
      window.setup();
      expect(global_value('client_place')).toBe('');
    });
  });

  describe('client cookie id', () => {
    test('a first visit draws a random 31-bit id, logs and stores it in the cookid cookie', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      window.setup();
      expect(global_value('client_cookid')).toBe('1073741824');
      expect(events()).toContain('set_cookid=1073741824');
      expect(events().some((e) => e.startsWith('got_cookid='))).toBe(false);
      expect(window.get_cookie('cookid')).toBe('1073741824');
    });

    test('the id stays below 2^31 even for a random value just below 1', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9999999999);
      window.setup();
      expect(global_value('client_cookid')).toBe('2147483647');
      expect(Number(global_value('client_cookid'))).toBeLessThan(2 ** 31);
    });

    test('a return visit reuses the stored id', () => {
      document.cookie = 'cookid=555;path=/';
      const random = jest.spyOn(Math, 'random');
      window.setup();
      expect(global_value('client_cookid')).toBe('555');
      expect(events()).toContain('got_cookid=555');
      expect(events().some((e) => e.startsWith('set_cookid='))).toBe(false);
      expect(random).not.toHaveBeenCalled();
    });

    test('the id persists across two setup() calls', () => {
      window.setup();
      const first = global_value('client_cookid');
      expect(first).not.toBe('');
      set_globals({ client_cookid: -1 });
      window.setup();
      expect(global_value('client_cookid')).toBe(first);
      expect(events()).toContain('got_cookid=' + first);
    });
  });

  describe('a stored choice to turn tracking off', () => {
    test('makes no id, sets no cookie and logs nothing about one', () => {
      document.cookie = 'tracking_off=1;path=/';
      window.setup();
      expect(global_value('client_cookid')).toBe(-1);
      expect(window.get_cookie('cookid')).toBe('');
      expect(events().some((e) => e.includes('cookid'))).toBe(false);
    });

    test('any other value of the cookie is not a choice', () => {
      document.cookie = 'tracking_off=0;path=/';
      window.setup();
      expect(global_value('client_cookid')).not.toBe(-1);
    });
  });

  describe('telemetry events', () => {
    test('logs the setup time first and then the environment', () => {
      window.setup();
      const logged = events();
      expect(logged[0]).toMatch(/^setup=/);
      expect(logged[0]).toBe('setup=' + global_value('start_date').toLocaleString().replace(' ', ''));
      expect(logged.some((e) => e.startsWith('set_cookid='))).toBe(true);
      expect(logged).toContain('lang=' + navigator.language);
      expect(logged).toContain('tz=' + Intl.DateTimeFormat().resolvedOptions().timeZone);
      expect(logged).toContain('nof_cores=' + navigator.hardwareConcurrency);
      expect(logged).toContain('ram_gb=' + navigator.deviceMemory);
      expect(logged).toContain('platform=' + navigator.platform);
      expect(logged).toContain('ref=' + document.referrer);
    });

    test('reports the theme from the prefers-color-scheme media query', () => {
      dark_mode(true);
      window.setup();
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(events()).toContain('theme=dark_mode');
      expect(events()).not.toContain('theme=light_mode');

      window.add_event.mockClear();
      dark_mode(false);
      window.setup();
      expect(events()).toContain('theme=light_mode');
      expect(events()).not.toContain('theme=dark_mode');
    });

    test('reports light mode when matchMedia is unavailable', () => {
      delete window.matchMedia;
      window.setup();
      expect(events()).toContain('theme=light_mode');
      expect(events().some((e) => e.startsWith('nof_cores='))).toBe(true);
    });

    test('logs no gpu info when WebGL is unavailable', () => {
      window.setup();
      expect(events().some((e) => e.startsWith('gpu'))).toBe(false);
    });

    test('logs the renderer and, outside Firefox, the unmasked renderer and vendor', () => {
      const gl = fake_gl();
      use_gl(gl);
      use_user_agent('Mozilla/5.0 Chrome/120');
      window.setup();
      expect(events()).toEqual(expect.arrayContaining([
        'gpu=GPU', 'gpu2=Unmasked GPU', 'gpu_vendor=Vendor X',
      ]));
      expect(gl.getExtension).toHaveBeenCalledWith('WEBGL_debug_renderer_info');
    });

    test('in Firefox only the basic renderer is requested', () => {
      const gl = fake_gl();
      use_gl(gl);
      use_user_agent('Mozilla/5.0 Gecko/20100101 Firefox/120');
      window.setup();
      expect(events()).toContain('gpu=GPU');
      expect(events().some((e) => e.startsWith('gpu2=') || e.startsWith('gpu_vendor='))).toBe(false);
      expect(gl.getExtension).not.toHaveBeenCalled();
    });

    test('a missing debug extension does not stop the rest of setup', () => {
      use_gl(fake_gl(null));
      use_user_agent('Mozilla/5.0 Chrome/120');
      window.setup();
      expect(events()).toContain('gpu=GPU');
      expect(events().some((e) => e.startsWith('gpu2='))).toBe(false);
      expect(events().some((e) => e.startsWith('lang='))).toBe(true);
      expect(window.createCanvas).toHaveBeenCalledTimes(1);
    });

    test('every probe is guarded: failures in one do not stop setup or the other probes', () => {
      const failing = ['tz=', 'lang=', 'theme=', 'nof_cores=', 'ram_gb=', 'platform=', 'ref='];
      window.add_event = jest.fn((string) => {
        if (failing.some((prefix) => string.startsWith(prefix))) throw new Error('boom');
      });
      expect(() => window.setup()).not.toThrow();
      expect(window.add_event.mock.calls.length).toBeGreaterThanOrEqual(failing.length);
      expect(window.createCanvas).toHaveBeenCalledTimes(1);
      expect(window.init_quiz).toHaveBeenCalledTimes(1);
    });
  });

  describe('p5 initialisation', () => {
    test('computes the plot geometry before creating a canvas of that size in #sketch_holder', () => {
      const order = [];
      window.setGraphDimensions = jest.fn(() => order.push('dimensions'));
      const parent = jest.fn();
      window.createCanvas = jest.fn(() => { order.push('canvas'); return { parent }; });
      window.setup();
      expect(order).toEqual(['dimensions', 'canvas']);
      expect(window.createCanvas).toHaveBeenCalledWith(global_value('canvas_width'), global_value('canvas_height'));
      expect(parent).toHaveBeenCalledWith('sketch_holder');
    });

    test('sets up colours, stops the draw loop and starts the quiz module', () => {
      window.setup();
      expect(window.colorMode).toHaveBeenCalledWith(window.HSB, 360);
      expect(window.color).toHaveBeenCalledWith('hsb(0,0%,4%)');
      expect(window.color).toHaveBeenCalledWith('hsb(0,0%,22%)');
      expect(window.color).toHaveBeenCalledWith('hsb(0,0%,20%)');
      expect(global_value('background_color')).toEqual(['hsb(0,0%,4%)']);
      expect(global_value('line_color')).toEqual(['hsb(0,0%,22%)']);
      expect(global_value('text_color')).toEqual(['hsb(0,0%,20%)']);
      expect(global_value('box_background_color')).toBe(120);
      expect(global_value('angle_color')).toBe('#ff40ff');
      expect(global_value('id_bank')).toBe(0);
      expect(window.noLoop).toHaveBeenCalledTimes(1);
      expect(window.init_quiz).toHaveBeenCalledTimes(1);
    });

    test('maps every slider variable name to its index', () => {
      window.setup();
      const alphabet = global_value('range_slider_alphabet');
      const positions = global_value('variable_position');
      expect(alphabet.length).toBeGreaterThan(0);
      alphabet.forEach((letter, index) => expect(positions[letter]).toBe(index));
      expect(positions.T_1).toBe(alphabet.indexOf('T_1'));
    });

    test('reveals the footer and the information panel', () => {
      const footer = document.getElementsByClassName('footer')[0];
      const information = document.getElementsByClassName('graph-information')[0];
      footer.style.display = 'none';
      information.style.display = 'none';
      window.setup();
      expect(footer.style.display).toBe('inline');
      expect(information.style.display).toBe('inline');
    });
  });

  test('with debug_mode on every logged event reaches the console', () => {
    // add_event is spied above; use the real one to check the debug wiring end to end.
    window.add_event = originals.add_event;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    set_url('?debug');
    window.setup();
    expect(log.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining([
      expect.stringMatching(/^Event:setup=/), expect.stringMatching(/^Event:set_cookid=/),
    ]));
  });
});

describe('restore_tracking_choice', () => {
  const checkbox = () => document.getElementById('tracking_checkbox');
  // The box lives in the splash text, which the other tests replace, as the app does after the splash.
  beforeEach(() => {
    document.getElementById('welcome_text').innerHTML = '<input type="checkbox" id="tracking_checkbox" checked>';
    set_globals({ improvement_enabled: true });
  });

  test('a stored choice turns tracking off and unticks the box', () => {
    document.cookie = 'tracking_off=1;path=/';
    window.restore_tracking_choice();
    expect(global_value('improvement_enabled')).toBe(false);
    expect(checkbox().checked).toBe(false);
  });

  test('without one tracking stays on and the box stays ticked', () => {
    window.restore_tracking_choice();
    expect(global_value('improvement_enabled')).toBe(true);
    expect(checkbox().checked).toBe(true);
  });
});

describe('ready() and the start-up hook', () => {
  // ready() can only run once on the page (it replaces the class of .input-equation, which it
  // later looks the element up by), so it runs here once, with spies installed, and the tests
  // inspect what that single run did.
  const document_handlers = {};
  const boot = {}; // the spies that were installed while ready() ran
  let interval;
  let tracking_at_first_spy_call; // ready() logs through these, for example set_difficulty_level

  beforeAll(() => {
    for (const name of SPYABLE) {
      window[name] = jest.fn(() => {
        if (tracking_at_first_spy_call === undefined) tracking_at_first_spy_call = global_value('improvement_enabled');
      });
      boot[name] = window[name];
    }
    set_globals({ improvement_enabled: true });
    document.cookie = 'tracking_off=1;path=/';
    document.getElementById('welcome_text').innerHTML = '<input type="checkbox" id="tracking_checkbox" checked>';
    document.getElementById('hover_answer').style.visibility = 'visible';
    // Capture the document listeners instead of registering them for real.
    const add_listener = document.addEventListener;
    document.addEventListener = jest.fn((type, handler) => { document_handlers[type] = handler; });
    interval = jest.spyOn(window, 'setInterval').mockImplementation(() => 7);
    // The start-up hook registered ready() for DOMContentLoaded because document.readyState
    // was 'loading' while the scripts ran; firing the event is what the browser does.
    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.addEventListener = add_listener;
  });

  afterAll(() => {
    interval.mockRestore();
    for (const name of SPYABLE) window[name] = originals[name];
  });

  test('ready() ran once the DOMContentLoaded event fired', () => {
    expect(boot.prepare_banner).toHaveBeenCalledTimes(1);
  });

  test('a stored choice to turn tracking off applies before ready() does anything that can log', () => {
    expect(tracking_at_first_spy_call).toBe(false);
  });

  test('listens to keydown, contextmenu and visibilitychange on the document', () => {
    expect(Object.keys(document_handlers).sort()).toEqual(['contextmenu', 'keydown', 'visibilitychange']);
  });

  test('wires the add-graph button to addNewGraphClicked', () => {
    document.getElementsByClassName('add-graph')[0].click();
    expect(boot.addNewGraphClicked).toHaveBeenCalledTimes(1);
    expect(boot.view_settings).not.toHaveBeenCalled();
  });

  test('wires the first option button to view_settings', () => {
    document.getElementsByClassName('option-button')[0].click();
    expect(boot.view_settings).toHaveBeenCalledTimes(1);
  });

  test('wires the formula field to updateInputFormula', () => {
    document.getElementById('input-formula').dispatchEvent(new Event('input'));
    expect(boot.updateInputFormula).toHaveBeenCalledTimes(1);
  });

  test('shows the input equation selector and hides the hover answer', () => {
    expect(document.getElementById('input-formula').closest('.active')).not.toBeNull();
    expect(document.getElementById('input-formula').closest('.active').className).toBe('active');
    expect(document.getElementById('hover_answer').style.visibility).toBe('hidden');
  });

  test('enables gamification, assignments, medium difficulty and the quiz from the start', () => {
    expect(boot.toggle_gamification).toHaveBeenCalledTimes(1);
    expect(boot.toggle_assignments).toHaveBeenCalledTimes(1);
    expect(boot.set_difficulty_level).toHaveBeenCalledWith({ value: 50 });
    expect(boot.toggle_quiz_enabled).toHaveBeenCalledTimes(1);
  });

  test('schedules timer_feedback every fb_popup_interval seconds', () => {
    expect(interval).toHaveBeenCalledTimes(1);
    expect(interval).toHaveBeenCalledWith(boot.timer_feedback, global_value('fb_popup_interval') * 1000);
  });

  test('F2 starts the quiz and other keys do nothing', () => {
    document_handlers.keydown({ key: 'F2' });
    expect(window.start_quiz).toHaveBeenCalledTimes(1);
    expect(window.restart_lupze).not.toHaveBeenCalled();
    for (const key of ['F1', 'F3', 'a', 'Enter']) document_handlers.keydown({ key });
    expect(window.start_quiz).toHaveBeenCalledTimes(1);
    expect(window.restart_lupze).not.toHaveBeenCalled();
  });

  test('Escape restarts the app', () => {
    document_handlers.keydown({ key: 'Escape' });
    expect(window.restart_lupze).toHaveBeenCalledTimes(1);
    expect(window.start_quiz).not.toHaveBeenCalled();
  });

  test('a right click opens the question help instead of the browser menu', () => {
    const event = { preventDefault: jest.fn() };
    document_handlers.contextmenu(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(window.questionsToggle).toHaveBeenCalledTimes(1);
    expect(window.add_event).toHaveBeenCalledWith('ask_a_question');
    expect(window.achievement_done).toHaveBeenCalledWith('ask_a_question');
  });

  test('hiding and showing the page is logged', () => {
    let hidden = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    try {
      document_handlers.visibilitychange();
      hidden = false;
      document_handlers.visibilitychange();
    } finally {
      delete document.hidden;
    }
    expect(events()).toEqual(['LU-PZE_hidden', 'LU-PZE_visible']);
  });

  describe('start-up hook', () => {
    // The hook is the last statement of app_setup.js. Re-running that text with a chosen
    // document.readyState and a spy for ready() shows what it does at load time.
    const hook_source = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'src', 'app_setup.js'), 'utf8',
    ).split('// Start the app')[1].replace(/^[^\n]*\n[^\n]*\n/, '');
    const original_ready = window.ready;
    afterEach(() => { window.ready = original_ready; });
    const run_hook = (ready_state) => {
      Object.defineProperty(document, 'readyState', { configurable: true, get: () => ready_state });
      try {
        window.eval(hook_source);
      } finally {
        delete document.readyState;
      }
    };

    test('while loading, ready() waits for DOMContentLoaded', () => {
      window.ready = jest.fn();
      const add = jest.spyOn(document, 'addEventListener').mockImplementation(() => {});
      run_hook('loading');
      expect(window.ready).not.toHaveBeenCalled();
      expect(add).toHaveBeenCalledWith('DOMContentLoaded', window.ready);
    });

    test.each(['interactive', 'complete'])('when the page is already %s, ready() runs at once', (state) => {
      window.ready = jest.fn();
      const add = jest.spyOn(document, 'addEventListener').mockImplementation(() => {});
      run_hook(state);
      expect(window.ready).toHaveBeenCalledTimes(1);
      expect(add).not.toHaveBeenCalled();
    });
  });
});
