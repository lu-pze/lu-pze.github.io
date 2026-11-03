module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}",
                "jest.config.js",
                "playwright.config.js"
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": "latest"
    },
    // Libraries loaded via <script> tags in index.html, plus the element with
    // id="banner" (accessed through the browser's named-element globals).
    "globals": {
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
    },
    "rules": {
        // src/ holds classic scripts: top-level functions are called by p5
        // (setup, draw, mousePressed, ...) or by inline HTML handlers, so only
        // check unused variables inside functions.
        // Event handlers take `event` by convention even when they ignore it.
        "no-unused-vars": ["error", { "vars": "local", "argsIgnorePattern": "^event$" }],
        // Drawing code wraps calls in try/catch because a graph can be deleted
        // mid-frame; swallowing that error is intentional.
        "no-empty": ["error", { "allowEmptyCatch": true }]
    }
}
