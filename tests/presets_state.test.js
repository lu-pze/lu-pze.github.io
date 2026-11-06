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
    ['GRAPH_ONE_ZERO', [zero(4)]],
    ['GRAPH_PID', [zero(9), zero(10)]],
  ])('%s', (name, marks) => {
    set_sliders(VALUES);
    expect(global_value(name).bode_marks()).toEqual(marks);
  });

  test('complex_pole_frequencies is w up to z = 1, and the two real poles above it', () => {
    set_sliders({ w: 2, z: 1 });
    expect(window.complex_pole_frequencies()).toEqual([2]);
    set_sliders({ w: 2, z: 1.25 });
    const [first, second] = window.complex_pole_frequencies();
    expect(first).toBeCloseTo(4, 12);
    expect(second).toBeCloseTo(1, 12);
  });

  test('complex_pole_frequencies is w from z = -1 on, and the two real poles below it', () => {
    set_sliders({ w: 2, z: -1 });
    expect(window.complex_pole_frequencies()).toEqual([2]);
    set_sliders({ w: 2, z: -1.25 });
    const [first, second] = window.complex_pole_frequencies();
    expect(first).toBeCloseTo(-1, 12);
    expect(second).toBeCloseTo(-4, 12);
  });

  test('two real unstable poles each get a mark, with a negative T', () => {
    set_sliders({ k_3: 1, w: 2, z: -1.25 });
    const [first, second] = global_value('GRAPH_TWO_COMPLEX_POLES').bode_marks();
    expect(first.T).toBeCloseTo(-1, 12);
    expect(second.T).toBeCloseTo(-0.25, 12);
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

    test('a negative w gets a mark with a negative T', () => {
      expect(marks_for(-1, 0.5)).toEqual([{ T: -1, kind: 'pole' }]);
    });

    test('above z = 1 the two real poles each get an X', () => {
      const [first, second] = marks_for(2, 1.25); // poles at w*(z +- sqrt(z^2-1)) = 4 and 1
      expect(first.T).toBeCloseTo(1 / 4, 12);
      expect(second.T).toBeCloseTo(1, 12);
    });

    test('so do both poles of a negative w above z = 1', () => {
      const [first, second] = marks_for(-2, 1.25); // the poles are at 4 and 1
      expect(first.T).toBeCloseTo(-0.25, 12);
      expect(second.T).toBeCloseTo(-1, 12);
    });
  });
});

describe('step response of each preset', () => {
  const pole = (T) => ({ T, kind: 'pole' });
  const zero = (T) => ({ T, kind: 'zero' });

  function set_sliders(values) {
    const position = global_value('variable_position');
    const variables = global_value('range_slider_variables');
    global_value('range_slider_alphabet').forEach((name, i) => { position[name] = i; });
    for (const [name, value] of Object.entries(values)) variables[position[name]] = value;
  }

  const VALUES = { T_1: 1, T_2: 2, T_3: 3, T_5: 5, T_6: 6, T_7: 7, T_8: 8, L: 4, k_1: 11, k_2: 12, k_3: 13, k_4: 14, k_5: 15 };

  test.each([
    ['GRAPH_ONE_REAL_POLE', [pole(1)]],
    ['GRAPH_TWO_REAL_POLES', [pole(2), pole(3)]],
    ['GRAPH_TIME_DELAY', [pole(5)]],
    ['GRAPH_ONE_ZERO_TWO_POLES', [pole(6), pole(7), zero(8)]],
    ['GRAPH_FOUR_POLES', [pole(5)]],
  ])('%s marks its time constants', (name, marks) => {
    set_sliders(VALUES);
    expect(global_value(name).time_marks()).toEqual(marks);
  });

  test.each(['GRAPH_TWO_COMPLEX_POLES', 'GRAPH_ONE_ZERO', 'GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_YR',
    'GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_ONE_POLE_WITH_PID_YL', 'GRAPH_ONE_POLE_WITH_PID_OPEN'])(
    '%s marks no time constants', (name) => {
      expect(global_value(name).time_marks).toBeUndefined();
    });

  test('a negative delay gets no mark, a delay of 0 gets one', () => {
    set_sliders({ L: -0.1 });
    expect(global_value('GRAPH_TIME_DELAY').time_marks()).toEqual([]);
    set_sliders({ L: 0 });
    expect(global_value('GRAPH_TIME_DELAY').time_marks()).toEqual([pole(1)]);
  });

  test.each([
    ['GRAPH_ONE_REAL_POLE', 11], ['GRAPH_TWO_REAL_POLES', 12], ['GRAPH_TWO_COMPLEX_POLES', 13],
    ['GRAPH_TIME_DELAY', 3], ['GRAPH_ONE_ZERO_TWO_POLES', 14], ['GRAPH_FOUR_POLES', 15], ['GRAPH_ONE_POLE_WITH_PID_YR', 1],
  ])('%s settles at %s', (name, value) => {
    set_sliders(VALUES);
    expect(global_value(name).final_value()).toBe(value);
  });

  test.each(['GRAPH_ONE_ZERO', 'GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_ONE_POLE_WITH_PID_YL', 'GRAPH_ONE_POLE_WITH_PID_OPEN'])(
    '%s has no final value', (name) => {
      expect(global_value(name).final_value).toBeUndefined();
    });

  test.each([
    ['GRAPH_ONE_REAL_POLE', { T_1: -0.01 }, null],
    ['GRAPH_ONE_REAL_POLE', { T_1: 0 }, 11],
    ['GRAPH_TWO_REAL_POLES', { T_2: -1 }, null],
    ['GRAPH_TWO_REAL_POLES', { T_3: -1 }, null],
    ['GRAPH_TWO_REAL_POLES', { T_2: 0, T_3: 0 }, 12],
    ['GRAPH_FOUR_POLES', { T_5: -1 }, null],
    ['GRAPH_FOUR_POLES', { T_5: 0 }, 15],
    ['GRAPH_ONE_ZERO_TWO_POLES', { T_6: -1 }, null],
    ['GRAPH_ONE_ZERO_TWO_POLES', { T_7: -1 }, null],
    ['GRAPH_ONE_ZERO_TWO_POLES', { T_6: 0, T_7: 0 }, 14],
    ['GRAPH_ONE_ZERO_TWO_POLES', { T_8: -1 }, 14], // a zero does not make the system unstable
  ])('%s with %j settles at %s', (name, values, expected) => {
    set_sliders({ ...VALUES, ...values });
    expect(global_value(name).final_value()).toBe(expected);
  });
});

describe('sliders and script export of each preset', () => {
  const OWN_SLIDERS = {
    GRAPH_ONE_REAL_POLE: ['k_1', 'T_1'],
    GRAPH_TWO_REAL_POLES: ['k_2', 'T_2', 'T_3'],
    GRAPH_TWO_COMPLEX_POLES: ['k_3', 'w', 'z'],
    GRAPH_TIME_DELAY: ['L'],
    GRAPH_ONE_ZERO_TWO_POLES: ['k_4', 'T_6', 'T_7', 'T_8'],
    GRAPH_FOUR_POLES: ['T_5', 'k_5'],
    GRAPH_ONE_ZERO: ['T_4'],
    GRAPH_PID: ['K', 'T_i', 'T_d'],
  };
  const SHARING = ['GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_ONE_POLE_WITH_PID_YL', 'GRAPH_ONE_POLE_WITH_PID_OPEN'];

  test.each(Object.entries(OWN_SLIDERS))('%s owns %j, and shares none', (name, sliders) => {
    expect(global_value(name).own_sliders).toEqual(sliders);
    expect(global_value(name).shares_sliders).toBeUndefined();
  });

  test.each(Object.entries(OWN_SLIDERS))('%s owns exactly the variables of its formula', (name, sliders) => {
    const variables = window.formula_variables(global_value(name).formula).filter((variable) => variable !== 'e');
    expect([...variables].sort()).toEqual([...sliders].sort());
  });

  test.each(SHARING)('%s shares its sliders and owns none', (name) => {
    expect(global_value(name).shares_sliders).toBe(true);
    expect(global_value(name).own_sliders).toBeUndefined();
  });

  test('every preset either owns its sliders or shares them', () => {
    expect(Object.keys(OWN_SLIDERS).length + SHARING.length).toBe(global_value('GRAPH_ORDER').length);
  });

  test('the first three presets have a script export, the others do not', () => {
    const with_export = global_value('GRAPH_ORDER').filter((preset) => preset.script_transfer_function !== undefined);
    expect(with_export).toEqual(global_value('GRAPH_ORDER').slice(0, 3));
  });
});

describe('marks on the pole-zero map and in the Nyquist diagram', () => {
  const SLIDERS = { T_1: 2, T_2: 4, T_3: 0.1, T_4: 0.5, T_5: 1, T_6: 1, T_7: 4, T_8: 2, T_i: 2, T_d: 0.5, w: 2, z: 0.5 };
  const with_sliders = () => {
    const position = global_value('variable_position');
    const variables = global_value('range_slider_variables');
    global_value('range_slider_alphabet').forEach((name, i) => { position[name] = i; });
    for (const [name, value] of Object.entries(SLIDERS)) variables[position[name]] = value;
  };
  const recording_graph = () => {
    const calls = [];
    const record = (name) => (...args) => calls.push([name, ...args]);
    return {
      calls, plot_pole: record('pole'), plot_zero: record('zero'), plot_complex_poles: record('complex'),
      plot_marks: record('marks'), draw_T_in_Nyquist: record('T'), draw_complex_poles_in_nyquist: record('complex'),
    };
  };
  const plotted = (name, property) => {
    with_sliders();
    const graph = recording_graph();
    global_value(name)[property](graph);
    return graph.calls;
  };
  const pole = (T) => ({ T, kind: 'pole' });
  const zero = (T) => ({ T, kind: 'zero' });

  test.each([
    ['GRAPH_ONE_REAL_POLE', [pole(2)]],
    ['GRAPH_TWO_REAL_POLES', [pole(4), pole(0.1)]],
    ['GRAPH_ONE_ZERO', [zero(0.5)]],
    ['GRAPH_ONE_ZERO_TWO_POLES', [pole(1), pole(4), zero(2)]],
    ['GRAPH_FOUR_POLES', [pole(1)]],
  ])('%s plots its marks on the map', (name, marks) => {
    expect(plotted(name, 'plot_on_pole_zero_map')).toEqual([['marks', marks]]);
  });

  test('the PID controller adds the integrator at the origin', () => {
    expect(plotted('GRAPH_PID', 'plot_on_pole_zero_map')).toEqual([['pole', 0, 0], ['marks', [zero(2), zero(0.5)]]]);
  });

  test('complex poles have their own plot', () => {
    expect(plotted('GRAPH_TWO_COMPLEX_POLES', 'plot_on_pole_zero_map')).toEqual([['complex']]);
    expect(plotted('GRAPH_TWO_COMPLEX_POLES', 'plot_on_nyquist')).toEqual([['complex']]);
  });

  test.each([
    ['GRAPH_ONE_REAL_POLE', [['T', 'T_1']]],
    ['GRAPH_TWO_REAL_POLES', [['T', 'T_2'], ['T', 'T_3']]],
    ['GRAPH_ONE_ZERO_TWO_POLES', [['T', 'T_8', 'zero'], ['T', 'T_6'], ['T', 'T_7']]],
  ])('%s marks the Nyquist diagram', (name, calls) => {
    expect(plotted(name, 'plot_on_nyquist')).toEqual(calls);
  });

  test.each(['GRAPH_TIME_DELAY', 'GRAPH_FOUR_POLES', 'GRAPH_ONE_ZERO', 'GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_YR'])(
    '%s has no marks in the Nyquist diagram', (name) => {
      expect(global_value(name).plot_on_nyquist).toBeUndefined();
    });

  test.each(['GRAPH_TIME_DELAY', 'GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_ONE_POLE_WITH_PID_YL', 'GRAPH_ONE_POLE_WITH_PID_OPEN'])(
    '%s leaves its map to the computed poles and zeros', (name) => {
      expect(global_value(name).plot_on_pole_zero_map).toBeUndefined();
    });

  test('draggable_time_variables: nothing for a typed formula, and the PID ones only when asked for', () => {
    expect(window.draggable_time_variables('1/(s+2)', true)).toBeNull();
    expect(window.draggable_time_variables(global_value('GRAPH_ONE_REAL_POLE').formula, true)).toBeNull();
    expect(window.draggable_time_variables(global_value('GRAPH_PID').formula, false)).toBeNull();
    expect(window.draggable_time_variables(global_value('GRAPH_PID').formula, true)).toEqual(['T_i', 'T_d']);
  });

  test('draw_complex_poles_in_nyquist marks w, but no frequency of 0', () => {
    const graph = Object.create(global_value('bode_graph').prototype);
    graph.draw_nyquist_X = jest.fn();
    Object.assign(SLIDERS, { w: 0 });
    with_sliders();
    graph.draw_complex_poles_in_nyquist();
    expect(graph.draw_nyquist_X).not.toHaveBeenCalled();
    Object.assign(SLIDERS, { w: 2 });
    with_sliders();
    graph.draw_complex_poles_in_nyquist();
    expect(graph.draw_nyquist_X.mock.calls).toEqual([[2]]);
  });

  test.each([
    ['GRAPH_TWO_REAL_POLES', ['T_2', 'T_3']],
    ['GRAPH_ONE_ZERO_TWO_POLES', ['T_8', 'T_6', 'T_7']],
    ['GRAPH_PID', ['T_i', 'T_d']],
    ['GRAPH_ONE_REAL_POLE', undefined],
  ])('%s has the draggable time constants %j', (name, names) => {
    expect(global_value(name).drag_time_constants).toEqual(names);
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
