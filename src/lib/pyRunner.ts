/**
 * A small Python runner that can sit inside any page (used in the teacher's marking view).
 * All runners on a page share one background Python (Pyodide) worker; starting a run
 * in one runner stops any run still going in another.
 */
import { esc } from './dom';
import { icon } from './icons';

type WMsg = { type: string; text?: string; ok?: boolean; ms?: number; version?: string };
interface Active { onMsg: (m: WMsg) => void; onKill: () => void }

let worker: Worker | null = null;
let ready = false;
let version = '';
let active: Active | null = null;
const readyWaiters = new Set<() => void>();

function ensureWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL('../python/worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<WMsg>) => {
    const m = e.data;
    if (m.type === 'ready') { ready = true; version = m.version ?? ''; readyWaiters.forEach((f) => f()); readyWaiters.clear(); return; }
    if (m.type === 'done') ready = true;
    active?.onMsg(m);
    if (m.type === 'done' || m.type === 'fail') active = null;
    if (m.type === 'fail') { w.terminate(); if (worker === w) { worker = null; ready = false; } }
  };
  worker = w; ready = false;
  w.postMessage({ type: 'load' });
  return w;
}
function killWorker() {
  worker?.terminate(); worker = null; ready = false;
  const a = active; active = null; a?.onKill();
}

/** Inputs saved at the top of a learner's output file by Python practice's Hand in (see handInCode). */
export const INPUT_HEADER = 'Input typed (one answer per line):';
export const INPUT_END = '-----';
export function inputsFromOutput(text: string): string | null {
  if (!text.startsWith(INPUT_HEADER)) return null;
  const end = text.indexOf(`\n${INPUT_END}\n`);
  return end < 0 ? null : text.slice(INPUT_HEADER.length + 1, end + 1).replace(/\n$/, '');
}
export function withInputHeader(stdin: string, output: string): string {
  const s = stdin.replace(/\n+$/, '');
  return s ? `${INPUT_HEADER}\n${s}\n${INPUT_END}\n${output}` : output;
}

/** Looks like Python a learner typed into an answer box (rather than ordinary sentences). */
export function looksLikePython(text: string): boolean {
  return /(^|\n)\s*(print\s*\(|def \w+\s*\(|import \w|from \w+ import|for \w+ in |while .+:|if .+:|elif .+:|else\s*:|\w+\s*=\s*(input|int|float|str)\s*\()/.test(text);
}

/**
 * Put a runner in `host`. The code is an editable copy: the learner's work is never changed.
 * Returns a function that removes the runner (and stops it if it is running).
 */
export function mountPyRunner(host: HTMLElement, opts: { code: string; stdin?: string; label: string }): () => void {
  host.innerHTML = `<div class="py-inline">
    <div class="py-grid">
      <div class="py-editor-wrap"><div class="py-file">${esc(opts.label)} <span class="muted">(a copy you can change)</span></div>
        <textarea class="py-editor" data-pycode spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python code">${esc(opts.code)}</textarea>
        <details class="py-input" ${opts.stdin ? 'open' : ''}><summary>Input box: answers for input(), one per line${opts.stdin ? ' (filled with what the learner typed)' : ''}</summary>
          <textarea data-pystdin rows="3" spellcheck="false" aria-label="Input for the program">${esc(opts.stdin ?? '')}</textarea></details>
      </div>
      <div class="py-out-wrap"><div class="py-file">TERMINAL <span data-pystatus class="py-status"></span></div><pre class="py-out" data-pyout aria-live="polite"></pre></div>
    </div>
    <div class="row" style="margin-top:8px">
      <button class="btn btn-primary btn-sm" data-pyrun type="button">${icon('play', 16)} Run</button>
      <button class="btn btn-sm" data-pystop type="button" disabled>Stop</button>
      <button class="btn btn-sm" data-pyreset type="button">Undo my changes</button>
    </div></div>`;
  const code = host.querySelector('[data-pycode]') as HTMLTextAreaElement;
  const stdin = host.querySelector('[data-pystdin]') as HTMLTextAreaElement;
  const out = host.querySelector('[data-pyout]') as HTMLElement;
  const status = host.querySelector('[data-pystatus]') as HTMLElement;
  const runBtn = host.querySelector('[data-pyrun]') as HTMLButtonElement;
  const stopBtn = host.querySelector('[data-pystop]') as HTMLButtonElement;
  let lines = 0;
  let me: Active | null = null;

  const write = (text: string, cls = '') => {
    if (lines > 2000) return;
    lines += (text.match(/\n/g) ?? []).length;
    if (lines > 2000) { out.insertAdjacentHTML('beforeend', '<span class="py-err">\n... output stopped after 2000 lines. Is there a loop that never ends?</span>\n'); stop(); return; }
    out.insertAdjacentHTML('beforeend', cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text));
    out.scrollTop = out.scrollHeight;
  };
  const setRunning = (on: boolean) => { runBtn.disabled = on; stopBtn.disabled = !on; };
  const showReady = () => { if (!me && ready) status.textContent = `Python ${version} ready`; };

  const run = () => {
    if (me) return;
    if (active) killWorker(); // another runner on the page was still going
    const w = ensureWorker();
    out.textContent = ''; lines = 0;
    setRunning(true);
    status.textContent = ready ? 'Running...' : 'Loading Python (the first time can take a while)...';
    if (!ready) readyWaiters.add(() => { if (me) status.textContent = 'Running...'; });
    me = {
      onMsg: (m) => {
        if (m.type === 'out') write(m.text ?? '');
        else if (m.type === 'echo') write(m.text ?? '', 'py-echo');
        else if (m.type === 'err') write(m.text ?? '', 'py-err');
        else if (m.type === 'done') { me = null; setRunning(false); status.textContent = m.ok ? `Finished in ${m.ms} ms` : 'Stopped with an error'; }
        else if (m.type === 'fail') {
          me = null; setRunning(false); status.textContent = '';
          write(navigator.onLine ? 'Python could not start. Reload the page and try again.\n' : 'Python needs the internet the first time it loads on this device. Connect once, then it works offline.\n', 'py-err');
        }
      },
      onKill: () => { me = null; setRunning(false); write('\nStopped.\n', 'py-err'); status.textContent = ''; },
    };
    active = me;
    w.postMessage({ type: 'run', code: code.value, stdin: stdin.value });
  };
  function stop() { if (me && active === me) killWorker(); }

  runBtn.addEventListener('click', run);
  stopBtn.addEventListener('click', stop);
  host.querySelector('[data-pyreset]')!.addEventListener('click', () => { code.value = opts.code; stdin.value = opts.stdin ?? ''; });
  code.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); code.setRangeText('    ', code.selectionStart, code.selectionEnd, 'end'); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
  });
  ensureWorker(); // start loading Python while the teacher reads the code
  if (ready) showReady(); else readyWaiters.add(showReady);
  return () => { stop(); readyWaiters.delete(showReady); host.innerHTML = ''; };
}
