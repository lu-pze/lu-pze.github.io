/** @jest-environment jsdom */
// Tests for src/bode_graph.js beyond the golden master in numeric_core.test.js: the closed-form
// time responses of the first presets (every sign branch of the y-axis range), margins and
// computed poles/zeros, pole_zero_map_position clamping, which graphs get a pole-zero map, and all
// the drawing code (Bode, Nyquist, time response, pole-zero maps). The p5 drawing functions are
// replaced by a recorder, so the tests can check which lines, vertices and texts were drawn.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

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

// Slider values per variable (unset sliders hold the sentinel 18012001).
const SENTINEL = 18012001;
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

const TIMEREP_LENGTH = Math.ceil(GEOMETRY.graph_step_response_width / GEOMETRY.precision);

// p5 functions replaced by the recorder, and the helpers that need p5's real behaviour.
const P5_RECORDED = ['beginShape', 'ellipse', 'endShape', 'fill', 'line', 'noFill', 'noStroke', 'pop',
  'push', 'stroke', 'strokeWeight', 'text', 'textAlign', 'textSize', 'translate', 'vertex'];
const REPLACED = [...P5_RECORDED, 'map'];
const originals = {};
let drawn;

// p5's map(), including the optional "constrain to the target range" argument.
function p5_map(value, start1, stop1, start2, stop2, constrain = false) {
  const mapped = start2 + ((value - start1) * (stop2 - start2)) / (stop1 - start1);
  if (!constrain) return mapped;
  return Math.min(Math.max(mapped, Math.min(start2, stop2)), Math.max(start2, stop2));
}

const calls = (name) => drawn.filter((c) => c.name === name).map((c) => c.args);
const texts = () => calls('text').map((args) => args[0]);

function set_sliders(overrides = {}) {
  const variable_position = global_value('variable_position');
  const alphabet = global_value('range_slider_alphabet');
  alphabet.forEach((name, i) => { variable_position[name] = i; });
  const variables = global_value('range_slider_variables');
  for (let i = 1; i < variables.length; i++) variables[i] = SENTINEL;
  for (const [name, value] of Object.entries({ ...SLIDERS, ...overrides })) {
    variables[variable_position[name]] = value;
  }
}

function new_graph(formula, id = 1) {
  return window.eval(`new bode_graph(${id}, ${JSON.stringify(formula)})`);
}

// A graph with its Bode curves computed.
function analysed(formula) {
  const graph = new_graph(formula);
  graph.get_complex_p5();
  return graph;
}

// A graph with Bode and time response computed for the given input ("1/s" step, "1" impulse).
function with_time_response(formula, input_formula = '1/s') {
  set_globals({ input_formula });
  const graph = analysed(formula);
  graph.get_timevalues_p5();
  return graph;
}

// Makes the Nyquist plot range fit the graph, as the app does before drawing.
function fit_nyquist_range(graph) {
  set_globals({
    min_nyquist_x: graph.bode_min_nyquist_x, max_nyquist_x: graph.bode_max_nyquist_x,
    min_nyquist_y: graph.bode_min_nyquist_y, max_nyquist_y: graph.bode_max_nyquist_y,
  });
}

const preset = (name) => global_value(name).formula;
const number_args = (args) => args.filter((arg) => typeof arg === 'number');

describe('bode_graph', () => {
  beforeAll(() => loadApp());

  beforeEach(() => {
    for (const name of REPLACED) originals[name] = window[name];
    drawn = [];
    for (const name of P5_RECORDED) window[name] = (...args) => { drawn.push({ name, args }); };
    window.map = p5_map;
    set_globals(GEOMETRY);
    set_sliders();
    set_globals({ input_formula: '1/s' });
  });

  afterEach(() => {
    for (const name of REPLACED) window[name] = originals[name];
  });

  describe('closed-form time responses', () => {
    const range = (graph) => [graph.bode_min_timerep, graph.bode_max_timerep];

    test('one real pole, step: sampled exactly and range for each sign of k_1 and T_1', () => {
      const cases = [
        { k_1: 2, T_1: 1.5, expected: [0, 2] },
        { k_1: -2, T_1: 1.5, expected: [-2, 0] },
        { k_1: 2, T_1: -1.5, expected: [-2, 0] },
        { k_1: -2, T_1: -1.5, expected: [0, 2] },
      ];
      for (const { k_1, T_1, expected } of cases) {
        set_sliders({ k_1, T_1 });
        const graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'));
        expect(graph.bode_timerep_array).toHaveLength(TIMEREP_LENGTH);
        expect(range(graph)).toEqual(expected);
        const t = (4 * 10) / 300 * 10; // sample 10
        expect(graph.bode_timerep_array[10]).toBeCloseTo(k_1 * (1 - Math.exp(-t / T_1)), 12);
        expect(graph.bode_timerep_array[0]).toBeCloseTo(0, 12);
      }
    });

    test('one real pole, impulse: k_1/T_1*exp(-t/T_1), axis capped at 20 for an unstable pole', () => {
      set_sliders({ k_1: 2, T_1: 1.5 });
      let graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'), '1');
      expect(graph.bode_timerep_array[0]).toBeCloseTo(2 / 1.5, 12);
      expect(graph.bode_timerep_array[5]).toBeCloseTo(2 / 1.5 * Math.exp(-(4 * 5 / 300 * 10) / 1.5), 12);
      expect(range(graph)).toEqual([0, 2 / 1.5]);

      set_sliders({ k_1: -2, T_1: 1.5 });
      graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'), '1');
      expect(range(graph)).toEqual([-2 / 1.5, 0]);

      // Unstable: h(t) = k_1/T_1*exp(-t/T_1) grows without bound, so the axis is capped at +-20.
      set_sliders({ k_1: 2, T_1: -1.5 });
      graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'), '1');
      expect(range(graph)).toEqual([-20, 0]);

      set_sliders({ k_1: -2, T_1: -1.5 });
      graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'), '1');
      expect(range(graph)).toEqual([0, 20]);
    });

    // With T_1 = 0 the formula would give k_1*(1 - exp(-0/0)) = NaN at t = 0, and draw_timeresponse()
    // would pass vertex(0, NaN) to p5.
    test('one real pole, step with T_1 = 0 gives finite samples (first sample is NaN)', () => {
      set_sliders({ k_1: 2, T_1: 0 });
      const graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'));
      expect(graph.bode_timerep_array.every(Number.isFinite)).toBe(true);
    });

    test('one real pole, step with T_1 = 0 is k_1 for every sample after t = 0', () => {
      set_sliders({ k_1: 2, T_1: 0 });
      const graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'));
      expect(graph.bode_timerep_array.slice(1).every((value) => value === 2)).toBe(true);
    });

    test('one real pole, impulse with T_1 = 0 is only an impulse at t = 0, so 0 afterwards', () => {
      set_sliders({ k_1: 2, T_1: 0 });
      const graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'), '1');
      expect(graph.bode_timerep_array.every((value) => value === 0)).toBe(true);
      expect(range(graph)).toEqual([0, 0]);
    });

    test('two real poles, step: range for stable, unstable and mixed poles, both signs of k_2', () => {
      const cases = [
        { k_2: 3, T_2: 1, T_3: 0.4, expected: [0, 3] },
        { k_2: -3, T_2: 1, T_3: 0.4, expected: [-3, 0] },
        { k_2: 3, T_2: -1, T_3: -0.4, expected: [0, 3] },
        { k_2: 3, T_2: -1, T_3: 0.4, expected: [-3, 0] },
        { k_2: -3, T_2: -1, T_3: 0.4, expected: [0, 3] },
      ];
      for (const { k_2, T_2, T_3, expected } of cases) {
        set_sliders({ k_2, T_2, T_3 });
        const graph = with_time_response(preset('GRAPH_TWO_REAL_POLES'));
        expect(range(graph)).toEqual(expected);
        expect(graph.bode_timerep_array).toHaveLength(TIMEREP_LENGTH);
        expect(graph.bode_timerep_array[0]).toBeCloseTo(0, 12);
      }
    });

    test('two real poles, step: equal or zero time constants are nudged apart, never NaN', () => {
      for (const [T_2, T_3] of [[1, 1], [0, 0.4], [1, 0], [0, 0]]) {
        set_sliders({ T_2, T_3 });
        const graph = with_time_response(preset('GRAPH_TWO_REAL_POLES'));
        expect(graph.bode_timerep_array.every(Number.isFinite)).toBe(true);
      }
      // Equal poles: the response approaches k_2 (double pole at -1).
      set_sliders({ k_2: 3, T_2: 1, T_3: 1 });
      const graph = with_time_response(preset('GRAPH_TWO_REAL_POLES'));
      expect(graph.bode_timerep_array[TIMEREP_LENGTH - 1]).toBeCloseTo(3, 2);
      // ... and follows the double-pole response k*(1 - exp(-t/T)*(1 + t/T)) within the 0.001 nudge.
      const t = 4 * 10 / 300 * 10;
      expect(graph.bode_timerep_array[10]).toBeCloseTo(3 * (1 - Math.exp(-t) * (1 + t)), 2);
    });

    test('two real poles, impulse: exact shape, range per sign, and the T = 0 special cases', () => {
      set_sliders({ k_2: 3, T_2: 1, T_3: 0.4 });
      let graph = with_time_response(preset('GRAPH_TWO_REAL_POLES'), '1');
      const t = 4 * 7 / 300 * 10;
      const expected = 3 / 1 / 0.4 * (Math.exp(-t / 1) - Math.exp(-t / 0.4)) / (1 / 0.4 - 1 / 1);
      expect(graph.bode_timerep_array[7]).toBeCloseTo(expected, 12);
      expect(range(graph)).toEqual([0, 3]);

      set_sliders({ k_2: -3, T_2: 1, T_3: 0.4 });
      expect(range(with_time_response(preset('GRAPH_TWO_REAL_POLES'), '1'))).toEqual([-3, 0]);
      set_sliders({ k_2: 3, T_2: -1, T_3: 0.4 });
      expect(range(with_time_response(preset('GRAPH_TWO_REAL_POLES'), '1'))).toEqual([-3, 0]);
      set_sliders({ k_2: -3, T_2: -1, T_3: 0.4 });
      expect(range(with_time_response(preset('GRAPH_TWO_REAL_POLES'), '1'))).toEqual([0, 3]);

      // A zero time constant removes that pole: k_2*exp(-t/T) of the other one.
      set_sliders({ k_2: 3, T_2: 0, T_3: 0.4 });
      graph = with_time_response(preset('GRAPH_TWO_REAL_POLES'), '1');
      expect(graph.bode_timerep_array[7]).toBeCloseTo(3 * Math.exp(-t / 0.4), 12);
      set_sliders({ k_2: 3, T_2: 1, T_3: 0 });
      graph = with_time_response(preset('GRAPH_TWO_REAL_POLES'), '1');
      expect(graph.bode_timerep_array[7]).toBeCloseTo(3 * Math.exp(-t / 1), 12);
    });

    test('two complex poles: step and impulse formulas, with the range taken from the samples', () => {
      set_sliders({ k_3: 2, w: 3, z: 0.3 });
      let graph = with_time_response(preset('GRAPH_TWO_COMPLEX_POLES'));
      const z = 0.3;
      const w = 3;
      const t = 4 * 12 / 300 * 10;
      const wd = w * Math.sqrt(1 - z * z);
      expect(graph.bode_timerep_array[12]).toBeCloseTo(
        2 * (1 - Math.exp(-z * w * t) / Math.sqrt(1 - z * z) * Math.sin(wd * t + Math.acos(z))), 12);
      expect(graph.bode_max_timerep).toBe(Math.max(...graph.bode_timerep_array));
      expect(graph.bode_min_timerep).toBe(Math.min(...graph.bode_timerep_array));
      expect(graph.bode_max_timerep).toBeGreaterThan(2); // overshoot of a lightly damped pair

      graph = with_time_response(preset('GRAPH_TWO_COMPLEX_POLES'), '1');
      expect(graph.bode_timerep_array[12]).toBeCloseTo(
        2 * w / Math.sqrt(1 - z * z) * Math.exp(-z * w * t) * Math.sin(wd * t), 12);
      expect(graph.bode_max_timerep).toBe(Math.max(...graph.bode_timerep_array));
      expect(graph.bode_min_timerep).toBe(Math.min(...graph.bode_timerep_array));
      expect(graph.bode_min_timerep).toBeLessThan(0);
    });

    test('two complex poles with z >= 1 (or z < 0) fall back to the general time_response', () => {
      for (const z of [1, 2, -0.2]) {
        for (const input of ['1/s', '1']) {
          set_sliders({ k_3: 2, w: 3, z });
          const graph = with_time_response(preset('GRAPH_TWO_COMPLEX_POLES'), input);
          expect(graph.bode_timerep_array).toHaveLength(TIMEREP_LENGTH);
          expect(graph.bode_timerep_array.every(Number.isFinite)).toBe(true);
        }
      }
      // z = 2: overdamped step response settles at k_3 without overshoot.
      set_sliders({ k_3: 2, w: 3, z: 2 });
      const graph = with_time_response(preset('GRAPH_TWO_COMPLEX_POLES'));
      expect(graph.bode_timerep_array[TIMEREP_LENGTH - 1]).toBeCloseTo(2, 2);
      expect(graph.bode_max_timerep).toBeLessThanOrEqual(2 + 1e-6);
    });

    test('an input_formula that is neither a step nor an impulse uses the general time_response', () => {
      // The closed forms exist only for "1/s" and "1"; a ramp input must still give a response.
      const graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'), '1/s^2');
      expect(graph.bode_timerep_array).toHaveLength(TIMEREP_LENGTH);
      // Ramp response of k/(1+Ts) grows like k*t for large t.
      expect(graph.bode_timerep_array[TIMEREP_LENGTH - 1]).toBeGreaterThan(10);
    });

    test('presets that never show a time response are skipped', () => {
      for (const name of ['GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_ONE_POLE_WITH_PID_OPEN']) {
        const graph = with_time_response(preset(name));
        expect(graph.bode_timerep_array).toEqual([]);
        expect(range(graph)).toEqual([10000, -10000]);
      }
    });

    test('general formulas get a response with min/max taken from the samples', () => {
      const graph = with_time_response(preset('GRAPH_TIME_DELAY'));
      expect(graph.bode_timerep_array).toHaveLength(TIMEREP_LENGTH);
      expect(graph.bode_min_timerep).toBe(Math.min(...graph.bode_timerep_array));
      expect(graph.bode_max_timerep).toBe(Math.max(...graph.bode_timerep_array));
      // 3/(1+s)*e^(-0.5 s): zero until the delay (0.5 s = sample 4 at 1.33 s/sample... t=0.13*i)
      expect(graph.bode_timerep_array[0]).toBeCloseTo(0, 9);
      expect(graph.bode_timerep_array[TIMEREP_LENGTH - 1]).toBeCloseTo(3, 2);
    });

    test('a formula with an unset slider keeps its previous (empty) response', () => {
      set_sliders({ T_1: SENTINEL });
      const graph = with_time_response('1/(1+T_1*s)');
      expect(graph.bode_timerep_array).toEqual([]);
      expect(range(graph)).toEqual([10000, -10000]);
    });
  });

  describe('get_complex_p5: Bode data, margins and poles/zeros', () => {
    test('fills gain, phase and complex arrays for each pixel column, with Nyquist bounds', () => {
      const graph = analysed('10/(s+1)^3');
      const width = GEOMETRY.graph_bode_mag_width;
      expect(graph.bode_gain_array).toHaveLength(width);
      expect(graph.bode_phase_array).toHaveLength(width);
      expect(graph.bode_complex_array).toHaveLength(width);
      expect(graph.bode_gain_array[0]).toBeCloseTo(20 * Math.log10(10), 2);
      expect(graph.bode_max_nyquist_x).toBeCloseTo(10, 1);
      expect(graph.bode_min_nyquist_y).toBeLessThan(0);
      expect(graph.bode_max_phase).toBe(Math.max(...graph.bode_phase_array));
      expect(graph.bode_min_phase).toBe(Math.min(...graph.bode_phase_array));
    });

    test('margins of 10/(s+1)^3 match the analytic values', () => {
      const graph = analysed('10/(s+1)^3');
      // Phase crossover: 3*atan(w) = 180 deg -> w = sqrt(3), |G| = 10/8 -> GM = 8/10 (-1.94 dB).
      expect(graph.bode_phase_crossover_freq).toBeCloseTo(Math.sqrt(3), 3);
      expect(graph.bode_gain_margin).toBeCloseTo(20 * Math.log10(8 / 10), 2);
      // Gain crossover: (1+w^2)^1.5 = 10 -> w = sqrt(10^(2/3) - 1).
      const wc = Math.sqrt(Math.pow(10, 2 / 3) - 1);
      expect(graph.bode_gain_crossover_freq).toBeCloseTo(wc, 3);
      expect(graph.bode_phase_margin).toBeCloseTo(180 - 3 * Math.atan(wc) * 180 / Math.PI, 1);
    });

    test('a graph that never crosses 0 dB or -180 degrees has no margins (NaN for the readout)', () => {
      // findOmegaZero/findOmega180 return NaN, so the margins are NaN[0] = undefined. The readouts
      // in display_draw.js test isNaN(), which is true for both.
      const graph = analysed('0.1/(s+1)');
      for (const field of ['bode_gain_margin', 'bode_phase_margin', 'bode_gain_crossover_freq',
        'bode_phase_crossover_freq']) {
        expect(isNaN(graph[field])).toBe(true);
      }
    });

    test('an unset slider leaves the arrays untouched and gives no poles/zeros or margins', () => {
      set_sliders({ T_1: SENTINEL });
      const graph = new_graph('1/(1+T_1*s)');
      expect(() => graph.get_complex_p5()).not.toThrow();
      expect(graph.bode_complex_array).toEqual([]);
      expect(graph.bode_gain_array).toEqual([]);
      expect(graph.bode_phase_array).toEqual([]);
      expect(graph.bode_poles_zeros).toBeNull();
      expect(isNaN(graph.bode_gain_margin)).toBe(true);
      expect(isNaN(graph.bode_phase_margin)).toBe(true);
    });

    test('recalculating discards the previous curves and bounds', () => {
      const graph = analysed(preset('GRAPH_ONE_REAL_POLE'));
      const first_gain = graph.bode_gain_array[0];
      set_sliders({ k_1: 20 });
      graph.get_complex_p5();
      expect(graph.bode_gain_array).toHaveLength(GEOMETRY.graph_bode_mag_width);
      expect(graph.bode_gain_array[0]).toBeCloseTo(first_gain + 20, 3);
      expect(graph.bode_max_nyquist_x).toBeCloseTo(20, 2);
    });

    test('the phase is unwrapped when it crosses +-180 degrees', () => {
      // The phase of 1/(s(s+1)^3) goes from -90 to -360 deg: atan2 alone would jump from -180 to +180.
      const graph = analysed('1/(s*(s+1)^3)');
      const phase = graph.bode_phase_array;
      expect(phase.every((p, i) => i === 0 || Math.abs(p - phase[i - 1]) < 0.1 * 2 * Math.PI)).toBe(true);
      expect(graph.bode_min_phase).toBeLessThan(-Math.PI * 1.9);
    });

    test('poles and zeros are computed for non-parameter formulas, not for parameter presets', () => {
      const graph = analysed('(s+2)/((s+1)*(s+3))');
      const poles = graph.bode_poles_zeros.poles.map((p) => p.re).sort((a, b) => a - b);
      expect(poles[0]).toBeCloseTo(-3, 6);
      expect(poles[1]).toBeCloseTo(-1, 6);
      expect(graph.bode_poles_zeros.zeros.map((z) => z.re)[0]).toBeCloseTo(-2, 6);
      expect(analysed(preset('GRAPH_TWO_REAL_POLES')).bode_poles_zeros).toBeNull();
      expect(analysed(preset('GRAPH_PID')).bode_poles_zeros).toBeNull();
    });

    test('a formula that is not a rational function has no poles/zeros', () => {
      expect(analysed('sqrt(s+1)').bode_poles_zeros).toBeNull();
    });
  });

  describe('which graphs get a pole-zero map', () => {
    test('the seven parameter presets have one, drawn from the sliders', () => {
      const names = ['GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TWO_COMPLEX_POLES',
        'GRAPH_ONE_ZERO', 'GRAPH_ONE_ZERO_TWO_POLES', 'GRAPH_FOUR_POLES', 'GRAPH_PID'];
      for (const name of names) {
        const graph = analysed(preset(name));
        expect(graph.has_parameter_pole_zero_map()).toBe(true);
        expect(graph.has_pole_zero_map()).toBe(true);
      }
      expect(global_value('PARAMETER_POLE_ZERO_MAP_FORMULAS')).toHaveLength(names.length);
    });

    test('other presets get a display-only map of their computed poles and zeros', () => {
      for (const name of ['GRAPH_TIME_DELAY', 'GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_S',
        'GRAPH_ONE_POLE_WITH_PID_YL', 'GRAPH_ONE_POLE_WITH_PID_OPEN']) {
        const graph = analysed(preset(name));
        expect(graph.has_parameter_pole_zero_map()).toBe(false);
        expect(graph.bode_poles_zeros).not.toBeNull();
        expect(graph.has_pole_zero_map()).toBe(true);
      }
    });

    test('quiz ghosts (bode_display_pole_zero_bool = false) never get a map', () => {
      const graph = analysed('1/(s+1)');
      expect(graph.has_pole_zero_map()).toBe(true);
      graph.bode_display_pole_zero_bool = false;
      expect(graph.has_pole_zero_map()).toBe(false);
      // ... but a preset with a parameter map keeps it (it is not computed from the answer).
      const preset_graph = analysed(preset('GRAPH_ONE_REAL_POLE'));
      preset_graph.bode_display_pole_zero_bool = false;
      expect(preset_graph.has_pole_zero_map()).toBe(true);
    });

    test('a formula without computed poles has none', () => {
      expect(analysed('sqrt(s+1)').has_pole_zero_map()).toBe(false);
      expect(new_graph('1/(s+1)').has_pole_zero_map()).toBe(false); // not calculated yet
    });
  });

  describe('pole_zero_map_position', () => {
    const position = (re, im) => window.pole_zero_map_position(re, im);

    test('points inside the map are unchanged', () => {
      expect(position(-1, 1)).toEqual([-1, 1]);
      expect(position(0, 0)).toEqual([0, 0]);
      expect(position(-3.2, 2.2)).toEqual([-3.2, 2.2]);
      expect(position(1.2, -2.2)).toEqual([1.2, -2.2]);
    });

    test('points just beyond each edge are clamped (boundaries are exact)', () => {
      expect(position(-3.21, 0)).toEqual([-3.2, 0]);
      expect(position(1.21, 0)).toEqual([1.2, 0]);
      expect(position(0, 2.21)).toEqual([0, 2.2]);
      expect(position(0, -2.21)).toEqual([0, -2.2]);
      expect(position(-3.2001, 0)[0]).toBe(-3.2);
    });

    test('a real point beyond an edge is moved to just outside it, along the axis', () => {
      expect(position(-10, 0)).toEqual([-3.2, 0]);
      expect(position(5, 0)).toEqual([1.2, 0]);
    });

    test('a complex point is moved towards the origin, keeping its direction', () => {
      const [x, y] = position(-6.4, 2);
      expect(x).toBe(-3.2);
      expect(y).toBeCloseTo(1, 12);
      const [x2, y2] = position(2.4, -1.2);
      expect(x2).toBe(1.2);
      expect(y2).toBeCloseTo(-0.6, 12);
      const [x3, y3] = position(-1, 4.4);
      expect(y3).toBe(2.2);
      expect(x3).toBeCloseTo(-0.5, 12);
      const [x4, y4] = position(0.6, -4.4);
      expect(y4).toBe(-2.2);
      expect(x4).toBeCloseTo(0.3, 12);
    });

    test('a corner point is clamped on both axes and keeps its direction', () => {
      const [x, y] = position(-32, 22);
      expect(x).toBe(-3.2);
      expect(y).toBeCloseTo(2.2, 12);
      for (const [re, im] of [[-100, 100], [100, 100], [100, -100], [-100, -100]]) {
        const [px, py] = position(re, im);
        expect(Math.abs(py)).toBeLessThanOrEqual(2.2 + 1e-12);
        expect(px).toBeGreaterThanOrEqual(-3.2 - 1e-12);
        expect(px).toBeLessThanOrEqual(1.2 + 1e-12);
        expect(Math.sign(py)).toBe(Math.sign(im));
      }
    });
  });

  describe('Bode and time response drawing', () => {
    test('draw_gain draws one vertex per pixel column that is inside the plot', () => {
      const graph = analysed(preset('GRAPH_ONE_REAL_POLE'));
      graph.draw_gain();
      const vertices = calls('vertex');
      expect(vertices.length).toBeGreaterThan(0);
      expect(calls('beginShape')).toHaveLength(1);
      expect(calls('endShape')).toHaveLength(1);
      const inside = graph.bode_gain_array.filter((gain) => {
        const y = p5_map(gain, 60 - 20 * 6, 60, 200, 0);
        return y < 200 && y > 0;
      }).length;
      expect(vertices).toHaveLength(inside);
      for (const [x, y] of vertices) {
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(200);
        expect(Number.isInteger(x)).toBe(true);
      }
      // Strokes with the graph's own colour.
      expect(calls('stroke')[0]).toEqual([graph.bode_hue, 360, 360]);
    });

    test('draw_gain skips columns above/below the plot', () => {
      const graph = analysed(preset('GRAPH_ONE_REAL_POLE'));
      set_globals({ gain_upper_bound: 0 }); // the 6 dB low-frequency gain is now above the plot
      graph.draw_gain();
      const above = graph.bode_gain_array.filter((gain) => gain > 0).length;
      expect(above).toBeGreaterThan(0);
      expect(calls('vertex').length).toBeLessThan(GEOMETRY.graph_bode_mag_width - above + 1);
    });

    test('draw_gain leaves out a curve that lies exactly on the edge of the plot', () => {
      const graph = analysed('10'); // a constant 20 dB
      expect(graph.bode_gain_array.every((gain) => gain === 20)).toBe(true);
      set_globals({ gain_upper_bound: 20 }); // top edge
      graph.draw_gain();
      expect(calls('vertex')).toHaveLength(0);
      set_globals({ gain_upper_bound: 20 + 20 * 6 }); // bottom edge
      graph.draw_gain();
      expect(calls('vertex')).toHaveLength(0);
      set_globals({ gain_upper_bound: 30 }); // inside
      graph.draw_gain();
      expect(calls('vertex')).toHaveLength(GEOMETRY.graph_bode_mag_width);
    });

    test('draw_phase draws vertices; stop_on_overflow stops at the first column outside the plot', () => {
      // A lead network: phase rises to ~55 deg and returns to 0, so it leaves a plot capped at 20 deg.
      set_globals({ phase_lower_bound: -180, phase_upper_bound: 20 });
      const graph = analysed('(1+10*s)/(1+s)');
      graph.draw_phase();
      const all = calls('vertex').length;
      drawn.length = 0;
      graph.draw_phase(true);
      const until_overflow = calls('vertex').length;
      expect(until_overflow).toBeGreaterThan(0);
      expect(until_overflow).toBeLessThan(all);
      for (const [, y] of calls('vertex')) {
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(200);
      }
    });

    test('draw_timeresponse draws every sample, spaced by the graph\'s own precision', () => {
      const graph = with_time_response(preset('GRAPH_ONE_REAL_POLE'));
      graph.draw_timeresponse();
      const vertices = calls('vertex');
      expect(vertices).toHaveLength(TIMEREP_LENGTH);
      expect(vertices[0][0]).toBe(0);
      expect(vertices[1][0]).toBeCloseTo(300 / TIMEREP_LENGTH, 12);
      // Values are constrained to the plot.
      for (const [, y] of vertices) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(200);
      }
      // y = 0 level (min_y -1, max_y 3) is at 3/4 of the height; the first sample is 0.
      expect(vertices[0][1]).toBeCloseTo(150, 12);
    });

    test('draw_timeresponse of a graph without response draws an empty shape', () => {
      const graph = analysed(preset('GRAPH_PID'));
      graph.draw_timeresponse();
      expect(calls('vertex')).toHaveLength(0);
      expect(calls('beginShape')).toHaveLength(1);
      expect(calls('endShape')).toHaveLength(1);
    });
  });

  describe('Nyquist drawing', () => {
    const nyquist_marks = (formula) => {
      const graph = analysed(formula);
      fit_nyquist_range(graph);
      drawn.length = 0;
      graph.draw_nyquist_response();
      return { x_marks: calls('line').length / 2, o_marks: calls('ellipse').length, graph };
    };

    test('draw_nyquist_response draws the curve as vertices, split where it leaves the plot', () => {
      const graph = analysed(preset('GRAPH_TIME_DELAY'));
      fit_nyquist_range(graph);
      graph.draw_nyquist_response();
      expect(calls('vertex').length).toBeGreaterThan(100);
      expect(calls('beginShape').length).toBe(calls('endShape').length);
      for (const [x, y] of calls('vertex')) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThanOrEqual(250);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThanOrEqual(200);
      }
      // Zoomed in to a small corner, most of the curve is outside and the shape is split.
      set_globals({ min_nyquist_x: 0, max_nyquist_x: 0.1, min_nyquist_y: 0, max_nyquist_y: 0.1 });
      drawn.length = 0;
      graph.draw_nyquist_response();
      expect(calls('beginShape').length).toBeGreaterThan(1);
      expect(calls('vertex').length).toBeLessThan(300);
    });

    test('one real pole: one X for T_1', () => {
      expect(nyquist_marks(preset('GRAPH_ONE_REAL_POLE'))).toMatchObject({ x_marks: 1, o_marks: 0 });
    });

    test('two real poles: an X for each of T_2 and T_3', () => {
      expect(nyquist_marks(preset('GRAPH_TWO_REAL_POLES'))).toMatchObject({ x_marks: 2, o_marks: 0 });
    });

    test('two complex poles: one X for z <= 1, two for z > 1, none for w = 0', () => {
      expect(nyquist_marks(preset('GRAPH_TWO_COMPLEX_POLES'))).toMatchObject({ x_marks: 1 });
      set_sliders({ z: 1 });
      expect(nyquist_marks(preset('GRAPH_TWO_COMPLEX_POLES'))).toMatchObject({ x_marks: 1 });
      set_sliders({ z: 2 });
      expect(nyquist_marks(preset('GRAPH_TWO_COMPLEX_POLES'))).toMatchObject({ x_marks: 2 });
      set_sliders({ z: 0.3, w: 0 });
      expect(nyquist_marks(preset('GRAPH_TWO_COMPLEX_POLES'))).toMatchObject({ x_marks: 0 });
    });

    test('two complex poles with z > 1 and a zero root: a zero frequency is not marked', () => {
      // z = 1 + epsilon is still > 1; w = 0 gives both roots 0, so nothing is drawn.
      set_sliders({ z: 2, w: 0 });
      expect(nyquist_marks(preset('GRAPH_TWO_COMPLEX_POLES'))).toMatchObject({ x_marks: 0 });
    });

    test('one zero two poles: two X and one O', () => {
      expect(nyquist_marks(preset('GRAPH_ONE_ZERO_TWO_POLES'))).toMatchObject({ x_marks: 2, o_marks: 1 });
    });

    test('presets without marks, hidden graphs and zero time constants draw none', () => {
      expect(nyquist_marks(preset('GRAPH_FOUR_POLES'))).toMatchObject({ x_marks: 0, o_marks: 0 });
      set_sliders({ T_1: 0 });
      expect(nyquist_marks(preset('GRAPH_ONE_REAL_POLE'))).toMatchObject({ x_marks: 0 });
      set_sliders({ T_1: 1.5 });
      const graph = analysed(preset('GRAPH_ONE_REAL_POLE'));
      fit_nyquist_range(graph);
      graph.bode_displaybool = false;
      drawn.length = 0;
      graph.draw_nyquist_response();
      expect(calls('line')).toHaveLength(0);
      expect(calls('vertex').length).toBeGreaterThan(0);
    });

    test('draw_nyquist_X is placed at the Nyquist point of the frequency', () => {
      const graph = analysed('1/(s+1)');
      fit_nyquist_range(graph);
      graph.draw_nyquist_X(1);
      const [first] = calls('line');
      // G(j) = (1 - j)/2; the X is centered on it (6 + 2 ln 2 = line_length).
      const length = 6 + 2 * Math.log(2);
      const center_x = (first[0] + first[2]) / 2;
      const center_y = (first[1] + first[3]) / 2;
      const re = 0.5;
      const im = -0.5;
      const expected_x = p5_map(re, graph.bode_min_nyquist_x, graph.bode_max_nyquist_x, 0, 250);
      const expected_y = p5_map(im, graph.bode_max_nyquist_y, graph.bode_min_nyquist_y, 0, 200);
      expect(first[2] - first[0]).toBeCloseTo(2 * length, 9);
      expect(center_x).toBeCloseTo(expected_x, 0);
      expect(center_y).toBeCloseTo(expected_y, 0);
      expect(calls('push')).toHaveLength(1);
      expect(calls('pop')).toHaveLength(1);
    });

    test('draw_nyquist_X and draw_nyquist_O ignore frequencies outside the sampled range', () => {
      const graph = analysed('1/(s+1)');
      fit_nyquist_range(graph);
      for (const frequency of [1e-6, 1e6]) {
        graph.draw_nyquist_X(frequency);
        graph.draw_nyquist_O(frequency);
      }
      expect(drawn).toHaveLength(0);
    });

    test('draw_nyquist_X and draw_nyquist_O ignore points outside the plot range', () => {
      const graph = analysed('1/(s+1)');
      set_globals({ min_nyquist_x: 10, max_nyquist_x: 20, min_nyquist_y: 10, max_nyquist_y: 20 });
      graph.draw_nyquist_X(1);
      graph.draw_nyquist_O(1);
      expect(drawn).toHaveLength(0);
    });

    test('draw_nyquist_O draws a circle on the curve', () => {
      const graph = analysed('1/(s+1)');
      fit_nyquist_range(graph);
      graph.draw_nyquist_O(1);
      const [circle] = calls('ellipse');
      expect(circle[2]).toBeCloseTo(15 + 3 * Math.log(2), 12);
      expect(circle[0]).toBeCloseTo(p5_map(0.5, graph.bode_min_nyquist_x, graph.bode_max_nyquist_x, 0, 250), 0);
    });

    test('draw_nyquist_X swallows errors from the drawing calls', () => {
      const graph = analysed('1/(s+1)');
      fit_nyquist_range(graph);
      window.line = () => { throw new Error('canvas gone'); };
      expect(() => graph.draw_nyquist_X(1)).not.toThrow();
      window.ellipse = () => { throw new Error('canvas gone'); };
      expect(() => graph.draw_nyquist_O(1)).not.toThrow();
    });

    test('draw_nyquist_value draws a dot at the sample for a fraction of the frequency axis', () => {
      const graph = analysed('1/(s+1)');
      fit_nyquist_range(graph);
      graph.draw_nyquist_value(0.5);
      const [dot] = calls('ellipse');
      expect(dot[2]).toBe(12);
      const [expected_x, expected_y] = graph.get_nyquist_value(0.5);
      expect(dot[0]).toBeCloseTo(expected_x, 12);
      expect(dot[1]).toBeCloseTo(expected_y, 12);
      expect(calls('translate')[0]).toEqual([65 + 400, 45 + 300]);
      expect(calls('fill')[0]).toEqual([graph.bode_hue, 360, 360]);
    });

    test('draw_nyquist_value draws nothing when the sample is outside the plot', () => {
      const graph = analysed('1/(s+1)');
      set_globals({ min_nyquist_x: 10, max_nyquist_x: 20 });
      graph.draw_nyquist_value(0.5);
      expect(drawn).toHaveLength(0);
    });

    test('get_nyquist_value maps the sampled G(jw) to plot coordinates', () => {
      const graph = analysed('1/(s+1)');
      fit_nyquist_range(graph);
      const [x, y] = graph.get_nyquist_value(0);
      // Lowest frequency: G is about 1, the right-most real value.
      const { re, im } = graph.bode_complex_array[0];
      expect(x).toBeCloseTo(p5_map(re, graph.bode_min_nyquist_x, graph.bode_max_nyquist_x, 0, 250), 12);
      expect(y).toBeCloseTo(p5_map(im, graph.bode_max_nyquist_y, graph.bode_min_nyquist_y, 0, 200), 12);
      expect(x).toBeCloseTo(250, 0);
      const [x_half] = graph.get_nyquist_value(0.5);
      expect(x_half).toBeLessThan(x);
    });
  });

  describe('pole-zero map drawing', () => {
    const draw_map = (graph, draw_axis = true) => {
      drawn.length = 0;
      graph.draw_pole_zero(draw_axis);
    };
    // The grid and frame account for 3 + 5 + 2 lines before any pole or zero.
    const GRID_LINES = 10;
    const pole_marks = () => (calls('line').length - GRID_LINES) / 2;

    // Where plot_pole/plot_zero put a point (pole_zero_width = pole_zero_height = 96).
    const screen = (re, im) => [48 + (re + 1) * 24, 48 + im * 24];

    test('the grid has 3 vertical and 5 horizontal lines plus the frame, with the real axis labelled', () => {
      const graph = analysed(preset('GRAPH_FOUR_POLES'));
      graph.graph_name = 'Graph A';
      draw_map(graph, true);
      expect(texts()).toEqual(['-3.0', '-2.0', '-1.0', '0.0', '1.0', 'Real axis [1/s]', 'Graph A']);
      const vertical = calls('line').filter(([x1, , x2]) => x1 === x2);
      const horizontal = calls('line').filter(([, y1, , y2]) => y1 === y2);
      expect(vertical).toHaveLength(3 + 2); // 3 grid + 2 frame sides
      expect(horizontal).toHaveLength(5);
      // The text of the name is centered at the bottom.
      expect(calls('text').at(-1)).toEqual(['Graph A', 48, 96 - 7]);
    });

    test('without draw_axis only the graph name is written', () => {
      const graph = analysed(preset('GRAPH_FOUR_POLES'));
      graph.graph_name = 'G';
      draw_map(graph, false);
      expect(texts()).toEqual(['G']);
    });

    test('one real pole: X at -1/T_1, clamped to -3.2 for a small T_1', () => {
      const graph = analysed(preset('GRAPH_ONE_REAL_POLE'));
      draw_map(graph);
      expect(pole_marks()).toBe(1);
      const [x, y] = screen(-1 / 1.5, 0);
      const first = calls('line')[GRID_LINES];
      expect((first[0] + first[2]) / 2).toBeCloseTo(x, 9);
      expect((first[1] + first[3]) / 2).toBeCloseTo(y, 9);

      set_sliders({ T_1: 0.1 });
      draw_map(graph);
      const clamped = calls('line')[GRID_LINES];
      expect((clamped[0] + clamped[2]) / 2).toBeCloseTo(screen(-3.2, 0)[0], 9);
    });

    test('two real poles: two X', () => {
      draw_map(analysed(preset('GRAPH_TWO_REAL_POLES')));
      expect(pole_marks()).toBe(2);
      expect(calls('ellipse')).toHaveLength(0);
    });

    test('one zero: one O at -1/T_4', () => {
      draw_map(analysed(preset('GRAPH_ONE_ZERO')));
      expect(pole_marks()).toBe(0);
      const [circle] = calls('ellipse');
      expect(circle[0]).toBeCloseTo(screen(-1 / 2, 0)[0], 9);
      expect(circle[1]).toBeCloseTo(48, 9);
      expect(circle[2]).toBeCloseTo(15 + 3 * Math.log(2), 9);
      expect(circle[3]).toBe(circle[2]);
    });

    test('one zero two poles: two X and one O', () => {
      draw_map(analysed(preset('GRAPH_ONE_ZERO_TWO_POLES')));
      expect(pole_marks()).toBe(2);
      expect(calls('ellipse')).toHaveLength(1);
      // T_6 = 1, T_7 = 0.5, T_8 = 0.8: poles at -1 and -2, zero at -1.25.
      const centers = calls('line').slice(GRID_LINES).filter((_, i) => i % 2 === 0)
        .map(([x1, , x2]) => (x1 + x2) / 2);
      expect(centers[0]).toBeCloseTo(screen(-1, 0)[0], 9);
      expect(centers[1]).toBeCloseTo(screen(-2, 0)[0], 9);
      expect(calls('ellipse')[0][0]).toBeCloseTo(screen(-1.25, 0)[0], 9);
    });

    test('four poles: one X (the rest are the same pole)', () => {
      draw_map(analysed(preset('GRAPH_FOUR_POLES')));
      expect(pole_marks()).toBe(1);
    });

    test('PID: an X at the origin and two O at -1/T_i and -1/T_d', () => {
      draw_map(analysed(preset('GRAPH_PID')));
      expect(pole_marks()).toBe(1);
      const first = calls('line')[GRID_LINES];
      expect((first[0] + first[2]) / 2).toBeCloseTo(screen(0, 0)[0], 9);
      const circles = calls('ellipse');
      expect(circles).toHaveLength(2);
      expect(circles[0][0]).toBeCloseTo(screen(-1 / 2, 0)[0], 9);
      expect(circles[1][0]).toBeCloseTo(screen(-3.2, 0)[0], 9); // 1/0.3 = 3.33 is clamped to 3.2
    });

    test('two complex poles with z <= 1: a conjugate pair with lines to the origin', () => {
      draw_map(analysed(preset('GRAPH_TWO_COMPLEX_POLES')));
      // 2 lines to the origin + 2 X; pole at -z*w + j*w*sqrt(1-z^2) = -0.9 + 2.862j.
      expect(calls('line').length - GRID_LINES).toBe(2 + 4);
      const to_origin = calls('line').slice(GRID_LINES, GRID_LINES + 2);
      const [px, py] = screen(0, 0);
      for (const [, , x2, y2] of to_origin) {
        expect(x2).toBe(px);
        expect(y2).toBe(py);
      }
      // 2.862 is outside the map (imag. limit 2.2), so the pair is clamped and mirrored.
      expect(to_origin[0][1]).toBeCloseTo(48 + 2.2 * 24 * (-0.9 / -0.9) * 1, 9);
      expect(to_origin[1][1]).toBeCloseTo(48 - 2.2 * 24, 9);
      expect(to_origin[0][0]).toBeLessThan(px);
      expect(window.eval('bode_3_real')).toBeCloseTo(-0.9, 12);
      expect(window.eval('bode_3_imaginary')).toBeCloseTo(3 * Math.sqrt(1 - 0.09), 12);
    });

    test('two complex poles inside the map are drawn unclamped', () => {
      set_sliders({ z: 0.5, w: 1 });
      draw_map(analysed(preset('GRAPH_TWO_COMPLEX_POLES')));
      const to_origin = calls('line').slice(GRID_LINES, GRID_LINES + 2);
      const expected_x = screen(-0.5, 0)[0];
      expect(to_origin[0][0]).toBeCloseTo(expected_x, 9);
      expect(to_origin[0][1]).toBeCloseTo(48 + Math.sqrt(0.75) * 24, 9);
      expect(to_origin[1][1]).toBeCloseTo(48 - Math.sqrt(0.75) * 24, 9);
    });

    test('two complex poles with z > 1: two real poles, clamped to -3.2..1.2', () => {
      set_sliders({ z: 2, w: 3 });
      draw_map(analysed(preset('GRAPH_TWO_COMPLEX_POLES')));
      expect(pole_marks()).toBe(2);
      // Roots: -6 +- 3*sqrt(3) = -0.804 and -11.196 (clamped to -3.2).
      const marks = calls('line').slice(GRID_LINES).filter((_, i) => i % 2 === 0);
      const centers = marks.map(([x1, , x2]) => (x1 + x2) / 2);
      expect(centers[0]).toBeCloseTo(screen(-6 + 3 * Math.sqrt(3), 0)[0], 9);
      expect(centers[1]).toBeCloseTo(screen(-3.2, 0)[0], 9);

      // A pole to the right of the map is clamped to 1.2: z > 1 with a negative z*w.
      set_sliders({ z: 2, w: -3 });
      draw_map(analysed(preset('GRAPH_TWO_COMPLEX_POLES')));
      const right = calls('line').slice(GRID_LINES).filter((_, i) => i % 2 === 0)
        .map(([x1, , x2]) => (x1 + x2) / 2);
      expect(Math.max(...right)).toBeCloseTo(screen(1.2, 0)[0], 9);
    });

    test('display-only map: poles as X and zeros as O at the computed positions', () => {
      const graph = analysed('(s+1)/(s^2+2*s+5)'); // poles -1 +- 2j, zero -1
      graph.graph_name = 'Display';
      draw_map(graph);
      expect(pole_marks()).toBe(2);
      const circles = calls('ellipse');
      expect(circles).toHaveLength(1);
      expect(circles[0][0]).toBeCloseTo(screen(-1, 0)[0], 6);
      expect(circles[0][1]).toBeCloseTo(48, 6);
      const centers_y = calls('line').slice(GRID_LINES).filter((_, i) => i % 2 === 0)
        .map(([, y1, , y2]) => (y1 + y2) / 2).sort((a, b) => a - b);
      expect(centers_y[0]).toBeCloseTo(48 - 2 * 24, 6);
      expect(centers_y[1]).toBeCloseTo(48 + 2 * 24, 6);
      expect(texts().at(-1)).toBe('Display');
    });

    test('display-only map clamps poles and zeros outside the map', () => {
      const graph = analysed('(s+100)/(s+200)');
      draw_map(graph);
      const [x1, , x2] = calls('line')[GRID_LINES];
      expect((x1 + x2) / 2).toBeCloseTo(screen(-3.2, 0)[0], 9);
      expect(calls('ellipse')[0][0]).toBeCloseTo(screen(-3.2, 0)[0], 9);
    });

    test('display-only map with no poles or zeros draws only the grid', () => {
      const graph = analysed('5');
      draw_map(graph);
      expect(calls('line')).toHaveLength(GRID_LINES);
      expect(calls('ellipse')).toHaveLength(0);
    });

    test('a graph without computed poles (unparsable) draws only the grid', () => {
      const graph = analysed('sqrt(s+1)');
      draw_map(graph);
      expect(calls('line')).toHaveLength(GRID_LINES);
    });

    test('plot_pole draws a cross and plot_zero a circle, with sizes from the stroke weight', () => {
      const graph = new_graph('1/s');
      set_globals({ line_stroke_weight: 4 });
      graph.plot_pole(-1, 0);
      const [a, b] = calls('line');
      const length = 6 + 2 * Math.log(4);
      expect(a).toEqual([48 - length, 48 - length, 48 + length, 48 + length]);
      expect(b).toEqual([48 + length, 48 - length, 48 - length, 48 + length]);
      drawn.length = 0;
      graph.plot_zero(1, -2);
      expect(calls('ellipse')[0]).toEqual([48 + 2 * 24, 48 - 2 * 24, 15 + 3 * Math.log(4), 15 + 3 * Math.log(4)]);
    });
  });

  describe('drawing smoke test over every preset', () => {
    const assert_no_nan = (context) => {
      for (const name of ['line', 'vertex', 'ellipse', 'text', 'translate']) {
        for (const args of calls(name)) {
          for (const value of number_args(args)) {
            if (Number.isNaN(value)) throw new Error(`${context}: ${name}(${args.join(', ')}) has a NaN coordinate`);
          }
        }
      }
    };

    const slider_sets = [
      { label: 'default sliders', values: {} },
      { label: 'negative time constants', values: { T_1: -1, T_2: -1, T_3: -0.5, T_4: -2, T_5: -0.7, T_6: -1, T_7: -0.5, T_8: -0.8, T_i: -2, T_d: -0.3 } },
      { label: 'zero time constants', values: { T_1: 0.001, T_2: 0, T_3: 0, T_4: 0, T_5: 0, T_6: 0, T_7: 0, T_8: 0, T_i: 1, T_d: 0 } },
      { label: 'extreme values', values: { z: 3, w: 100, L: 5, K: 50, k_1: -5 } },
    ];

    for (const { label, values } of slider_sets) {
      test(`each preset draws without NaN coordinates (${label})`, () => {
        for (const [index, entry] of global_value('GRAPH_ORDER').entries()) {
          set_sliders(values);
          set_globals({ input_formula: '1/s' });
          const graph = new_graph(entry.formula, index);
          graph.graph_name = entry.name;
          graph.get_complex_p5();
          graph.get_timevalues_p5();
          fit_nyquist_range(graph);
          drawn.length = 0;

          graph.draw_gain();
          graph.draw_phase();
          graph.draw_phase(true);
          graph.draw_timeresponse();
          graph.draw_nyquist_response();
          graph.draw_nyquist_value(0.3);
          graph.draw_pole_zero(true);
          if (graph.has_pole_zero_map()) expect(texts()).toContain(entry.name);
          assert_no_nan(`${entry.name} / ${label}`);
          expect(calls('beginShape').length).toBe(calls('endShape').length);
          expect(calls('push').length).toBe(calls('pop').length);
        }
      });
    }

    test('each preset draws curves with vertices for both step and impulse input', () => {
      for (const input of ['1/s', '1']) {
        for (const [index, entry] of global_value('GRAPH_ORDER').entries()) {
          set_sliders();
          set_globals({ input_formula: input });
          const graph = new_graph(entry.formula, index);
          graph.get_complex_p5();
          graph.get_timevalues_p5();
          drawn.length = 0;
          graph.draw_gain();
          expect(calls('vertex').length).toBeGreaterThan(0);
          drawn.length = 0;
          graph.draw_timeresponse();
          const shows_time_response = !['GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_ONE_POLE_WITH_PID_OPEN']
            .some((name) => preset(name) === entry.formula);
          if (shows_time_response) expect(calls('vertex')).toHaveLength(TIMEREP_LENGTH);
        }
      }
    });
  });

  describe('constructor', () => {
    test('starts with empty curves, all displays on and a colour from the colour table', () => {
      const graph = new_graph('1/(s+1)', 3);
      const color_table = global_value('color_table');
      expect(graph.bode_id).toBe(3);
      expect(graph.bode_hue).toBe(color_table[3]);
      expect(graph.bode_complex_array).toEqual([]);
      expect(graph.bode_poles_zeros).toBeNull();
      for (const flag of ['bode_displaybool', 'bode_display_bodemag_bool', 'bode_display_bodephase_bool',
        'bode_display_timeresponse_bool', 'bode_display_nyquist_bool', 'bode_display_information_bool',
        'bode_display_equation_bool', 'bode_display_pole_zero_bool']) {
        expect(graph[flag]).toBe(true);
      }
      // Ids past the end of the table wrap around.
      expect(new_graph('1/s', color_table.length + 2).bode_hue).toBe(color_table[2]);
    });
  });
});
