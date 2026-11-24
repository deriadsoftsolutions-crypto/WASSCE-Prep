/**
 * Runs learners' Python in a background thread (Pyodide, Python compiled to WebAssembly).
 * The page can stop a runaway program by ending this worker.
 * Pyodide's files are served from /pyodide/ (copied there at build time from node_modules).
 */
type Msg = { type: 'run'; code: string; stdin: string };

interface Py {
  runPython(code: string, opts?: { globals?: unknown; filename?: string }): unknown;
  setStdout(o: { write: (buf: Uint8Array) => number }): void;
  setStderr(o: { write: (buf: Uint8Array) => number }): void;
  setStdin(o: { stdin: () => string | undefined | null }): void;
  toPy(o: unknown): { destroy(): void };
  version: string;
}

let py: Py | null = null;
let loading: Promise<Py> | null = null;
const post = (m: unknown) => (self as unknown as Worker).postMessage(m);

async function load(): Promise<Py> {
  if (py) return py;
  if (!loading) {
    loading = (async () => {
      const url = '/pyodide/pyodide.mjs';
      const mod = (await import(/* @vite-ignore */ url)) as { loadPyodide: (o: { indexURL: string }) => Promise<Py> };
      py = await mod.loadPyodide({ indexURL: '/pyodide/' });
      return py;
    })();
  }
  return loading;
}

/** Keep only the part of a traceback that points at the learner's own code. */
export function tidyError(msg: string): string {
  const lines = msg.trimEnd().split('\n');
  const first = lines.findIndex((l) => l.includes('File "<exec>"'));
  const kept = first >= 0 ? ['Traceback (most recent call last):', ...lines.slice(first)] : lines.slice(-3);
  return kept.join('\n').replace(/File "<exec>"/g, 'Your code');
}

self.onmessage = async (e: MessageEvent<Msg | { type: 'load' }>) => {
  try {
    const p = await load();
    if (e.data.type === 'load') { post({ type: 'ready', version: p.version }); return; }
    const { code, stdin } = e.data;
    const inputs = stdin.split('\n');
    if (inputs.length && inputs[inputs.length - 1] === '') inputs.pop();
    const dec = new TextDecoder();
    p.setStdout({ write: (buf) => { post({ type: 'out', text: dec.decode(buf, { stream: true }) }); return buf.length; } });
    p.setStderr({ write: (buf) => { post({ type: 'err', text: dec.decode(buf, { stream: true }) }); return buf.length; } });
    p.setStdin({ stdin: () => { const v = inputs.shift(); if (v === undefined) return undefined; post({ type: 'echo', text: `${v}\n` }); return v; } });
    const ns = p.toPy({});
    const t0 = performance.now();
    try {
      p.runPython(code, { globals: ns });
      post({ type: 'done', ok: true, ms: Math.round(performance.now() - t0) });
    } catch (err) {
      const text = String((err as Error).message ?? err);
      post({ type: 'err', text: `${/EOFError/.test(text) ? `${tidyError(text)}\n\nYour program asked for input(). Type the answers in the Input box, one per line, then run again.` : tidyError(text)}\n` });
      post({ type: 'done', ok: false, ms: Math.round(performance.now() - t0) });
    } finally {
      ns.destroy();
    }
  } catch (err) {
    post({ type: 'fail', text: String((err as Error).message ?? err) });
  }
};
