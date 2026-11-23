import { esc, frag } from './dom';

/** Circular progress ring as an SVG string. */
export function ring(percent: number, size = 64, stroke = 8): string {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${p}% complete">
    <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="${size / 4.2}">${p}%</text>
  </svg>`;
}

export type FeedbackKind = 'ok' | 'bad' | 'info';

/** Feedback box HTML. `body` is trusted HTML (callers escape their own content). */
export function feedbackHTML(kind: FeedbackKind, title: string, body = ''): string {
  return `<div class="feedback ${kind}" role="status"><strong>${esc(title)}</strong>${body}</div>`;
}

export function toast(message: string, ms = 2800, action?: { label: string; run: () => void }) {
  const host = document.getElementById('toast');
  if (!host) return;
  const t = frag(`<div class="toast">${esc(message)}</div>`);
  if (action) {
    const b = frag<HTMLButtonElement>(`<button class="btn btn-sm btn-accent" type="button">${esc(action.label)}</button>`);
    b.onclick = () => { action.run(); t.remove(); };
    t.appendChild(b);
  }
  host.appendChild(t);
  if (ms > 0) setTimeout(() => t.remove(), ms);
}

/** Simple modal. Returns a close function. */
export function modal(contentHTML: string, opts: { dismissible?: boolean } = {}): { root: HTMLElement; close: () => void } {
  const back = frag(`<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">${contentHTML}</div></div>`);
  const close = () => back.remove();
  if (opts.dismissible !== false) back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.appendChild(back);
  const first = back.querySelector<HTMLElement>('input, button, select, textarea');
  first?.focus();
  return { root: back.querySelector('.modal') as HTMLElement, close };
}

export function confirmDialog(message: string, okLabel = 'Yes', danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    const m = modal(`<p style="font-size:1.1rem">${esc(message)}</p>
      <div class="row" style="justify-content:flex-end">
        <button class="btn" data-a="no" type="button">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-a="yes" type="button">${esc(okLabel)}</button>
      </div>`);
    m.root.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
      if (!a) return;
      m.close();
      resolve(a === 'yes');
    });
  });
}

/** Download text as a file (used for CSV export). */
export function downloadText(filename: string, text: string, mime = 'text/csv') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Add a Show / Hide button to every password or PIN box inside `root`,
 * so learners can check what they typed.
 */
export function addRevealToggles(root: ParentNode) {
  root.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => {
    if (input.parentElement?.classList.contains('pw-wrap')) return;
    const wrap = document.createElement('span');
    wrap.className = 'pw-wrap';
    input.replaceWith(wrap);
    wrap.appendChild(input);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle';
    btn.textContent = 'Show';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Show what you typed');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Hide what you typed' : 'Show what you typed');
      input.focus();
    });
    wrap.appendChild(btn);
  });
}
