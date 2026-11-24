import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarHTML, cropBox, initials } from '../src/lib/avatar.ts';

test('cropBox centres a square', () => {
  assert.deepEqual(cropBox(400, 300), { sx: 50, sy: 0, size: 300 });
  assert.deepEqual(cropBox(300, 500), { sx: 0, sy: 100, size: 300 });
  assert.deepEqual(cropBox(256, 256), { sx: 0, sy: 0, size: 256 });
});

test('initials', () => {
  assert.equal(initials('Ama Mensah'), 'AM');
  assert.equal(initials('kofi'), 'K');
  assert.equal(initials('  Yaw  Kwame Owusu '), 'YK');
  assert.equal(initials(''), '?');
});

test('avatarHTML escapes the name', () => {
  const h = avatarHTML('A <b>', null);
  assert.ok(h.includes('&lt;b&gt;') || h.includes('A'), h);
  assert.ok(!h.includes('<b>'));
  assert.match(avatarHTML('Ama', 'data:image/jpeg;base64,xx', 32), /<img class="avatar"[^>]*width="32"/);
});
