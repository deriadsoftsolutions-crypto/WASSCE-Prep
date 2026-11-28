// End-to-end check (needs wrangler on :8788 on an emulator build, and the Firebase emulators).
// Rules: a learner in a fixed class cannot change their class or year; older accounts can still set their year.
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8788';
const FS = 'http://127.0.0.1:8080/v1/projects/roboticsclass-b0eaf/databases/(default)/documents';
let fails = 0;
const check = (l, ok, x = '') => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', l, x); };
(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/roboticsclass-b0eaf/databases/(default)/documents', { method: 'DELETE' });
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/roboticsclass-b0eaf/accounts', { method: 'DELETE' });
  // a class, written as the owner
  await fetch(`${FS}/classes?documentId=2scia`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { name: { stringValue: '2 Sci A' }, year: { integerValue: 2 }, retired: { booleanValue: false }, aliases: { arrayValue: {} }, createdAt: { integerValue: 1 } } }) });
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  // anyone can read the class list without signing in
  const anon = await fetch(`${FS}/classes`); check('class list readable before sign-in', anon.status === 200);
  const anonWrite = await fetch(`${FS}/classes?documentId=hack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"fields":{"name":{"stringValue":"x"}}}' });
  check('class list not writable by the public', anonWrite.status === 403, anonWrite.status);
  await p.goto(BASE); await p.waitForSelector('.modal select[name=cls]'); await p.click('.modal [data-mode=new]');
  await p.fill('.modal input[name=name]', 'Ama Boateng'); await p.selectOption('.modal select[name=cls]', '2scia');
  await p.fill('.modal input[name=pin]', '135790'); await p.fill('.modal input[name=pin2]', '135790'); await p.click('.modal [data-submit]'); await p.waitForSelector('#learner-chip:not([hidden])');
  const { uid, token } = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('firebaseLocalStorageDb'); r.onsuccess = () => { const g = r.result.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll(); g.onsuccess = () => { const v = g.result.find((x) => x.value && x.value.stsTokenManager).value; res({ uid: v.uid, token: v.stsTokenManager.accessToken }); }; }; }));
  const patch = (fields, mask) => fetch(`${FS}/learners/${uid}?${mask.map((m) => `updateMask.fieldPaths=${m}`).join('&')}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  check('learner cannot move to another class', (await patch({ classId: { stringValue: '3scia' } }, ['classId'])).status === 403);
  check('learner cannot change their year', (await patch({ year: { integerValue: 3 } }, ['year'])).status === 403);
  check('learner cannot rename their class', (await patch({ className: { stringValue: '3 Sci A' } }, ['className'])).status === 403);
  check('learner can still update their name', (await patch({ name: { stringValue: 'Ama K. Boateng' } }, ['name'])).status === 200);
  check('learner cannot add classes', (await fetch(`${FS}/classes?documentId=mine`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{"fields":{"name":{"stringValue":"x"}}}' })).status === 403);
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('TEST FAILED', e.message); process.exit(1); });
