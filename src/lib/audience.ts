/**
 * Classes and "who is this for" (the audience of a lesson, test or assignment).
 *
 * A class id is the short code used in learner logins: "2 Sci A" -> "2scia" (letters and digits,
 * at most 16). It never changes when a class is renamed, so learners can always sign in.
 *
 * An audience is a list of tokens:
 *   []            all classes
 *   'year:2'      every class in STEM 2
 *   '2scia'       one class
 * Old items stored a single `classKey` ('' = all classes); they are read the same way.
 */

export interface ClassInfo { id: string; name: string; year: 1 | 2 | 3; retired?: boolean; aliases?: string[] }

export const classIdFor = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').slice(0, 16);

export const yearToken = (y: number) => `year:${y}`;
const isYearToken = (t: string) => /^year:[123]$/.test(t);

/** The audience of a stored item, old or new. */
export function audienceOf(d: { classIds?: string[] | null; classKey?: string | null }): string[] {
  if (Array.isArray(d.classIds)) return d.classIds;
  return d.classKey ? [d.classKey.slice(0, 16)] : [];
}

/** The class a learner belongs to: their fixed class, or the one worked out from what they typed (older accounts). */
export function learnerClassId(l: { classId?: string | null; className: string }): string {
  return l.classId || classIdFor(l.className);
}

export function inAudience(aud: string[], me: { classId: string; year?: number | null }): boolean {
  if (!aud.length) return true;
  return aud.includes(me.classId) || (!!me.year && aud.includes(yearToken(me.year)));
}

/** "All classes", "All STEM 2", "2 Sci A, 2 Sci B". */
export function audienceLabel(aud: string[], classes: ClassInfo[]): string {
  if (!aud.length) return 'All classes';
  return aud.map((t) => (isYearToken(t) ? `All STEM ${t.slice(5)}` : classes.find((c) => c.id === t)?.name ?? t.toUpperCase())).join(', ');
}

/** Years an audience is aimed at (for filtering teacher lists); empty = any year. */
export function audienceYears(aud: string[], classes: ClassInfo[]): number[] {
  const ys = new Set<number>();
  for (const t of aud) {
    if (isYearToken(t)) ys.add(Number(t.slice(5)));
    else { const c = classes.find((x) => x.id === t); if (c) ys.add(c.year); }
  }
  return [...ys].sort();
}

/** Tidy an audience: drop classes already covered by a whole year, keep a stable order. */
export function normaliseAudience(aud: string[], classes: ClassInfo[]): string[] {
  const years = new Set(aud.filter(isYearToken));
  const keep = aud.filter((t) => isYearToken(t) || !years.has(yearToken(classes.find((c) => c.id === t)?.year ?? 0)));
  const order = (t: string) => (isYearToken(t) ? Number(t.slice(5)) * 1000 : (classes.find((c) => c.id === t)?.year ?? 9) * 1000 + 1 + classes.findIndex((c) => c.id === t));
  return [...new Set(keep)].sort((a, b) => order(a) - order(b));
}

/** Sort classes by year, then name (numbers in names sort naturally). */
export function sortClasses<T extends ClassInfo>(list: T[]): T[] {
  return [...list].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** A learner as far as "who is this for" is concerned. */
export interface Me { classId?: string | null; className: string; year?: number | null }
export const isForMe = (d: { classIds?: string[] | null; classKey?: string | null }, me: Me) =>
  inAudience(audienceOf(d), { classId: learnerClassId(me), year: me.year });

/** Split published work into what is set for this learner's class and what is set for other classes. */
export function splitForMe<T extends { classIds?: string[] | null; classKey?: string | null }>(list: T[], me: Me): { mine: T[]; others: T[] } {
  const mine: T[] = []; const others: T[] = [];
  for (const x of list) (isForMe(x, me) ? mine : others).push(x);
  return { mine, others };
}

/** What older screens and exports show as "the class" of an item, and the single key old versions filtered on. */
export function legacyClassFields(aud: string[], classes: ClassInfo[]): { className: string; classKey: string } {
  return { className: aud.length ? audienceLabel(aud, classes) : '', classKey: aud.length === 1 && !isYearToken(aud[0]) ? aud[0] : '' };
}
