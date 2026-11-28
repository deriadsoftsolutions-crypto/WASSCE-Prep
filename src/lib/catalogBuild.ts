/** Building the learners' catalog (pure: no Firebase here, so it can be unit tested). See firebase/catalog.ts. */
import type { Lesson } from '../firebase/lessons';
import type { Assessment } from '../firebase/assessments';
import type { Assignment } from '../firebase/assignments';
import type { Material, Unit } from '../firebase/units';
import type { ClassInfo } from './audience';

export const CATALOG_VERSION = 1;
export type LessonSummary = Omit<Lesson, 'blocks'> & { blocks: []; blockCount: number };
export interface Catalog {
  v: number;
  builtAt: number;
  lessons: LessonSummary[];
  tests: Assessment[];
  assignments: Assignment[];
  units: Unit[];
  materials: Material[];
  /** The school's classes (names for "Set for 2 Sci A" labels); sign-in reads the classes collection itself. */
  classes: ClassInfo[];
}

export type CatalogKind = 'lessons' | 'tests' | 'assignments' | 'units' | 'materials';
const strip = <T>(x: T) => JSON.parse(JSON.stringify(x)) as T; // no undefined values (Firestore refuses them)

/** What the catalog keeps for one item, or null if learners must not see it (draft, teacher-only). */
export function catalogEntry(kind: CatalogKind, item: Record<string, unknown>): Record<string, unknown> | null {
  if (!item.published) return null;
  if (kind === 'materials' && item.audience !== 'learners') return null;
  if (kind === 'lessons') {
    const { blocks, ...rest } = item as unknown as Lesson;
    return strip({ ...rest, blocks: [], blockCount: (blocks ?? []).length });
  }
  return strip(item);
}

/** Replace (or remove, with item = null) one item in a catalog: what a teacher's save does. Pure. */
export function withEntry(cat: Catalog, kind: CatalogKind, id: string, item: Record<string, unknown> | null, now = Date.now()): Catalog {
  const list = (cat[kind] as unknown as Record<string, unknown>[]).filter((x) => x.id !== id);
  const e = item ? catalogEntry(kind, { ...item, id }) : null;
  return { ...cat, builtAt: now, [kind]: e ? [...list, e] : list } as Catalog;
}

/** Build the catalog from full lists (pure; used by the teacher's device and the unit tests). */
export function buildCatalog(all: { lessons: Lesson[]; tests: Assessment[]; assignments: Assignment[]; units: Unit[]; materials: Material[]; classes?: ClassInfo[] }, now = Date.now()): Catalog {
  const keep = <T>(kind: CatalogKind, list: T[]) => list.map((x) => catalogEntry(kind, x as unknown as Record<string, unknown>)).filter((x): x is Record<string, unknown> => !!x) as unknown as never[];
  return {
    v: CATALOG_VERSION,
    builtAt: now,
    lessons: keep('lessons', all.lessons),
    tests: keep('tests', all.tests),
    assignments: keep('assignments', all.assignments),
    units: keep('units', all.units),
    materials: keep('materials', all.materials),
    classes: (all.classes ?? []).map(({ id, name, year, retired }) => ({ id, name, year, retired: !!retired })),
  };
}
