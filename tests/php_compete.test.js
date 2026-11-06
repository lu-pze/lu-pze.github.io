// Runs the real php/lu-pze_compete.php on a stored highscore file and feeds its output to the
// real client parser, so a change on either side that breaks the other fails here.
// Needs the `php` command. The file is public, so nothing but the leaderboard fields may leave it.
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { loadApp } = require('./helpers/load_app');

const SCRIPT = path.join(__dirname, '..', 'php', 'lu-pze_compete.php');
const FAKE_XFF = '198.51.100.7, 203.0.113.9';

// One stored line: what quiz_time_is_up sends, plus what the server appends to it.
const stored = ({ name = 'FRTF05_Åsa', total = '63.5', correct = 12, streak = 5, time = '2026/10/20 10:00:00', client = '', server = '' }) =>
  `T100.5;U1234567;L${name};quiz_time_is_up.click_freq=50.0,click_time=40.0,total=${total},nof_correct=${correct},` +
  `longest_streak=${streak},nof_questions=${correct},accuracy=90.00%,cookid=987654321,` +
  `qt=[{t1,r1,qclick_freq,a0.5},].${client}#ip=2001:db8::1,#ip_cip=192.0.2.1,#ip_xff=${FAKE_XFF},#ip_xf=192.0.2.2,` +
  `#ip_ff=192.0.2.3,#ip_f=for=192.0.2.4,#port=54321,#ref=https://lu-pze.github.io/?p=FRTF05,${server}#server_time=${time}.`;

function run_script(highscore_file) {
  return execFileSync('php', ['-d', 'display_errors=stderr', SCRIPT], {
    env: { ...process.env, LU_PZE_HIGHSCORES: highscore_file, REQUEST_METHOD: 'GET' },
    encoding: 'utf8',
  });
}

function output_for_file_contents(contents) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lu-pze-compete-'));
  const file = path.join(directory, 'highscores.txt');
  fs.writeFileSync(file, contents);
  try {
    return run_script(file);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
}

const public_output = (lines) => output_for_file_contents(lines.join('\n'));

beforeAll(() => loadApp());

test('the output gives the client the same scores as the stored file', () => {
  const lines = [
    stored({}),
    stored({ name: 'FRTF05_Bob', total: '70.2', correct: 15, streak: 9, time: '2026/10/26 09:00:00' }),
    stored({ name: '_NoPlace', total: '100.0', correct: 40, streak: 31, time: '2026/09/10 09:00:00' }),
  ];
  expect(window.parse_highscore_lines(public_output(lines))).toEqual(window.parse_highscore_lines(lines.join('\n')));
});

test('exactly the leaderboard fields leave the server', () => {
  expect(public_output([stored({})])).toBe(
    'T;LFRTF05_Åsa;,total=63.5,nof_correct=12,longest_streak=5,#server_time=2026/10/20 10:00:00\n');
});

test.each([
  ['an IPv6 address', '2001:db8::1'],
  ['client IP', '192.0.2.1'],
  ['every address in a forwarded list', '198.51.100.7'],
  ['the last address in a forwarded list', '203.0.113.9'],
  ['X-Forwarded', '192.0.2.2'],
  ['Forwarded-For', '192.0.2.3'],
  ['Forwarded', '192.0.2.4'],
  ['the port', '54321'],
  ['the referrer', 'lu-pze.github.io'],
  ['the cookid', '987654321'],
  ['the session id', '1234567'],
  ['the session time', '100.5'],
  ['the answer timeline', 'click_freq'],
  ['the accuracy', '90.00'],
])('%s stays private', (_, secret) => {
  expect(public_output([stored({})])).not.toContain(secret);
});

test('a line with a name that the app could not have produced is left out', () => {
  expect(public_output([stored({ name: 'x_<img src onerror=a()>' })])).toBe('');
});

test('lines that are not results are left out', () => {
  expect(public_output(['garbage', 'E1;T2;Aread_highscores;', 'T5;U9;quiz_time_is_up.total=20.0,', 'X;LFRTF05_Bob;,total=20.0,'])).toBe('');
});

test('a line with invalid text encoding is left out', () => {
  expect(output_for_file_contents(Buffer.from('T1;U1;LX_\xc3;,total=1,', 'latin1'))).toBe('');
});

test('a result with only some fields keeps those, and the client still reads them', () => {
  const output = public_output(['T1;U1;LX_Nick;quiz_time_is_up.a=1,total=20.0,#server_time=2026/10/20 10:00:00.']);
  expect(output).toBe('T;LX_Nick;,total=20.0,#server_time=2026/10/20 10:00:00\n');
  expect(window.parse_highscore_lines(output).high_total).toEqual({ X_Nick: 20 });
});

test('an old line without a server time is kept', () => {
  expect(public_output(['T1;U1;LX_Nick;quiz_time_is_up.a=1,total=20.0,'])).toBe('T;LX_Nick;,total=20.0,\n');
});

test('the client cannot choose the time that is shown: the server\'s own comes last', () => {
  const line = stored({ client: ',#server_time=2099/01/01 00:00:00,', time: '2026/10/20 10:00:00' });
  expect(public_output([line])).toContain('#server_time=2026/10/20 10:00:00\n');
});

test('a missing highscore file gives the error text', () => {
  const output = run_script(path.join(os.tmpdir(), 'lu-pze-no-such-file'));
  expect(output).toBe('Error: Highscore file does not exist.');
});

// The POST path needs a real request, so these tests run PHP's own web server on a temporary file.
describe('a result sent by POST', () => {
  const RESULT = 'T12.5;U1234567;LFRTF05_Åsa;quiz_time_is_up.click_freq=50.0,total=63.5,nof_correct=12,longest_streak=5,cookid=987,';
  const REFERER = 'https://lu-pze.github.io/?p=FRTF05';
  let server;
  let port;
  let directory;
  let file;

  const free_port = () => new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port: found } = probe.address();
      probe.close(() => resolve(found));
    });
  });

  const post = (body, headers = {}) => new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1', port, path: '/lu-pze_compete.php', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: REFERER, ...headers },
    }, (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { text += chunk; });
      response.on('end', () => resolve(text));
    });
    request.on('error', reject);
    request.end(body);
  });

  // The body the client sends: see post_compete_result in src/quiz_scoring.js.
  const form = (text) => `e=${encodeURIComponent(text).replace(/%20/g, '+')}`;

  async function wait_for_server() {
    for (let i = 0; i < 100; i++) {
      try {
        await post('');
        return;
      } catch {
        await new Promise((resolve) => { setTimeout(resolve, 50); });
      }
    }
    throw new Error('php -S did not start');
  }

  beforeAll(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lu-pze-compete-'));
    file = path.join(directory, 'highscores.txt');
    port = await free_port();
    server = spawn('php', ['-d', 'display_errors=0', '-S', `127.0.0.1:${port}`, '-t', path.dirname(SCRIPT)], {
      env: { ...process.env, LU_PZE_HIGHSCORES: file }, stdio: 'ignore',
    });
    await wait_for_server();
  });

  afterAll(() => {
    server.kill();
    fs.rmSync(directory, { recursive: true });
  });

  beforeEach(() => fs.rmSync(file, { force: true }));

  test('stores what was sent, with what the server knows about the request', async () => {
    await post(form(RESULT), { 'X-Forwarded-For': FAKE_XFF });
    const stored_lines = fs.readFileSync(file, 'utf8').split('\n');
    expect(stored_lines).toHaveLength(2);
    expect(stored_lines[1]).toBe('');
    expect(stored_lines[0].startsWith(RESULT + '#ip=127.0.0.1,')).toBe(true);
    expect(stored_lines[0]).toContain(`,#ip_xff=${FAKE_XFF},`);
    expect(stored_lines[0]).toMatch(/,#port=\d+,/);
    expect(stored_lines[0]).toContain(`,#ref=${REFERER},`);
    expect(stored_lines[0]).toMatch(/,#server_time=\d{4}\/\d\d\/\d\d \d\d:\d\d:\d\d\.$/);
  });

  test('answers with the public leaderboard only, which the client can read', async () => {
    const answer = await post(form(RESULT), { 'X-Forwarded-For': FAKE_XFF });
    expect(answer).toMatch(/^T;LFRTF05_Åsa;,total=63\.5,nof_correct=12,longest_streak=5,#server_time=[0-9/ :]+\n$/);
    for (const secret of ['127.0.0.1', FAKE_XFF, '987', REFERER]) expect(answer).not.toContain(secret);
    const parsed = window.parse_highscore_lines(answer);
    expect(JSON.stringify(parsed)).toContain('63.5');
    expect(parsed).toEqual(window.parse_highscore_lines(fs.readFileSync(file, 'utf8')));
  });

  test('adds to the results already there', async () => {
    await post(form(RESULT));
    const answer = await post(form(RESULT.replace('Åsa', 'Bob')));
    expect(fs.readFileSync(file, 'utf8').trim().split('\n')).toHaveLength(2);
    expect(answer.trim().split('\n')).toHaveLength(2);
  });

  test('a POST without a result stores nothing', async () => {
    fs.writeFileSync(file, `${stored({})}\n`);
    const before = fs.readFileSync(file, 'utf8');
    const answer = await post('other=1');
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
    expect(answer).toContain('LFRTF05_Åsa');
  });

  test('without a file and without a result the answer says so', async () => {
    expect(await post('')).toBe('Error: Highscore file does not exist.');
  });
});

