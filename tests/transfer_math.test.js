/** @jest-environment jsdom */
// Formula evaluation in src/transfer_math.js: MathLive ascii-math is turned into math.js syntax,
// compiled once and evaluated with the slider values as a scope.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SENTINEL = 18012001;

// The formula text MathLive 0.98.6 produces for the presets' LaTeX (checked in Chromium).
const MATHLIVE = {
  one_real_pole: '(k_1)/(1+T_1s)',
  two_real_poles: '(k_2)/((1+T_2s)(1+T_3s))',
  two_complex_poles: '(k_3w^2)/(s^2+2zws+w^2)',
  time_delay: '(3)/(1+s)e^(-Ls)',
  pid: 'K(1+(1)/(sT_i)+sT_d)',
};

let math;

function set_sliders(values) {
  const alphabet = global_value('range_slider_alphabet');
  const variables = global_value('range_slider_variables');
  for (let i = 1; i < variables.length; i++) variables[i] = SENTINEL;
  for (const [name, value] of Object.entries(values)) variables[alphabet.indexOf(name)] = value;
}

// G(jω) through the app.
function app_value(formula, omega) {
  const binding = window.bind_formula(formula);
  return window.getComplexValues(binding, omega);
}

// The evaluation the app used before formulas were compiled: replace every slider letter by its
// value as text, replace s by (ωi), then math.evaluate. Correct for the preset formulas when every
// value is positive, so it is the reference for "nothing changed" there.
function legacy_value(formula, omega) {
  const alphabet = global_value('range_slider_alphabet');
  const variables = global_value('range_slider_variables');
  let text = formula;
  alphabet.forEach((letter, i) => { if (text.includes(letter)) text = text.replaceAll(letter, variables[i]); });
  return math.evaluate(text.replaceAll('s', '(' + omega + 'i)'));
}

const expect_complex_close = (actual, expected, digits = 12) => {
  expect(actual.re).toBeCloseTo(expected.re, digits);
  expect(actual.im).toBeCloseTo(expected.im, digits);
};

beforeAll(() => {
  loadApp();
  math = window.math;
});

describe('insert_explicit_multiplication', () => {
  test.each([
    ['(k_1)/(1+T_1s)', '(k_1)/(1+T_1*s)'],
    ['(k_2)/((1+T_2s)(1+T_3s))', '(k_2)/((1+T_2*s)*(1+T_3*s))'],
    ['(k_3w^2)/(s^2+2zws+w^2)', '(k_3*w^2)/(s^2+2*z*w*s+w^2)'],
    ['(3)/(1+s)e^(-Ls)', '(3)/(1+s)*e^(-L*s)'],
    ['(Kk_1)/(T_iT_ds^2)', '(K*k_1)/(T_i*T_d*s^2)'],
    ['K(1+(1)/(sT_i)+sT_d)', 'K*(1+(1)/(s*T_i)+s*T_d)'],
    ['k_4(1+T_8s)/(1+T_6s)*1/(1+T_7s)', 'k_4*(1+T_8*s)/(1+T_6*s)*1/(1+T_7*s)'],
    ['K + K / (s * T_i) + K * T_d * s', 'K+K/(s*T_i)+K*T_d*s'],
    ['2sqrt(s)+exp(-s)', '2*sqrt(s)+exp(-s)'],
    ['(1)/(s)(1)/(s)', '(1)/(s)*(1)/(s)'],
    ['2⋅3s', '2*3*s'],
    ['0.5s+2i', '0.5*s+2*i'],
    ['cos', 'c*o*s'], // a function name only counts when it is followed by "("
    ['2Ds', '2*D*s'], // an unknown letter is still an operand
  ])('%s -> %s', (input, expected) => {
    expect(window.insert_explicit_multiplication(input)).toBe(expected);
  });

  test('no name is the start of another name, so the first match is the right one', () => {
    const names = [...global_value('range_slider_alphabet'), 's', 'i'];
    for (const name of names) {
      expect(names.filter((other) => other !== name && other.startsWith(name))).toEqual([]);
    }
  });
});

describe('bind_formula', () => {
  test('returns null when a slider used by the formula has no value', () => {
    set_sliders({ k_1: 1 });
    expect(window.bind_formula('k_1/(1+T_1*s)')).toBeNull();
  });

  test('letters inside a function name are not slider variables', () => {
    set_sliders({});
    expect(window.bind_formula('1/(1+sqrt(s))')).not.toBeNull();
  });

  test('reuses the compiled formula for the same text', () => {
    set_sliders({ k_1: 1, T_1: 2 });
    const first = window.bind_formula('k_1/(1+T_1*s)');
    set_sliders({ k_1: 3, T_1: 4 });
    const second = window.bind_formula('k_1/(1+T_1*s)');
    expect(second.code).toBe(first.code);
    expect(second.scope).toMatchObject({ k_1: 3, T_1: 4 });
  });

  test('a syntax error evaluates to 0, as before', () => {
    set_sliders({});
    expect(app_value('1/(1+', 1)).toEqual(math.complex(0, 0));
  });
});

describe('getComplexValues', () => {
  test('every preset formula gives the same values as the old text substitution', () => {
    set_sliders({
      k_1: 2, T_1: 1.5, k_2: 3, T_2: 1, T_3: 0.4, k_3: 2, w: 3, z: 0.3, L: 0.5,
      k_4: 2, T_6: 1, T_7: 0.5, T_8: 0.8, k_5: 1.5, T_5: 0.7, T_4: 2, K: 1.2, T_i: 2, T_d: 0.3,
    });
    for (const preset of global_value('GRAPH_ORDER')) {
      for (const omega of [0.01, 0.3, 1, 7, 1000]) {
        expect_complex_close(app_value(preset.formula, omega), legacy_value(preset.formula, omega));
      }
    }
  });

  test('MathLive forms of the presets equal the hand-written formulas', () => {
    set_sliders({ k_1: 2, T_1: 1.5, k_2: 3, T_2: 1, T_3: 0.4, k_3: 2, w: 3, z: 0.3, L: 0.5, K: 1.2, T_i: 2, T_d: 0.3 });
    const presets = {
      one_real_pole: global_value('GRAPH_ONE_REAL_POLE'),
      two_real_poles: global_value('GRAPH_TWO_REAL_POLES'),
      two_complex_poles: global_value('GRAPH_TWO_COMPLEX_POLES'),
      time_delay: global_value('GRAPH_TIME_DELAY'),
      pid: global_value('GRAPH_PID'),
    };
    for (const [key, preset] of Object.entries(presets)) {
      for (const omega of [0.05, 0.8, 4]) {
        expect_complex_close(app_value(MATHLIVE[key], omega), app_value(preset.formula, omega));
      }
    }
  });

  test('a number written next to a variable is multiplied, not concatenated (2zws, k_3w^2)', () => {
    set_sliders({ k_3: 1, w: 1, z: 0.3 });
    // Old text substitution turned "k_3w^2" into "11^2" = 121.
    const s = math.complex(0, 0.5);
    const exact = math.divide(1, math.add(math.add(math.multiply(s, s), math.multiply(0.6, s)), 1));
    expect_complex_close(app_value(MATHLIVE.two_complex_poles, 0.5), exact);
  });

  test('negative slider values keep their sign under powers and products', () => {
    set_sliders({ k_3: 1, w: -1, z: -0.3 });
    const s = math.complex(0, 0.5);
    // k_3*w^2/(s^2+2*z*w*s+w^2) with w=-1, z=-0.3: 1/(s^2+0.6s+1)
    const exact = math.divide(1, math.add(math.add(math.multiply(s, s), math.multiply(0.6, s)), 1));
    expect_complex_close(app_value(global_value('GRAPH_TWO_COMPLEX_POLES').formula, 0.5), exact);
    expect_complex_close(app_value(MATHLIVE.two_complex_poles, 0.5), exact);
  });

  test('an edited time delay keeps e^(-Ls) in the numerator: phase falls by ωL', () => {
    set_sliders({ L: 2 });
    const omega = 0.7;
    const value = app_value(MATHLIVE.time_delay, omega);
    const lag = math.divide(3, math.complex(1, omega));
    expect(math.abs(value)).toBeCloseTo(math.abs(lag), 12);
    expect(value.arg()).toBeCloseTo(math.complex(math.multiply(lag, math.exp(math.complex(0, -omega * 2)))).arg(), 12);
  });

  test('functions such as sqrt can be used', () => {
    set_sliders({});
    const omega = 4;
    const exact = math.divide(1, math.add(1, math.sqrt(math.complex(0, omega))));
    expect_complex_close(app_value('(1)/(1+sqrt(s))', omega), exact);
  });

  test('a constant formula gives a complex value', () => {
    set_sliders({});
    expect(app_value('3', 1)).toEqual(math.complex(3, 0));
  });
});

describe('bode_graph with formulas the old code got wrong', () => {
  beforeEach(() => {
    set_globals({ graph_bode_mag_width: 400, graph_step_response_width: 300, min_10power: -2,
      x_case_gain: 5, max_x_timerep: 10, precision: 4, input_formula: '1/s' });
  });

  test('an unset slider variable leaves the margins undefined instead of throwing', () => {
    set_sliders({});
    const graph = window.eval('new bode_graph(1, "q/(1+s)")');
    expect(() => graph.get_complex_p5()).not.toThrow();
    expect(graph.bode_gain_array).toEqual([]);
  });

  test('the edited complex-poles formula has the same Bode curves as the preset', () => {
    set_sliders({ k_3: 1, w: 1, z: 0.3 });
    const edited = window.eval(`new bode_graph(1, ${JSON.stringify(MATHLIVE.two_complex_poles)})`);
    const preset = window.eval(`new bode_graph(2, ${JSON.stringify(global_value('GRAPH_TWO_COMPLEX_POLES').formula)})`);
    edited.get_complex_p5();
    preset.get_complex_p5();
    edited.bode_gain_array.forEach((gain, i) => expect(gain).toBeCloseTo(preset.bode_gain_array[i], 10));
    expect(edited.bode_phase_margin).toBeCloseTo(preset.bode_phase_margin, 10);
  });

  test('the time response of a Gaver-Stehfest formula is unchanged', () => {
    set_sliders({ k_5: 1.5, T_5: 0.7 });
    const graph = window.eval(`new bode_graph(1, ${JSON.stringify(global_value('GRAPH_FOUR_POLES').formula)})`);
    graph.get_timevalues_p5();
    // Gaver-Stehfest N=10 of 1.5/(s(1+0.7s)^4), evaluated the old way.
    const V = [1 / 12, -385 / 12, 1279, -46871 / 3, 505465 / 6, -473915 / 2, 1127735 / 3, -1020215 / 3, 328125 / 2, -65625 / 2];
    const ln2 = 0.69314718056;
    const gaver = (t) => ln2 / t * V.reduce((sum, v, j) => {
      const s = (j + 1) * ln2 / t;
      return sum + v * (1 / s) * (1.5 / Math.pow(1 + 0.7 * s, 4));
    }, 0);
    graph.bode_timerep_array.forEach((y, i) => {
      const t = i === 0 ? 0.00001 : (i * 4 / 300) * 10;
      expect(y).toBeCloseTo(gaver(t), 6);
    });
  });
});
