/** @jest-environment jsdom */
const { loadApp, global_value } = require('./helpers/load_app');

describe('app scripts load in a browser-like global scope', () => {
  beforeAll(() => loadApp());

  test('math.js provides the math global', () => {
    expect(typeof window.math.complex).toBe('function');
  });

  test('main.js top-level declarations are reachable', () => {
    expect(typeof global_value('bode_graph')).toBe('function');
    expect(Array.isArray(global_value('GRAPH_ORDER'))).toBe(true);
  });
});
