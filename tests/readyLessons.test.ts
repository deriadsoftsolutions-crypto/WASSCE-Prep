import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { READY_LESSONS } from '../src/data/readyLessons.ts';
import { markdown } from '../src/lib/markdown.ts';

test('every file a ready-made lesson links to is in public/', () => {
  for (const r of READY_LESSONS) {
    const urls = [
      ...r.blocks.flatMap((b) => (b.type === 'link' || b.type === 'image' ? [b.url] : [])),
      ...r.materials.map((m) => m.url),
    ].filter((u) => u.startsWith('/teaching/'));
    assert.ok(urls.length > 0);
    for (const u of urls) assert.ok(existsSync(`public${u}`), `missing public${u}`);
  }
});

test('ready-made lesson text renders cleanly', () => {
  for (const r of READY_LESSONS) {
    for (const b of r.blocks) {
      const text = b.type === 'text' ? b.md : b.type === 'check' ? [b.question, ...b.options, b.explanation ?? ''].join(' ') : '';
      assert.ok(!text.includes('—'), `em dash in ${r.key}`);
      if (b.type !== 'text') continue;
      const h = markdown(b.md);
      assert.ok(!h.includes('\\'), `stray backslash in ${r.key}: ${b.md.slice(0, 40)}`);
      assert.ok(!h.includes('```'), `unclosed code block in ${r.key}`);
    }
    for (const b of r.blocks) if (b.type === 'check') assert.ok(b.correct >= 0 && b.correct < b.options.length);
  }
});
