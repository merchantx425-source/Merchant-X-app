const CACHE_NAME = 'merchant-x-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Listen for message from client to skip waiting immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: Clean up older caches & take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Non-GET requests should always go to network
  if (request.method !== 'GET') {
    return;
  }

  // 2. Critical: ALWAYS BYPASS cache for blockchain, RPC, API, analytics, Web3Modal, and dynamic price feeds
  const bypassHosts = [
    'api.coingecko.com',
    'min-api.cryptocompare.com',
    'polygon-rpc.com',
    'polygon-bor-rpc.publicnode.com',
    'mainnet.infura.io',
    'cloudflare-eth.com',
    'blockstream.info',
    'mempool.space',
    'blockchain.info',
    'relay.walletconnect.com',
    'relay.walletconnect.org',
    'api.web3modal.org',
    'api.web3modal.com',
    'rpc.walletconnect.org',
    'pulse.walletconnect.org',
    'analytics.vgdh.io',
  ];

  if (
    bypassHosts.some((host) => url.hostname.includes(host)) ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/rpc')
  ) {
    // Network only for dynamic/financial endpoints
    return;
  }

  // 3. Navigation (HTML pages): Network-first with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // 4. Static assets (JS, CSS, Images, Fonts): Stale-while-revalidate
  if (
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
