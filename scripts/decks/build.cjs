/**
 * Build one ready-made lesson deck:  node scripts/decks/build.cjs <key> [--no-images]
 *   1. runs scripts/decks/lessons/<key>.cjs and writes public/teaching/<key>/<file>.pptx
 *   2. writes the theme colours into the deck
 *   3. renders slide pictures to public/teaching/<key>/slides/ for the offline viewer
 *      (needs LibreOffice and pdftoppm; set SOFFICE to a different command if plain `soffice` does not work)
 *   4. records the deck in src/data/slideDecks.json
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const JSZip = require('jszip');
const { createDeck, THEME } = require('./lib.cjs');

const ROOT = path.join(__dirname, '..', '..');
const key = process.argv[2];
if (!key || !/^[a-z0-9-]+$/.test(key)) { console.error('Usage: node scripts/decks/build.cjs <lesson-key> [--no-images]'); process.exit(1); }
const spec = require(path.join(__dirname, 'lessons', `${key}.cjs`));
const outDir = path.join(ROOT, 'public', 'teaching', key);
const out = path.join(outDir, spec.file);

async function applyTheme(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const c = THEME.colors;
  const scheme = `<a:clrScheme name="Circuit Ink">${['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map((k) => `<a:${k}><a:srgbClr val="${c[k]}"/></a:${k}>`).join('')}</a:clrScheme>`;
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/theme\/theme\d+\.xml$/.test(n))) {
    let xml = await zip.file(name).async('string');
    xml = xml.replace(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/, scheme)
      .replace(/(<a:majorFont>\s*<a:latin typeface=")[^"]*"/, `$1${THEME.headFontFace}"`)
      .replace(/(<a:minorFont>\s*<a:latin typeface=")[^"]*"/, `$1${THEME.bodyFontFace}"`);
    zip.file(name, xml);
  }
  // Folder entries upset some cloud viewers: copy the files alone into a fresh archive
  // (JSZip's remove() on a folder would delete everything inside it).
  const clean = new JSZip();
  for (const [name, entry] of Object.entries(zip.files)) if (!entry.dir) clean.file(name, await entry.async('uint8array'), { createFolders: false });
  fs.writeFileSync(file, await clean.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function renderSlides(file) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-'));
  const cmd = (process.env.SOFFICE || 'soffice').split(' ');
  execFileSync(cmd[0], [...cmd.slice(1), '--headless', `-env:UserInstallation=file://${tmp}/profile`, '--convert-to', 'pdf', '--outdir', tmp, file], { stdio: 'ignore', env: { ...process.env, SAL_USE_VCLPLUGIN: 'svp' } });
  const pdf = path.join(tmp, path.basename(file).replace(/\.pptx$/, '.pdf'));
  const slides = path.join(outDir, 'slides');
  fs.rmSync(slides, { recursive: true, force: true });
  fs.mkdirSync(slides, { recursive: true });
  execFileSync('pdftoppm', ['-jpeg', '-jpegopt', 'quality=80', '-scale-to-x', '1600', '-scale-to-y', '-1', pdf, path.join(slides, 'slide')]);
  fs.rmSync(tmp, { recursive: true, force: true });
  return fs.readdirSync(slides).filter((f) => f.endsWith('.jpg')).length;
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const d = createDeck({ title: spec.title, footer: spec.footer });
  spec.build(d, { assets: outDir, images: path.join(__dirname, 'images') });
  await d.pres.writeFile({ fileName: out });
  await applyTheme(out);
  console.log('wrote', path.relative(ROOT, out));
  if (process.argv.includes('--no-images')) return;
  const count = renderSlides(out);
  const regFile = path.join(ROOT, 'src', 'data', 'slideDecks.json');
  const reg = JSON.parse(fs.readFileSync(regFile, 'utf8'));
  reg[`/teaching/${key}/${spec.file}`] = { dir: `/teaching/${key}/slides`, count, title: spec.title };
  fs.writeFileSync(regFile, JSON.stringify(reg, null, 2) + '\n');
  console.log(`rendered ${count} slide pictures; updated src/data/slideDecks.json`);
})().catch((e) => { console.error(e); process.exit(1); });
