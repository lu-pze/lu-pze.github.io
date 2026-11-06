// Lints all files in src/ as ONE program. The app is a set of classic scripts sharing
// one global scope, so linting files one by one would report every cross-file reference
// as undefined. Files are concatenated in the load order given by index.html and
// reported line numbers are mapped back to file:line.
const fs = require('fs');
const path = require('path');
const { ESLint } = require('eslint');

// Warnings are old code that was not rewritten at once (a blind `==` to `===` can change
// behaviour). These counts may only fall: lint fails above a ceiling, whatever --quiet says.
// Lower a ceiling when the count falls; never raise one.
const WARNING_CEILINGS = { eqeqeq: 352, 'max-lines-per-function': 1, 'no-useless-assignment': 6 };

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script[^>]*\ssrc="(src\/[^"]+)"/g)].map((match) => match[1]);

let text = '';
const starts = []; // [first line in concatenation (1-based), file]
let line_count = 0;
for (const file of files) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  starts.push([line_count + 1, file]);
  text += content;
  line_count += content.split('\n').length - 1;
}

function locate(line) {
  let hit = starts[0];
  for (const start of starts) if (start[0] <= line) hit = start;
  return `${hit[1]}:${line - hit[0] + 1}`;
}

(async () => {
  const eslint = new ESLint({ cwd: root });
  const [result] = await eslint.lintText(text, { filePath: path.join(root, 'src', 'all.js') });
  const quiet = process.argv.includes('--quiet');
  const messages = result.messages.filter((m) => !quiet || m.severity === 2);
  for (const m of messages) {
    console.log(`${locate(m.line)}:${m.column}  ${m.severity === 2 ? 'error' : 'warning'}  ${m.message}  ${m.ruleId || ''}`);
  }
  console.log(`${files.length} files, ${messages.length} problem(s)`);
  let above_ceiling = false;
  for (const [rule, ceiling] of Object.entries(WARNING_CEILINGS)) {
    const count = result.messages.filter((m) => m.ruleId === rule && m.severity === 1).length;
    if (count > ceiling) {
      above_ceiling = true;
      console.log(`${rule}: ${count} warnings, the ceiling is ${ceiling}. Run node tools/lint.js to list them.`);
    } else if (count < ceiling) {
      console.log(`${rule}: ${count} warnings, so lower its ceiling in tools/lint.js from ${ceiling}.`);
    }
  }
  process.exit(above_ceiling || messages.some((m) => m.severity === 2) ? 1 : 0);
})();
