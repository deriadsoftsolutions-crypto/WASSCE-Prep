import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { viewKind, viewerHref } from '../src/lib/viewable.ts';
import { SLIDE_DECKS, slideFile } from '../src/data/slideDecks.ts';

test('kinds', () => {
  assert.equal(viewKind('/api/lesson-file/lessons/0f7c1c2e-1111-2222-3333-444455556666-book.pdf'), 'pdf');
  assert.equal(viewKind('/api/lesson-file/lessons/x-notes.docx'), 'office');
  assert.equal(viewKind('/teaching/python-1/Python-1-Variables-Data-Types-Operations.pptx'), 'slides');
  assert.equal(viewKind('/teaching/python-1/python-1-starter-files.zip'), null);
  assert.equal(viewKind('https://evil.example/x.pdf'), null);
  assert.equal(viewKind('/api/lesson-file/../secret.pdf'), null);
});

test('links', () => {
  assert.equal(viewerHref('/api/lesson-file/lessons/a-b.pdf#page=7', { name: 'Book.pdf', page: 7 }), '/view?src=%2Fapi%2Flesson-file%2Flessons%2Fa-b.pdf&name=Book.pdf&page=7');
  assert.equal(viewerHref('/api/lesson-file/lessons/a-tv.pptx', { teacherOnly: true }), null);
  assert.ok(viewerHref('/api/lesson-file/lessons/a-tv.pdf', { teacherOnly: true }));
});

test('every slide picture exists', () => {
  for (const [deck, d] of Object.entries(SLIDE_DECKS)) {
    assert.ok(existsSync(`public${deck}`), deck);
    for (let n = 1; n <= d.count; n++) assert.ok(existsSync(`public${slideFile(d.dir, d.count, n)}`), `slide ${n}`);
    assert.ok(!existsSync(`public${slideFile(d.dir, d.count, d.count + 1)}`), 'count is exact');
  }
});
