/**
 * Ready-made lessons, tests and assignments a teacher adds with one tap (Teacher > Lessons, Tests, Assignments).
 * Each is saved as an ordinary draft. One file per lesson (or per key assessment); add new files to the lists below,
 * in teaching order. Decks and files they link to live in public/teaching/<key>/ (see scripts/decks/README.md).
 */
import curriculum from '../curriculum.json';
import * as python1 from './python-1';
import * as python2 from './python-2';
import * as fa1Key from './fa1-key';
export type { ReadyAssignment, ReadyLesson, ReadyTest } from './types';
import type { ReadyAssignment, ReadyLesson, ReadyTest } from './types';

export const READY_LESSONS: ReadyLesson[] = [python1.lesson, python2.lesson];
export const READY_TESTS: ReadyTest[] = [python1.test, python2.test, fa1Key.keyWritten];
export const READY_ASSIGNMENTS: ReadyAssignment[] = [python1.practical, python2.practical, fa1Key.keyPractical];

/** "STEM 3, 3.3.2 Robot programming" style heading for a unit, from the curriculum. */
export function unitLabel(unitId: string): string {
  const u = (curriculum.units as { code: string; year: number; subStrand: string }[]).find((x) => `u${x.code.replace(/\./g, '-')}` === unitId);
  return u ? `STEM ${u.year}, ${u.code} ${u.subStrand}` : unitId;
}
