// Browser tests that drive the real mouse: dragging poles/zeros and curves, and answering a
// quiz question. They check the slider variables the app keeps, not pixels.
const { test, expect } = require('@playwright/test');
const { block_production, open_app, start_from_splash, move_to_canvas } = require('./helpers');

test.beforeEach(async ({ page }) => block_production(page));

// Index in bode_graphs of the graph with the given preset (e.g. 'GRAPH_ONE_REAL_POLE').
const graph_index = (page, preset) =>
  page.evaluate((name) => bode_graphs.findIndex((graph) => graph.bode_formula === window.eval(name).formula), preset);

const variable = (page, name) =>
  page.evaluate((n) => range_slider_variables[variable_position[n]], name);

const achievements = (page) => page.evaluate(() => done_achievements);

// Canvas position of a point (real, imaginary) in the pole-zero map of graph i.
const pole_zero_point = (page, i, real, imaginary) =>
  page.evaluate(([graph, re, im]) => ({
    x: pole_zero_graph_x[graph] + ((re + 3) / 4) * pole_zero_width,
    y: pole_zero_graph_y[graph] + ((2 - im) / 4) * pole_zero_height,
  }), [i, real, imaginary]);

// A point inside the pole-zero map of graph i that the canvas receives clicks at (the slider
// panels on the right cover parts of the maps, and a math-field swallows mouse presses), as close
// as possible to the wanted (real, imaginary). Returns canvas coordinates and the actual pole
// position the app will read from them.
const free_pole_zero_point = (page, i, real, imaginary) =>
  page.evaluate(([graph, wanted_re, wanted_im]) => {
    const canvas_box = document.querySelector('#sketch_holder canvas').getBoundingClientRect();
    let best = null;
    for (let re = -3; re <= 1; re += 0.05) {
      for (let im = -2; im <= 2; im += 0.05) {
        // The browser reports whole pixels, so work with those.
        const x = Math.round(pole_zero_graph_x[graph] + ((re + 3) / 4) * pole_zero_width);
        const y = Math.round(pole_zero_graph_y[graph] + ((2 - im) / 4) * pole_zero_height);
        const hit = document.elementFromPoint(canvas_box.left + x, canvas_box.top + y);
        if (!hit || hit.closest('math-field')) continue;
        const distance = Math.hypot(re - wanted_re, im - wanted_im);
        if (best === null || distance < best.distance) {
          best = { x, y, distance, real: (x - pole_zero_graph_x[graph]) / pole_zero_width * 4 - 3,
                   imaginary: 2 - (y - pole_zero_graph_y[graph]) / pole_zero_height * 4 };
        }
      }
    }
    return best;
  }, [i, real, imaginary]);

async function start(page) {
  const errors = await open_app(page);
  await start_from_splash(page);
  // Let the freshly added graphs finish their first calculations and frames.
  await page.waitForTimeout(300);
  return errors;
}

test.describe('pole-zero map', () => {
  test('a drag that starts outside the maps does not move a pole or crash', async ({ page }) => {
    const errors = await open_app(page);
    await start_from_splash(page);
    const one_pole = await graph_index(page, 'GRAPH_ONE_REAL_POLE');
    const two_poles = await graph_index(page, 'GRAPH_TWO_REAL_POLES');
    const [one_pole_point, two_poles_point] = [
      await free_pole_zero_point(page, one_pole, -2, 1), await free_pole_zero_point(page, two_poles, -2, 1)];
    const T_1 = await variable(page, 'T_1');
    await move_to_canvas(page, one_pole_point.x, 5); // just above the maps
    await page.mouse.down();
    await move_to_canvas(page, one_pole_point.x, one_pole_point.y, { steps: 3 });
    await move_to_canvas(page, two_poles_point.x, two_poles_point.y, { steps: 3 });
    await page.mouse.up();
    expect(await variable(page, 'T_1')).toBe(T_1);
    expect(errors).toEqual([]);
  });

  test('dragging the pole of a one-real-pole graph sets its time constant', async ({ page }) => {
    const errors = await start(page);
    const i = await graph_index(page, 'GRAPH_ONE_REAL_POLE');
    expect(i).toBeGreaterThanOrEqual(0);

    // Pole at s = -2 means T = 0.5.
    const start_point = await pole_zero_point(page, i, -2, 0);
    await move_to_canvas(page, start_point.x, start_point.y);
    await page.mouse.down();
    expect(await variable(page, 'T_1')).toBeCloseTo(0.5, 2);
    expect(await achievements(page)).toContain('drag_pole');

    // Drag it to s = -0.5, which is T = 2. The slider and its number field follow.
    const end_point = await pole_zero_point(page, i, -0.5, 0);
    await move_to_canvas(page, end_point.x, end_point.y, { steps: 8 });
    expect(await variable(page, 'T_1')).toBeCloseTo(2, 1);
    // The slider's number field and range input follow (their ids use the variable's letter).
    const fields = await page.evaluate(() => ({
      number: document.getElementById('variable_' + variable_position.T_1).value,
      range: document.getElementById('RANGE_' + variable_position.T_1).value,
    }));
    expect(parseFloat(fields.number)).toBeCloseTo(2, 1);
    expect(parseFloat(fields.range)).toBeCloseTo(2, 1);
    expect(await achievements(page)).not.toContain('drag_pole_to_right_half_plane');

    // Into the right half plane: T turns negative.
    const unstable = await pole_zero_point(page, i, 1, 0);
    await move_to_canvas(page, unstable.x, unstable.y, { steps: 8 });
    expect(await variable(page, 'T_1')).toBeLessThan(0);
    expect(await achievements(page)).toContain('drag_pole_to_right_half_plane');

    await page.mouse.up();
    expect(errors).toEqual([]);
  });

  test('dragging the complex poles sets w (distance from origin) and z (damping)', async ({ page }) => {
    const errors = await start(page);
    const i = await graph_index(page, 'GRAPH_TWO_COMPLEX_POLES');
    expect(i).toBeGreaterThanOrEqual(0);

    // w is the distance of the pole from the origin and z = -re / w (the pole is mirrored into the
    // upper half plane and clamped to the left half plane).
    const expected = ({ real, imaginary }) => {
      const re = Math.min(real, 0);
      const w = Math.hypot(re, imaginary);
      return { w, z: -re / w };
    };

    const point = await free_pole_zero_point(page, i, -1, 1);
    await move_to_canvas(page, point.x, point.y);
    await page.mouse.down();
    expect(await variable(page, 'w')).toBeCloseTo(expected(point).w, 5);
    expect(await variable(page, 'z')).toBeCloseTo(expected(point).z, 5);
    expect(await achievements(page)).toEqual(expect.arrayContaining(['drag_pole', 'drag_complex_pole']));

    // Drag to a pole close to the imaginary axis: much less damping.
    const near_axis = await free_pole_zero_point(page, i, -0.1, 1.5);
    await move_to_canvas(page, near_axis.x, near_axis.y, { steps: 6 });
    expect(await variable(page, 'w')).toBeCloseTo(expected(near_axis).w, 5);
    expect(await variable(page, 'z')).toBeCloseTo(expected(near_axis).z, 5);
    expect(await variable(page, 'z')).toBeLessThan(expected(point).z);

    await page.mouse.up();
    expect(errors).toEqual([]);
  });
});

test.describe('dragging curves', () => {
  // Canvas position of the curve of graph i at the horizontal middle of the given plot.
  const curve_point = (page, i, plot) =>
    page.evaluate(([graph, which]) => {
      if (which === 'bode_mag') {
        const x_index = Math.round(graph_bode_mag_width / 2);
        const linked_y = bode_graphs[graph].bode_gain_array[x_index];
        const screen_y = graph_bode_mag_y_offset
          + map(linked_y, gain_upper_bound - 20 * y_case_gain, gain_upper_bound, graph_bode_mag_height, 0);
        return { x: graph_bode_mag_x + graph_bode_mag_x_offset + x_index, y: graph_step_response_y + screen_y };
      }
      const x_index = Math.round(graph_step_response_width / 4 / precision);
      const linked_y = bode_graphs[graph].bode_timerep_array[x_index];
      const screen_y = map(linked_y, min_y_timerep, max_y_timerep, graph_step_response_height, 0, true)
        + graph_step_response_y_offset;
      return {
        x: graph_step_response_x + graph_step_response_x_offset + x_index * precision,
        y: graph_step_response_y + screen_y,
      };
    }, [i, plot]);

  test('dragging a curve in the Bode magnitude plot changes T (sideways) and k (up/down)', async ({ page }) => {
    const errors = await start(page);
    const i = await graph_index(page, 'GRAPH_ONE_REAL_POLE');
    const T_before = await variable(page, 'T_1');
    const k_before = await variable(page, 'k_1');

    const point = await curve_point(page, i, 'bode_mag');
    await move_to_canvas(page, point.x, point.y);
    await page.mouse.down();
    expect(await page.evaluate(() => clicked_on_bode_mag_graph_no)).toBe(i);
    // Right and up: T = T * (1 - dx * 10 / width) shrinks, k = k * (1 - dy * 12 / height) grows.
    await move_to_canvas(page, point.x + 40, point.y - 30, { steps: 8 });
    await page.mouse.up();

    expect(await variable(page, 'T_1')).toBeLessThan(T_before);
    expect(await variable(page, 'k_1')).toBeGreaterThan(k_before);
    expect(await achievements(page)).toContain('drag_bode_mag');
    expect(errors).toEqual([]);
  });

  test('dragging a curve in the step response changes T (sideways) and k (up/down)', async ({ page }) => {
    const errors = await start(page);
    const i = await graph_index(page, 'GRAPH_ONE_REAL_POLE');
    const T_before = await variable(page, 'T_1');
    const k_before = await variable(page, 'k_1');

    const point = await curve_point(page, i, 'step_response');
    await move_to_canvas(page, point.x, point.y);
    await page.mouse.down();
    expect(await page.evaluate(() => clicked_on_time_response_graph_no)).toBe(i);
    // Right makes T larger (a slower response), up makes k larger.
    await move_to_canvas(page, point.x + 30, point.y - 20, { steps: 8 });
    await page.mouse.up();

    expect(await variable(page, 'T_1')).toBeGreaterThan(T_before);
    expect(await variable(page, 'k_1')).toBeGreaterThan(k_before);
    expect(errors).toEqual([]);
  });

  test('releasing the mouse stops the dragging', async ({ page }) => {
    await start(page);
    const i = await graph_index(page, 'GRAPH_ONE_REAL_POLE');
    const point = await curve_point(page, i, 'bode_mag');
    await move_to_canvas(page, point.x, point.y);
    await page.mouse.down();
    await move_to_canvas(page, point.x + 20, point.y, { steps: 4 });
    await page.mouse.up();
    const T_after_release = await variable(page, 'T_1');
    await move_to_canvas(page, point.x + 80, point.y, { steps: 4 });
    expect(await variable(page, 'T_1')).toBe(T_after_release);
  });
});

test.describe('answering a quiz question', () => {
  // Starts a practice quiz in which only the "click_freq" question is asked, at difficulty 0,
  // where clicking on any Bode plot is the right answer.
  async function start_easy_frequency_quiz(page) {
    await page.evaluate(() => {
      set_difficulty_level({ value: '0' });
      for (const question of quiz_questions) enabled_quiz_types[question] = question === 'click_freq';
      quiz_lets_go_practice();
    });
    await expect.poll(() => page.evaluate(() => current_quiz)).toBe('click_freq');
    expect(await page.evaluate(() => quiz_freq)).toBe(0);
  }

  const quiz_state = (page) =>
    page.evaluate(() => ({
      correct: quiz_nof_correct, tries: quiz_nof_tries, streak: quiz_current_streak, timeline: quiz_timeline.length,
    }));

  // Canvas positions of the middle of the Bode magnitude plot and of the step response plot.
  const bode_mag_middle = (page) =>
    page.evaluate(() => ({
      x: graph_bode_mag_x + graph_bode_mag_x_offset + graph_bode_mag_width / 2,
      y: graph_bode_mag_y + graph_bode_mag_y_offset + graph_bode_mag_height / 2,
    }));
  const step_response_middle = (page) =>
    page.evaluate(() => ({
      x: graph_step_response_x + graph_step_response_x_offset + graph_step_response_width / 2,
      y: graph_step_response_y + graph_step_response_y_offset + graph_step_response_height / 2,
    }));

  test('a right click scores, a wrong click explains why', async ({ page }) => {
    const errors = await start(page);
    await start_easy_frequency_quiz(page);
    expect(await quiz_state(page)).toEqual({ correct: 0, tries: 0, streak: 0, timeline: 0 });

    // The Bode magnitude plot is accepted at this level.
    const bode = await bode_mag_middle(page);
    await move_to_canvas(page, bode.x, bode.y);
    await page.mouse.down();
    await page.mouse.up();
    await expect.poll(() => quiz_state(page)).toEqual({ correct: 1, tries: 1, streak: 1, timeline: 1 });

    // The step response is not a frequency plot.
    await page.waitForTimeout(200); // the next question is set up 50 ms after a correct answer
    const step = await step_response_middle(page);
    await move_to_canvas(page, step.x, step.y);
    await page.mouse.down();
    await page.mouse.up();
    await expect.poll(() => quiz_state(page)).toEqual({ correct: 1, tries: 2, streak: 0, timeline: 2 });
    await expect(page.locator('#quiz_answer')).toContainText('The time response of a system shows the amplitude');
    expect(await page.evaluate(() => quiz_timeline.map((answer) => answer.a))).toEqual([1, 0]);
    expect(errors).toEqual([]);
  });

  test('the quiz does not hand out achievements while it runs', async ({ page }) => {
    await start(page);
    await page.evaluate(() => { done_achievements.length = 0; });
    await start_easy_frequency_quiz(page);
    const step = await step_response_middle(page);
    await move_to_canvas(page, step.x, step.y);
    await page.mouse.down();
    await page.mouse.up();
    expect(await achievements(page)).toEqual([]);
  });
});
