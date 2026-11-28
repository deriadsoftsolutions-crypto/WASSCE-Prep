import { esc, fmtDate, fmtTime } from '../lib/dom';
import { confirmDialog, downloadText, feedbackHTML, modal, toast } from '../lib/ui';
import { listLearners, type LearnerInfo } from '../firebase/assignments';
import { listClasses, type SchoolClass } from '../firebase/classes';
import { legacyClassFields, audienceOf, yearToken } from '../lib/audience';
import { audiencePickerHTML, readAudience, wireAudiencePicker } from './audiencePicker';
import { audienceCell, filterBarHTML, isOutside, matchesFilter, outsidePill, peopleFor, placementSelectHTML, readPlacement, readyPlacement, wireFilter } from './teacherShared';
import { listLessons, type Lesson } from '../firebase/lessons';
import { listUnits, type Unit } from '../firebase/units';
import { READY_LESSONS } from '../data/ready';
import {
  allAttempts, allowRetake, autoScore, deleteAssessment, getKey, getQuestions, listAssessments, releaseResult, saveAssessment, statusOf,
  type Assessment, type Attempt, type KeyEntry, type QType, type Question, type Result, type ShowResults,
} from '../firebase/assessments';
import paper1 from '../data/paper1.json';
import topicsData from '../data/topics.json';
import type { Paper1Question, Topic } from '../types';
import { richText } from './assignments';
import { topicIcon } from '../lib/icons';
import { READY_TESTS } from '../data/ready';
import { mountReadyPicker } from './readyPicker';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const P1 = paper1 as Paper1Question[];
const TOPICS = topicsData as Topic[];
const newId = () => Math.random().toString(36).slice(2, 10);
const toLocal = (t: number | null) => (t ? new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(v).getTime() : null);
const csvCell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

interface EditQ { q: Question; k: KeyEntry }

export async function mountTeacherTests(host: HTMLElement) {
  host.innerHTML = '<p class="muted">Loading tests...</p>';
  let tests: Assessment[] = [];
  let learners: LearnerInfo[] = [];
  let classes: SchoolClass[] = [];
  let lessons: Lesson[] = [];
  let units: Unit[] = [];
  let data: Awaited<ReturnType<typeof allAttempts>> = { starts: [], attempts: [], results: [] };
  const load = async () => {
    [tests, learners, data, classes, lessons, units] = await Promise.all([listAssessments(), listLearners(), allAttempts(), listClasses().catch(() => [] as SchoolClass[]), listLessons().catch(() => [] as Lesson[]), listUnits().catch(() => [] as Unit[])]);
  };
  const inClass = (a: Assessment) => peopleFor(a, learners);
  const learnerById = (id: string) => learners.find((l) => l.id === id);
  const statusLabel: Record<string, string> = { draft: 'Draft', upcoming: 'Upcoming', open: 'Open', closed: 'Closed' };

  /* ---------------- List ---------------- */
  const renderList = () => {
    host.onclick = null;
    host.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <h2 style="margin:0">Tests</h2><div class="row"><button class="btn" data-ready type="button">+ Add ready-made test</button><button class="btn btn-primary" data-new type="button">+ New test</button></div></div>
      <div data-readybox></div>
      ${tests.length ? filterBarHTML(classes, { shown: tests.filter((a) => matchesFilter(a, classes)).length, total: tests.length }) : ''}
      ${tests.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th class="left">Title</th><th>For</th><th>Status</th><th>Questions</th><th>Submitted</th><th>Released</th><th></th></tr></thead>
        <tbody>${tests.filter((a) => matchesFilter(a, classes)).map((a) => `<tr>
          <td class="left"><b>${esc(a.title)}</b><div class="muted small">${a.opensAt ? `Opens ${fmtDate(a.opensAt)}` : 'Opens now'}${a.closesAt ? ` · closes ${fmtDate(a.closesAt)}` : ''}${a.timeLimitMin ? ` · ${a.timeLimitMin} min` : ''}</div></td>
          <td>${audienceCell(a, classes)}</td>
          <td><span class="pill ${statusOf(a) === 'open' ? 'ok' : ''}">${statusLabel[statusOf(a)]}</span></td>
          <td>${a.questionCount} (${a.totalMarks} mark${a.totalMarks === 1 ? '' : 's'})</td>
          <td>${(() => { const all = data.attempts.filter((x) => x.assessmentId === a.id); const n = all.filter((x) => isOutside(a, learnerById(x.learnerId))).length; return `${all.length - n} / ${inClass(a).length}${n ? `<div class="small" style="color:var(--muted)">${n} from other classes</div>` : ''}`; })()}</td>
          <td>${data.results.filter((x) => x.assessmentId === a.id).length}</td>
          <td><div class="row" style="flex-wrap:nowrap;justify-content:center">
            <button class="btn btn-sm btn-primary" data-results="${a.id}" type="button">Results</button>
            <button class="btn btn-sm" data-edit="${a.id}" type="button">Edit</button></div></td></tr>`).join('')}</tbody></table></div>`
        : '<div class="card"><p style="margin:0">No tests yet. Tap <b>New test</b>. You can type your own questions or add Paper 1 questions with one tap.</p></div>'}`;
    wireFilter(host, renderList);
    host.onclick = (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-new]')) return void renderEditor();
      if (t.closest('[data-ready]')) {
        mountReadyPicker(host.querySelector('[data-readybox]') as HTMLElement, 'Ready-made tests',
          READY_TESTS.map((r) => ({ key: r.key, title: r.title, when: r.when, year: r.year, unitId: r.unitId, added: tests.some((x) => x.title === r.title) })));
        return;
      }
      const rk = t.closest<HTMLElement>('[data-addready]')?.dataset.addready;
      if (rk) {
        const r = READY_TESTS.find((x) => x.key === rk)!;
        (t.closest('[data-addready]') as HTMLButtonElement).disabled = true;
        void (async () => {
          try {
            const id = await saveAssessment({
              title: r.title, instructions: r.instructions, classIds: [yearToken(r.year)], ...legacyClassFields([yearToken(r.year)], classes), ...readyPlacement(r, lessons, READY_LESSONS.find((x) => x.key === r.lessonKey)?.title), opensAt: null, closesAt: null,
              timeLimitMin: r.timeLimitMin, showResults: r.showResults, portfolioSection: r.portfolioSection, published: false,
            }, r.questions, r.answers);
            toast(`Added as a draft for all of STEM ${r.year}. Choose the class and dates, then publish.`);
            await load();
            renderEditor(tests.find((x) => x.id === id));
          } catch (ex) {
            console.error(ex);
            toast('Could not add the test. Check your connection and that the latest rules are published.');
            renderList();
          }
        })();
        return;
      }
      const ed = t.closest<HTMLElement>('[data-edit]')?.dataset.edit;
      if (ed) return void renderEditor(tests.find((x) => x.id === ed));
      const rs = t.closest<HTMLElement>('[data-results]')?.dataset.results;
      if (rs) void renderResults(tests.find((x) => x.id === rs)!);
    };
  };

  /* ---------------- Editor ---------------- */
  const renderEditor = async (a?: Assessment) => {
    host.onclick = null;
    host.innerHTML = '<p class="muted">Loading...</p>';
    await load();
    let items: EditQ[] = [];
    if (a) {
      const [qs, key] = await Promise.all([getQuestions(a.id), getKey(a.id)]);
      items = qs.map((q) => ({ q, k: key?.[q.id] ?? {} }));
    }
    const started = a ? data.starts.filter((s) => s.assessmentId === a.id).length : 0;

    host.innerHTML = `
      <div class="card">
        <h2>${a ? 'Edit test' : 'New test'}</h2>
        ${started ? feedbackHTML('info', `${started} learner(s) have already started this test.`, '<p>Changing questions or answers now affects their marking. Fixing a typo is fine.</p>') : ''}
        <form data-form class="stack" novalidate>
          <label class="field"><span>Title</span><input name="title" maxlength="120" value="${esc(a?.title ?? '')}" /></label>
          <label class="field"><span>Instructions (optional)</span><textarea name="instructions" rows="3">${esc(a?.instructions ?? '')}</textarea></label>
          ${audiencePickerHTML(a ? audienceOf(a) : [], classes)}
          ${placementSelectHTML(units, lessons, a?.unitId, a?.lessonId)}
          <div class="grid-2">
            <label class="field"><span>Opens (optional, blank = straight away)</span><input name="opens" type="datetime-local" value="${toLocal(a?.opensAt ?? null)}" /></label>
            <label class="field"><span>Closes (optional)</span><input name="closes" type="datetime-local" value="${toLocal(a?.closesAt ?? null)}" /></label>
            <label class="field"><span>Time limit in minutes (0 = none)</span><input name="limit" type="number" min="0" max="300" value="${a?.timeLimitMin ?? 0}" /></label>
            <label class="field"><span>Learners see their results</span><select name="show">
              <option value="immediately" ${a?.showResults === 'immediately' || !a ? 'selected' : ''}>Straight after submitting (with answers)</option>
              <option value="after-close" ${a?.showResults === 'after-close' ? 'selected' : ''}>After the test closes</option>
              <option value="teacher" ${a?.showResults === 'teacher' ? 'selected' : ''}>Only when I release them</option></select></label>
            <label class="field"><span>Portfolio section</span><select name="psec">
              <option value="tests">Quiz or test</option>
              <option value="semester" ${a?.portfolioSection === 'semester' ? 'selected' : ''}>Mid-semester or end-of-semester paper</option></select></label>
          </div>
          <label class="switch"><input type="checkbox" name="published" ${a?.published ?? false ? 'checked' : ''} /> Published (learners can see it; leave off while you build it)</label>
        </form>
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><h2 style="margin:0">Questions <span class="muted" data-total></span></h2></div>
        <div data-qs style="margin-top:12px"></div>
        <div class="row" style="margin-top:12px">
          <button class="btn" data-add="mcq" type="button">+ Multiple choice</button>
          <button class="btn" data-add="number" type="button">+ Calculation</button>
          <button class="btn" data-add="short" type="button">+ Short answer</button>
          <button class="btn btn-accent" data-bank type="button">+ From Paper 1 questions</button>
        </div>
      </div>
      <div data-err></div>
      <div class="row">
        <button class="btn btn-primary btn-big" data-save type="button">Save test</button>
        <button class="btn" data-cancel type="button">Cancel</button>
        ${a ? '<span class="spacer"></span><button class="btn btn-danger" data-delete type="button">Delete test</button>' : ''}
      </div>`;

    const qsHost = host.querySelector('[data-qs]') as HTMLElement;
    const form = host.querySelector('[data-form]') as HTMLFormElement;
    wireAudiencePicker(form, classes);

    const drawQs = () => {
      (host.querySelector('[data-total]') as HTMLElement).textContent = `(${items.length} · ${items.reduce((s, x) => s + x.q.marks, 0)} marks)`;
      qsHost.innerHTML = items.length ? items.map(({ q, k }, i) => `
        <div class="calc-step" data-i="${i}">
          <h4><span>${i + 1}. ${q.type === 'mcq' ? 'Multiple choice' : q.type === 'number' ? 'Calculation' : 'Short answer (you mark)'}</span>
            <span class="row" style="gap:4px">
              <button class="btn btn-sm" data-up type="button" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
              <button class="btn btn-sm" data-down type="button" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
              <button class="btn btn-sm btn-danger" data-del type="button">Remove</button></span></h4>
          <label class="field"><span>Question</span><textarea data-f="text" rows="2">${esc(q.text)}</textarea></label>
          ${q.type === 'mcq' ? (q.options ?? []).map((o, oi) => `
            <div class="row" style="margin-bottom:6px;flex-wrap:nowrap">
              <label class="switch" style="min-width:64px"><input type="radio" name="c${i}" data-correct="${oi}" ${k.correct === oi ? 'checked' : ''} /> ${LETTERS[oi]}</label>
              <input data-opt="${oi}" value="${esc(o)}" placeholder="Option ${LETTERS[oi]}" /></div>`).join('')
            + '<p class="muted small" style="margin:0 0 8px">Tick the correct option.</p>' : ''}
          ${q.type === 'number' ? `<div class="var-grid">
            <label class="field" style="margin:0"><span>Correct answer</span><input data-f="value" inputmode="decimal" value="${k.value ?? ''}" /></label>
            <label class="field" style="margin:0"><span>Accept within (%)</span><input data-f="tolerance" type="number" min="0" max="50" step="0.5" value="${Math.round((k.tolerance ?? 0.01) * 1000) / 10}" /></label>
            <label class="field" style="margin:0"><span>Unit (shown to learners)</span><input data-f="unit" value="${esc(q.unit ?? '')}" /></label></div>` : ''}
          ${q.type === 'short' ? `<label class="field"><span>Model answer / marking points (only you see this until results are shown)</span><textarea data-f="model" rows="2">${esc(k.model ?? '')}</textarea></label>` : ''}
          <div class="var-grid" style="margin-top:8px">
            <label class="field" style="margin:0"><span>Marks</span><input data-f="marks" type="number" min="1" max="50" value="${q.marks}" /></label>
          </div>
          <label class="field" style="margin-top:8px"><span>Explanation shown with the answer (optional)</span><textarea data-f="explanation" rows="2">${esc(k.explanation ?? '')}</textarea></label>
        </div>`).join('') : '<p class="muted" style="margin:0">No questions yet. Use the buttons below.</p>';
    };
    drawQs();

    // Keep the model in sync as the teacher types.
    qsHost.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      const card = t.closest<HTMLElement>('[data-i]');
      if (!card) return;
      const it = items[Number(card.dataset.i)];
      const f = t.dataset.f;
      if (t.dataset.opt !== undefined) it.q.options![Number(t.dataset.opt)] = t.value;
      else if (f === 'text') it.q.text = t.value;
      else if (f === 'unit') it.q.unit = t.value;
      else if (f === 'marks') { it.q.marks = Math.max(1, Math.round(Number(t.value) || 1)); (host.querySelector('[data-total]') as HTMLElement).textContent = `(${items.length} · ${items.reduce((s, x) => s + x.q.marks, 0)} marks)`; }
      else if (f === 'value') it.k.value = t.value === '' ? undefined : Number(t.value);
      else if (f === 'tolerance') it.k.tolerance = Math.max(0, Number(t.value) || 0) / 100;
      else if (f === 'model') it.k.model = t.value;
      else if (f === 'explanation') it.k.explanation = t.value;
    });
    qsHost.addEventListener('change', (e) => {
      const t = e.target as HTMLInputElement;
      const card = t.closest<HTMLElement>('[data-i]');
      if (card && t.dataset.correct !== undefined) items[Number(card.dataset.i)].k.correct = Number(t.dataset.correct);
    });

    const add = (type: QType) => {
      const q: Question = { id: newId(), type, text: '', marks: type === 'short' ? 2 : 1 };
      if (type === 'mcq') q.options = ['', '', '', ''];
      items.push({ q, k: type === 'number' ? { tolerance: 0.01 } : {} });
      drawQs();
      qsHost.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const openBank = () => {
      const m = modal(`<h2>Add Paper 1 questions</h2>
        <p class="muted small">Tick the questions to add. Answers and explanations come with them.</p>
        <div style="max-height:55vh;overflow:auto">${TOPICS.map((t) => `
          <details><summary style="min-height:44px;display:flex;align-items:center;font-weight:700;cursor:pointer">${topicIcon(t.id, 20)} ${t.id}. ${esc(t.short)} (${t.paper1.length})</summary>
            <label class="check"><input type="checkbox" data-topicall="${t.id}" /><span><b>All of this topic</b></span></label>
            ${P1.filter((q) => q.topic === t.id).map((q) => `<label class="check"><input type="checkbox" data-pq="${q.n}" data-t="${t.id}" /><span><b>Q${q.n}.</b> ${esc(q.question)}</span></label>`).join('')}
          </details>`).join('')}</div>
        <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-x type="button">Cancel</button><button class="btn btn-primary" data-addsel type="button">Add selected</button></div>`);
      m.root.addEventListener('change', (e) => {
        const t = e.target as HTMLInputElement;
        if (t.dataset.topicall) m.root.querySelectorAll<HTMLInputElement>(`[data-t="${t.dataset.topicall}"]`).forEach((c) => (c.checked = t.checked));
      });
      m.root.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;
        if (t.closest('[data-x]')) m.close();
        if (t.closest('[data-addsel]')) {
          const ns = Array.from(m.root.querySelectorAll<HTMLInputElement>('[data-pq]:checked')).map((c) => Number(c.dataset.pq));
          for (const n of ns) {
            const p = P1.find((x) => x.n === n)!;
            const letters = ['A', 'B', 'C', 'D'] as const;
            items.push({
              q: { id: newId(), type: 'mcq', text: p.question, options: letters.map((L) => p.options[L]), marks: 1 },
              k: { correct: letters.indexOf(p.answer), explanation: p.explanation },
            });
          }
          m.close();
          drawQs();
          toast(`Added ${ns.length} question${ns.length === 1 ? '' : 's'}.`);
        }
      });
    };

    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      const addType = t.closest<HTMLElement>('[data-add]')?.dataset.add as QType | undefined;
      if (addType) return add(addType);
      if (t.closest('[data-bank]')) return openBank();
      const card = t.closest<HTMLElement>('[data-i]');
      if (card) {
        const i = Number(card.dataset.i);
        if (t.closest('[data-del]')) { items.splice(i, 1); drawQs(); }
        if (t.closest('[data-up]') && i > 0) { [items[i - 1], items[i]] = [items[i], items[i - 1]]; drawQs(); }
        if (t.closest('[data-down]') && i < items.length - 1) { [items[i + 1], items[i]] = [items[i], items[i + 1]]; drawQs(); }
        return;
      }
      if (t.closest('[data-cancel]')) return renderList();
      if (t.closest('[data-delete]') && a) {
        if (!(await confirmDialog(`Delete the test "${a.title}"? Learners' answers stay saved but the test disappears.`, 'Delete', true))) return;
        await deleteAssessment(a.id); await load(); return renderList();
      }
      if (t.closest('[data-save]')) {
        const fd = new FormData(form);
        const err = (m: string) => { (host.querySelector('[data-err]') as HTMLElement).innerHTML = feedbackHTML('bad', m); };
        const title = String(fd.get('title') ?? '').trim();
        const aud = readAudience(form, classes);
        const opensAt = fromLocal(String(fd.get('opens') ?? '')), closesAt = fromLocal(String(fd.get('closes') ?? ''));
        if (!title) return err('Give the test a title.');
        if (opensAt && closesAt && closesAt <= opensAt) return err('The closing time must be after the opening time.');
        if (!items.length) return err('Add at least one question.');
        for (const [i, { q, k }] of items.entries()) {
          if (!q.text.trim()) return err(`Question ${i + 1} has no text.`);
          if (q.type === 'mcq') {
            q.options = (q.options ?? []).map((o) => o.trim());
            if (q.options.filter(Boolean).length < 2) return err(`Question ${i + 1} needs at least two options.`);
            if (k.correct == null || !q.options[k.correct]) return err(`Question ${i + 1}: tick the correct option.`);
            // drop empty trailing options, keeping the correct index valid
            while (q.options.length > 2 && !q.options[q.options.length - 1] && k.correct < q.options.length - 1) q.options.pop();
          }
          if (q.type === 'number' && (k.value == null || !isFinite(k.value))) return err(`Question ${i + 1}: enter the correct numeric answer.`);
        }
        const btn = t.closest('[data-save]') as HTMLButtonElement;
        btn.disabled = true;
        try {
          await saveAssessment({
            id: a?.id, createdAt: a?.createdAt, title, instructions: String(fd.get('instructions') ?? '').trim(),
            classIds: aud, ...legacyClassFields(aud, classes), ...readPlacement(form, lessons), opensAt, closesAt,
            timeLimitMin: Math.max(0, Math.round(Number(fd.get('limit')) || 0)), showResults: String(fd.get('show')) as ShowResults,
            portfolioSection: fd.get('psec') === 'semester' ? 'semester' : 'tests',
            published: fd.get('published') === 'on',
          }, items.map((x) => x.q), Object.fromEntries(items.map((x) => [x.q.id, x.k])));
          toast('Test saved.');
          await load();
          renderList();
        } catch (ex) {
          console.error(ex);
          btn.disabled = false;
          err('Could not save. Check your internet connection.');
        }
      }
    };
  };

  /* ---------------- Results and marking ---------------- */
  const renderResults = async (a: Assessment) => {
    host.onclick = null;
    host.innerHTML = '<p class="muted">Loading results...</p>';
    // Always fetch fresh: learners may have submitted since the list was opened.
    const [questions, keyOrNull] = await Promise.all([getQuestions(a.id), getKey(a.id), load()]);
    const key = keyOrNull ?? {};
    const attemptOf = (id: string) => data.attempts.find((x) => x.assessmentId === a.id && x.learnerId === id);
    const startOf = (id: string) => data.starts.find((x) => x.assessmentId === a.id && x.learnerId === id);
    const resultOf = (id: string) => data.results.find((x) => x.assessmentId === a.id && x.learnerId === id);
    const extra = data.attempts.filter((x) => x.assessmentId === a.id && !inClass(a).some((l) => l.id === x.learnerId))
      .map((x) => ({ id: x.learnerId, name: x.learnerName, className: x.className }));
    const people = [...inClass(a), ...extra];
    const hasShort = questions.some((q) => q.type === 'short');
    const autoFor = (at: Attempt) => {
      const scores: Record<string, number> = {};
      for (const q of questions) { const s = autoScore(q, key[q.id], at.responses[q.id] ?? null); if (s !== null) scores[q.id] = s; }
      return scores;
    };
    const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

    const draw = () => {
      const submitted = people.filter((p) => attemptOf(p.id));
      const avg = submitted.length ? submitted.reduce((s, p) => s + (resultOf(p.id)?.total ?? sum(autoFor(attemptOf(p.id)!))), 0) / submitted.length : 0;
      // Per-question success rate (auto-marked only), to spot what the class found hard.
      const qStats = questions.map((q, i) => {
        if (q.type === 'short' || !submitted.length) return '';
        const right = submitted.filter((p) => (autoScore(q, key[q.id], attemptOf(p.id)!.responses[q.id] ?? null) ?? 0) >= q.marks).length;
        const pct = Math.round((right / submitted.length) * 100);
        return `<tr class="${pct < 50 ? 'weak' : ''}"><td>Q${i + 1}</td><td class="left">${esc(q.text.slice(0, 90))}${q.text.length > 90 ? '...' : ''}</td><td>${right} / ${submitted.length} (${pct}%)</td></tr>`;
      }).join('');
      host.innerHTML = `
        <button class="btn btn-sm" data-back type="button">← All tests</button>
        <div class="page-head" style="margin-top:12px"><h2 style="margin:0">${esc(a.title)}</h2>
          <span class="muted">${audienceCell(a, classes)} · ${a.questionCount} questions · ${a.totalMarks} marks</span></div>
        <div class="stats" style="margin-bottom:12px">
          <div class="stat">Submitted<b>${submitted.length} / ${people.length}</b></div>
          <div class="stat">Class average<b>${submitted.length ? `${Math.round(avg * 10) / 10} / ${a.totalMarks}` : '-'}</b></div>
          <div class="stat">Results released<b>${people.filter((p) => resultOf(p.id)).length}</b></div>
        </div>
        <div class="row" style="margin-bottom:12px">
          ${!hasShort ? '<button class="btn btn-accent" data-releaseall type="button">Release all results</button>' : ''}
          <button class="btn" data-csv type="button" ${submitted.length ? '' : 'disabled'}>Export results CSV</button>
        </div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th class="left">Learner</th><th>Status</th><th>Time taken</th><th>Auto-marked</th><th>Total</th><th></th></tr></thead>
          <tbody>${people.map((p) => {
            const at = attemptOf(p.id), st = startOf(p.id), r = resultOf(p.id);
            const status = at ? `Submitted ${fmtDate(at.submittedAt)}` : st ? (statusOf(a) === 'closed' ? 'Started, not submitted' : 'In progress') : 'Not started';
            return `<tr><td class="left"><b>${esc(p.name)}</b><div class="muted small">${esc(p.className)}</div>${isOutside(a, learnerById(p.id) ?? p) ? outsidePill(p.className) : ''}</td>
              <td class="small">${status}</td>
              <td>${at && at.startedAt ? fmtTime((at.submittedAt - at.startedAt) / 1000) : '-'}</td>
              <td>${at ? `${sum(autoFor(at))}` : '-'}</td>
              <td>${r ? `<b>${r.total} / ${r.max}</b> <span class="pill ok">Released</span>` : at && hasShort ? '<span class="pill accent">To mark</span>' : at ? `${sum(autoFor(at))} / ${a.totalMarks}` : '-'}</td>
              <td><div class="row" style="flex-wrap:nowrap;justify-content:center">
                ${at ? `<button class="btn btn-sm btn-primary" data-mark="${esc(p.id)}" type="button">${hasShort && !r ? 'Mark' : 'View'}</button>` : ''}
                ${st || at ? `<button class="btn btn-sm" data-retake="${esc(p.id)}" type="button">Allow retake</button>` : ''}</div></td></tr>`;
          }).join('') || '<tr><td colspan="6">No learners in this class yet.</td></tr>'}</tbody></table></div>
        ${qStats ? `<div class="card" style="margin-top:16px"><h3>How the class did on each question</h3>
          <div class="table-wrap"><table class="data"><thead><tr><th>#</th><th class="left">Question</th><th>Correct</th></tr></thead><tbody>${qStats}</tbody></table></div>
          <p class="muted small" style="margin:8px 0 0">Questions under 50% are highlighted: worth going over in class.</p></div>` : ''}
        <div data-detail></div>`;
    };

    const showDetail = (learnerId: string) => {
      const at = attemptOf(learnerId)!;
      const r = resultOf(learnerId);
      const auto = autoFor(at);
      const box = host.querySelector('[data-detail]') as HTMLElement;
      box.innerHTML = `<div class="card" style="margin-top:16px" data-learner="${esc(learnerId)}">
        <h3>${esc(at.learnerName)} <span class="muted small">${esc(at.className)}</span></h3>
        ${questions.map((q, i) => {
          const resp = at.responses[q.id] ?? null;
          const k = key[q.id] ?? {};
          const yours = resp === null || resp === '' ? '<i>No answer</i>' : q.type === 'mcq' ? `${LETTERS[Number(resp)]}. ${esc(q.options?.[Number(resp)] ?? '')}` : richText(String(resp));
          const correct = q.type === 'mcq' && k.correct != null ? `${LETTERS[k.correct]}. ${esc(q.options?.[k.correct] ?? '')}` : q.type === 'number' ? `${k.value ?? ''} ${esc(q.unit ?? '')}` : richText(k.model ?? '');
          const score = r?.scores?.[q.id] ?? auto[q.id];
          return `<div class="review-item ${q.type === 'short' ? '' : (score ?? 0) >= q.marks ? 'ok' : 'bad'}">
            <div class="qmeta"><span>Question ${i + 1} (${q.marks} mark${q.marks === 1 ? '' : 's'})</span>
              ${q.type === 'short' ? `<label class="row small" style="gap:6px">Mark <input type="number" data-qmark="${esc(q.id)}" min="0" max="${q.marks}" step="0.5" style="width:90px" value="${score ?? ''}" /> / ${q.marks}</label>` : `<span>${score ?? 0} / ${q.marks}</span>`}</div>
            <p style="font-weight:600;margin:6px 0">${richText(q.text)}</p>
            <p style="margin:4px 0">Answer: <b>${yours}</b></p>
            ${correct ? `<p class="muted" style="margin:4px 0">${q.type === 'short' ? 'Model answer' : 'Correct'}: ${correct}</p>` : ''}
          </div>`;
        }).join('')}
        <label class="field"><span>Comment for the learner (optional)</span><textarea data-comment rows="2">${esc(r?.comment ?? '')}</textarea></label>
        <div class="row"><button class="btn btn-primary" data-release type="button">${r ? 'Update released result' : 'Release result to learner'}</button><span data-saved class="small"></span></div>
      </div>`;
      box.scrollIntoView({ behavior: 'smooth' });
    };

    const release = async (learnerId: string, manual: Record<string, number> = {}, comment = '') => {
      const at = attemptOf(learnerId)!;
      const scores = { ...autoFor(at), ...manual };
      const res: Result = { assessmentId: a.id, learnerId, scores, total: sum(scores), max: a.totalMarks, comment, releasedAt: Date.now() };
      await releaseResult(res);
      data.results = [...data.results.filter((x) => !(x.assessmentId === a.id && x.learnerId === learnerId)), res];
    };

    draw();
    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-back]')) { await load(); return renderList(); }
      const mk = t.closest<HTMLElement>('[data-mark]')?.dataset.mark;
      if (mk) return showDetail(mk);
      const rt = t.closest<HTMLElement>('[data-retake]')?.dataset.retake;
      if (rt) {
        const name = people.find((p) => p.id === rt)?.name ?? 'this learner';
        if (!(await confirmDialog(`Let ${name} take this test again? Their current answers and result will be deleted.`, 'Allow retake', true))) return;
        await allowRetake(rt, a.id);
        await load();
        return renderResults(a);
      }
      if (t.closest('[data-releaseall]')) {
        const todo = people.filter((p) => attemptOf(p.id) && !resultOf(p.id));
        if (!todo.length) return toast('All submitted results are already released.');
        if (!(await confirmDialog(`Release results to ${todo.length} learner(s)?`, 'Release'))) return;
        for (const p of todo) await release(p.id);
        toast('Results released.');
        return draw();
      }
      if (t.closest('[data-csv]')) {
        const rows = [['learner', 'class', 'submitted', 'minutes_taken', ...questions.map((_, i) => `Q${i + 1}`), 'total', 'max', 'released']];
        for (const p of people) {
          const at = attemptOf(p.id); if (!at) continue;
          const r = resultOf(p.id); const auto = autoFor(at);
          const sc = questions.map((q) => r?.scores?.[q.id] ?? auto[q.id] ?? '');
          rows.push([p.name, p.className, new Date(at.submittedAt).toISOString(), at.startedAt ? String(Math.round((at.submittedAt - at.startedAt) / 6000) / 10) : '',
            ...sc.map(String), String(r?.total ?? sum(auto)), String(a.totalMarks), r ? 'yes' : 'no']);
        }
        downloadText(`${a.title.replace(/[^A-Za-z0-9]+/g, '-')}-results.csv`, rows.map((r) => r.map(csvCell).join(',')).join('\r\n'));
        return;
      }
      if (t.closest('[data-release]')) {
        const card = t.closest<HTMLElement>('[data-learner]')!;
        const manual: Record<string, number> = {};
        for (const inp of card.querySelectorAll<HTMLInputElement>('[data-qmark]')) {
          const q = questions.find((x) => x.id === inp.dataset.qmark)!;
          const v = Number(inp.value);
          if (inp.value === '' || !(v >= 0 && v <= q.marks)) { (card.querySelector('[data-saved]') as HTMLElement).innerHTML = `<span class="mark-bad">Give every written answer a mark from 0 to ${q.marks}.</span>`; return; }
          manual[q.id] = v;
        }
        try {
          await release(card.dataset.learner!, manual, (card.querySelector('[data-comment]') as HTMLTextAreaElement).value.trim());
          toast('Result released.');
          draw();
        } catch {
          (card.querySelector('[data-saved]') as HTMLElement).innerHTML = '<span class="mark-bad">Could not save. Check your connection.</span>';
        }
      }
    };
  };

  try {
    await load();
  } catch (ex) {
    console.error(ex);
    host.innerHTML = feedbackHTML('bad', 'Could not load tests.', '<p>Check your internet connection, and that the latest security rules are published in Firebase.</p>');
    return;
  }
  renderList();
}
