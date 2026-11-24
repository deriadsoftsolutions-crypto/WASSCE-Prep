import { storage, usingFirebase } from '../storage';
import type { Attempt, AttemptKind, Learner } from '../types';
import { esc } from './dom';
import { addRevealToggles, confirmDialog, modal, toast } from './ui';
import * as acct from '../firebase/account';

let current: Learner | null = null;
let asking: Promise<Learner> | null = null;

export function learner(): Learner | null {
  return current;
}

export async function loadLearner(): Promise<Learner | null> {
  current = await storage.getLearner();
  return current;
}

function setCurrent(l: Learner | null) {
  current = l;
  window.dispatchEvent(new CustomEvent('learner-changed'));
}

function makeId(name: string, className: string): string {
  return `${name}|${className}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Ask who is practising. Firebase mode: sign in or sign up. Local mode: just name and class. */
export function askLearner(dismissible = false): Promise<Learner> {
  if (asking) return asking;
  asking = (usingFirebase ? signInDialog() : localDialog(dismissible)).finally(() => { asking = null; });
  return asking;
}

function localDialog(dismissible: boolean): Promise<Learner> {
  return new Promise((resolve) => {
    const m = modal(
      `<form id="who" class="stack">
        <h2>Welcome! Who is practising?</h2>
        <p class="muted">Your name and class are saved on this tablet only, so your progress is kept for you.</p>
        <label class="field"><span>Your name</span><input name="name" required maxlength="40" autocomplete="name" value="${esc(current?.name ?? '')}" /></label>
        <label class="field"><span>Class (for example 2 Sci A)</span><input name="cls" required maxlength="20" value="${esc(current?.className ?? '')}" /></label>
        <button class="btn btn-primary btn-big btn-block" type="submit">Start practising</button>
      </form>`,
      { dismissible },
    );
    const form = m.root.querySelector('form') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') ?? '').trim();
      const className = String(fd.get('cls') ?? '').trim();
      if (!name || !className) return;
      const l: Learner = { id: makeId(name, className), name, className, createdAt: Date.now() };
      await storage.setLearner(l);
      m.close();
      setCurrent(l);
      resolve(l);
    });
  });
}

function signInDialog(): Promise<Learner> {
  return new Promise((resolve) => {
    let mode: 'in' | 'new' = 'in';
    const m = modal(`<form class="stack" novalidate>
        <h2>Sign in to practise</h2>
        <div class="tabs" role="tablist">
          <button type="button" class="tab" role="tab" data-mode="in" aria-selected="true">I have an account</button>
          <button type="button" class="tab" role="tab" data-mode="new" aria-selected="false">I'm new here</button>
        </div>
        <label class="field"><span>Your full name</span><input name="name" required maxlength="40" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="e.g. Ama Mensah" /></label>
        <label class="field"><span>Class</span><input name="cls" required maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. 2 Sci A" /></label>
        <fieldset class="field" data-yearwrap hidden style="border:0;padding:0;margin:0 0 12px"><legend style="font-weight:600;margin-bottom:6px">Your year</legend>
          <div class="row">${[1, 2, 3].map((y) => `<label class="switch" style="border:1.5px solid var(--ink);border-radius:6px;padding:0 14px"><input type="radio" name="year" value="${y}" /> STEM ${y}</label>`).join('')}</div></fieldset>
        <label class="field"><span data-pinlabel>Your 6-digit PIN</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" /></label>
        <label class="field" data-confirm hidden><span>Type the PIN again</span><input name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" /></label>
        <div data-err></div>
        <button class="btn btn-primary btn-big btn-block" type="submit" data-submit>Sign in</button>
        <p class="muted small" data-help>Forgot your PIN? Ask your teacher. On a shared tablet, tap your name at the top, then Sign out when you finish.</p>
        <p class="small" style="margin:0"><a href="/teacher" data-teacher>Teacher sign in</a></p>
      </form>`, { dismissible: false });
    const form = m.root.querySelector('form') as HTMLFormElement;
    addRevealToggles(form);
    const err = form.querySelector('[data-err]') as HTMLElement;
    const submit = form.querySelector('[data-submit]') as HTMLButtonElement;

    const setMode = (md: typeof mode) => {
      mode = md;
      form.querySelectorAll('[data-mode]').forEach((t) => t.setAttribute('aria-selected', String((t as HTMLElement).dataset.mode === md)));
      (form.querySelector('[data-confirm]') as HTMLElement).hidden = md !== 'new';
      (form.querySelector('[data-yearwrap]') as HTMLElement).hidden = md !== 'new';
      (form.querySelector('[data-pinlabel]') as HTMLElement).textContent = md === 'new' ? 'Choose a 6-digit PIN (keep it secret, remember it)' : 'Your 6-digit PIN';
      submit.textContent = md === 'new' ? 'Create my account' : 'Sign in';
      err.innerHTML = '';
    };
    form.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const md = t.closest<HTMLElement>('[data-mode]')?.dataset.mode as typeof mode | undefined;
      if (md) setMode(md);
      if (t.closest('[data-teacher]')) { m.close(); asking = null; }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') ?? '').trim().replace(/\s+/g, ' ');
      const className = String(fd.get('cls') ?? '').trim().replace(/\s+/g, ' ');
      const pin = String(fd.get('pin') ?? '');
      const fail = (msg: string) => { err.innerHTML = `<p class="mark-bad" style="margin:0">${esc(msg)}</p>`; };
      if (name.split(' ').length < 2) return fail('Please type your first name and surname.');
      if (!className) return fail('Please type your class, for example 2 Sci A.');
      if (!/^\d{6}$/.test(pin)) return fail('Your PIN must be exactly 6 digits.');
      if (mode === 'new' && pin !== String(fd.get('pin2') ?? '')) return fail('The two PINs do not match.');
      const year = Number(fd.get('year')) as 1 | 2 | 3;
      if (mode === 'new' && ![1, 2, 3].includes(year)) return fail('Choose your year: STEM 1, STEM 2 or STEM 3.');
      submit.disabled = true;
      submit.textContent = 'Please wait...';
      try {
        if (mode === 'new') await acct.learnerSignUp(name, className, pin, year);
        else await acct.learnerSignIn(name, className, pin);
        const l = await storage.getLearner();
        if (!l) throw new Error('Not signed in');
        m.close();
        setCurrent(l);
        toast(`Welcome, ${l.name.split(' ')[0]}!`);
        resolve(l);
      } catch (ex) {
        fail(acct.authErrorMessage(ex));
        submit.disabled = false;
        submit.textContent = mode === 'new' ? 'Create my account' : 'Sign in';
      }
    });
  });
}

/** Sign out (Firebase) or switch learner (local mode). */
export async function signOutOrSwitch() {
  if (!usingFirebase) {
    await askLearner(true);
    return;
  }
  const l = current;
  if (!(await confirmDialog(`Sign out${l ? ` ${l.name}` : ''}? Your progress is saved to your account.`, 'Sign out'))) return;
  await storage.setLearner(null);
  setCurrent(null);
  if (location.pathname !== '/teacher') void askLearner();
}

/** Teacher sign-in on /teacher changes the user; refresh the session to match. */
export async function refreshLearner() {
  setCurrent(await storage.getLearner());
}

export interface ResultInput {
  kind: AttemptKind;
  itemId: string;
  topicId?: number;
  score: number;
  max: number;
  durationSec?: number;
  details?: Record<string, unknown>;
}

/** Save a finished attempt for the current learner through the storage adapter. */
export async function saveResult(r: ResultInput): Promise<Attempt | null> {
  const l = current ?? (await askLearner());
  try {
    return await storage.saveAttempt({ ...r, learnerId: l.id, learnerName: l.name, className: l.className });
  } catch (e) {
    console.error(e);
    toast('Could not save your result.');
    return null;
  }
}

/** Ask which STEM year the learner is in (sign-up asks this; older accounts are asked once). */
export function askYear(current?: 1 | 2 | 3): Promise<void> {
  const l = learner();
  if (!l) return Promise.resolve();
  return new Promise((resolve) => {
    const m = modal(`<form class="stack">
        <h2>${current ? 'Change your year' : 'Which year are you in?'}</h2>
        <p class="muted">The site shows the lessons and materials for your year. You can change this later on My Progress.</p>
        <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[1, 2, 3].map((y) => `<button type="submit" class="btn btn-big ${current === y ? 'btn-primary' : ''}" name="year" value="${y}">STEM ${y}</button>`).join('')}</div>
      </form>`, { dismissible: !!current });
    m.root.querySelector('form')!.addEventListener('submit', async (e) => {
      e.preventDefault();
      const y = Number(((e as SubmitEvent).submitter as HTMLButtonElement | null)?.value) as 1 | 2 | 3;
      if (![1, 2, 3].includes(y)) return;
      const next = { ...l, year: y };
      await storage.setLearner(next).catch(console.error);
      if (l.year && l.year !== y) await import('../firebase/portfolio').then((p) => p.recordYearChange(l.id, l.year!)).catch(console.error);
      m.close();
      setCurrent(next);
      resolve();
    });
  });
}
