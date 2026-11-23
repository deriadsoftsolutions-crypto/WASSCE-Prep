import type { ActivityContext } from './types';

export function mount(el: HTMLElement, _ctx: ActivityContext) {
  el.innerHTML = '<p class="muted">Coming soon.</p>';
}
