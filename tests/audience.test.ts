import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audienceLabel, audienceOf, audienceYears, classIdFor, inAudience, learnerClassId, normaliseAudience, sortClasses, type ClassInfo } from '../src/lib/audience.ts';

const classes: ClassInfo[] = [
  { id: '2scib', name: '2 Sci B', year: 2 }, { id: '2scia', name: '2 Sci A', year: 2 }, { id: '3scia', name: '3 Sci A', year: 3 },
];

test('class id matches the login code made from a typed class', () => {
  assert.equal(classIdFor('2 Sci A'), '2scia');
  assert.equal(classIdFor(' 2 sci-a '), '2scia');
  assert.equal(classIdFor('STEM 2 General Science A'), 'stem2generalscie'); // 16 characters, like the login
});

test('audienceOf reads new lists and old single classKey', () => {
  assert.deepEqual(audienceOf({ classIds: ['2scia'] }), ['2scia']);
  assert.deepEqual(audienceOf({ classKey: '' }), []);
  assert.deepEqual(audienceOf({ classKey: '3scia' }), ['3scia']);
  assert.deepEqual(audienceOf({}), []);
});

test('inAudience: all, a class, a whole year', () => {
  const esi = { classId: '3scia', year: 3 };
  assert.ok(inAudience([], esi));
  assert.ok(inAudience(['3scia'], esi));
  assert.ok(inAudience(['year:3'], esi));
  assert.ok(!inAudience(['2scia', 'year:2'], esi));
  assert.ok(!inAudience(['year:3'], { classId: '3scia' }), 'no year known');
});

test('learnerClassId prefers the fixed class', () => {
  assert.equal(learnerClassId({ classId: '2scib', className: '2 Science B' }), '2scib');
  assert.equal(learnerClassId({ className: '2 Sci B' }), '2scib');
});

test('labels and years', () => {
  assert.equal(audienceLabel([], classes), 'All classes');
  assert.equal(audienceLabel(['year:2', '3scia'], classes), 'All STEM 2, 3 Sci A');
  assert.equal(audienceLabel(['9art'], classes), '9ART');
  assert.deepEqual(audienceYears(['2scia', 'year:3'], classes), [2, 3]);
});

test('normaliseAudience drops classes covered by their year and sorts', () => {
  assert.deepEqual(normaliseAudience(['3scia', '2scib', 'year:2', '2scia'], sortClasses(classes)), ['year:2', '3scia']);
  assert.deepEqual(normaliseAudience(['2scib', '2scia'], sortClasses(classes)), ['2scia', '2scib']);
});

test('sortClasses by year then name', () => {
  assert.deepEqual(sortClasses(classes).map((c) => c.id), ['2scia', '2scib', '3scia']);
});
