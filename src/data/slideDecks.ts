/** PowerPoint decks that also ship as slide pictures, so they can be read offline in the site's viewer. */
export const SLIDE_DECKS: Record<string, { dir: string; count: number; title: string }> = {
  '/teaching/python-1/Python-1-Variables-Data-Types-Operations.pptx': { dir: '/teaching/python-1/slides', count: 25, title: 'Python 1 slides: variables, data types and operations' },
};
/** Picture file for slide n (1-based); pdftoppm pads the number to the width of the count. */
export const slideFile = (dir: string, count: number, n: number) => `${dir}/slide-${String(n).padStart(String(count).length, '0')}.jpg`;
