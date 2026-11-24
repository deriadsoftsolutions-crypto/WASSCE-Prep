import { esc, fmtDate } from '../lib/dom';
import { confirmDialog, feedbackHTML, toast } from '../lib/ui';
import {
  allSubmissions, classKey, classesOf, deleteAssignment, listAssignments, listLearners, openFile, saveAssignment, saveFeedback,
  type Assignment, type Feedback, type LearnerInfo, type Submission,
} from '../firebase/assignments';
import { dueText, richText } from './assignments';
import { icon } from '../lib/icons';

/** Teacher dashboard: Assignments tab. */
export async function mountTeacherAssignments(host: HTMLElement) {
  host.innerHTML = '<p class="muted">Loading assignments...</p>';
  let assignments: Assignment[] = [];
  let learners: LearnerInfo[] = [];
  let subs: Submission[] = [];
  let feedback: Feedback[] = [];

  const load = async () => {
    [assignments, learners, { subs, feedback }] = await Promise.all([listAssignments(), listLearners(), allSubmissions()]);
  };
  const inClass = (a: Assignment) => learners.filter((l) => !a.classKey || classKey(l.className) === a.classKey);

  /* ---------- List ---------- */
  const renderList = () => {
    host.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <h2 style="margin:0">Assignments</h2>
        <button class="btn btn-primary" data-new type="button">+ New assignment</button>
      </div>
      ${assignments.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th class="left">Title</th><th>Class</th><th>Due</th><th>Submitted</th><th>Marked</th><th></th></tr></thead>
        <tbody>${assignments.map((a) => {
          const s = subs.filter((x) => x.assignmentId === a.id).length;
          const m = feedback.filter((x) => x.assignmentId === a.id).length;
          return `<tr>
            <td class="left"><b>${esc(a.title)}</b>${a.published ? '' : ' <span class="pill">Draft</span>'}</td>
            <td>${esc(a.className || 'All classes')}</td>
            <td class="small">${a.dueAt ? fmtDate(a.dueAt) : '-'}</td>
            <td>${s} / ${inClass(a).length}</td>
            <td>${m} / ${s}</td>
            <td><div class="row" style="justify-content:center;flex-wrap:nowrap">
              <button class="btn btn-sm btn-primary" data-open="${a.id}" type="button">Mark</button>
              <button class="btn btn-sm" data-edit="${a.id}" type="button">Edit</button></div></td>
          </tr>`;
        }).join('')}</tbody></table></div>`
        : '<div class="card"><p style="margin:0">No assignments yet. Tap <b>New assignment</b> to set work for your learners.</p></div>'}`;
  };

  /* ---------- Create / edit form ---------- */
  const renderForm = (a?: Assignment) => {
    const classes = classesOf(learners);
    const dueLocal = a?.dueAt ? new Date(a.dueAt - new Date(a.dueAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    const custom = a && a.className && !classes.some((c) => classKey(c) === a.classKey);
    host.innerHTML = `
      <div class="card" style="max-width:760px">
        <h2>${a ? 'Edit assignment' : 'New assignment'}</h2>
        <form class="stack" data-form novalidate>
          <label class="field"><span>Title</span><input name="title" maxlength="120" required value="${esc(a?.title ?? '')}" /></label>
          <label class="field"><span>Instructions</span><textarea name="instructions" rows="7" placeholder="What should learners do? Links are clickable.">${esc(a?.instructions ?? '')}</textarea></label>
          <div class="grid-2">
            <label class="field"><span>Class</span>
              <select name="cls">
                <option value="">All classes</option>
                ${classes.map((c) => `<option value="${esc(c)}" ${a && classKey(c) === a.classKey ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                <option value="__other" ${custom ? 'selected' : ''}>Other (type below)</option>
              </select></label>
            <label class="field" data-otherwrap ${custom ? '' : 'hidden'}><span>Class name</span><input name="other" value="${esc(custom ? a!.className : '')}" placeholder="e.g. 2 Sci A" /></label>
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
    form.querySelector('select[name=cls]')!.addEventListener('change', (e) => {
      (form.querySelector('[data-otherwrap]') as HTMLElement).hidden = (e.target as HTMLSelectElement).value !== '__other';
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const title = String(fd.get('title') ?? '').trim();
      const sel = String(fd.get('cls') ?? '');
      const className = sel === '__other' ? String(fd.get('other') ?? '').trim() : sel;
      const due = String(fd.get('due') ?? '');
      const marks = Math.round(Number(fd.get('marks')));
      const allowText = fd.get('allowText') === 'on';
      const allowFiles = fd.get('allowFiles') === 'on';
      const err = (m: string) => { (form.querySelector('[data-err]') as HTMLElement).innerHTML = `<p class="mark-bad" style="margin:0">${esc(m)}</p>`; };
      if (!title) return err('Give the assignment a title.');
      if (sel === '__other' && !className) return err('Type the class name.');
      if (!(marks >= 1)) return err('Total marks must be at least 1.');
      if (!allowText && !allowFiles) return err('Allow typed answers, file uploads, or both.');
      try {
        await saveAssignment({
          id: a?.id, createdAt: a?.createdAt, title, instructions: String(fd.get('instructions') ?? '').trim(),
          className, classKey: classKey(className), dueAt: due ? new Date(due).getTime() : null, maxMarks: marks,
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
  const renderMarking = (a: Assignment) => {
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
        <span class="muted">${esc(a.className || 'All classes')} · ${esc(dueText(a))} · ${a.maxMarks} marks</span></div>
      <details class="card"><summary><b>Instructions</b></summary><p style="margin:8px 0 0">${richText(a.instructions) || '-'}</p></details>
      ${rows.length ? rows.map((p) => {
        const s = subFor(p.id);
        const f = fbFor(p.id);
        return `<div class="card" data-learner="${esc(p.id)}">
          <div class="row"><b>${esc(p.name)}</b><span class="muted small">${esc(p.className)}</span><span class="spacer"></span>
            ${s ? `<span class="pill ok">Submitted ${fmtDate(s.submittedAt)}</span>${s.late ? ' <span class="pill" style="background:var(--bad-soft);color:var(--bad)">Late</span>' : ''}` : '<span class="pill">Not submitted</span>'}
            ${f ? `<span class="pill ok">Marked ${f.mark} / ${f.maxMarks}</span>` : ''}</div>
          ${s ? `
            ${s.text ? `<div class="model" style="margin-top:10px">${richText(s.text)}</div>` : ''}
            ${s.files.length ? `<div class="row" style="margin-top:10px">${s.files.map((file, i) => `<button class="btn btn-sm" data-file="${i}" type="button">${icon('file', 18)} ${esc(file.name)}</button>`).join('')}</div>` : ''}
            <div class="grid-2" style="margin-top:12px;align-items:end">
              <label class="field" style="margin:0"><span>Mark (out of ${a.maxMarks})</span><input type="number" data-mark min="0" max="${a.maxMarks}" step="0.5" value="${f ? f.mark : ''}" /></label>
              <label class="field" style="margin:0"><span>Comment for the learner</span><textarea data-comment rows="2">${esc(f?.comment ?? '')}</textarea></label>
            </div>
            <div class="row" style="margin-top:8px"><button class="btn btn-primary" data-save type="button">${f ? 'Update mark' : 'Save mark'}</button><span data-saved class="small"></span></div>` : ''}
        </div>`;
      }).join('') : '<div class="card"><p style="margin:0">No learners in this class yet.</p></div>'}`;

    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-back]')) { host.onclick = listClick; renderList(); return; }
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
