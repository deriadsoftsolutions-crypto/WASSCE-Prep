// End-to-end check (needs wrangler on :8788 and the Firebase emulators): a learner hands in Python that uses input(); the teacher runs it inside the marking view.
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8788';
const FS = 'http://127.0.0.1:8080/v1/projects/roboticsclass-b0eaf/databases/(default)/documents';
let fails = 0;
const check = (l, ok, x = '') => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', l, x); };
const CODE = 'temperature = float(input("Temperature in degrees C: "))\nif temperature > 25:\n    print("Move to cooler area")\nelif temperature >= 18:\n    print("Stay in place")\nelse:\n    print("Seek warmer area")\n';
const TYPED = 'My answer:\nbattery = 15\nif battery < 20:\n    print("Return to charging station")\n';
(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/roboticsclass-b0eaf/databases/(default)/documents', { method: 'DELETE' });
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/roboticsclass-b0eaf/accounts', { method: 'DELETE' });
  const b = await chromium.launch(); const errs = [];
  const mk = async (w, h) => { const c = await b.newContext({ viewport: { width: w, height: h } }); c.setDefaultTimeout(30000); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); return { c, p }; };
  const T = await mk(1280, 900);
  await T.p.goto(BASE + '/teacher'); await T.p.click('[data-mode=new]');
  await T.p.fill('input[name=name]', 'Mr Addoh'); await T.p.fill('input[name=email]', 't@k.test'); await T.p.fill('input[name=password]', 'robotics2026');
  await T.p.click('[data-submit]'); await T.p.waitForSelector('[data-uid]');
  const tuid = await T.p.locator('[data-uid]').innerText();
  await fetch(`${FS}/teachers?documentId=${tuid}`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: '{"fields":{"name":{"stringValue":"x"}}}' });
  await T.p.click('[data-act=recheck]');
  await T.p.click('[data-tab=assignments]'); await T.p.click('[data-ready]'); await T.p.click('[data-ryear="3"]'); await T.p.click('[data-addready="python-3-decisions"]'); await T.p.waitForSelector('input[name=published]');
  await T.p.check('input[name=published]'); await T.p.click('button[type=submit]'); await T.p.waitForTimeout(1500);
  const aid = (await (await fetch(`${FS}/assignments`, { headers: { Authorization: 'Bearer owner' } })).json()).documents[0].name.split('/').pop();
  const L = await mk(390, 844);
  await L.p.goto(BASE); await L.p.waitForSelector('.modal form'); await L.p.click('.modal [data-mode=new]');
  await L.p.fill('.modal input[name=name]', 'Esi Owusu'); await L.p.fill('.modal input[name=cls]', '3 Sci A');
  await L.p.fill('.modal input[name=pin]', '135790'); await L.p.fill('.modal input[name=pin2]', '135790');
  await L.p.check('.modal input[name=year][value="3"]'); await L.p.click('.modal [data-submit]'); await L.p.waitForSelector('#learner-chip:not([hidden])');
  // Learner writes code that uses input(), runs it with 30, hands it in
  await L.p.goto(BASE + `/python?for=${aid}`); await L.p.waitForSelector('[data-forbanner]:not([hidden])');
  await L.p.waitForFunction(() => document.querySelector('[data-code]').value.includes('Write your program here'));
  await L.p.fill('[data-code]', CODE);
  await L.p.evaluate(() => { const d = document.querySelector('[data-stdin]').closest('details'); if (d) d.open = true; });
  await L.p.fill('[data-stdin]', '30');
  await L.p.waitForSelector('[data-status]:has-text("ready")', { timeout: 90000 });
  await L.p.click('[data-run]'); await L.p.waitForSelector('[data-status]:has-text("Finished")');
  await L.p.click('[data-handin]'); await L.p.waitForSelector('[data-hform]');
  await L.p.fill('[data-hform] input[name=f]', 'decision_maker.py');
  await L.p.click('[data-hform] button[type=submit]'); await L.p.waitForSelector('.modal h2:has-text("Handed in")');
  // Learner also types code into the answer box
  await L.p.goto(BASE + `/assignments/${aid}`); await L.p.waitForSelector('[data-text]');
  await L.p.fill('[data-text]', TYPED); await L.p.click('[data-submit]'); await L.p.waitForTimeout(2000);
  // Teacher marks
  await T.p.reload(); await T.p.click('[data-tab=assignments]'); await T.p.waitForSelector('[data-open]'); await T.p.locator('[data-open]').first().click();
  await T.p.waitForSelector('.code-view pre');
  const view = await T.p.locator('.code-view').innerText();
  check('output file shows the input the learner typed', /Input typed \(one answer per line\):\n30\n-----/.test(view) && /Move to cooler area/.test(view), view.slice(0, 300));
  check('Run here and Open in Python practice buttons', (await T.p.locator('[data-runhere]').count()) === 1 && (await T.p.locator('[data-run]').count()) === 1);
  await T.p.click('[data-runhere]'); await T.p.waitForSelector('.py-inline');
  check('input box filled with the learner\'s input', (await T.p.inputValue('.py-inline [data-pystdin]')) === '30');
  await T.p.waitForSelector('.py-inline [data-pystatus]:has-text("ready")', { timeout: 90000 });
  await T.p.click('.py-inline [data-pyrun]'); await T.p.waitForSelector('.py-inline [data-pystatus]:has-text("Finished")');
  check('runs with 30: Move to cooler area', /Temperature in degrees C: 30\nMove to cooler area/.test(await T.p.locator('.py-inline [data-pyout]').innerText()));
  await T.p.fill('.py-inline [data-pystdin]', '10'); await T.p.click('.py-inline [data-pyrun]'); await T.p.waitForSelector('.py-inline [data-pystatus]:has-text("Finished")');
  check('teacher tries another input: 10', /Seek warmer area/.test(await T.p.locator('.py-inline [data-pyout]').innerText()));
  await T.p.fill('.py-inline [data-pycode]', 'while True:\n    pass\n'); await T.p.click('.py-inline [data-pyrun]'); await T.p.waitForTimeout(1500);
  check('stop button enabled while running', !(await T.p.locator('.py-inline [data-pystop]').isDisabled()));
  await T.p.click('.py-inline [data-pystop]');
  check('stop ends a runaway loop', /Stopped\./.test(await T.p.locator('.py-inline [data-pyout]').innerText()));
  await T.p.click('.py-inline [data-pyreset]');
  check('undo restores the learner\'s code', (await T.p.inputValue('.py-inline [data-pycode]')).startsWith('temperature = float'));
  await T.p.click('.py-inline [data-pyrun]'); await T.p.waitForSelector('.py-inline [data-pystatus]:has-text("Finished")', { timeout: 90000 });
  check('runs again after stop', /Move to cooler area/.test(await T.p.locator('.py-inline [data-pyout]').innerText()));
  // The submitted file is unchanged
  const s = (await (await fetch(`${FS}/assignments`, { headers: { Authorization: 'Bearer owner' } })).json());
  check('learner code in view unchanged', /temperature = float/.test(await T.p.locator('.code-view pre').first().innerText()));
  // Typed answer
  check('typed answer keeps its indentation', /\n    print\("Return/.test(await T.p.locator('[data-learner] .model').innerText()));
  check('typed-code button shown', (await T.p.locator('[data-runtext]').count()) === 1);
  await T.p.click('[data-runtext]'); await T.p.waitForSelector('[data-runbox="text"] .py-inline');
  await T.p.waitForSelector('[data-runbox="text"] [data-pystatus]:has-text("ready")', { timeout: 30000 });
  await T.p.fill('[data-runbox="text"] [data-pycode]', 'battery = 15\nif battery < 20:\n    print("Return to charging station")\n');
  await T.p.click('[data-runbox="text"] [data-pyrun]'); await T.p.waitForSelector('[data-runbox="text"] [data-pystatus]:has-text("Finished")');
  check('typed answer runs', /Return to charging station/.test(await T.p.locator('[data-runbox="text"] [data-pyout]').innerText()));
  await T.p.screenshot({ path: require('os').tmpdir() + '/runhere.png', fullPage: false });
  await T.p.click('[data-runhere]'); check('close the runner', (await T.p.locator('[data-runbox="0"] .py-inline').count()) === 0);
  // Mark still saves
  await T.p.fill('[data-learner] [data-mark]', '18'); await T.p.click('[data-learner] [data-save]'); await T.p.waitForSelector('[data-saved] .mark-ok');
  check('mark saved', true);
  // Phone width: no sideways scroll in marking with a runner open
  await T.p.setViewportSize({ width: 390, height: 844 }); await T.p.click('[data-runhere]'); await T.p.waitForTimeout(500);
  const sw = await T.p.evaluate(() => document.documentElement.scrollWidth); check('no sideways scroll on a phone', sw <= 390, sw);
  check('no page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('TEST FAILED', e.message); process.exit(1); });
