import topicsData from '../data/topics.json';
import type { Attempt, Topic } from '../types';
import { CONFIG } from '../config';
import { esc, fmtDate } from '../lib/dom';
import { addRevealToggles, confirmDialog, downloadText, toast } from '../lib/ui';
import { getSettings, saveSettings } from '../lib/settings';
import { storage, usingFirebase } from '../storage';
import { refreshLearner } from '../lib/session';
import * as acct from '../firebase/account';
import { auth } from '../firebase/app';
import { saveRemoteSettings } from '../firebase/settings';
import { mountTeacherAssignments } from './teacherAssignments';
import { mountTeacherTests } from './teacherTests';

const topics = topicsData as Topic[];
const UNLOCK_KEY = 'wassce.teacher.unlocked';

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

export function teacherPage(el: HTMLElement) {
  if (usingFirebase) return void firebaseGate(el);
  let unlocked = false;
  try { unlocked = sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch { /* ignore */ }
  if (!unlocked) return renderLock(el);
  void renderDashboard(el);
}

function renderLock(el: HTMLElement) {
  el.innerHTML = `
    <div class="card" style="max-width:420px;margin:40px auto">
      <h1>Teacher</h1>
      <form data-pin class="stack">
        <label class="field"><span>Enter PIN</span><input type="password" inputmode="numeric" autocomplete="off" name="pin" maxlength="12" /></label>
        <button class="btn btn-primary btn-block" type="submit">Unlock</button>
        <div data-err></div>
      </form>
    </div>`;
  const form = el.querySelector('form')!;
  addRevealToggles(form);
  (form.querySelector('input') as HTMLInputElement).focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = String(new FormData(form).get('pin') ?? '');
    if (pin === CONFIG.TEACHER_PIN) {
      try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch { /* ignore */ }
      void renderDashboard(el);
    } else {
      (el.querySelector('[data-err]') as HTMLElement).innerHTML = '<p class="mark-bad">Wrong PIN.</p>';
    }
  });
}

const TAB_KEY = 'wassce.teacher.tab';

/** Teacher dashboard shell: header, tabs (Firebase mode) and the active tab. */
async function renderDashboard(el: HTMLElement) {
  let tab = 'overview';
  try { tab = sessionStorage.getItem(TAB_KEY) ?? 'overview'; } catch { /* ignore */ }
  if (!usingFirebase) tab = 'overview';
  const tabs = [['overview', 'Overview'], ['tests', 'Tests'], ['assignments', 'Assignments']];
  el.innerHTML = `
    <div class="page-head"><h1>Teacher page</h1><button class="btn" data-act="lock" type="button">${usingFirebase ? 'Sign out' : 'Lock'}</button></div>
    ${usingFirebase ? `<div class="tabs" role="tablist">${tabs.map(([id, label]) => `<button class="tab" role="tab" type="button" data-tab="${id}" aria-selected="${tab === id}">${label}</button>`).join('')}</div>` : ''}
    <div data-tabbody></div>`;
  const body = el.querySelector('[data-tabbody]') as HTMLElement;
  el.onclick = async (e) => {
    const t = e.target as HTMLElement;
    const next = t.closest<HTMLElement>('[data-tab]')?.dataset.tab;
    if (next && next !== tab) {
      try { sessionStorage.setItem(TAB_KEY, next); } catch { /* ignore */ }
      void renderDashboard(el);
      return;
    }
    if (t.closest<HTMLElement>('[data-act]')?.dataset.act === 'lock' && !body.contains(t)) {
      if (usingFirebase) {
        await acct.signOut();
        await refreshLearner();
        return void firebaseGate(el);
      }
      try { sessionStorage.removeItem(UNLOCK_KEY); } catch { /* ignore */ }
      renderLock(el);
    }
  };
  if (tab === 'assignments') await mountTeacherAssignments(body);
  else if (tab === 'tests') await mountTeacherTests(body);
  else await renderOverview(body);
}

async function renderOverview(el: HTMLElement) {
  const s = getSettings();
  const attempts = await storage.getAttempts();
  const learners = new Map<string, { name: string; cls: string; list: Attempt[] }>();
  for (const a of attempts) {
    const e = learners.get(a.learnerId) ?? { name: a.learnerName, cls: a.className, list: [] };
    e.list.push(a);
    learners.set(a.learnerId, e);
  }
  const progs = await Promise.all([...learners.keys()].map((id) => storage.getProgress(id)));
  const rows = [...learners.entries()].map(([id, e], k) => ({ id, ...e, prog: progs[k] }))
    .sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name));

  el.innerHTML = `
    <div class="card">
      <h2>Mock settings ${usingFirebase ? 'for the whole class' : 'for this tablet'}</h2>
      <div class="grid-2">
        <label class="field"><span>Paper 1 mock timer (minutes, 0 = no timer)</span><input type="number" min="0" max="180" step="1" data-minutes value="${s.mockMinutes}" /></label>
        <label class="switch" style="align-self:end"><input type="checkbox" data-shuffle ${s.shuffle ? 'checked' : ''} /> Shuffle question order</label>
      </div>
      <button class="btn btn-primary" data-act="save" type="button">Save settings</button>
      <p class="muted small">${usingFirebase ? 'Saved to the class account: every device picks them up when the learner next opens the site online.' : 'These settings are stored on this tablet only. Set them on each tablet before the session.'}</p>
    </div>
    <div class="card">
      <div class="row" style="justify-content:space-between"><h2 style="margin:0">${usingFirebase ? 'Class progress' : 'Progress stored on this tablet'}</h2>
        <div class="row">
          <button class="btn btn-accent" data-act="csv-summary" type="button" ${rows.length ? '' : 'disabled'}>Export summary CSV</button>
          <button class="btn" data-act="csv-all" type="button" ${attempts.length ? '' : 'disabled'}>Export all attempts CSV</button>
        </div></div>
      <p class="muted small">${rows.length} learner(s), ${attempts.length} attempt(s). Topic columns show each learner's topic score (%).</p>
      ${rows.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th class="left">Learner</th><th>Class</th><th>Best mock</th>${topics.map((t) => `<th title="${esc(t.title)}">T${t.id}</th>`).join('')}<th>Last active</th></tr></thead>
        <tbody>${rows.map((r) => {
          const best = r.prog.mocks.reduce((m, x) => Math.max(m, x.score), -1);
          return `<tr><td class="left"><b>${esc(r.name)}</b></td><td>${esc(r.cls)}</td><td>${best >= 0 ? `${best}/${r.prog.mocks[0].max}` : '-'}</td>
            ${topics.map((t) => { const p = r.prog.topics[t.id].percent; return `<td style="${p < 50 ? 'color:var(--bad);font-weight:700' : ''}">${p}</td>`; }).join('')}
            <td class="small">${fmtDate(r.list[0].timestamp)}</td></tr>`;
        }).join('')}</tbody></table></div>` : `<p class="muted">No learner data ${usingFirebase ? 'yet' : 'on this tablet yet'}.</p>`}
    </div>
    <div class="card">
      <h2>Danger zone</h2>
      <button class="btn btn-danger" data-act="clear" type="button">Delete ALL learner results${usingFirebase ? '' : ' on this tablet'}</button>
    </div>`;

  el.onclick = async (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'lock') {
      if (usingFirebase) {
        await acct.signOut();
        await refreshLearner();
        return void firebaseGate(el);
      }
      try { sessionStorage.removeItem(UNLOCK_KEY); } catch { /* ignore */ }
      renderLock(el);
    }
    if (act === 'save') {
      const minutes = Math.max(0, Math.min(180, Math.round(Number((el.querySelector('[data-minutes]') as HTMLInputElement).value) || 0)));
      const next = { mockMinutes: minutes, shuffle: (el.querySelector('[data-shuffle]') as HTMLInputElement).checked };
      saveSettings(next);
      if (usingFirebase) {
        try { await saveRemoteSettings(next); } catch (e2) { console.error(e2); toast('Saved on this device only. Could not reach the class account.'); return; }
      }
      toast(`Saved: ${minutes ? `${minutes} minute timer` : 'no timer'}, ${(el.querySelector('[data-shuffle]') as HTMLInputElement).checked ? 'shuffled' : 'not shuffled'}.`);
    }
    if (act === 'csv-all') {
      downloadText(`wassce-attempts-${stamp()}.csv`, csv([
        ['learner', 'class', 'type', 'item', 'question', 'topic', 'score', 'max', 'percent', 'duration_sec', 'date_time'],
        ...attempts.map((a) => [a.learnerName, a.className, a.kind, a.itemId, typeof a.details?.n === 'number' ? `Q${a.details.n}` : '', a.topicId ?? '', a.score, a.max,
          a.max ? Math.round((a.score / a.max) * 100) : '', a.durationSec ?? '', new Date(a.timestamp).toISOString()]),
      ]));
    }
    if (act === 'csv-summary') {
      downloadText(`wassce-summary-${stamp()}.csv`, csv([
        ['learner', 'class', 'attempts', 'mocks_taken', 'best_mock', ...topics.map((t) => `T${t.id} ${t.short} (%)`)],
        ...rows.map((r) => [r.name, r.cls, r.list.length, r.prog.mocks.length, r.prog.mocks.length ? Math.max(...r.prog.mocks.map((m) => m.score)) : '',
          ...topics.map((t) => r.prog.topics[t.id].percent)]),
      ]));
    }
    if (act === 'clear' && (await confirmDialog(`Delete every learner's saved results${usingFirebase ? ' for the whole class' : ' on this tablet'}? Export a CSV first if you need it.`, 'Delete everything', true))) {
      await storage.clearProgress();
      toast('All learner data deleted.');
      void renderOverview(el);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Firebase mode: teachers sign in with email and password             */
/* ------------------------------------------------------------------ */

async function firebaseGate(el: HTMLElement) {
  el.innerHTML = '<p class="muted">Checking your account...</p>';
  await auth.authStateReady();
  const u = auth.currentUser;
  if (!u) return renderTeacherLogin(el);
  if (await acct.isTeacher()) return renderDashboard(el);

  const isLearner = (u.email ?? '').endsWith('@learners.wassce-prep.app');
  el.innerHTML = `
    <div class="card" style="max-width:620px;margin:24px auto">
      <h1>Teacher page</h1>
      ${isLearner
        ? `<p>You are signed in as the learner <b>${esc(u.displayName ?? '')}</b>. Sign out first, then sign in with the teacher account.</p>`
        : `<p>You are signed in as <b>${esc(u.email ?? '')}</b>, but this account is not marked as a teacher yet.</p>
           <p>Your user ID:</p>
           <p class="row"><code class="mono" style="font-size:1.05rem;word-break:break-all;background:var(--surface-2);padding:8px 10px;border-radius:8px" data-uid>${esc(u.uid)}</code>
             <button class="btn btn-sm" data-act="copy" type="button">Copy</button></p>
           <ol>
             <li>Open <b>console.firebase.google.com</b>, your project, then <b>Firestore Database</b>.</li>
             <li>Tap <b>+ Start collection</b> (or open the <b>teachers</b> collection if it exists). Collection ID: <code>teachers</code>.</li>
             <li>Document ID: paste the user ID above. Add one field, for example <code>name</code> (string) with your name. Save.</li>
             <li>Come back here and tap <b>Check again</b>.</li>
           </ol>
           <button class="btn btn-primary" data-act="recheck" type="button">Check again</button>`}
      <button class="btn" data-act="signout" type="button">Sign out</button>
    </div>`;
  el.onclick = async (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'copy') { try { await navigator.clipboard.writeText(u.uid); toast('User ID copied.'); } catch { toast('Copy failed. Select the ID and copy it.'); } }
    if (act === 'recheck') void firebaseGate(el);
    if (act === 'signout') { await acct.signOut(); await refreshLearner(); void firebaseGate(el); }
  };
}

function renderTeacherLogin(el: HTMLElement) {
  let mode: 'in' | 'new' = 'in';
  el.innerHTML = `
    <div class="card" style="max-width:460px;margin:24px auto">
      <h1>Teacher sign in</h1>
      <div class="tabs" role="tablist">
        <button type="button" class="tab" data-mode="in" aria-selected="true">Sign in</button>
        <button type="button" class="tab" data-mode="new" aria-selected="false">Create teacher account</button>
      </div>
      <form class="stack" novalidate>
        <label class="field" data-namefield hidden><span>Your name</span><input name="name" maxlength="40" autocomplete="name" /></label>
        <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" /></label>
        <label class="field"><span>Password (at least 8 characters)</span><input name="password" type="password" autocomplete="current-password" /></label>
        <div data-err></div>
        <button class="btn btn-primary btn-block" type="submit" data-submit>Sign in</button>
      </form>
      <p class="muted small" style="margin-top:12px">Learners do not need this page. A new teacher account must be approved once in the Firebase console; this page shows you how.</p>
    </div>`;
  const form = el.querySelector('form')!;
  addRevealToggles(form);
  const err = el.querySelector('[data-err]') as HTMLElement;
  const submit = el.querySelector('[data-submit]') as HTMLButtonElement;
  el.onclick = (e) => {
    const md = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]')?.dataset.mode as typeof mode | undefined;
    if (!md) return;
    mode = md;
    el.querySelectorAll('[data-mode]').forEach((t) => t.setAttribute('aria-selected', String((t as HTMLElement).dataset.mode === md)));
    (el.querySelector('[data-namefield]') as HTMLElement).hidden = md !== 'new';
    submit.textContent = md === 'new' ? 'Create account' : 'Sign in';
    err.innerHTML = '';
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');
    const name = String(fd.get('name') ?? '').trim();
    const fail = (m: string) => { err.innerHTML = `<p class="mark-bad" style="margin:0">${esc(m)}</p>`; };
    if (!email.includes('@')) return fail('Enter your email address.');
    if (password.length < 8) return fail('Use a password of at least 8 characters.');
    if (mode === 'new' && !name) return fail('Enter your name.');
    submit.disabled = true;
    try {
      if (mode === 'new') await acct.teacherSignUp(name, email, password);
      else await acct.teacherSignIn(email, password);
      await refreshLearner();
      void firebaseGate(el);
    } catch (ex) {
      fail(acct.authErrorMessage(ex));
      submit.disabled = false;
    }
  });
}
