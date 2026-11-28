import { esc, fmtDate } from '../lib/dom';
import { feedbackHTML, toast } from '../lib/ui';
import { learner } from '../lib/session';
import { usingFirebase } from '../storage';
import { navigate } from '../router';
import { refreshDue } from '../lib/due';
import { isForMe } from '../lib/audience';
import { outsideNotice } from './tests';
import { icon } from '../lib/icons';
import {
  deleteFile, fmtSize, getAssignmentForLearner, myFeedback, mySubmission, openFile, shrinkImage, submit, uploadFile,
  type Assignment, type Submission, type SubmittedFile,
} from '../firebase/assignments';

const MAX_FILES = 5;
const ACCEPT = 'image/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.py';

export { richText } from '../lib/richText';
import { richText } from '../lib/richText';

export function dueText(a: Assignment): string {
  if (!a.dueAt) return 'No due date';
  const ms = a.dueAt - Date.now();
  const when = fmtDate(a.dueAt);
  if (ms < 0) return `Was due ${when}`;
  const days = Math.floor(ms / 86_400_000);
  return days >= 1 ? `Due ${when} (in ${days} day${days > 1 ? 's' : ''})` : `Due ${when} (today)`;
}

function needsFirebase(el: HTMLElement): boolean {
  if (usingFirebase && learner()) return false;
  el.innerHTML = `<h1>Classwork</h1><p class="muted">${usingFirebase ? 'Sign in to see your classwork.' : 'Classwork needs learner accounts (Firebase mode).'}</p>`;
  return true;
}

export async function assignmentsPage(el: HTMLElement): Promise<(() => void) | void> {
  if (needsFirebase(el)) return;
  const { classworkPage } = await import('./classwork');
  return classworkPage(el);
}

export async function assignmentPage(el: HTMLElement, params: Record<string, string>) {
  if (needsFirebase(el)) return;
  el.innerHTML = '<p class="muted">Loading...</p>';
  const l = learner()!;
  const [a, existing, fb] = await Promise.all([
    getAssignmentForLearner(params.id).catch(() => null), mySubmission(params.id).catch(() => null), myFeedback(params.id).catch(() => null),
  ]);
  if (!a || !a.published) { el.innerHTML = '<h1>Assignment not found</h1><p><a href="/assignments">Back to assignments</a></p>'; return; }

  const draftKey = `wassce.assignmentDraft.${l.id}.${a.id}`;
  const draft = (() => { try { return JSON.parse(localStorage.getItem(draftKey) ?? 'null') as { text: string; files: SubmittedFile[] } | null; } catch { return null; } })();
  const state = {
    text: draft?.text ?? existing?.text ?? '',
    files: (draft?.files ?? existing?.files ?? []) as SubmittedFile[],
    uploading: 0,
  };
  const saveDraft = () => { try { localStorage.setItem(draftKey, JSON.stringify({ text: state.text, files: state.files })); } catch { /* ignore */ } };
  const clearDraft = () => { try { localStorage.removeItem(draftKey); } catch { /* ignore */ } };
  const locked = !!fb;

  el.innerHTML = `
    <a class="crumb" href="/assignments">← Classwork</a>
    <div class="page-head"><h1>${esc(a.title)}</h1><span class="pill">${a.maxMarks} marks</span></div>
    <p class="muted" style="margin-top:-8px">${esc(dueText(a))}</p>
    ${outsideNotice(a, l, 'assignment')}
    ${fb ? feedbackHTML(fb.mark >= fb.maxMarks * 0.5 ? 'ok' : 'info', `Your teacher marked this: ${fb.mark} / ${fb.maxMarks}`,
      fb.comment ? `<p style="margin:6px 0 0">${richText(fb.comment)}</p>` : '') : ''}
    <div class="card"><h2>Instructions</h2><p style="margin:0">${richText(a.instructions) || '<span class="muted">No instructions.</span>'}</p></div>
    <div class="card">
      <h2>Your work</h2>
      <div data-status>${existing ? `<p class="mark-ok" style="margin-top:0">✓ Submitted ${fmtDate(existing.submittedAt)}${existing.late ? ' (late)' : ''}.${locked ? '' : ' You can still change it until your teacher marks it.'}</p>` : ''}</div>
      ${a.allowText ? `<label class="field"><span>Your answer</span><textarea data-text rows="8" ${locked ? 'disabled' : ''} placeholder="Type your answer here.">${esc(state.text)}</textarea></label>` : ''}
      ${a.allowFiles ? `
        <p style="margin-bottom:6px"><b>Files</b> <span class="muted small">Photos of your work, PDF or Word. Up to ${MAX_FILES} files, 10 MB each.</span></p>
        <div data-files></div>
        ${locked ? '' : `<div class="row" style="margin-top:8px"><label class="btn"><input type="file" data-pick accept="${ACCEPT}" multiple hidden />${icon('upload', 20)} Add files or take a photo</label>
          <a class="btn" href="/python?for=${a.id}">${icon('play', 18)} Write it in Python practice</a></div>
          <p class="muted small" style="margin:6px 0 0">Writing Python? Use Python practice and press Hand in there. Your code and its output are added here.</p>`}` : ''}
      ${locked ? '' : `<div class="row" style="margin-top:16px"><button class="btn btn-primary btn-big" data-submit type="button">${existing ? 'Update my submission' : 'Submit'}</button></div>`}
      <div data-fb></div>
    </div>`;

  const filesHost = el.querySelector('[data-files]') as HTMLElement | null;
  const renderFiles = () => {
    if (!filesHost) return;
    filesHost.innerHTML = state.files.length
      ? state.files.map((f, i) => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--border)">
          ${icon('file', 20)}<button class="btn btn-sm btn-ghost" data-open="${i}" type="button" style="text-align:left">${esc(f.name)}</button>
          <span class="muted small">${fmtSize(f.size)}</span><span class="spacer"></span>
          ${locked ? '' : `<button class="btn btn-sm btn-danger" data-remove="${i}" type="button">Remove</button>`}</div>`).join('')
      : '<p class="muted small" style="margin:0">No files attached.</p>';
  };
  renderFiles();

  const fbBox = el.querySelector('[data-fb]') as HTMLElement;
  const showError = (m: string) => { fbBox.innerHTML = feedbackHTML('bad', m); };

  el.addEventListener('input', (e) => {
    const t = e.target as HTMLTextAreaElement;
    if (t.dataset.text !== undefined) { state.text = t.value; saveDraft(); }
  });

  el.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    if (input.dataset.pick === undefined || !input.files || !filesHost) return;
    const picked = Array.from(input.files);
    input.value = '';
    if (!navigator.onLine) return showError('You are offline. Connect to the internet to upload files.');
    if (state.files.length + picked.length > MAX_FILES) return showError(`You can attach up to ${MAX_FILES} files.`);
    fbBox.innerHTML = '';
    for (const original of picked) {
      const row = document.createElement('div');
      row.className = 'row small';
      row.innerHTML = `<span>Uploading ${esc(original.name)}</span><span class="spacer"></span><div class="bar" style="width:140px"><span style="width:0%"></span></div>`;
      filesHost.appendChild(row);
      state.uploading++;
      try {
        const file = await shrinkImage(original);
        if (file.size > 10 * 1024 * 1024) throw new Error(`${original.name} is bigger than 10 MB.`);
        const bar = row.querySelector('.bar > span') as HTMLElement;
        const saved = await uploadFile(a.id, file, (f) => { bar.style.width = `${Math.round(f * 100)}%`; });
        state.files.push(saved);
        saveDraft();
      } catch (err) {
        showError((err as Error).message);
      } finally {
        state.uploading--;
        row.remove();
        renderFiles();
      }
    }
  });

  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const open = t.closest<HTMLElement>('[data-open]');
    if (open) {
      try { await openFile(state.files[Number(open.dataset.open)]); } catch (err) { toast((err as Error).message); }
      return;
    }
    const rm = t.closest<HTMLElement>('[data-remove]');
    if (rm) {
      const f = state.files[Number(rm.dataset.remove)];
      state.files = state.files.filter((x) => x !== f);
      saveDraft();
      renderFiles();
      // Only delete the stored file if it is not part of the work already submitted.
      if (!existing?.files.some((x) => x.key === f.key)) deleteFile(f.key).catch(() => {});
      return;
    }
    if (t.closest('[data-submit]')) {
      if (state.uploading) return showError('Wait for your files to finish uploading.');
      if (!state.text.trim() && !state.files.length) return showError('Type an answer or attach a file before submitting.');
      const btn = t.closest('[data-submit]') as HTMLButtonElement;
      btn.disabled = true;
      const s: Submission = {
        assignmentId: a.id, learnerId: l.id, learnerName: l.name, className: l.className,
        text: state.text.trim(), files: state.files, submittedAt: Date.now(), late: !!a.dueAt && Date.now() > a.dueAt, outsideClass: !isForMe(a, l),
      };
      try {
        await submit(s);
        refreshDue();
        // Files removed from the earlier submission are no longer needed.
        existing?.files.filter((f) => !s.files.some((x) => x.key === f.key)).forEach((f) => deleteFile(f.key).catch(() => {}));
        clearDraft();
        toast('Submitted. Well done!');
        navigate(`/assignments/${a.id}`, true);
      } catch {
        btn.disabled = false;
        showError('Could not submit. Check your internet connection and try again.');
      }
    }
  });
}
