/** Which files the built-in viewer (/view) can show, and the link that opens them there. */
import { SLIDE_DECKS } from '../data/slideDecks';

export type ViewKind = 'pdf' | 'slides' | 'office';
const OFFICE = /\.(pptx?|docx?|xlsx?)$/i;

/** Only files from this site: lesson uploads and teaching materials. */
export const allowedSrc = (src: string) => /^\/(api\/lesson-file|teaching)\//.test(src) && !src.includes('..');

export function viewKind(src: string, fileName = src): ViewKind | null {
  const path = src.split(/[?#]/)[0];
  if (!allowedSrc(path)) return null;
  if (SLIDE_DECKS[path]) return 'slides';
  if (/\.pdf$/i.test(fileName) || /\.pdf$/i.test(path)) return 'pdf';
  if (OFFICE.test(fileName) || OFFICE.test(path)) return 'office';
  return null;
}

/**
 * Link to the viewer, or null when the file should simply download.
 * teacherOnly files never go to Microsoft's online viewer (it fetches the file from Microsoft's servers).
 */
export function viewerHref(src: string, opts: { name?: string; title?: string; page?: number | null; teacherOnly?: boolean } = {}): string | null {
  const kind = viewKind(src, opts.name);
  if (!kind || (kind === 'office' && opts.teacherOnly)) return null;
  const q = new URLSearchParams({ src: src.split('#')[0] });
  if (opts.name) q.set('name', opts.name);
  if (opts.title) q.set('title', opts.title);
  if (opts.page && opts.page > 1) q.set('page', String(opts.page));
  return `/view?${q.toString()}`;
}
