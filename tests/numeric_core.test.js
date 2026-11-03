/** @jest-environment jsdom */
// Golden-master tests for the numeric core: transfer-function evaluation,
// Bode gain/phase, stability margins and time responses of every preset graph.
// Snapshots record the current behaviour so a refactor cannot silently change it.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

// Fixed plot geometry (normally computed from the window size in setup()).
const GEOMETRY = {
  graph_bode_mag_width: 400,
  graph_step_response_width: 300,
  min_10power: -2,
  x_case_gain: 5,
  max_x_timerep: 10,
  precision: 4,
};

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
const STEP_RESPONSE_INPUT = '1/s';

// Rounds to 6 significant digits so platform float noise doesn't break snapshots.
const round = (x) => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toPrecision(6)) : x);
const sample = (array, every) => array.filter((_, i) => i % every === 0).map(round);

function load_geometry_and_sliders() {
  set_globals(GEOMETRY);
  set_globals({ input_formula: STEP_RESPONSE_INPUT });
  const alphabet = global_value('range_slider_alphabet');
  const variable_position = global_value('variable_position');
  alphabet.forEach((name, i) => { variable_position[name] = i; });
  const variables = global_value('range_slider_variables');
  for (let i = 1; i < variables.length; i++) variables[i] = SENTINEL;
  for (const [name, value] of Object.entries(SLIDERS)) variables[variable_position[name]] = value;
}

function analyse(formula) {
  const graph = window.eval(`new bode_graph(1, ${JSON.stringify(formula)})`);
  graph.get_complex_p5();
  graph.get_timevalues_p5();
  return {
    gain: sample(graph.bode_gain_array, 40),
    phase: sample(graph.bode_phase_array, 40),
    phase_range: [round(graph.bode_min_phase), round(graph.bode_max_phase)],
    nyquist_bounds: [graph.bode_min_nyquist_x, graph.bode_max_nyquist_x,
      graph.bode_min_nyquist_y, graph.bode_max_nyquist_y].map(round),
    gain_margin: round(graph.bode_gain_margin),
    phase_margin: round(graph.bode_phase_margin),
    gain_crossover_freq: round(graph.bode_gain_crossover_freq),
    phase_crossover_freq: round(graph.bode_phase_crossover_freq),
    timerep: sample(graph.bode_timerep_array || [], 8),
    timerep_range: [round(graph.bode_min_timerep), round(graph.bode_max_timerep)],
  };
}

describe('numeric core', () => {
  beforeAll(() => loadApp());
  beforeEach(() => load_geometry_and_sliders());

  test('every preset graph keeps its numeric behaviour', () => {
    const results = {};
    for (const preset of global_value('GRAPH_ORDER')) {
      results[preset.name] = analyse(preset.formula);
    }
    expect(results).toMatchSnapshot();
  });

  test('one real pole: low-frequency gain is 20*log10(k_1) dB and -45 deg at 1/T_1', () => {
    const preset = global_value('GRAPH_ONE_REAL_POLE');
    const graph = window.eval(`new bode_graph(1, ${JSON.stringify(preset.formula)})`);
    graph.get_complex_p5();
    expect(graph.bode_gain_array[0]).toBeCloseTo(20 * Math.log10(2), 1);
    // x position of the corner frequency 1/T_1 on the log axis
    const corner = Math.round(((Math.log10(1 / 1.5) + 2) / 5) * 400);
    expect(graph.bode_phase_array[corner]).toBeCloseTo(-Math.PI / 4, 1);
  });

  test('one real pole: step response approaches k_1 and matches k_1*(1-exp(-t/T_1))', () => {
    const preset = global_value('GRAPH_ONE_REAL_POLE');
    const graph = window.eval(`new bode_graph(1, ${JSON.stringify(preset.formula)})`);
    graph.get_complex_p5();
    graph.get_timevalues_p5();
    const array = graph.bode_timerep_array;
    const step_t = 10 / 300 * 4; // seconds per sample
    array.forEach((y, i) => expect(y).toBeCloseTo(2 * (1 - Math.exp(-(i * step_t) / 1.5)), 6));
    expect(array[array.length - 1]).toBeCloseTo(2, 1);
  });

  // The PID presets are hand-simplified polynomial fractions; check each against
  // its block-diagram definition with G = k_1/(1+T_1 s), G_PID = K(1 + 1/(sT_i) + sT_d).
  test.each([
    ['GRAPH_PID', (G, C) => C],
    ['GRAPH_ONE_POLE_WITH_PID_OPEN', (G, C) => math.multiply(C, G)],
    ['GRAPH_ONE_POLE_WITH_PID_YR', (G, C) => math.divide(math.multiply(C, G), math.add(1, math.multiply(C, G)))],
    ['GRAPH_ONE_POLE_WITH_PID_S', (G, C) => math.divide(1, math.add(1, math.multiply(C, G)))],
    ['GRAPH_ONE_POLE_WITH_PID_YL', (G, C) => math.divide(G, math.add(1, math.multiply(C, G)))],
  ])('%s matches its block-diagram definition', (preset_name, definition) => {
    const { k_1, T_1, K, T_i, T_d } = SLIDERS;
    const binding = window.bind_formula(global_value(preset_name).formula);
    for (const s of [math.complex(0, 0.3), math.complex(0, 2), math.complex(-0.4, 1.7), math.complex(1, -3)]) {
      const G = math.divide(k_1, math.add(1, math.multiply(T_1, s)));
      const C = math.multiply(K, math.add(1, math.divide(1, math.multiply(s, T_i)), math.multiply(s, T_d)));
      const expected = definition(G, C);
      const actual = math.complex(window.evaluate_formula(binding, s));
      expect(actual.re).toBeCloseTo(expected.re, 10);
      expect(actual.im).toBeCloseTo(expected.im, 10);
    }
  });
});
