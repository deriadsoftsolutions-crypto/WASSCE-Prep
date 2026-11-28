import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModules } from '../src/lib/runningOrder.ts';

const L = (id: string, title: string, createdAt: number, unitId = 'u3-3-2') => ({ id, title, createdAt, unitId }) as never;
const T = (id: string, title: string, createdAt: number, lessonId = '', unitId = 'u3-3-2') => ({ id, title, createdAt, lessonId, unitId }) as never;

test('each lesson is followed by its test and practical; loose items go at the end', () => {
  const lessons = [L('l2', 'Python for robots 2', 20), L('l1', 'Python for robots 1', 10), L('x', 'Other unit', 5, 'u3-1-1')];
  const tests = [T('t2', 'Python 2 check', 21, 'l2'), T('t1', 'Python 1 check', 11, 'l1'), T('tk', 'Key assessment', 30, ''), T('tz', 'Other unit test', 1, '', 'u3-1-1')];
  const asg = [T('a1', 'Python 1 practical', 12, 'l1'), T('ag', 'Gone lesson practical', 13, 'deleted-lesson')];
  const m = buildModules('u3-3-2', lessons, tests, asg);
  assert.deepEqual(m.map((x) => [x.number, x.title]), [[1, 'Python for robots 1'], [2, 'Python for robots 2'], [null, 'Unit assessments']]);
  assert.deepEqual(m[0].steps.map((s) => s.key), ['l:l1', 't:t1', 'a:a1']);
  assert.deepEqual(m[1].steps.map((s) => s.key), ['l:l2', 't:t2']);
  assert.deepEqual(m[2].steps.map((s) => s.key), ['t:tk', 'a:ag'], 'unlinked and orphaned items at the end');
});

test('no end section when everything is linked; empty unit gives nothing', () => {
  assert.equal(buildModules('u3-3-2', [L('l1', 'A', 1)], [], []).length, 1);
  assert.equal(buildModules('u9', [L('l1', 'A', 1)], [], []).length, 0);
});

test('Teacher Manual key assessments come after the lesson\'s own test and practical', () => {
  const m = buildModules('u3-3-2', [L('l2', 'Python 2', 1)], [T('tk', 'Key assessment (Teacher Manual): written', 2, 'l2'), T('t2', 'Python 2 check', 3, 'l2')], [T('ak', 'Key assessment (Teacher Manual): practical', 4, 'l2'), T('a2', 'Python 2 practical', 5, 'l2')]);
  assert.deepEqual(m[0].steps.map((s) => s.key), ['l:l2', 't:t2', 'a:a2', 't:tk', 'a:ak']);
});
