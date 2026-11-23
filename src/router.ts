export type Cleanup = (() => void) | void;
export type RouteHandler = (el: HTMLElement, params: Record<string, string>) => Cleanup | Promise<Cleanup>;

interface Route {
  re: RegExp;
  keys: string[];
  handler: RouteHandler;
  nav?: string;
}

const routes: Route[] = [];
let cleanup: Cleanup;
let notFound: RouteHandler = (el) => {
  el.innerHTML = '<h1>Page not found</h1><p><a href="/">Go home</a></p>';
};

export function route(path: string, handler: RouteHandler, nav?: string) {
  const keys: string[] = [];
  const re = new RegExp(
    '^' + path.replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$',
  );
  routes.push({ re, keys, handler, nav });
}

export function setNotFound(h: RouteHandler) {
  notFound = h;
}

export function navigate(path: string, replace = false) {
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  void render();
}

/** Guard that pages can set (e.g. during a mock) to confirm leaving. */
let leaveGuard: (() => boolean) | null = null;
export function setLeaveGuard(fn: (() => boolean) | null) {
  leaveGuard = fn;
}

export async function render() {
  const app = document.getElementById('app')!;
  if (typeof cleanup === 'function') cleanup();
  cleanup = undefined;
  leaveGuard = null;
  const path = location.pathname;
  window.dispatchEvent(new CustomEvent('route-changed', { detail: path }));
  let nav = '';
  app.innerHTML = '';
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      nav = r.nav ?? '';
      document.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
      cleanup = await r.handler(app, params);
      window.scrollTo(0, 0);
      return;
    }
  }
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.remove('active'));
  cleanup = await notFound(app, {});
}

export function startRouter() {
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || a.target || a.hasAttribute('download') || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    e.preventDefault();
    if (leaveGuard && !leaveGuard()) return;
    if (href !== location.pathname) navigate(href);
  });
  window.addEventListener('popstate', () => void render());
  void render();
}
