import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from '../src/lib/catalogBuild.ts';

const lesson = (id: string, published: boolean) => ({ id, title: id, topicId: 6, year: 3, unitId: 'u3-3-2', classKey: '', className: '', classIds: [], summary: 's', blocks: [{ type: 'text' as const, md: 'x' }, { type: 'text' as const, md: 'y' }], published, createdAt: 1, updatedAt: 2 });

test('catalog keeps only published items, without lesson bodies', () => {
  const cat = buildCatalog({
    lessons: [lesson('a', true), lesson('b', false)],
    tests: [{ id: 't1', published: true } as never, { id: 't2', published: false } as never],
    assignments: [{ id: 'x', published: false } as never],
    units: [{ id: 'u1', published: true } as never, { id: 'u2', published: false } as never],
    materials: [{ id: 'm1', published: true, audience: 'learners' } as never, { id: 'm2', published: true, audience: 'teachers' } as never],
    classes: [{ id: '3scia', name: '3 Sci A', year: 3, aliases: ['old'] }],
  }, 123);
  assert.equal(cat.builtAt, 123);
  assert.deepEqual(cat.lessons.map((l) => [l.id, l.blocks.length, l.blockCount]), [['a', 0, 2]]);
  assert.deepEqual(cat.tests.map((t) => t.id), ['t1']);
  assert.equal(cat.assignments.length, 0);
  assert.deepEqual(cat.units.map((u) => u.id), ['u1']);
  assert.deepEqual(cat.materials.map((m) => m.id), ['m1'], 'teacher-only materials never reach learners');
  assert.deepEqual(cat.classes, [{ id: '3scia', name: '3 Sci A', year: 3, retired: false }], 'no login aliases in the catalog');
});

test('catalog stays well under the 1 MB document limit for a full year of content', () => {
  const many = Array.from({ length: 120 }, (_, i) => lesson(`l${i}`, true));
  const tests = Array.from({ length: 120 }, (_, i) => ({ id: `t${i}`, title: 'Python 3 check: making decisions', instructions: 'x'.repeat(400), classIds: ['year:3'], published: true }) as never);
  const asg = Array.from({ length: 120 }, (_, i) => ({ id: `a${i}`, title: 'Practical', instructions: 'y'.repeat(2500), classIds: ['3scia'], published: true }) as never);
  const units = Array.from({ length: 21 }, (_, i) => ({ id: `u${i}`, published: true, outcomes: ['o'.repeat(300)], indicators: ['i'.repeat(300), 'j'.repeat(300)], summary: 's'.repeat(300) }) as never);
  const size = JSON.stringify(buildCatalog({ lessons: many, tests, assignments: asg, units, materials: [] })).length;
  assert.ok(size < 600_000, `catalog is ${size} bytes`);
});

import { withEntry } from '../src/lib/catalogBuild.ts';
test('a teacher save updates one item; unpublishing or deleting removes it', () => {
  const base = buildCatalog({ lessons: [lesson('a', true)], tests: [], assignments: [], units: [], materials: [] }, 1);
  const added = withEntry(base, 'tests', 't1', { title: 'Check', published: true }, 2);
  assert.deepEqual(added.tests.map((t) => t.id), ['t1']);
  assert.equal(added.builtAt, 2);
  const edited = withEntry(added, 'tests', 't1', { title: 'Check v2', published: true }, 3);
  assert.deepEqual(edited.tests.map((t) => t.title), ['Check v2'], 'replaced, not duplicated');
  assert.equal(withEntry(edited, 'tests', 't1', { title: 'Check v2', published: false }).tests.length, 0, 'unpublished: gone');
  assert.equal(withEntry(edited, 'tests', 't1', null).tests.length, 0, 'deleted: gone');
  const les = withEntry(base, 'lessons', 'a', { ...lesson('a', true), title: 'New title' });
  assert.deepEqual(les.lessons.map((l) => [l.title, l.blocks.length, l.blockCount]), [['New title', 0, 2]], 'lesson bodies never in the catalog');
});
