// Golden master of the hover overlays: every p5 call of mouseMoved(), in order, for each region of
// the canvas, with real graphs. The tests in hover_nyquist.test.js check what the overlays mean;
// this pins all of the drawing, which they do not. After an intentional change, read the snapshot
// diff and update it with `npx jest -u tests/hover_overlays.test.js`.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const RECORDED = ['arc', 'ellipse', 'fill', 'line', 'noFill', 'noStroke', 'pop', 'push', 'rect', 'stroke',
  'strokeWeight', 'text', 'textSize', 'translate'];
const originals = {};
const drawn = [];

// No plot starts at 0, or a sign error in an offset would not show.
const GEOMETRY = {
  graph_bode_mag_x: 10, graph_bode_mag_y: 6, graph_bode_mag_width: 400, graph_bode_mag_height: 200,
  graph_bode_phase_x: 20, graph_bode_phase_y: 310, graph_bode_phase_width: 400, graph_bode_phase_height: 200,
  graph_step_response_x: 500, graph_step_response_y: 4, graph_step_response_width: 300, graph_step_response_height: 200,
  graph_nyquist_x: 500, graph_nyquist_y: 300, graph_nyquist_width: 300, graph_nyquist_height: 300,
  pole_zero_width: 100, pole_zero_height: 100, pole_zero_graph_x: [900, 900, 900], pole_zero_graph_y: [5, 115, 225],
  canvas_width: 1100, canvas_height: 900, min_10power: -2, x_case_gain: 5, y_case_gain: 6, gain_upper_bound: 60,
  max_x_timerep: 10, precision: 4, line_stroke_weight: 2, input_formula: '1/s', improvement_enabled: false,
  questions_enabled: false, box_background_color: 120, angle_color: 'angle', text_color: 'text', line_color: 'grey',
  phase_lower_bound: -180, phase_upper_bound: 45, phase_case_number: 5, min_y_timerep: 0, max_y_timerep: 4,
  min_nyquist_x: -1, max_nyquist_x: 5, min_nyquist_y: -3, max_nyquist_y: 1,
};
const SLIDERS = { k_1: 2, T_1: 1, k_3: 1, w: 3, z: 0.2, L: 0.5 };
const PRESETS = ['GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_COMPLEX_POLES', 'GRAPH_TIME_DELAY'];

const POSITIONS = {
  'pole-zero map': [950, 55],
  'computed pole-zero map': [950, 275],
  'step response time axis': [650, 255],
  'step response': [650, 120],
  'Bode magnitude frequency axis': [200, 250],
  'Bode magnitude y axis': [30, 100],
  'Bode magnitude plot': [200, 120],
  'Nyquist diagram': [700, 500],
  'Bode phase frequency axis': [200, 630],
  'Bode phase y axis': [30, 500],
  'Bode phase plot': [200, 500],
};

const round = (value) => (typeof value === 'number' ? Number(value.toFixed(3)) : value);

function hover_at([x, y]) {
  window.mouseX = x;
  window.mouseY = y;
  drawn.length = 0;
  window.mouseMoved();
  return drawn.map(([name, ...args]) => `${name}(${args.map(round).join(', ')})`);
}

function use_graphs(change = () => {}) {
  const position = global_value('variable_position');
  const variables = global_value('range_slider_variables');
  global_value('range_slider_alphabet').forEach((name, i) => { position[name] = i; });
  for (const [name, value] of Object.entries(SLIDERS)) variables[position[name]] = value;
  const bode_graph = global_value('bode_graph');
  const graphs = global_value('bode_graphs');
  graphs.length = 0;
  PRESETS.forEach((preset, i) => {
    const graph = new bode_graph(i + 1, global_value(preset).formula);
    graph.graph_name = global_value(preset).name;
    graph.get_complex_p5();
    graph.get_timevalues_p5();
    change(graph);
    graphs.push(graph);
  });
}

beforeAll(() => {
  loadApp();
  for (const name of [...RECORDED, 'redraw', 'cos', 'sin', 'color']) originals[name] = window[name];
  for (const name of RECORDED) window[name] = (...args) => { drawn.push([name, ...args]); };
  window.redraw = () => {};
  window.color = (...args) => args.join(' ');
  window.cos = Math.cos;
  window.sin = Math.sin;
});

afterAll(() => {
  for (const name of Object.keys(originals)) window[name] = originals[name];
});

beforeEach(() => set_globals(GEOMETRY));

describe('hovering with the curves shown', () => {
  test.each(Object.entries(POSITIONS))('%s', (_, position) => {
    use_graphs();
    expect(hover_at(position)).toMatchSnapshot();
  });
});

describe('hovering with no curves to find', () => {
  test.each(Object.entries(POSITIONS))('%s', (_, position) => {
    use_graphs((graph) => { graph.bode_displaybool = false; });
    expect(hover_at(position)).toMatchSnapshot();
  });
});

describe('hovering curves that are hidden in the Nyquist diagram', () => {
  test.each(['Bode magnitude frequency axis', 'Bode magnitude plot', 'Bode phase frequency axis', 'Bode phase plot'])('%s', (name) => {
    use_graphs((graph) => { graph.bode_display_nyquist_bool = false; });
    expect(hover_at(POSITIONS[name])).toMatchSnapshot();
  });
});

describe('the dot on the real axis of the Nyquist diagram stays inside it', () => {
  const dots_at_nyquist = (min_nyquist_x, max_nyquist_x) => {
    set_globals({ min_nyquist_x, max_nyquist_x });
    use_graphs((graph) => { graph.bode_displaybool = false; });
    const y = GEOMETRY.graph_nyquist_y + 45 + (1 / 4) * GEOMETRY.graph_nyquist_height; // the real axis
    return hover_at(POSITIONS['step response']).filter((call) => call.endsWith(`, ${y}, 12, 12)`));
  };

  test('an output in the range gets its dot', () => {
    expect(dots_at_nyquist(-1, 5)).toHaveLength(1);
  });

  test.each([[5, 10], [-10, -5]])('an output outside the range %d..%d gets none', (min, max) => {
    expect(dots_at_nyquist(min, max)).toEqual([]);
  });
});

test('the step response does not draw Nyquist values, as its x axis is time', () => {
  use_graphs();
  const draw_nyquist_value = jest.fn();
  global_value('bode_graphs').forEach((graph) => { graph.draw_nyquist_value = draw_nyquist_value; });
  hover_at(POSITIONS['step response']);
  expect(draw_nyquist_value).not.toHaveBeenCalled();
});
