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
  const total = () => P.evaluate(() => (globalThis.__fsReads ? globalThis.__fsReads.total : -1));
  const steps = [];
  const step = async (name, fn, fresh = false) => { const before = fresh ? 0 : await total(); await fn(); await P.waitForTimeout(3500); const after = await total(); steps.push([name, after - before]); };
  const visit = async (label) => {
    await step(`${label}: open the site (Home)`, async () => { await P.goto(BASE); await P.waitForSelector('#learner-chip:not([hidden])'); }, true);
    await step(`${label}: Classwork`, async () => { await P.click('[data-nav=assignments]'); await P.waitForSelector('#cw-todo'); });
    await step(`${label}: open a lesson`, async () => { await P.click('section:has(#cw-lessons) .due-row'); await P.waitForSelector('.lesson'); });
    await step(`${label}: Learn`, async () => { await P.click('[data-nav=learn]'); await P.waitForTimeout(500); });
    await step(`${label}: Progress`, async () => { await P.click('[data-nav=progress]'); await P.waitForTimeout(500); });
    await step(`${label}: back to Classwork`, async () => { await P.click('[data-nav=assignments]'); await P.waitForSelector('#cw-todo'); });
  };
  await visit('Visit 1');
  await visit('Visit 2 (same day)');
  let sum = 0; for (const [n, r] of steps) { sum += r; console.log(String(r).padStart(5), ' ', n); }
  console.log(String(sum).padStart(5), '   TOTAL for two visits');
  console.log(JSON.stringify(await P.evaluate(() => globalThis.__fsReads.byPath)));
  console.log('progress page says:', (await P.locator('main').innerText()).match(/\d+ attempts saved/)?.[0]);
  await b.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
