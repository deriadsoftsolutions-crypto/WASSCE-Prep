import { toast } from './ui';

/** Register the service worker (production builds only) and show online/offline status. */
export function initPWA() {
  const pill = document.getElementById('net-status');
  const net = () => { if (pill) pill.hidden = navigator.onLine; };
  window.addEventListener('online', net);
  window.addEventListener('offline', net);
  net();

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW registration failed', e));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) toast('A new version of the site is ready.', 0, { label: 'Reload', run: () => location.reload() });
    else toast('Ready to work offline.');
  });
}
