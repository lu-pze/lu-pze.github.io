/** @jest-environment jsdom */
// Tests for src/dialogs_scripts.js: opening/closing the settings and info windows, the script
// export box, and the generated Python / Julia / MATLAB code for each preset graph.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = ['add_event', 'achievement_done'];
const originals = {};

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
});

// Slider values per variable, chosen so every value is distinguishable in the output.
const SLIDERS = { k_1: 2, T_1: 1.5, k_2: 3, T_2: 1, T_3: 0.4, k_3: 2.5, w: 3, z: 0.3 };

// graph id used for every graph created by `use_graph`.
const GRAPH_ID = 7;

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  set_globals({ improvement_enabled: false, current_tab: 0 });
  const alphabet = global_value('range_slider_alphabet');
  const variable_position = global_value('variable_position');
  alphabet.forEach((name, i) => { variable_position[name] = i; });
  const variables = global_value('range_slider_variables');
  for (const [name, value] of Object.entries(SLIDERS)) variables[variable_position[name]] = value;
  window.eval('bode_graphs.length = 0');
  for (const selector of ['.toolbox', '.info', '.download_script_box']) {
    document.querySelector(selector).classList.remove('active');
  }
  document.getElementById('download_script_box').innerHTML = '';
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
});

// Puts a bode_graph for the given formula into bode_graphs, as addNewGraph would.
function use_graph(formula, id = GRAPH_ID) {
  window.eval(`bode_graphs.push(new bode_graph(${id}, ${JSON.stringify(formula)}))`);
}

const preset = (name) => global_value(name);
const events = () => window.add_event.mock.calls.map((call) => call[0]);
const is_active = (selector) => document.querySelector(selector).classList.contains('active');
// Generated scripts use <br> as the line separator (they go into innerHTML).
const lines = (script) => script.split('<br>');

// The three presets that have an export, with the expected variable lines per language.
const EXPORTABLE = [
  {
    preset: 'GRAPH_ONE_REAL_POLE',
    python: ['k_1 = 2', 'T_1 = 1.5', 'num = [k_1]', 'den = [T_1, 1]'],
    julia: ['k_1 = 2', 'T_1 = 1.5', 'num = [k_1]', 'den = [T_1, 1]'],
    matlab: ['k_1 = 2;', 'T_1 = 1.5;', 'num = [k_1];', 'den = [T_1, 1];'],
  },
  {
    preset: 'GRAPH_TWO_REAL_POLES',
    python: ['k_2 = 3', 'T_2 = 1', 'T_3 = 0.4', 'num = [k_2]', 'den = [T_2*T_3, T_2+T_3, 1]'],
    julia: ['k_2 = 3', 'T_2 = 1', 'T_3 = 0.4', 'num = [k_2]', 'den = [T_2*T_3, T_2+T_3, 1]'],
    matlab: ['k_2 = 3;', 'T_2 = 1;', 'T_3 = 0.4;', 'num = [k_2];', 'den = [T_2*T_3, T_2+T_3, 1];'],
  },
  {
    preset: 'GRAPH_TWO_COMPLEX_POLES',
    python: ['k_3 = 2.5', 'w = 3', 'z = 0.3', 'num = [k_3*w*w]', 'den = [1, 2*z*w, w*w]'],
    julia: ['k_3 = 2.5', 'w = 3', 'z = 0.3', 'num = [k_3*w*w]', 'den = [1, 2*z*w, w*w]'],
    matlab: ['k_3 = 2.5;', 'w = 3;', 'z = 0.3;', 'num = [k_3*w*w];', 'den = [1, 2*z*w, w*w];'],
  },
];

// Presets without an export: every other entry of GRAPH_ORDER.
const NOT_EXPORTABLE = [
  'GRAPH_TIME_DELAY', 'GRAPH_ONE_ZERO_TWO_POLES', 'GRAPH_FOUR_POLES', 'GRAPH_ONE_ZERO', 'GRAPH_PID',
  'GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_ONE_POLE_WITH_PID_YL',
  'GRAPH_ONE_POLE_WITH_PID_OPEN',
];

describe('settings and info windows', () => {
  test('view_settings opens the toolbox, closes the others and logs', () => {
    document.querySelector('.info').classList.add('active');
    window.view_settings({});
    expect(is_active('.toolbox')).toBe(true);
    expect(is_active('.info')).toBe(false);
    expect(events()).toEqual(['view_settings']);
  });

  test('hide_settings closes the toolbox and logs', () => {
    window.view_settings({});
    window.add_event.mockClear();
    window.hide_settings({});
    expect(is_active('.toolbox')).toBe(false);
    expect(events()).toEqual(['hide_settings']);
  });

  test('view_info opens the info window, closes the toolbox, logs and awards the achievement', () => {
    document.querySelector('.toolbox').classList.add('active');
    window.view_info({});
    expect(is_active('.info')).toBe(true);
    expect(is_active('.toolbox')).toBe(false);
    expect(events()).toEqual(['view_info']);
    expect(window.achievement_done).toHaveBeenCalledWith('view_info');
  });

  test('view_info twice leaves the window open (remove_all_windows runs before the toggle)', () => {
    window.view_info({});
    window.view_info({});
    expect(is_active('.info')).toBe(true);
  });

  test('hide_info closes the info window and logs', () => {
    window.view_info({});
    window.add_event.mockClear();
    window.hide_info({});
    expect(is_active('.info')).toBe(false);
    expect(events()).toEqual(['hide_info']);
  });

  test('showInputFunction stores the selected tab', () => {
    window.showInputFunction(2);
    expect(global_value('current_tab')).toBe(2);
  });
});

describe('copy_code', () => {
  let write_text;
  beforeEach(() => {
    write_text = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write_text } });
    document.getElementById('download_script_box').innerHTML = '<div id="the_code">a = 1<br>b = 2<br>c = 3</div>';
  });
  afterEach(() => { delete navigator.clipboard; });

  test('copies the code with <br> turned back into newlines', async () => {
    await global_value('copy_code')();
    expect(write_text).toHaveBeenCalledWith('a = 1\nb = 2\nc = 3');
  });

  test('a rejected clipboard write is swallowed', async () => {
    write_text.mockRejectedValue(new Error('denied'));
    await expect(global_value('copy_code')()).resolves.toBeUndefined();
  });
});

describe('download_script box', () => {
  beforeEach(() => use_graph(preset('GRAPH_ONE_REAL_POLE').formula));

  test('builds the box with a language selector wired to the graph id and shows Python first', () => {
    window.download_script(GRAPH_ID);
    const box = document.getElementById('download_script_box');
    const select = document.getElementById('language-choices');
    expect(select.getAttribute('onchange')).toBe(`update_programming_language(${GRAPH_ID})`);
    expect([...select.options].map((option) => option.value)).toEqual(['Python', 'MATLAB', 'Julia']);
    expect(box.querySelector('.copy-button').getAttribute('onclick')).toBe('copy_code()');
    expect(box.querySelector('.close-window').getAttribute('onclick')).toBe('hide_script()');
    expect(is_active('.download_script_box')).toBe(true);
    expect(document.getElementById('the_code').innerHTML).toContain('import control');
  });

  test.each([
    ['Python', 'control.tf(num, den)'],
    ['Julia', 'using ControlSystems'],
    ['MATLAB', 'transfer_function = tf(num,den)'],
  ])('choosing %s fills the code area', (language, marker) => {
    window.download_script(GRAPH_ID);
    document.getElementById('language-choices').value = language;
    window.update_programming_language(GRAPH_ID);
    const shown = document.getElementById('the_code').innerHTML;
    expect(shown).toContain(marker);
    expect(shown).toContain('k_1');
  });

  test('the displayed code is the generated script (innerHTML round trip keeps the <br> separators)', () => {
    window.download_script(GRAPH_ID);
    const expected = window.get_python_script(GRAPH_ID);
    expect(document.getElementById('the_code').innerHTML).toBe(expected);
  });

  test('hide_script toggles the box (a second call after opening hides it)', () => {
    window.download_script(GRAPH_ID);
    expect(is_active('.download_script_box')).toBe(true);
    window.hide_script();
    expect(is_active('.download_script_box')).toBe(false);
  });

  test('opening the box twice closes it again (toggle)', () => {
    window.download_script(GRAPH_ID);
    window.download_script(GRAPH_ID);
    expect(is_active('.download_script_box')).toBe(false);
  });

  test('a preset without an export shows an empty code area', () => {
    window.eval('bode_graphs.length = 0');
    use_graph(preset('GRAPH_PID').formula);
    window.download_script(GRAPH_ID);
    expect(document.getElementById('the_code').innerHTML).toBe('');
  });
});

describe.each(EXPORTABLE)('exported scripts for $preset', (spec) => {
  beforeEach(() => use_graph(preset(spec.preset).formula));

  test('Python: variables, numerator and denominator in order', () => {
    const script = lines(window.get_python_script(GRAPH_ID));
    const start = script.indexOf('# Creating the transfer function:');
    expect(start).toBeGreaterThan(-1);
    expect(script.slice(start + 1, start + 1 + spec.python.length)).toEqual(spec.python);
    expect(script[start + 1 + spec.python.length]).toBe('system = control.tf(num, den)');
  });

  test('Julia: variables, numerator and denominator in order', () => {
    const script = lines(window.get_julia_script(GRAPH_ID));
    const start = script.indexOf('# Creating the transfer function:');
    expect(start).toBeGreaterThan(-1);
    expect(script.slice(start + 1, start + 1 + spec.julia.length)).toEqual(spec.julia);
    expect(script[start + 1 + spec.julia.length]).toBe('system = tf(num, den)');
  });

  test('MATLAB: variables, numerator and denominator in order', () => {
    const script = lines(window.get_matlab_script(GRAPH_ID));
    const start = script.indexOf('% Define poles and zeroes:');
    expect(start).toBeGreaterThan(-1);
    expect(script.slice(start + 1, start + 1 + spec.matlab.length)).toEqual(spec.matlab);
    expect(script[start + 1 + spec.matlab.length]).toBe('');
    expect(script[start + 2 + spec.matlab.length]).toBe('% Create transfer function:');
  });

  test('scripts contain no raw newlines (they are rendered through innerHTML)', () => {
    for (const script of [window.get_python_script(GRAPH_ID), window.get_julia_script(GRAPH_ID), window.get_matlab_script(GRAPH_ID)]) {
      expect(script).not.toMatch(/[\r\n]/);
      expect(script).toContain('<br>');
    }
  });

  test('each call logs its own event; Python and MATLAB (not Julia) award an achievement', () => {
    window.get_python_script(GRAPH_ID);
    window.get_julia_script(GRAPH_ID);
    window.get_matlab_script(GRAPH_ID);
    expect(events()).toEqual(['get_python_script', 'get_julia_script', 'get_matlab_script']);
    expect(window.achievement_done.mock.calls.map((call) => call[0])).toEqual(['python_script', 'matlab_script']);
  });

  test('full scripts (snapshot)', () => {
    expect({
      python: lines(window.get_python_script(GRAPH_ID)),
      julia: lines(window.get_julia_script(GRAPH_ID)),
      matlab: lines(window.get_matlab_script(GRAPH_ID)),
    }).toMatchSnapshot();
  });
});

describe('exported scripts follow the current slider values', () => {
  test('changing a slider changes the script', () => {
    use_graph(preset('GRAPH_ONE_REAL_POLE').formula);
    const variables = global_value('range_slider_variables');
    variables[global_value('variable_position').T_1] = 0.25;
    expect(window.get_python_script(GRAPH_ID)).toContain('T_1 = 0.25');
    expect(window.get_julia_script(GRAPH_ID)).toContain('T_1 = 0.25');
    expect(window.get_matlab_script(GRAPH_ID)).toContain('T_1 = 0.25;');
  });

  test('the graph is looked up by id among several graphs', () => {
    use_graph(preset('GRAPH_ONE_REAL_POLE').formula, 1);
    use_graph(preset('GRAPH_TWO_REAL_POLES').formula, 2);
    use_graph(preset('GRAPH_TWO_COMPLEX_POLES').formula, 3);
    expect(window.get_python_script(1)).toContain('den = [T_1, 1]');
    expect(window.get_python_script(2)).toContain('den = [T_2*T_3, T_2+T_3, 1]');
    expect(window.get_python_script(3)).toContain('den = [1, 2*z*w, w*w]');
    // bode_id is compared with ==, so a string id works too
    expect(window.get_matlab_script('2')).toContain('T_3 = 0.4;');
  });
});

describe('graphs without an export', () => {
  test.each(NOT_EXPORTABLE)('%s gives an empty script in all three languages', (name) => {
    use_graph(preset(name).formula);
    expect(window.get_python_script(GRAPH_ID)).toBe('');
    expect(window.get_julia_script(GRAPH_ID)).toBe('');
    expect(window.get_matlab_script(GRAPH_ID)).toBe('');
  });

  test('a user-typed formula gives an empty script', () => {
    use_graph('1/((s+1)^2)');
    expect(window.get_python_script(GRAPH_ID)).toBe('');
  });

  test('the events are still logged for an unsupported graph', () => {
    use_graph(preset('GRAPH_PID').formula);
    window.get_python_script(GRAPH_ID);
    window.get_julia_script(GRAPH_ID);
    window.get_matlab_script(GRAPH_ID);
    expect(events()).toEqual(['get_python_script', 'get_julia_script', 'get_matlab_script']);
  });

  test('the NOT_EXPORTABLE list plus the exportable presets covers GRAPH_ORDER', () => {
    const covered = [...EXPORTABLE.map((spec) => spec.preset), ...NOT_EXPORTABLE].map((name) => preset(name));
    const order = global_value('GRAPH_ORDER');
    expect(covered).toHaveLength(order.length);
    for (const graph of order) expect(covered).toContain(graph);
  });

  // Characterization: an id that matches no graph is not handled; the script functions throw.
  test('an unknown graph id throws a TypeError', () => {
    expect(() => window.get_python_script(999)).toThrow(TypeError);
    expect(() => window.get_julia_script(999)).toThrow(TypeError);
    expect(() => window.get_matlab_script(999)).toThrow(TypeError);
  });
});
