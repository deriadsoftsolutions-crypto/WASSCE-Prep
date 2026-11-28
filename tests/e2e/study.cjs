// End-to-end check (needs wrangler on :8788 on an emulator build, and the Firebase emulators).
// Read budget: how many Firestore reads a learner's typical visit costs (emulator build: window.__fsReads).
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8788';
const FS = 'http://127.0.0.1:8080/v1/projects/roboticsclass-b0eaf/databases/(default)/documents';
const SETUP = !process.argv.includes('--no-setup');
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
(async () => {
  const b = await chromium.launch();
  const mk = async (w, h) => { const c = await b.newContext({ viewport: { width: w, height: h } }); c.setDefaultTimeout(30000); return { c, p: await c.newPage() }; };
  let L;
  if (SETUP) {
    await fetch('http://127.0.0.1:8080/emulator/v1/projects/roboticsclass-b0eaf/databases/(default)/documents', { method: 'DELETE' });
    await fetch('http://127.0.0.1:9099/emulator/v1/projects/roboticsclass-b0eaf/accounts', { method: 'DELETE' });
    for (const [id, name, y] of [['3scia', '3 Sci A', 3], ['3scib', '3 Sci B', 3], ['2scia', '2 Sci A', 2]]) await fetch(`${FS}/classes?documentId=${id}`, { method: 'POST', headers: owner, body: JSON.stringify({ fields: { name: { stringValue: name }, year: { integerValue: y }, retired: { booleanValue: false }, createdAt: { integerValue: 1 } } }) });
    const T = await mk(1280, 900);
    await T.p.goto(BASE + '/teacher'); await T.p.click('[data-mode=new]');
    await T.p.fill('input[name=name]', 'Mr Addoh'); await T.p.fill('input[name=email]', 't@k.test'); await T.p.fill('input[name=password]', 'robotics2026');
    await T.p.click('[data-submit]'); await T.p.waitForSelector('[data-uid]');
    const tuid = await T.p.locator('[data-uid]').innerText();
    await fetch(`${FS}/teachers?documentId=${tuid}`, { method: 'POST', headers: owner, body: '{"fields":{"name":{"stringValue":"x"}}}' });
    await T.p.click('[data-act=recheck]');
    await T.p.click('[data-tab=curriculum]'); await T.p.click('[data-seed]'); await T.p.waitForSelector('table.data');
    for (const y of ['2', '3']) { await T.p.click(`[data-year="${y}"]`); await T.p.click('[data-publishall]'); await T.p.click('.modal [data-a=yes]'); await T.p.waitForTimeout(1200); }
    const add = async (tab, key, year) => {
      await T.p.click(`[data-tab=${tab}]`); await T.p.click('[data-ready]'); await T.p.click(`[data-ryear="${year}"]`);
      await T.p.click(`[data-addready="${key}"]`); await T.p.waitForSelector('input[name=published]');
      await T.p.check('input[name=published]'); await T.p.locator('button[type=submit], [data-save]').first().click(); await T.p.waitForTimeout(1500);
    };
    for (const k of ['python-1', 'python-2', 'python-3']) await add('lessons', k, 3);
    await add('lessons', 'society-1', 2);
    for (const k of ['python-1-check', 'python-2-check', 'python-3-check', 'python-key-written']) await add('tests', k, 3);
    await add('tests', 'society-1-check', 2);
    for (const k of ['python-1-reporter', 'python-2-report', 'python-3-decisions', 'python-key-practical']) await add('assignments', k, 3);
    for (const k of ['society-1-presentation', 'society-1-edubot', 'society-1-article']) await add('assignments', k, 2);
    await T.p.waitForTimeout(4000); // the catalog is rewritten a moment after the last save
    await T.c.close();
    L = await mk(1280, 900);
    await L.p.goto(BASE); await L.p.waitForSelector('.modal select[name=cls]'); await L.p.click('.modal [data-mode=new]');
    await L.p.fill('.modal input[name=name]', 'Esi Owusu'); await L.p.selectOption('.modal select[name=cls]', '3scia');
    await L.p.fill('.modal input[name=pin]', '135790'); await L.p.fill('.modal input[name=pin2]', '135790'); await L.p.click('.modal [data-submit]'); await L.p.waitForSelector('#learner-chip:not([hidden])');
    // A term's worth of practice: 60 practice results, one assignment handed in.
    const uid = await L.p.evaluate(() => new Promise((res) => { const r = indexedDB.open('firebaseLocalStorageDb'); r.onsuccess = () => { const g = r.result.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll(); g.onsuccess = () => res(g.result.find((x) => x.value && x.value.stsTokenManager).value.uid); }; }));
    const writes = [];
    for (let i = 0; i < 60; i++) writes.push({ update: { name: `projects/roboticsclass-b0eaf/databases/(default)/documents/learners/${uid}/attempts/a${i}`, fields: { learnerId: { stringValue: uid }, learnerName: { stringValue: 'Esi Owusu' }, className: { stringValue: '3 Sci A' }, kind: { stringValue: 'topic-quiz' }, itemId: { stringValue: `quiz:${(i % 10) + 1}:q${i}` }, topicId: { integerValue: (i % 10) + 1 }, score: { integerValue: i % 2 }, max: { integerValue: 1 }, timestamp: { integerValue: Date.now() - (60 - i) * 3600e3 } } } });
    await fetch('http://127.0.0.1:8080/v1/projects/roboticsclass-b0eaf/databases/(default)/documents:commit', { method: 'POST', headers: owner, body: JSON.stringify({ writes }) });
    require('fs').writeFileSync(require('os').tmpdir() + '/reads-state.json', JSON.stringify({ uid }));
    await L.c.storageState({ path: require('os').tmpdir() + '/reads-learner.json' });
  } else {
    const c = await b.newContext({ viewport: { width: 1280, height: 900 }, storageState: require('os').tmpdir() + '/reads-learner.json' }); c.setDefaultTimeout(30000); L = { c, p: await c.newPage() };
  }
  const P = L.p;
  let fails = 0;
  const check = (l, ok, x = '') => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', l, x); };
  const total = () => P.evaluate(() => (globalThis.__fsReads ? globalThis.__fsReads.total : -1));
  const errs = []; P.on('pageerror', (e) => errs.push(e.message));
  // First visit on this device downloads the learner's history once; measure the player on a later visit.
  await P.goto(BASE); await P.waitForSelector('#learner-chip:not([hidden])'); await P.waitForTimeout(4000);
  await P.goto(BASE + '/learn/u3-3-2'); await P.waitForSelector('.sp-start'); await P.waitForTimeout(3000);
  check('unit page offers the lesson player', /Start the lesson player/.test(await P.locator('.sp-start').innerText()));
  const r0 = await total();
  await P.click('.sp-start'); await P.waitForSelector('.sp-module'); await P.waitForSelector('[data-sp-lesson] .lesson');
  const heads = await P.locator('.sp-mhead').allInnerTexts();
  check('three lessons in order', heads.length === 3 && /Python for robots 1/.test(heads[0]) && /Python for robots 3/.test(heads[2]), heads.join(' | '));
  check('first step is lesson 1, step 1 of 11', /Step 1 of 11/.test(await P.locator('[data-sp-where]').innerText()), await P.locator('[data-sp-where]').innerText());
  const steps1 = await P.locator('.sp-module.open .sp-step').allInnerTexts();
  check('lesson 1 is followed by its quick test and practical', steps1.length === 3 && /Quick test/.test(steps1[1]) && /Practical/.test(steps1[2]), steps1.join(' | ').replace(/\s+/g, ' '));
  await P.waitForFunction(() => document.querySelector('[data-sp-img]')?.naturalWidth === 1600);
  check('slides shown in the player', (await P.locator('[data-sp-count]').innerText()) === '1 / 25');
  await P.click('[data-sp-next]'); check('next slide', (await P.locator('[data-sp-count]').innerText()) === '2 / 25');
  await P.screenshot({ path: require('os').tmpdir() + '/player-desktop.png' });
  await P.click('[data-finish-btn]'); await P.waitForSelector('[data-finish] .mark-ok');
  check('finishing ticks the lesson', (await P.locator('.sp-step.here.done').count()) === 1);
  await P.click('[data-sp-fwd]'); await P.waitForSelector('.sp-task');
  check('Next goes to the quick test', /Python 1 check/.test(await P.locator('.sp-title').innerText()) && (await P.locator('.sp-task a:has-text("Open the test")').count()) === 1);
  check('URL remembers the step', /\/study\/u3-3-2\?at=t%3A/.test(P.url()), P.url());
  await P.click('[data-sp-fwd]'); await P.waitForSelector('.sp-task');
  check('then the practical', /Python 1 practical/.test(await P.locator('.sp-title').innerText()));
  await P.click('[data-sp-fwd]'); await P.waitForSelector('[data-sp-lesson] .lesson');
  check('then lesson 2 (module opens)', /Python for robots 2/.test(await P.locator('.sp-title').innerText()));
  const steps2 = await P.locator('.sp-module.open .sp-step').allInnerTexts();
  check('key assessment (Teacher Manual) follows lesson 2', steps2.some((x) => /key assessment|Key assessment/i.test(x)), steps2.join(' | ').replace(/\s+/g, ' '));
  await P.click('[data-sp-back]'); await P.waitForSelector('.sp-task');
  check('Previous goes back', /Python 1 practical/.test(await P.locator('.sp-title').innerText()));
  const playerReads = (await total()) - r0;
  check('player used few database reads', playerReads <= 6, `${playerReads} reads for opening the player and 6 steps`);
  await P.reload(); await P.waitForSelector('.sp-task');
  check('reload keeps the place', /Python 1 practical/.test(await P.locator('.sp-title').innerText()));
  // Phone
  await P.setViewportSize({ width: 390, height: 844 }); await P.goto(BASE + '/study/u3-3-2?at=' + encodeURIComponent((new URL(P.url())).searchParams.get('at')));
  await P.waitForSelector('.sp-phone-toggle summary');
  check('phone: running order folded into a bar', !(await P.locator('.sp-phone-toggle').getAttribute('open') !== null) && /Running order/.test(await P.locator('.sp-phone-toggle summary').innerText()));
  const sw = await P.evaluate(() => document.documentElement.scrollWidth); check('phone: no sideways scroll', sw <= 390, sw);
  await P.screenshot({ path: require('os').tmpdir() + '/player-phone.png' });
  await P.click('.sp-phone-toggle summary'); await P.waitForTimeout(300); await P.screenshot({ path: require('os').tmpdir() + '/player-phone-open.png' });
  await P.click('.sp-step >> nth=0');
  await P.waitForSelector('[data-sp-lesson] .lesson'); await P.waitForTimeout(800);
  await P.screenshot({ path: require('os').tmpdir() + '/player-phone-lesson.png' });
  check('no page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await b.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
