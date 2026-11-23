/**
 * Line icons drawn in the "circuit ink" style. They take the text colour
 * (currentColor), so they follow light and dark mode. Use instead of emoji,
 * which look different on every tablet.
 */
const P: Record<string, string> = {
  // Navigation
  home: 'M3 11l9-8 9 8M6 9.5V21h12V9.5',
  paper1: 'M6 2.5h12v19H6zM9.5 8h5M9.5 12h5M9.5 16h3',
  paper2: 'M4 20l3-1 11-11-2-2L5 17zM14 6l2 2',
  classwork: 'M3.5 6h17v14h-17zM3.5 10.5h17M8 3v4.5M16 3v4.5',
  progress: 'M4 20V12M10 20V5M16 20v-7M2.5 20.5h19',
  teacher: 'M3 4h18v11H3zM8 21l4-6 4 6M7 8h6M7 11h4',
  back: 'M15 5l-7 7 7 7',
  check: 'M4 12.5l5 5L20 6.5',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3.5 2',
  clip: 'M8 13l6.5-6.5a3.2 3.2 0 014.5 4.5l-8 8a5 5 0 01-7-7l7.5-7.5',
  file: 'M6 2.5h8.5L19 7v14.5H6zM14 2.5V7h5',
  test: 'M5 3h14v18H5zM8.5 8.5l1.5 1.5 3-3M8.5 15h7',
  hint: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z',
  calc: 'M5 2.5h14v19H5zM8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01',
  lab: 'M9 3h6M10 3v6L4.5 19a1.5 1.5 0 001.3 2h12.4a1.5 1.5 0 001.3-2L14 9V3M7 15h10',
  moon: 'M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  // Topics 1 to 10
  t1: 'M4 8h16v11H4zM9 13h.01M15 13h.01M12 8V4M10 4h4M8 19v2M16 19v2',
  t2: 'M2 12h4l1.5-4 3 8 3-8 3 8 1.5-4h4',
  t3: 'M10 4a2 2 0 014 0v10a4 4 0 11-4 0zM12 9v7',
  t4: 'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  t5: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8zM12 1v4M12 19v4M1 12h4M19 12h4',
  t6: 'M9 2.5h6v4H9zM12 6.5v3M12 9.5l4 3-4 3-4-3zM12 15.5v3M9 18.5h6v3H9z',
  t7: 'M3 8h4M3 16h4M7 5h5a7 7 0 010 14H7zM19 12h3',
  t8: 'M3 20L20 3M3 20h17M3 20V3M14 20a11 11 0 00-.8-4',
  t9: 'M6.5 12.5a4 4 0 100 8 4 4 0 000-8zM17.5 12.5a4 4 0 100 8 4 4 0 000-8zM6.5 12.5h11M9 12.5l2-6h4',
  t10: 'M12 2.5l8.5 5v9L12 21.5l-8.5-5v-9zM12 12l8.5-4.5M12 12L3.5 7.5M12 12v9.5',
};

/** Inline SVG for an icon. Decorative by default (hidden from screen readers). */
export function icon(name: string, size = 22, label?: string): string {
  const d = P[name] ?? P.file;
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '')}"` : 'aria-hidden="true"';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" ${a11y}><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export const topicIcon = (id: number, size = 22) => icon(`t${id}`, size);
