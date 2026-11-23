import { CONFIG } from '../config';

/** Per-tablet settings controlled from the teacher page. */
export interface Settings {
  mockMinutes: number;
  shuffle: boolean;
}

const KEY = 'wassce.settings.v1';

export function getSettings(): Settings {
  const d: Settings = { mockMinutes: CONFIG.DEFAULT_MOCK_MINUTES, shuffle: CONFIG.DEFAULT_SHUFFLE };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...d, ...(JSON.parse(raw) as Partial<Settings>) } : d;
  } catch {
    return d;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
