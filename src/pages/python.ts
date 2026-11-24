/**
 * Python practice (/python): write and run Python on any device, with no install.
 * Python runs in a background worker (Pyodide). The first visit downloads about 13 MB;
 * after that it works offline. Examples are the Python 1 lesson files learners use in VS Code.
 */
import { esc } from '../lib/dom';
import { icon } from '../lib/icons';
import { learner } from '../lib/session';
import { usingFirebase } from '../storage';
import { modal, toast } from '../lib/ui';
import type { Assignment } from '../firebase/assignments';
import hello from '../../teaching/python-1/vscode-files/00_hello_robot.py?raw';
import variables from '../../teaching/python-1/vscode-files/01_variables.py?raw';
import robotId from '../../teaching/python-1/vscode-files/02_robot_id_support.py?raw';
import naming from '../../teaching/python-1/vscode-files/03_naming_game.py?raw';
import types from '../../teaching/python-1/vscode-files/04_types.py?raw';
import mission from '../../teaching/python-1/vscode-files/05_mission.py?raw';
import operators from '../../teaching/python-1/vscode-files/06_operators.py?raw';
import lists from '../../teaching/python-2/vscode-files/07_lists.py?raw';
import activityLog from '../../teaching/python-2/vscode-files/08_activity_log.py?raw';
import statusReport from '../../teaching/python-2/vscode-files/09_status_report.py?raw';

const EXAMPLES: { id: string; label: string; code: string; group: string }[] = [
  { id: 'blank', label: 'Blank file', code: '', group: '' },
  { id: 'hello', label: 'Hello, robot', code: hello, group: 'Python 1: variables, data types, operations' },
  { id: 'variables', label: 'Variables', code: variables, group: 'Python 1: variables, data types, operations' },
  { id: 'robot-id', label: 'Robot ID card (Activity 5.2)', code: robotId, group: 'Python 1: variables, data types, operations' },
  { id: 'naming', label: 'Naming game', code: naming, group: 'Python 1: variables, data types, operations' },
  { id: 'types', label: 'Data types', code: types, group: 'Python 1: variables, data types, operations' },
  { id: 'mission', label: 'Mission (Activities 5.3 and 5.4)', code: mission, group: 'Python 1: variables, data types, operations' },
  { id: 'operators', label: 'Operators', code: operators, group: 'Python 1: variables, data types, operations' },
  { id: 'lists', label: 'Lists', code: lists, group: 'Python 2: lists and the status report' },
  { id: 'activity-log', label: 'Activity log (Activity 5.5)', code: activityLog, group: 'Python 2: lists and the status report' },
  { id: 'status-report', label: 'Status report (Activity 5.6)', code: statusReport, group: 'Python 2: lists and the status report' },
];
/** Dropdown options, grouped by lesson. */
const exampleOptions = () => [...new Set(EXAMPLES.map((x) => x.group))].map((g) => {
  const opts = EXAMPLES.filter((x) => x.group === g).map((x) => `<option value="${x.id}">${esc(x.label)}</option>`).join('');
  return g ? `<optgroup label="${esc(g)}">${opts}</optgroup>` : opts;
}).join('');
const DRAFT_KEY = 'wassce.py.draft';
const STDIN_KEY = 'wassce.py.stdin';
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

let worker: Worker | null = null;
let ready = false;
const newWorker = () => new Worker(new URL('../python/worker.ts', import.meta.url), { type: 'module' });

/** Teacher "Run it": code handed over from the marking screen (in another tab, so through localStorage). */
export const LOAD_KEY = 'wassce.py.load';

export function pythonPage(el: HTMLElement) {
  const params = new URLSearchParams(location.search);
  const want = params.get('example');
  const forId = params.get('for');
  let loaded: { code: string; title: string } | null = null;
  if (params.get('load')) { try { loaded = JSON.parse(store.get(LOAD_KEY) ?? 'null'); localStorage.removeItem(LOAD_KEY); } catch { loaded = null; } }
  /** Code for an assignment has its own draft, so practice code and assignment code never mix. */
  const draftKey = loaded ? '' : forId ? `${DRAFT_KEY}.for.${forId}` : DRAFT_KEY;
  const saveDraft = (v: string) => { if (draftKey) store.set(draftKey, v); };
  const start = loaded?.code ?? EXAMPLES.find((x) => x.id === want)?.code ?? (draftKey ? store.get(draftKey) : null) ?? (forId ? '' : hello);
  const me = learner();
  const canHandIn = usingFirebase && !!me && !loaded;
  el.innerHTML = `
    <div class="page-head"><h1>Python practice</h1><span class="muted small">Write Python and press Run. It runs on this device.</span></div>
    ${loaded ? `<div class="card py-banner"><b>${esc(loaded.title)}</b><br><span class="muted small">A copy to run and test. Changes here are not saved and do not change the learner's work.</span></div>` : ''}
    <div class="card py-banner" data-forbanner hidden></div>
    <div class="py-bar">
      <label class="field py-example"><span>Start from</span><select data-example aria-label="Start from an example">
        <option value="">Choose an example...</option>${exampleOptions()}</select></label>
      <div class="row">
        <button class="btn btn-primary" data-run type="button">${icon('play', 18)} Run</button>
        <button class="btn" data-stop type="button" disabled>Stop</button>
        <button class="btn" data-clear type="button">Clear output</button>
        <button class="btn" data-save type="button">Save as .py</button>
        ${canHandIn ? '<button class="btn btn-accent" data-handin type="button">Hand in</button>' : ''}
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
  let lastRun: { ok: boolean; text: string } | null = null;

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
      else if (m.type === 'done') { ready = true; setRunning(false); status.textContent = m.ok ? `Finished in ${m.ms} ms` : 'Stopped with an error'; lastRun = { ok: !!m.ok, text: out.textContent ?? '' }; }
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
    saveDraft(code.value);
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
    saveDraft(code.value);
    s.value = '';
    code.focus();
  });
  code.addEventListener('input', () => { saveDraft(code.value); lastRun = null; });
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
  if (canHandIn) void setUpHandIn();
  return () => { if (running) stop(); };

  /* ---------------- Hand in to an assignment ---------------- */
  async function setUpHandIn() {
    const { assignmentsFor, getAssignment, myFeedback, mySubmission, fetchFileText, isPythonFile } = await import('../firebase/assignments');
    const banner = el.querySelector('[data-forbanner]') as HTMLElement;
    if (forId) {
      const a = await getAssignment(forId).catch(() => null);
      if (a) {
        banner.hidden = false;
        banner.innerHTML = `<b>Writing for: ${esc(a.title)}</b><br><span class="muted small">Your code is saved on this device as you type. When it works, press Run, then Hand in.</span> <a href="/assignments/${a.id}">Open the assignment</a>`;
        // Nothing written here yet: start from the code already handed in, if any.
        if (!code.value.trim()) {
          const sub = await mySubmission(a.id).catch(() => null);
          const py = sub?.files.find(isPythonFile);
          code.value = py ? await fetchFileText(py).catch(() => '') : `# ${a.title}\n# Write your program here. Run it, then press Hand in.\n\n`;
          saveDraft(code.value);
        }
      }
    }
    el.querySelector('[data-handin]')!.addEventListener('click', async () => {
      if (!navigator.onLine) { toast('You are offline. Connect to the internet to hand in.'); return; }
      if (!code.value.trim()) { toast('Write some code first.'); return; }
      const m = modal('<p class="muted">Loading your assignments...</p>');
      let open: Assignment[] = [];
      try {
        const list = (await assignmentsFor(me!.className)).filter((a) => a.allowFiles);
        const marked = await Promise.all(list.map((a) => myFeedback(a.id).catch(() => null)));
        open = list.filter((_, i) => !marked[i]);
      } catch { /* shown below */ }
      if (!open.length) {
        m.root.innerHTML = `<h2>Hand in</h2><p>You have no open assignments that take files. Ask your teacher, or use Save as .py.</p><div class="row"><button class="btn" data-close type="button">Close</button></div>`;
        m.root.querySelector('[data-close]')!.addEventListener('click', m.close);
        return;
      }
      const fileFor = (a: Assignment) => (/\b([a-z_][a-z0-9_]*\.py)\b/i.exec(a.instructions)?.[1] ?? 'my_program.py');
      const pick = open.find((a) => a.id === forId) ?? open[0];
      m.root.innerHTML = `<form class="stack" data-hform novalidate>
        <h2 style="margin:0">Hand in your code</h2>
        <label class="field"><span>Assignment</span><select name="a">${open.map((a) => `<option value="${a.id}" ${a.id === pick.id ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</select></label>
        <label class="field"><span>File name</span><input name="f" value="${esc(fileFor(pick))}" autocapitalize="off" spellcheck="false" /></label>
        <label class="switch"><input type="checkbox" name="o" ${lastRun ? 'checked' : 'disabled'} /> Include what my program printed</label>
        <p class="muted small" style="margin:0">${!lastRun ? 'Run your code first to include its output.' : lastRun.ok ? 'Your last run finished without errors.' : 'Your last run stopped with an error. You can still hand it in.'}
          Anything else you handed in for this assignment stays.</p>
        <p class="mark-bad small" data-herr style="margin:0"></p>
        <div class="row"><button class="btn btn-primary" type="submit">Hand in now</button><button class="btn" type="button" data-close>Cancel</button></div>
      </form>`;
      const form = m.root.querySelector('[data-hform]') as HTMLFormElement;
      m.root.querySelector('[data-close]')!.addEventListener('click', m.close);
      form.querySelector('select')!.addEventListener('change', (e) => {
        const a = open.find((x) => x.id === (e.target as HTMLSelectElement).value)!;
        (form.querySelector('input[name=f]') as HTMLInputElement).value = fileFor(a);
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const a = open.find((x) => x.id === fd.get('a'))!;
        let name = String(fd.get('f') ?? '').trim().replace(/[^A-Za-z0-9_.-]+/g, '_');
        if (!name) name = 'my_program.py';
        if (!/\.py$/i.test(name)) name += '.py';
        const btn = form.querySelector('button[type=submit]') as HTMLButtonElement;
        btn.disabled = true; btn.textContent = 'Handing in...';
        try {
          const { handInCode } = await import('../firebase/assignments');
          await handInCode(a, me!, name, code.value, fd.get('o') === 'on' && lastRun ? lastRun.text : null);
          try { localStorage.removeItem(`wassce.assignmentDraft.${me!.id}.${a.id}`); } catch { /* ignore */ }
          void import('../lib/due').then((d) => d.refreshDue()).catch(() => undefined);
          m.root.innerHTML = `<h2>Handed in</h2><p>${esc(name)} is in your work for <b>${esc(a.title)}</b>. You can change it and hand it in again until your teacher marks it.</p>
            <div class="row"><a class="btn btn-primary" href="/assignments/${a.id}" data-close>View the assignment</a><button class="btn" type="button" data-close>Keep coding</button></div>`;
          m.root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', m.close));
        } catch (ex) {
          btn.disabled = false; btn.textContent = 'Hand in now';
          (form.querySelector('[data-herr]') as HTMLElement).textContent = (ex as Error).message || 'Could not hand in. Check your internet connection.';
        }
      });
    });
  }
}
