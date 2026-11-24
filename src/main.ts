import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/barlow-condensed/latin-700.css';
import './styles.css';
import { route, startRouter, render, navigate } from './router';
import { avatarHTML } from './lib/avatar';
import { esc } from './lib/dom';
import { learner, loadLearner, askLearner, askYear, signOutOrSwitch } from './lib/session';
import { usingFirebase } from './storage';
import { getSettings, saveSettings } from './lib/settings';
import { fetchRemoteSettings } from './firebase/settings';
import { isTeacher } from './firebase/account';
import { mockPage } from './pages/mock';
import { homePage } from './pages/home';
import { topicPage } from './pages/topic';
import { activityPage } from './pages/activity';
import { paper2ListPage, paper2QuestionPage } from './pages/paper2';
import { progressPage } from './pages/progress';
import { assignmentsPage, assignmentPage } from './pages/assignments';
import { testPage } from './pages/tests';
import { lessonPage } from './pages/lessons';
import { learnPage, unitPage, wasscePage } from './pages/learn';
import { initPWA } from './lib/pwa';
import { icon } from './lib/icons';
import { dueWork } from './lib/due';

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
  const label = l ? (l.className ? `${l.name}, ${l.className}` : l.name) : '';
  const draw = (photo: string | null) => { chip.innerHTML = `${usingFirebase ? avatarHTML(l!.name, photo, 30) : ''}<span>${esc(label)}</span>`; };
  if (l) {
    draw(null);
    if (usingFirebase) void import('./firebase/profilePhoto').then((m) => m.getPhoto(l.id)).then((p) => { if (learner()?.id === l.id) draw(p.approved); }).catch(() => {});
  }
  chip.title = usingFirebase ? 'My profile' : 'Switch learner';
  // Show a Teacher link in the menu for teacher accounts.
  const link = document.querySelector<HTMLElement>('[data-nav="teacher"]')!;
  link.hidden = true;
  if (usingFirebase && l) void isTeacher().then((t) => { link.hidden = !t; }).catch(() => {});
}

async function boot() {
  initTheme();
  initPWA();
  (document.querySelector('[data-nav="assignments"]') as HTMLElement).hidden = !usingFirebase;
  (document.querySelector('[data-nav="learn"]') as HTMLElement).hidden = !usingFirebase;
  (document.querySelector('[data-nav="portfolio"]') as HTMLElement).hidden = !usingFirebase;
  initNav();
  route('/', homePage, 'home');
  route('/topic/:id', topicPage, 'wassce');
  route('/topic/:id/:activity', activityPage);
  route('/mock', mockPage, 'wassce');
  route('/wassce', wasscePage, 'wassce');
  route('/learn', learnPage, 'learn');
  route('/learn/:id', unitPage, 'learn');
  route('/paper2', paper2ListPage, 'wassce');
  route('/paper2/:id', paper2QuestionPage, 'wassce');
  route('/progress', progressPage, 'progress');
  route('/assignments', assignmentsPage, 'assignments');
  route('/assignments/:id', assignmentPage, 'assignments');
  route('/tests/:id', testPage, 'assignments');
  route('/lessons/:id', lessonPage, 'assignments');
  route('/python', async (el) => (await import('./pages/python')).pythonPage(el), 'learn');
  route('/profile', async (el) => (await import('./pages/profile')).profilePage(el), 'progress');
  route('/portfolio', async (el) => (await import('./pages/portfolio')).portfolioPage(el), 'portfolio');
  route('/portfolio/print', async (el, p) => (await import('./pages/portfolioPrint')).portfolioPrintPage(el, p), 'portfolio');
  route('/portfolio/print/:uid', async (el, p) => (await import('./pages/portfolioPrint')).portfolioPrintPage(el, p), 'portfolio');
  // Teacher pages load only when opened, so learners never download them.
  route('/teacher', async (el) => (await import('./pages/teacher')).teacherPage(el), 'teacher');
  await loadLearner();
  updateChip();
  document.getElementById('learner-chip')!.addEventListener('click', () => { if (usingFirebase) navigate('/profile'); else void signOutOrSwitch(); });
  window.addEventListener('learner-changed', () => {
    updateChip();
    void render();
    if (usingFirebase && learner()) void syncSettings();
    void updateBadge();
    void maybeAskYear();
  });
  window.addEventListener('classwork-changed', () => void updateBadge());
  // Anyone who leaves the teacher page without signing in is asked to sign in.
  window.addEventListener('route-changed', (e) => {
    if (!learner() && (e as CustomEvent<string>).detail !== '/teacher' && document.readyState !== 'loading') void askLearner();
  });
  startRouter();
  if (!learner() && location.pathname !== '/teacher') await askLearner();
  else if (usingFirebase && learner()) void syncSettings();
  void updateBadge();
  void maybeAskYear();
}

/** Accounts made before years existed are asked their STEM year once. */
let askingYear = false;
async function maybeAskYear() {
  const l = learner();
  if (!usingFirebase || !l || l.year || askingYear || location.pathname === '/teacher') return;
  askingYear = true;
  try {
    if (!(await isTeacher().catch(() => true))) await askYear();
  } finally {
    askingYear = false;
  }
}

const NAV_ICONS: Record<string, string> = { home: 'home', learn: 'book', assignments: 'classwork', portfolio: 'file', wassce: 'test', progress: 'progress', teacher: 'teacher' };

/** Give each menu link its icon, and Classwork a badge for work still to do. */
function initNav() {
  document.querySelectorAll<HTMLAnchorElement>('.mainnav a[data-nav]').forEach((a) => {
    const label = a.textContent?.trim() ?? '';
    a.innerHTML = `${icon(NAV_ICONS[a.dataset.nav!] ?? 'file', 24)}<span>${label}</span>${a.dataset.nav === 'assignments' ? '<span class="nav-badge" hidden></span>' : ''}`;
  });
}

async function updateBadge() {
  const badge = document.querySelector<HTMLElement>('[data-nav="assignments"] .nav-badge');
  if (!badge) return;
  const n = (await dueWork().catch(() => [])).length;
  badge.hidden = n === 0;
  badge.textContent = String(n);
  badge.setAttribute('aria-label', `${n} to do`);
}

/** Pull the teacher's class-wide mock settings (Firebase mode) into this device's copy. */
async function syncSettings() {
  const remote = await fetchRemoteSettings();
  if (remote) saveSettings({ ...getSettings(), ...remote });
}

void boot();
