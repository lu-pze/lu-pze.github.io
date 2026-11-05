// Tests for src/graph_ui.js: the range sliders (createRangeSlider and its handlers), adding and
// removing graphs (addNewGraph, removeGraph, removeAllGraphs), the information tabs, and the
// bode_graphs management around them (getGraphById, checkSlider, updateFormulaAndDraw ...).
// Graphs are built for real in jsdom; only the cross-file side effects (events, achievements,
// tasks, redrawing) are replaced by spies.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = [
  'add_event', 'achievement_done', 'task_done', 'redraw_canvas_gain', 'redraw', 'quiz_perhaps',
  'updateGraphInformation',
];
const originals = {};
const UNSET = 18012001; // range_slider_variables marks a variable without a slider with this value.

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
  originals.addNewGraph = window.addNewGraph;
  // app_setup.js fills this table in p5's setup(), which does not run in the tests.
  const alphabet = global_value('range_slider_alphabet');
  const variable_position = global_value('variable_position');
  alphabet.forEach((name, i) => { variable_position[name] = i; });
});

// Removes everything the previous test added to the page. The static page has one empty
// .equation-wrapper and an empty tab bar.
function reset_dom() {
  document.querySelectorAll('.slider-wrapper').forEach((slider) => slider.remove());
  document.querySelectorAll('.equation-wrapper').forEach((wrapper, i) => { if (i > 0) wrapper.remove(); });
  document.querySelector('.graph-information-tabs').innerHTML = '';
}

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  set_globals({
    bode_graphs: [], id_bank: 0, next_graph_no_to_add: 0, current_quiz: 'none',
    current_assignment: 'none', precision: 4, we_need_faster_calculations_right_now: false,
    input_formula: '1/s',
  });
  global_value('range_slider_variables').fill(UNSET, 1);
  reset_dom();
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
  window.addNewGraph = originals.addNewGraph;
});

const position = (name) => global_value('variable_position')[name];
const variable = (name) => global_value('range_slider_variables')[position(name)];
const set_variable = (values) => {
  for (const [name, value] of Object.entries(values)) global_value('range_slider_variables')[position(name)] = value;
};
const graphs = () => global_value('bode_graphs');
const preset = (name) => global_value(name);
const calls_of = (spy) => window[spy].mock.calls.map((args) => args[0]);
const fire = (element, type) => element.dispatchEvent(new window.Event(type));
const tab_checked = (id) => document.getElementById('graph_' + id + '_info').checked;
// The first seven presets as graphs 1 to 7, as a page shows them when they are added in order.
const use_seven_presets = () => set_globals({
  bode_graphs: ['GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TWO_COMPLEX_POLES', 'GRAPH_TIME_DELAY',
    'GRAPH_ONE_ZERO_TWO_POLES', 'GRAPH_FOUR_POLES', 'GRAPH_ONE_ZERO'].map((name, index) => (
    { bode_id: index + 1, bode_formula: preset(name).formula })),
});

// Creates a real slider for a variable through the same entry point as the "+" buttons. The
// range input gets step="any" so jsdom does not snap values and tests can sit exactly on a threshold.
function make_slider(name) {
  const target = { id: 'BTNS_999_' + position(name), remove: jest.fn() };
  window.createRangeSlider({ target });
  const wrapper = [...document.querySelectorAll('.slider-wrapper')].pop();
  const range = wrapper.querySelector('.range-slider');
  range.step = 'any';
  const [min_box, max_box] = wrapper.querySelectorAll('.slider-bound');
  return { target, wrapper, range, min_box, max_box, text: wrapper.querySelector('.value-wrapper input') };
}

// Moves the range input to a value and fires the given event ("input" while dragging, "change" on release).
function drag(slider, value, type = 'input') {
  slider.range.value = String(value);
  fire(slider.range, type);
}

function type_into(slider, value, type = 'input') {
  slider.text.value = String(value);
  fire(slider.text, type);
}

// The seven information tabs the sliders switch between.
function add_info_tabs() {
  for (let id = 1; id <= 7; id++) window.addNewInformationTab(id, '');
}

describe('getGraphById', () => {
  test('finds a graph by id, also when the id is a string, and returns "none" otherwise', () => {
    window.addNewGraph();
    window.addNewGraph();
    expect(window.getGraphById(2)).toBe(graphs()[1]);
    expect(window.getGraphById('1')).toBe(graphs()[0]);
    expect(window.getGraphById(3)).toBe('none');
  });

  test('returns "none" when there are no graphs', () => {
    expect(window.getGraphById(1)).toBe('none');
  });
});

describe('createRangeSlider', () => {
  test('builds a slider for a preset variable from default_variable_values', () => {
    const slider = make_slider('T_1');
    expect(slider.wrapper.parentElement).toBe(document.getElementsByClassName('equations')[0]);
    expect(slider.range.min).toBe('-5');
    expect(slider.range.max).toBe('10');
    expect(slider.range.value).toBe('0.6');
    expect(slider.range.id).toBe('RANGE_' + position('T_1'));
    expect(slider.min_box.value).toBe('-5');
    expect(slider.max_box.value).toBe('10');
    expect(slider.text.id).toBe('variable_' + position('T_1'));
    expect(slider.text.value).toBe('0.60');
    expect(variable('T_1')).toBe(0.6);
    const label = slider.wrapper.querySelector('math-field');
    expect(label.textContent).toBe('T_1 =');
    expect(label.getAttribute('read-only')).not.toBeNull();
    expect(label.menuItems).toEqual([]);
  });

  test('uses 0.1 to 20 and the value 1 for a variable without defaults', () => {
    const slider = make_slider('w');
    expect([slider.range.min, slider.range.max, slider.range.value]).toEqual(['0.1', '20', '1']);
    expect(slider.text.value).toBe('1.00');
    expect(variable('w')).toBe(1);
  });

  test('removes the button that was clicked, and survives a target without remove()', () => {
    const slider = make_slider('k_1');
    expect(slider.target.remove).toHaveBeenCalledTimes(1);
    expect(() => window.createRangeSlider({ target: { id: 'BTNS_999_' + position('k_2') } })).not.toThrow();
    expect(document.getElementById('RANGE_' + position('k_2'))).not.toBeNull();
  });

  describe.each(['pid_controller', 'pid_controller_S', 'pid_controller_YL', 'pid_controller_OL'])('in the %s assignment', (assignment) => {
    beforeEach(() => set_globals({ current_assignment: assignment }));

    test('k_1 cannot be negative and T_1 starts at 6', () => {
      expect(make_slider('k_1').range.min).toBe('0.01');
      expect(make_slider('T_1').range.value).toBe('6');
      expect(variable('T_1')).toBe(6);
    });

    test('other sliders keep their defaults', () => {
      const slider = make_slider('k_2');
      expect([slider.range.min, slider.range.value]).toEqual(['-4', '2']);
    });

    test('dragging a slider switches to fast precision', () => {
      add_info_tabs();
      drag(make_slider('K'), 2);
      expect(global_value('we_need_faster_calculations_right_now')).toBe(true);
      expect(global_value('precision')).toBe(global_value('SPEED_PRECISION'));
    });
  });

  test.each(['none', 'pid_controller_x', 'follow_the_poles'])('outside the PID assignments (%s) k_1 and T_1 keep their defaults', (assignment) => {
    set_globals({ current_assignment: assignment });
    expect(make_slider('k_1').range.min).toBe('-4');
    expect(make_slider('T_1').range.value).toBe('0.6');
  });

  test('dragging a slider outside the PID assignments keeps normal precision', () => {
    add_info_tabs();
    drag(make_slider('K'), 2);
    expect(global_value('we_need_faster_calculations_right_now')).toBe(false);
    expect(global_value('precision')).toBe(4);
  });

  describe('dragging (input event)', () => {
    beforeEach(add_info_tabs);

    test('updates the text box, the variable table and recalculates all graphs', () => {
      const slider = make_slider('k_2');
      drag(slider, 2.5);
      expect(slider.text.value).toBe('2.5');
      expect(variable('k_2')).toBe(2.5);
      expect(window.redraw_canvas_gain).toHaveBeenCalledTimes(1);
      expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
    });

    test('rounds the text box to two decimals but keeps the slider value in the table', () => {
      const slider = make_slider('k_2');
      drag(slider, 1.234);
      expect(slider.text.value).toBe('1.23');
      expect(variable('k_2')).toBe(1.234);
    });

    test('L completes the change_L achievement', () => {
      drag(make_slider('L'), 1);
      expect(calls_of('achievement_done')).toEqual(['change_L']);
    });

    test.each([[100, true], [99.99, false], [150, true]])('k slider at %s: k_above_or_equal_100=%s', (value, expected) => {
      const slider = make_slider('k_3');
      slider.range.max = '200';
      drag(slider, value);
      expect(calls_of('achievement_done').includes('k_above_or_equal_100')).toBe(expected);
    });

    test('K (upper case) is not a k-value', () => {
      const slider = make_slider('K');
      slider.range.max = '200';
      drag(slider, 150);
      expect(calls_of('achievement_done')).toEqual([]);
    });

    test.each([[0.1, true], [0.11, false], [0, true]])('z slider at %s: low_z=%s', (value, expected) => {
      drag(make_slider('z'), value);
      expect(calls_of('achievement_done').includes('low_z')).toBe(expected);
    });

    // T_2 / T_3 is checked against 0.01 and 100 with T_3 or T_2 set directly in the table.
    test.each([
      ['T_2', 10, { T_3: 1000 }, true], // 10 / 1000 = 0.01, exactly on the lower limit
      ['T_2', 10, { T_3: 999 }, false],
      ['T_2', 10, { T_3: 0.1 }, true], // 10 / 0.1 = 100, exactly on the upper limit
      ['T_2', 10, { T_3: 0.1001 }, false],
      ['T_3', 5, { T_2: 0.05 }, true], // 0.05 / 5 = 0.01
      ['T_3', 5, { T_2: 0.06 }, false],
    ])('%s slider at %s with %o: T2_T3_far_apart=%s', (name, value, others, expected) => {
      set_variable(others);
      drag(make_slider(name), value);
      expect(calls_of('achievement_done').includes('T2_T3_far_apart')).toBe(expected);
    });

    test('a T slider with both T_2 and T_3 unset does not complete T2_T3_far_apart', () => {
      drag(make_slider('T_4'), 1);
      expect(calls_of('achievement_done')).toEqual([]);
    });

    describe('the information tab', () => {
      const graph_of = (id, preset_name) => ({ bode_id: id, bode_formula: preset(preset_name).formula });
      const use_graphs = (...graphs) => set_globals({ bode_graphs: graphs });

      // The information tab of the graph that uses the variable becomes active.
      test.each([
        ['k_1', 1], ['T_1', 1], ['k_2', 2], ['T_2', 2], ['T_3', 2], ['w', 3], ['z', 3], ['k_3', 3],
        ['L', 4], ['k_4', 5], ['T_6', 5], ['T_7', 5], ['T_8', 5], ['k_5', 6], ['T_5', 6], ['T_4', 7],
      ])('with the presets in their usual order, moving %s activates tab %i', (name, tab) => {
        use_seven_presets();
        const slider = make_slider(name);
        drag(slider, +slider.range.value + 0.5);
        expect(tab_checked(tab)).toBe(true);
        for (let other = 1; other <= 7; other++) if (other !== tab) expect(tab_checked(other)).toBe(false);
      });

      test('the tab follows the graph, wherever it sits on the page', () => {
        use_graphs(graph_of(2, 'GRAPH_ONE_ZERO_TWO_POLES'));
        drag(make_slider('k_4'), 2);
        expect(tab_checked(2)).toBe(true);
        expect(tab_checked(5)).toBe(false);
      });

      test('a variable of a graph without a fixed place gets its tab too', () => {
        use_graphs(graph_of(2, 'GRAPH_PID'));
        drag(make_slider('K'), 2);
        expect(tab_checked(2)).toBe(true);
      });

      test('with several graphs using the variable, the first one gets the tab', () => {
        use_graphs(graph_of(3, 'GRAPH_ONE_REAL_POLE'), graph_of(2, 'GRAPH_ONE_POLE_WITH_PID_YR'));
        drag(make_slider('k_1'), 2);
        expect(tab_checked(3)).toBe(true);
        expect(tab_checked(2)).toBe(false);
      });

      test('a graph without a tab is skipped, and the slider still redraws', () => {
        use_graphs(graph_of(99, 'GRAPH_ONE_REAL_POLE'), graph_of(2, 'GRAPH_ONE_POLE_WITH_PID_YR'));
        drag(make_slider('k_1'), 2);
        expect(tab_checked(2)).toBe(true);
        window.redraw_canvas_gain.mockClear();
        use_graphs(graph_of(99, 'GRAPH_ONE_REAL_POLE'));
        drag(make_slider('T_1'), 3);
        expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
      });

      test('a variable that no graph uses leaves the active tab alone and still redraws', () => {
        use_graphs(graph_of(2, 'GRAPH_ONE_REAL_POLE'), { bode_id: 3, bode_formula: 'not a (formula' });
        drag(make_slider('q'), 0.5);
        expect(tab_checked(1)).toBe(true);
        expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
      });
    });
  });

  describe('releasing a slider (change event)', () => {
    // A browser always sends input before change, and input is what sets the variable.
    const release_at = (slider, value) => {
      drag(slider, value, 'input');
      fire(slider.range, 'change');
    };

    beforeEach(add_info_tabs);

    test.each([
      [1.9, true], [2.12, true], [2.0, true], [1.89, false], [2.13, false],
    ])('T_1 at %s: T1=2 done=%s', (value, expected) => {
      release_at(make_slider('T_1'), value);
      expect(calls_of('task_done').includes('T1=2')).toBe(expected);
    });

    test.each([[-0.01, true], [0, false], [-5, true]])('T_1 at %s: T1_unstable=%s', (value, expected) => {
      release_at(make_slider('T_1'), value);
      expect(calls_of('task_done').includes('T1_unstable')).toBe(expected);
    });

    test('the T_1 tasks only belong to the T_1 slider', () => {
      release_at(make_slider('T_2'), 2);
      expect(calls_of('task_done')).toEqual([]);
    });

    test('moving another slider does not finish a T_1 task that was already in range', () => {
      set_variable({ T_1: 2 });
      release_at(make_slider('k_1'), 1);
      expect(calls_of('task_done')).toEqual([]);
    });

    test.each([
      [{ T_2: 0.05, T_3: 5 }, true], [{ T_2: 5, T_3: 0.05 }, true],
      [{ T_2: 0.035, T_3: 4.0 }, true], [{ T_2: 0.07, T_3: 5.8 }, true],
      [{ T_2: 0.0349, T_3: 5 }, false], [{ T_2: 0.0701, T_3: 5 }, false],
      [{ T_2: 0.05, T_3: 3.99 }, false], [{ T_2: 0.05, T_3: 5.81 }, false],
    ])('table %o: T2,T3=0.05_and_5 done=%s', (values, expected) => {
      set_variable(values);
      release_at(make_slider('k_1'), 1);
      expect(calls_of('task_done').includes('T2,T3=0.05_and_5')).toBe(expected);
    });
  });

  describe('typing a value (input event on the text box)', () => {
    beforeEach(add_info_tabs);

    test('sets the variable, moves the slider and recalculates', () => {
      const slider = make_slider('k_2');
      type_into(slider, 7.5);
      expect(variable('k_2')).toBe(7.5);
      expect(slider.range.value).toBe('7.5');
      expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
    });

    test('a value above the slider maximum raises the maximum and its text box', () => {
      const slider = make_slider('k_2');
      type_into(slider, 50);
      expect(slider.range.max).toBe('50');
      expect(slider.max_box.value).toBe('50');
      expect(slider.range.value).toBe('50');
      expect(slider.range.min).toBe('-4');
    });

    test('a value below the slider minimum lowers the minimum and its text box', () => {
      const slider = make_slider('k_2');
      type_into(slider, -10);
      expect(slider.range.min).toBe('-10');
      expect(slider.min_box.value).toBe('-10');
      expect(slider.range.value).toBe('-10');
      expect(slider.range.max).toBe('20');
    });

    test.each(['20.0', '-4.0'])('a value exactly on a limit (%s) leaves the limits alone', (value) => {
      const slider = make_slider('k_2');
      type_into(slider, value);
      expect([slider.range.min, slider.range.max]).toEqual(['-4', '20']);
      expect([slider.min_box.value, slider.max_box.value]).toEqual(['-4', '20']);
    });

    test('L completes change_L', () => {
      type_into(make_slider('L'), 1);
      expect(calls_of('achievement_done')).toEqual(['change_L']);
    });

    test.each([[100, true], [99.99, false], [1000, true]])('typing %s in a k box: k_above_or_equal_100=%s', (value, expected) => {
      type_into(make_slider('k_1'), value);
      expect(calls_of('achievement_done').includes('k_above_or_equal_100')).toBe(expected);
    });

    test.each([[0.1, true], [0.11, false], [0, true]])('typing %s in the z box: low_z=%s', (value, expected) => {
      type_into(make_slider('z'), value);
      expect(calls_of('achievement_done').includes('low_z')).toBe(expected);
    });

    test.each([
      ['T_2', 10, { T_3: 1000 }, true],
      ['T_2', 10, { T_3: 999 }, false],
      ['T_3', 0.1, { T_2: 10 }, true],
      ['T_3', 0.1001, { T_2: 10 }, false],
    ])('typing %s=%s with %o: T2_T3_far_apart=%s', (name, value, others, expected) => {
      set_variable(others);
      type_into(make_slider(name), value);
      expect(calls_of('achievement_done').includes('T2_T3_far_apart')).toBe(expected);
    });

    test('does not touch the information tabs', () => {
      type_into(make_slider('L'), 1);
      expect(tab_checked(4)).toBe(false);
      expect(tab_checked(1)).toBe(true);
    });
  });

  describe('finishing a typed value (change event on the text box)', () => {
    // A browser always sends input before change, and input is what sets the variable.
    const finish_typing = (slider, value) => {
      type_into(slider, value);
      fire(slider.text, 'change');
    };

    test.each([
      [1.9, true], [2.12, true], [2.0, true], [1.89, false], [2.13, false],
    ])('T_1 = %s: T1=2 done=%s, the same window as the slider', (value, expected) => {
      finish_typing(make_slider('T_1'), value);
      expect(calls_of('task_done').includes('T1=2')).toBe(expected);
    });

    test.each([[-0.01, true], [0, false]])('T_1 = %s: T1_unstable=%s', (value, expected) => {
      finish_typing(make_slider('T_1'), value);
      expect(calls_of('task_done').includes('T1_unstable')).toBe(expected);
    });

    test('the T_1 tasks only belong to the T_1 box', () => {
      finish_typing(make_slider('T_2'), 2);
      expect(calls_of('task_done')).toEqual([]);
    });

    test.each([
      [{ T_2: 0.05, T_3: 5 }, true], [{ T_2: 0.035, T_3: 4.0 }, true], [{ T_2: 0.07, T_3: 5.8 }, true],
      [{ T_2: 0.0349, T_3: 5 }, false], [{ T_2: 0.0701, T_3: 5 }, false],
      [{ T_2: 0.05, T_3: 3.99 }, false], [{ T_2: 0.05, T_3: 5.81 }, false],
    ])('table %o: T2,T3=0.05_and_5 done=%s', (values, expected) => {
      set_variable(values);
      type_into(make_slider('k_1'), 1, 'change');
      expect(calls_of('task_done').includes('T2,T3=0.05_and_5')).toBe(expected);
    });

    test.each([
      [{ k_3: 1, w: 8, z: 0.05 }, true],
      [{ k_3: 0.9, w: 7.3, z: 0.02 }, true], [{ k_3: 1.1, w: 8.7, z: 0.07 }, true],
      [{ k_3: 0.89, w: 8, z: 0.05 }, false], [{ k_3: 1.11, w: 8, z: 0.05 }, false],
      [{ k_3: 1, w: 7.29, z: 0.05 }, false], [{ k_3: 1, w: 8.71, z: 0.05 }, false],
      [{ k_3: 1, w: 8, z: 0.019 }, false], [{ k_3: 1, w: 8, z: 0.071 }, false],
    ])('table %o: w=8,z=0.05,k_3=1 done=%s', (values, expected) => {
      set_variable(values);
      type_into(make_slider('k_1'), 1, 'change');
      expect(calls_of('task_done').includes('w=8,z=0.05,k_3=1')).toBe(expected);
    });

    test('pressing enter in the box makes it lose focus', () => {
      const slider = make_slider('k_1');
      slider.text.blur = jest.fn();
      fire(slider.text, 'change');
      expect(slider.text.blur).toHaveBeenCalledTimes(1);
    });
  });

  describe('the limit boxes', () => {
    test('typing in the left box sets the slider minimum', () => {
      const slider = make_slider('k_1');
      slider.min_box.value = '-2.5';
      fire(slider.min_box, 'input');
      expect(slider.range.min).toBe('-2.5');
      expect(slider.range.max).toBe('20');
    });

    test('typing in the right box sets the slider maximum', () => {
      const slider = make_slider('k_1');
      slider.max_box.value = '42';
      fire(slider.max_box, 'input');
      expect(slider.range.max).toBe('42');
      expect(slider.range.min).toBe('-4');
    });
  });
});

describe('removeSlider', () => {
  // removeSlider has no caller left (its button is commented out in createRangeSlider). It expects
  // the button two levels below a row that holds the range slider, and the slider three levels up.
  test('forgets the variable, removes the slider and rechecks every graph', () => {
    window.addNewGraph(null, { name: 'Plain', mf: 'x', formula: '1/(1+s)' });
    graphs()[0].bode_formula = 'k_2/(1+s)';
    const slider = make_slider('k_2');
    window.redraw_canvas_gain.mockClear();
    const row = document.createElement('div');
    const cell = document.createElement('div');
    const button = document.createElement('button');
    cell.append(button);
    row.append(cell, slider.range);
    slider.wrapper.append(row);
    expect(variable('k_2')).toBe(2);

    window.removeSlider({ target: button });

    expect(variable('k_2')).toBe(UNSET);
    expect(document.getElementById('RANGE_' + position('k_2'))).toBeNull();
    expect(document.contains(slider.wrapper)).toBe(false); // the row's parent is what gets removed
    // The graph that uses k_2 gets its "+" button back and is recalculated.
    expect(document.getElementById('BTNS_1_' + position('k_2'))).not.toBeNull();
    expect(calls_of('redraw_canvas_gain')).toEqual([1]);
  });
});

describe('addNewInformationTab and removeInformationTab', () => {
  test('adds a radio button and a label with the graph name and colour', () => {
    window.addNewInformationTab(2, 'My graph');
    const radio = document.getElementById('graph_2_info');
    const label = document.getElementById('graph_2_infolabel');
    expect(radio.type).toBe('radio');
    expect(radio.name).toBe('tab-inf');
    expect(radio.getAttribute('onchange')).toBe('updateGraphInformation()');
    expect(label.getAttribute('for')).toBe('graph_2_info');
    expect(label.querySelector('span').textContent).toBe('My graph');
    const hue = global_value('color_table')[2];
    expect(label.querySelector('div').getAttribute('style')).toContain(`hsl(${hue},100%,50%)`);
    expect(radio.parentElement).toBe(document.querySelector('.graph-information-tabs'));
    expect(label.previousElementSibling).toBe(radio);
  });

  test('an empty name becomes "Graph <id>"', () => {
    window.addNewInformationTab(5, '');
    expect(document.getElementById('graph_5_infolabel').querySelector('span').textContent).toBe('Graph 5');
  });

  test('only tab 1 starts checked', () => {
    window.addNewInformationTab(1, 'a');
    window.addNewInformationTab(2, 'b');
    expect(tab_checked(1)).toBe(true);
    expect(tab_checked(2)).toBe(false);
  });

  test('the colour wraps around the colour table', () => {
    const table = global_value('color_table');
    window.addNewInformationTab(table.length + 3, 'wrapped');
    const label = document.getElementById('graph_' + (table.length + 3) + '_infolabel');
    expect(label.querySelector('div').getAttribute('style')).toContain(`hsl(${table[3]},100%,50%)`);
  });

  test('removeInformationTab removes both elements, and ignores a missing tab', () => {
    window.addNewInformationTab(3, 'x');
    window.addNewInformationTab(4, 'y');
    window.removeInformationTab(3);
    expect(document.getElementById('graph_3_info')).toBeNull();
    expect(document.getElementById('graph_3_infolabel')).toBeNull();
    expect(document.getElementById('graph_4_info')).not.toBeNull();
    expect(() => window.removeInformationTab(99)).not.toThrow();
  });

  test('removeInformationTab copes with a tab whose label is already gone', () => {
    window.addNewInformationTab(3, 'x');
    document.getElementById('graph_3_infolabel').remove();
    expect(() => window.removeInformationTab(3)).not.toThrow();
    expect(document.getElementById('graph_3_info')).toBeNull();
  });
});

describe('addNewGraph', () => {
  test('without arguments it adds the next preset from GRAPH_ORDER', () => {
    const order = global_value('GRAPH_ORDER');
    window.addNewGraph();
    window.addNewGraph();
    expect(graphs().map((graph) => graph.graph_name)).toEqual([order[0].name, order[1].name]);
    expect(graphs().map((graph) => graph.bode_id)).toEqual([1, 2]);
    expect(graphs().map((graph) => graph.bode_formula)).toEqual([order[0].formula, order[1].formula]);
    expect(global_value('next_graph_no_to_add')).toBe(2);
    expect(global_value('id_bank')).toBe(2);
  });

  test('builds the equation row: checkbox, math field, delete button and slider-button holder', () => {
    window.addNewGraph();
    const wrapper = document.querySelectorAll('.equation-wrapper')[1];
    const equation = wrapper.querySelector('.equation');
    expect(equation.id).toBe('One real pole');
    expect(equation.getAttribute('style')).toBeNull();
    const checkbox = wrapper.querySelector('.show-graph');
    expect(checkbox.id).toBe('One real pole-checkbox');
    expect(checkbox.title).toBe('One real pole');
    expect(checkbox.getAttribute('style')).toContain(`hsl(${global_value('color_table')[1]},100%,50%)`);
    const math_field = wrapper.querySelector('math-field.formula');
    expect(math_field.id).toBe('1');
    expect(math_field.innerHTML).toBe(preset('GRAPH_ONE_REAL_POLE').mf);
    expect(math_field.menuItems).toEqual([]);
    const delete_button = wrapper.querySelector('.delete-graph');
    expect(delete_button.id).toBe('delete-graph_1');
    expect(delete_button.getAttribute('onclick')).toBe('removeGraph(1);updateAfterRemoveGraph();');
    expect(wrapper.querySelector('.slider-buttons')).not.toBeNull();
    expect(wrapper.firstElementChild.tagName).toBe('HR');
  });

  test('the show-graph checkbox toggles bode_displaybool and redraws', () => {
    window.addNewGraph();
    const checkbox = document.querySelector('.show-graph');
    fire(checkbox, 'change');
    expect(graphs()[0].bode_displaybool).toBe(false);
    expect(window.redraw).toHaveBeenCalledTimes(1);
    fire(checkbox, 'change');
    expect(graphs()[0].bode_displaybool).toBe(true);
  });

  test('creates a slider for each variable in the formula, set to 1', () => {
    window.addNewGraph(null, preset('GRAPH_TWO_COMPLEX_POLES'));
    for (const name of ['k_3', 'w', 'z']) {
      expect(document.getElementById('RANGE_' + position(name))).not.toBeNull();
    }
    expect(document.querySelectorAll('.slider-wrapper')).toHaveLength(3);
    // The slider starts from its own default, the table entry was set to 1.0 only before it.
    expect(variable('k_3')).toBe(0.7);
    expect(variable('z')).toBe(0.2);
    expect(variable('w')).toBe(1);
    expect(variable('T_1')).toBe(UNSET);
  });

  test('an add-button preset with sliders does not create sliders for other variables', () => {
    window.addNewGraph(null, preset('GRAPH_TIME_DELAY'));
    expect(document.querySelectorAll('.slider-wrapper')).toHaveLength(1);
    expect(document.getElementById('RANGE_' + position('L'))).not.toBeNull();
  });

  test('the first three presets get a download-script button, others do not', () => {
    for (const name of ['GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TWO_COMPLEX_POLES']) {
      window.addNewGraph(null, preset(name));
    }
    window.addNewGraph(null, preset('GRAPH_TIME_DELAY'));
    const buttons = [...document.querySelectorAll('.download-script')];
    expect(buttons.map((button) => button.id)).toEqual(['download_script(1)', 'download_script(2)', 'download_script(3)']);
    expect(buttons[1].getAttribute('onclick')).toBe('download_script(2)');
    expect(document.getElementById('download_script(4)')).toBeNull();
  });

  test('an explicit custom graph is used as given', () => {
    window.addNewGraph(null, { name: 'Mine', mf: 'x', formula: '1/(s+1)' });
    expect(graphs()[0].graph_name).toBe('Mine');
    expect(graphs()[0].full_name).toBe('Mine');
    expect(graphs()[0].bode_formula).toBe('1/(s+1)');
    expect(document.getElementById('Mine')).not.toBeNull();
    expect(document.querySelectorAll('.slider-wrapper')).toHaveLength(0);
    expect(global_value('next_graph_no_to_add')).toBe(1);
  });

  test('with an empty name it falls back to the next preset, and after the last one to a numbered graph', () => {
    const order = global_value('GRAPH_ORDER');
    window.addNewGraph(null, { name: '', mf: '', formula: '' });
    expect(graphs()[0].graph_name).toBe(order[0].name);

    set_globals({ next_graph_no_to_add: order.length });
    window.addNewGraph();
    const extra = graphs()[1];
    expect(extra.graph_name).toBe('Graph ' + (order.length + 1));
    expect(extra.bode_formula).toBe('1/((s+1)^2)');
    expect(document.getElementById('Graph ' + (order.length + 1)).nextElementSibling).not.toBeNull();
    expect(document.getElementById('2').innerHTML).toBe('\\frac{1}{(s+1)^2}');
  });

  test('assigns a new colour per graph from the colour table', () => {
    window.addNewGraph();
    window.addNewGraph();
    const table = global_value('color_table');
    expect(graphs().map((graph) => graph.bode_hue)).toEqual([table[1], table[2]]);
  });

  test('the PID closed-loop presets get no sliders of their own', () => {
    for (const name of ['GRAPH_ONE_POLE_WITH_PID_S', 'GRAPH_ONE_POLE_WITH_PID_YL', 'GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_OPEN']) {
      window.addNewGraph(null, preset(name));
    }
    expect(graphs()).toHaveLength(4);
    expect(document.querySelectorAll('.slider-wrapper')).toHaveLength(0);
    expect(variable('K')).toBe(UNSET);
  });

  test('adds an information tab, and tab 1 is the active one', () => {
    window.addNewGraph();
    window.addNewGraph();
    expect(document.getElementById('graph_1_infolabel').querySelector('span').textContent).toBe('One real pole');
    expect(document.getElementById('graph_2_infolabel').querySelector('span').textContent).toBe('Two real poles');
    expect(tab_checked(1)).toBe(true);
    expect(tab_checked(2)).toBe(false);
  });

  test('starts the formula listener and draws the new graph', () => {
    window.addNewGraph();
    expect(calls_of('add_event')).toEqual(['update_formula_and_draw']);
    expect(window.redraw_canvas_gain).toHaveBeenLastCalledWith(1);
  });

  describe('enable_string (which plots a graph shows)', () => {
    // Positions 5 to 10 are M P T N I E; a "." switches that place off.
    test.each([
      ['_____.PTNIE', 'bode_display_bodemag_bool'],
      ['_____M.TNIE', 'bode_display_bodephase_bool'],
      ['_____MP.NIE', 'bode_display_timeresponse_bool'],
      ['_____MPT.IE', 'bode_display_nyquist_bool'],
      ['_____MPTN.E', 'bode_display_information_bool'],
      ['_____MPTNI.', 'bode_display_equation_bool'],
    ])('%s turns off %s only', (enable_string, flag) => {
      window.addNewGraph(null, { name: 'Plain', mf: 'x', formula: '1/(s+1)' }, enable_string);
      const flags = [
        'bode_display_bodemag_bool', 'bode_display_bodephase_bool', 'bode_display_timeresponse_bool',
        'bode_display_nyquist_bool', 'bode_display_information_bool', 'bode_display_equation_bool',
      ];
      for (const name of flags) expect(graphs()[0][name]).toBe(name !== flag);
      expect(graphs()[0].bode_display_pole_zero_bool).toBe(true);
    });

    test('the default switches nothing off', () => {
      window.addNewGraph(null, { name: 'Plain', mf: 'x', formula: '1/(s+1)' });
      expect(graphs()[0].bode_display_bodemag_bool).toBe(true);
      expect(graphs()[0].bode_display_equation_bool).toBe(true);
    });

    test('without the equation place the row is hidden and has no separator', () => {
      window.addNewGraph(null, { name: 'Plain', mf: 'x', formula: '1/(s+1)' }, '_____MPTNI.');
      const equation = document.getElementById('Plain');
      expect(equation.getAttribute('style')).toBe('display:none;');
      expect(equation.parentElement.querySelector('hr')).toBeNull();
    });

    test('without the information place there is no information tab', () => {
      window.addNewGraph(null, { name: 'Plain', mf: 'x', formula: '1/(s+1)' }, '_____MPTN.E');
      expect(document.getElementById('graph_1_info')).toBeNull();
      expect(document.getElementById('graph_1_infolabel')).toBeNull();
    });

    test('a ghost graph reads its places from its name, hides the pole-zero map and drops the prefix', () => {
      window.addNewGraph(null, { name: 'GhostM.TN.E_Answer A', mf: 'x', formula: '1/(s+1)' });
      const ghost = graphs()[0];
      expect(ghost.graph_name).toBe('Answer A');
      expect(ghost.full_name).toBe('GhostM.TN.E_Answer A');
      expect(ghost.bode_display_bodemag_bool).toBe(true);
      expect(ghost.bode_display_bodephase_bool).toBe(false);
      expect(ghost.bode_display_timeresponse_bool).toBe(true);
      expect(ghost.bode_display_nyquist_bool).toBe(true);
      expect(ghost.bode_display_information_bool).toBe(false);
      expect(ghost.bode_display_equation_bool).toBe(true);
      expect(ghost.bode_display_pole_zero_bool).toBe(false);
      expect(document.getElementById('graph_1_info')).toBeNull();
    });

    test('a ghost with the equation place off is hidden', () => {
      window.addNewGraph(null, { name: 'GhostMPTNI._Hidden', mf: 'x', formula: '1/(s+1)' });
      expect(document.getElementById('GhostMPTNI._Hidden').getAttribute('style')).toBe('display:none;');
    });
  });
});

describe('addNewGraphClicked', () => {
  beforeEach(() => { window.addNewGraph = jest.fn(); });

  test('adds a graph, logs the event and unlocks the achievement', () => {
    const event = { type: 'click' };
    window.addNewGraphClicked(event, preset('GRAPH_PID'));
    expect(window.addNewGraph).toHaveBeenCalledWith(event, preset('GRAPH_PID'));
    expect(calls_of('add_event')).toEqual(['add_graph']);
    expect(calls_of('achievement_done')).toEqual(['add_graph']);
    expect(window.quiz_perhaps).not.toHaveBeenCalled();
  });

  test('is refused during a quiz', () => {
    set_globals({ current_quiz: 'bode_mag' });
    window.addNewGraphClicked({}, preset('GRAPH_PID'));
    expect(window.quiz_perhaps).toHaveBeenCalledWith('Sorry, you cannot add new graphs during the quiz.');
    expect(window.addNewGraph).not.toHaveBeenCalled();
    expect(window.add_event).not.toHaveBeenCalled();
    expect(window.achievement_done).not.toHaveBeenCalled();
  });

  test('is refused during an assignment', () => {
    set_globals({ current_assignment: 'pid_controller' });
    window.addNewGraphClicked({}, preset('GRAPH_PID'));
    expect(window.quiz_perhaps).toHaveBeenCalledWith('Sorry, you cannot add new graphs during an assignment.');
    expect(window.addNewGraph).not.toHaveBeenCalled();
    expect(window.achievement_done).not.toHaveBeenCalled();
  });

  test('the quiz message wins when both a quiz and an assignment are active', () => {
    set_globals({ current_quiz: 'bode_mag', current_assignment: 'pid_controller' });
    window.addNewGraphClicked({}, preset('GRAPH_PID'));
    expect(window.quiz_perhaps).toHaveBeenCalledTimes(1);
    expect(window.quiz_perhaps).toHaveBeenCalledWith('Sorry, you cannot add new graphs during the quiz.');
  });
});

describe('updateFormulaAndDraw (typing in a graph\'s math field)', () => {
  function type_formula(math_field, ascii) {
    math_field.getValue = jest.fn(() => ascii);
    fire(math_field, 'input');
  }

  test('stores the new formula, hides the download button and recalculates that graph', () => {
    window.addNewGraph();
    window.redraw_canvas_gain.mockClear();
    const math_field = document.getElementById('1');
    type_formula(math_field, 'k_1/(1+T_1s)*2');
    expect(math_field.getValue).toHaveBeenCalledWith('ascii-math');
    expect(graphs()[0].bode_formula).toBe('k_1/(1+T_1s)*2');
    expect(document.getElementById('download_script(1)').style.visibility).toBe('hidden');
    expect(window.redraw_canvas_gain).toHaveBeenCalledWith('1');
  });

  test('only the edited graph changes', () => {
    window.addNewGraph();
    window.addNewGraph();
    const second_formula = graphs()[1].bode_formula;
    type_formula(document.getElementById('1'), '3/(s+1)');
    expect(graphs()[0].bode_formula).toBe('3/(s+1)');
    expect(graphs()[1].bode_formula).toBe(second_formula);
  });

  test('works for a graph without a download button', () => {
    window.addNewGraph(null, preset('GRAPH_TIME_DELAY'));
    const math_field = document.getElementById('1');
    expect(() => type_formula(math_field, '2/(s+1)')).not.toThrow();
    expect(graphs()[0].bode_formula).toBe('2/(s+1)');
  });

  test('adds a slider button for a variable that the new formula introduces', () => {
    window.addNewGraph(null, preset('GRAPH_ONE_REAL_POLE'));
    type_formula(document.getElementById('1'), 'k_1/(1+T_1s)+k_2');
    const button = document.getElementById('BTNS_1_' + position('k_2'));
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('k_2');
  });

  test('does nothing for an element that is not a graph', () => {
    window.addNewGraph();
    const stray = document.createElement('div');
    stray.id = '77';
    stray.getValue = jest.fn(() => 'x');
    document.body.append(stray);
    window.redraw_canvas_gain.mockClear();
    window.updateFormulaAndDraw(stray);
    fire(stray, 'input');
    stray.remove();
    expect(graphs()[0].bode_formula).toBe(preset('GRAPH_ONE_REAL_POLE').formula);
    expect(window.redraw_canvas_gain).not.toHaveBeenCalled();
  });
});

describe('checkSlider and createSliderButton', () => {
  beforeEach(() => window.addNewGraph(null, preset('GRAPH_ONE_REAL_POLE')));

  const button_for = (name) => document.getElementById('BTNS_1_' + position(name));

  test('adds buttons for variables without a slider, and not for those that have one', () => {
    graphs()[0].bode_formula = 'k_1*T_1*K*z';
    window.checkSlider(1);
    expect(button_for('K')).not.toBeNull();
    expect(button_for('z')).not.toBeNull();
    expect(button_for('k_1')).toBeNull();
    expect(button_for('T_1')).toBeNull();
  });

  test('does not add a second button when one exists', () => {
    graphs()[0].bode_formula = 'k_1*T_1*K';
    window.checkSlider(1);
    window.checkSlider(1);
    expect(document.querySelectorAll('#BTNS_1_' + position('K'))).toHaveLength(1);
  });

  test('a variable that already has a value gets no button', () => {
    set_variable({ K: 3 });
    graphs()[0].bode_formula = 'k_1*T_1*K';
    window.checkSlider(1);
    expect(button_for('K')).toBeNull();
  });

  test('removes the button of a variable that left the formula', () => {
    graphs()[0].bode_formula = 'k_1*T_1*K';
    window.checkSlider(1);
    expect(button_for('K')).not.toBeNull();
    graphs()[0].bode_formula = 'k_1*T_1';
    window.checkSlider(1);
    expect(button_for('K')).toBeNull();
  });

  test('the button is a styled slider-button inside the graph\'s slider-buttons holder', () => {
    graphs()[0].bode_formula = 'k_1*T_1*K';
    window.checkSlider(1);
    const button = button_for('K');
    expect(button.classList.contains('slider-button')).toBe(true);
    expect(button.getAttribute('style')).toBe('margin: 0 0 5px 10px');
    expect(button.parentElement).toBe(document.getElementById('1').parentElement.parentElement.querySelector('.slider-buttons'));
  });

  test('clicking the button creates the slider and removes the button', () => {
    graphs()[0].bode_formula = 'k_1*T_1*K';
    window.checkSlider(1);
    button_for('K').click();
    expect(button_for('K')).toBeNull();
    const range = document.getElementById('RANGE_' + position('K'));
    expect(range).not.toBeNull();
    expect(range.value).toBe('1');
    expect(variable('K')).toBe(1);
  });

  test('the constant e never gets a button', () => {
    graphs()[0].bode_formula = 'e^(k_1*T_1)';
    window.checkSlider(1);
    expect(button_for('e')).toBeNull();
  });

  test.each([
    ['exp(-s)*k_1*T_1', ['x', 'p']],
    ['sqrt(s)*k_1*T_1', ['q', 'r', 't']],
    ['sin(s)*k_1*T_1', ['n']],
    ['abs(s)*tan(s)*k_1*T_1', ['a', 'b', 't', 'n']],
  ])('the letters of a function name are not variables: %s', (formula, letters) => {
    graphs()[0].bode_formula = formula;
    window.checkSlider(1);
    for (const letter of letters) expect(button_for(letter)).toBeNull();
  });

  test('a variable next to a function still gets its button', () => {
    graphs()[0].bode_formula = 'exp(-x)*k_1*T_1';
    window.checkSlider(1);
    expect(button_for('x')).not.toBeNull();
    expect(button_for('p')).toBeNull();
  });

  test('a half-typed formula leaves the buttons as they are until it parses again', () => {
    graphs()[0].bode_formula = 'k_1*T_1*K';
    window.checkSlider(1);
    graphs()[0].bode_formula = 'k_1*T_1*K/(';
    window.checkSlider(1);
    expect(button_for('K')).not.toBeNull();
    graphs()[0].bode_formula = 'k_1*T_1';
    window.checkSlider(1);
    expect(button_for('K')).toBeNull();
  });
});

describe('sliders of a new graph', () => {
  const custom = (formula) => ({ name: 'Custom', mf: 'x', formula });
  const slider_for = (name) => document.getElementById('RANGE_' + position(name));

  test('a variable next to a function name gets a slider, the letters of the name do not', () => {
    window.addNewGraph(null, custom('K*exp(-s)'));
    expect(slider_for('K')).not.toBeNull();
    expect(slider_for('x')).toBeNull();
    expect(slider_for('p')).toBeNull();
  });

  test('a formula that cannot be parsed gets no sliders', () => {
    window.addNewGraph(null, custom('K/('));
    expect(slider_for('K')).toBeNull();
  });
});

describe('formula_variables', () => {
  test('lists the variables of the alphabet, in the order they appear', () => {
    expect(window.formula_variables('T_2s*k_1')).toEqual(['T_2', 'k_1']);
  });

  test('leaves out s, i and function names, and keeps the constant e', () => {
    expect(window.formula_variables('e^(-s)+sqrt(i)')).toEqual(['e']);
  });

  test('is null for a formula that cannot be parsed', () => {
    expect(window.formula_variables('1/(')).toBeNull();
  });
});

describe('changeGraphDisplayStatus', () => {
  test('ignores a checkbox whose math field is not a known graph', () => {
    window.addNewGraph();
    const checkbox = document.querySelector('.show-graph');
    document.getElementById('1').id = '55';
    window.changeGraphDisplayStatus({ target: checkbox });
    expect(graphs()[0].bode_displaybool).toBe(true);
    expect(window.redraw).not.toHaveBeenCalled();
  });

  test('toggles only the graph that owns the checkbox', () => {
    window.addNewGraph();
    window.addNewGraph();
    window.changeGraphDisplayStatus({ target: document.querySelectorAll('.show-graph')[1] });
    expect(graphs().map((graph) => graph.bode_displaybool)).toEqual([true, false]);
  });
});

describe('removeGraph', () => {
  // The sliders that belong to each preset, as removed by removeGraph.
  test.each([
    ['GRAPH_ONE_REAL_POLE', ['k_1', 'T_1']],
    ['GRAPH_TWO_REAL_POLES', ['k_2', 'T_2', 'T_3']],
    ['GRAPH_TWO_COMPLEX_POLES', ['k_3', 'w', 'z']],
    ['GRAPH_TIME_DELAY', ['L']],
    ['GRAPH_ONE_ZERO_TWO_POLES', ['k_4', 'T_6', 'T_7', 'T_8']],
    ['GRAPH_FOUR_POLES', ['T_5', 'k_5']],
    ['GRAPH_ONE_ZERO', ['T_4']],
    ['GRAPH_PID', ['K', 'T_i', 'T_d']],
  ])('removing %s removes its sliders %j, its row and its tab', (name, variables) => {
    window.addNewGraph(null, { name: 'Plain', mf: 'x', formula: '1/(s+1)' }); // id 1, no sliders
    window.addNewGraph(null, preset(name));
    const id = global_value('id_bank');
    for (const variable_name of variables) expect(document.getElementById('RANGE_' + position(variable_name))).not.toBeNull();
    window.add_event.mockClear();

    window.removeGraph(id);

    expect(calls_of('add_event')).toEqual(['remove_graph']);
    for (const variable_name of variables) expect(document.getElementById('RANGE_' + position(variable_name))).toBeNull();
    expect(document.getElementById('delete-graph_' + id)).toBeNull();
    expect(document.getElementById(preset(name).name)).toBeNull();
    expect(document.getElementById('graph_' + id + '_info')).toBeNull();
    expect(document.getElementById('graph_' + id + '_infolabel')).toBeNull();
    expect(graphs().map((graph) => graph.bode_id)).toEqual([1]);
    // The first graph is untouched.
    expect(document.getElementById('delete-graph_1')).not.toBeNull();
  });

  test('removing a graph with no variable sliders only removes the graph', () => {
    window.addNewGraph(null, preset('GRAPH_ONE_POLE_WITH_PID_S'));
    window.addNewGraph(null, preset('GRAPH_PID'));
    window.removeGraph(1);
    expect(graphs().map((graph) => graph.bode_id)).toEqual([2]);
    expect(document.getElementById('RANGE_' + position('K'))).not.toBeNull();
  });

  test('removing a custom graph keeps all sliders', () => {
    window.addNewGraph(null, preset('GRAPH_ONE_REAL_POLE'));
    window.addNewGraph();
    window.addNewGraph(null, { name: 'Mine', mf: 'x', formula: '1/(s+1)' });
    window.removeGraph(3);
    expect(document.querySelectorAll('.slider-wrapper')).toHaveLength(5); // 2 for graph 1, 3 for graph 2
  });

  test('accepts the id as a string', () => {
    window.addNewGraph();
    window.addNewGraph();
    window.removeGraph('2');
    expect(graphs().map((graph) => graph.bode_id)).toEqual([1]);
  });

  // BUG: removeGraph removes `tbody` (the 3rd parent of the range input), not the .slider-wrapper
  // div, so every deleted graph leaves empty `<div class="slider-wrapper"><table></table></div>` behind.
  test('removes the slider wrapper elements of the sliders that it deletes', () => {
    window.addNewGraph(null, preset('GRAPH_ONE_REAL_POLE'));
    window.removeGraph(1);
    expect(document.querySelectorAll('.slider-wrapper')).toHaveLength(0);
  });

  // BUG: removeGraph writes UNSET to range_slider_variables[linked_id] (the graph id, which is an
  // unrelated variable slot) instead of the slots of the deleted sliders. The variables keep their
  // old values, so checkSlider never offers a "+" button for them again (it needs the value UNSET).
  test('forgets the values of the sliders that it deletes', () => {
    window.addNewGraph(null, preset('GRAPH_ONE_REAL_POLE'));
    window.addNewGraph(null, preset('GRAPH_TWO_REAL_POLES'));
    window.removeGraph(1);
    expect(variable('k_1')).toBe(UNSET);
    expect(variable('T_1')).toBe(UNSET);
  });
});

describe('updateAfterRemoveGraph', () => {
  test('checks the sliders of, and recalculates, every remaining graph and redraws once', () => {
    window.addNewGraph();
    window.addNewGraph();
    graphs()[1].bode_formula = 'k_2*K';
    window.redraw_canvas_gain.mockClear();

    window.updateAfterRemoveGraph();

    expect(calls_of('redraw_canvas_gain')).toEqual([1, 2]);
    expect(window.redraw).toHaveBeenCalledTimes(1);
    expect(document.getElementById('BTNS_2_' + position('K'))).not.toBeNull();
  });

  test('with no graphs it only redraws', () => {
    window.updateAfterRemoveGraph();
    expect(window.redraw_canvas_gain).not.toHaveBeenCalled();
    expect(window.redraw).toHaveBeenCalledTimes(1);
  });

  test('is what the delete button runs after removeGraph', () => {
    window.addNewGraph();
    window.addNewGraph();
    window.redraw_canvas_gain.mockClear();
    document.getElementById('delete-graph_1').click(); // jsdom runs the inline onclick handler
    expect(graphs().map((graph) => graph.bode_id)).toEqual([2]);
    expect(calls_of('redraw_canvas_gain')).toEqual([2]);
  });
});

describe('removeAllGraphs', () => {
  test('removes every graph row, slider and tab and resets the input signal', () => {
    for (let i = 0; i < 4; i++) window.addNewGraph();
    set_globals({ input_formula: '1' });
    document.getElementById('input-choices').value = 'Impulse';

    window.removeAllGraphs();

    expect(graphs()).toEqual([]);
    expect(document.querySelectorAll('.delete-graph')).toHaveLength(0);
    expect(document.querySelectorAll('.range-slider')).toHaveLength(0);
    expect(document.querySelector('.graph-information-tabs').children).toHaveLength(0);
    expect(calls_of('add_event')).toEqual(expect.arrayContaining(['remove_graph']));
    expect(window.redraw).toHaveBeenCalledTimes(1);
    expect(global_value('id_bank')).toBe(1);
    expect(global_value('input_formula')).toBe('1/s');
    expect(document.getElementById('input-formula').value).toBe('\\frac{1}{s}');
    expect(document.getElementById('input-choices').value).toBe('Unit step');
  });

  test('works with no graphs at all', () => {
    expect(() => window.removeAllGraphs()).not.toThrow();
    expect(graphs()).toEqual([]);
    expect(global_value('id_bank')).toBe(1);
  });

  test('graphs can be added again afterwards', () => {
    window.addNewGraph();
    window.addNewGraph();
    window.removeAllGraphs();
    set_globals({ next_graph_no_to_add: 0, id_bank: 0 });
    window.addNewGraph();
    expect(graphs().map((graph) => graph.bode_id)).toEqual([1]);
    expect(document.querySelectorAll('.delete-graph')).toHaveLength(1);
  });
});

describe('updateInputFormula', () => {
  const event_with = (ascii) => ({ target: { getValue: jest.fn(() => ascii) } });

  test.each(['1/(s^2)', '(1)/(s⋅s)', '(1)/(s)⋅(1)/(s)', '(1)/(s)(1)/(s)', '1/(s*s)'])('the ramp %s completes set_input_to_ramp', (ascii) => {
    const event = event_with(ascii);
    window.updateInputFormula(event);
    expect(event.target.getValue).toHaveBeenCalledWith('ascii-math');
    expect(global_value('input_formula')).toBe(ascii);
    expect(calls_of('achievement_done')).toEqual(['set_input_to_ramp']);
    expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
  });

  test.each(['1/s', '1', '(1)/(s^3)', '(1)/(s)'])('%s is not a ramp but still recalculates', (ascii) => {
    window.updateInputFormula(event_with(ascii));
    expect(global_value('input_formula')).toBe(ascii);
    expect(window.achievement_done).not.toHaveBeenCalled();
    expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
  });
});

// ---------------------------------------------------------------------------
// Cases added after Stryker mutation testing (npm run test:mutation) showed that no test noticed
// these changes to src/graph_ui.js.
describe('mutation gaps: default_variable_values', () => {
  test('every slider variable has its range and start value', () => {
    expect(global_value('default_variable_values')).toEqual({
      L: { min: 0, max: 3, value: 0 },
      k_1: { min: -4, max: 20, value: 4 },
      k_2: { min: -4, max: 20, value: 2 },
      k_3: { min: -4, max: 20, value: 0.7 },
      k_4: { min: -4, max: 20, value: 2.5 },
      k_5: { min: -4, max: 20, value: 1 },
      z: { min: 0, max: 1.2, value: 0.2 },
      T_1: { min: -5, max: 10, value: 0.6 },
      T_2: { min: 0, max: 10, value: 0.6 },
      T_3: { min: 0, max: 10, value: 2 },
      T_4: { min: 0, max: 10, value: 1 },
      T_5: { min: 0, max: 10, value: 1 },
      T_6: { min: 0, max: 10, value: 1.5 },
      T_7: { min: 0, max: 10, value: 1.1 },
      T_8: { min: -10, max: 10, value: 0.7 },
      T_d: { min: 0, max: 10, value: 0 },
      T_i: { min: 0.01, max: 10, value: 1 },
      K: { min: 0.01, max: 10, value: 1 },
      q: { min: 0.01, max: 1, value: 0.1 },
      v: { min: 0.1, max: 20, value: 4.5 },
    });
  });

  test('a slider starts at the range and value of its variable', () => {
    for (const [name, { min, max, value }] of Object.entries(global_value('default_variable_values'))) {
      const slider = make_slider(name);
      expect([name, +slider.range.min, +slider.range.max, +slider.range.value]).toEqual([name, min, max, value]);
    }
  });
});

describe('mutation gaps: sliders only trigger the achievements and tasks of their own variable', () => {
  beforeEach(add_info_tabs);

  test('a negative value completes T1_unstable only for T_1 (release of the slider)', () => {
    drag(make_slider('k_1'), -1, 'change');
    expect(calls_of('task_done')).not.toContain('T1_unstable');
  });

  test('a negative value completes T1_unstable only for T_1 (end of typing)', () => {
    type_into(make_slider('k_1'), -1, 'change');
    expect(calls_of('task_done')).not.toContain('T1_unstable');
  });

  test('a low value completes low_z only for z (dragging)', () => {
    drag(make_slider('T_2'), 0.05);
    drag(make_slider('K'), 0.05);
    expect(calls_of('achievement_done')).not.toContain('low_z');
  });

  test('far apart T_2 and T_3 only complete T2_T3_far_apart when a T slider is moved', () => {
    set_variable({ T_2: 1000, T_3: 1 });
    drag(make_slider('K'), 2);
    type_into(make_slider('q'), 0.5);
    expect(calls_of('achievement_done')).toEqual([]);
  });

  test('a value of 100 or more only completes k_above_or_equal_100 for a k variable (typing)', () => {
    const slider = make_slider('K');
    type_into(slider, 150);
    expect(calls_of('achievement_done')).toEqual([]);
    type_into(make_slider('k_3'), 150);
    expect(calls_of('achievement_done')).toEqual(['k_above_or_equal_100']);
  });

  // Tab 1 is selected when the tabs are created, so the move has to start from another tab.
  test.each([
    ['k_1', 1], ['T_1', 1], ['k_2', 2], ['T_2', 2], ['T_3', 2], ['w', 3], ['z', 3], ['k_3', 3],
    ['L', 4], ['k_4', 5], ['T_6', 5], ['T_7', 5], ['T_8', 5], ['k_5', 6], ['T_5', 6], ['T_4', 7],
  ])('moving %s switches from another tab to information tab %i', (name, tab) => {
    use_seven_presets();
    const other = tab === 7 ? 6 : 7;
    document.getElementById('graph_' + other + '_info').checked = true;
    const slider = make_slider(name);
    drag(slider, +slider.range.value + 0.5);
    expect(tab_checked(tab)).toBe(true);
    expect(tab_checked(other)).toBe(false);
  });
});
