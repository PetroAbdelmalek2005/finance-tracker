const CACHE = 'ft-v1';
const SHELL = ['./index.html'];

// Install: cache the app shell for offline use
self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))));

// Activate: remove stale caches from previous versions
self.addEventListener('activate', e =>
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));

// Fetch: serve from cache, fall back to network (GET only — don't intercept Sheets API POSTs)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Background Sync: when network is restored after a failed auto-push,
// notify the main page so it can retry the push
self.addEventListener('sync', e => {
  if (e.tag === 'ft-sync') {
    e.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients =>
        clients.forEach(c => c.postMessage({ type: 'BG_SYNC_READY' })))
    );
  }
});
