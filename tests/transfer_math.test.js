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

// Sets the given slider values and unsets all others. Also fills variable_position (normally done
// in setup()), which the closed-form time responses read.
function set_sliders(values) {
  const alphabet = global_value('range_slider_alphabet');
  const variables = global_value('range_slider_variables');
  const variable_position = global_value('variable_position');
  alphabet.forEach((name, i) => { variable_position[name] = i; });
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

  test('Gaver-Stehfest evaluation of a compiled formula is unchanged', () => {
    set_sliders({ k_5: 1.5, T_5: 0.7 });
    const binding = window.bind_formula('(1/s)*(' + global_value('GRAPH_FOUR_POLES').formula + ')');
    const times = Array.from({ length: 75 }, (_, i) => i === 0 ? 0.00001 : (i * 4 / 300) * 10);
    // Gaver-Stehfest N=10 of 1.5/(s(1+0.7s)^4), evaluated the old way.
    const V = [1 / 12, -385 / 12, 1279, -46871 / 3, 505465 / 6, -473915 / 2, 1127735 / 3, -1020215 / 3, 328125 / 2, -65625 / 2];
    const ln2 = 0.69314718056;
    const gaver = (t) => ln2 / t * V.reduce((sum, v, j) => {
      const s = (j + 1) * ln2 / t;
      return sum + v * (1 / s) * (1.5 / Math.pow(1 + 0.7 * s, 4));
    }, 0);
    times.forEach((t) => expect(window.getTimeValues(binding, t, 0)).toBeCloseTo(gaver(t), 6));
  });
});

describe('to_rational', () => {
  const parse = (formula) => math.parse(window.insert_explicit_multiplication(formula));

  test('a product of first-order factors gives ascending coefficients', () => {
    const rational = window.to_rational(parse('k_2/((1+T_2s)(1+T_3s))'), { k_2: 3, T_2: 1, T_3: 0.4 });
    expect(rational.num).toEqual([3]);
    expect(rational.den[0]).toBeCloseTo(1, 14);
    expect(rational.den[1]).toBeCloseTo(1.4, 14);
    expect(rational.den[2]).toBeCloseTo(0.4, 14);
  });

  test('integer powers, negative powers, subtraction and unary minus', () => {
    const rational = window.to_rational(parse('-(s-2)^2*s^(-1)'), {});
    // -(s^2-4s+4)/s
    expect(rational.num).toEqual([-4, 4, -1]);
    expect(rational.den).toEqual([0, 1]);
  });

  test.each([
    ['sqrt(s)'], ['s^0.5'], ['1/(s+i)'], ['e^(-L*s)'], ['s^s'], ['q*s'],
    ['(1+s)^51'], // more than MAX_RATIONAL_EXPONENT
  ])('%s is not a rational function of s', (formula) => {
    expect(() => window.to_rational(parse(formula), { e: Math.E, L: 1 })).toThrow('not a rational function of s');
  });
});

describe('split_time_delay', () => {
  const split = (formula, scope) => window.split_time_delay(math.parse(window.insert_explicit_multiplication(formula)), scope);
  const rest_at = (result, s) => result.node.compile().evaluate({ s, e: Math.E });

  test.each([
    ['3/(1+s)*e^(-L*s)', 0.5],
    ['(3)/(1+s)e^(-Ls)', 0.5],
    ['e^(-sL)*(3)/(1+s)', 0.5],
    ['3*exp(-2L*s)/(1+s)', 1],
    ['(1/s)*(3/(1+s)*e^(-L*s))', 0.5], // the input signal in front
  ])('%s: delay %d', (formula, delay) => {
    const result = split(formula, { L: 0.5, e: Math.E });
    expect(result.delay).toBeCloseTo(delay, 14);
    const expected = formula.startsWith('(1/s)') ? 3 / (2 * 3) : 3 / 3;
    expect(rest_at(result, 2)).toBeCloseTo(expected, 14);
  });

  test('a negative delay is ignored, as before', () => {
    expect(split('3/(1+s)*e^(-L*s)', { L: -1, e: Math.E }).delay).toBe(0);
  });

  test('an exponent with a constant term is not a delay', () => {
    expect(split('e^(1-L*s)/(1+s)', { L: 0.5, e: Math.E }).delay).toBe(0);
  });

  test('a delay inside a sum is not a delay of the whole formula', () => {
    const result = split('1+e^(-L*s)', { L: 0.5, e: Math.E });
    expect(result.delay).toBe(0);
  });
});

describe('time_response', () => {
  const times = Array.from({ length: 76 }, (_, k) => k * 0.04 * 3);

  test('lightly damped complex poles (zeta = 0.1) are exact, unlike Gaver-Stehfest', () => {
    set_sliders({ k_3: 1, w: 1, z: 0.1 });
    const response = window.time_response('1/s', MATHLIVE.two_complex_poles, times);
    const wd = Math.sqrt(1 - 0.01);
    times.forEach((t, k) => {
      expect(response[k]).toBeCloseTo(1 - Math.exp(-0.1 * t) / wd * Math.sin(wd * t + Math.acos(0.1)), 9);
    });
  });

  test('four equal real poles (a repeated pole) are exact', () => {
    set_sliders({ k_5: 1.5, T_5: 0.7 });
    const response = window.time_response('1/s', global_value('GRAPH_FOUR_POLES').formula, times);
    times.forEach((t, k) => {
      const u = t / 0.7;
      expect(response[k]).toBeCloseTo(1.5 * (1 - Math.exp(-u) * (1 + u + u * u / 2 + u * u * u / 6)), 9);
    });
  });

  test('a time delay shifts the response, also between two samples', () => {
    set_sliders({ L: 0.5 });
    const response = window.time_response('1/s', MATHLIVE.time_delay, times);
    times.forEach((t, k) => {
      expect(response[k]).toBeCloseTo(t < 0.5 ? 0 : 3 * (1 - Math.exp(-(t - 0.5))), 9);
    });
  });

  test('impulses at t = 0 are left out of an improper response', () => {
    set_sliders({ T_4: 2 });
    // step of T_4*s + 0.5 is T_4*delta(t) + 0.5
    const response = window.time_response('1/s', global_value('GRAPH_ONE_ZERO').formula, times);
    response.forEach((y) => expect(y).toBeCloseTo(0.5, 12));
  });

  test('the polynomial part of an improper fraction is divided out: (s+2)/(s+1) = 1 + 1/(s+1)', () => {
    set_sliders({});
    const response = window.time_response('1', '(s+2)/(s+1)', times);
    times.forEach((t, k) => expect(response[k]).toBeCloseTo(Math.exp(-t), 12));
  });

  test('a leading coefficient that is only float residue is dropped', () => {
    set_sliders({});
    // (1+0.1s)(1+0.2s) - 0.02s^2 leaves about 3.5e-18 s^2, so this is 1/(1+0.3s)
    const response = window.time_response('1/s', '1/((1+0.1s)(1+0.2s)-0.02s^2)', times);
    times.forEach((t, k) => expect(response[k]).toBeCloseTo(1 - Math.exp(-t / 0.3), 9));
  });

  test('a constant denominator gives no response after t = 0', () => {
    // 2/(1+0*s): only an impulse at t = 0
    expect(window.rational_impulse_response({ num: [2], den: [1, 0] }, 0, times)).toEqual(times.map(() => 0));
  });

  test('a ramp input integrates the step response', () => {
    set_sliders({ k_1: 2, T_1: 1.5 });
    const response = window.time_response('(1)/(s^2)', MATHLIVE.one_real_pole, times);
    times.forEach((t, k) => expect(response[k]).toBeCloseTo(2 * (t - 1.5 * (1 - Math.exp(-t / 1.5))), 9));
  });

  test('an unstable pole grows', () => {
    set_sliders({ k_1: 1, T_1: -2 });
    const response = window.time_response('1', MATHLIVE.one_real_pole, times);
    times.forEach((t, k) => expect(response[k]).toBeCloseTo(-0.5 * Math.exp(t / 2), 9));
  });

  test('returns null when a slider is unset', () => {
    set_sliders({ k_1: 1 });
    expect(window.time_response('1/s', MATHLIVE.one_real_pole, times)).toBeNull();
  });

  test('a formula that is not rational still gets the Gaver-Stehfest response', () => {
    set_sliders({ L: 0.3 });
    const formula = '(1)/(1+sqrt(s))e^(-Ls)';
    const response = window.time_response('1/s', formula, times);
    const binding = window.bind_formula('(1/s)*((1)/(1+sqrt(s)))');
    times.forEach((t, k) => {
      expect(response[k]).toBeCloseTo(window.getTimeValues(binding, t === 0 ? 0.00001 : t, 0.3), 12);
    });
  });
});

describe('one real pole: closed-form impulse response', () => {
  beforeEach(() => {
    set_globals({ graph_step_response_width: 300, max_x_timerep: 10, precision: 4, input_formula: '1' });
  });
  const impulse_graph = (k_1, T_1) => {
    set_sliders({ k_1, T_1 });
    const graph = window.eval(`new bode_graph(1, ${JSON.stringify(global_value('GRAPH_ONE_REAL_POLE').formula)})`);
    graph.get_timevalues_p5();
    return graph;
  };
  const t_at = (i) => (i * 4 / 300) * 10;

  test('h(t) = k_1/T_1 * e^(-t/T_1), with axis bounds from h(0)', () => {
    const graph = impulse_graph(-2, 1.5);
    graph.bode_timerep_array.forEach((y, i) => expect(y).toBeCloseTo(-2 / 1.5 * Math.exp(-t_at(i) / 1.5), 12));
    expect([graph.bode_min_timerep, graph.bode_max_timerep]).toEqual([-2 / 1.5, 0]);
  });

  test('a negative T_1 grows with the sign of k_1/T_1, axis capped at 20', () => {
    const graph = impulse_graph(1, -2);
    graph.bode_timerep_array.forEach((y, i) => expect(y).toBeCloseTo(-0.5 * Math.exp(t_at(i) / 2), 9));
    expect([graph.bode_min_timerep, graph.bode_max_timerep]).toEqual([-20, 0]);
    const positive = impulse_graph(-1, -2);
    expect([positive.bode_min_timerep, positive.bode_max_timerep]).toEqual([0, 20]);
    const zero = impulse_graph(0, -2); // k_1 = 0 keeps the old axis, as k_1 <= 0 did
    expect([zero.bode_min_timerep, zero.bode_max_timerep]).toEqual([-20, 0]);
  });

  test('T_1 = 0 is a constant gain: nothing after t = 0', () => {
    const graph = impulse_graph(2, 0);
    expect(graph.bode_timerep_array.every((y) => y === 0)).toBe(true);
    expect([graph.bode_min_timerep, graph.bode_max_timerep]).toEqual([0, 0]);
  });
});

describe('bode_graph time responses agree with the closed forms', () => {
  beforeEach(() => {
    set_globals({ graph_bode_mag_width: 400, graph_step_response_width: 300, min_10power: -2,
      x_case_gain: 5, max_x_timerep: 10, precision: 4 });
  });

  // The MathLive form of a preset takes the general path; the preset itself uses its closed form.
  test.each([
    ['one_real_pole', 'GRAPH_ONE_REAL_POLE', '1/s'],
    ['one_real_pole', 'GRAPH_ONE_REAL_POLE', '1'],
    ['two_real_poles', 'GRAPH_TWO_REAL_POLES', '1/s'],
    ['two_real_poles', 'GRAPH_TWO_REAL_POLES', '1'],
    ['two_complex_poles', 'GRAPH_TWO_COMPLEX_POLES', '1/s'],
    ['two_complex_poles', 'GRAPH_TWO_COMPLEX_POLES', '1'],
  ])('%s (%s), input %s', (key, preset_name, input) => {
    set_sliders({ k_1: 2, T_1: 1.5, k_2: 3, T_2: 1, T_3: 0.4, k_3: 2, w: 3, z: 0.3 });
    set_globals({ input_formula: input });
    const general = window.eval(`new bode_graph(1, ${JSON.stringify(MATHLIVE[key])})`);
    const closed = window.eval(`new bode_graph(2, ${JSON.stringify(global_value(preset_name).formula)})`);
    general.get_timevalues_p5();
    closed.get_timevalues_p5();
    expect(general.bode_timerep_array).toHaveLength(closed.bode_timerep_array.length);
    general.bode_timerep_array.forEach((y, i) => expect(y).toBeCloseTo(closed.bode_timerep_array[i], 9));
  });
});

describe('stability margins', () => {
  beforeEach(() => {
    set_globals({ graph_bode_mag_width: 400, min_10power: -2, x_case_gain: 5 });
  });
  const margins = (formula, sliders) => {
    set_sliders(sliders);
    const graph = window.eval(`new bode_graph(1, ${JSON.stringify(formula)})`);
    graph.get_complex_p5();
    return graph;
  };
  const preset = (name) => global_value(name).formula;
  // Exact values, solved independently (bisection on the analytic phase/gain to 1e-12).
  test.each([
    ['GRAPH_FOUR_POLES', { k_5: 1.5, T_5: 0.7 }, 78.542599, 0.677247, 8.519375, 1.428571],
    ['GRAPH_TIME_DELAY', { L: 0.5 }, 28.442752, 2.828427, 2.068965, 3.673194],
    ['GRAPH_TWO_COMPLEX_POLES', { k_3: 2, w: 3, z: 0.3 }, 29.752709, 4.962576, NaN, NaN],
    ['GRAPH_TWO_REAL_POLES', { k_2: 3, T_2: 1, T_3: 0.4 }, 75.947295, 2.078727, NaN, NaN],
    ['GRAPH_ONE_REAL_POLE', { k_1: 2, T_1: 1.5 }, 120, Math.sqrt(3) / 1.5, NaN, NaN],
  ])('%s: exact margins', (name, sliders, pm, wc, gm, w180) => {
    const graph = margins(preset(name), sliders);
    expect(graph.bode_phase_margin).toBeCloseTo(pm, 5);
    expect(graph.bode_gain_crossover_freq).toBeCloseTo(wc, 5);
    if (Number.isNaN(gm)) {
      expect(graph.bode_gain_margin).toBeUndefined(); // NaN[0], as the info panel expects
      expect(graph.bode_phase_crossover_freq).toBeUndefined();
    } else {
      expect(graph.bode_gain_margin).toBeCloseTo(gm, 5);
      expect(graph.bode_phase_crossover_freq).toBeCloseTo(w180, 5);
    }
  });

  test('the phase margin is wrapped into (-180, 180]: 0.5 + 2s gives -120', () => {
    const graph = margins(preset('GRAPH_ONE_ZERO'), { T_4: 2 });
    expect(graph.bode_phase_margin).toBeCloseTo(-120, 6);
    expect(graph.bode_gain_crossover_freq).toBeCloseTo(Math.sqrt(0.75) / 2, 6);
  });

  test('a phase margin of exactly 0 stays 0, not 360 or 180 (1/s^2 at 1 rad/s)', () => {
    const graph = margins('1/s^2', {});
    expect(graph.bode_phase_margin).toBeCloseTo(0, 6);
    expect(graph.bode_gain_crossover_freq).toBeCloseTo(1, 6);
  });

  test('a phase that stays at -180 is not a phase crossover (1/s^2)', () => {
    expect(margins('1/s^2', {}).bode_gain_margin).toBeUndefined();
  });

  test('a phase margin of exactly 180 stays 180 (2/(1-s^2) is real and positive on the j axis)', () => {
    const graph = margins('2/(1-s^2)', {});
    expect(graph.bode_phase_margin).toBe(180);
    expect(graph.bode_gain_crossover_freq).toBeCloseTo(1, 6);
  });

  test('float noise around -180 degrees or 0 dB is not a crossing', () => {
    // (s+0.1)^2/(s^2+0.2s+0.01) is 1, apart from rounding errors that flip the sign of its gain in dB
    // about 120 times over the frequency axis; its negative sits at -180 degrees the same way.
    const noisy_gain = margins('(s+0.1)^2/(s^2+0.2s+0.01)', {});
    expect(noisy_gain.bode_phase_margin).toBeUndefined();
  });

  test('a phase that only wobbles within 0.005 rad of -180 is not a phase crossover, as before', () => {
    // 1/s^2 with a tiny lag near 1 rad/s and a tiny lead near 10 rad/s: the phase dips below -180
    // and comes back above it, by less than 0.001 rad.
    const graph = margins('(1+s/1.001)(1+s/9.99)/((1+s)(1+s/10)s^2)', {});
    const to_nearest_crossing = (p) => Math.abs(p + Math.PI - 2 * Math.PI * Math.round((p + Math.PI) / (2 * Math.PI)));
    expect(Math.max(...graph.bode_phase_array.map(to_nearest_crossing))).toBeLessThan(0.001);
    expect(graph.bode_gain_margin).toBeUndefined();
  });

  test('a gain that stays at 0 dB is not a gain crossover (pure delay)', () => {
    const graph = margins('e^(-L*s)', { L: 0.5 });
    expect(graph.bode_phase_margin).toBeUndefined();
    // ... but the delay's phase does cross -180 at pi/L, with |G| = 1:
    expect(graph.bode_phase_crossover_freq).toBeCloseTo(Math.PI / 0.5, 5);
    expect(graph.bode_gain_margin).toBeCloseTo(0, 6);
  });

  test('two gain crossovers (resonance peak above 0 dB): the smaller |PM| is reported', () => {
    const [k, z] = [0.8, 0.1];
    const graph = margins('k_3*w^2/(s^2+2*z*w*s+w^2)', { k_3: k, w: 1, z });
    // |G| = 1  <=>  u^2 + (4z^2 - 2)u + (1 - k^2) = 0 with u = omega^2
    const b = 4 * z * z - 2;
    const roots = [(-b - Math.sqrt(b * b - 4 * (1 - k * k))) / 2, (-b + Math.sqrt(b * b - 4 * (1 - k * k))) / 2].map(Math.sqrt);
    const pm = roots.map((w) => 180 - Math.atan2(2 * z * w, 1 - w * w) * 180 / Math.PI);
    expect(pm[0]).toBeGreaterThan(150); // the upward crossing, misleading
    expect(graph.bode_phase_margin).toBeCloseTo(pm[1], 5);
    expect(graph.bode_gain_crossover_freq).toBeCloseTo(roots[1], 5);
  });

  test('several phase crossovers (a delay crosses -180, -540, ...): the smaller |GM| is reported', () => {
    // 0.5/(1+0.05s)*e^(-2s): the first crossing (lowest frequency, highest gain) has the smallest |GM|
    const graph = margins('0.5/(1+0.05s)*e^(-L*s)', { L: 2 });
    const w = graph.bode_phase_crossover_freq;
    expect(-Math.atan(0.05 * w) - 2 * w).toBeCloseTo(-Math.PI, 6);
    expect(graph.bode_gain_margin).toBeCloseTo(-20 * Math.log10(0.5 / Math.sqrt(1 + 0.0025 * w * w)), 6);
  });

  test('with a gain above 0 dB at the first -180 crossing, the crossing closest to 0 dB wins', () => {
    // 12/(1+s)*e^(-0.5s) crosses -180 + k*360 where atan(w) + 0.5w = (2k+1)pi:
    // GM = -10.0 dB at the first crossing, +2.4 dB at the second, +7.6 dB at the third.
    const crossing = (k) => {
      let [lo, hi] = [0, 100];
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (Math.atan(mid) + 0.5 * mid < Math.PI * (2 * k + 1)) lo = mid; else hi = mid;
      }
      return lo;
    };
    const gm = (w) => -20 * Math.log10(12 / Math.sqrt(1 + w * w));
    expect(gm(crossing(0))).toBeLessThan(-9);
    const graph = margins('12/(1+s)*e^(-L*s)', { L: 0.5 });
    expect(graph.bode_phase_crossover_freq).toBeCloseTo(crossing(1), 5);
    expect(graph.bode_gain_margin).toBeCloseTo(gm(crossing(1)), 5);
  });

  test('an unset slider leaves the margins undefined', () => {
    const graph = margins('k_1/(1+T_1*s)', { k_1: 2 });
    expect(graph.bode_phase_margin).toBeUndefined();
    expect(graph.bode_gain_margin).toBeUndefined();
  });
});

describe('computed pole-zero maps', () => {
  const sorted = (roots) => [...roots].sort((a, b) => a.re - b.re || a.im - b.im);
  const expect_roots = (actual, expected, digits = 9) => {
    expect(actual).toHaveLength(expected.length);
    sorted(actual).forEach((root, k) => {
      expect(root.re).toBeCloseTo(sorted(expected)[k].re, digits);
      expect(root.im).toBeCloseTo(sorted(expected)[k].im, digits);
    });
  };

  describe('polynomial_roots', () => {
    test('first order', () => expect_roots(window.polynomial_roots([2, 1]), [{ re: -2, im: 0 }]));
    test('complex pair', () => expect_roots(window.polynomial_roots([1, 0, 1]), [{ re: 0, im: -1 }, { re: 0, im: 1 }]));
    test('a repeated root (1+s)^4 is found to about 1e-3', () => {
      expect_roots(window.polynomial_roots([1, 4, 6, 4, 1]), [-1, -1, -1, -1].map((re) => ({ re, im: 0 })), 2);
    });
    test('a negligible leading coefficient is dropped', () => {
      expect_roots(window.polynomial_roots([2, 1, 1e-20]), [{ re: -2, im: 0 }]);
    });
    test('a constant has no roots', () => expect(window.polynomial_roots([3])).toEqual([]));
  });

  describe('poles_and_zeros', () => {
    test('the delay e^(-L*s) is split off: 3/(1+s)*e^(-L*s) has one pole at -1', () => {
      set_sliders({ L: 0.5 });
      const result = window.poles_and_zeros(window.bind_formula(global_value('GRAPH_TIME_DELAY').formula));
      expect_roots(result.poles, [{ re: -1, im: 0 }]);
      expect(result.zeros).toEqual([]);
    });

    test('PID closed loop R->Y: the closed-loop poles and the zeros of the PID', () => {
      const [K, k_1, T_i, T_d, T_1] = [1.2, 2, 2, 0.3, 1.5];
      set_sliders({ K, k_1, T_i, T_d, T_1 });
      const quadratic = (c0, c1, c2) => {
        const disc = c1 * c1 - 4 * c2 * c0;
        if (disc >= 0) return [(-c1 - Math.sqrt(disc)) / (2 * c2), (-c1 + Math.sqrt(disc)) / (2 * c2)].map((re) => ({ re, im: 0 }));
        return [-1, 1].map((sign) => ({ re: -c1 / (2 * c2), im: sign * Math.sqrt(-disc) / (2 * c2) }));
      };
      const result = window.poles_and_zeros(window.bind_formula(global_value('GRAPH_ONE_POLE_WITH_PID_YR').formula));
      expect_roots(result.poles, quadratic(K * k_1, T_i * (1 + K * k_1), T_i * (T_1 + K * k_1 * T_d)));
      expect_roots(result.zeros, quadratic(1, T_i, T_i * T_d));
    });

    test('null for a formula that is not rational or has an unset slider', () => {
      set_sliders({});
      expect(window.poles_and_zeros(window.bind_formula('1/(1+sqrt(s))'))).toBeNull();
      expect(window.poles_and_zeros(window.bind_formula('k_1/(1+s)'))).toBeNull();
      expect(window.poles_and_zeros(window.bind_formula('1/(1+'))).toBeNull();
      set_sliders({ k_1: 1, T_1: NaN }); // e.g. an unparsable number typed in a slider field
      expect(window.poles_and_zeros(window.bind_formula('k_1/(1+T_1*s)'))).toBeNull();
    });
  });

  test.each([
    [-1, 0, -1, 0],
    [-10, 0, -3.2, 0],
    [5, 0, 1.2, 0],
    [-6.4, 2, -3.2, 1], // scaled towards the origin, keeping the direction
    [-1, 4.4, -0.5, 2.2],
    [-1, -4.4, -0.5, -2.2],
    [2.4, 1, 1.2, 0.5],
  ])('pole_zero_map_position(%d, %d) = (%d, %d)', (re, im, x, y) => {
    const [px, py] = window.pole_zero_map_position(re, im);
    expect(px).toBeCloseTo(x, 12);
    expect(py).toBeCloseTo(y, 12);
  });

  describe('which graphs get a map', () => {
    beforeEach(() => set_globals({ graph_bode_mag_width: 100, min_10power: -2, x_case_gain: 5 }));
    const graph_for = (formula, sliders) => {
      set_sliders(sliders);
      const graph = window.eval(`new bode_graph(1, ${JSON.stringify(formula)})`);
      graph.get_complex_p5();
      return graph;
    };

    test('a typed formula gets a computed map', () => {
      const graph = graph_for('(1)/((1+s)(1+0.5s))', {});
      expect_roots(graph.bode_poles_zeros.poles, [{ re: -2, im: 0 }, { re: -1, im: 0 }]);
      expect(graph.has_pole_zero_map()).toBe(true);
    });

    test('a preset with a parameter map keeps it and computes nothing', () => {
      const graph = graph_for(global_value('GRAPH_ONE_REAL_POLE').formula, { k_1: 1, T_1: 1 });
      expect(graph.bode_poles_zeros).toBeNull();
      expect(graph.has_pole_zero_map()).toBe(true);
    });

    test('a quiz ghost graph gets no computed map', () => {
      const graph = graph_for('(1)/((1+s)(1+0.5s))', {});
      graph.bode_display_pole_zero_bool = false;
      expect(graph.has_pole_zero_map()).toBe(false);
    });

    test('addNewGraph marks quiz ghost graphs, and only those, as having no computed map', () => {
      const graphs = global_value('bode_graphs');
      const saved = graphs.slice();
      const add_event = window.add_event;
      window.add_event = () => {};
      try {
        set_sliders({});
        window.addNewGraph(null, { name: 'Ghost', ghost: true, mf: '\\frac{1}{1+s}', formula: '1/(1+s)' });
        window.addNewGraph(null, { name: 'Mine', mf: '\\frac{1}{1+s}', formula: '1/(1+s)' });
        const [ghost, mine] = graphs.slice(-2);
        expect(ghost.graph_name).toBe('Ghost');
        expect(ghost.bode_display_pole_zero_bool).toBe(false);
        expect(mine.bode_display_pole_zero_bool).toBe(true);
      } finally {
        window.add_event = add_event;
        graphs.splice(0, graphs.length, ...saved);
      }
    });

    test('a formula without poles and zeros to show gets no map', () => {
      expect(graph_for('k_1/(1+s)', {}).has_pole_zero_map()).toBe(false);
      expect(graph_for('1/(1+sqrt(s))', {}).has_pole_zero_map()).toBe(false);
    });
  });

  describe('draw_pole_zeros layout', () => {
    let saved_graphs;
    beforeAll(() => { saved_graphs = global_value('bode_graphs').slice(); });
    afterEach(() => {
      const graphs = global_value('bode_graphs');
      graphs.splice(0, graphs.length, ...saved_graphs);
    });
    const layout = (count) => {
      set_globals({ graph_bode_mag_width: 100, min_10power: -2, x_case_gain: 5, canvas_height: 690,
        graph_pole_zero_width: 156, graph_pole_zero_x: 1000 });
      set_sliders({});
      const graphs = global_value('bode_graphs');
      graphs.length = 0;
      for (let i = 0; i < count; i++) {
        const graph = window.eval(`new bode_graph(${i}, "1/(1+${i + 1}s)")`);
        graph.get_complex_p5();
        graphs.push(graph);
      }
      window.draw_pole_zeros();
      return { size: global_value('pole_zero_width'), y: global_value('pole_zero_graph_y').slice(0, count) };
    };

    test('maps keep their size when they fit', () => {
      const { size, y } = layout(2);
      expect(size).toBe(156);
      expect(y).toEqual([30, 30 + 166]);
    });

    test('maps shrink so that all of them and the axis labels fit in the canvas', () => {
      const { size, y } = layout(6);
      expect(size).toBeLessThan(156);
      expect(global_value('pole_zero_height')).toBe(size);
      expect(y[5] + size + 40).toBeLessThanOrEqual(690);
      expect(y[1] - y[0]).toBeCloseTo(size + 10, 9);
    });
  });
});

// Cases added after Stryker mutation testing (npm run test:mutation) showed that no test noticed
// these changes to src/transfer_math.js.
describe('mutation gaps: insert_explicit_multiplication', () => {
  test.each([
    ['12s', '12*s'], // a number has more than one digit
    ['.25s', '.25*s'], // a fraction with no integer part has more than one digit
    ['2·3s', '2*3*s'], // the middle dot is a product sign, like the dot operator
    ['sin(s)cos(s)', 'sin(s)*cos(s)'],
    ['tan(s)abs(s)', 'tan(s)*abs(s)'],
    ['log(s)exp(s)sqrt(s)', 'log(s)*exp(s)*sqrt(s)'],
  ])('%s -> %s', (input, expected) => {
    expect(window.insert_explicit_multiplication(input)).toBe(expected);
  });
});

describe('mutation gaps: polynomials', () => {
  test('poly_multiply adds the products of the coefficients', () => {
    expect(window.poly_multiply([1, 2], [3, 4])).toEqual([3, 10, 8]);
  });

  test('poly_trim drops a leading coefficient of exactly 1e-12 of the largest, but keeps 1e-6', () => {
    expect(window.poly_trim([1, 1e-12])).toEqual([1]);
    expect(window.poly_trim([1, 0, 1e-13])).toEqual([1]);
    expect(window.poly_trim([1, 1e-6])).toEqual([1, 1e-6]);
    expect(window.poly_trim([1e-3, 1e-12])).toEqual([1e-3, 1e-12]); // the limit scales with the largest coefficient
  });
});

describe('mutation gaps: to_rational', () => {
  const parse = (formula) => math.parse(window.insert_explicit_multiplication(formula));

  test.each([['true'], ['"a"']])('the constant %s is not a rational function of s', (formula) => {
    expect(() => window.to_rational(parse(formula), {})).toThrow('not a rational function of s');
  });

  test('a power whose exponent is not constant is rejected', () => {
    expect(() => window.to_rational(parse('(1+s)^(1/(1+s))'), {})).toThrow('not a rational function of s');
  });

  test('the exponent is the numerator divided by the denominator: (s+1)^(4/2) = (s+1)^2', () => {
    const rational = window.to_rational(parse('(s+1)^(4/2)'), {});
    expect(rational.num).toEqual([1, 2, 1]);
    expect(rational.den).toEqual([1]);
  });

  test('the highest accepted exponent, 50, still works (51 is in the test above)', () => {
    const rational = window.to_rational(parse('(1+s)^50'), {});
    expect(rational.num).toHaveLength(51);
    expect(rational.den).toEqual([1]);
  });
});

describe('mutation gaps: delay_of_factor', () => {
  const delay_of = (formula, scope = { e: Math.E }) => window.delay_of_factor(math.parse(formula), scope);

  test('e^(-s/2) and exp(-s/2) delay by 0.5', () => {
    expect(delay_of('e^(-s/2)')).toBeCloseTo(0.5, 14);
    expect(delay_of('exp(-s/2)')).toBeCloseTo(0.5, 14);
  });

  test.each([
    ['e*s'], // a product, not a power
    ['pow(e, -s)'], // only the ^ operator and exp() are delay factors
    ['x^(-s)'], // the base must be e
    ['sin(-s)'], // the function must be exp
    ['exp(-s, 2)'], // exp with two arguments
    ['e^(-s^2)'], // the exponent must have degree 1
    ['e^(-s/(1+s))'], // the exponent must have a constant denominator
  ])('%s is not a delay factor', (formula) => {
    expect(delay_of(formula)).toBeNull();
  });
});

describe('mutation gaps: time responses', () => {
  const times = Array.from({ length: 41 }, (_, k) => k * 0.1);

  test('getTimeValues evaluates the formula at time - delay, not time + delay', () => {
    set_sliders({});
    const binding = window.bind_formula('1/(s+1)');
    expect(window.getTimeValues(binding, 2, 0.5)).toBeCloseTo(window.getTimeValues(binding, 1.5, 0), 12);
    expect(window.getTimeValues(binding, 0.4, 0.5)).toBe(0);
  });

  test('an improper response of order 2 loses only its impulse: (s^2+1)/((s+1)(s+2)) = 1 + 2/(s+1) - 5/(s+2)', () => {
    set_sliders({});
    const response = window.time_response('1', '(s^2+1)/((s+1)(s+2))', times);
    times.forEach((t, k) => expect(response[k]).toBeCloseTo(2 * Math.exp(-t) - 5 * Math.exp(-2 * t), 9));
  });

  test('the Gaver-Stehfest fallback replaces t = 0 by 0.00001 also without a delay', () => {
    set_sliders({});
    const response = window.time_response('1/s', '1/(1+sqrt(s))', times);
    const binding = window.bind_formula('(1/s)*(1/(1+sqrt(s)))');
    expect(Number.isFinite(response[0])).toBe(true);
    expect(response[0]).toBeCloseTo(window.getTimeValues(binding, 0.00001, 0), 12);
  });
});

describe('mutation gaps: poles, zeros and margins', () => {
  test('poles_and_zeros of an unset slider (a null binding) is null', () => {
    expect(window.poles_and_zeros(null)).toBeNull();
  });

  test('sign_changes: a change between the first two samples counts', () => {
    expect(window.sign_changes([1, -1], 1e-6)).toEqual([[0, 1]]);
  });

  test('sign_changes: samples exactly at the dead band have no sign', () => {
    expect(window.sign_changes([0.1, -0.1], 0.1)).toEqual([]);
    expect(window.sign_changes([0.1, -0.11], 0.1)).toEqual([]);
    expect(window.sign_changes([0.11, -0.11], 0.1)).toEqual([[0, 1]]);
  });

  test('findOmegaZero and findOmega180 without a binding are NaN, whatever the curve', () => {
    expect(window.findOmegaZero(null, [1, -1])).toBeNaN();
    expect(window.findOmega180(null, [-3, -3.3])).toBeNaN();
  });
});

describe('time_samples', () => {
  test('one sample every step pixels, as times on the axis', () => {
    expect(window.time_samples(10, 4, 5)).toEqual([0, 2, 4]);
  });

  test('a sample that would land on the right edge of the plot is left out', () => {
    expect(window.time_samples(8, 4, 10)).toEqual([0, 5]);
  });

  test('a width that is no multiple of the step: the samples stop short of max_time', () => {
    expect(window.time_samples(9.5, 4, 19)).toEqual([0, 8, 16]);
  });

  test('no width gives no samples', () => {
    expect(window.time_samples(0, 4, 10)).toEqual([]);
  });

  test('divides before it multiplies, as map() in p5 does, so every float stays the same', () => {
    expect(window.time_samples(7, 4, 10)).toEqual([0, (4 / 7) * 10]);
    expect((4 / 7) * 10).not.toBe((4 * 10) / 7);
  });

  test('reads no global: the plot size and precision of the page do not matter', () => {
    set_globals({ graph_step_response_width: 900, precision: 12, max_x_timerep: 1 });
    expect(window.time_samples(10, 4, 5)).toEqual([0, 2, 4]);
  });
});

describe('bode_frequencies', () => {
  test('one frequency per pixel, evenly spaced on the log axis', () => {
    expect(window.bode_frequencies(4, -2, 4)).toEqual([0.01, 0.1, 1, 10]);
  });

  test('a fractional width: one sample for each whole pixel inside it, spaced by the real width', () => {
    const frequencies = window.bode_frequencies(2.5, 0, 5);
    expect(frequencies).toEqual([1, 100, 10000]);
  });

  test('the axis need not start at 1 or span whole decades', () => {
    const frequencies = window.bode_frequencies(2, 1.5, 3);
    expect(frequencies).toEqual([10 ** 1.5, 10 ** 3]);
  });

  test('no width gives no frequencies', () => {
    expect(window.bode_frequencies(0, -2, 5)).toEqual([]);
  });
});

describe('the margins take their sample frequencies as a parameter', () => {
  // A plot that would give other frequencies, so a read of these globals shows.
  beforeEach(() => set_globals({ graph_bode_mag_width: 3, min_10power: 7, x_case_gain: 1 }));

  test('findOmegaZero finds a crossing between two given frequencies', () => {
    set_sliders({});
    const binding = window.bind_formula('2/(1+s)');
    const [margin, omega] = window.findOmegaZero(binding, [5, -5], [0.5, 4]);
    expect(omega).toBeCloseTo(Math.sqrt(3), 9);
    expect(margin).toBeCloseTo(180 - (Math.atan(Math.sqrt(3)) * 180) / Math.PI, 7);
  });

  test('findOmega180 finds a crossing between two given frequencies', () => {
    set_sliders({});
    // Three equal poles reach -180 degrees where atan(w) = 60 degrees.
    const binding = window.bind_formula('1/(1+s)^3');
    const [margin, omega] = window.findOmega180(binding, [-3, -3.3], [1, 3]);
    expect(omega).toBeCloseTo(Math.sqrt(3), 9);
    expect(margin).toBeCloseTo(20 * Math.log10(8), 7);
  });

  test.each([
    ['-900', '1/(1+s)^12', -5 * Math.PI, Math.tan((75 * Math.PI) / 180)],
    ['+540', '(1+s)^12', 3 * Math.PI, 1],
  ])('findOmega180 also finds a crossing of %s degrees, more than a turn from -180', (_, formula, phase, expected) => {
    set_sliders({});
    const binding = window.bind_formula(formula);
    const [, omega] = window.findOmega180(binding, [phase - 0.2, phase + 0.2], [expected / 1.2, expected * 1.2]);
    expect(omega).toBeCloseTo(expected, 9);
  });

  test('a crossing is searched between the samples on either side of it, not at their indices', () => {
    set_sliders({});
    const binding = window.bind_formula('2/(1+s)');
    const [, omega] = window.findOmegaZero(binding, [9, 5, -5, -9], [0.01, 0.5, 4, 90]);
    expect(omega).toBeCloseTo(Math.sqrt(3), 9);
  });
});
