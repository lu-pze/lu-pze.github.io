/** @jest-environment jsdom */
// Tests for src/help_questions.js (the right-click Q&A help) and for the sound part of
// src/achievements_sound.js (init_jingle, play_jingle). The achievement logic itself is in
// tests/achievements.test.js.
//
// The help texts are plain data (HTML with MathLive <math-field> LaTeX), so most tests here are
// invariants over every entry of all_questions: balanced tags and braces, valid entities, existing
// images, ids that are safe to put in the DOM, and a pos() that finds the element it points at.
const fs = require('fs');
const path = require('path');
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const ROOT = path.resolve(__dirname, '..');
const read_source = (file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8');

const SPYABLE = ['add_event', 'redraw_canvas_gain', 'handle_questions'];
const originals = {};

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
});

// Four plot regions far apart from each other, so that a question can be matched to its plot.
// The offsets are constants in the app (see the table in tests/hover_nyquist.test.js).
const PLOTS = {
  bode_mag: { x: 100, y: 100, width: 300, height: 200, x_offset: 68, y_offset: 30 },
  bode_phase: { x: 100, y: 1100, width: 300, height: 200, x_offset: 68, y_offset: 110 },
  step_response: { x: 2100, y: 100, width: 250, height: 200, x_offset: 65, y_offset: 40 },
  nyquist: { x: 2100, y: 1100, width: 250, height: 200, x_offset: 65, y_offset: 45 },
};
const geometry = () => {
  const values = { graph_pole_zero_width: 96 };
  for (const [plot, rect] of Object.entries(PLOTS)) {
    for (const field of ['x', 'y', 'width', 'height']) values[`graph_${plot}_${field}`] = rect[field];
  }
  return values;
};

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  set_globals({
    ...geometry(), phase_lower_bound: -360, phase_upper_bound: 0, questions_enabled: false, have_asked_questions: false, banner_is_visible: false,
    last_hover_answer_id: '', improvement_enabled: false,
    pole_zero_graph_x: [], pole_zero_graph_y: [],
  });
  window.eval('bode_graphs = []');
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
  document.querySelectorAll('[data-test-element]').forEach((element) => element.remove());
  document.getElementById('questions_div').innerHTML = '';
  document.getElementById('answer_text').innerHTML = '';
  document.getElementById('hover_answer').innerHTML = '';
});

const questions = () => global_value('all_questions');
const question_ids = () => Object.keys(questions());
// The source text of the question and pos() of one all_questions entry (a function's toString() would be the instrumented
// code when the tests run with coverage).
function entry_source(id) {
  const source = read_source('help_questions.js');
  const start = source.indexOf(`"${id}":{q:`);
  const next = source.slice(start + 1).search(/^ {2}"[^"]+":\{q:/m);
  const entry = next === -1 ? source.slice(start) : source.slice(start, start + 1 + next);
  return entry.slice(0, entry.search(/\ba:`/)); // only q and pos(), not the answer text
}
const events = () => window.add_event.mock.calls.map((call) => call[0]);

// ---------------------------------------------------------------------------------------------
// Static checks of the help texts

// Tags that never have a closing tag.
const VOID_TAGS = new Set(['br', 'img', 'hr', 'input', 'wbr']);

// Returns a description of the first HTML problem in `html`, or null: closing tags that do not
// match the open one, tags left open, a bare "&" in the text. (A bare "<" in the text is
// parsed as text by browsers; it has its own test below.)
function html_problem(html) {
  const stack = [];
  const tag = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g;
  let last = 0;
  let match;
  const check_text = (text) => {
    const bare_amp = /&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/.exec(text);
    if (bare_amp) return `bare "&" near "${text.substr(bare_amp.index, 20)}"`;
    return null;
  };
  while ((match = tag.exec(html)) !== null) {
    const problem = check_text(html.slice(last, match.index));
    if (problem) return problem;
    last = tag.lastIndex;
    const [, closing, name, rest] = match;
    const lower = name.toLowerCase();
    if (VOID_TAGS.has(lower) || rest.endsWith('/')) continue;
    if (!closing) {
      stack.push(lower);
    } else if (stack.pop() !== lower) {
      return `</${lower}> does not match the open tag (open: ${stack.join(' > ') || 'none'})`;
    }
  }
  const trailing = check_text(html.slice(last));
  if (trailing) return trailing;
  return stack.length ? `unclosed <${stack.join('>, <')}>` : null;
}

// Returns a description of the first LaTeX problem in `latex`, or null.
function latex_problem(latex) {
  let depth = 0;
  const without_escapes = latex.replace(/\\[{}]/g, '');
  for (const character of without_escapes) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth < 0) return 'closing brace without an opening brace';
  }
  if (depth !== 0) return `${depth} unclosed brace(s)`;
  const count = (pattern) => (latex.match(pattern) || []).length;
  if (count(/\\left(?![a-zA-Z])/g) !== count(/\\right(?![a-zA-Z])/g)) return '\\left and \\right do not match';
  if (count(/\\begin\{/g) !== count(/\\end\{/g)) return '\\begin and \\end do not match';
  // A single backslash before f, t, b, v, r or n in a JS string is a control character, not LaTeX.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x09\x0b-\x1f]/.test(latex)) return 'contains a control character (a lost backslash?)';
  return null;
}

const math_fields = (html) => [...html.matchAll(/<math-field[^>]*>([\s\S]*?)<\/math-field>/g)].map((match) => match[1]);

describe('help_questions.js: the all_questions table', () => {
  test('has the 30 help entries and every one has a question, an answer and a position', () => {
    expect(question_ids()).toHaveLength(30);
    for (const [id, entry] of Object.entries(questions())) {
      expect({ id, q: typeof entry.q }).toEqual({ id, q: 'string' });
      expect({ id, a: typeof entry.a }).toEqual({ id, a: 'string' });
      expect({ id, pos: typeof entry.pos }).toEqual({ id, pos: 'function' });
      expect(Object.keys(entry).sort()).toEqual(['a', 'pos', 'q']);
    }
  });

  test('no key is written twice in the source (a repeated key silently replaces the first)', () => {
    const source = read_source('help_questions.js');
    const keys = [...source.matchAll(/^ {2}"([^"]+)":\{q:/gm)].map((match) => match[1]);
    expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([]);
    expect(keys.sort()).toEqual(question_ids().sort());
  });

  test('the question and answer texts are not empty and show no placeholder values', () => {
    for (const [id, entry] of Object.entries(questions())) {
      expect({ id, q: entry.q.trim().length > 5 }).toEqual({ id, q: true });
      expect({ id, a: entry.a.trim().length > 50 }).toEqual({ id, a: true });
      for (const text of [entry.q, entry.a]) {
        expect({ id, bad: /undefined|\[object|NaN|TODO|FIXME/.exec(text) }).toEqual({ id, bad: null });
      }
    }
  });

  test('the question is a short single line, ending in "?" ', () => {
    for (const [id, entry] of Object.entries(questions())) {
      expect({ id, q: entry.q }).toEqual({ id, q: entry.q.replace(/\s+$/, '') });
      expect({ id, ends_with_question_mark: entry.q.endsWith('?') }).toEqual({ id, ends_with_question_mark: true });
      expect({ id, multiline: entry.q.includes('\n') }).toEqual({ id, multiline: false });
    }
  });

  test('every key can be used as a DOM id and cannot be mistaken for a task', () => {
    // enable_questions builds <div id='KEY'> and handle_questions treats ids that start with
    // "task_" as assignment tasks.
    for (const id of question_ids()) {
      expect({ id, safe: /^[A-Za-z_][A-Za-z0-9_-]*$/.test(id) }).toEqual({ id, safe: true });
      expect({ id, task: id.startsWith('task_') }).toEqual({ id, task: false });
    }
    const tasks = Object.keys(global_value('all_tasks')).map((task) => 'task_' + task);
    expect(tasks.filter((task) => question_ids().includes(task))).toEqual([]);
  });

  test('every question and answer is well-formed HTML', () => {
    for (const [id, entry] of Object.entries(questions())) {
      expect({ id, part: 'q', problem: html_problem(entry.q) }).toEqual({ id, part: 'q', problem: null });
      expect({ id, part: 'a', problem: html_problem(entry.a) }).toEqual({ id, part: 'a', problem: null });
    }
  });

  // The browser shows "t<0" correctly, but the HTML spec wants &lt; in text and a bare "<" in front
  // of a letter would start a tag. Found in the GRAPH_ONE_POLE_WITH_PID_YR answer: "for time t<0".
  test.failing('the text uses &lt; instead of a bare "<"', () => {
    for (const [id, entry] of Object.entries(questions())) {
      const outside_tags = (entry.q + entry.a).replace(/<\/?[a-zA-Z][^>]*>/g, '');
      expect({ id, bare: /<(?![a-zA-Z/])/.exec(outside_tags) }).toEqual({ id, bare: null });
    }
  });

  test('every character entity is one that a browser understands', () => {
    // An unknown entity such as &zetta; stays as literal text in innerHTML.
    const holder = document.createElement('textarea');
    for (const [id, entry] of Object.entries(questions())) {
      for (const entity of (entry.q + entry.a).match(/&[a-zA-Z]+;|&#x?[0-9a-fA-F]+;/g) || []) {
        holder.innerHTML = entity;
        expect({ id, entity, decoded: holder.value !== entity }).toEqual({ id, entity, decoded: true });
      }
    }
  });

  test('the LaTeX in every <math-field> has balanced braces, \\left/\\right and \\begin/\\end', () => {
    let nof_formulas = 0;
    for (const [id, entry] of Object.entries(questions())) {
      for (const latex of math_fields(entry.a)) {
        nof_formulas += 1;
        expect({ id, latex, problem: latex_problem(latex) }).toEqual({ id, latex, problem: null });
        expect({ id, latex, empty: latex.trim() === '' }).toEqual({ id, latex, empty: false });
      }
    }
    expect(nof_formulas).toBeGreaterThan(20);
  });

  test('a math-field is never nested and has a closing tag (in the text outside the fields, no LaTeX markers remain)', () => {
    for (const [id, entry] of Object.entries(questions())) {
      const opened = (entry.a.match(/<math-field/g) || []).length;
      const closed = (entry.a.match(/<\/math-field>/g) || []).length;
      expect({ id, opened }).toEqual({ id, opened: closed });
      const outside = entry.a.replace(/<math-field[^>]*>[\s\S]*?<\/math-field>/g, '');
      // The texts use MathLive's <math-field>, not TeX delimiters, so a stray $ or \( is a typo.
      expect({ id, tex_delimiters: /\$|\\\(|\\\)|\\\[|\\\]/.exec(outside) }).toEqual({ id, tex_delimiters: null });
    }
  });

  test('the images that answers refer to exist', () => {
    const images = [];
    for (const [id, entry] of Object.entries(questions())) {
      for (const match of entry.a.matchAll(/<img[^>]*\ssrc=["']([^"']+)["']/g)) images.push({ id, file: match[1] });
    }
    expect(images.length).toBeGreaterThan(0);
    for (const { id, file } of images) {
      expect({ id, file, exists: fs.existsSync(path.join(ROOT, file)) }).toEqual({ id, file, exists: true });
    }
  });

  test('the shared second-order example list is balanced and used by both second-order answers', () => {
    const examples = global_value('HELP_SECOND_ORDER_EXAMPLES');
    expect(html_problem(examples)).toBeNull();
    expect(examples.match(/<li>/g).length).toBe(12);
    expect(questions().TWO_REAL_POLES_pz.a).toContain(examples);
    expect(questions().TWO_COMPLEX_POLES_pz.a).toContain(examples);
  });

  test('every id the string-based code refers to in hover_nyquist.js is a real question', () => {
    const source = read_source('hover_nyquist.js');
    const referred = [...source.matchAll(/q_id\s*==\s*"([^"]+)"/g)].map((match) => match[1]);
    expect(referred).toEqual(expect.arrayContaining(['GRAPH_PID', 'GRAPH_ONE_POLE_WITH_PID_YR']));
    for (const id of referred) expect(question_ids()).toContain(id);
  });

  test('the PID help questions are the ones that complete the "pid_help_" tasks', () => {
    const source = read_source('hover_nyquist.js');
    const assignments = read_source('assignments.js');
    const tasks = Object.keys(global_value('all_tasks'));
    for (const match of source.matchAll(/q_id == "([^"]+)"\) task_done\("([^"]+)"\)/g)) {
      expect(question_ids()).toContain(match[1]);
      // pid_help_S and pid_help_OPEN are commented out in assignments.js (experimental assignments).
      const commented_out = assignments.includes(`//"${match[2]}"`);
      expect({ task: match[2], exists: tasks.includes(match[2]) || commented_out }).toEqual({ task: match[2], exists: true });
    }
  });

  test('every GRAPH_* question belongs to a preset and points at the element named like it', () => {
    const graph_ids = question_ids().filter((id) => id.startsWith('GRAPH_'));
    expect(graph_ids).toHaveLength(9);
    for (const id of graph_ids) {
      const preset = global_value(id);
      expect({ id, preset: typeof preset.name }).toEqual({ id, preset: 'string' });
      expect(entry_source(id)).toContain(`getElementById('${preset.name}')`);
      expect(global_value('GRAPH_ORDER').map((graph) => graph.name)).toContain(preset.name);
    }
  });

  test('every *_pz question looks for the graph with the matching preset formula', () => {
    const pz_ids = question_ids().filter((id) => id.endsWith('_pz'));
    expect(pz_ids).toHaveLength(4);
    for (const id of pz_ids) {
      const preset = 'GRAPH_' + id.replace(/_pz$/, '');
      expect(global_value(preset).formula).toEqual(expect.any(String));
      expect(entry_source(id)).toContain(`bode_formula == ${preset}.formula`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Positions

describe('all_questions[...].pos()', () => {
  // The questions that point at a plot. The expected plot is checked from the position.
  const PLOT_QUESTIONS = {
    seconds: 'step_response', Step_response: 'step_response',
    degrees: 'bode_phase', Bode_plot_phase: 'bode_phase',
    Bode_plot_who: 'bode_mag', Bode_plots: 'bode_mag', Bode_mag: 'bode_mag',
    Nyquist_who: 'nyquist', Nyquist: 'nyquist',
  };

  test.each(Object.entries(PLOT_QUESTIONS))('%s is anchored at the %s plot', (id, plot) => {
    const position = questions()[id].pos();
    const rect = PLOTS[plot];
    const left = rect.x + rect.x_offset;
    const top = rect.y + rect.y_offset;
    expect(position.visible).toBe(true);
    // Within 25 px outside the plot area: the "who" questions sit just above it, "seconds" just below.
    expect(position.x).toBeGreaterThanOrEqual(left - 25);
    expect(position.x).toBeLessThanOrEqual(left + rect.width + 25);
    expect(position.y).toBeGreaterThanOrEqual(top - 25);
    expect(position.y).toBeLessThanOrEqual(top + rect.height + 25);
  });

  test('the "useful" questions sit in the middle of their plot, the others on the edge', () => {
    const middle = (plot) => {
      const rect = PLOTS[plot];
      return { visible: true, x: rect.x + rect.x_offset + rect.width / 2, y: rect.y + rect.y_offset + rect.height / 2 };
    };
    expect(questions().Nyquist.pos()).toEqual(middle('nyquist'));
    expect(questions().Bode_plots.pos()).toEqual(middle('bode_mag'));
    expect(questions().Bode_plot_phase.pos()).toEqual(middle('bode_phase'));
    expect(questions().Step_response.pos()).toEqual(middle('step_response'));
    // Nyquist_who: centred above the plot. seconds: right of the time axis, 20 px below the plot.
    expect(questions().Nyquist_who.pos()).toEqual({ visible: true, x: 2100 + 65 + 125, y: 1100 + 45 - 10 });
    expect(questions().seconds.pos()).toEqual({ visible: true, x: 2100 + 250 + 65, y: 100 + 200 + 40 + 20 });
    expect(questions().degrees.pos()).toEqual({ visible: true, x: 100 + 68, y: 1100 + 110 - 20 });
    expect(questions().Bode_mag.pos()).toEqual({ visible: true, x: 100 + 68, y: 100 + 30 - 10 });
    expect(questions().Bode_plot_who.pos()).toEqual({ visible: true, x: 100 + 68 + 150, y: 100 + 30 - 10 });
  });

  describe('Bode_-180_degrees', () => {
    const pos = () => questions()['Bode_-180_degrees'].pos();

    test('sits at the -180 degree level of the phase plot, on its y-axis', () => {
      // -180 is half way between the bounds -360 and 0 of the 200 px high plot.
      expect(pos()).toEqual({ visible: true, x: 100 + 68, y: 1100 + 110 + 100 });
      set_globals({ phase_lower_bound: -180 }); // the bottom of the plot
      expect(pos()).toEqual({ visible: true, x: 100 + 68, y: 1100 + 110 + 200 });
      set_globals({ phase_lower_bound: -270, phase_upper_bound: -90 });
      expect(pos().y).toBeCloseTo(1100 + 110 + 100, 10);
    });

    test('is visible exactly when -180 is within the bounds of the plot (inclusive)', () => {
      set_globals({ phase_lower_bound: -180, phase_upper_bound: -180 });
      expect(pos().visible).toBe(true);
      set_globals({ phase_lower_bound: -179.9, phase_upper_bound: 0 });
      expect(pos()).toEqual({ visible: false });
      set_globals({ phase_lower_bound: -360, phase_upper_bound: -180.1 });
      expect(pos()).toEqual({ visible: false });
      set_globals({ phase_lower_bound: -90, phase_upper_bound: 90 });
      expect(pos()).toEqual({ visible: false });
    });
  });

  // The questions that point at an element of the page, found by id. The id is read from the
  // source of pos(), so a new question of this kind is covered automatically.
  const element_id_of = (id) => /getElementById\('([^']+)'\)/.exec(entry_source(id));
  const DOM_QUESTIONS = () => question_ids().filter((id) => element_id_of(id) && !id.endsWith('_pz'));

  test('there are 16 questions that point at a page element', () => {
    expect(DOM_QUESTIONS()).toHaveLength(16);
  });

  test('they are invisible when the element is missing', () => {
    // The page body from index.html may already hold some of the elements; remove the ones that
    // the questions look for.
    const saved = [];
    for (const id of DOM_QUESTIONS()) {
      const element = document.getElementById(element_id_of(id)[1]);
      if (element) {
        saved.push([element, element.parentNode, element.nextSibling]);
        element.remove();
      }
    }
    try {
      for (const id of DOM_QUESTIONS()) expect({ id, position: questions()[id].pos() }).toEqual({ id, position: { visible: false } });
    } finally {
      for (const [element, parent, next] of saved) parent.insertBefore(element, next);
    }
  });

  test('they point at the centre of the element, including the page scroll', () => {
    for (const id of DOM_QUESTIONS()) {
      const element_id = element_id_of(id)[1];
      const existing = document.getElementById(element_id);
      const span = existing || document.createElement('span');
      if (!existing) {
        span.id = element_id;
        span.setAttribute('data-test-element', '');
        document.body.appendChild(span);
      }
      const original = span.getBoundingClientRect;
      span.getBoundingClientRect = () => ({ left: 100, top: 200, width: 40, height: 20 });
      try {
        // No scroll:
        expect({ id, position: questions()[id].pos() }).toEqual({ id, position: { visible: true, x: 120, y: 210 } });
        // Scrolled 7 px right and 30 px down:
        Object.defineProperty(window, 'pageXOffset', { configurable: true, value: 7 });
        Object.defineProperty(window, 'pageYOffset', { configurable: true, value: 30 });
        expect({ id, position: questions()[id].pos() }).toEqual({ id, position: { visible: true, x: 127, y: 240 } });
      } finally {
        delete window.pageXOffset;
        delete window.pageYOffset;
        span.getBoundingClientRect = original;
      }
    }
  });

  test('without a scroll offset on window, the document scroll position is used', () => {
    Object.defineProperty(window, 'pageXOffset', { configurable: true, value: 0 });
    Object.defineProperty(window, 'pageYOffset', { configurable: true, value: 0 });
    const scroll_left = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft');
    const scroll_top = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
    Object.defineProperty(document.documentElement, 'scrollLeft', { configurable: true, value: 11 });
    Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, value: 22 });
    const span = document.createElement('span');
    span.id = 'variable_z';
    span.setAttribute('data-test-element', '');
    span.getBoundingClientRect = () => ({ left: 100, top: 200, width: 40, height: 20 });
    document.body.appendChild(span);
    try {
      expect(questions().Damping_factor_z.pos()).toEqual({ visible: true, x: 131, y: 232 });
    } finally {
      delete window.pageXOffset;
      delete window.pageYOffset;
      delete document.documentElement.scrollLeft;
      delete document.documentElement.scrollTop;
      expect(scroll_left).toBeDefined();
      expect(scroll_top).toBeDefined();
    }
  });

  test('the static page elements for margins and the quiz badge exist in index.html', () => {
    for (const id of ['phase_margin', 'gain_margin', 'phase_crossover_frequency', 'cap_0']) {
      expect(document.getElementById(id)).not.toBeNull();
      expect(DOM_QUESTIONS().map((question) => element_id_of(question)[1])).toContain(id);
    }
  });

  describe('the questions about a preset graph', () => {
    // Each of the 5 *_pz questions sits in the pole-zero map of the first displayed graph with
    // the right formula (the preset as it is shown in the app).
    const PZ = [
      ['ONE_REAL_POLE_pz', 'GRAPH_ONE_REAL_POLE'],
      ['TWO_REAL_POLES_pz', 'GRAPH_TWO_REAL_POLES'],
      ['TWO_COMPLEX_POLES_pz', 'GRAPH_TWO_COMPLEX_POLES'],
      ['ONE_ZERO_TWO_POLES_pz', 'GRAPH_ONE_ZERO_TWO_POLES'],
    ];
    const use_graphs = (graphs) => {
      window.eval(`bode_graphs = ${JSON.stringify(graphs)}`);
    };
    const formulas = () => PZ.map(([, preset]) => global_value(preset).formula);
    beforeEach(() => {
      set_globals({ pole_zero_graph_x: [800, 800, 800, 800], pole_zero_graph_y: [0, 120, 240, 360] });
    });

    test.each(PZ.map((pair, index) => [pair[0], pair[1], index]))('%s is at the centre of the map of its graph', (id, preset, index) => {
      use_graphs(PZ.map(([, name]) => ({ bode_displaybool: true, bode_formula: global_value(name).formula })));
      expect(questions()[id].pos()).toEqual({ visible: true, x: 800 + 48, y: 120 * index + 48 });
    });

    test.each(PZ)('%s is hidden when no graph has the formula', (id) => {
      expect(questions()[id].pos()).toEqual({ visible: false });
      use_graphs([{ bode_displaybool: true, bode_formula: 'k/(1+s)^7' }]);
      expect(questions()[id].pos()).toEqual({ visible: false });
    });

    test.each(PZ)('%s is hidden when its graph is switched off, and found at a later graph', (id, preset) => {
      const formula = global_value(preset).formula;
      use_graphs([{ bode_displaybool: false, bode_formula: formula }]);
      expect(questions()[id].pos()).toEqual({ visible: false });
      use_graphs([{ bode_displaybool: false, bode_formula: formula }, { bode_displaybool: true, bode_formula: formula }]);
      expect(questions()[id].pos()).toEqual({ visible: true, x: 800 + 48, y: 120 + 48 });
    });

    test('the four preset formulas are different, so the questions do not get mixed up', () => {
      expect(new Set(formulas()).size).toBe(4);
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Toggling the help

describe('questionsToggle', () => {
  const icon_svg = () => document.getElementById('questions_icon_svg');

  test('switching on logs the event, marks the icon and shows the questions right away', () => {
    window.questionsToggle();
    expect(events()).toEqual(['questions_toggle']);
    expect(global_value('questions_enabled')).toBe(true);
    expect(global_value('have_asked_questions')).toBe(true);
    expect(icon_svg().style.fill).toBe('#5050ff');
    expect(window.handle_questions).toHaveBeenCalledTimes(1);
    expect(window.redraw_canvas_gain).not.toHaveBeenCalled();
  });

  test('switching off logs the event, redraws every graph and clears the help', () => {
    window.questionsToggle();
    window.add_event.mockClear();
    document.getElementById('hover_answer').innerHTML = '<h2>x</h2>';
    set_globals({ last_hover_answer_id: 'seconds' });
    window.questionsToggle();
    expect(events()).toEqual(['questions_toggle']);
    expect(window.redraw_canvas_gain).toHaveBeenCalledTimes(1);
    expect(window.redraw_canvas_gain).toHaveBeenCalledWith('all');
    expect(window.handle_questions).toHaveBeenCalledTimes(1); // only from switching on
    expect(global_value('questions_enabled')).toBe(false);
    expect(icon_svg().style.fill).toBe('');
    expect(document.getElementById('questions_div').innerHTML).toBe('');
    const hover = document.getElementById('hover_answer');
    expect(hover.style.visibility).toBe('hidden');
    expect(hover.innerHTML).toBe('');
    expect(global_value('last_hover_answer_id')).toBe('');
  });

  test('"have asked questions" stays set after switching off, so the right-click banner is not shown again', () => {
    window.questionsToggle();
    window.questionsToggle();
    expect(global_value('have_asked_questions')).toBe(true);
  });

  test('toggling three times ends switched on', () => {
    for (let i = 0; i < 3; i++) window.questionsToggle();
    expect(events()).toEqual(['questions_toggle', 'questions_toggle', 'questions_toggle']);
    expect(global_value('questions_enabled')).toBe(true);
    expect(window.redraw_canvas_gain).toHaveBeenCalledTimes(1);
    expect(window.handle_questions).toHaveBeenCalledTimes(2);
  });

  test('the real handle_questions can run from the toggle (no spy)', () => {
    window.handle_questions = originals.handle_questions;
    window.mouseX = 0;
    window.mouseY = 0;
    expect(() => window.questionsToggle()).not.toThrow();
    expect(events()).toContain('questions_toggle');
  });
});

describe('enable_questions', () => {
  const icons = () => [...document.querySelectorAll('#questions_div .question_div')];

  test('places an icon for each visible question, 4 px right of and 6 px below its position', () => {
    window.enable_questions();
    const visible = question_ids().filter((id) => questions()[id].pos().visible);
    expect(visible.length).toBeGreaterThan(5);
    expect(icons().map((icon) => icon.id)).toEqual(visible);
    for (const icon of icons()) {
      const position = questions()[icon.id].pos();
      expect(icon.style.top).toBe(position.y + 6 + 'px');
      expect(icon.style.left).toBe(position.x + 4 + 'px');
      const image = icon.querySelector('img');
      expect(image.getAttribute('src')).toBe('images/question_small.webp');
      expect(image.getAttribute('width')).toBe('100px');
    }
  });

  test('graph-dependent and page-dependent questions get no icon until their element exists', () => {
    window.enable_questions();
    const without = icons().map((icon) => icon.id);
    for (const id of ['ONE_REAL_POLE_pz', 'Damping_factor_z', 'GRAPH_PID']) expect(without).not.toContain(id);
    // The plot questions never depend on anything else, and the margin texts are in index.html:
    for (const id of ['seconds', 'degrees', 'Nyquist', 'Bode_mag', 'Step_response', 'phase_margin', 'gain_margin']) {
      expect(without).toContain(id);
    }
  });

  test('with all graphs and page elements present every question gets exactly one icon', () => {
    const created = [];
    for (const id of question_ids()) {
      const match = /getElementById\('([^']+)'\)/.exec(entry_source(id));
      if (match && !document.getElementById(match[1])) {
        const span = document.createElement('span');
        span.id = match[1];
        span.setAttribute('data-test-element', '');
        span.getBoundingClientRect = () => ({ left: 10, top: 20, width: 4, height: 4 });
        document.body.appendChild(span);
        created.push(span);
      }
    }
    const graphs = ['GRAPH_ONE_REAL_POLE', 'GRAPH_TWO_REAL_POLES', 'GRAPH_TWO_COMPLEX_POLES', 'GRAPH_ONE_ZERO_TWO_POLES']
      .map((name) => ({ bode_displaybool: true, bode_formula: global_value(name).formula }));
    window.eval(`bode_graphs = ${JSON.stringify(graphs)}`);
    set_globals({ pole_zero_graph_x: [800, 800, 800, 800], pole_zero_graph_y: [0, 120, 240, 360] });
    window.enable_questions();
    expect(icons().map((icon) => icon.id).sort()).toEqual(question_ids().sort());
    expect(created.length).toBeGreaterThan(10);
  });

  test('clears an old answer and closes the answer window', () => {
    document.getElementById('answer_text').innerHTML = 'old';
    document.querySelector('.answer').classList.add('active');
    window.enable_questions();
    expect(document.getElementById('answer_text').innerHTML).toBe('');
    expect(document.querySelector('.answer').classList.contains('active')).toBe(false);
  });

  test('removes the visible right-click banner and logs it once', () => {
    set_globals({ banner_is_visible: true });
    window.enable_questions();
    expect(global_value('banner_is_visible')).toBe(false);
    expect(events()).toEqual(['banner_removed']);
    window.enable_questions();
    expect(events()).toEqual(['banner_removed']);
  });

  describe('icons for the questions about assignment tasks', () => {
    const added = [];
    const add_task = (id, task) => {
      window.eval(`all_tasks[${JSON.stringify(id)}] = ${JSON.stringify(task)}`);
      added.push(id);
    };
    const task_span = (id) => {
      const span = document.createElement('span');
      span.id = 'task_' + id;
      span.setAttribute('data-test-element', '');
      span.getBoundingClientRect = () => ({ left: 300, top: 400, width: 100, height: 20 });
      document.body.appendChild(span);
    };
    const task_icon = (id) => document.querySelector(`#questions_div [id="task_${id}"]`);
    afterEach(() => {
      for (const id of added.splice(0)) window.eval(`delete all_tasks[${JSON.stringify(id)}]`);
    });

    test('a task with an answer and a visible text gets an icon at the centre of the text', () => {
      add_task('test_task', { t: 'Do it', a: 'Hint' });
      task_span('test_task');
      window.enable_questions();
      const icon = task_icon('test_task');
      expect(icon.className).toBe('question_div');
      expect(icon.style.left).toBe('354px'); // 300 + 100/2 + 4
      expect(icon.style.top).toBe('416px'); // 400 + 20/2 + 6
    });

    test('the page scroll is added to the position', () => {
      add_task('test_task', { t: 'Do it', a: 'Hint' });
      task_span('test_task');
      Object.defineProperty(window, 'pageXOffset', { configurable: true, value: 5 });
      Object.defineProperty(window, 'pageYOffset', { configurable: true, value: 50 });
      try {
        window.enable_questions();
      } finally {
        delete window.pageXOffset;
        delete window.pageYOffset;
      }
      const icon = task_icon('test_task');
      expect(icon.style.left).toBe('359px');
      expect(icon.style.top).toBe('466px');
    });

    test('a task without an answer, or whose text is not on the page, gets no icon', () => {
      add_task('no_answer', { t: 'Do it', a: null });
      task_span('no_answer');
      add_task('not_shown', { t: 'Do it', a: 'Hint' });
      window.enable_questions();
      expect(task_icon('no_answer')).toBeNull();
      expect(task_icon('not_shown')).toBeNull();
    });

    // The icon is a <div id="task_X"> and the task text is a <span id="task_X"> (assignments.js),
    // so after enable_questions two elements share an id. As #questions_div comes first in the
    // page, document.getElementById('task_X') in handle_questions then finds the icon and not
    // the text, so the distance is measured to a stale position when the task list scrolls.
    test.failing('the icon does not reuse the id of the task text', () => {
      add_task('test_task', { t: 'Do it', a: 'Hint' });
      task_span('test_task');
      window.enable_questions();
      expect(document.querySelectorAll('[id="task_test_task"]')).toHaveLength(1);
    });
  });
});

describe('disable_questions', () => {
  test('clears the icons and the hover answer and resets the icon colour', () => {
    window.enable_questions();
    expect(document.querySelectorAll('#questions_div .question_div').length).toBeGreaterThan(0);
    document.getElementById('hover_answer').innerHTML = 'text';
    set_globals({ last_hover_answer_id: 'Nyquist' });
    window.disable_questions();
    expect(global_value('questions_enabled')).toBe(false);
    expect(document.getElementById('questions_icon_svg').style.fill).toBe('');
    expect(document.getElementById('questions_div').innerHTML).toBe('');
    expect(document.getElementById('hover_answer').style.visibility).toBe('hidden');
    expect(document.getElementById('hover_answer').innerHTML).toBe('');
    expect(global_value('last_hover_answer_id')).toBe('');
  });
});

// ---------------------------------------------------------------------------------------------
// The answer window

describe('answerToggle', () => {
  test('opens and closes the answer window and logs each click', () => {
    const answer = document.querySelector('.answer');
    window.answerToggle();
    expect(answer.classList.contains('active')).toBe(true);
    window.answerToggle();
    expect(answer.classList.contains('active')).toBe(false);
    expect(events()).toEqual(['answer_toggle', 'answer_toggle']);
  });
});

describe('show_answer', () => {
  test.each(['seconds', 'Damping_factor_z', 'GRAPH_PID'])('%s: the question as a heading and then the answer', (id) => {
    window.show_answer(id);
    const expected = document.createElement('div');
    expected.innerHTML = '<h2>' + questions()[id].q + '</h2>' + questions()[id].a;
    expect(document.getElementById('answer_text').innerHTML).toBe(expected.innerHTML);
    expect(document.querySelector('.answer').classList.contains('active')).toBe(true);
  });

  test('every answer can be shown, with its heading first', () => {
    for (const id of question_ids()) {
      window.show_answer(id);
      const first = document.getElementById('answer_text').firstElementChild;
      expect({ id, tag: first.tagName }).toEqual({ id, tag: 'H2' });
    }
  });

  test('showing a second answer replaces the first and keeps the window open', () => {
    window.show_answer('seconds');
    window.show_answer('degrees');
    const text = document.getElementById('answer_text');
    expect(text.querySelectorAll('h2')).toHaveLength(1);
    expect(text.textContent).toContain('Degrees vs. radians');
    expect(document.querySelector('.answer').classList.contains('active')).toBe(true);
  });
});

describe('show_answer_to_task', () => {
  const added = [];
  const answer = () => document.querySelector('.answer');
  const show_with = (placement) => {
    const task = { t: 'Do it', a: '<h2>Hint</h2>text' };
    if (placement !== undefined) task.placement = placement;
    window.eval(`all_tasks.placement_test = ${JSON.stringify(task)}`);
    added.push('placement_test');
    window.show_answer_to_task('placement_test');
  };
  afterEach(() => {
    for (const id of added.splice(0)) window.eval(`delete all_tasks.${id}`);
    for (const side of ['top', 'bottom', 'left', 'right']) answer().style[side] = null;
    answer().classList.remove('active');
  });

  // [placement, top, bottom, left, right]; "" means "not set".
  test.each([
    [undefined, '30%', '', '32.5%', ''],
    [null, '30%', '', '32.5%', ''],
    ['UL', '5%', '', '3%', ''],
    ['UC', '5%', '', '32.5%', ''],
    ['UR', '5%', '', '', '390px'],
    ['DL', '', '120px', '3%', ''],
    ['DC', '', '120px', '32.5%', ''],
    ['DR', '', '120px', '', '390px'],
  ])('placement %s -> top %s, bottom %s, left %s, right %s', (placement, top, bottom, left, right) => {
    show_with(placement);
    expect(answer().style.top).toBe(top);
    expect(answer().style.bottom).toBe(bottom);
    expect(answer().style.left).toBe(left);
    expect(answer().style.right).toBe(right);
  });

  test('an unknown placement leaves every side unset', () => {
    answer().style.top = '1px';
    show_with('none');
    for (const side of ['top', 'bottom', 'left', 'right']) expect(answer().style[side]).toBe('');
  });

  test('a new placement forgets the sides of the previous one', () => {
    show_with('DR');
    show_with('UL');
    expect(answer().style.bottom).toBe('');
    expect(answer().style.right).toBe('');
    expect(answer().style.top).toBe('5%');
  });

  test('shows the hint text, opens the window with the slide-in animation and logs the task', () => {
    show_with('UL');
    expect(document.getElementById('answer_text').innerHTML).toBe('<h2>Hint</h2>text');
    expect(answer().classList.contains('active')).toBe(true);
    expect(answer().style.animation).toContain('slidein');
    expect(events()).toEqual(['show_answer_to_task=placement_test']);
  });

  test('every hint of the real assignments has a placement that is handled', () => {
    const tasks = global_value('all_tasks');
    const placements = new Set(['UL', 'UC', 'UR', 'DL', 'DC', 'DR', undefined, null]);
    let nof_hints = 0;
    for (const [id, task] of Object.entries(tasks)) {
      if (task.a == null) continue;
      nof_hints += 1;
      expect({ id, handled: placements.has(task.placement) }).toEqual({ id, handled: true });
      window.show_answer_to_task(id);
      expect(document.getElementById('answer_text').innerHTML).not.toBe('');
    }
    expect(nof_hints).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------------------------
// Sound

describe('the jingle', () => {
  const JINGLE_VARIABLES = ['jingle_buffer', 'jingle_source', 'current_jingle', 'jingle_positions', 'last_jingle_play'];
  const saved = {};
  let context;

  // A stand-in for the browser's AudioContext. Every createBufferSource gives a new fake source.
  function make_context() {
    const sources = [];
    return {
      destination: { is: 'destination' },
      sources,
      createBufferSource: jest.fn(() => {
        const source = {
          buffer: null, connect: jest.fn(), start: jest.fn(), stop: jest.fn(), noteOff: jest.fn(), disconnect: jest.fn(),
        };
        sources.push(source);
        return source;
      }),
      decodeAudioData: jest.fn(),
    };
  }

  beforeEach(() => {
    for (const name of JINGLE_VARIABLES) saved[name] = window[name];
    saved.audioContext = window.audioContext;
    context = make_context();
    window.audioContext = context;
    window.jingle_buffer = undefined;
    window.jingle_source = undefined;
    window.current_jingle = 0;
    window.jingle_positions = [0.0, 3.0];
  });

  afterEach(() => {
    for (const name of JINGLE_VARIABLES) window[name] = saved[name];
    window.audioContext = saved.audioContext;
  });

  describe('init_jingle', () => {
    let requests;
    let original_xhr;
    beforeEach(() => {
      requests = [];
      original_xhr = window.XMLHttpRequest;
      window.XMLHttpRequest = function FakeXhr() {
        this.open = jest.fn();
        this.send = jest.fn();
        requests.push(this);
      };
    });
    afterEach(() => {
      window.XMLHttpRequest = original_xhr;
    });

    test('requests the jingle file as an array buffer', () => {
      window.init_jingle();
      expect(requests).toHaveLength(1);
      expect(requests[0].open).toHaveBeenCalledWith('GET', 'audio/bonus_pling7.wav', true);
      expect(requests[0].responseType).toBe('arraybuffer');
      expect(requests[0].send).toHaveBeenCalledTimes(1);
      expect(context.decodeAudioData).not.toHaveBeenCalled(); // not until the file has arrived
    });

    test('the file the jingle loads is in the repository', () => {
      window.init_jingle();
      expect(fs.existsSync(path.join(ROOT, requests[0].open.mock.calls[0][1]))).toBe(true);
    });

    test('decodes the response and keeps the decoded buffer for play_jingle', () => {
      window.init_jingle();
      requests[0].response = new ArrayBuffer(8);
      requests[0].onload();
      expect(context.decodeAudioData).toHaveBeenCalledTimes(1);
      expect(context.decodeAudioData.mock.calls[0][0]).toBe(requests[0].response);
      expect(window.jingle_buffer).toBeUndefined(); // still decoding
      const decoded = { duration: 3 };
      context.decodeAudioData.mock.calls[0][1](decoded);
      expect(window.jingle_buffer).toBe(decoded);
    });
  });

  describe('play_jingle', () => {
    const buffer = { duration: 3 };

    test('without a decoded buffer nothing is played (and a later play still starts at the first note)', () => {
      window.play_jingle();
      expect(context.createBufferSource).not.toHaveBeenCalled();
      expect(window.current_jingle).toBe(0);
    });

    test('plays the first note: a new source for the buffer, connected to the speakers', () => {
      window.jingle_buffer = buffer;
      window.play_jingle();
      expect(context.sources).toHaveLength(1);
      const [source] = context.sources;
      expect(source.buffer).toBe(buffer);
      expect(source.connect).toHaveBeenCalledWith(context.destination);
      expect(window.jingle_source).toBe(source);
      // From 0 (0 - 0.05 is clamped), for 3.0 - 0 - 0.10 seconds:
      expect(source.start).toHaveBeenCalledTimes(1);
      expect(source.start.mock.calls[0][0]).toBe(0);
      expect(source.start.mock.calls[0][1]).toBe(0);
      expect(source.start.mock.calls[0][2]).toBeCloseTo(2.9, 10);
      expect(window.current_jingle).toBe(1);
    });

    test('with the real two-position table every play starts from the beginning again', () => {
      window.jingle_buffer = buffer;
      window.play_jingle();
      window.play_jingle();
      window.play_jingle();
      expect(context.sources).toHaveLength(3);
      for (const source of context.sources) expect(source.start.mock.calls[0][1]).toBe(0);
      expect(window.current_jingle).toBe(1);
    });

    test('with several positions each play moves on to the next note and then wraps around', () => {
      window.jingle_buffer = buffer;
      window.jingle_positions = [0.0, 1.0, 2.5, 4.0];
      const played = [];
      for (let i = 0; i < 5; i++) {
        window.play_jingle();
        const [, from, duration] = context.sources[i].start.mock.calls[0];
        played.push([from, duration]);
      }
      // The start is 0.05 s before the position (not below 0), the length is up to the next
      // position minus that start minus 0.10 s.
      const expected = [[0, 0.9], [0.95, 1.45], [2.45, 1.45], [0, 0.9], [0.95, 1.45]];
      played.forEach(([from, duration], index) => {
        expect(from).toBeCloseTo(expected[index][0], 10);
        expect(duration).toBeCloseTo(expected[index][1], 10);
      });
      expect(window.current_jingle).toBe(2);
    });

    test('stops and disconnects the note that is still playing, in both the browser and the iOS way', () => {
      window.jingle_buffer = buffer;
      window.play_jingle();
      const [first] = context.sources;
      window.play_jingle();
      expect(first.stop).toHaveBeenCalledTimes(1);
      expect(first.noteOff).toHaveBeenCalledTimes(1);
      expect(first.disconnect).toHaveBeenCalledTimes(1);
      expect(context.sources[1]).not.toBe(first);
      expect(window.jingle_source).toBe(context.sources[1]);
    });

    test.each(['stop', 'noteOff', 'disconnect'])('a failing %s() does not prevent the next note', (method) => {
      window.jingle_buffer = buffer;
      window.play_jingle();
      const [first] = context.sources;
      first[method] = jest.fn(() => { throw new Error(method + ' not supported'); });
      expect(() => window.play_jingle()).not.toThrow();
      expect(context.sources).toHaveLength(2);
      expect(context.sources[1].start).toHaveBeenCalledTimes(1);
      // The other two ways of stopping were still tried:
      for (const other of ['stop', 'noteOff', 'disconnect'].filter((name) => name !== method)) {
        expect(first[other]).toHaveBeenCalledTimes(1);
      }
    });

    test('a note that has not been played yet is not stopped', () => {
      window.jingle_buffer = buffer;
      window.play_jingle();
      expect(context.sources[0].stop).not.toHaveBeenCalled();
      expect(context.sources[0].noteOff).not.toHaveBeenCalled();
      expect(context.sources[0].disconnect).not.toHaveBeenCalled();
    });
  });

  describe('as the reward for an achievement', () => {
    beforeEach(() => {
      window.add_event = jest.fn();
      set_globals({
        done_achievements: [], gamification_enabled: true, quiz_is_running: 0, sound_enabled: true, star_grade: 0,
      });
      window.mouseX = 0;
      window.mouseY = 0;
    });

    test('a new achievement plays the jingle when sound works', () => {
      window.jingle_buffer = { duration: 3 };
      window.achievement_done('add_graph');
      expect(context.sources).toHaveLength(1);
      expect(context.sources[0].start).toHaveBeenCalledTimes(1);
    });

    // 1 == true: "1" means that the audio context is still to be initialised, and it plays.
    test.each([0, false])('and is silent when sound_enabled is %s', (state) => {
      window.jingle_buffer = { duration: 3 };
      set_globals({ sound_enabled: state });
      window.achievement_done('add_graph');
      expect(context.sources).toHaveLength(0);
    });

    test('sound_enabled 1 (the state after one click on the sound button) also plays', () => {
      window.jingle_buffer = { duration: 3 };
      set_globals({ sound_enabled: 1 });
      window.achievement_done('add_graph');
      expect(context.sources).toHaveLength(1);
    });

    test('an achievement that is already done does not play it again', () => {
      window.jingle_buffer = { duration: 3 };
      window.achievement_done('add_graph');
      window.achievement_done('add_graph');
      expect(context.sources).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------------------------
// The achievements window and the sound button

describe('view_achievements and hide_achievements', () => {
  const box = () => document.querySelector('.achievements_box');

  beforeEach(() => {
    window.add_event = jest.fn();
    set_globals({ done_achievements: [], gamification_enabled: false, quiz_is_running: 0, nof_times_achievements_window_opened: 0 });
  });
  afterEach(() => {
    box().classList.remove('active');
    document.querySelector('.info').classList.remove('active');
    document.querySelector('.toolbox').classList.remove('active');
  });

  test('opening completes the "view_achievements" achievement, logs, closes the other windows and lists the achievements', () => {
    document.querySelector('.info').classList.add('active');
    document.querySelector('.toolbox').classList.add('active');
    window.view_achievements();
    expect(events()).toEqual(['achievement_done=view_achievements', 'view_achievements']);
    expect(global_value('done_achievements')).toEqual(['view_achievements']);
    expect(box().classList.contains('active')).toBe(true);
    expect(document.querySelector('.info').classList.contains('active')).toBe(false);
    expect(document.querySelector('.toolbox').classList.contains('active')).toBe(false);
    expect(global_value('nof_times_achievements_window_opened')).toBe(1);
    expect(box().innerHTML).toContain('Your Achievements');
    expect(box().innerHTML).toContain('checked'); // the achievement that was just done
  });

  test('opening again keeps the window open (it is closed before it is toggled) and counts the visits', () => {
    window.view_achievements();
    window.view_achievements();
    expect(box().classList.contains('active')).toBe(true);
    expect(global_value('nof_times_achievements_window_opened')).toBe(2);
    expect(events().filter((event) => event === 'achievement_done=view_achievements')).toHaveLength(1);
  });

  test('hiding logs the event and closes the window', () => {
    window.view_achievements();
    window.add_event.mockClear();
    window.hide_achievements();
    expect(events()).toEqual(['hide_achievements']);
    expect(box().classList.contains('active')).toBe(false);
  });
});

describe('toggle_sound with other values', () => {
  // The loose comparisons make the `== false` branch unreachable: false == 0 is caught first. Only a
  // value that is neither 0, false nor 1 ends in the last branch, which switches the sound off.
  test.each([2, null, 'on'])('%s -> false', (before) => {
    window.eval(`sound_enabled = ${JSON.stringify(before)}`);
    window.toggle_sound({});
    expect(global_value('sound_enabled')).toBe(false);
  });
});
