import './styles.css';
import { route, startRouter } from './router';
import { learner, loadLearner, askLearner } from './lib/session';

function initTheme() {
  const btn = document.getElementById('theme-toggle')!;
  btn.addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    try { localStorage.setItem('wassce.theme', root.dataset.theme); } catch { /* ignore */ }
  });
}

function updateChip() {
  const chip = document.getElementById('learner-chip')!;
  const l = learner();
  chip.hidden = !l;
  if (l) chip.textContent = `${l.name} · ${l.className}`;
}

async function boot() {
  initTheme();
  route('/', (el) => { el.innerHTML = '<h1>Home</h1>'; }, 'home');
  await loadLearner();
  updateChip();
  document.getElementById('learner-chip')!.addEventListener('click', () => void askLearner(true));
  window.addEventListener('learner-changed', updateChip);
  startRouter();
  if (!learner() && location.pathname !== '/teacher') await askLearner();
}

void boot();
