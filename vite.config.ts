import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * After the build, list every file in dist/ and write dist/sw.js so the
 * service worker precaches the whole site for offline use.
 */
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
          else if (!skip.has(relative(outDir, p)) && !f.endsWith('.map')) files.push(p);
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
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 4096 },
  plugins: [precacheServiceWorker()],
});
