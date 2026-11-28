/** A unit's running order for the lesson player (pure: unit tested). Each lesson, then the test and practical set with it; then the unit's own assessments. */
import type { Lesson } from '../firebase/lessons';
import type { Assessment } from '../firebase/assessments';
import type { Assignment } from '../firebase/assignments';

export type Step =
  | { key: string; kind: 'lesson'; item: Lesson }
  | { key: string; kind: 'test'; item: Assessment }
  | { key: string; kind: 'assignment'; item: Assignment };
export interface Module { title: string; number: number | null; steps: Step[] }

const byOrder = <T extends { createdAt: number; title: string }>(a: T, b: T) =>
  a.createdAt - b.createdAt || a.title.localeCompare(b.title, undefined, { numeric: true });

/** The running order (pure: exported for the unit tests). */
export function buildModules(unitId: string, lessons: Lesson[], tests: Assessment[], assignments: Assignment[]): Module[] {
  const ls = lessons.filter((l) => l.unitId === unitId).sort(byOrder);
  // The lesson's quick test, then its practical; Teacher Manual key assessments come after both.
  const isKey = (s: Step) => /^key assessment/i.test(s.item.title);
  const after = (lessonId: string): Step[] => {
    const own = [
      ...tests.filter((t) => t.lessonId === lessonId).sort(byOrder).map((t): Step => ({ key: `t:${t.id}`, kind: 'test', item: t })),
      ...assignments.filter((a) => a.lessonId === lessonId).sort(byOrder).map((a): Step => ({ key: `a:${a.id}`, kind: 'assignment', item: a })),
    ];
    return [...own.filter((s) => !isKey(s)), ...own.filter(isKey)];
  };
  const modules: Module[] = ls.map((l, i) => ({ title: l.title, number: i + 1, steps: [{ key: `l:${l.id}`, kind: 'lesson', item: l } as Step, ...after(l.id)] }));
  const ids = new Set(ls.map((l) => l.id));
  const loose = (x: { unitId?: string; lessonId?: string }) => x.unitId === unitId && (!x.lessonId || !ids.has(x.lessonId));
  const end: Step[] = [
    ...tests.filter(loose).sort(byOrder).map((t): Step => ({ key: `t:${t.id}`, kind: 'test', item: t })),
    ...assignments.filter(loose).sort(byOrder).map((a): Step => ({ key: `a:${a.id}`, kind: 'assignment', item: a })),
  ];
  if (end.length) modules.push({ title: 'Unit assessments', number: null, steps: end });
  return modules;
}

