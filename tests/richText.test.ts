import { test } from 'node:test';
import assert from 'node:assert/strict';
import { richText } from '../src/lib/richText.ts';

test('richText: line breaks and escaping', () => {
  assert.equal(richText('a <b>\nc'), 'a &lt;b&gt;<br>c');
});
test('richText: bare web links open in a new tab', () => {
  assert.equal(richText('see https://example.com/x?a=1&b=2 now'), 'see <a href="https://example.com/x?a=1&amp;b=2" target="_blank" rel="noopener">https://example.com/x?a=1&amp;b=2</a> now');
});
test('richText: [label](site pdf) opens in the viewer', () => {
  const h = richText('Read [the scenarios](/teaching/society-1/scenarios.pdf) first.');
  assert.equal(h, 'Read <a href="/view?src=%2Fteaching%2Fsociety-1%2Fscenarios.pdf">the scenarios</a> first.');
});
test('richText: bare site file path becomes a link named after the file', () => {
  assert.match(richText('File: /teaching/society-1/scenarios.pdf.'), /<a href="\/view\?src=%2Fteaching%2Fsociety-1%2Fscenarios\.pdf">scenarios\.pdf<\/a>\.$/);
});
test('richText: [label](web link) and no stray markers', () => {
  const h = richText('[Video](https://youtu.be/abc) and (https://x.org)');
  assert.ok(h.startsWith('<a href="https://youtu.be/abc" target="_blank" rel="noopener">Video</a>'));
  assert.ok(h.endsWith('and (<a href="https://x.org" target="_blank" rel="noopener">https://x.org</a>)'), h);
  assert.ok(!h.includes('\u0000'));
});
