// src/presets_state.js: the preset graphs' LaTeX (what MathLive shows in the equation field), the
// start-up values of the global state, and the colour table. The other suites reset or replace
// most of this state, so they cannot see the initial values.
const { loadApp, global_value } = require('./helpers/load_app');

beforeAll(() => loadApp());

describe('pole-zero map of each preset', () => {
  const KINDS = {
    GRAPH_ONE_REAL_POLE: 'draggable',
    GRAPH_TWO_REAL_POLES: 'draggable',
    GRAPH_TWO_COMPLEX_POLES: 'draggable',
    GRAPH_TIME_DELAY: undefined,
    GRAPH_ONE_ZERO_TWO_POLES: 'draggable',
    GRAPH_FOUR_POLES: 'shown',
    GRAPH_ONE_ZERO: 'shown',
    GRAPH_PID: 'draggable',
    GRAPH_ONE_POLE_WITH_PID_YR: undefined,
    GRAPH_ONE_POLE_WITH_PID_S: undefined,
    GRAPH_ONE_POLE_WITH_PID_YL: undefined,
    GRAPH_ONE_POLE_WITH_PID_OPEN: undefined,
  };

  test.each(Object.entries(KINDS))('%s: %s', (name, kind) => {
    expect(global_value(name).pole_zero_map).toBe(kind);
  });

  test('the table above covers every preset', () => {
    expect(Object.keys(KINDS)).toHaveLength(global_value('GRAPH_ORDER').length);
  });
});

describe('Bode marks of each preset', () => {
  const VALUES = { T_1: 1, T_2: 2, T_3: 3, T_4: 4, T_5: 5, T_6: 6, T_7: 7, T_8: 8, T_i: 9, T_d: 10 };
  const pole = (T) => ({ T, kind: 'pole' });
  const zero = (T) => ({ T, kind: 'zero' });

  function set_sliders(values) {
    const position = global_value('variable_position');
    const variables = global_value('range_slider_variables');
    global_value('range_slider_alphabet').forEach((name, i) => { position[name] = i; });
    for (const [name, value] of Object.entries(values)) variables[position[name]] = value;
  }

  test.each([
    ['GRAPH_ONE_REAL_POLE', [pole(1)]],
    ['GRAPH_TWO_REAL_POLES', [pole(2), pole(3)]],
    ['GRAPH_ONE_ZERO_TWO_POLES', [pole(6), pole(7), zero(8)]],
    ['GRAPH_FOUR_POLES', [pole(5)]],
    ['GRAPH_ONE_ZERO', [pole(4)]], // an X, although the pole-zero map shows it as a zero
    ['GRAPH_PID', [zero(9), zero(10)]],
  ])('%s', (name, marks) => {
    set_sliders(VALUES);
    expect(global_value(name).bode_marks()).toEqual(marks);
  });

  test.each(['GRAPH_TIME_DELAY', 'GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_ONE_POLE_WITH_PID_YL', 'GRAPH_ONE_POLE_WITH_PID_OPEN'])(
    '%s has none', (name) => {
      expect(global_value(name).bode_marks).toBeUndefined();
    });

  describe('two complex poles', () => {
    const marks_for = (w, z) => {
      set_sliders({ w, z });
      return global_value('GRAPH_TWO_COMPLEX_POLES').bode_marks();
    };

    test.each([[0.5], [1]])('z = %s: one X at 1/w', (z) => {
      expect(marks_for(4, z)).toEqual([pole(0.25)]);
    });

    test('w = 0 still counts, with an infinite T that the drawing skips', () => {
      expect(marks_for(0, 0.5)).toEqual([pole(Infinity)]);
    });

    test('a negative w gets no mark', () => {
      expect(marks_for(-1, 0.5)).toEqual([]);
    });

    test('above z = 1 the two real poles each get an X', () => {
      const [first, second] = marks_for(2, 1.25); // poles at w*(z +- sqrt(z^2-1)) = 4 and 1
      expect(first.T).toBeCloseTo(1 / 4, 12);
      expect(second.T).toBeCloseTo(1, 12);
    });

    test('a negative w gets no mark above z = 1 either', () => {
      expect(marks_for(-2, 1.25)).toEqual([]);
    });
  });
});

describe('preset_of_formula', () => {
  test.each(['GRAPH_ONE_REAL_POLE', 'GRAPH_TIME_DELAY', 'GRAPH_ONE_POLE_WITH_PID_OPEN'])('finds %s by its formula', (name) => {
    const preset = global_value(name);
    expect(window.preset_of_formula(preset.formula)).toBe(preset);
  });

  test('every preset has a formula of its own', () => {
    const formulas = global_value('GRAPH_ORDER').map((preset) => preset.formula);
    expect(new Set(formulas).size).toBe(formulas.length);
  });

  test('an edited formula is not a preset', () => {
    expect(window.preset_of_formula('k_1/(1+T_1*s)+1')).toBeUndefined();
  });
});

describe('preset graphs', () => {
  // The LaTeX of each preset, which the equation field shows. `formula` (the math.js text) is
  // checked through the numbers in numeric_core.test.js and transfer_math.test.js.
  // GRAPH_PID ends in a stray "}" that MathLive ignores; it is kept as it is in the source.
  const MF = {
    GRAPH_ONE_REAL_POLE: '\\frac{k_1}{1+T_1s}',
    GRAPH_TWO_REAL_POLES: '\\frac{k_2}{(1+T_2s)(1+T_3s)}',
    GRAPH_TWO_COMPLEX_POLES: '\\frac{k_3w^2}{s^2+2zws+w^2}',
    GRAPH_TIME_DELAY: '\\frac{3}{1+s}e^{-Ls}',
    GRAPH_ONE_ZERO_TWO_POLES: '\\frac{k_4(1+T_8s)}{(1+T_6s)(1+T_7s)}',
    GRAPH_FOUR_POLES: '\\frac{k_5}{(1+T_5s)^4}',
    GRAPH_ONE_ZERO: 'T_4s+0.5',
    GRAPH_ONE_POLE_WITH_PID_YR: 'G_{YR} = \\frac{G_{PID} \\cdot G}{1 + G_{PID} \\cdot G}',
    GRAPH_PID: 'G_{PID}=K \\left(1 + \\frac{1}{s T_i} + s T_d \\right)}',
    GRAPH_ONE_POLE_WITH_PID_S: 'S = \\frac{1}{1 + G_{PID} \\cdot G}',
    GRAPH_ONE_POLE_WITH_PID_YL: 'G_{YL} = \\frac{G}{1 + G_{PID} \\cdot G}',
    GRAPH_ONE_POLE_WITH_PID_OPEN: 'G_{OL} = G_{PID} \\cdot G',
  };

  test.each(Object.entries(MF))('%s shows its LaTeX', (name, latex) => {
    expect(global_value(name).mf).toBe(latex);
  });

  test('every preset has a name, LaTeX and a formula', () => {
    for (const name of Object.keys(MF)) {
      const preset = global_value(name);
      expect([name, preset.name, preset.mf, preset.formula]).toEqual([name, ...[1, 2, 3].map(() => expect.stringMatching(/\S/))]);
    }
  });
});

describe('start-up state', () => {
  test('debug mode and reduced precision are off, and there are no graphs yet', () => {
    expect(global_value('debug_mode')).toBe(false);
    expect(global_value('we_need_faster_calculations_right_now')).toBe(false);
    expect(global_value('bode_graphs')).toEqual([]);
  });
});

describe('color_table', () => {
  test('holds the 16 graph hues', () => {
    expect(global_value('color_table')).toEqual([270, 350, 32, 170, 202, 315, 76, 117, 198, 279, 360, 441, 522, 603, 684, 765]);
  });

  test('no two hues are the same colour (hue wraps at 360)', () => {
    const hues = global_value('color_table').map((hue) => ((hue % 360) + 360) % 360);
    expect(new Set(hues).size).toBe(hues.length);
  });
});
