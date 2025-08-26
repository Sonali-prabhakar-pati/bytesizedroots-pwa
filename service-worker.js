/* Simple PWA service worker with cache + push notification handlers
   - CACHE_NAME: change when you update cached files
   - FILES_TO_CACHE: add any paths you want cached for offline
*/
const CACHE_NAME = 'bytesizedroots-cache-v1';
const FILES_TO_CACHE = [
  '/',                        // root (will be origin root)
  // Add more URLs you want pre-cached, e.g. '/index.html', '/styles.css'
];

// Install - cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(resp => {
      // put a copy in cache
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
      return resp;
    }).catch(() => caches.match(event.request))
  );
});

// Push - show notifications (data expected as JSON)
self.addEventListener('push', event => {
  let data = { title: 'ByteSized Roots', body: 'New content available', url: '/' };
  try { if (event.data) data = event.data.json(); } catch(e){}

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
