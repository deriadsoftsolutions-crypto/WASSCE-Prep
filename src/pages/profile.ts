/** Profile page (/profile): photo (approved by a teacher), details, year, portfolio status, PIN and sign out. */
import { esc } from '../lib/dom';
import { icon } from '../lib/icons';
import { askYear, learner, signOutOrSwitch } from '../lib/session';
import { usingFirebase } from '../storage';
import { avatarHTML } from '../lib/avatar';
import { getPhoto, photoFromFile, submitPhoto, type PhotoDoc } from '../firebase/profilePhoto';
import { changePin, isTeacher } from '../firebase/account';
import { getMeta } from '../firebase/portfolio';

const STATUS: Record<string, string> = { building: 'Building', 'handed-in': 'Handed in', returned: 'Returned for changes', marked: 'Marked' };

export async function profilePage(el: HTMLElement) {
  const l = learner();
  if (!usingFirebase || !l) { el.innerHTML = '<h1>My profile</h1><p class="muted">Sign in to see your profile.</p>'; return; }
  el.innerHTML = '<div class="skel"><span class="tall"></span><span></span></div>';
  if (await isTeacher().catch(() => false)) {
    el.innerHTML = `<h1>My profile</h1><div class="card"><p style="margin-top:0"><b>${esc(l.name)}</b>, teacher account.</p>
      <div class="row"><a class="btn" href="/teacher">Teacher dashboard</a><button class="btn" data-act="signout" type="button">Sign out</button></div></div>`;
    el.querySelector('[data-act=signout]')!.addEventListener('click', () => void signOutOrSwitch());
    return;
  }
  let photo: PhotoDoc = await getPhoto(l.id).catch(() => ({ pending: null, pendingAt: null, approved: null, approvedAt: null, rejectedReason: null }));
  const year = l.year ?? 1;
  const meta = await getMeta(l.id, year).catch(() => null);

  const statusHTML = () => photo.pending
    ? `<span class="mark-ok">Waiting for your teacher to approve your new photo.</span> ${avatarHTML(l.name, photo.pending, 48)}`
    : photo.rejectedReason
      ? `<span class="mark-bad">Your teacher did not approve your last photo: ${esc(photo.rejectedReason)}</span>`
      : photo.approved ? '<span class="muted">Your teacher approved this photo. Only you and your teachers can see it.</span>'
        : '<span class="muted">Add a photo of your face. Your teacher checks it first, and only you and your teachers can see it.</span>';

  el.innerHTML = `
    <h1>My profile</h1>
    <section class="card profile-head">
      <div data-bigavatar>${avatarHTML(l.name, photo.approved, 120)}</div>
      <div class="profile-main">
        <h2 style="margin:0">${esc(l.name)}</h2>
        <p style="margin:4px 0 12px">${esc(l.className)}, STEM ${year}</p>
        <p class="small" data-photostatus style="margin:0 0 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">${statusHTML()}</p>
        <div class="row">
          <label class="btn btn-primary"><input type="file" accept="image/*" capture="user" data-photo-cam hidden />${icon('upload', 20)} Take a photo</label>
          <label class="btn"><input type="file" accept="image/*" data-photo-file hidden />Choose a photo</label>
        </div>
        <p class="mark-bad small" data-photoerr style="margin:8px 0 0"></p>
      </div>
    </section>
    <section class="card">
      <h2>My class and year</h2>
      ${l.classId
        ? `<p style="margin:-4px 0 0">You are in <b>${esc(l.className)}</b>, <b>STEM ${year}</b>. The site shows lessons, classwork and your portfolio for your class and year. If this is wrong, ask your teacher to move you.</p>`
        : `<p style="margin-top:-4px">You are in <b>STEM ${year}</b>. The site shows lessons, materials and your portfolio for this year.</p>
      <button class="btn" data-act="year" type="button">Change my year</button>`}
    </section>
    <section class="card">
      <h2>My portfolio</h2>
      <p style="margin-top:-4px">STEM ${year} portfolio: <b>${STATUS[meta?.status ?? 'building']}</b></p>
      <a class="btn" href="/portfolio">Open my portfolio</a>
    </section>
    <form class="card" data-pinform novalidate>
      <h2>Change my PIN</h2>
      <div class="grid-2">
        <label class="field"><span>Current PIN</span><input name="cur" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" /></label>
        <span></span>
        <label class="field"><span>New 6-digit PIN</span><input name="new1" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" /></label>
        <label class="field"><span>New PIN again</span><input name="new2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" /></label>
      </div>
      <div class="row"><button class="btn btn-primary" data-pinsave type="button">Change PIN</button><span data-pinmsg class="small"></span></div>
    </form>
    <section class="card">
      <h2>Sign out</h2>
      <p style="margin-top:-4px">On a shared tablet, sign out when you finish.</p>
      <button class="btn" data-act="signout" type="button">Sign out</button>
    </section>`;

  const status = el.querySelector('[data-photostatus]') as HTMLElement;
  const err = el.querySelector('[data-photoerr]') as HTMLElement;
  el.addEventListener('change', async (e) => {
    const inp = e.target as HTMLInputElement;
    if (inp.type !== 'file' || !inp.files?.length) return;
    const file = inp.files[0];
    inp.value = '';
    err.textContent = '';
    try {
      status.textContent = 'Preparing your photo...';
      const url = await photoFromFile(file);
      status.textContent = 'Sending...';
      await submitPhoto(l.id, url);
      photo = { ...photo, pending: url, pendingAt: Date.now(), rejectedReason: null };
    } catch (ex) {
      err.textContent = (ex as Error).message || 'Could not send the photo. Check your internet connection.';
    }
    status.innerHTML = statusHTML();
  });
  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'signout') return void signOutOrSwitch();
    if (act === 'year' && !l.classId) { await askYear(l.year); return void profilePage(el); }
    if (!t.closest('[data-pinsave]')) return;
    const fd = new FormData(el.querySelector('[data-pinform]') as HTMLFormElement);
    const [cur, n1, n2] = ['cur', 'new1', 'new2'].map((k) => String(fd.get(k) ?? '').trim());
    const msg = el.querySelector('[data-pinmsg]') as HTMLElement;
    const say = (ok: boolean, text: string) => { msg.innerHTML = `<span class="${ok ? 'mark-ok' : 'mark-bad'}">${esc(text)}</span>`; };
    if (!/^\d{6}$/.test(cur)) return say(false, 'Type your current PIN (6 digits).');
    if (!/^\d{6}$/.test(n1)) return say(false, 'Your new PIN must be 6 digits.');
    if (n1 !== n2) return say(false, 'The new PINs do not match.');
    if (n1 === cur) return say(false, 'Choose a PIN different from your current one.');
    const btn = t.closest('[data-pinsave]') as HTMLButtonElement;
    btn.disabled = true;
    try {
      await changePin(cur, n1);
      (el.querySelector('[data-pinform]') as HTMLFormElement).reset();
      say(true, 'PIN changed. Use your new PIN next time you sign in.');
    } catch (ex) {
      say(false, (ex as Error).message);
    } finally {
      btn.disabled = false;
    }
  });
}
