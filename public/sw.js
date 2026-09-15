// QasiNet Service Worker - Offline Resilient PWA
// Cache Version: qasinet-v2026-09-15

const CACHE_NAME = 'qasinet-v2026-09-15';

const PRECACHE_URLS = [
  '/',
  '/services',
  '/services/data',
  '/services/airtime',
  '/services/electricity',
  '/offline',
  '/favicon.ico',
  '/icon.jpeg',
  '/logos/safaricom-logo.png',
  '/logos/airtel-logo.jpg',
  '/logos/faiba-logo.png',
  '/logos/telcom-logo.png',
  '/logos/equitel-logo.jpg'
];

// Install Event: Pre-cache core application shell, services, and brand assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use map with individual catches so one failed asset doesn't abort entire SW installation
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to pre-cache ${url}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Evict stale caches from prior versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Pruning legacy cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interception Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-HTTP(S) and chrome-extension schemes
  if (!url.protocol.startsWith('http')) return;

  // 1. API Calls (/api/*): Network-only with graceful offline fallback JSON
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            offline: true,
            error: 'Network unavailable. You are currently offline.',
            offlineAvailable: true
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 2. Navigation Requests (HTML Pages): Stale-While-Revalidate with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          
          // Match matching route without query parameters (e.g. /services/data?phone=...)
          const strippedMatch = await caches.match(url.pathname);
          if (strippedMatch) return strippedMatch;

          // Ultimate fallback to the offline hub
          const offlineHub = await caches.match('/offline');
          if (offlineHub) return offlineHub;

          return new Response('<h1>QasiNet - Offline</h1><p>Please connect to the internet to load this page.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 3. Static Assets (_next/static, logos, images, fonts): Cache-First with Background Update
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/logos/') ||
    url.pathname.match(/\.(png|jpe?g|svg|webp|ico|woff2?|css|js)$/i);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background silently
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {
              // Ignore background fetch failures
            });
          return cachedResponse;
        }

        // Cache miss: fetch from network and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Background Sync Event: Inform client tabs to replay queued offline orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'qasinet-order-sync') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'QASINET_TRIGGER_SYNC' });
        });
      })
    );
  }
});
