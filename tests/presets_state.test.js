// src/presets_state.js: the preset graphs' LaTeX (what MathLive shows in the equation field), the
// start-up values of the global state, and the colour table. The other suites reset or replace
// most of this state, so they cannot see the initial values.
const { loadApp, global_value } = require('./helpers/load_app');

beforeAll(() => loadApp());

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
