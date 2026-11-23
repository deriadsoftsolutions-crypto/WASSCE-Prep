import './styles.css';
import { route, startRouter, render } from './router';
import { learner, loadLearner, askLearner, signOutOrSwitch } from './lib/session';
import { usingFirebase } from './storage';
import { getSettings, saveSettings } from './lib/settings';
import { fetchRemoteSettings } from './firebase/settings';
import { isTeacher } from './firebase/account';
import { mockPage } from './pages/mock';
import { homePage } from './pages/home';
import { topicPage } from './pages/topic';
import { paper2ListPage, paper2QuestionPage } from './pages/paper2';
import { progressPage } from './pages/progress';
import { teacherPage } from './pages/teacher';
import { assignmentsPage, assignmentPage } from './pages/assignments';
import { testPage } from './pages/tests';
import { initPWA } from './lib/pwa';

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
  if (l) chip.textContent = l.className ? `${l.name} · ${l.className}` : l.name;
  chip.title = usingFirebase ? 'Sign out' : 'Switch learner';
  // Show a Teacher link in the menu for teacher accounts.
  const link = document.querySelector<HTMLElement>('[data-nav="teacher"]')!;
  link.hidden = true;
  if (usingFirebase && l) void isTeacher().then((t) => { link.hidden = !t; }).catch(() => {});
}

async function boot() {
  initTheme();
  initPWA();
  (document.querySelector('[data-nav="assignments"]') as HTMLElement).hidden = !usingFirebase;
  route('/', homePage, 'home');
  route('/topic/:id', topicPage);
  route('/mock', mockPage, 'mock');
  route('/paper2', paper2ListPage, 'paper2');
  route('/paper2/:id', paper2QuestionPage, 'paper2');
  route('/progress', progressPage, 'progress');
  route('/assignments', assignmentsPage, 'assignments');
  route('/assignments/:id', assignmentPage, 'assignments');
  route('/tests/:id', testPage, 'assignments');
  route('/teacher', teacherPage, 'teacher');
  await loadLearner();
  updateChip();
  document.getElementById('learner-chip')!.addEventListener('click', () => void signOutOrSwitch());
  window.addEventListener('learner-changed', () => {
    updateChip();
    void render();
    if (usingFirebase && learner()) void syncSettings();
  });
  // Anyone who leaves the teacher page without signing in is asked to sign in.
  window.addEventListener('route-changed', (e) => {
    if (!learner() && (e as CustomEvent<string>).detail !== '/teacher' && document.readyState !== 'loading') void askLearner();
  });
  startRouter();
  if (!learner() && location.pathname !== '/teacher') await askLearner();
  else if (usingFirebase && learner()) void syncSettings();
}

/** Pull the teacher's class-wide mock settings (Firebase mode) into this device's copy. */
async function syncSettings() {
  const remote = await fetchRemoteSettings();
  if (remote) saveSettings({ ...getSettings(), ...remote });
}

void boot();
