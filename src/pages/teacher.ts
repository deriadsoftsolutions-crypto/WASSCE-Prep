import topicsData from '../data/topics.json';
import type { Attempt, Topic } from '../types';
import { CONFIG } from '../config';
import { esc, fmtDate } from '../lib/dom';
import { addRevealToggles, confirmDialog, downloadText, toast } from '../lib/ui';
import { getSettings, saveSettings } from '../lib/settings';
import { storage, usingFirebase } from '../storage';
import { learner, refreshLearner } from '../lib/session';
import * as acct from '../firebase/account';
import { auth } from '../firebase/app';
import { saveRemoteSettings } from '../firebase/settings';
import { mountTeacherAssignments } from './teacherAssignments';
import { mountTeacherTests } from './teacherTests';
import { mountTeacherLessons } from './teacherLessons';
import { mountTeacherCurriculum } from './teacherCurriculum';
import { mountTeacherPortfolios } from './teacherPortfolios';
import { mountTeacherPhotos } from './teacherPhotos';
import { mountTeacherClasses } from './teacherClasses';

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

/** Teacher dashboard shell: side menu (Firebase mode) and the active section. */
async function renderDashboard(el: HTMLElement) {
  let tab = 'overview';
  try { tab = sessionStorage.getItem(TAB_KEY) ?? 'overview'; } catch { /* ignore */ }
  if (!usingFirebase) tab = 'overview';
  const tabs = [['overview', 'Overview'], ['classes', 'Classes'], ['curriculum', 'Curriculum'], ['lessons', 'Lessons'], ['tests', 'Tests'], ['assignments', 'Assignments'], ['portfolios', 'Portfolios'], ['photos', 'Photos']];
  const me = learner();
  el.innerHTML = `
    <div class="t-layout">
      <nav class="t-menu" aria-label="Teacher">
        ${(usingFirebase ? tabs : tabs.slice(0, 1)).map(([id, label]) => `<button type="button" data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}>${label}<span class="t-count" data-count="${id}" hidden></span></button>`).join('')}
        <div class="t-foot">${me ? `<b>${esc(me.name)}</b><br>` : ''}<button type="button" data-act="lock" style="min-height:40px;padding:0;color:var(--accent)">${usingFirebase ? 'Sign out' : 'Lock'}</button></div>
      </nav>
      <div class="t-main" data-tabbody></div>
    </div>`;
  const body = el.querySelector('[data-tabbody]') as HTMLElement;
  // Phones: the section menu is one sideways-scrolling row; bring the open section into view.
  el.querySelector<HTMLElement>('.t-menu [aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
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
  else if (tab === 'lessons') await mountTeacherLessons(body);
  else if (tab === 'portfolios') await mountTeacherPortfolios(body);
  else if (tab === 'photos') await mountTeacherPhotos(body, () => void menuCounts(el));
  else if (tab === 'classes') await mountTeacherClasses(body, () => void menuCounts(el));
  else if (tab === 'curriculum') await mountTeacherCurriculum(body, () => (el.querySelector('[data-tab="lessons"]') as HTMLElement | null)?.click());
  else await renderOverview(body);
  if (usingFirebase) void menuCounts(el);
  // Keep the learners' catalog (one document listing everything published) current: see firebase/catalog.ts.
  if (usingFirebase) void import('../firebase/catalog').then((c) => c.ensureCatalog());
}

/** Live counts in the side menu: tests open now, submissions waiting for a mark. */
async function menuCounts(el: HTMLElement) {
  try {
    const c = await classworkCounts();
    const set = (id: string, text: string, urgent = false) => {
      const b = el.querySelector<HTMLElement>(`[data-count="${id}"]`);
      if (!b) return;
      b.hidden = !text;
      b.textContent = text;
      b.classList.toggle('urgent', urgent);
    };
    set('tests', c.openTests ? `${c.openTests} open` : '');
    set('assignments', c.toMark ? `${c.toMark} to mark` : '', true);
    const { allPhotos } = await import('../firebase/profilePhoto');
    const waiting = (await allPhotos()).filter((p) => p.pending).length;
    set('photos', waiting ? `${waiting} waiting` : '', true);
    const [{ listClasses, unmatched }, { listLearners }] = await Promise.all([import('../firebase/classes'), import('../firebase/assignments')]);
    const [cls, ls] = await Promise.all([listClasses(), listLearners()]);
    const toPlace = cls.length ? unmatched(ls, cls).length : 0;
    set('classes', !cls.length ? 'set up' : toPlace ? `${toPlace} to place` : '', true);
    void outsideNotice(el, ls, cls);
    const ov = el.querySelector<HTMLElement>('[data-ovphotos]');
    if (ov) ov.innerHTML = waiting ? `<div class="card" style="margin-bottom:16px"><p style="margin:0"><b>${waiting} profile photo${waiting === 1 ? '' : 's'}</b> waiting for your approval. <button type="button" class="btn btn-sm" data-tab="photos">Review photos</button></p></div>` : '';
  } catch { /* counts are optional */ }
}

/** Overview notice: work handed in, or tests taken, by learners outside the class it was set for. */
async function outsideNotice(el: HTMLElement, learners: import('../firebase/assignments').LearnerInfo[], classes: import('../lib/audience').ClassInfo[]) {
  const box = el.querySelector<HTMLElement>('[data-ovoutside]');
  if (!box) return;
  const [asg, tst, aud] = await Promise.all([import('../firebase/assignments'), import('../firebase/assessments'), import('../lib/audience')]);
  const [assignments, tests, { subs, feedback }, tdata] = await Promise.all([asg.listAssignments(), tst.listAssessments(), asg.allSubmissions(), tst.allAttempts()]);
  const outside = (item: { classIds?: string[]; classKey?: string }, id: string) => {
    const l = learners.find((x) => x.id === id);
    return !!l && !aud.inAudience(aud.audienceOf(item), { classId: aud.learnerClassId(l), year: l.year });
  };
  const rows: { who: string; cls: string; what: string; forWhom: string; tab: string; when: number }[] = [];
  for (const s of subs) {
    const a = assignments.find((x) => x.id === s.assignmentId);
    if (!a || !outside(a, s.learnerId) || feedback.some((f) => f.assignmentId === a.id && f.learnerId === s.learnerId)) continue;
    rows.push({ who: s.learnerName, cls: s.className, what: a.title, forWhom: aud.audienceLabel(aud.audienceOf(a), classes), tab: 'assignments', when: s.submittedAt });
  }
  for (const at of tdata.attempts) {
    const t = tests.find((x) => x.id === at.assessmentId);
    if (!t || !outside(t, at.learnerId) || tdata.results.some((r) => r.assessmentId === t.id && r.learnerId === at.learnerId)) continue;
    rows.push({ who: at.learnerName, cls: at.className, what: t.title, forWhom: aud.audienceLabel(aud.audienceOf(t), classes), tab: 'tests', when: at.submittedAt });
  }
  if (!rows.length) { box.innerHTML = ''; return; }
  rows.sort((a, b) => b.when - a.when);
  box.innerHTML = `<div class="card" style="margin-bottom:16px"><h3 style="margin-top:0">Work from other classes <span class="pill" style="background:var(--accent-soft)">${rows.length}</span></h3>
    <p class="muted small" style="margin-top:-6px">These learners did work that was set for a different class. Mark it as usual, or ignore it.</p>
    <ul style="margin:0;padding-left:20px">${rows.slice(0, 8).map((r) => `<li><b>${esc(r.who)}</b> (${esc(r.cls)}) ${r.tab === 'tests' ? 'took' : 'handed in'} <b>${esc(r.what)}</b>, set for ${esc(r.forWhom)}.</li>`).join('')}</ul>
    ${rows.length > 8 ? `<p class="muted small">and ${rows.length - 8} more.</p>` : ''}
    <div class="row" style="margin-top:8px">${rows.some((r) => r.tab === 'assignments') ? '<button type="button" class="btn btn-sm" data-tab="assignments">Open Assignments</button>' : ''}${rows.some((r) => r.tab === 'tests') ? '<button type="button" class="btn btn-sm" data-tab="tests">Open Tests</button>' : ''}</div></div>`;
}

async function classworkCounts() {
  const [asg, tst] = await Promise.all([import('../firebase/assignments'), import('../firebase/assessments')]);
  const [{ subs, feedback }, tests, tdata] = await Promise.all([asg.allSubmissions(), tst.listAssessments(), tst.allAttempts()]);
  const toMark = subs.filter((s) => !feedback.some((f) => f.assignmentId === s.assignmentId && f.learnerId === s.learnerId)).length;
  const open = tests.filter((t) => tst.statusOf(t) === 'open');
  return { toMark, openTests: open.length, open, tdata };
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

  // Class picture: average topic score over learners who have done anything in that topic.
  const classAvg = topics.map((t) => {
    const ps = rows.map((r) => r.prog.topics[t.id]).filter((tp) => Object.keys(tp.items).length || tp.mcqTotal);
    return { t, avg: ps.length ? Math.round(ps.reduce((sum, tp) => sum + tp.percent, 0) / ps.length) : null };
  });
  const struggling = classAvg.filter((x) => x.avg !== null).sort((a, b) => a.avg! - b.avg!).slice(0, 3);
  let mc = 0, mt = 0;
  for (const r of rows) for (const t of topics) { mc += r.prog.topics[t.id].mcqCorrect; mt += r.prog.topics[t.id].mcqTotal; }
  const cw = usingFirebase ? await classworkCounts().catch(() => null) : null;
  const openTest = cw?.open[0];
  const openTaken = openTest ? cw!.tdata.attempts.filter((a) => a.assessmentId === openTest.id).length : 0;
  const heatClass = (tp: { percent: number; items: object; mcqTotal: number }) =>
    !Object.keys(tp.items).length && !tp.mcqTotal ? 'none' : tp.percent >= 75 ? 'h3' : tp.percent >= 50 ? 'h2' : tp.percent >= 25 ? 'h1' : 'h0';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  el.innerHTML = `
    ${usingFirebase ? '<div data-ovphotos></div><div data-ovoutside></div>' : ''}
    <div class="page-head"><h1>Overview</h1><span class="muted">${today}</span></div>
    <section class="t-summary" aria-label="Needs attention">
      ${usingFirebase ? `
      <div class="t-stat ${cw?.toMark ? 'urgent' : ''}">
        <span class="num">${cw?.toMark ?? 0}</span>
        <span class="lbl">submission${cw?.toMark === 1 ? '' : 's'} waiting for a mark</span>
        <span class="sub">${cw?.toMark ? 'Open Assignments to mark them' : 'All marked'}</span>
        ${cw?.toMark ? '<button class="btn btn-primary" type="button" data-goto="assignments">Mark now</button>' : ''}
      </div>
      <div class="t-stat">
        ${openTest ? `<span class="num">${openTaken}</span>
        <span class="lbl">have taken ${esc(openTest.title)}</span>
        <span class="sub">${openTest.closesAt ? `Closes ${fmtDate(openTest.closesAt)}` : 'Open, no closing time'}${cw!.openTests > 1 ? `. ${cw!.openTests - 1} more test${cw!.openTests > 2 ? 's' : ''} open` : ''}</span>`
        : `<span class="num">0</span><span class="lbl">tests open now</span><span class="sub">Create one under Tests</span>`}
      </div>` : ''}
      <div class="t-stat">
        <span class="num">${mt ? Math.round((mc / mt) * 100) : 0}%</span>
        <span class="lbl">class average on Paper 1 questions</span>
        <span class="sub">${mt} answers from ${rows.length} learner${rows.length === 1 ? '' : 's'}</span>
      </div>
    </section>

    ${struggling.length ? `<section class="card" aria-labelledby="weak">
      <h2 id="weak">Where the class is struggling</h2>
      ${struggling.map((x) => `<div class="weak-row">
        <span class="w-name">${x.t.id}. ${esc(x.t.short)}</span>
        <span class="bar weak"><span style="width:${x.avg}%"></span></span>
        <span class="num">${x.avg}%</span>
        <a class="btn btn-sm" href="/topic/${x.t.id}">Open topic</a>
      </div>`).join('')}
      <p class="muted small" style="margin:8px 0 0">Average topic score of the learners who have started each topic. ${usingFirebase ? 'Set a test on a weak topic under Tests: Paper 1 questions can be added in one tap.' : ''}</p>
    </section>` : ''}

    <section class="card" aria-labelledby="heat">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <h2 id="heat" style="margin:0">Topic scores by learner</h2>
        <span class="heat-key">0% <span style="background:var(--surface)"></span><span style="background:#FCEBB0"></span><span style="background:#F8D35C"></span><span style="background:#F5B700"></span> 100%</span>
      </div>
      ${rows.length ? `<div class="table-wrap"><table class="heat">
        <thead><tr><th class="left" scope="col">Learner</th>${topics.map((t) => `<th scope="col" title="${esc(t.title)}">T${t.id}</th>`).join('')}<th scope="col">Best mock</th></tr></thead>
        <tbody>${rows.map((r) => {
          const best = r.prog.mocks.reduce((m, x) => Math.max(m, x.score), -1);
          return `<tr><th class="left" scope="row">${esc(r.name)} <span class="muted small">${esc(r.cls)}</span></th>
            ${topics.map((t) => { const tp = r.prog.topics[t.id]; const c = heatClass(tp); return `<td class="${c}">${c === 'none' ? '-' : tp.percent}</td>`; }).join('')}
            <td>${best >= 0 ? `${best}/${r.prog.mocks[0].max}` : '-'}</td></tr>`;
        }).join('')}</tbody></table></div>
        <p class="muted small" style="margin:8px 0 0">${rows.length} learner(s), ${attempts.length} saved results. Red numbers are under 25%. A dash means not started.</p>`
        : `<p class="muted">No learner results ${usingFirebase ? 'yet' : 'on this tablet yet'}.</p>`}
      <div class="row" style="margin-top:12px">
        <button class="btn btn-accent" data-act="csv-summary" type="button" ${rows.length ? '' : 'disabled'}>Export summary CSV</button>
        <button class="btn" data-act="csv-all" type="button" ${attempts.length ? '' : 'disabled'}>Export all results CSV</button>
      </div>
    </section>

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
      <h2>Danger zone</h2>
      <button class="btn btn-danger" data-act="clear" type="button">Delete ALL learner results${usingFirebase ? '' : ' on this tablet'}</button>
    </div>`;

  el.onclick = async (e) => {
    const go = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]')?.dataset.goto;
    if (go) {
      try { sessionStorage.setItem(TAB_KEY, go); } catch { /* ignore */ }
      (el.closest('.t-layout')?.querySelector(`[data-tab="${go}"]`) as HTMLElement | null)?.click();
      return;
    }
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
  if (await acct.isTeacher(true)) return renderDashboard(el);

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
