import paper1 from '../data/paper1.json';
import type { Paper1Question } from '../types';
import { mountMock } from '../quiz/quiz';
import { getSettings } from '../lib/settings';

export function mockPage(el: HTMLElement) {
  el.innerHTML = `<div class="page-head"><h1>Paper 1 Mock</h1></div><div id="mock"></div>`;
  const s = getSettings();
  return mountMock(el.querySelector('#mock') as HTMLElement, paper1 as Paper1Question[], { minutes: s.mockMinutes, shuffle: s.shuffle });
}
