// More tests for src/assignments.js: toggling and showing the assignments window, task_done's
// side effects (sound, popup, answer text), reset_task, the task list written by update_tasks
// (to-do/done lists, the grade badge thresholds), update_assignments, remove_all_windows,
// restart_lupze and select_assignment (which graphs, ghosts and sliders an assignment creates).
// tests/assignments.test.js covers the task checks, the progress messages and the PID markers.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = ['add_event', 'play_jingle', 'achievement_done', 'show_answer_to_task', 'redraw_canvas_gain'];
const originals = {};

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
  originals.addNewGraph = window.addNewGraph;
  const alphabet = global_value('range_slider_alphabet');
  const variable_position = global_value('variable_position');
  alphabet.forEach((name, i) => { variable_position[name] = i; });
});

const UNSET = 18012001; // range_slider_variables marks a variable without a slider with this value.

// Removes everything a previous test added to the page: graphs, sliders and information tabs.
function reset_dom() {
  document.querySelectorAll('.slider-wrapper').forEach((slider) => slider.remove());
  document.querySelectorAll('.equation-wrapper').forEach((wrapper, i) => { if (i > 0) wrapper.remove(); });
  document.querySelector('.graph-information-tabs').innerHTML = '';
}

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  set_globals({
    assignments_enabled: true, current_assignment: 'none', done_tasks: [], quiz_is_running: 0,
    sound_enabled: false, improvement_enabled: false, assignment_grade: 0, bode_graphs: [],
    we_need_faster_calculations_right_now: false, current_quiz: 'none', id_bank: 1,
    next_graph_no_to_add: 0, feedback_is_visible: 0, precision: 4, input_formula: '1/s',
  });
  global_value('range_slider_variables').fill(UNSET, 1);
  reset_dom();
  document.getElementById('task_list').innerHTML = '';
  document.getElementById('assignments_box').innerHTML = '';
  document.getElementById('assignments_box').classList.remove('active');
  document.getElementById('assignment_0').src = 'images/assignment_0.webp';
  document.getElementById('assignment_0_text').innerHTML = '';
  window.mouseX = 0;
  window.mouseY = 0;
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
  window.addNewGraph = originals.addNewGraph;
  jest.useRealTimers();
});

const done = () => global_value('done_tasks');
const events = () => window.add_event.mock.calls.map((args) => args[0]);
const task_list = () => document.getElementById('task_list');
const all_assignments = () => global_value('all_assignments');
const all_tasks = () => global_value('all_tasks');
const graphs = () => global_value('bode_graphs');
const by_name = (name) => graphs().find((graph) => graph.graph_name === name);

describe('toggle_assignments', () => {
  test('the first call enables assignments and shows the menu icon, the second hides it again', () => {
    set_globals({ assignments_enabled: false });
    const icon = document.getElementById('show_assignments');
    icon.style.display = 'none';

    window.toggle_assignments();
    expect(global_value('assignments_enabled')).toBe(true);
    expect(icon.style.display).toBe('inline');

    window.toggle_assignments();
    expect(global_value('assignments_enabled')).toBe(false);
    expect(icon.style.display).toBe('none');
  });
});

describe('view_assignments and hide_assignments', () => {
  test('view_assignments logs, awards the achievement, closes other windows and lists the assignments', () => {
    document.querySelector('.toolbox').classList.add('active');
    window.view_assignments();
    expect(events()).toEqual(['view_assignments']);
    expect(window.achievement_done.mock.calls).toEqual([['view_assignments']]);
    expect(document.querySelector('.toolbox').classList.contains('active')).toBe(false);
    const box = document.querySelector('.assignments_box');
    expect(box.classList.contains('active')).toBe(true);
    expect(box.querySelectorAll('input[name=assignment]')).toHaveLength(Object.keys(all_assignments()).length);
  });

  test('hide_assignments logs and closes every window including the assignments box', () => {
    document.querySelector('.assignments_box').classList.add('active');
    window.hide_assignments();
    expect(events()).toEqual(['hide_assignments']);
    expect(document.querySelector('.assignments_box').classList.contains('active')).toBe(false);
  });
});

describe('remove_all_windows', () => {
  test.each(['.quiz_intro', '.quiz_highscores', '.feedback', '.toolbox', '.info', '.achievements_box', '.assignments_box'])(
    'removes the active class from %s', (selector) => {
      const element = document.querySelector(selector);
      element.classList.add('active');
      window.remove_all_windows();
      expect(element.classList.contains('active')).toBe(false);
    });
});

describe('task_done', () => {
  const TASK = 'T1=2'; // a task of one_pole with an answer text
  beforeEach(() => set_globals({ current_assignment: 'one_pole' }));

  test('a new task is logged, stored, shown in the popup and listed as completed', () => {
    window.mouseX = 0.5 * window.windowWidth;
    window.mouseY = 0.5 * window.windowHeight;
    window.task_done(TASK);
    expect(done()).toEqual([TASK]);
    expect(events()).toEqual(['task_done=' + TASK]);
    expect(document.getElementById('achievement_text').innerHTML).toBe(all_tasks()[TASK].t);
    const popup = document.querySelector('.achievement_text').style;
    expect(popup.getPropertyValue('--left')).toBe('50%');
    expect(popup.getPropertyValue('--top')).toBe('50%');
    const star = document.querySelector('.assignment_star').style;
    expect(star.getPropertyValue('--left')).toBe('50%');
    expect(document.getElementById('achievement_text').style.animation).toContain('MoveToStar4');
    expect(document.getElementById('assignment_star').style.animation).toContain('MoveToStar3');
    expect(document.getElementById('show_assignments').style.animation).toContain('MenuAssignment');
    expect(task_list().querySelector('input[checked]')).not.toBeNull();
    expect(document.getElementById('assignment_0_text').textContent).toContain('1/' + Object.keys(all_tasks()).length);
  });

  test('a task with an answer text shows that text', () => {
    window.task_done(TASK);
    expect(window.show_answer_to_task.mock.calls).toEqual([[TASK]]);
  });

  test('a task without an answer text does not', () => {
    set_globals({ current_assignment: 'pid_controller' });
    window.task_done('pid_help_PID');
    expect(done()).toEqual(['pid_help_PID']);
    expect(window.show_answer_to_task).not.toHaveBeenCalled();
  });

  test('the left edge of the popup is limited to 85 percent', () => {
    window.mouseX = 0.99 * window.windowWidth;
    window.task_done(TASK);
    expect(document.querySelector('.achievement_text').style.getPropertyValue('--left')).toBe('85%');
  });

  test('the top edge of the popup is limited to 90 percent', () => {
    window.mouseY = 0.95 * window.windowHeight;
    window.task_done(TASK);
    expect(document.querySelector('.achievement_text').style.getPropertyValue('--top')).toBe('90%');
  });

  test('the jingle plays only when sound is enabled', () => {
    window.task_done(TASK);
    expect(window.play_jingle).not.toHaveBeenCalled();
    set_globals({ sound_enabled: true });
    window.task_done('k1=2.9');
    expect(window.play_jingle).toHaveBeenCalledTimes(1);
  });

  test('the jingle is silent while the audio is still to be initialised (sound_enabled 1, and 1 == true)', () => {
    set_globals({ sound_enabled: 1 });
    window.task_done(TASK);
    expect(window.play_jingle).not.toHaveBeenCalled();
  });

  test('a task that is already done is ignored', () => {
    set_globals({ done_tasks: [TASK] });
    window.task_done(TASK);
    expect(done()).toEqual([TASK]);
    expect(events()).toEqual([]);
    expect(window.show_answer_to_task).not.toHaveBeenCalled();
  });

  test('a task of another assignment is ignored', () => {
    window.task_done('phasemargin=55');
    expect(done()).toEqual([]);
    expect(events()).toEqual([]);
  });

  test('nothing happens while a quiz runs', () => {
    set_globals({ quiz_is_running: 1 });
    window.task_done(TASK);
    expect(done()).toEqual([]);
  });

  test('nothing happens when assignments are disabled', () => {
    set_globals({ assignments_enabled: false });
    window.task_done(TASK);
    expect(done()).toEqual([]);
  });
});

describe('reset_task', () => {
  test('removes only that task from the done tasks and rewrites the task list', () => {
    set_globals({ current_assignment: 'one_pole', done_tasks: ['T1=2', 'k1=2.9', 'T1_unstable'] });
    window.reset_task('k1=2.9');
    expect(done()).toEqual(['T1=2', 'T1_unstable']);
    expect(task_list().textContent).toContain('2/5');
    const checked_ids = [...task_list().querySelectorAll('input[checked] + span')].map((span) => span.id);
    expect(checked_ids).toEqual(['task_T1=2', 'task_T1_unstable']);
  });

  test('a task that is not done leaves the list unchanged', () => {
    set_globals({ current_assignment: 'one_pole', done_tasks: ['T1=2'] });
    window.reset_task('L=3');
    expect(done()).toEqual(['T1=2']);
    expect(task_list().textContent).toContain('1/5');
  });

  test('clicking the checkbox of a completed task un-does it', () => {
    set_globals({ current_assignment: 'one_pole', done_tasks: ['T1=2'] });
    window.update_tasks();
    task_list().querySelector('input[checked]').click();
    expect(done()).toEqual([]);
    expect(task_list().querySelectorAll('input[checked]')).toHaveLength(0);
  });
});

describe('update_tasks', () => {
  test('with no assignment it offers to add the next graph and does not touch the badge', () => {
    set_globals({ current_assignment: 'none', done_tasks: Object.keys(all_tasks()) });
    window.update_tasks();
    expect(task_list().textContent).toContain('to add next graph');
    expect(task_list().querySelector('span[onclick="addNewGraph();"]')).not.toBeNull();
    expect(global_value('assignment_grade')).toBe(0);
    expect(document.getElementById('assignment_0_text').innerHTML).toBe('');
  });

  test('with nothing done every task of the assignment is a to-do with an empty checkbox', () => {
    set_globals({ current_assignment: 'one_pole' });
    window.update_tasks();
    const expected = all_assignments().one_pole.tasks;
    const boxes = [...task_list().querySelectorAll('input[type=checkbox]')];
    expect(boxes).toHaveLength(expected.length);
    expect(boxes.every((box) => !box.hasAttribute('checked'))).toBe(true);
    // Tasks are listed in the order of all_tasks, not of the assignment.
    expect([...task_list().querySelectorAll('span[id^=task_]')].map((span) => span.id))
      .toEqual(Object.keys(all_tasks()).filter((id) => expected.includes(id)).map((id) => 'task_' + id));
    expect(task_list().textContent).toContain('Your tasks in this assignment:');
    expect(task_list().textContent).toContain('0/5 done so far.');
    expect(task_list().innerHTML).toContain(all_assignments().one_pole.info);
    expect(task_list().querySelector('center b').innerHTML).toBe(all_assignments().one_pole.t);
  });

  test('done tasks move to the completed list with a checked checkbox', () => {
    set_globals({ current_assignment: 'one_pole', done_tasks: ['T1=2', 'T1_unstable'] });
    window.update_tasks();
    const html = task_list().innerHTML;
    expect(html.indexOf('Your tasks in this assignment')).toBeLessThan(html.indexOf('Completed tasks'));
    expect(task_list().querySelectorAll('input[checked]')).toHaveLength(2);
    expect(task_list().querySelectorAll('input:not([checked])')).toHaveLength(3);
    expect(task_list().textContent).toContain('2/5 done so far.');
    expect(task_list().querySelector('.clickable-link')).toBeNull();
  });

  test('tasks of other assignments are not listed, but do count in the badge total', () => {
    set_globals({ current_assignment: 'one_pole', done_tasks: ['phasemargin=55'] });
    window.update_tasks();
    expect(task_list().querySelector('[id="task_phasemargin=55"]')).toBeNull();
    expect(task_list().textContent).toContain('0/5 done so far.');
    expect(document.getElementById('assignment_0_text').textContent).toContain('1/' + Object.keys(all_tasks()).length);
  });

  test('a finished assignment shows the finish link and no to-do list', () => {
    set_globals({ current_assignment: 'time_delay', done_tasks: all_assignments().time_delay.tasks });
    window.update_tasks();
    expect(task_list().textContent).toContain("You're done with this assignment!");
    expect(task_list().textContent).not.toContain('Your tasks in this assignment');
    expect(task_list().textContent).not.toContain('done so far');
    expect(task_list().querySelectorAll('input[checked]')).toHaveLength(2);
  });

  test('the checkbox of a to-do task is inert', () => {
    set_globals({ current_assignment: 'time_delay' });
    window.update_tasks();
    const box = task_list().querySelector('input[type=checkbox]');
    expect(box.getAttribute('onclick')).toBe('return false;');
    box.click();
    expect(box.checked).toBe(false);
  });

  describe('the badge grade follows the share of all tasks done', () => {
    // With the real 30 tasks no count lands exactly on 15, 50 or 98 percent, so pad all_tasks with
    // dummy tasks up to 100 and test on the thresholds themselves.
    const PADDING = [];
    beforeEach(() => {
      for (let i = Object.keys(all_tasks()).length; i < 100; i++) {
        all_tasks()['padding_' + i] = { t: 'padding' };
        PADDING.push('padding_' + i);
      }
    });
    afterEach(() => { while (PADDING.length) delete all_tasks()[PADDING.pop()]; });
    const first_tasks = (count) => Object.keys(all_tasks()).slice(0, count);

    test.each([
      [14, 0], [15, 1], [16, 1], [49, 1], [50, 2], [51, 2], [97, 2], [98, 3], [99, 3], [100, 3],
    ])('%i of 100 tasks done gives grade %i', (count, grade) => {
      expect(Object.keys(all_tasks())).toHaveLength(100);
      set_globals({ current_assignment: 'one_pole', done_tasks: first_tasks(count) });
      window.update_tasks();
      expect(global_value('assignment_grade')).toBe(grade);
      expect(document.getElementById('assignment_0').getAttribute('src')).toBe('images/assignment_' + grade + '.webp');
    });

    test('5 of the real 30 tasks is 16.7 percent, bronze', () => {
      for (const id of PADDING.splice(0)) delete all_tasks()[id];
      set_globals({ current_assignment: 'one_pole', done_tasks: first_tasks(5) });
      window.update_tasks();
      expect(global_value('assignment_grade')).toBe(1);
    });

    test('the badge image and its animation are only touched when the grade changes', () => {
      set_globals({ current_assignment: 'one_pole', done_tasks: first_tasks(15) });
      window.update_tasks();
      const badge = document.getElementById('assignment_0');
      expect(badge.style.animation).toContain('new_badge_anim');
      badge.style.animation = 'none';
      window.update_tasks();
      expect(badge.style.animation).toBe('none');
    });

    test('the grade can also go down again', () => {
      set_globals({ current_assignment: 'one_pole', assignment_grade: 3, done_tasks: [] });
      window.update_tasks();
      expect(global_value('assignment_grade')).toBe(0);
      expect(document.getElementById('assignment_0').getAttribute('src')).toBe('images/assignment_0.webp');
    });
  });
});

describe('update_assignments', () => {
  const ids = (selector) => [...document.querySelectorAll(selector)].map((input) => input.id);

  test('lists every unfinished assignment as a radio button with its long name', () => {
    window.update_assignments();
    const box = document.querySelector('.assignments_box');
    expect(ids('.assignments_box input[name=assignment]')).toEqual(Object.keys(all_assignments()));
    expect(box.querySelector('label[for=one_pole]').innerHTML).toContain(all_assignments().one_pole.t);
    expect(box.querySelector('input#one_pole').getAttribute('onchange')).toBe('select_assignment(this);');
    expect(box.textContent).not.toContain('Completed assignments:');
    expect(box.querySelector('button.close-window').getAttribute('onclick')).toBe('hide_assignments();');
    expect(box.querySelector('img').getAttribute('src')).toBe('images/explorers_1024.webp');
  });

  test('the current assignment is checked', () => {
    set_globals({ current_assignment: 'four_poles' });
    window.update_assignments();
    const checked = [...document.querySelectorAll('.assignments_box input:checked')].map((input) => input.value);
    expect(checked).toEqual(['four_poles']);
  });

  test('a finished assignment moves under "Completed assignments"', () => {
    set_globals({ done_tasks: all_assignments().time_delay.tasks });
    window.update_assignments();
    expect(document.querySelector('.assignments_box').textContent).toContain('Completed assignments:');
    // Unfinished assignments come first in their usual order, the finished one is listed last, once.
    const order = ids('.assignments_box input[name=assignment]');
    expect(order[order.length - 1]).toBe('time_delay');
    expect(order.filter((id) => id === 'time_delay')).toHaveLength(1);
    expect(order).toHaveLength(Object.keys(all_assignments()).length);
  });

  test('a finished current assignment is checked in the completed list', () => {
    set_globals({ current_assignment: 'time_delay', done_tasks: all_assignments().time_delay.tasks });
    window.update_assignments();
    expect(document.querySelector('.assignments_box input#time_delay').checked).toBe(true);
  });

  test('an assignment with one task missing is not finished', () => {
    set_globals({ done_tasks: ['L=3'] });
    window.update_assignments();
    expect(document.querySelector('.assignments_box').textContent).toContain('0/8 done so far.');
    expect(global_value('done_assignments').time_delay).toBe(1);
    expect(global_value('nof_assignments_done')).toBe(0);
  });

  test('the done counters per assignment add up the done tasks', () => {
    set_globals({ done_tasks: ['T1=2', 'phasemargin=55', 'phasemargin=45', 'L=3'] });
    window.update_assignments();
    const counters = global_value('done_assignments');
    expect(counters.one_pole).toBe(1);
    expect(counters.two_real_poles).toBe(1);
    expect(counters.four_poles).toBe(1);
    expect(counters.time_delay).toBe(1);
    expect(counters.none).toBe(0);
  });
});

describe('restart_lupze', () => {
  test('logs and resets quiz, assignment, windows, icons and the four startup graphs', () => {
    set_globals({ current_assignment: 'one_pole', current_quiz: 'bode', quiz_is_running: 3, feedback_is_visible: 1 });
    document.getElementById('quiz_text').innerHTML = 'Question!';
    document.getElementById('quiz_icon_svg').style.fill = '#ff0000';
    document.getElementById('assignment_icon_svg').style.fill = '#5050ff';
    document.getElementById('questions_div').innerHTML = '<b>help</b>';
    document.querySelector('.assignments_box').classList.add('active');

    window.restart_lupze();

    expect(events()[0]).toBe('restart_lupze');
    expect(global_value('questions_enabled')).toBe(false);
    expect(document.getElementById('questions_div').innerHTML).toBe('');
    expect(document.getElementById('quiz_text').innerHTML).toBe('');
    expect(global_value('current_quiz')).toBe('none');
    expect(document.getElementById('quiz_icon_svg').style.fill).toBe('');
    expect(document.getElementById('assignment_icon_svg').style.fill).toBe('');
    expect(global_value('current_assignment')).toBe('none');
    expect(document.querySelector('.assignments_box').classList.contains('active')).toBe(false);
    expect(global_value('quiz_is_running')).toBe(0);
    expect(global_value('feedback_is_visible')).toBe(0);
    expect(task_list().textContent).toContain('to add next graph');
    expect(graphs().map((graph) => graph.graph_name)).toEqual(global_value('GRAPH_ORDER').slice(0, 4).map((graph) => graph.name));
    expect(global_value('next_graph_no_to_add')).toBe(global_value('NOF_GRAPHS_AT_STARTUP'));
  });

  test('graphs from before the restart are removed and numbering starts again at 1', () => {
    window.addNewGraph();
    window.addNewGraph();
    window.addNewGraph();
    window.addNewGraph();
    window.addNewGraph();
    window.addNewGraph();
    const old_ids = graphs().map((graph) => graph.bode_id);
    expect(old_ids).toEqual([2, 3, 4, 5, 6, 7]);
    window.restart_lupze();
    expect(graphs().map((graph) => graph.bode_id)).toEqual([1, 2, 3, 4]);
    expect(document.querySelectorAll('.equation-wrapper .equation')).toHaveLength(4);
  });

  test('addNewGraph is called with the first four presets', () => {
    window.addNewGraph = jest.fn();
    window.restart_lupze();
    expect(window.addNewGraph.mock.calls).toEqual(global_value('GRAPH_ORDER').slice(0, 4).map((graph) => [null, graph]));
  });
});

describe('select_assignment', () => {
  const select = (value) => window.select_assignment({ value });

  test('selecting "none" restores the four startup graphs and the plain icon', () => {
    set_globals({ current_assignment: 'one_pole' });
    document.getElementById('assignment_icon_svg').style.fill = '#5050ff';
    select('none');
    expect(events()).toContain('select_assignment=none');
    expect(global_value('current_assignment')).toBe('none');
    expect(graphs().map((graph) => graph.graph_name)).toEqual(global_value('GRAPH_ORDER').slice(0, 4).map((graph) => graph.name));
    expect(global_value('next_graph_no_to_add')).toBe(4);
    expect(document.getElementById('assignment_icon_svg').style.fill).toBe('');
    expect(window.redraw_canvas_gain).not.toHaveBeenCalledWith('all');
    expect(task_list().textContent).toContain('to add next graph');
  });

  test('stops a running quiz, closes the assignments box and colours the icon', () => {
    set_globals({ current_quiz: 'bode' });
    document.getElementById('quiz_text').innerHTML = 'Question!';
    document.getElementById('quiz_icon_svg').style.fill = '#ff0000';
    document.querySelector('.assignments_box').classList.add('active');
    select('one_pole');
    expect(events()[0]).toBe('select_assignment=one_pole');
    expect(global_value('current_quiz')).toBe('none');
    expect(document.getElementById('quiz_text').innerHTML).toBe('');
    expect(document.getElementById('quiz_icon_svg').style.fill).toBe('');
    expect(document.querySelector('.assignments_box').classList.contains('active')).toBe(false);
    expect(document.getElementById('assignment_icon_svg').style.fill).toBe('#5050ff');
  });

  test('the task list is rewritten for the new assignment and the old graphs are gone', () => {
    window.addNewGraph();
    window.addNewGraph();
    select('time_delay');
    expect(global_value('current_assignment')).toBe('time_delay');
    expect(task_list().querySelector('center b').innerHTML).toBe(all_assignments().time_delay.t);
    expect(graphs().map((graph) => graph.graph_name)).toEqual([global_value('GRAPH_ORDER')[3].name]);
  });

  // The main graph of each assignment is the preset at this position of GRAPH_ORDER.
  test.each([
    ['one_pole', 0], ['two_real_poles', 1], ['two_complex_poles', 2], ['time_delay', 3],
    ['one_zero_two_poles', 4], ['four_poles', 5], ['pid_controller', 0], ['pid_controller_YL', 0],
  ])('%s starts with GRAPH_ORDER[%i] as its main graph', (assignment, index) => {
    select(assignment);
    const main = graphs()[0];
    expect(main.graph_name).toBe(global_value('GRAPH_ORDER')[index].name);
    expect(main.bode_formula).toBe(global_value('GRAPH_ORDER')[index].formula);
    // The main graph gets bode_id = index + 1 (the id_bank colour), and its information tab is selected.
    expect(main.bode_id).toBe(index + 1);
    expect(document.getElementById('graph_' + (index + 1) + '_info').checked).toBe(true);
    expect(window.redraw_canvas_gain).toHaveBeenLastCalledWith('all');
  });

  test('assignments without ghost graphs only create the main graph', () => {
    for (const assignment of ['time_delay', 'four_poles']) {
      select(assignment);
      expect(graphs()).toHaveLength(1);
    }
  });

  describe('ghost graphs', () => {
    test('one_pole adds one reference step response', () => {
      select('one_pole');
      expect(graphs()).toHaveLength(2);
      const ghost = graphs()[1];
      expect(ghost.graph_name).toBe('Match this response');
      expect(ghost.bode_formula).toBe('(0.65)/((1+2s))');
      expect(ghost.bode_display_timeresponse_bool).toBe(true);
      expect(ghost.bode_display_bodemag_bool).toBe(false);
      expect(ghost.bode_display_bodephase_bool).toBe(false);
      expect(ghost.bode_display_nyquist_bool).toBe(false);
      expect(ghost.bode_display_information_bool).toBe(false);
      expect(ghost.bode_display_equation_bool).toBe(false);
      expect(ghost.bode_display_pole_zero_bool).toBe(false);
      // No tab for a ghost: only the main graph has one.
      expect(document.querySelectorAll('.graph-information-tabs input')).toHaveLength(1);
    });

    test('two_real_poles adds a step reference and a Bode phase reference', () => {
      select('two_real_poles');
      expect(graphs()).toHaveLength(3);
      const [step, phase] = [by_name('Match this response'), by_name('Match this Bode phase')];
      expect(step.bode_formula).toBe('0.5/(1+2s+s^2)');
      expect([step.bode_display_timeresponse_bool, step.bode_display_bodephase_bool]).toEqual([true, false]);
      expect(phase.bode_formula).toBe('1/(1+5s)*1/(1+0.05s)');
      expect([phase.bode_display_bodephase_bool, phase.bode_display_bodemag_bool, phase.bode_display_timeresponse_bool])
        .toEqual([true, false, false]);
    });

    test('two_complex_poles adds a Bode reference (magnitude and phase) and a step reference', () => {
      select('two_complex_poles');
      expect(graphs()).toHaveLength(3);
      const bode = by_name('Match this Bode');
      const step = by_name('Match this response');
      expect(bode.bode_formula).toBe('8^2/(s^2+2*0.05*8*s+8^2)');
      expect([bode.bode_display_bodemag_bool, bode.bode_display_bodephase_bool, bode.bode_display_timeresponse_bool])
        .toEqual([true, true, false]);
      expect(step.bode_formula).toBe('0.7*2^2/(s^2+2*0.7*2*s+2^2)');
      expect(step.bode_display_timeresponse_bool).toBe(true);
    });

    test('one_zero_two_poles adds Nyquist, Bode and step references', () => {
      select('one_zero_two_poles');
      expect(graphs()).toHaveLength(4);
      const nyquist = by_name('Match this Nyquist');
      const bode = by_name('Match this Bode');
      const step = by_name('Match this response');
      expect(nyquist.bode_formula).toBe('(1+6s)/(1+2.5s)*1/(1+s)');
      expect([nyquist.bode_display_nyquist_bool, nyquist.bode_display_bodemag_bool]).toEqual([true, false]);
      expect(bode.bode_formula).toBe('0.75(1+2s)/(1+9.25s)*1/(1+0.5s)');
      expect([bode.bode_display_bodemag_bool, bode.bode_display_bodephase_bool, bode.bode_display_nyquist_bool])
        .toEqual([true, true, false]);
      expect(step.bode_formula).toBe('(1-1.5s)/(1+s)*1/(1+s)');
      expect(step.bode_display_timeresponse_bool).toBe(true);
    });

    test('the ghost graphs get no pole-zero map, the main graph keeps it', () => {
      select('one_zero_two_poles');
      expect(graphs().map((graph) => graph.bode_display_pole_zero_bool)).toEqual([true, false, false, false]);
    });

    test('the ghosts get consecutive ids after the main graph', () => {
      select('two_complex_poles');
      expect(graphs().map((graph) => graph.bode_id)).toEqual([3, 4, 5]);
    });
  });

  describe('PID assignments', () => {
    test('pid_controller adds the PID controller and the closed-loop response, with their display flags', () => {
      select('pid_controller');
      // The main graph (GRAPH_ORDER[0]) plus the two PID graphs.
      expect(graphs().map((graph) => graph.graph_name)).toEqual([
        global_value('GRAPH_ORDER')[0].name, global_value('GRAPH_PID').name, global_value('GRAPH_ONE_POLE_WITH_PID_YR').name,
      ]);
      const [, pid, yr] = graphs();
      // PID_CONTROLLER_VIEWS: magnitude, phase and equation only.
      expect([pid.bode_display_bodemag_bool, pid.bode_display_bodephase_bool, pid.bode_display_timeresponse_bool,
        pid.bode_display_nyquist_bool, pid.bode_display_information_bool, pid.bode_display_equation_bool])
        .toEqual([true, true, false, false, false, true]);
      // CLOSED_LOOP_VIEWS: adds the time response.
      expect([yr.bode_display_bodemag_bool, yr.bode_display_bodephase_bool, yr.bode_display_timeresponse_bool,
        yr.bode_display_nyquist_bool, yr.bode_display_information_bool, yr.bode_display_equation_bool])
        .toEqual([true, true, true, false, false, true]);
    });

    test('sliders are created for the variables of the main graph and the PID controller', () => {
      select('pid_controller');
      const variables = global_value('range_slider_variables');
      const position = global_value('variable_position');
      for (const name of ['T_1', 'k_1', 'K', 'T_i', 'T_d']) expect(variables[position[name]]).not.toBe(UNSET);
      expect(document.querySelectorAll('.slider-wrapper').length).toBeGreaterThanOrEqual(5);
    });

    test('the closed-loop graph gets no sliders of its own', () => {
      select('pid_controller');
      const yr_wrapper = document.getElementById(global_value('GRAPH_ONE_POLE_WITH_PID_YR').name).closest('.equation-wrapper');
      expect(yr_wrapper.querySelectorAll('.slider-wrapper')).toHaveLength(0);
    });

    test('pid_controller_YL also adds the load disturbance graph', () => {
      select('pid_controller_YL');
      expect(graphs().map((graph) => graph.graph_name)).toEqual([
        global_value('GRAPH_ORDER')[0].name, global_value('GRAPH_PID').name,
        global_value('GRAPH_ONE_POLE_WITH_PID_YR').name, global_value('GRAPH_ONE_POLE_WITH_PID_YL').name,
      ]);
      expect(graphs()[3].bode_display_timeresponse_bool).toBe(true);
      expect(graphs()[3].bode_display_nyquist_bool).toBe(false);
    });
  });

  describe('assignments that are not in all_assignments right now', () => {
    // pid_controller_S and pid_controller_OL are commented out of all_assignments, so
    // select_assignment cannot reach their branches. Register them for the duration of a test.
    const registered = [];
    function register(id) {
      all_assignments()[id] = { t: id, tasks: ['impossible_' + id], info: '' };
      registered.push(id);
    }
    afterEach(() => { while (registered.length) delete all_assignments()[registered.pop()]; });

    test('selecting an assignment that no longer exists throws in update_tasks', () => {
      expect(() => select('pid_controller_S')).toThrow(TypeError);
    });

    test('pid_controller_S would add the sensitivity function after the PID graphs', () => {
      register('pid_controller_S');
      select('pid_controller_S');
      expect(graphs().map((graph) => graph.graph_name)).toEqual([
        global_value('GRAPH_ORDER')[0].name, global_value('GRAPH_PID').name,
        global_value('GRAPH_ONE_POLE_WITH_PID_YR').name, global_value('GRAPH_ONE_POLE_WITH_PID_S').name,
      ]);
      const sensitivity = graphs()[3];
      // SENSITIVITY_VIEWS: magnitude, Nyquist and equation.
      expect([sensitivity.bode_display_bodemag_bool, sensitivity.bode_display_bodephase_bool,
        sensitivity.bode_display_timeresponse_bool, sensitivity.bode_display_nyquist_bool])
        .toEqual([true, false, false, true]);
    });

    test('pid_controller_OL would add S, YL and the open-loop graph', () => {
      register('pid_controller_OL');
      select('pid_controller_OL');
      expect(graphs().map((graph) => graph.graph_name)).toEqual([
        global_value('GRAPH_ORDER')[0].name, global_value('GRAPH_PID').name,
        global_value('GRAPH_ONE_POLE_WITH_PID_YR').name, global_value('GRAPH_ONE_POLE_WITH_PID_S').name,
        global_value('GRAPH_ONE_POLE_WITH_PID_YL').name, global_value('GRAPH_ONE_POLE_WITH_PID_OPEN').name,
      ]);
      // The open-loop graph shows no time response but does show information.
      const open = graphs()[5];
      expect([open.bode_display_timeresponse_bool, open.bode_display_nyquist_bool, open.bode_display_information_bool])
        .toEqual([false, true, true]);
    });

    test.each([
      ['pid_controller_S', ['GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_S']],
      ['pid_controller_OL', ['GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_YR', 'GRAPH_ONE_POLE_WITH_PID_S',
        'GRAPH_ONE_POLE_WITH_PID_YL', 'GRAPH_ONE_POLE_WITH_PID_OPEN']],
    ])('%s: every PID graph has its own display flags', (assignment, presets) => {
      register(assignment);
      select(assignment);
      expect(graphs().slice(1).map(flags)).toEqual(presets.map((name) => PID_FLAGS[name]));
    });

    test.each(['pid_controller_S', 'pid_controller_OL'])('%s restarts at the first preset like the other PID assignments', (assignment) => {
      register(assignment);
      set_globals({ next_graph_no_to_add: 3 });
      select(assignment);
      expect(graphs()[0].graph_name).toBe(global_value('GRAPH_ORDER')[0].name);
    });
  });
});

// The display flags of the PID graphs: magnitude, phase, time response, Nyquist, information, equation.
// They come from the lists of views in select_assignment.
const PID_FLAGS = {
  GRAPH_PID: [true, true, false, false, false, true],
  GRAPH_ONE_POLE_WITH_PID_YR: [true, true, true, false, false, true],
  GRAPH_ONE_POLE_WITH_PID_S: [true, false, false, true, false, true],
  GRAPH_ONE_POLE_WITH_PID_YL: [true, true, true, false, false, true],
  GRAPH_ONE_POLE_WITH_PID_OPEN: [true, true, false, true, true, true],
};
const flags = (graph) => [graph.bode_display_bodemag_bool, graph.bode_display_bodephase_bool,
  graph.bode_display_timeresponse_bool, graph.bode_display_nyquist_bool,
  graph.bode_display_information_bool, graph.bode_display_equation_bool];

// Cases added after Stryker mutation testing (npm run test:mutation) showed that no test noticed
// these changes to src/assignments.js.
describe('mutation gaps: select_assignment', () => {
  const select = (value) => window.select_assignment({ value });

  // beforeEach sets next_graph_no_to_add to 0, which hides a missing reset to 0.
  test.each(['one_pole', 'pid_controller', 'pid_controller_YL'])('%s restarts at the first preset', (assignment) => {
    set_globals({ next_graph_no_to_add: 3 });
    select(assignment);
    expect(graphs()[0].graph_name).toBe(global_value('GRAPH_ORDER')[0].name);
    expect(graphs()[0].bode_id).toBe(1);
  });

  test('pid_controller_YL gives every PID graph its display flags', () => {
    select('pid_controller_YL');
    expect(graphs().slice(1).map(flags)).toEqual([
      PID_FLAGS.GRAPH_PID, PID_FLAGS.GRAPH_ONE_POLE_WITH_PID_YR, PID_FLAGS.GRAPH_ONE_POLE_WITH_PID_YL,
    ]);
  });

  test.each([
    ['one_pole', 'Match this response', '\\frac{0.65}{1+2s}'],
    ['two_real_poles', 'Match this response', '\\frac{0.5}{1+2s+s^2}'],
    ['two_real_poles', 'Match this Bode phase', '\\frac{1}{(1+5s)(1+0.05s)}'],
    ['two_complex_poles', 'Match this Bode', '\\frac{8^2}{s^2+2*0.05*8*s+8^2}'],
    ['two_complex_poles', 'Match this response', '\\frac{0.7*2^2}{s^2+2*0.7*2*s+2^2}'],
    ['one_zero_two_poles', 'Match this Nyquist', '\\frac{(1+6s)}{(1+2.5s)(1+s)}'],
    ['one_zero_two_poles', 'Match this Bode', '\\frac{0.75(1+2s)}{(1+9.25s)(1+0.5s)}'],
    ['one_zero_two_poles', 'Match this response', '\\frac{(1-1.5s)}{(1+s)(1+s)}'],
  ])('%s: the ghost "%s" shows the LaTeX %s', (assignment, name, latex) => {
    select(assignment);
    const equation = [...document.querySelectorAll('.equation')].find((div) => div.id === name);
    expect(equation.querySelector('math-field.formula').textContent).toBe(latex);
    const ghost = graphs().find((graph) => graph.graph_name === name);
    expect(ghost.is_ghost).toBe(true);
    expect(ghost.bode_display_pole_zero_bool).toBe(false);
  });
});

describe('mutation gaps: task_done', () => {
  test('moves the assignment star to the same --top as the text, as a percentage', () => {
    set_globals({ current_assignment: 'one_pole' });
    window.mouseX = 0.5 * window.windowWidth;
    window.mouseY = 0.25 * window.windowHeight;
    window.task_done('T1=2');
    expect(document.querySelector('.assignment_star').style.getPropertyValue('--top')).toBe('25%');
    expect(document.querySelector('.achievement_text').style.getPropertyValue('--top')).toBe('25%');
  });

  test('refreshes the assignments window', () => {
    set_globals({ current_assignment: 'one_pole' });
    window.task_done('T1=2');
    expect(document.querySelector('.assignments_box').innerHTML).toContain('Please select an assignment:');
  });
});

describe('mutation gaps: update_assignments', () => {
  const box = () => document.querySelector('.assignments_box');

  test('the window starts with the close button and the heading, exactly', () => {
    window.update_assignments();
    expect(box().innerHTML.startsWith('<br><button type="button" class="close-window"')).toBe(true);
    expect(box().innerHTML).toContain('</svg></button><center><svg');
    expect(box().innerHTML).toContain('&nbsp;Your Assignments</center><br>Please select an assignment:<br><input');
  });

  test('every label is followed by a line break, and the counter line is on its own line', () => {
    window.update_assignments();
    const radios = Object.keys(all_assignments()).length;
    expect(box().innerHTML.split('</label><br>')).toHaveLength(radios + 1);
    expect(box().innerHTML).toContain('</label><br><br><b>0/8</b> done so far. Better get started!<br><img');
  });

  test('the legend message needs all 8 assignments, and each count has its own message', () => {
    set_globals({ done_tasks: Object.keys(all_tasks()) });
    window.update_assignments();
    expect(box().textContent).toContain('8/8 done so far. You\'re a legend!');
  });

  test('only the current assignment is checked in the completed list', () => {
    set_globals({ current_assignment: 'time_delay', done_tasks: [...all_assignments().time_delay.tasks, ...all_assignments().four_poles.tasks] });
    window.update_assignments();
    const completed = box().innerHTML.slice(box().innerHTML.indexOf('Completed assignments:'));
    expect(completed.match(/ checked/g)).toHaveLength(1);
    expect(completed).toContain('id="time_delay" value="time_delay" onchange="select_assignment(this);" checked=""');
    expect(completed).toContain('</label><br><input type="radio" name="assignment" id="four_poles"');
    expect(completed).toContain('</label><br><img');
  });
});

describe('mutation gaps: update_tasks', () => {
  const html = () => document.getElementById('task_list').innerHTML;

  test('starts with the assignment name', () => {
    set_globals({ current_assignment: 'one_pole' });
    window.update_tasks();
    expect(html().startsWith('<center><b>' + all_assignments().one_pole.t + '</b></center><br>Your tasks')).toBe(true);
  });

  test('the badge text is "done/total" followed by a non-breaking space', () => {
    set_globals({ current_assignment: 'one_pole', done_tasks: ['T1=2'] });
    window.update_tasks();
    expect(document.getElementById('assignment_0_text').textContent).toBe('1/' + Object.keys(all_tasks()).length + '\u00a0');
  });

  test('every task and every counter is on its own line', () => {
    set_globals({ current_assignment: 'one_pole', done_tasks: ['T1=2'] });
    window.update_tasks();
    expect(html()).toContain('</span><br><br><input type="checkbox"'); // to-do tasks are separated by an empty line
    expect(html()).toContain('Completed tasks:<br><input type="checkbox" checked="" onclick="reset_task(&quot;T1=2&quot;);">');
    expect(html()).toContain('</span><br><br><b>1/5</b> done so far.<br><br><br><center><i><div');
    expect(html().endsWith(all_assignments().one_pole.info + '</div></i></center>')).toBe(true);
  });

  test('the message for a finished assignment also ends with the info box', () => {
    set_globals({ current_assignment: 'time_delay', done_tasks: all_assignments().time_delay.tasks });
    window.update_tasks();
    expect(html()).toContain("</span><br><br><br><center><i><div style='width:70%".replace(/'/g, '"'));
  });
});

describe('mutation gaps: the assignment and task tables', () => {
  test('every assignment has a name, tasks that exist, and an info text', () => {
    for (const [id, assignment] of Object.entries(all_assignments())) {
      expect([id, assignment.t]).toEqual([id, expect.stringMatching(/\S/)]);
      expect(assignment.tasks.length).toBeGreaterThan(0);
      if (id === 'none') continue;
      expect([id, assignment.info]).toEqual([id, expect.stringMatching(/\S/)]);
      for (const task of assignment.tasks) expect(Object.keys(all_tasks())).toContain(task);
    }
  });

  test('"none" is the assignment that can never be finished and has no info text', () => {
    expect(all_assignments().none.tasks).toEqual(['impossible']);
    expect(all_assignments().none.info).toBe('');
  });

  test('every task has a text, and a hint that is not empty if it has one', () => {
    for (const [id, task] of Object.entries(all_tasks())) {
      expect([id, task.t]).toEqual([id, expect.stringMatching(/\S/)]);
      if (task.a !== undefined) expect([id, task.a]).toEqual([id, expect.stringMatching(/\S/)]);
    }
  });
});
