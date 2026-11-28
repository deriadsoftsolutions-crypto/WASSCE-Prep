import {
  doc, setDoc,
} from 'firebase/firestore';
import { getDoc } from './reads';
import { db } from './app';
import type { Settings } from '../lib/settings';

/** Class-wide mock settings, set by the teacher once for every device. */
const ref = () => doc(db, 'settings', 'global');

export async function fetchRemoteSettings(): Promise<Partial<Settings> | null> {
  try {
    const s = await getDoc(ref());
    return s.exists() ? (s.data() as Partial<Settings>) : null;
  } catch {
    return null;
  }
}

export async function saveRemoteSettings(s: Settings): Promise<void> {
  await setDoc(ref(), { mockMinutes: s.mockMinutes, shuffle: s.shuffle, updatedAt: Date.now() });
}
