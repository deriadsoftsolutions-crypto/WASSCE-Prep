import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { READY_LESSONS } from '../src/data/ready/index.ts';
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

import { READY_ASSIGNMENTS, READY_TESTS } from '../src/data/ready/index.ts';

test('ready-made tests: marks add up and every auto-marked answer scores full marks', () => {
  const totals: Record<string, number> = { 'python-1-check': 30, 'python-2-check': 18, 'python-3-check': 20, 'python-key-written': 20 };
  for (const t of READY_TESTS) {
    assert.equal(t.questions.reduce((n, q) => n + q.marks, 0), totals[t.key], t.key);
    for (const q of t.questions) {
      const k = t.answers[q.id];
      assert.ok(k, `${t.key} ${q.id} has no answer`);
      if (q.type === 'mcq') assert.ok(Number.isInteger(k.correct) && k.correct! >= 0 && k.correct! < q.options!.length, `${t.key} ${q.id}`);
      if (q.type === 'number') assert.ok(Number.isFinite(k.value), `${t.key} ${q.id}`);
      if (q.type === 'short') assert.ok((k.model ?? '').length > 40);
      assert.ok(!(q.text + (k.model ?? '') + (k.explanation ?? '')).includes('—'));
    }
  }
});

test('ready-made assignments carry a marking scheme that adds up', () => {
  for (const a of READY_ASSIGNMENTS) {
    assert.ok(!a.instructions.includes('—'));
    const marks = [...a.instructions.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1]));
    assert.equal(marks.reduce((n, m) => n + m, 0), a.maxMarks, a.key);
  }
});
