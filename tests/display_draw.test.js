// Tests for src/display_draw.js: display settings (stroke weight, light/dark mode, input signal
// list), the graph-information tabs, plot geometry (setGraphDimensions, windowResized), the
// numeric axis helpers, and the p5 draw() with every draw_* function. The p5 drawing functions
// are replaced by a recorder so the tests can check what was drawn where; every drawing call is
// also checked for NaN/Infinity coordinates.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const P5_RECORDED = ['arc', 'background', 'beginShape', 'ellipse', 'endShape', 'fill', 'line', 'noFill',
  'noStroke', 'pop', 'push', 'rect', 'rotate', 'stroke', 'strokeWeight', 'text', 'textAlign', 'textSize',
  'translate', 'vertex'];
// Cross-file functions that are spied on (restored after every test).
const SPYABLE = ['add_event', 'achievement_done', 'redraw', 'resizeCanvas'];
const REPLACED = [...P5_RECORDED, ...SPYABLE, 'map', 'color', 'draw_X', 'draw_O', 'draw_static_gain', 'draw_bode_responses',
  'draw_time_responses', 'draw_nyquist_responses', 'draw_pole_zeros', 'x_axis_steps_text',
  'setGraphDimensions', 'redraw_canvas_gain', 'updateGraphInformation'];
const originals = {};
let drawn;

// p5's map(), including the optional "constrain to the target range" argument that the app uses.
function p5_map(value, start1, stop1, start2, stop2, constrain = false) {
  const mapped = start2 + ((value - start1) * (stop2 - start2)) / (stop1 - start1);
  if (!constrain) return mapped;
  return Math.min(Math.max(mapped, Math.min(start2, stop2)), Math.max(start2, stop2));
}

const calls = (name) => drawn.filter((c) => c.name === name).map((c) => c.args);
const texts = () => calls('text').map((args) => args[0]);
const lines = () => calls('line');

// Every numeric argument of every recorded drawing call must be finite.
function non_finite_calls() {
  return drawn.filter((c) => c.args.some((a) => typeof a === 'number' && !Number.isFinite(a)));
}

// Assigns a value that cannot be JSON-encoded (functions, objects) to a top-level `let`.
function set_live(name, value) {
  window.__live = value;
  window.eval(`${name} = window.__live`);
  delete window.__live;
}

// Slider values per variable (unset sliders hold the sentinel 18012001).
const SLIDERS = {
  k_1: 2, T_1: 1.5,
  k_2: 3, T_2: 1, T_3: 0.4,
  k_3: 2, w: 3, z: 0.3,
  L: 0.5,
  k_4: 2, T_6: 1, T_7: 0.5, T_8: 0.8,
  k_5: 1.5, T_5: 0.7,
  T_4: 2,
  K: 1.2, T_i: 2, T_d: 0.3,
};
const SENTINEL = 18012001;

function set_sliders(values) {
  const variable_position = global_value('variable_position');
  global_value('range_slider_alphabet').forEach((name, i) => { variable_position[name] = i; });
  const variables = global_value('range_slider_variables');
  for (let i = 1; i < variables.length; i++) variables[i] = SENTINEL;
  for (const [name, value] of Object.entries({ ...SLIDERS, ...values })) variables[variable_position[name]] = value;
}

// Creates real graphs for the given preset constants, computes them and installs them as bode_graphs.
function use_presets(...preset_names) {
  const graphs = preset_names.map((name, index) => {
    const formula = global_value(name).formula;
    const graph = window.eval(`new bode_graph(${index + 1}, ${JSON.stringify(formula)})`);
    graph.get_complex_p5();
    graph.get_timevalues_p5();
    return graph;
  });
  set_live('bode_graphs', graphs);
  return graphs;
}

// A graph with hand-made arrays: no maths involved, so the drawn positions are easy to predict.
function fake_graph(overrides = {}) {
  return {
    bode_id: 1, bode_formula: 'not a preset', graph_name: 'Graph', bode_hue: 100,
    bode_displaybool: true, bode_display_bodemag_bool: true, bode_display_bodephase_bool: true,
    bode_display_timeresponse_bool: true, bode_display_nyquist_bool: true,
    bode_gain_array: Array(400).fill(0), bode_phase_array: Array(400).fill(-Math.PI / 2),
    bode_timerep_array: Array(100).fill(0.5), bode_complex_array: [],
    bode_min_phase: -Math.PI / 2, bode_max_phase: -Math.PI / 2,
    bode_min_timerep: 0, bode_max_timerep: 1,
    bode_min_nyquist_x: -1, bode_max_nyquist_x: 1, bode_min_nyquist_y: -1, bode_max_nyquist_y: 0.2,
    draw_gain: jest.fn(), draw_phase: jest.fn(), draw_timeresponse: jest.fn(),
    draw_nyquist_response: jest.fn(), draw_pole_zero: jest.fn(),
    has_pole_zero_map: jest.fn(() => true),
    get_complex_p5: jest.fn(), get_timevalues_p5: jest.fn(),
    ...overrides,
  };
}

function use_fake_graphs(...graphs) {
  set_live('bode_graphs', graphs);
  return graphs;
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
  window.visualViewport = { scale: 1 };
  // setGraphDimensions reads the real window size; the plot geometry is the one for a 1280x800 window.
  originals.setGraphDimensions();
  set_globals({
    improvement_enabled: false, bode_graphs: [], input_formula: '1/s', line_stroke_weight: 2,
    min_10power: -2, x_case_gain: 5, y_case_gain: 6, gain_upper_bound: 60, rate: 1.4,
    min_y_timerep: 0, max_y_timerep: 100, max_x_timerep: 10,
  });
  set_sliders({});
});

afterEach(() => {
  for (const name of REPLACED) window[name] = originals[name];
});

describe('roundup_decimal', () => {
  test.each([
    [2.4, 2], [2.5, 3], [2.6, 3], [0, 0], [0.49, 0], [0.5, 1],
    [-2.4, -2], [-2.5, -3], [-2.6, -3], [-0.4, -0],
  ])('roundup_decimal(%p) rounds half away from zero to %p', (input, expected) => {
    expect(window.roundup_decimal(input)).toBe(expected);
  });
});

describe('value_magnet', () => {
  test.each([
    [1.2, 0.5, 1], [1.3, 0.5, 1.5], [1.25, 0.5, 1.5], [-1.3, 0.5, -1.5], [-1.2, 0.5, -1], [0.04, 0.1, 0],
    [7, 5, 5], [8, 5, 10], [0, 3, 0],
  ])('value_magnet(%p, %p) snaps to the nearest multiple %p', (input, magnet, expected) => {
    expect(window.value_magnet(input, magnet)).toBeCloseTo(expected, 10);
  });
});

describe('get_bestMultiple', () => {
  test.each([
    // [input, divider, type, expected]
    [50, 45, 'upper', 90], [50, 45, 'lower', 45], [45, 45, 'upper', 45], [45, 45, 'lower', 45],
    [-50, 45, 'upper', -45], [-50, 45, 'lower', -90], [-45, 45, 'upper', -45], [-45, 45, 'lower', -45],
    [0, 45, 'upper', 0], [0, 45, 'lower', 0],
    [100, 45, 'upper', 135], [100, 45, 'lower', 90],
  ])('get_bestMultiple(%p, %p, %p) = %p', (input, divider, type, expected) => {
    expect(window.get_bestMultiple(input, divider, type)).toBeCloseTo(expected, 10);
  });

  test('the upper multiple is never below and the lower never above the input', () => {
    for (let input = -300; input <= 300; input += 7.3) {
      expect(window.get_bestMultiple(input, 45, 'upper')).toBeGreaterThanOrEqual(input - 4.5);
      expect(window.get_bestMultiple(input, 45, 'lower')).toBeLessThanOrEqual(input + 4.5);
    }
  });

  test('a value just above a multiple is rounded up to the next one, and just below down to the previous', () => {
    expect(window.get_bestMultiple(91, 45, 'upper')).toBe(135);
    expect(window.get_bestMultiple(94, 45, 'upper')).toBe(135);
    expect(window.get_bestMultiple(-91, 45, 'lower')).toBe(-135);
    expect(window.get_bestMultiple(89, 45, 'lower')).toBe(45);
    expect(window.get_bestMultiple(-89, 45, 'upper')).toBe(-45);
  });

  test('floating point noise does not move an exact multiple', () => {
    // 0.3 / 0.1 = 2.9999999999999996 and 0.7 / 0.1 = 6.999999999999999
    expect(window.get_bestMultiple(0.3, 0.1, 'lower')).toBeCloseTo(0.3, 10);
    expect(window.get_bestMultiple(0.7, 0.1, 'lower')).toBeCloseTo(0.7, 10);
    expect(window.get_bestMultiple(0.1 * 3, 0.1, 'upper')).toBeCloseTo(0.3, 10);
  });

  test('an unknown type returns the input (the quotient is only rounded to remove noise)', () => {
    expect(window.get_bestMultiple(100, 45, 'other')).toBeCloseTo(100, 6);
  });
});

describe('textPowerOfTen', () => {
  test('draws "10" with the exponent small and raised, translated to the given position', () => {
    window.textPowerOfTen(-2, 30, 40);
    expect(calls('translate')).toEqual([[30, 40]]);
    expect(calls('text')).toEqual([['10', 0, 0], ['-2', 18, -8]]);
    expect(calls('textSize')).toEqual([[15], [11]]);
    expect(drawn.map((c) => c.name)[0]).toBe('textSize');
    expect(drawn[drawn.length - 1].name).toBe('pop');
  });
});

describe('changeStrokeWeight', () => {
  test('copies the slider value to line_stroke_weight as a number and redraws', () => {
    const slider = document.getElementById('stroke-range');
    slider.value = '4.5';
    window.changeStrokeWeight();
    expect(global_value('line_stroke_weight')).toBe(4.5);
    expect(window.redraw).toHaveBeenCalledTimes(1);
  });
});

describe('changeColorMode', () => {
  const tabs = () => document.getElementsByClassName('graph-information-tabs')[0];
  const info = () => document.getElementsByClassName('graph-information')[0];
  let checkbox;

  beforeEach(() => {
    checkbox = document.getElementById('color-mode-checkbox');
    window.color = (...args) => ({ color: args });
  });

  afterEach(() => {
    checkbox.checked = false;
    tabs().innerHTML = '';
    window.changeColorMode();
  });

  test('unchecked is dark mode: dark background, white text, dark panels', () => {
    checkbox.checked = false;
    window.changeColorMode();
    expect(global_value('light_mode')).toBe('dark');
    expect(global_value('background_color')).toEqual({ color: ['hsb(0, 0%, 4%)'] });
    expect(global_value('line_color')).toEqual({ color: ['hsb(0, 0%, 22%)'] });
    expect(global_value('text_color')).toEqual({ color: ['hsb(0, 0%, 100%)'] });
    expect(global_value('box_background_color')).toBe(120);
    expect(global_value('angle_color')).toBe('#ff40ff');
    expect(tabs().style.background).toBe('rgb(32, 32, 32)');
    expect(info().style.background).toBe('rgb(72, 72, 72)');
    expect(window.redraw).toHaveBeenCalledTimes(1);
  });

  test('checked is light mode: white background, dark text, light panels', () => {
    checkbox.checked = true;
    window.changeColorMode();
    expect(global_value('light_mode')).toBe('light');
    expect(global_value('background_color')).toEqual({ color: ['hsb(0, 0%, 100%)'] });
    expect(global_value('line_color')).toEqual({ color: ['hsb(0, 0%, 64%)'] });
    expect(global_value('text_color')).toEqual({ color: ['hsb(0, 0%, 5%)'] });
    expect(global_value('box_background_color')).toBe(255);
    expect(tabs().style.background).toBe('rgb(255, 255, 255)');
    expect(info().style.background).toBe('rgb(221, 221, 221)');
    expect(window.redraw).toHaveBeenCalledTimes(1);
  });

  test('the label of the checked tab gets the panel colour of the mode', () => {
    tabs().innerHTML = '<input type="radio" id="tab_1" checked><label id="label_1"></label>';
    const label = document.getElementById('label_1');
    checkbox.checked = true;
    window.changeColorMode();
    expect(label.style.background).toBe('rgb(221, 221, 221)');
    checkbox.checked = false;
    window.changeColorMode();
    expect(label.style.background).toBe('rgb(72, 72, 72)');
  });
});

describe('updateInputFormulaFromList', () => {
  const CASES = [
    ['Ramp', '1/(s^2)', '\\frac{1}{s^2}'],
    ['Unit step', '1/s', '\\frac{1}{s}'],
    ['Impulse', '1', '1'],
    ['Oscillation', '1/(1 + s^2)', '\\frac{1}{1 + s^2}'],
    ['Oscillation10', '100/(1 + 20s + 100s^2)', '\\frac{100}{1 + 20s + 100s^2}'],
  ];
  let select;
  let equation;

  beforeEach(() => {
    window.redraw_canvas_gain = jest.fn();
    window.achievement_done = jest.fn();
    select = document.getElementById('input-choices');
    equation = document.getElementById('input-formula');
  });

  test.each(CASES)('"%s" sets the input formula, the math field and recomputes all graphs', (choice, formula, latex) => {
    set_globals({ input_formula: 'unchanged' });
    select.innerHTML = `<option value="${choice}">${choice}</option>`;
    select.value = choice;
    window.updateInputFormulaFromList();
    expect(global_value('input_formula')).toBe(formula);
    expect(equation.value).toBe(latex);
    expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
  });

  test('only the impulse input gives the achievement', () => {
    for (const [choice] of CASES) {
      select.innerHTML = `<option value="${choice}">${choice}</option>`;
      select.value = choice;
      window.updateInputFormulaFromList();
    }
    expect(window.achievement_done.mock.calls).toEqual([['set_input_to_impulse']]);
  });

  test('an unknown choice leaves the input formula alone but still recomputes', () => {
    set_globals({ input_formula: 'unchanged' });
    select.innerHTML = '<option value="Nothing">Nothing</option>';
    select.value = 'Nothing';
    window.updateInputFormulaFromList();
    expect(global_value('input_formula')).toBe('unchanged');
    expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
  });
});

describe('updateGraphInformation', () => {
  let tabs;
  let values;

  beforeEach(() => {
    tabs = document.getElementsByClassName('graph-information-tabs')[0];
    tabs.innerHTML = '<input type="radio" id="tab_3" checked><input type="radio" id="tab_4">';
    values = document.getElementsByClassName('sub-information')[0].getElementsByClassName('value');
  });

  afterEach(() => {
    tabs.innerHTML = '';
  });

  const margins = (overrides) => fake_graph({
    bode_id: 3, bode_phase_margin: 45.678, bode_gain_crossover_freq: 1.234,
    bode_gain_margin: 20, bode_phase_crossover_freq: 5.678, ...overrides,
  });

  test('shows the margins of the checked tab with the gain margin converted from dB', () => {
    use_fake_graphs(fake_graph({ bode_id: 4, bode_phase_margin: 1 }), margins());
    window.updateGraphInformation();
    expect([...values].map((v) => v.innerHTML)).toEqual(['45.68°', '1.23', '10.00', '5.68']);
  });

  test('NaN margins give "NaN" for the value and its frequency', () => {
    use_fake_graphs(margins({ bode_phase_margin: NaN, bode_gain_margin: NaN }));
    window.updateGraphInformation();
    expect([...values].map((v) => v.innerHTML)).toEqual(['NaN', 'NaN', 'NaN', 'NaN']);
  });

  test('a NaN phase margin does not hide a valid gain margin', () => {
    use_fake_graphs(margins({ bode_phase_margin: NaN }));
    window.updateGraphInformation();
    expect([...values].map((v) => v.innerHTML)).toEqual(['NaN', 'NaN', '10.00', '5.68']);
  });

  test('without any checked tab nothing is changed', () => {
    tabs.innerHTML = '<input type="radio" id="tab_3">';
    values[0].innerHTML = 'before';
    use_fake_graphs(margins());
    window.updateGraphInformation();
    expect(values[0].innerHTML).toBe('before');
  });
});

describe('setGraphDimensions', () => {
  const geometry = () => Object.fromEntries(['canvas_width', 'canvas_height', 'graph_bode_mag_width',
    'graph_bode_mag_height', 'graph_bode_phase_y', 'graph_step_response_x', 'graph_nyquist_y',
    'graph_pole_zero_width', 'graph_pole_zero_x'].map((name) => [name, global_value(name)]));

  function resize(width, height) {
    window.windowWidth = width;
    window.windowHeight = height;
    originals.setGraphDimensions();
  }

  test('a 1600x900 window gives the plot sizes from the layout fractions', () => {
    resize(1600, 900);
    expect(global_value('canvas_width')).toBe(1220);
    expect(global_value('canvas_height')).toBe(790);
    expect(global_value('graph_bode_mag_width')).toBeCloseTo(1120 * 0.42, 10);
    expect(global_value('graph_bode_mag_height')).toBeCloseTo(640 * 0.48, 10);
    expect(global_value('graph_bode_phase_width')).toBeCloseTo(1120 * 0.42, 10);
    expect(global_value('graph_bode_phase_height')).toBeCloseTo(640 * 0.48, 10);
    expect(global_value('graph_step_response_width')).toBeCloseTo(1120 * 0.35, 10);
    expect(global_value('graph_nyquist_width')).toBeCloseTo(1120 * 0.35, 10);
    expect(global_value('graph_nyquist_height')).toBeCloseTo(640 * 0.48, 10);
  });

  test('the plots are placed relative to each other', () => {
    resize(1600, 900);
    const mag_width = global_value('graph_bode_mag_width');
    const mag_height = global_value('graph_bode_mag_height');
    expect(global_value('graph_bode_mag_x')).toBe(0);
    expect(global_value('graph_bode_mag_y')).toBe(0);
    expect(global_value('graph_bode_phase_x')).toBe(0);
    expect(global_value('graph_bode_phase_y')).toBe(mag_height); // phase plot directly below magnitude
    expect(global_value('graph_step_response_x')).toBe(mag_width + 100);
    expect(global_value('graph_step_response_y')).toBe(-10);
    expect(global_value('graph_nyquist_x')).toBe(mag_width + 100);
    expect(global_value('graph_nyquist_y')).toBe(mag_height + 65);
  });

  test('the pole-zero column sits at the right edge of the canvas', () => {
    resize(1600, 900);
    const width = global_value('graph_pole_zero_width');
    expect(width).toBeCloseTo(1120 / 6 - 40, 10);
    expect(global_value('graph_pole_zero_x')).toBeCloseTo(1220 - width - 20, 10);
    expect(global_value('graph_pole_zero_y')).toBe(0);
  });

  test('a window narrower than 1295 px is laid out as if it were 1295 px wide', () => {
    resize(1000, 800);
    const narrow = geometry();
    resize(1295, 800);
    expect(geometry()).toEqual(narrow);
    expect(narrow.canvas_width).toBe(915);
    resize(1296, 800);
    expect(global_value('canvas_width')).toBe(916);
  });

  test('the height follows the window height', () => {
    resize(1600, 700);
    const short = geometry();
    resize(1600, 1000);
    const tall = geometry();
    expect(tall.canvas_height - short.canvas_height).toBe(300);
    expect(tall.graph_bode_mag_height).toBeGreaterThan(short.graph_bode_mag_height);
    expect(tall.graph_bode_mag_width).toBe(short.graph_bode_mag_width);
  });

  test('logs the window dimensions as events', () => {
    window.add_event = jest.fn();
    resize(1600, 900);
    const events = window.add_event.mock.calls.map((c) => c[0]);
    expect(events).toEqual(expect.arrayContaining(['dim_ww=1600', 'dim_wh=900', 'dim_wvvs=1', 'dim_dpr=' + window.devicePixelRatio]));
    expect(events).toHaveLength(11);
    expect(events.find((e) => e.startsWith('dim_scpr='))).toBe(
      'dim_scpr=' + (window.outerWidth - 8) / window.innerWidth);
  });
});

describe('windowResized', () => {
  test('recomputes the geometry, resizes the canvas to it and recomputes all graphs', () => {
    window.setGraphDimensions = jest.fn(() => { set_globals({ canvas_width: 1111, canvas_height: 555 }); });
    window.redraw_canvas_gain = jest.fn();
    window.resizeCanvas = jest.fn();
    window.windowResized();
    expect(window.setGraphDimensions).toHaveBeenCalledTimes(1);
    expect(window.resizeCanvas).toHaveBeenCalledWith(1111, 555);
    expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
    // The new size must be known before the canvas is resized:
    expect(window.setGraphDimensions.mock.invocationCallOrder[0])
      .toBeLessThan(window.resizeCanvas.mock.invocationCallOrder[0]);
  });
});

describe('redraw_canvas_gain', () => {
  test('recomputes the curves and then the time responses of the matching graph only', () => {
    const [first, second] = use_fake_graphs(fake_graph({ bode_id: 1 }), fake_graph({ bode_id: 2 }));
    window.updateGraphInformation = jest.fn();
    originals.redraw_canvas_gain(2);
    expect(first.get_complex_p5).not.toHaveBeenCalled();
    expect(first.get_timevalues_p5).not.toHaveBeenCalled();
    expect(second.get_complex_p5).toHaveBeenCalledTimes(1);
    expect(second.get_timevalues_p5).toHaveBeenCalledTimes(1);
    expect(window.updateGraphInformation).toHaveBeenCalledTimes(1);
    expect(window.redraw).toHaveBeenCalledTimes(1);
  });

  test('"all" recomputes every graph, all curves before any time response', () => {
    const [first, second] = use_fake_graphs(fake_graph({ bode_id: 1 }), fake_graph({ bode_id: 2 }));
    window.updateGraphInformation = jest.fn();
    originals.redraw_canvas_gain('all');
    const order = (fn) => fn.mock.invocationCallOrder[0];
    expect(order(first.get_complex_p5)).toBeLessThan(order(second.get_complex_p5));
    expect(order(second.get_complex_p5)).toBeLessThan(order(first.get_timevalues_p5));
    expect(second.get_timevalues_p5).toHaveBeenCalledTimes(1);
  });
});

describe('draw', () => {
  const PLOTS = ['draw_nyquist_responses', 'draw_bode_responses', 'x_axis_steps_text', 'draw_time_responses',
    'draw_pole_zeros'];
  let plot_calls;

  beforeEach(() => {
    plot_calls = [];
    for (const name of PLOTS) {
      window[name] = jest.fn((...args) => { plot_calls.push([name, ...args]); });
    }
  });

  test('clears the background and draws every plot, each inside push/pop', () => {
    window.draw();
    expect(drawn[0]).toEqual({ name: 'background', args: [global_value('background_color')] });
    expect(plot_calls).toEqual([
      ['draw_nyquist_responses'], ['draw_bode_responses', 'gain'], ['x_axis_steps_text'],
      ['draw_bode_responses', 'phase'], ['draw_time_responses'], ['draw_pole_zeros'],
    ]);
    expect(calls('push')).toHaveLength(6);
    expect(calls('pop')).toHaveLength(6);
  });

  test('translates to the origin of each plot, including the fixed margins for axis labels', () => {
    window.draw();
    const g = (name) => global_value(name);
    expect(calls('translate')).toEqual([
      [g('graph_nyquist_x') + 65, g('graph_nyquist_y') + 45],
      [g('graph_bode_mag_x') + 68, g('graph_bode_mag_y') + 30],
      [g('graph_bode_phase_x') + 60, g('graph_bode_phase_y') + 76],
      [g('graph_bode_phase_x') + 68, g('graph_bode_phase_y') + 110],
      [g('graph_step_response_x') + 65, g('graph_step_response_y') + 40],
      [g('graph_pole_zero_x'), g('graph_pole_zero_y')],
    ]);
  });

  test('each plot is drawn between the push and pop that belong to it', () => {
    const sequence = [];
    window.push = () => sequence.push('push');
    window.pop = () => sequence.push('pop');
    for (const name of PLOTS) window[name] = jest.fn(() => { sequence.push(name); });
    window.draw();
    expect(sequence.slice(0, 6)).toEqual(['push', 'draw_nyquist_responses', 'pop', 'push', 'draw_bode_responses', 'pop']);
  });
});

describe('draw with real plots', () => {
  test('an empty canvas still draws all axes and titles without NaN', () => {
    window.draw();
    expect(non_finite_calls()).toEqual([]);
    const all = texts();
    for (const title of ['Bode magnitude plot', 'Bode phase plot', 'Step input response', 'Nyquist diagram',
      'Pole-zero map', 'Real axis', 'Imaginary axis', 'angular freq [rad/s]', 'time [s]', '-1']) {
      expect(all).toContain(title);
    }
    expect(all).toContain('output y(t)');
    expect(all).toContain('magnitude |G(s)|');
    expect(all).toContain('phase arg{G(s)}');
    // x-axis decades of the Bode plots, both under the magnitude and the phase plot:
    expect(calls('textSize').filter((a) => a[0] === 11)).toHaveLength(2 * (global_value('x_case_gain') + 1));
  });

  test('the four starting graphs draw without NaN and with a curve in every plot', () => {
    use_presets('GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TWO_COMPLEX_POLES', 'GRAPH_TIME_DELAY');
    window.draw();
    expect(non_finite_calls()).toEqual([]);
    // One polyline per graph in each of the four plots (magnitude, phase, time response, Nyquist):
    expect(calls('beginShape')).toHaveLength(16);
    expect(calls('endShape')).toHaveLength(16);
    expect(calls('vertex').length).toBeGreaterThan(500);
  });

  test('every preset graph together draws without NaN', () => {
    use_presets(...global_value('GRAPH_ORDER').map((_, i) => ['GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES',
      'GRAPH_TWO_COMPLEX_POLES', 'GRAPH_TIME_DELAY', 'GRAPH_ONE_ZERO_TWO_POLES', 'GRAPH_FOUR_POLES',
      'GRAPH_ONE_ZERO', 'GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_S',
      'GRAPH_ONE_POLE_WITH_PID_YL', 'GRAPH_ONE_POLE_WITH_PID_OPEN'][i]).filter(Boolean));
    window.draw();
    expect(non_finite_calls()).toEqual([]);
    expect(texts()).toContain('Pole-zero map');
  });

  test('the light-mode colours reach the drawing calls', () => {
    set_live('text_color', 'TEXT');
    set_live('line_color', 'LINE');
    window.draw();
    expect(calls('fill').some((a) => a[0] === 'TEXT')).toBe(true);
    expect(calls('stroke').some((a) => a[0] === 'LINE')).toBe(true);
  });

  test('hidden graphs are not drawn in any plot', () => {
    const graphs = use_presets('GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES');
    graphs[0].bode_displaybool = false;
    graphs[1].bode_displaybool = false;
    window.draw();
    expect(calls('beginShape')).toHaveLength(0);
    expect(calls('ellipse').length).toBe(2); // the unit circle and the -1 blob of the Nyquist diagram
    expect(non_finite_calls()).toEqual([]);
  });
});

describe('draw_bode_responses: magnitude', () => {
  test('titles, one horizontal line per 20 dB and the decade lines', () => {
    window.draw_bode_responses('gain');
    expect(texts()).toEqual(expect.arrayContaining(['Bode magnitude plot', 'magnitude |G(s)|', 'angular freq [rad/s]']));
    const y_cases = global_value('y_case_gain');
    const width = global_value('graph_bode_mag_width');
    const horizontal = lines().filter(([x1, , x2]) => x1 === 0 && x2 === width);
    // 7 main lines (y = 0..6) and 9 fainter lines per decade above the first:
    expect(horizontal).toHaveLength((y_cases + 1) + y_cases * 9);
    // The vertical decade lines come from draw_loglines (5 decades x 10 lines):
    const vertical = lines().filter(([x1, , x2]) => x1 === x2);
    expect(vertical).toHaveLength(50);
  });

  test('labels the left axis with the gain at each 20 dB step, from the upper bound downwards', () => {
    window.draw_bode_responses('gain');
    const labels = calls('text').filter((a) => a[1] === -7).map((a) => a[0]);
    expect(labels).toHaveLength(7);
    // gain_upper_bound = 60 dB is 1000, then 100, 10, 1, 0.1, 0.01, 0.001
    expect(labels[0]).toBeCloseTo(1000, 6);
    expect(labels[3]).toBeCloseTo(1, 6);
    expect(labels[6]).toBeCloseTo(0.001, 9);
  });

  test('the label y position is 5 px below its gridline', () => {
    window.draw_bode_responses('gain');
    const height = global_value('graph_bode_mag_height');
    const label_ys = calls('text').filter((a) => a[1] === -7).map((a) => a[2]);
    expect(label_ys[0]).toBeCloseTo(5, 10);
    expect(label_ys[6]).toBeCloseTo(height + 5, 10);
  });

  test('a change of gain_upper_bound moves the axis labels', () => {
    set_globals({ gain_upper_bound: 20 });
    window.draw_bode_responses('gain');
    const labels = calls('text').filter((a) => a[1] === -7).map((a) => a[0]);
    expect(labels[0]).toBeCloseTo(10, 6);
  });

  test('draws the gain curve of shown graphs only', () => {
    const [shown, hidden_plot, hidden] = use_fake_graphs(fake_graph(), fake_graph({ bode_display_bodemag_bool: false }),
      fake_graph({ bode_displaybool: false }));
    window.draw_bode_responses('gain');
    expect(shown.draw_gain).toHaveBeenCalledTimes(1);
    expect(hidden_plot.draw_gain).not.toHaveBeenCalled();
    expect(hidden.draw_gain).not.toHaveBeenCalled();
  });

  test.each([
    ['GRAPH_ONE_REAL_POLE', 1, 0], ['GRAPH_TWO_REAL_POLES', 2, 0], ['GRAPH_ONE_ZERO', 0, 1],
    ['GRAPH_FOUR_POLES', 1, 0], ['GRAPH_ONE_ZERO_TWO_POLES', 2, 1], ['GRAPH_PID', 0, 2],
    ['GRAPH_TIME_DELAY', 0, 0],
  ])('%s marks %p poles with X and %p zeros with O', (preset, poles, zeros) => {
    use_presets(preset);
    window.draw_X = jest.fn();
    window.draw_O = jest.fn();
    window.draw_bode_responses('gain');
    expect(window.draw_X).toHaveBeenCalledTimes(poles);
    expect(window.draw_O).toHaveBeenCalledTimes(zeros);
  });

  test('a pole X is placed at the corner frequency 1/T on the curve', () => {
    use_presets('GRAPH_ONE_REAL_POLE');
    set_sliders({ T_1: 0.1 }); // corner frequency 10 rad/s: one decade above 1, three decades above 0.01
    window.draw_X = jest.fn();
    window.draw_bode_responses('gain');
    const [x, y] = window.draw_X.mock.calls[0];
    expect(x).toBeCloseTo((1 + 2) * global_value('graph_bode_mag_width') / 5, 8);
    expect(Number.isFinite(y)).toBe(true);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(global_value('graph_bode_mag_height'));
  });

  test('complex poles give one X when z <= 1 and two X when z > 1', () => {
    use_presets('GRAPH_TWO_COMPLEX_POLES');
    window.draw_X = jest.fn();
    window.draw_bode_responses('gain');
    expect(window.draw_X).toHaveBeenCalledTimes(1);
    window.draw_X.mockClear();
    set_sliders({ z: 1 });
    window.draw_bode_responses('gain');
    expect(window.draw_X).toHaveBeenCalledTimes(1);
    window.draw_X.mockClear();
    set_sliders({ z: 2 });
    window.draw_bode_responses('gain');
    expect(window.draw_X).toHaveBeenCalledTimes(2);
  });

  test('a negative natural frequency draws no X', () => {
    use_presets('GRAPH_TWO_COMPLEX_POLES');
    set_sliders({ w: -3 });
    window.draw_X = jest.fn();
    window.draw_bode_responses('gain');
    expect(window.draw_X).not.toHaveBeenCalled();
  });

  test('an overdamped pair with a negative natural frequency draws no X', () => {
    use_presets('GRAPH_TWO_COMPLEX_POLES');
    set_sliders({ z: 2, w: -3 });
    window.draw_X = jest.fn();
    window.draw_bode_responses('gain');
    window.draw_bode_responses('phase');
    expect(window.draw_X).not.toHaveBeenCalled();
  });

  test('an unknown plot type draws nothing', () => {
    window.draw_bode_responses('other');
    expect(drawn).toEqual([]);
  });

  test('a negative damping is treated like z <= 1: one X at w', () => {
    use_presets('GRAPH_TWO_COMPLEX_POLES');
    set_sliders({ z: -2 });
    window.draw_X = jest.fn();
    window.draw_bode_responses('gain');
    expect(window.draw_X).toHaveBeenCalledTimes(1);
  });

  test('a deleted graph (marker drawing throws) does not stop the drawing', () => {
    use_presets('GRAPH_ONE_REAL_POLE');
    window.draw_X = () => { throw new Error('graph deleted'); };
    expect(() => window.draw_bode_responses('gain')).not.toThrow();
  });

  test('draw_bode_mag_T draws an O with no fill for zeros and an X for poles', () => {
    use_presets('GRAPH_ONE_REAL_POLE');
    window.draw_bode_mag_T(1, 0, 'zero');
    expect(calls('noFill')).toHaveLength(1);
    expect(calls('ellipse')).toHaveLength(1);
    expect(calls('line')).toHaveLength(0);
    drawn.length = 0;
    window.draw_bode_mag_T(1, 0);
    expect(calls('ellipse')).toHaveLength(0);
    expect(calls('line')).toHaveLength(2);
    expect(calls('stroke')[0]).toEqual([global_value('bode_graphs')[0].bode_hue, 240, 360]);
  });
});

describe('draw_pole_or_zero_mark', () => {
  test('uses the graph colour and the line weight of the settings', () => {
    use_fake_graphs(fake_graph({ bode_hue: 123 }));
    set_globals({ line_stroke_weight: 3 });
    window.draw_pole_or_zero_mark(10, 20, 0, 'pole');
    expect(calls('stroke')).toEqual([[123, 240, 360]]);
    expect(calls('strokeWeight')).toEqual([[3]]);
  });
});

describe('draw_bode_mag_T and draw_bode_phase_T without a corner frequency', () => {
  test.each([
    ['draw_bode_mag_T', 0], ['draw_bode_mag_T', Infinity],
    ['draw_bode_phase_T', 0], ['draw_bode_phase_T', Infinity],
  ])('%s(T = %s) draws nothing instead of a marker at an infinite x', (name, T) => {
    use_presets('GRAPH_ONE_REAL_POLE');
    window.draw_bode_responses('phase'); // sets the bounds used by draw_bode_phase_T
    window.draw_X = jest.fn();
    window.draw_O = jest.fn();
    window[name](T, 0);
    window[name](T, 0, 'zero');
    expect(window.draw_X).not.toHaveBeenCalled();
    expect(window.draw_O).not.toHaveBeenCalled();
  });
});

describe('draw_bode_responses: golden master of the axes', () => {
  // Every p5 call in order, so a dropped stroke or a moved label shows.
  // After a change on purpose, read the diff and update with npx jest -u tests/display_draw.test.js
  const round = (value) => (typeof value === 'number' ? Number(value.toFixed(3)) : value);

  test.each(['gain', 'phase'])('%s', (type) => {
    set_globals({ text_color: 'TEXT', line_color: 'LINE' });
    window.draw_bode_responses(type);
    expect(drawn.map((call) => `${call.name}(${call.args.map(round).join(', ')})`)).toMatchSnapshot();
  });
});

describe('draw_bode_responses: frequency axis label', () => {
  test('each plot places it from its own size', () => {
    set_globals({ graph_bode_mag_width: 500, graph_bode_mag_height: 300, graph_bode_phase_width: 400, graph_bode_phase_height: 200 });
    const label = () => calls('text').filter((args) => args[0] === 'angular freq [rad/s]');
    window.draw_bode_responses('gain');
    expect(label()).toEqual([['angular freq [rad/s]', 500, 335]]);
    drawn.length = 0;
    window.draw_bode_responses('phase');
    expect(label()).toEqual([['angular freq [rad/s]', 400, 235]]);
  });
});

describe('draw_bode_responses: phase', () => {
  const axis_labels = () => calls('text').filter((a) => a[1] === -7).map((a) => a[0]);

  test('titles and the phase axis labels for the default range with no graphs', () => {
    window.draw_bode_responses('phase');
    expect(texts()).toEqual(expect.arrayContaining(['Bode phase plot', 'phase arg{G(s)}', '[degrees]',
      'angular freq [rad/s]']));
    // -270 .. 90 degrees in steps of 45:
    expect(axis_labels()).toEqual([90, 45, 0, -45, -90, -135, -180, -225, -270]);
    expect(global_value('phase_case_number')).toBe(8);
    expect(global_value('phase_lower_bound')).toBe(-270);
    expect(global_value('phase_upper_bound')).toBe(90);
  });

  test('the axis stops at +360 degrees, also for an infinite phase, whose grid lines would never end', () => {
    let nof_labels = 0;
    window.text = () => { // Fails here instead of running out of memory.
      nof_labels += 1;
      if (nof_labels > 1000) throw new Error('the grid lines do not end');
    };
    for (const degrees of [360, 360.000001, 450, Infinity]) {
      use_fake_graphs(fake_graph({ bode_min_phase: -Math.PI, bode_max_phase: degrees * Math.PI / 180 }));
      window.draw_bode_responses('phase');
      expect(global_value('phase_lower_bound')).toBe(-180);
      expect(global_value('phase_upper_bound')).toBe(360);
    }
  });

  test('a phase just below +360 degrees still rounds up to 360', () => {
    use_fake_graphs(fake_graph({ bode_min_phase: -Math.PI, bode_max_phase: 320 * Math.PI / 180 }));
    window.draw_bode_responses('phase');
    expect(global_value('phase_upper_bound')).toBe(360);
  });

  test('hidden graphs alone give the default range', () => {
    use_fake_graphs(fake_graph({ bode_display_bodephase_bool: false }));
    window.draw_bode_responses('phase');
    expect(global_value('phase_lower_bound')).toBe(-270);
    expect(global_value('phase_upper_bound')).toBe(90);
  });

  test('the range covers every shown graph, not only the last one', () => {
    use_fake_graphs(
      fake_graph({ bode_min_phase: -Math.PI, bode_max_phase: 0 }),
      fake_graph({ bode_min_phase: -Math.PI / 2, bode_max_phase: -Math.PI / 4 }),
    );
    window.draw_bode_responses('phase');
    expect(global_value('phase_lower_bound')).toBe(-180);
    expect(global_value('phase_upper_bound')).toBe(0);
  });

  test('the bounds are also stored in radians', () => {
    window.draw_bode_responses('phase');
    expect(global_value('rad_phase_lower_bound')).toBeCloseTo(-270 * Math.PI / 180, 10);
    expect(global_value('rad_phase_upper_bound')).toBeCloseTo(90 * Math.PI / 180, 10);
  });

  test.each([
    ['phase', 'bode_display_bodephase_bool'], ['gain', 'bode_display_bodemag_bool'],
  ])('a graph hidden in the %s plot gets no marks there', (type, field) => {
    const [graph] = use_presets('GRAPH_ONE_REAL_POLE');
    window.draw_X = jest.fn();
    window.draw_bode_responses(type);
    expect(window.draw_X).toHaveBeenCalledTimes(1);
    window.draw_X.mockClear();
    graph[field] = false;
    window.draw_bode_responses(type);
    expect(window.draw_X).not.toHaveBeenCalled();
  });

  test('the 0 degree line is thicker than the others', () => {
    window.draw_bode_responses('phase');
    const widths = [];
    let last_weight;
    for (const c of drawn) {
      if (c.name === 'strokeWeight') last_weight = c.args[0];
      if (c.name === 'line' && c.args[0] === 0 && c.args[2] === global_value('graph_bode_phase_width')) {
        widths.push(last_weight);
      }
    }
    expect(widths).toEqual([1, 1, 3, 1, 1, 1, 1, 1, 1]);
  });

  test('the range follows the shown graphs, rounded outwards to multiples of 45 degrees', () => {
    use_fake_graphs(fake_graph({ bode_min_phase: -100 / 180 * Math.PI, bode_max_phase: 10 / 180 * Math.PI }));
    window.draw_bode_responses('phase');
    expect(global_value('phase_lower_bound')).toBeCloseTo(-135, 6);
    expect(global_value('phase_upper_bound')).toBeCloseTo(45, 6);
    expect(global_value('phase_case_number')).toBeCloseTo(4, 6);
  });

  test('the range is the union of all shown graphs, ignoring hidden ones', () => {
    use_fake_graphs(
      fake_graph({ bode_min_phase: -50 / 180 * Math.PI, bode_max_phase: 20 / 180 * Math.PI }),
      fake_graph({ bode_min_phase: -140 / 180 * Math.PI, bode_max_phase: 100 / 180 * Math.PI }),
      fake_graph({ bode_min_phase: -3, bode_max_phase: 3, bode_display_bodephase_bool: false }),
    );
    window.draw_bode_responses('phase');
    expect(global_value('phase_lower_bound')).toBeCloseTo(-180, 6);
    expect(global_value('phase_upper_bound')).toBeCloseTo(135, 6);
  });

  test('the lower end is limited to -360 degrees', () => {
    use_fake_graphs(fake_graph({ bode_min_phase: -900 / 180 * Math.PI, bode_max_phase: 0 }));
    window.draw_bode_responses('phase');
    expect(global_value('phase_lower_bound')).toBeCloseTo(-360, 6);
    expect(global_value('phase_upper_bound')).toBeCloseTo(0, 6);
  });

  test('a flat phase curve on a multiple of 45 degrees gets a range of 90 degrees around it', () => {
    use_fake_graphs(fake_graph({ bode_min_phase: -Math.PI / 2, bode_max_phase: -Math.PI / 2 }));
    window.draw_bode_responses('phase');
    expect(global_value('phase_case_number')).toBe(2);
    expect(global_value('phase_lower_bound')).toBeCloseTo(-135, 6);
    expect(global_value('phase_upper_bound')).toBeCloseTo(-45, 6);
    expect(axis_labels().map((v) => Math.round(v))).toEqual([-45, -90, -135]);
  });

  test('draws the phase curve of shown graphs only', () => {
    const [shown, hidden] = use_fake_graphs(fake_graph(), fake_graph({ bode_displaybool: false }));
    window.draw_bode_responses('phase');
    expect(shown.draw_phase).toHaveBeenCalledTimes(1);
    expect(hidden.draw_phase).not.toHaveBeenCalled();
  });

  test.each([
    ['GRAPH_ONE_REAL_POLE', 1, 0], ['GRAPH_TWO_REAL_POLES', 2, 0], ['GRAPH_ONE_ZERO', 0, 1],
    ['GRAPH_FOUR_POLES', 1, 0], ['GRAPH_ONE_ZERO_TWO_POLES', 2, 1], ['GRAPH_PID', 0, 2],
    ['GRAPH_TWO_COMPLEX_POLES', 1, 0], ['GRAPH_TIME_DELAY', 0, 0],
  ])('%s marks %p poles with X and %p zeros with O', (preset, poles, zeros) => {
    use_presets(preset);
    window.draw_X = jest.fn();
    window.draw_O = jest.fn();
    window.draw_bode_responses('phase');
    expect(window.draw_X).toHaveBeenCalledTimes(poles);
    expect(window.draw_O).toHaveBeenCalledTimes(zeros);
    for (const [x, y] of [...window.draw_X.mock.calls, ...window.draw_O.mock.calls]) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  test('complex poles: z > 1 gives two X, a negative frequency none', () => {
    use_presets('GRAPH_TWO_COMPLEX_POLES');
    window.draw_X = jest.fn();
    set_sliders({ z: 2 });
    window.draw_bode_responses('phase');
    expect(window.draw_X).toHaveBeenCalledTimes(2);
    window.draw_X.mockClear();
    set_sliders({ z: 0.5, w: -1 });
    window.draw_bode_responses('phase');
    expect(window.draw_X).not.toHaveBeenCalled();
  });

  test('a deleted graph (marker drawing throws) does not stop the drawing', () => {
    use_presets('GRAPH_ONE_REAL_POLE');
    window.draw_X = () => { throw new Error('graph deleted'); };
    expect(() => window.draw_bode_responses('phase')).not.toThrow();
  });

  test('draw_bode_phase_T places the marker on the phase curve at the corner frequency', () => {
    use_presets('GRAPH_ONE_REAL_POLE');
    window.draw_bode_responses('phase'); // sets the bounds used by draw_bode_phase_T
    window.draw_X = jest.fn();
    window.draw_O = jest.fn();
    window.draw_bode_phase_T(1, 0); // T = 1 s: corner frequency 1 rad/s
    const [x, y] = window.draw_X.mock.calls[0];
    expect(x).toBeCloseTo(2 * global_value('graph_bode_phase_width') / 5, 8);
    // At the corner frequency a pole has -45 degrees:
    const phase = global_value('bode_graphs')[0].bode_phase_array[Math.round(x)];
    const lower = global_value('phase_lower_bound') * Math.PI / 180;
    const upper = global_value('phase_upper_bound') * Math.PI / 180;
    expect(y).toBeCloseTo(global_value('graph_bode_phase_height') * (upper - phase) / (upper - lower), 8);
    window.draw_bode_phase_T(-1, 0, 'zero'); // the sign of T is ignored
    expect(window.draw_O).toHaveBeenCalledTimes(1);
    expect(window.draw_O.mock.calls[0][0]).toBeCloseTo(x, 8);
  });
});

describe('draw_X and draw_O', () => {
  test('draw_X draws two crossing diagonals whose size grows with the stroke weight', () => {
    set_globals({ line_stroke_weight: 1 });
    window.draw_X(50, 60);
    expect(lines()).toEqual([[44, 54, 56, 66], [56, 54, 44, 66]]);
    drawn.length = 0;
    set_globals({ line_stroke_weight: Math.E ** 2 });
    window.draw_X(50, 60);
    expect(lines()[0][2] - 50).toBeCloseTo(10, 8);
  });

  test('draw_O draws a circle at the point', () => {
    set_globals({ line_stroke_weight: 1 });
    window.draw_O(50, 60);
    expect(calls('ellipse')).toEqual([[50, 60, 15, 15]]);
    drawn.length = 0;
    set_globals({ line_stroke_weight: Math.E });
    window.draw_O(50, 60);
    expect(calls('ellipse')[0][2]).toBeCloseTo(18, 8);
  });
});

describe('draw_time_responses', () => {
  test.each([
    ['1/s', 'Step input response'],
    ['1', 'Dirac impulse response'],
    ['1/(s^2)', 'Time response'],
  ])('with input %s the title is "%s"', (input, title) => {
    set_globals({ input_formula: input });
    window.draw_time_responses();
    const all = texts();
    expect(all).toContain(title);
    expect(all.filter((t) => ['Step input response', 'Dirac impulse response', 'Time response'].includes(t))).toHaveLength(1);
    expect(all).toEqual(expect.arrayContaining(['output y(t)', 'time [s]']));
  });

  test('the time axis label sits at the right end of the axis', () => {
    window.draw_time_responses();
    const label = calls('text').find((a) => a[0] === 'time [s]');
    expect(label[1]).toBe(global_value('graph_step_response_width'));
    expect(label[2]).toBe(global_value('graph_step_response_height') + 40);
  });

  test('without graphs the y axis is -2 .. 2 rounded to the grid', () => {
    window.draw_time_responses();
    expect(global_value('min_y_timerep')).toBeCloseTo(-2, 6);
    expect(global_value('max_y_timerep')).toBeGreaterThanOrEqual(2);
    const labels = calls('text').filter((a) => a[1] === -30).map((a) => +a[0]);
    expect(labels[labels.length - 1]).toBeCloseTo(global_value('min_y_timerep'), 6);
  });

  test('the y range follows the min and max of the shown graphs', () => {
    use_fake_graphs(
      fake_graph({ bode_min_timerep: -3.2, bode_max_timerep: 7.1 }),
      fake_graph({ bode_min_timerep: -1, bode_max_timerep: 9.4 }),
      fake_graph({ bode_min_timerep: -90, bode_max_timerep: 90, bode_display_timeresponse_bool: false }),
    );
    window.draw_time_responses();
    expect(global_value('min_y_timerep')).toBeLessThanOrEqual(-4);
    expect(global_value('min_y_timerep')).toBeGreaterThan(-6);
    expect(global_value('max_y_timerep')).toBeGreaterThanOrEqual(9.4);
    expect(global_value('max_y_timerep')).toBeLessThan(13);
  });

  test('a response that starts at (almost) zero and exceeds 1 has 0 as lower limit', () => {
    use_fake_graphs(fake_graph({ bode_min_timerep: 0.005, bode_max_timerep: 1.5 }));
    window.draw_time_responses();
    expect(global_value('min_y_timerep')).toBe(0);
    drawn.length = 0;
    use_fake_graphs(fake_graph({ bode_min_timerep: 0.5, bode_max_timerep: 1.5 }));
    window.draw_time_responses();
    expect(global_value('min_y_timerep')).toBeGreaterThan(-1);
    expect(global_value('min_y_timerep')).toBeLessThanOrEqual(0.5);
  });

  test('the y range is limited to +-500', () => {
    use_fake_graphs(fake_graph({ bode_min_timerep: -9000, bode_max_timerep: 9000 }));
    window.draw_time_responses();
    expect(global_value('min_y_timerep')).toBeGreaterThanOrEqual(-500 - 100);
    expect(global_value('max_y_timerep')).toBeLessThanOrEqual(500 + 100);
    expect(non_finite_calls()).toEqual([]);
  });

  test('draws the response of shown graphs only', () => {
    const [shown, hidden_plot, hidden] = use_fake_graphs(fake_graph(),
      fake_graph({ bode_display_timeresponse_bool: false }), fake_graph({ bode_displaybool: false }));
    window.draw_time_responses();
    expect(shown.draw_timeresponse).toHaveBeenCalledTimes(1);
    expect(hidden_plot.draw_timeresponse).not.toHaveBeenCalled();
    expect(hidden.draw_timeresponse).not.toHaveBeenCalled();
  });

  describe('final value lines (draw_static_gain)', () => {
    const static_gains = (preset, sliders = {}) => {
      use_presets(preset);
      set_sliders(sliders);
      window.draw_static_gain = jest.fn();
      window.draw_time_responses();
      return window.draw_static_gain.mock.calls.map((c) => c[0]);
    };

    test.each([
      ['GRAPH_ONE_REAL_POLE', {}, [2]],
      ['GRAPH_ONE_REAL_POLE', { T_1: -1 }, []],
      ['GRAPH_ONE_REAL_POLE', { T_1: 0 }, [2]],
      ['GRAPH_TWO_REAL_POLES', {}, [3]],
      ['GRAPH_TWO_REAL_POLES', { T_2: -1 }, []],
      ['GRAPH_TWO_REAL_POLES', { T_3: -1 }, []],
      ['GRAPH_TWO_COMPLEX_POLES', {}, [2]],
      ['GRAPH_TIME_DELAY', {}, [3]],
      ['GRAPH_ONE_ZERO_TWO_POLES', {}, [2]],
      ['GRAPH_ONE_ZERO_TWO_POLES', { T_6: -1 }, []],
      ['GRAPH_ONE_ZERO_TWO_POLES', { T_7: -1 }, []],
      ['GRAPH_FOUR_POLES', {}, [1.5]],
      ['GRAPH_FOUR_POLES', { T_5: -1 }, []],
      ['GRAPH_ONE_POLE_WITH_PID_YR', {}, [1]],
      ['GRAPH_ONE_ZERO', {}, []],
    ])('%s %j draws a final value line at %j', (preset, sliders, expected) => {
      expect(static_gains(preset, sliders)).toEqual(expected);
    });
  });

  test('a final value line is a thin line across the plot at the height of the gain', () => {
    use_fake_graphs(fake_graph({ bode_min_timerep: 0, bode_max_timerep: 4 }));
    set_globals({ min_y_timerep: 0, max_y_timerep: 4 });
    window.draw_static_gain(2, 0);
    const height = global_value('graph_step_response_height');
    expect(lines()).toEqual([[0, height / 2, global_value('graph_step_response_width'), height / 2]]);
    expect(calls('strokeWeight')).toEqual([[0.8]]);
    expect(calls('stroke')).toEqual([[100, 240, 360]]);
    // A gain outside of the range is held inside the plot:
    drawn.length = 0;
    window.draw_static_gain(100, 0);
    expect(lines()[0][1]).toBe(0);
    drawn.length = 0;
    window.draw_static_gain(-100, 0);
    expect(lines()[0][1]).toBe(height);
  });

  test.each([
    ['a hidden graph', { bode_displaybool: false }],
    ['a graph with its step response hidden', { bode_display_timeresponse_bool: false }],
  ])('%s gets no marks on the response', (_, hidden) => {
    use_presets('GRAPH_ONE_REAL_POLE');
    Object.assign(global_value('bode_graphs')[0], hidden);
    window.draw_X = jest.fn();
    window.draw_time_responses();
    expect(window.draw_X).not.toHaveBeenCalled();
  });

  test.each([
    ['GRAPH_ONE_REAL_POLE', 1, 0], ['GRAPH_TWO_REAL_POLES', 2, 0], ['GRAPH_TIME_DELAY', 1, 0],
    ['GRAPH_ONE_ZERO_TWO_POLES', 2, 1], ['GRAPH_FOUR_POLES', 1, 0], ['GRAPH_TWO_COMPLEX_POLES', 0, 0],
    ['GRAPH_ONE_ZERO', 0, 0],
  ])('%s marks %p poles with X and %p zeros with O on the response', (preset, poles, zeros) => {
    use_presets(preset);
    window.draw_X = jest.fn();
    window.draw_O = jest.fn();
    window.draw_time_responses();
    expect(window.draw_X).toHaveBeenCalledTimes(poles);
    expect(window.draw_O).toHaveBeenCalledTimes(zeros);
    for (const [x, y] of [...window.draw_X.mock.calls, ...window.draw_O.mock.calls]) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  test('a time constant is marked at x = T on the 0..10 s axis', () => {
    use_presets('GRAPH_ONE_REAL_POLE');
    window.draw_X = jest.fn();
    window.draw_time_responses();
    const [x, y] = window.draw_X.mock.calls[0];
    expect(x).toBeCloseTo(global_value('graph_step_response_width') / 10 * 1.5, 8);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(global_value('graph_step_response_height'));
  });

  test('the time delay is marked at L + 1 and only when L is not negative', () => {
    use_presets('GRAPH_TIME_DELAY');
    window.draw_X = jest.fn();
    window.draw_time_responses();
    expect(window.draw_X.mock.calls[0][0]).toBeCloseTo(global_value('graph_step_response_width') / 10 * 1.5, 8);
    window.draw_X.mockClear();
    set_sliders({ L: -0.5 });
    window.draw_time_responses();
    expect(window.draw_X).not.toHaveBeenCalled();
    set_sliders({ L: 0 }); // no delay: marked at 1 s
    window.draw_time_responses();
    expect(window.draw_X).toHaveBeenCalledTimes(1);
  });

  test('a deleted graph (marker drawing throws) does not stop the drawing', () => {
    use_presets('GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TIME_DELAY', 'GRAPH_ONE_ZERO_TWO_POLES',
      'GRAPH_FOUR_POLES');
    window.draw_X = () => { throw new Error('graph deleted'); };
    window.draw_O = () => { throw new Error('graph deleted'); };
    expect(() => window.draw_time_responses()).not.toThrow();
  });

  test('draw_time_response_T uses the sample density of the graph itself', () => {
    use_fake_graphs(fake_graph({ bode_timerep_array: [...Array(50).fill(0), ...Array(50).fill(1)] }));
    set_globals({ min_y_timerep: 0, max_y_timerep: 1 });
    window.draw_X = jest.fn();
    window.draw_O = jest.fn();
    const height = global_value('graph_step_response_height');
    window.draw_time_response_T(2, 0);
    expect(window.draw_X.mock.calls[0][1]).toBe(height); // sample 20 of 100: still 0
    window.draw_time_response_T(7, 0, 'zero');
    expect(window.draw_O.mock.calls[0][1]).toBe(0); // sample 70 of 100: 1
    expect(calls('noFill')).toHaveLength(1);
  });
});

describe('draw_nyquist_responses', () => {
  test('the title, axis labels, and the -1 blob are drawn', () => {
    window.draw_nyquist_responses();
    expect(texts()).toEqual(expect.arrayContaining(['Nyquist diagram', 'Real axis', 'Imaginary axis', '-1']));
    const imaginary = drawn.findIndex((c) => c.name === 'text' && c.args[0] === 'Imaginary axis');
    expect(drawn[imaginary - 1]).toEqual({ name: 'rotate', args: [-Math.PI / 2] });
    expect(drawn[imaginary - 2]).toEqual({ name: 'translate', args: [-55, global_value('graph_nyquist_height') / 2 + 4] });
    expect(non_finite_calls()).toEqual([]);
  });

  test('the "Real axis" label is centered below the plot', () => {
    window.draw_nyquist_responses();
    const label = calls('text').find((a) => a[0] === 'Real axis');
    expect(label[1]).toBeCloseTo(global_value('graph_nyquist_width') / 2, 8);
    expect(label[2]).toBe(global_value('graph_nyquist_height') + 40);
  });

  test('the blob at -1 is at the screen position of the point -1 + 0j', () => {
    window.draw_nyquist_responses();
    const width = global_value('graph_nyquist_width');
    const height = global_value('graph_nyquist_height');
    const blob = calls('ellipse').find((a) => a[2] === 12);
    const x_expected = (-1 - global_value('min_nyquist_x')) / (global_value('max_nyquist_x') - global_value('min_nyquist_x')) * width;
    const y_expected = (0 - global_value('max_nyquist_y')) / (global_value('min_nyquist_y') - global_value('max_nyquist_y')) * height;
    expect(blob[0]).toBeCloseTo(x_expected, 6);
    expect(blob[1]).toBeCloseTo(y_expected, 6);
    const minus_one = calls('text').find((a) => a[0] === '-1');
    expect(minus_one[1]).toBeCloseTo(blob[0] + 7, 6);
    expect(minus_one[2]).toBeCloseTo(blob[1] + 18, 6);
  });

  test('without graphs the range is -1 .. 1 on both axes (before grid padding), with aspect ratio kept', () => {
    window.draw_nyquist_responses();
    const mag_x = global_value('max_nyquist_x') - global_value('min_nyquist_x');
    const mag_y = global_value('max_nyquist_y') - global_value('min_nyquist_y');
    expect(mag_x / mag_y).toBeGreaterThan(0.8 * global_value('graph_nyquist_width') / global_value('graph_nyquist_height'));
    expect(mag_x / mag_y).toBeLessThan(1.25 * global_value('graph_nyquist_width') / global_value('graph_nyquist_height'));
    expect(global_value('min_nyquist_x')).toBeLessThan(-1);
    expect(global_value('max_nyquist_x')).toBeGreaterThan(1);
  });

  test('the range grows to include the curves of shown graphs', () => {
    use_fake_graphs(fake_graph({ bode_min_nyquist_x: -3, bode_max_nyquist_x: 2.5, bode_min_nyquist_y: -2, bode_max_nyquist_y: 1 }));
    window.draw_nyquist_responses();
    expect(global_value('min_nyquist_x')).toBeLessThan(-3);
    expect(global_value('max_nyquist_x')).toBeGreaterThan(2.5);
    expect(global_value('min_nyquist_y')).toBeLessThan(-2);
    expect(global_value('max_nyquist_y')).toBeGreaterThan(1);
  });

  test('hidden graphs do not influence the range', () => {
    use_fake_graphs(
      fake_graph({ bode_min_nyquist_x: -4, bode_max_nyquist_x: 4, bode_display_nyquist_bool: false }),
      fake_graph({ bode_min_nyquist_x: -4, bode_max_nyquist_x: 4, bode_displaybool: false }),
    );
    window.draw_nyquist_responses();
    expect(global_value('max_nyquist_x')).toBeLessThan(4);
  });

  test('the range is limited to +-5 before the aspect ratio correction', () => {
    use_fake_graphs(fake_graph({ bode_min_nyquist_x: -900, bode_max_nyquist_x: 900, bode_min_nyquist_y: -900, bode_max_nyquist_y: 900 }));
    window.draw_nyquist_responses();
    // Clamped to +-5, plus one grid step of padding; x is then widened to the aspect ratio of the plot:
    expect(global_value('max_nyquist_y')).toBe(6);
    expect(global_value('min_nyquist_y')).toBe(-6);
    expect(global_value('max_nyquist_x')).toBe(7);
    expect(global_value('min_nyquist_x')).toBe(-7);
    expect(non_finite_calls()).toEqual([]);
  });

  test('a tall range is widened and a wide range is made taller to fit the aspect ratio', () => {
    const aspect = global_value('graph_nyquist_width') / global_value('graph_nyquist_height');
    use_fake_graphs(fake_graph({ bode_min_nyquist_y: -4.5, bode_max_nyquist_y: 4.5 }));
    window.draw_nyquist_responses();
    const wide_x = global_value('max_nyquist_x') - global_value('min_nyquist_x');
    const tall_y = global_value('max_nyquist_y') - global_value('min_nyquist_y');
    expect(wide_x).toBeGreaterThanOrEqual(9 * aspect - 1);
    expect(tall_y).toBeGreaterThanOrEqual(9);
    use_fake_graphs(fake_graph({ bode_min_nyquist_x: -4.5, bode_max_nyquist_x: 4.5 }));
    window.draw_nyquist_responses();
    expect(global_value('max_nyquist_y') - global_value('min_nyquist_y')).toBeGreaterThanOrEqual(9 / aspect - 1);
  });

  test('draws the faint unit circle (radius 2 in graph units) with the grid colour and no fill', () => {
    window.draw_nyquist_responses();
    const index = drawn.findIndex((c) => c.name === 'ellipse');
    const circle = drawn[index].args;
    const width = global_value('graph_nyquist_width');
    const x_scale = width / (global_value('max_nyquist_x') - global_value('min_nyquist_x'));
    expect(circle[2]).toBeCloseTo(2 * x_scale, 6);
    expect(circle[3]).toBeGreaterThan(0);
    expect(drawn.slice(0, index).filter((c) => c.name === 'noFill')).toHaveLength(1);
  });

  test('draws the Nyquist curve of shown graphs only', () => {
    const [shown, hidden_plot, hidden] = use_fake_graphs(fake_graph(),
      fake_graph({ bode_display_nyquist_bool: false }), fake_graph({ bode_displaybool: false }));
    window.draw_nyquist_responses();
    expect(shown.draw_nyquist_response).toHaveBeenCalledTimes(1);
    expect(hidden_plot.draw_nyquist_response).not.toHaveBeenCalled();
    expect(hidden.draw_nyquist_response).not.toHaveBeenCalled();
  });

  test('real preset graphs fit in the plot without NaN', () => {
    use_presets('GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_COMPLEX_POLES', 'GRAPH_TIME_DELAY', 'GRAPH_PID');
    window.draw_nyquist_responses();
    expect(non_finite_calls()).toEqual([]);
    expect(calls('beginShape').length).toBeGreaterThanOrEqual(4);
    expect(calls('beginShape')).toHaveLength(calls('endShape').length);
  });
});

describe('draw_pole_zeros', () => {
  test('without maps only the title is drawn, centred above the first map', () => {
    window.draw_pole_zeros();
    expect(texts()).toEqual(['Pole-zero map']);
    const title = calls('text')[0];
    expect(title[1]).toBeCloseTo(global_value('graph_pole_zero_width') / 2, 8);
    expect(title[2]).toBe(25);
  });

  test('the maps are stacked 10 px apart from y = 30, and only the last gets an axis', () => {
    const graphs = use_fake_graphs(fake_graph(), fake_graph(), fake_graph());
    window.draw_pole_zeros();
    const size = global_value('pole_zero_width');
    expect(global_value('pole_zero_height')).toBe(size);
    expect(calls('translate')).toEqual([[0, 30], [0, 30 + size + 10], [0, 30 + 2 * (size + 10)]]);
    expect(graphs.map((g) => g.draw_pole_zero.mock.calls)).toEqual([[[false]], [[false]], [[true]]]);
    expect(global_value('pole_zero_graph_x').slice(0, 3)).toEqual(Array(3).fill(global_value('graph_pole_zero_x')));
    expect(global_value('pole_zero_graph_y').slice(0, 3)).toEqual([30, 30 + size + 10, 30 + 2 * (size + 10)]);
  });

  test('the maps are as wide as the column when they fit in the canvas', () => {
    use_fake_graphs(fake_graph());
    window.draw_pole_zeros();
    expect(global_value('pole_zero_width')).toBe(global_value('graph_pole_zero_width'));
  });

  test('many maps are shrunk so that they and the axis labels fit in the canvas height', () => {
    use_fake_graphs(...Array.from({ length: 8 }, () => fake_graph()));
    window.draw_pole_zeros();
    const size = global_value('pole_zero_width');
    expect(size).toBeLessThan(global_value('graph_pole_zero_width'));
    expect(size).toBeCloseTo((global_value('canvas_height') - 70) / 8 - 10, 8);
    const last_y = 30 + 7 * (size + 10);
    expect(last_y + size + 40).toBeLessThanOrEqual(global_value('canvas_height') + 1e-9);
  });

  test('graphs without a map, and hidden graphs, take no space', () => {
    const [plain, no_map, hidden, last] = use_fake_graphs(fake_graph(), fake_graph({ has_pole_zero_map: () => false }),
      fake_graph({ bode_displaybool: false }), fake_graph());
    window.draw_pole_zeros();
    const size = global_value('pole_zero_width');
    expect(plain.draw_pole_zero).toHaveBeenCalledWith(false);
    expect(no_map.draw_pole_zero).not.toHaveBeenCalled();
    expect(hidden.draw_pole_zero).not.toHaveBeenCalled();
    expect(last.draw_pole_zero).toHaveBeenCalledWith(true);
    expect(calls('translate')).toEqual([[0, 30], [0, 30 + size + 10]]);
    expect(global_value('pole_zero_graph_y')[3]).toBe(30 + size + 10);
  });

  test('real graphs: parameter maps and computed maps are drawn, a quiz ghost has none', () => {
    const graphs = use_presets('GRAPH_ONE_REAL_POLE', 'GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_TIME_DELAY');
    graphs[3].bode_display_pole_zero_bool = false;
    window.draw_pole_zeros();
    expect(non_finite_calls()).toEqual([]);
    expect(calls('translate')).toHaveLength(3);
    expect(texts()).toContain('Real axis [1/s]');
    expect(texts().filter((t) => t === 'Real axis [1/s]')).toHaveLength(1);
  });
});

describe('draw in other states', () => {
  test('in quiz mode with ghost graphs the plots still draw without NaN', () => {
    const graphs = use_presets('GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_COMPLEX_POLES');
    graphs[1].bode_display_pole_zero_bool = false;
    graphs[1].bode_display_equation_bool = false;
    set_globals({ current_quiz: 'bode', quiz_mode: 'quiz' });
    window.draw();
    expect(non_finite_calls()).toEqual([]);
    expect(texts()).toContain('Bode magnitude plot');
  });

  test('in assignment mode with a PID graph the plots draw without NaN', () => {
    use_presets('GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_OPEN');
    set_globals({ assignments_enabled: true, current_assignment: 0 });
    window.draw();
    expect(non_finite_calls()).toEqual([]);
  });

  test('with the input changed to an impulse the title changes and all plots stay finite', () => {
    use_presets('GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES');
    set_globals({ input_formula: '1' });
    window.draw();
    expect(texts()).toContain('Dirac impulse response');
    expect(non_finite_calls()).toEqual([]);
  });

  test('in a small window the whole page still draws', () => {
    use_presets('GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TWO_COMPLEX_POLES', 'GRAPH_TIME_DELAY');
    window.windowWidth = 800;
    window.windowHeight = 500;
    originals.setGraphDimensions();
    for (const graph of global_value('bode_graphs')) { graph.get_complex_p5(); graph.get_timevalues_p5(); }
    window.draw();
    expect(non_finite_calls()).toEqual([]);
  });

  test('with a thick line setting all markers and curves stay finite', () => {
    use_presets('GRAPH_ONE_REAL_POLE', 'GRAPH_ONE_ZERO_TWO_POLES');
    set_globals({ line_stroke_weight: 12 });
    window.draw();
    expect(non_finite_calls()).toEqual([]);
  });
});
