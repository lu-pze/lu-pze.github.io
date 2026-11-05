const js = require('@eslint/js');
const globals = require('globals');

// Libraries loaded via <script> tags in index.html, plus the element with
// id="banner" (accessed through the browser's named-element globals).
const app_libraries = {
    "confetti": "readonly",
    "math": "readonly",
    "banner": "readonly",
    // p5.js global mode
    "CENTER": "readonly", "HSB": "readonly", "RIGHT": "readonly",
    "arc": "readonly", "background": "readonly", "beginShape": "readonly",
    "color": "readonly", "colorMode": "readonly", "cos": "readonly",
    "createCanvas": "readonly", "ellipse": "readonly", "endShape": "readonly",
    "fill": "readonly", "float": "readonly", "line": "readonly",
    "map": "readonly", "max": "readonly", "mouseButton": "readonly",
    "mouseX": "readonly", "mouseY": "readonly", "noFill": "readonly",
    "noLoop": "readonly", "noStroke": "readonly", "pop": "readonly",
    "push": "readonly", "rect": "readonly", "redraw": "readonly",
    "resizeCanvas": "readonly", "rotate": "readonly", "saveCanvas": "readonly",
    "sin": "readonly", "str": "readonly", "stroke": "readonly",
    "strokeWeight": "readonly", "text": "readonly", "textAlign": "readonly",
    "textSize": "readonly", "translate": "readonly", "vertex": "readonly",
    "windowHeight": "readonly", "windowWidth": "readonly"
};

// Globals of the src/ scripts, used inside page.evaluate() callbacks (they run in the browser).
// Add a name here when a spec first reads it.
const app_globals_in_e2e = {
    "bode_graphs": "readonly", "splash_screen_active": "readonly", "start_quiz": "readonly",
    "range_slider_variables": "readonly", "variable_position": "readonly", "done_achievements": "readonly",
    "pole_zero_graph_x": "readonly", "pole_zero_graph_y": "readonly",
    "pole_zero_width": "readonly", "pole_zero_height": "readonly",
    "graph_bode_mag_x": "readonly", "graph_bode_mag_y": "readonly",
    "graph_bode_mag_x_offset": "readonly", "graph_bode_mag_y_offset": "readonly",
    "graph_bode_mag_width": "readonly", "graph_bode_mag_height": "readonly",
    "graph_step_response_x": "readonly", "graph_step_response_y": "readonly",
    "graph_step_response_x_offset": "readonly", "graph_step_response_y_offset": "readonly",
    "graph_step_response_width": "readonly", "graph_step_response_height": "readonly",
    "gain_upper_bound": "readonly", "y_case_gain": "readonly", "precision": "readonly",
    "min_y_timerep": "readonly", "max_y_timerep": "readonly", "map": "readonly",
    "clicked_on_bode_mag_graph_no": "readonly", "clicked_on_time_response_graph_no": "readonly",
    "set_difficulty_level": "readonly", "quiz_questions": "readonly", "enabled_quiz_types": "readonly",
    "quiz_lets_go_practice": "readonly", "current_quiz": "readonly", "quiz_freq": "readonly",
    "quiz_nof_correct": "readonly", "quiz_nof_tries": "readonly", "quiz_current_streak": "readonly",
    "quiz_timeline": "readonly"
};

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            // Classic scripts and CommonJS. The flat-config default for .js is "module".
            sourceType: "script",
            globals: { ...globals.browser, ...app_libraries }
        },
        rules: {
            // src/ holds classic scripts: top-level functions are called by p5
            // (setup, draw, mousePressed, ...) or by inline HTML handlers, so only
            // check unused variables inside functions.
            // Event handlers take `event` by convention even when they ignore it.
            // A caught error is often not read: the catch only stops the frame from failing.
            "no-unused-vars": ["error", { "vars": "local", "argsIgnorePattern": "^event$", "caughtErrors": "none" }],
            // Drawing code wraps calls in try/catch because a graph can be deleted
            // mid-frame; swallowing that error is intentional.
            "no-empty": ["error", { "allowEmptyCatch": true }]
        }
    },
    {
        // Old code breaks these rules, so they are warnings, and tools/lint.js
        // fails when their counts rise. New code in src/ must not add to them.
        files: ["src/**/*.js"],
        rules: {
            "eqeqeq": ["warn", "always"],
            "no-useless-assignment": "warn",
            "max-lines-per-function": ["warn", { "max": 100, "skipBlankLines": true, "skipComments": true }]
        }
    },
    {
        files: ["tests/**/*.js", "tools/**/*.js", "e2e/**/*.js", "*.config.js"],
        languageOptions: { sourceType: "commonjs", globals: globals.node }
    },
    {
        files: ["tests/**/*.js"],
        languageOptions: { globals: globals.jest }
    },
    {
        files: ["e2e/**/*.js"],
        languageOptions: { globals: app_globals_in_e2e }
    }
];
