// Phone audit (see README, Testing on phones). Needs the emulators and `wrangler pages dev dist --port 8788`
// running on an emulator build (VITE_FIREBASE_EMULATOR=1 npm run build). Run: node tests/e2e/phone-audit.cjs
// Optional: W=390 H=844 for another phone size, SHOTS=0 to skip screenshots, OUT=<folder> for screenshots.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8788';
const FS = 'http://127.0.0.1:8080/v1/projects/roboticsclass-b0eaf/databases/(default)/documents';
const W = Number(process.env.W || 360), H = Number(process.env.H || 740);
const SHOTS = process.env.SHOTS !== '0';
const out = process.env.OUT || require('os').tmpdir() + '/phone-shots';
fs.mkdirSync(out, { recursive: true });
(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/roboticsclass-b0eaf/databases/(default)/documents', { method: 'DELETE' });
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/roboticsclass-b0eaf/accounts', { method: 'DELETE' });
  const b = await chromium.launch(); const errs = [];
  const phone = async () => { const c = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); c.setDefaultTimeout(20000); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(`${p.url()}: ${e.message}`)); p.on('dialog', (d) => d.accept()); return { c, p }; };
  // --- set-up (teacher on desktop) ---
  const T = await (async () => { const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); c.setDefaultTimeout(20000); const p = await c.newPage(); return { c, p }; })();
  await T.p.goto(BASE + '/teacher'); await T.p.click('[data-mode=new]');
  await T.p.fill('input[name=name]', 'Mr Addoh'); await T.p.fill('input[name=email]', 't@k.test'); await T.p.fill('input[name=password]', 'robotics2026');
  await T.p.click('[data-submit]'); await T.p.waitForSelector('[data-uid]');
  const tuid = await T.p.locator('[data-uid]').innerText();
  await fetch(`${FS}/teachers?documentId=${tuid}`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: '{"fields":{"name":{"stringValue":"x"}}}' });
  await T.p.click('[data-act=recheck]');
  await T.p.click('[data-tab=curriculum]'); await T.p.click('[data-seed]'); await T.p.waitForSelector('table.data');
  await T.p.click('[data-year="3"]'); await T.p.click('[data-publishall]'); await T.p.click('.modal [data-a=yes]'); await T.p.waitForTimeout(1500);
  await T.p.click('[data-tab=lessons]'); await T.p.click('[data-ready]'); await T.p.click('[data-addready="python-1"]'); await T.p.waitForSelector('input[name=title]');
  await T.p.check('input[name=published]'); await T.p.click('[data-save]'); await T.p.waitForSelector('table.data');
  await T.p.click('[data-tab=tests]'); await T.p.click('[data-ready]'); await T.p.click('[data-addready="python-1-check"]'); await T.p.waitForSelector('input[name=published]');
  await T.p.check('input[name=published]'); await T.p.click('[data-save]'); await T.p.waitForSelector('table.data');
  await T.p.click('[data-tab=assignments]'); await T.p.click('[data-ready]'); await T.p.click('[data-addready="python-1-reporter"]'); await T.p.waitForSelector('input[name=published]');
  await T.p.check('input[name=published]'); await T.p.locator('button[type=submit], [data-save]').first().click(); await T.p.waitForTimeout(1500);
  const ids = async (col) => (await (await fetch(`${FS}/${col}`, { headers: { Authorization: 'Bearer owner' } })).json()).documents.map((d) => d.name.split('/').pop());
  const [lessonId] = await ids('lessons'); const [testId] = await ids('assessments'); const [asgId] = await ids('assignments');
  // --- learner on a phone ---
  const L = await phone();
  await L.p.goto(BASE); await L.p.waitForSelector('.modal form');
  if (SHOTS) await L.p.screenshot({ path: `${out}/L-signin.png` });
  await L.p.click('.modal [data-mode=new]');
  if (SHOTS) await L.p.screenshot({ path: `${out}/L-signup.png`, fullPage: true });
  await L.p.fill('.modal input[name=name]', 'Esi Owusu'); await L.p.fill('.modal input[name=cls]', '3 Sci A');
  await L.p.fill('.modal input[name=pin]', '135790'); await L.p.fill('.modal input[name=pin2]', '135790');
  await L.p.check('.modal input[name=year][value="3"]'); await L.p.click('.modal [data-submit]'); await L.p.waitForSelector('#learner-chip:not([hidden])');
  const learnerRoutes = ['/', '/learn', '/learn/u3-3-2', `/lessons/${lessonId}`, '/assignments', `/assignments/${asgId}`, `/tests/${testId}`, '/portfolio', '/portfolio/print', '/profile', '/progress', '/wassce', '/mock', '/paper2', '/paper2/Q1', '/python',
    '/view?src=%2Fteaching%2Fpython-1%2FPython-1-Variables-Data-Types-Operations.pptx',
    ...Array.from({ length: 10 }, (_, i) => `/topic/${i + 1}`),
    ...[[1, 'match-components'], [1, 'sort-revolutions'], [2, 'pot-wiring'], [2, 'match-electronics'], [3, 'sensor-calibration'], [3, 'adc-slider'], [4, 'match-actuators'], [4, 'match-mechanisms'], [5, 'pid-tuner'], [5, 'loop-sorter'], [6, 'flowchart-builder'], [6, 'flowchart-symbols'], [7, 'logic-sim'], [7, 'truth-table'], [7, 'gate-identifier'], [8, 'calc-checker'], [9, 'match-locomotion'], [10, 'sort-printing']].map(([t, a]) => `/topic/${t}/${a}`)];
  const report = [];
  const audit = async (p, label) => {
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const vw = innerWidth;
      const overflow = document.documentElement.scrollWidth - vw;
      const inScroller = (el) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth) return true; } return false; };
      const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.className || el.tagName).toString().trim().slice(0, 28).replace(/\s+/g, ' ');
      const small = [...document.querySelectorAll('button, a.btn, a.back, .mainnav a, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, .option, .tile, label.btn, .tab, summary, .due-row, .act-card')]
        .filter((e) => vis(e) && !e.closest('[hidden]') && !e.closest('.modal-back[hidden]'))
        .filter((e) => { const r = e.getBoundingClientRect(); return r.height < 40 || (e.tagName === 'BUTTON' && r.width < 36); })
        .map((e) => `${name(e)}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
      const wide = [...document.querySelectorAll('main *')].filter((e) => vis(e) && !inScroller(e) && e.getBoundingClientRect().right > vw + 1 && !e.closest('.mainnav'))
        .slice(0, 4).map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]}:${Math.round(e.getBoundingClientRect().right)}`);
      const tinyInput = [...document.querySelectorAll('input, select, textarea')].filter((e) => vis(e) && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => `${e.name || e.className || e.tagName}:${getComputedStyle(e).fontSize}`).slice(0, 3);
      return { overflow, small: [...new Set(small)].slice(0, 6), wide, tinyInput };
    });
    const bad = r.overflow > 0 || r.small.length || r.wide.length || r.tinyInput.length;
    if (bad) report.push(`${label}\n    overflow=${r.overflow} small=[${r.small.join(', ')}]\n    wide=[${r.wide.join(', ')}] tinyInput=[${r.tinyInput.join(', ')}]`);
    if (SHOTS) await p.screenshot({ path: `${out}/${label.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}.png`, fullPage: true });
  };
  for (const r of learnerRoutes) { try { await L.p.goto(BASE + r); await audit(L.p, `L${r}`); } catch (e) { report.push(`L${r}\n    STEP FAILED: ${e.message.split('\n')[0]}`); } }
  // open menu states
  try { await L.p.goto(BASE + '/portfolio'); await L.p.click('[data-padd]'); await audit(L.p, 'L-portfolio-addform'); } catch (e) { report.push(`L-portfolio-addform\n    STEP FAILED: ${e.message.split('\n')[0]}`); }
  try { await L.p.goto(BASE + `/tests/${testId}`); await L.p.click('[data-start]').catch(() => {}); await L.p.click('[data-a=yes]').catch(() => {}); await L.p.waitForSelector('[data-q]').catch(() => {}); await audit(L.p, 'L-test-taking'); } catch (e) { report.push(`L-test-taking\n    STEP FAILED: ${e.message.split('\n')[0]}`); }
  // --- teacher on a phone ---
  const P = await phone();
  await P.p.goto(BASE + '/teacher'); await P.p.waitForSelector('input[name=email]'); await audit(P.p, 'T-signin');
  await P.p.fill('input[name=email]', 't@k.test'); await P.p.fill('input[name=password]', 'robotics2026'); await P.p.click('[data-submit]'); await P.p.waitForSelector('[data-tab=overview]');
  for (const tab of ['overview', 'curriculum', 'lessons', 'tests', 'assignments', 'portfolios', 'photos']) {
  try { await P.p.click(`[data-tab=${tab}]`); await P.p.waitForTimeout(1500); await audit(P.p, `T-${tab}`); } catch (e) { report.push(`step\n    STEP FAILED: ${e.message.split('\n')[0]}`); }
  }
  try { await P.p.click('[data-tab=curriculum]'); await P.p.waitForSelector('[data-edit]'); await P.p.locator('[data-edit]').first().click(); await P.p.waitForSelector('[data-uform]'); await audit(P.p, 'T-unit-editor'); } catch (e) { report.push(`T-unit-editor\n    STEP FAILED: ${e.message.split('\n')[0]}`); }
  try { await P.p.click('[data-tab=lessons]'); await P.p.waitForSelector('[data-edit]'); await P.p.locator('[data-edit]').first().click(); await P.p.waitForSelector('[data-blocks]'); await audit(P.p, 'T-lesson-editor'); } catch (e) { report.push(`T-lesson-editor\n    STEP FAILED: ${e.message.split('\n')[0]}`); }
  try { await P.p.click('[data-tab=tests]'); await P.p.waitForSelector('[data-edit]'); await P.p.locator('[data-edit]').first().click(); await P.p.waitForSelector('input[name=title]'); await audit(P.p, 'T-test-editor'); } catch (e) { report.push(`T-test-editor\n    STEP FAILED: ${e.message.split('\n')[0]}`); }
  try { await P.p.goto(BASE + '/teacher'); await P.p.click('[data-tab=tests]'); await P.p.waitForSelector('[data-results]'); await P.p.locator('[data-results]').first().click(); await P.p.waitForTimeout(1500); await audit(P.p, 'T-test-results'); } catch (e) { report.push(`T-test-results\n    STEP FAILED: ${e.message.split('\n')[0]}`); }
  try { await P.p.click('[data-tab=assignments]'); await P.p.waitForSelector('[data-open]'); await P.p.locator('[data-open]').first().click(); await P.p.waitForTimeout(1500); await audit(P.p, 'T-assignment-marking'); } catch (e) { report.push(`T-assignment-marking\n    STEP FAILED: ${e.message.split('\n')[0]}`); }
  try { await P.p.click('[data-tab=portfolios]'); await P.p.click('[data-year="3"]'); await P.p.waitForSelector('[data-popen]'); await P.p.locator('[data-popen]').first().click(); await P.p.waitForTimeout(1500); await audit(P.p, 'T-portfolio-open'); } catch (e) { report.push(`T-portfolio-open\n    STEP FAILED: ${e.message.split('\n')[0]}`); }
  console.log(report.join('\n'));
  console.log(`${W}x${H}: ${report.length} screens with issues; errors: ${errs.length}`);
  await b.close();
  process.exit(report.length || errs.length ? 1 : 0);
})().catch((e) => { console.error('AUDIT FAILED', e.message); process.exit(1); });
