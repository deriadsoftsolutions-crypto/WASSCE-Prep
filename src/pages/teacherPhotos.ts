/** Teacher dashboard: Photos (approve or reject learners' profile pictures). */
import { esc } from '../lib/dom';
import { confirmDialog, feedbackHTML, toast } from '../lib/ui';
import { avatarHTML } from '../lib/avatar';
import { listLearners, type LearnerInfo } from '../firebase/assignments';
import { allPhotos, approvePhoto, rejectPhoto, removePhoto, type PhotoDoc } from '../firebase/profilePhoto';
import { fmtDay } from './portfolioView';

export async function mountTeacherPhotos(host: HTMLElement, onChange?: () => void) {
  host.innerHTML = '<div class="skel"><span class="tall"></span><span></span></div>';
  let photos: (PhotoDoc & { uid: string })[] = [], learners: LearnerInfo[] = [];
  const load = async () => { [photos, learners] = await Promise.all([allPhotos(), listLearners()]); };
  const who = (uid: string) => learners.find((l) => l.id === uid) ?? { id: uid, name: 'Learner', className: '' };

  const render = () => {
    const waiting = photos.filter((p) => p.pending).sort((a, b) => (a.pendingAt ?? 0) - (b.pendingAt ?? 0));
    const approved = photos.filter((p) => p.approved);
    host.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 style="margin:0">Profile photos</h2>
        <span class="muted small">Only the learner and teachers can see these photos. A photo shows once you approve it.</span></div>
      <section class="card" data-photos>
        <h3>Waiting for approval (${waiting.length})</h3>
        ${waiting.length ? waiting.map((p) => { const l = who(p.uid); return `<div class="photo-row" data-prow="${p.uid}">
          ${avatarHTML(l.name, p.pending, 96)}
          <div class="profile-main"><b>${esc(l.name)}</b><div class="muted small">${esc(l.className)}${p.pendingAt ? `, sent ${fmtDay(p.pendingAt)}` : ''}</div>
            ${p.approved ? `<div class="small" style="margin-top:4px">Current photo: ${avatarHTML(l.name, p.approved, 32)}</div>` : ''}
            <div class="row" style="margin-top:8px"><button class="btn btn-primary btn-sm" data-approve="${p.uid}" type="button">Approve</button>
              <button class="btn btn-sm" data-reject="${p.uid}" type="button">Reject</button></div>
            <div data-rslot></div></div></div>`; }).join('') : '<p class="muted" style="margin:0">No photos waiting for approval.</p>'}
      </section>
      <details class="card"><summary><b>Approved photos (${approved.length})</b></summary>
        <div style="margin-top:10px">${approved.length ? approved.map((p) => { const l = who(p.uid); return `<div class="photo-row">${avatarHTML(l.name, p.approved, 56)}
          <div class="profile-main"><b>${esc(l.name)}</b><div class="muted small">${esc(l.className)}</div></div>
          <button class="btn btn-sm btn-danger" data-remove="${p.uid}" type="button">Take down</button></div>`; }).join('') : '<p class="muted" style="margin:0">None yet.</p>'}</div>
      </details>`;
  };

  host.onclick = async (e) => {
    const t = e.target as HTMLElement;
    try {
      const ap = t.closest<HTMLElement>('[data-approve]')?.dataset.approve;
      if (ap) { await approvePhoto(ap); toast(`Approved ${who(ap).name}'s photo.`); await load(); render(); onChange?.(); return; }
      const rj = t.closest<HTMLElement>('[data-reject]')?.dataset.reject;
      if (rj) {
        const slot = host.querySelector(`[data-prow="${rj}"] [data-rslot]`) as HTMLElement;
        slot.innerHTML = `<label class="field" style="margin-top:8px"><span>Reason (the learner sees this)</span><input data-rreason placeholder="e.g. Please use a clear photo of your face" /></label>
          <button class="btn btn-sm btn-danger" data-rsend="${rj}" type="button">Reject photo</button>`;
        (slot.querySelector('input') as HTMLInputElement).focus();
        return;
      }
      const rs = t.closest<HTMLElement>('[data-rsend]')?.dataset.rsend;
      if (rs) {
        const reason = ((host.querySelector(`[data-prow="${rs}"] [data-rreason]`) as HTMLInputElement)?.value ?? '').trim();
        await rejectPhoto(rs, reason || 'Please use a clear photo of your face.');
        toast('Photo rejected.'); await load(); render(); onChange?.();
        return;
      }
      const rm = t.closest<HTMLElement>('[data-remove]')?.dataset.remove;
      if (rm && (await confirmDialog(`Take down ${who(rm).name}'s photo? They can send a new one.`, 'Take down', true))) {
        await removePhoto(rm); await load(); render(); onChange?.();
      }
    } catch (ex) {
      console.error(ex);
      toast('Could not save. Check your connection and that the latest rules are published.');
    }
  };

  try { await load(); } catch (ex) {
    console.error(ex);
    host.innerHTML = feedbackHTML('bad', 'Could not load photos.', '<p>Check your internet connection, and that the latest security rules are published in Firebase.</p>');
    return;
  }
  render();
}
