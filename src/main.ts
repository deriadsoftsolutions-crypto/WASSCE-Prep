import './styles.css';
import { route, startRouter, render } from './router';
import { learner, loadLearner, askLearner } from './lib/session';
import { mockPage } from './pages/mock';
import { homePage } from './pages/home';
import { topicPage } from './pages/topic';
import { paper2ListPage, paper2QuestionPage } from './pages/paper2';
import { progressPage } from './pages/progress';
import { teacherPage } from './pages/teacher';

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
  route('/', homePage, 'home');
  route('/topic/:id', topicPage, 'home');
  route('/mock', mockPage, 'mock');
  route('/paper2', paper2ListPage, 'paper2');
  route('/paper2/:id', paper2QuestionPage, 'paper2');
  route('/progress', progressPage, 'progress');
  route('/teacher', teacherPage);
  await loadLearner();
  updateChip();
  document.getElementById('learner-chip')!.addEventListener('click', () => void askLearner(true));
  window.addEventListener('learner-changed', () => { updateChip(); void render(); });
  startRouter();
  if (!learner() && location.pathname !== '/teacher') await askLearner();
}

void boot();
