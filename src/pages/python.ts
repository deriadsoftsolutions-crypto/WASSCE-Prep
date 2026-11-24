/**
 * Python practice (/python): write and run Python on any device, with no install.
 * Python runs in a background worker (Pyodide). The first visit downloads about 13 MB;
 * after that it works offline. Examples are the Python 1 lesson files learners use in VS Code.
 */
import { esc } from '../lib/dom';
import { icon } from '../lib/icons';
import hello from '../../teaching/python-1/vscode-files/00_hello_robot.py?raw';
import variables from '../../teaching/python-1/vscode-files/01_variables.py?raw';
import robotId from '../../teaching/python-1/vscode-files/02_robot_id_support.py?raw';
import naming from '../../teaching/python-1/vscode-files/03_naming_game.py?raw';
import types from '../../teaching/python-1/vscode-files/04_types.py?raw';
import mission from '../../teaching/python-1/vscode-files/05_mission.py?raw';
import operators from '../../teaching/python-1/vscode-files/06_operators.py?raw';

const EXAMPLES: { id: string; label: string; code: string }[] = [
  { id: 'blank', label: 'Blank file', code: '' },
  { id: 'hello', label: '0. Hello, robot', code: hello },
  { id: 'variables', label: '1. Variables', code: variables },
  { id: 'robot-id', label: '2. Robot ID card (Activity 5.2)', code: robotId },
  { id: 'naming', label: '3. Naming game', code: naming },
  { id: 'types', label: '4. Data types', code: types },
  { id: 'mission', label: '5. Mission (Activities 5.3 and 5.4)', code: mission },
  { id: 'operators', label: '6. Operators', code: operators },
];
const DRAFT_KEY = 'wassce.py.draft';
const STDIN_KEY = 'wassce.py.stdin';
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

let worker: Worker | null = null;
let ready = false;
const newWorker = () => new Worker(new URL('../python/worker.ts', import.meta.url), { type: 'module' });

export function pythonPage(el: HTMLElement) {
  const want = new URLSearchParams(location.search).get('example');
  const start = EXAMPLES.find((x) => x.id === want)?.code ?? store.get(DRAFT_KEY) ?? hello;
  el.innerHTML = `
    <div class="page-head"><h1>Python practice</h1><span class="muted small">Write Python and press Run. It runs on this device.</span></div>
    <div class="py-bar">
      <label class="field py-example"><span>Start from</span><select data-example aria-label="Start from an example">
        <option value="">Choose an example...</option>${EXAMPLES.map((x) => `<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select></label>
      <div class="row">
        <button class="btn btn-primary" data-run type="button">${icon('play', 18)} Run</button>
        <button class="btn" data-stop type="button" disabled>Stop</button>
        <button class="btn" data-clear type="button">Clear output</button>
        <button class="btn" data-save type="button">Save as .py</button>
      </div>
    </div>
    <div class="py-grid">
      <div class="py-editor-wrap">
        <div class="py-file">my_program.py</div>
        <textarea class="py-editor" data-code spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python code">${esc(start)}</textarea>
        <details class="py-input"><summary>Input for input() (one answer per line)</summary>
          <textarea data-stdin rows="3" spellcheck="false" aria-label="Input for the program">${esc(store.get(STDIN_KEY) ?? '')}</textarea></details>
      </div>
      <div class="py-out-wrap">
        <div class="py-file">TERMINAL <span data-status class="py-status"></span></div>
        <pre class="py-out" data-out aria-live="polite"></pre>
      </div>
    </div>
    <p class="muted small">Tips: Tab adds 4 spaces. Ctrl+Enter runs. The first time, Python downloads once (about 13 MB), then works without internet. In class you use VS Code; this page is for practice anywhere.</p>`;

  const code = el.querySelector('[data-code]') as HTMLTextAreaElement;
  const stdin = el.querySelector('[data-stdin]') as HTMLTextAreaElement;
  const out = el.querySelector('[data-out]') as HTMLElement;
  const status = el.querySelector('[data-status]') as HTMLElement;
  const runBtn = el.querySelector('[data-run]') as HTMLButtonElement;
  const stopBtn = el.querySelector('[data-stop]') as HTMLButtonElement;
  let running = false;
  let lines = 0;

  /** Append output exactly as Python wrote it (input() prompts have no newline). */
  const write = (text: string, cls = '') => {
    if (lines > 2000) return;
    lines += (text.match(/\n/g) ?? []).length;
    if (lines > 2000) { out.insertAdjacentHTML('beforeend', '<span class="py-err">\n... output stopped after 2000 lines. Is there a loop that never ends?</span>\n'); stop(); return; }
    out.insertAdjacentHTML('beforeend', cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text));
    out.scrollTop = out.scrollHeight;
  };
  const setRunning = (on: boolean) => { running = on; runBtn.disabled = on; stopBtn.disabled = !on; };
  const wire = (w: Worker) => {
    w.onmessage = (e: MessageEvent<{ type: string; text?: string; ok?: boolean; ms?: number; version?: string }>) => {
      const m = e.data;
      if (m.type === 'ready') { ready = true; status.textContent = `Python ${m.version} ready`; }
      else if (m.type === 'out') write(m.text ?? '');
      else if (m.type === 'echo') write(m.text ?? '', 'py-echo');
      else if (m.type === 'err') write(m.text ?? '', 'py-err');
      else if (m.type === 'done') { ready = true; setRunning(false); status.textContent = m.ok ? `Finished in ${m.ms} ms` : 'Stopped with an error'; }
      else if (m.type === 'fail') {
        setRunning(false);
        status.textContent = '';
        write(navigator.onLine ? 'Python could not start. Reload the page and try again.\n' : 'Python needs the internet the first time it loads. Connect once, then it works offline.\n', 'py-err');
        worker?.terminate(); worker = null; ready = false;
      }
    };
  };
  const ensure = () => {
    if (!worker) { worker = newWorker(); wire(worker); ready = false; }
    else wire(worker);
    if (!ready) { status.textContent = 'Loading Python...'; worker.postMessage({ type: 'load' }); }
  };
  const run = () => {
    if (running) return;
    store.set(DRAFT_KEY, code.value);
    store.set(STDIN_KEY, stdin.value);
    ensure();
    out.textContent = '';
    lines = 0;
    setRunning(true);
    if (ready) status.textContent = 'Running...';
    worker!.postMessage({ type: 'run', code: code.value, stdin: stdin.value });
  };
  function stop() {
    if (!running) return;
    worker?.terminate(); worker = null; ready = false;
    setRunning(false);
    write('\nStopped.\n', 'py-err');
    status.textContent = '';
  }

  ensure(); // start loading Python straight away
  runBtn.addEventListener('click', run);
  stopBtn.addEventListener('click', stop);
  el.querySelector('[data-clear]')!.addEventListener('click', () => { out.textContent = ''; lines = 0; });
  el.querySelector('[data-save]')!.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code.value], { type: 'text/x-python' }));
    a.download = 'my_program.py';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
  el.querySelector('[data-example]')!.addEventListener('change', (e) => {
    const s = e.target as HTMLSelectElement;
    const ex = EXAMPLES.find((x) => x.id === s.value);
    if (!ex) return;
    if (code.value.trim() && code.value !== ex.code && !confirm('Replace your code with this example?')) { s.value = ''; return; }
    code.value = ex.code;
    store.set(DRAFT_KEY, code.value);
    s.value = '';
    code.focus();
  });
  code.addEventListener('input', () => store.set(DRAFT_KEY, code.value));
  code.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); return; }
    const { selectionStart: a, selectionEnd: b, value: v } = code;
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      code.setRangeText('    ', a, b, 'end');
    } else if (e.key === 'Enter') {
      // Keep the indentation of the current line, and indent after a colon.
      const lineStart = v.lastIndexOf('\n', a - 1) + 1;
      const indent = /^ */.exec(v.slice(lineStart, a))![0];
      const extra = /:\s*$/.test(v.slice(lineStart, a)) ? '    ' : '';
      e.preventDefault();
      code.setRangeText(`\n${indent}${extra}`, a, b, 'end');
    }
  });
  return () => { if (running) stop(); };
}
