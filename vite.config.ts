import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * After the build, list every file in dist/ and write dist/sw.js so the
 * service worker precaches the whole site for offline use.
 */
/** Pyodide (Python in the browser) for the practice page, served from /pyodide/. Not precached: about 13 MB. */
const PYODIDE_DIR = 'node_modules/pyodide';
const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
function pyodideFiles(): Plugin {
  let outDir = 'dist';
  return {
    name: 'pyodide-files',
    configResolved(c) { outDir = c.build.outDir; },
    configureServer(server) {
      server.middlewares.use('/pyodide/', (req, res, next) => {
        const f = (req.url ?? '').split('?')[0].replace(/^\//, '');
        if (!PYODIDE_FILES.includes(f)) return next();
        const types: Record<string, string> = { mjs: 'text/javascript', wasm: 'application/wasm', zip: 'application/zip', json: 'application/json' };
        res.setHeader('Content-Type', types[f.split('.').pop()!] ?? 'application/octet-stream');
        res.end(readFileSync(join(PYODIDE_DIR, f)));
      });
    },
    writeBundle() {
      mkdirSync(join(outDir, 'pyodide'), { recursive: true });
      for (const f of PYODIDE_FILES) copyFileSync(join(PYODIDE_DIR, f), join(outDir, 'pyodide', f));
    },
  };
}

function precacheServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'precache-service-worker',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const skip = new Set(['sw.js', '_headers', '_redirects', 'index.html']);
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          // .woff copies are fallbacks for very old browsers; every supported tablet uses .woff2.
          else if (!skip.has(relative(outDir, p)) && !relative(outDir, p).startsWith('pyodide') && !relative(outDir, p).startsWith('teaching') && !f.endsWith('.map') && !f.endsWith('.woff')) files.push(p);
        }
      };
      walk(outDir);
      const hash = createHash('sha256');
      for (const f of files.sort()) hash.update(f).update(readFileSync(f));
      hash.update(readFileSync(join(outDir, 'index.html')));
      const urls = ['/', ...files.map((f) => '/' + relative(outDir, f).split('\\').join('/'))];
      const sw = readFileSync('scripts/sw-template.js', 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__PRECACHE__', JSON.stringify(urls, null, 2));
      writeFileSync(join(outDir, 'sw.js'), sw);
      console.log(`\n[sw] precaching ${urls.length} files`);
    },
  };
}

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Firebase in its own file: its name only changes when Firebase is upgraded,
        // so tablets keep their cached copy across our updates.
        manualChunks(id) {
          if (/node_modules\/(firebase|@firebase)\//.test(id)) return 'firebase';
        },
      },
    },
  },
  worker: { format: 'es' },
  plugins: [pyodideFiles(), precacheServiceWorker()],
});
