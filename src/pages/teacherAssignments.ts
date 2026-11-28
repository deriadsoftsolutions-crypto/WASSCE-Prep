import { inputsFromOutput, looksLikePython, mountPyRunner } from '../lib/pyRunner';
import { listClasses, type SchoolClass } from '../firebase/classes';
import { legacyClassFields, audienceOf, yearToken } from '../lib/audience';
import { audiencePickerHTML, readAudience, wireAudiencePicker } from './audiencePicker';
import { audienceCell, filterBarHTML, isOutside, matchesFilter, outsidePill, peopleFor, wireFilter } from './teacherShared';
import { esc, fmtDate } from '../lib/dom';
import { confirmDialog, feedbackHTML, toast } from '../lib/ui';
import {
  allSubmissions, deleteAssignment, fetchFileText, isPythonFile, isTextFile, listAssignments, listLearners, openFile, saveAssignment, saveFeedback,
  type Assignment, type Feedback, type LearnerInfo, type Submission,
} from '../firebase/assignments';
import { dueText, richText } from './assignments';
import { icon } from '../lib/icons';
import { READY_ASSIGNMENTS } from '../data/ready';
import { mountReadyPicker } from './readyPicker';
import { avatarHTML } from '../lib/avatar';
import { allPhotos, approvedPhotoOf } from '../firebase/profilePhoto';

/** Teacher dashboard: Assignments tab. */
export async function mountTeacherAssignments(host: HTMLElement) {
  host.innerHTML = '<p class="muted">Loading assignments...</p>';
  let assignments: Assignment[] = [];
  let learners: LearnerInfo[] = [];
  let subs: Submission[] = [];
  let feedback: Feedback[] = [];
  let classes: SchoolClass[] = [];

  const load = async () => {
    [assignments, learners, { subs, feedback }, , classes] = await Promise.all([listAssignments(), listLearners(), allSubmissions(), allPhotos().catch(() => []), listClasses().catch(() => [] as SchoolClass[])]);
  };
  const inClass = (a: Assignment) => peopleFor(a, learners);
  const learnerById = (id: string) => learners.find((l) => l.id === id);

  /* ---------- List ---------- */
  const renderList = () => {
    host.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <h2 style="margin:0">Assignments</h2>
        <div class="row"><button class="btn" data-ready type="button">+ Add ready-made assignment</button><button class="btn btn-primary" data-new type="button">+ New assignment</button></div>
      </div>
      <div data-readybox></div>
      ${assignments.length ? filterBarHTML(classes, { shown: assignments.filter((a) => matchesFilter(a, classes)).length, total: assignments.length }) : ''}
      ${assignments.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th class="left">Title</th><th>For</th><th>Due</th><th>Submitted</th><th>Marked</th><th></th></tr></thead>
        <tbody>${assignments.filter((a) => matchesFilter(a, classes)).map((a) => {
          const all = subs.filter((x) => x.assignmentId === a.id);
          const outside = all.filter((x) => isOutside(a, learnerById(x.learnerId))).length;
          const s = all.length - outside;
          const m = feedback.filter((x) => x.assignmentId === a.id).length;
          return `<tr>
            <td class="left"><b>${esc(a.title)}</b>${a.published ? '' : ' <span class="pill">Draft</span>'}</td>
            <td>${audienceCell(a, classes)}</td>
            <td class="small">${a.dueAt ? fmtDate(a.dueAt) : '-'}</td>
            <td>${s} / ${inClass(a).length}${outside ? `<div class="small" style="color:var(--muted)">${outside} from other classes</div>` : ''}</td>
            <td>${m} / ${all.length}</td>
            <td><div class="row" style="justify-content:center;flex-wrap:nowrap">
              <button class="btn btn-sm btn-primary" data-open="${a.id}" type="button">Mark</button>
              <button class="btn btn-sm" data-edit="${a.id}" type="button">Edit</button></div></td>
          </tr>`;
        }).join('')}</tbody></table></div>`
        : '<div class="card"><p style="margin:0">No assignments yet. Tap <b>New assignment</b> to set work for your learners.</p></div>'}`;
    wireFilter(host, renderList);
  };

  /* ---------- Create / edit form ---------- */
  const renderForm = (a?: Assignment) => {
    const dueLocal = a?.dueAt ? new Date(a.dueAt - new Date(a.dueAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    host.innerHTML = `
      <div class="card" style="max-width:760px">
        <h2>${a ? 'Edit assignment' : 'New assignment'}</h2>
        <form class="stack" data-form novalidate>
          <label class="field"><span>Title</span><input name="title" maxlength="120" required value="${esc(a?.title ?? '')}" /></label>
          <label class="field"><span>Instructions</span><textarea name="instructions" rows="7" placeholder="What should learners do? Links are clickable.">${esc(a?.instructions ?? '')}</textarea></label>
          ${audiencePickerHTML(a ? audienceOf(a) : [], classes)}
          <div class="grid-2">
            <label class="field"><span>Due date and time (optional)</span><input name="due" type="datetime-local" value="${dueLocal}" /></label>
            <label class="field"><span>Total marks</span><input name="marks" type="number" min="1" max="200" value="${a?.maxMarks ?? 10}" /></label>
            <label class="field"><span>Portfolio section</span><select name="psec">
              <option value="assignments">Assignment or exercise</option>
              <option value="projects" ${a?.portfolioSection === 'projects' ? 'selected' : ''}>Project or case study</option></select></label>
          </div>
          <label class="switch"><input type="checkbox" name="allowText" ${a?.allowText ?? true ? 'checked' : ''} /> Learners can type an answer</label>
          <label class="switch"><input type="checkbox" name="allowFiles" ${a?.allowFiles ?? true ? 'checked' : ''} /> Learners can upload files (photos, PDF, Word)</label>
          <label class="switch"><input type="checkbox" name="published" ${a?.published ?? true ? 'checked' : ''} /> Published (learners can see it)</label>
          <div data-err></div>
          <div class="row">
            <button class="btn btn-primary" type="submit">Save</button>
            <button class="btn" data-cancel type="button">Cancel</button>
            ${a ? '<span class="spacer"></span><button class="btn btn-danger" data-delete type="button">Delete</button>' : ''}
          </div>
        </form>
      </div>`;
    const form = host.querySelector('[data-form]') as HTMLFormElement;
    wireAudiencePicker(form, classes);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const title = String(fd.get('title') ?? '').trim();
      const aud = readAudience(form, classes);
      const due = String(fd.get('due') ?? '');
      const marks = Math.round(Number(fd.get('marks')));
      const allowText = fd.get('allowText') === 'on';
      const allowFiles = fd.get('allowFiles') === 'on';
      const err = (m: string) => { (form.querySelector('[data-err]') as HTMLElement).innerHTML = `<p class="mark-bad" style="margin:0">${esc(m)}</p>`; };
      if (!title) return err('Give the assignment a title.');
      if (!(marks >= 1)) return err('Total marks must be at least 1.');
      if (!allowText && !allowFiles) return err('Allow typed answers, file uploads, or both.');
      try {
        await saveAssignment({
          id: a?.id, createdAt: a?.createdAt, title, instructions: String(fd.get('instructions') ?? '').trim(),
          classIds: aud, ...legacyClassFields(aud, classes), dueAt: due ? new Date(due).getTime() : null, maxMarks: marks,
          allowText, allowFiles, portfolioSection: fd.get('psec') === 'projects' ? 'projects' : 'assignments', published: fd.get('published') === 'on',
        });
        toast('Assignment saved.');
        await load();
        renderList();
      } catch (ex) {
        console.error(ex);
        err('Could not save. Check your internet connection.');
      }
    });
    form.querySelector('[data-cancel]')!.addEventListener('click', renderList);
    form.querySelector('[data-delete]')?.addEventListener('click', async () => {
      const n = subs.filter((x) => x.assignmentId === a!.id).length;
      if (!(await confirmDialog(`Delete "${a!.title}"?${n ? ` ${n} learner(s) have already submitted; their work stays saved but the assignment disappears.` : ''}`, 'Delete', true))) return;
      await deleteAssignment(a!.id);
      await load();
      renderList();
    });
  };

  /* ---------- Submissions and marking ---------- */
  const texts = new Map<string, string>(); // learnerId:fileIndex -> file text
  const runners = new Map<string, () => void>(); // open Python runners in the marking view
  const closeRunners = () => { runners.forEach((close) => close()); runners.clear(); };
  const renderMarking = (a: Assignment) => {
    closeRunners();
    const people = inClass(a);
    const subFor = (id: string) => subs.find((s) => s.assignmentId === a.id && s.learnerId === id);
    const fbFor = (id: string) => feedback.find((f) => f.assignmentId === a.id && f.learnerId === id);
    // Learners who submitted but are no longer in the class list still appear.
    const extra = subs.filter((s) => s.assignmentId === a.id && !people.some((p) => p.id === s.learnerId))
      .map((s) => ({ id: s.learnerId, name: s.learnerName, className: s.className }));
    const rows = [...people, ...extra].sort((x, y) => Number(!!subFor(y.id)) - Number(!!subFor(x.id)) || x.name.localeCompare(y.name));
    host.innerHTML = `
      <button class="btn btn-sm" data-back type="button">← All assignments</button>
      <div class="page-head" style="margin-top:12px"><h2 style="margin:0">${esc(a.title)}</h2>
        <span class="muted">${audienceCell(a, classes)} · ${esc(dueText(a))} · ${a.maxMarks} marks</span></div>
      <details class="card"><summary><b>Instructions</b></summary><p style="margin:8px 0 0">${richText(a.instructions) || '-'}</p></details>
      ${rows.length ? rows.map((p) => {
        const s = subFor(p.id);
        const f = fbFor(p.id);
        return `<div class="card" data-learner="${esc(p.id)}">
          <div class="row">${avatarHTML(p.name, approvedPhotoOf(p.id), 32)}<b>${esc(p.name)}</b><span class="muted small">${esc(p.className)}</span><span class="spacer"></span>
            ${s ? `<span class="pill ok">Submitted ${fmtDate(s.submittedAt)}</span>${s.late ? ' <span class="pill" style="background:var(--bad-soft);color:var(--bad)">Late</span>' : ''}${isOutside(a, learnerById(p.id) ?? p) ? ` ${outsidePill(p.className)}` : ''}` : '<span class="pill">Not submitted</span>'}
            ${f ? `<span class="pill ok">Marked ${f.mark} / ${f.maxMarks}</span>` : ''}</div>
          ${s ? `
            ${s.text ? `<div class="model" style="margin-top:10px;white-space:pre-wrap">${richText(s.text)}</div>` : ''}
            ${s.text && looksLikePython(s.text) ? `<div class="row" style="margin-top:6px"><button class="btn btn-sm" data-runtext type="button">${icon('play', 16)} Run the typed answer as Python</button></div><div data-runbox="text"></div>` : ''}
            ${s.files.length ? `<div class="row" style="margin-top:10px">${s.files.map((file, i) => `<button class="btn btn-sm" data-file="${i}" type="button">${icon('file', 18)} ${esc(file.name)}</button>`).join('')}</div>` : ''}
            ${s.files.some(isTextFile) ? `<div class="code-view" data-codeview="${esc(p.id)}"><p class="muted small">Loading the code...</p></div>` : ''}
            <div class="grid-2" style="margin-top:12px;align-items:end">
              <label class="field" style="margin:0"><span>Mark (out of ${a.maxMarks})</span><input type="number" data-mark min="0" max="${a.maxMarks}" step="0.5" value="${f ? f.mark : ''}" /></label>
              <label class="field" style="margin:0"><span>Comment for the learner</span><textarea data-comment rows="2">${esc(f?.comment ?? '')}</textarea></label>
            </div>
            <div class="row" style="margin-top:8px"><button class="btn btn-primary" data-save type="button">${f ? 'Update mark' : 'Save mark'}</button><span data-saved class="small"></span></div>` : ''}
        </div>`;
      }).join('') : '<div class="card"><p style="margin:0">No learners in this class yet.</p></div>'}`;

    // Code and output files show inline, so the teacher can read them without downloading.
    host.querySelectorAll<HTMLElement>('[data-codeview]').forEach(async (box) => {
      const s = subFor(box.dataset.codeview!);
      if (!s) return;
      const parts = await Promise.all(s.files.map(async (f, i) => {
        if (!isTextFile(f)) return '';
        const text = await fetchFileText(f).catch(() => null);
        if (text === null) return `<p class="mark-bad small">Could not open ${esc(f.name)}.</p>`;
        texts.set(`${s.learnerId}:${i}`, text);
        const py = isPythonFile(f);
        return `<div class="row" style="margin-top:8px"><b>${esc(f.name)}</b>${py ? `<button class="btn btn-sm btn-primary" data-runhere="${i}" type="button">${icon('play', 16)} Run here</button>
            <button class="btn btn-sm" data-run="${i}" type="button">Open in Python practice</button>` : ''}</div>
          <pre class="lesson-code ${py ? '' : 'code-out'}"><code>${esc(text)}</code></pre>${py ? `<div data-runbox="${i}"></div>` : ''}`;
      }));
      box.innerHTML = parts.join('');
    });

    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-back]')) { closeRunners(); host.onclick = listClick; renderList(); return; }
      // Run a learner's Python right here, in a copy the teacher can change.
      const hereBtn = t.closest<HTMLElement>('[data-runhere], [data-runtext]');
      if (hereBtn) {
        const card2 = hereBtn.closest<HTMLElement>('[data-learner]')!;
        const s2 = subFor(card2.dataset.learner!)!;
        const which = hereBtn.dataset.runhere ?? 'text';
        const box = card2.querySelector<HTMLElement>(`[data-runbox="${which}"]`)!;
        const id = `${s2.learnerId}:${which}`;
        if (runners.has(id)) { runners.get(id)!(); runners.delete(id); hereBtn.innerHTML = `${icon('play', 16)} ${which === 'text' ? 'Run the typed answer as Python' : 'Run here'}`; return; }
        let code = s2.text; let stdin: string | undefined; let label = `${s2.learnerName}: typed answer`;
        if (which !== 'text') {
          const f = s2.files[Number(which)];
          code = texts.get(id) ?? await fetchFileText(f).catch(() => '');
          label = `${s2.learnerName}: ${f.name}`;
          // Python practice's Hand in saves the learner's inputs at the top of <name>_output.txt.
          const oi = s2.files.findIndex((x) => x.name === f.name.replace(/\.py$/i, '_output.txt'));
          if (oi >= 0) stdin = inputsFromOutput(texts.get(`${s2.learnerId}:${oi}`) ?? '') ?? undefined;
        }
        runners.set(id, mountPyRunner(box, { code, stdin, label }));
        hereBtn.textContent = 'Close the runner';
        return;
      }
      const runBtn = t.closest<HTMLElement>('[data-run]');
      if (runBtn) {
        const card2 = runBtn.closest<HTMLElement>('[data-learner]')!;
        const s2 = subFor(card2.dataset.learner!)!;
        const f = s2.files[Number(runBtn.dataset.run)];
        try {
          const code = await fetchFileText(f);
          localStorage.setItem('wassce.py.load', JSON.stringify({ code, title: `${s2.learnerName}: ${f.name}` }));
          window.open('/python?load=1', '_blank');
        } catch (ex) { toast((ex as Error).message); }
        return;
      }
      const card = t.closest<HTMLElement>('[data-learner]');
      if (!card) return;
      const s = subFor(card.dataset.learner!);
      const fileBtn = t.closest<HTMLElement>('[data-file]');
      if (fileBtn && s) {
        try { await openFile(s.files[Number(fileBtn.dataset.file)]); } catch (ex) { toast((ex as Error).message); }
        return;
      }
      if (t.closest('[data-save]') && s) {
        const mark = Number((card.querySelector('[data-mark]') as HTMLInputElement).value);
        const out = card.querySelector('[data-saved]') as HTMLElement;
        if (!(mark >= 0 && mark <= a.maxMarks)) { out.innerHTML = `<span class="mark-bad">Enter a mark from 0 to ${a.maxMarks}.</span>`; return; }
        const fb: Feedback = {
          assignmentId: a.id, learnerId: s.learnerId, mark, maxMarks: a.maxMarks,
          comment: (card.querySelector('[data-comment]') as HTMLTextAreaElement).value.trim(), markedAt: Date.now(),
        };
        try {
          await saveFeedback(fb);
          feedback = [...feedback.filter((x) => !(x.assignmentId === a.id && x.learnerId === s.learnerId)), fb];
          out.innerHTML = '<span class="mark-ok">Saved ✓ The learner can now see it.</span>';
        } catch {
          out.innerHTML = '<span class="mark-bad">Could not save. Check your connection.</span>';
        }
      }
    };
  };

  const listClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-new]')) return renderForm();
    if (t.closest('[data-ready]')) {
      mountReadyPicker(host.querySelector('[data-readybox]') as HTMLElement, 'Ready-made assignments',
        READY_ASSIGNMENTS.map((r) => ({ key: r.key, title: r.title, when: r.when, year: r.year, unitId: r.unitId, added: assignments.some((x) => x.title === r.title) })));
      return;
    }
    const rk = t.closest<HTMLElement>('[data-addready]')?.dataset.addready;
    if (rk) {
      const r = READY_ASSIGNMENTS.find((x) => x.key === rk)!;
      (t.closest('[data-addready]') as HTMLButtonElement).disabled = true;
      void (async () => {
        try {
          const id = await saveAssignment({
            title: r.title, instructions: r.instructions, classIds: [yearToken(r.year)], ...legacyClassFields([yearToken(r.year)], classes), dueAt: null, maxMarks: r.maxMarks,
            allowText: r.allowText, allowFiles: r.allowFiles, portfolioSection: r.portfolioSection, published: false,
          });
          toast(`Added as a draft for all of STEM ${r.year}. Choose the class, add a due date, then publish.`);
          await load();
          renderForm(assignments.find((x) => x.id === id));
        } catch (ex) {
          console.error(ex);
          toast('Could not add the assignment. Check your connection and that the latest rules are published.');
          renderList();
        }
      })();
      return;
    }
    const edit = t.closest<HTMLElement>('[data-edit]')?.dataset.edit;
    if (edit) return renderForm(assignments.find((x) => x.id === edit));
    const open = t.closest<HTMLElement>('[data-open]')?.dataset.open;
    if (open) {
      // Fetch fresh: learners may have submitted since the list was opened.
      host.innerHTML = '<p class="muted">Loading submissions...</p>';
      void load().then(() => renderMarking(assignments.find((x) => x.id === open)!));
    }
  };

  try {
    await load();
  } catch (ex) {
    console.error(ex);
    host.innerHTML = feedbackHTML('bad', 'Could not load assignments.', '<p>Check your internet connection, and that the latest security rules are published in Firebase.</p>');
    return;
  }
  host.onclick = listClick;
  renderList();
}
