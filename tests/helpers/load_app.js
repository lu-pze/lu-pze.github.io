// Loads the real, unmodified classic scripts (math.js and the files in src/) into the jsdom
// window the same way a browser does: as <script> elements sharing one global
// scope. Top-level `let`/`const`/`class` therefore end up in the global lexical
// scope, reachable from tests via window.eval("name").
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function runClassicScript(source) {
  const script = document.createElement('script');
  script.textContent = source;
  document.head.appendChild(script);
}

// Minimal stand-ins for the p5.js globals that the src/ scripts call while loading.
// Drawing functions are no-ops; the numeric helpers behave like the real ones.
function installP5Stubs() {
  const noop = () => {};
  const drawing = [
    'arc', 'background', 'beginShape', 'colorMode', 'ellipse', 'endShape',
    'fill', 'line', 'noFill', 'noLoop', 'noStroke', 'pop', 'push', 'rect',
    'redraw', 'resizeCanvas', 'rotate', 'saveCanvas', 'stroke', 'strokeWeight',
    'text', 'textAlign', 'textSize', 'translate', 'vertex',
  ];
  for (const name of drawing) window[name] = noop;
  Object.assign(window, {
    CENTER: 'center', HSB: 'hsb', RIGHT: 'right',
    color: (...args) => args,
    createCanvas: () => ({ parent: noop }),
    cos: Math.cos, sin: Math.sin, max: Math.max,
    float: parseFloat,
    str: String,
    map: (value, start1, stop1, start2, stop2) =>
      start2 + ((value - start1) * (stop2 - start2)) / (stop1 - start1),
    mouseX: 0, mouseY: 0, mouseButton: 'left',
    windowWidth: 1280, windowHeight: 800,
  });
}

// The app's own scripts, in the load order given by index.html (the single source of truth).
function app_script_paths() {
  const html = read('index.html');
  return [...html.matchAll(/<script[^>]*\ssrc="(src\/[^"]+)"/g)].map((match) => match[1]);
}

// Mimic a browser parsing the page: the start-up hook in app_setup.js runs ready() at once
// unless document.readyState is 'loading', in which case it waits for DOMContentLoaded.
// Reporting 'loading' while the scripts run keeps the tests in control of when that fires.
function loadApp() {
  const html = read('index.html');
  document.body.innerHTML = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)[1];

  Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
  installP5Stubs();
  window.confetti = () => {};
  runClassicScript(read('js/math.js'));
  for (const source of app_script_paths()) runClassicScript(read(source));
  delete document.readyState;
}

// Reads a global (including top-level let/const/class) from the app's scope.
const global_value = (name) => window.eval(name);

// Assigns to existing app globals (including top-level `let`s).
function set_globals(values) {
  for (const [name, value] of Object.entries(values)) {
    window.eval(`${name} = ${JSON.stringify(value)}`);
  }
}

module.exports = { loadApp, global_value, set_globals, app_script_paths };
