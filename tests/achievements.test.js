// Characterization tests for the achievement logic in src/achievements_sound.js.
const { loadApp, global_value, set_globals } = require('./helpers/load_app');

const SPYABLE = ['add_event', 'play_jingle'];
const originals = {};

const TOTAL = () => Object.keys(global_value('all_achievements')).length;
// The first n achievement ids, as a done_achievements value.
const first_n_ids = (n) => Object.keys(global_value('all_achievements')).slice(0, n);

beforeAll(() => {
  loadApp();
  for (const name of SPYABLE) originals[name] = window[name];
});

beforeEach(() => {
  for (const name of SPYABLE) window[name] = jest.fn();
  set_globals({
    done_achievements: [], gamification_enabled: false, quiz_is_running: 0, sound_enabled: 0,
    star_grade: 0, improvement_enabled: false,
  });
  window.mouseX = 0;
  window.mouseY = 0;
});

afterEach(() => {
  for (const name of SPYABLE) window[name] = originals[name];
});

const box = () => document.querySelector('.achievements_box').innerHTML;

describe('toggle_gamification', () => {
  test('shows and hides the menu star', () => {
    const star = document.getElementById('show_achievements');
    window.toggle_gamification({});
    expect(global_value('gamification_enabled')).toBe(true);
    expect(star.style.display).toBe('inline');
    window.toggle_gamification({});
    expect(global_value('gamification_enabled')).toBe(false);
    expect(star.style.display).toBe('none');
  });
});

describe('toggle_sound', () => {
  // The states are 0/1 (audio context not initialised yet) and false/true (initialised). Toggling
  // cycles 0 <-> 1 before the first press, and true <-> false (muted, context kept) afterwards.
  test.each([[0, 1], [1, 0], [false, true], [true, false]])('%s -> %s', (before, after) => {
    set_globals({ sound_enabled: before });
    window.toggle_sound({});
    expect(global_value('sound_enabled')).toBe(after);
  });
});

describe('achievement_done', () => {
  test('a new achievement is recorded, logged and scored once', () => {
    window.achievement_done('add_graph');
    window.achievement_done('add_graph');
    expect(global_value('done_achievements')).toEqual(['add_graph']);
    expect(window.add_event).toHaveBeenCalledTimes(1);
    expect(window.add_event).toHaveBeenCalledWith('achievement_done=add_graph');
    expect(global_value('achievement_score')).toBeCloseTo(100 / TOTAL(), 10);
  });

  test('is ignored while a quiz is running', () => {
    set_globals({ quiz_is_running: 1 });
    window.achievement_done('add_graph');
    expect(global_value('done_achievements')).toEqual([]);
    expect(window.add_event).not.toHaveBeenCalled();
  });

  test('without gamification there is no popup text and no jingle', () => {
    set_globals({ sound_enabled: true });
    window.achievement_done('add_graph');
    expect(document.getElementById('achievement_text').innerHTML).toBe('');
    expect(window.play_jingle).not.toHaveBeenCalled();
  });

  test('with gamification the popup shows the achievement text near the mouse', () => {
    set_globals({ gamification_enabled: true });
    window.mouseX = 640; // half of the 1280 px wide window
    window.mouseY = 200; // a quarter of the 800 px high window
    window.achievement_done('drag_zero');
    expect(document.getElementById('achievement_text').innerHTML).toBe(global_value('all_achievements').drag_zero);
    const style = document.querySelector('.achievement_text').style;
    expect(style.getPropertyValue('--left')).toBe('50%');
    expect(style.getPropertyValue('--top')).toBe('25%');
    expect(document.querySelector('.achievement_star').style.getPropertyValue('--left')).toBe('50%');
    expect(window.play_jingle).not.toHaveBeenCalled(); // sound_enabled is 0
  });

  test('the popup is kept at most 85% from the left and plays the jingle when sound works', () => {
    set_globals({ gamification_enabled: true, sound_enabled: true });
    window.mouseX = 1280;
    window.achievement_done('drag_zero');
    expect(document.querySelector('.achievement_text').style.getPropertyValue('--left')).toBe('85%');
    expect(window.play_jingle).toHaveBeenCalledTimes(1);
  });

  test('the popup is kept at most 90% from the top, without moving it sideways', () => {
    set_globals({ gamification_enabled: true });
    window.mouseX = 320; // a quarter of the window width
    window.mouseY = 800;
    window.achievement_done('drag_zero');
    const style = document.querySelector('.achievement_text').style;
    expect(style.getPropertyValue('--left')).toBe('25%');
    expect(style.getPropertyValue('--top')).toBe('90%');
  });
});

describe('update_achievements', () => {
  const update_with = (n) => {
    set_globals({ done_achievements: first_n_ids(n) });
    window.update_achievements();
  };

  test('score is the percentage of achievements done', () => {
    update_with(5);
    expect(global_value('achievement_score')).toBeCloseTo(100 * 5 / TOTAL(), 10);
    expect(box()).toContain(`Your Score: <b>${(100 * 5 / TOTAL()).toFixed(1)}/100</b>`);
    expect(document.getElementById('star_0_text').innerHTML).toBe(`5/${TOTAL()}&nbsp;`);
  });

  // With 24 achievements one achievement is 100/24 = 4.1667 points.
  const POINTS = (n) => 100 * n / 24;
  test.each([
    [0, 'Automatic Control Newbie', 5 - POINTS(0)],
    [1, 'Automatic Control Newbie', 5 - POINTS(1)],
    [2, 'Automatic Control 初心者 Shoshinsha', 10 - POINTS(2)],
    [4, 'Automatic Control Wannabe', 25 - POINTS(4)],
    [10, 'Automatic Control Citizen', 50 - POINTS(10)],
    [23, 'Automatic Control Guru', 99 - POINTS(23)],
  ])('%s done: rank "%s", %s points to the next one', (n, rank, to_next) => {
    expect(TOTAL()).toBe(24); // update the table above when achievements are added
    update_with(n);
    expect(global_value('achievement_rank')).toBe(rank);
    expect(global_value('achievement_score_to_next_rank')).toBeCloseTo(to_next, 10);
    expect(box()).toContain(`Your Rank: <b>${rank}</b>`);
    expect(box()).toContain(`Level up with another ${to_next.toFixed(1)} points`);
  });

  test('all done: top rank and the congratulation instead of a to-do list', () => {
    update_with(TOTAL());
    expect(global_value('achievement_rank')).toBe('Automatic Control Legend');
    expect(box()).toContain("Well done! You're one in a million, Legend.");
    expect(box()).not.toContain('Level up with another');
    expect(box()).not.toContain("onclick='return false;'");
  });

  test('lists completed achievements as checked boxes that reset on click, and the rest as locked boxes', () => {
    update_with(2);
    const [first, second] = first_n_ids(2);
    expect(box()).toContain(`<input type="checkbox" checked="" onclick="reset_achievement(&quot;${first}&quot;);">`);
    expect(box()).toContain(`reset_achievement(&quot;${second}&quot;)`);
    expect(box().match(/onclick="return false;"/g)).toHaveLength(TOTAL() - 2);
  });

  // Star badge: black below 15 points, bronze below 50, silver below 98, gold from 98.
  test.each([[3, 0], [4, 1], [11, 1], [12, 2], [23, 2], [24, 3]])('%s done -> star grade %s', (n, grade) => {
    update_with(n);
    expect(global_value('star_grade')).toBe(grade);
    if (grade > 0) expect(document.getElementById('star_0').getAttribute('src')).toBe(`images/star_${grade}.webp`);
  });
});

describe('reset_achievement', () => {
  test('removes a done achievement and rescores', () => {
    set_globals({ done_achievements: ['add_graph', 'drag_pole'] });
    window.reset_achievement('add_graph');
    expect(global_value('done_achievements')).toEqual(['drag_pole']);
    expect(global_value('achievement_score')).toBeCloseTo(100 / TOTAL(), 10);
  });

  test('an achievement that is not done is left alone', () => {
    set_globals({ done_achievements: ['drag_pole'] });
    window.reset_achievement('add_graph');
    expect(global_value('done_achievements')).toEqual(['drag_pole']);
  });
});
