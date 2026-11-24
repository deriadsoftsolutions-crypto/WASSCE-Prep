import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPortfolio, emptyMeta, markTotal, numberItems, SECTIONS, type BuildInput } from '../src/lib/portfolioCore.ts';

const D = (n: number) => 1_700_000_000_000 + n * 86_400_000;
const base = (over: Partial<BuildInput> = {}): BuildInput => ({
  year: 1, yearOf: () => 1, attempts: [], submissions: [], testResults: [], items: [], meta: emptyMeta(), ...over,
});
const sec = (b: ReturnType<typeof buildPortfolio>, id: string) => b.sections.find((s) => s.id === id)!;

test('empty input', () => {
  const b = buildPortfolio(base());
  assert.deepEqual(b.sections.map((s) => s.id), ['assignments', 'projects', 'tests', 'reflections', 'semester', 'other']);
  assert.ok(b.sections.every((s) => s.items.length === 0));
  assert.deepEqual(numberItems(b.sections), []);
  assert.equal(SECTIONS.reduce((n, s) => n + s.max, 0), 40);
});

test('sorts sources into sections', () => {
  const b = buildPortfolio(base({
    submissions: [
      { assignmentId: 'a1', title: 'Gates', submittedAt: D(1), files: [], text: 'x', mark: { mark: 7, maxMarks: 10, comment: 'Good' } },
      { assignmentId: 'a2', title: 'Line robot', portfolioSection: 'projects', submittedAt: D(2), files: [], text: '' },
    ],
    testResults: [{ assessmentId: 't1', title: 'Mid-semester', portfolioSection: 'semester', submittedAt: D(3), result: { total: 15, max: 20, comment: '', releasedAt: D(6) } }],
    attempts: [
      { id: 'm1', kind: 'mock', itemId: 'mock:paper1', score: 31, max: 40, timestamp: D(4) },
      { id: 'p1', kind: 'paper2', itemId: 'paper2:Q4', score: 6, max: 10, timestamp: D(5) },
    ],
  }));
  assert.equal(sec(b, 'assignments').items[0].id, 'asg:a1');
  assert.equal(sec(b, 'assignments').items[0].result, '7 / 10');
  assert.equal(sec(b, 'projects').items[0].id, 'asg:a2');
  assert.equal(sec(b, 'semester').items[0].result, '15 / 20');
  assert.deepEqual(sec(b, 'tests').items.map((i) => i.id), ['mock:m1', 'p2:p1']);
  assert.equal(sec(b, 'tests').items[0].result, '31 / 40');
  assert.ok(b.sections.flatMap((s) => s.items).every((i) => i.auto));
});

test('practice summary', () => {
  const at = (id: string, kind: string, itemId: string, score: number) => ({ id, kind, itemId, score, max: 4, timestamp: D(1) });
  const b = buildPortfolio(base({ attempts: [at('1', 'topic-quiz', 'quiz:1', 2), at('2', 'topic-quiz', 'quiz:1', 4), at('3', 'topic-quiz', 'quiz:2', 1), at('4', 'activity', 'activity:x', 4), at('5', 'lesson', 'lesson:a', 1)] }));
  const t = sec(b, 'tests').items;
  assert.equal(t.length, 1);
  assert.equal(t[0].id, 'practice:y1');
  assert.match(t[0].result!, /4 quizzes and activities/);
});

test('unreleased test shows no score, unmarked assignment', () => {
  const b = buildPortfolio(base({
    submissions: [{ assignmentId: 'a1', title: 'Gates', submittedAt: D(1), files: [], text: '' }],
    testResults: [{ assessmentId: 't9', title: 'Quiz 2', submittedAt: D(2) }],
  }));
  assert.equal(sec(b, 'tests').items.length, 1);
  assert.equal(sec(b, 'tests').items[0].result, 'Submitted, result not released yet');
  assert.equal(sec(b, 'assignments').items[0].result, 'Handed in, not marked yet');
});

test('filters by year', () => {
  const b = buildPortfolio(base({
    year: 2, yearOf: (ts) => (ts < D(10) ? 1 : 2),
    attempts: [{ id: 'old', kind: 'mock', itemId: 'mock:paper1', score: 1, max: 40, timestamp: D(1) }, { id: 'new', kind: 'mock', itemId: 'mock:paper1', score: 2, max: 40, timestamp: D(11) }],
    items: [{ id: 'i1', year: 1, section: 'other', title: 'Old cert', date: D(1), description: '', files: [] }, { id: 'i2', year: 2, section: 'other', title: 'New cert', date: D(11), description: '', files: [] }],
  }));
  assert.deepEqual(sec(b, 'tests').items.map((i) => i.id), ['mock:new']);
  assert.deepEqual(sec(b, 'other').items.map((i) => i.title), ['New cert']);
  assert.equal(sec(b, 'other').items[0].auto, false);
});

test('hidden and notes', () => {
  const meta = { ...emptyMeta(), hidden: ['mock:a'], notes: { 'mock:a': 'x', 'mock:b': 'my best' } };
  const b = buildPortfolio(base({ meta, attempts: [{ id: 'a', kind: 'mock', itemId: 'mock:paper1', score: 1, max: 40, timestamp: D(1) }, { id: 'b', kind: 'mock', itemId: 'mock:paper1', score: 2, max: 40, timestamp: D(2) }] }));
  assert.deepEqual(sec(b, 'tests').items.map((i) => i.id), ['mock:b']);
  assert.equal(sec(b, 'tests').items[0].description, 'my best');
  assert.equal(b.hiddenItems[0].id, 'mock:a');
  assert.equal(b.hiddenItems[0].description, 'x');
  assert.equal(b.hiddenItems[0].hidden, true);
});

test('numbering', () => {
  const it = (id: string, section: 'assignments' | 'reflections', d: number) => ({ id, year: 1, section, title: id, date: D(d), description: '', files: [] });
  const b = buildPortfolio(base({ items: [it('b', 'assignments', 2), it('a', 'assignments', 1), it('r', 'reflections', 3)] }));
  assert.deepEqual(numberItems(b.sections).map((n) => `${n.num} ${n.item.id}`), ['1.1 a', '1.2 b', '4.1 r']);
});

test('markTotal', () => {
  assert.equal(markTotal({ assignments: 12, tests: 9, reflections: -1 }), 19);
  assert.equal(markTotal({ assignments: 10, projects: 10, tests: 10, reflections: 5, semester: 5, other: 9 }), 40);
});
