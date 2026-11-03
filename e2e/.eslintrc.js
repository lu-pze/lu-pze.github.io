module.exports = {
    "env": { "node": true },
    "parserOptions": { "sourceType": "script" },
    // Globals of main.js, used inside page.evaluate() callbacks (they run in the browser).
    "globals": { "bode_graphs": "readonly", "splash_screen_active": "readonly", "start_quiz": "readonly" }
};
