/**
 * PowerPoint decks that also ship as slide pictures, so they can be read offline in the site's viewer.
 * The list lives in slideDecks.json, which scripts/decks/build.cjs updates when it builds a deck.
 */
import decks from './slideDecks.json';

export const SLIDE_DECKS: Record<string, { dir: string; count: number; title: string }> = decks;
/** Picture file for slide n (1-based); pdftoppm pads the number to the width of the count. */
export const slideFile = (dir: string, count: number, n: number) => `${dir}/slide-${String(n).padStart(String(count).length, '0')}.jpg`;
