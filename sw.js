const CACHE = 'express-wash-v1';
const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900&family=Bebas+Neue&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.6.0/jspdf.plugin.autotable.min.js'
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(['./index.html']))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', e => {
  // Skip Supabase API calls (always go to network)
  if(e.request.url.includes('supabase.co')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful GET responses
        if(e.request.method === 'GET' && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback for navigation
        if(e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
