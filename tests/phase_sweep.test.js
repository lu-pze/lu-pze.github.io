// The plotted Bode phase against the analytic arg G(j*omega), over parameter values and plot
// widths. numeric_core.test.js pins one value per preset; a bug that only shows at low damping, a
// long delay or a narrow plot gets past it, so these sweep instead.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SENTINEL = 18012001;
const WIDTHS = [300, 400, 500, 800, 1000, 1600];
const TOLERANCE = 1e-9; // radians

function analysed(formula, sliders, width) {
  set_globals({ graph_bode_mag_width: width, min_10power: -2, x_case_gain: 5, input_formula: '1/s' });
  const variable_position = global_value('variable_position');
  const variables = global_value('range_slider_variables');
  global_value('range_slider_alphabet').forEach((name, i) => { variable_position[name] = i; });
  for (let i = 1; i < variables.length; i++) variables[i] = SENTINEL;
  for (const [name, value] of Object.entries(sliders)) variables[variable_position[name]] = value;
  const bode_graph = global_value('bode_graph');
  const graph = new bode_graph(1, formula);
  graph.get_complex_p5();
  return graph;
}

const omega_of = (x, width) => 10 ** (-2 + (x * 5) / width);

// The largest distance [rad] between the plotted phase and `truth(omega)`, on any sample.
function worst_error(graph, truth, width) {
  return Math.max(...graph.bode_phase_array.map((phase, x) => Math.abs(phase - truth(omega_of(x, width)))));
}

const second_order = (z, w0) => (w) => Math.atan2(-2 * z * w0 * w, w0 * w0 - w * w);

beforeAll(() => loadApp());

describe.each(WIDTHS)('plot width %i', (width) => {
  test.each([1, 0.7, 0.2, 0.07, 0.05, 0.02, 0.01, 0.001])('two complex poles keep their phase at z = %f', (z) => {
    for (const w of [0.1, 1, 8, 100]) {
      const graph = analysed('k_3*w^2/(s^2+2*z*w*s+w^2)', { k_3: 1, w, z }, width);
      expect(worst_error(graph, second_order(z, w), width)).toBeLessThan(TOLERANCE);
    }
  });

  test.each([0.1, 0.5, 1, 3, 10])('a delay of L = %f follows -atan(w) - L*w all the way', (L) => {
    const graph = analysed('3/(1+s)*e^(-L*s)', { L }, width);
    expect(worst_error(graph, (w) => -Math.atan(w) - L * w, width)).toBeLessThan(TOLERANCE * 1000); // L*w is about 1e4 rad
  });

  test.each([
    ['a pure delay', 'e^(-L*s)', { L: 2 }, (w) => -2 * w],
    ['exp() as the delay', 'exp(-L*s)/(1+s)', { L: 2 }, (w) => -Math.atan(w) - 2 * w],
    ['a right-half-plane zero', '(1-s)/(1+s)', {}, (w) => -2 * Math.atan(w)],
    ['an unstable pole', '1/(1-s)', {}, (w) => Math.atan(w)],
    ['a negative T_1', 'k_1/(1+T_1*s)', { k_1: 1, T_1: -2 }, (w) => Math.atan(2 * w)],
    ['four poles', 'k_5/((1+T_5s)^4)', { k_5: 1, T_5: 1 }, (w) => -4 * Math.atan(w)],
    ['an integrator', '1/s', {}, () => -Math.PI / 2],
    ['an integrator and three poles', '1/(s*(s+1)^3)', {}, (w) => -Math.PI / 2 - 3 * Math.atan(w)],
    ['one zero', 'T_4*s+0.5', { T_4: 1 }, (w) => Math.atan(2 * w)],
    ['the non-rational sqrt', '1/sqrt(1+s)', {}, (w) => -Math.atan(w) / 2],
  ])('%s', (_, formula, sliders, truth) => {
    expect(worst_error(analysed(formula, sliders, width), truth, width)).toBeLessThan(TOLERANCE * 1000);
  });

  test('the phase range follows the curve', () => {
    const graph = analysed('3/(1+s)*e^(-L*s)', { L: 3 }, width);
    expect(graph.bode_min_phase).toBe(Math.min(...graph.bode_phase_array));
    expect(graph.bode_max_phase).toBe(Math.max(...graph.bode_phase_array));
  });
});

describe('edge cases', () => {
  test('z = 0 goes down by exactly 180 degrees at the resonance, and stays there', () => {
    const width = 1001; // no sample on the pole itself
    const graph = analysed('k_3*w^2/(s^2+2*z*w*s+w^2)', { k_3: 1, w: 1, z: 0 }, width);
    const phase = graph.bode_phase_array;
    expect(Math.abs(phase[0])).toBeLessThan(TOLERANCE);
    expect(phase[width - 1]).toBeCloseTo(-Math.PI, 9);
  });

  test('a sample exactly on a pole does not spoil the samples after it', () => {
    const width = 1000; // sample 400 is omega = 1, exactly on the pole
    const graph = analysed('k_3*w^2/(s^2+2*z*w*s+w^2)', { k_3: 1, w: 1, z: 0 }, width);
    expect(omega_of(400, width)).toBe(1);
    expect(graph.bode_phase_array[400]).toBeNaN();
    expect(graph.bode_phase_array[401]).toBeCloseTo(-Math.PI, 9);
    expect(graph.bode_phase_array[width - 1]).toBeCloseTo(-Math.PI, 9);
  });

  test('a 0/0 sample stays NaN and does not spoil the samples after it', () => {
    const width = 1000; // sample 400 is omega = 1, where the cancelled factor is 0/0
    const graph = analysed('(s-i)/(s-i)*1/(1+s)', {}, width);
    expect(graph.bode_phase_array[400]).toBeNaN();
    expect(graph.bode_phase_array[401]).toBeCloseTo(-Math.atan(omega_of(401, width)), 9);
    expect(graph.bode_phase_array[width - 1]).toBeCloseTo(-Math.atan(omega_of(width - 1, width)), 9);
  });

  test('a 0/0 sample does not lose the turns the phase has already made', () => {
    const width = 1000; // six poles: -270 degrees at sample 400, where atan2 alone would give +90
    const graph = analysed('(s-i)/(s-i)*1/(1+s)^6', {}, width);
    expect(graph.bode_phase_array[400]).toBeNaN();
    expect(graph.bode_phase_array[401]).toBeCloseTo(-6 * Math.atan(omega_of(401, width)), 9);
  });

  test('a 0/0 first sample does not spoil the samples after it', () => {
    const graph = analysed('(s-0.01*i)/(s-0.01*i)*1/(1+s)', {}, 1000); // sample 0 is omega = 0.01
    expect(graph.bode_phase_array[0]).toBeNaN();
    expect(graph.bode_phase_array[1]).toBeCloseTo(-Math.atan(omega_of(1, 1000)), 9);
  });

  test('a delay inside a sum is not split off, and still gives a finite phase', () => {
    const graph = analysed('1+0.5*e^(-L*s)', { L: 1 }, 1000);
    expect(graph.bode_phase_array.every(Number.isFinite)).toBe(true);
  });

  test('a formula that cannot be parsed gets no delay, and a flat phase', () => {
    const graph = analysed('1/(', {}, 400);
    expect(graph.bode_phase_array.every((phase) => phase === 0)).toBe(true);
  });

  test('the margins of a delayed system do not depend on the plot width', () => {
    const margins = WIDTHS.map((width) => analysed('3/(1+s)*e^(-L*s)', { L: 0.5 }, width).bode_gain_margin);
    for (const margin of margins) expect(margin).toBeCloseTo(margins[0], 6);
  });
});

describe('continue_phase', () => {
  const TURN = 2 * Math.PI;

  test('the first sample stays as it is', () => {
    expect(window.continue_phase(3, NaN)).toBe(3);
  });

  test('moves a phase to within half a turn of the previous one', () => {
    expect(window.continue_phase(3, -3)).toBeCloseTo(3 - TURN, 12);
    expect(window.continue_phase(-3, 3)).toBeCloseTo(-3 + TURN, 12);
    expect(window.continue_phase(1, 1 - 5 * TURN)).toBeCloseTo(1 - 5 * TURN, 9);
  });

  test('leaves a phase that is already close alone', () => {
    expect(window.continue_phase(1, 0)).toBe(1);
    expect(window.continue_phase(-1, 0)).toBe(-1);
  });

  test('exactly half a turn is a step down, so an undamped resonance falls', () => {
    expect(window.continue_phase(Math.PI, 0)).toBeCloseTo(-Math.PI, 12);
    expect(window.continue_phase(-Math.PI, 0)).toBeCloseTo(-Math.PI, 12);
  });

  test('a NaN phase stays NaN', () => {
    expect(window.continue_phase(NaN, 0)).toBeNaN();
  });
});

describe('formula_delay', () => {
  test.each([
    ['e^(-L*s)', 2],
    ['3/(1+s)*e^(-L*s)', 2],
    ['e^(-L*s)*e^(-s)', 3],
    ['1/(1+s)', 0],
    ['1+e^(-L*s)', 0],
  ])('%s', (formula, delay) => {
    analysed('1', { L: 2 }, 400);
    expect(window.formula_delay(global_value("bind_formula")(formula))).toBeCloseTo(delay, 12);
  });
});
