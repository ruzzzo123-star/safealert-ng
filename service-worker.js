// SafeAlert NG Service Worker
// Version 1.0.0

const CACHE_NAME = 'safealert-v1.0.0';
const RUNTIME_CACHE = 'safealert-runtime';

// Files to cache on install (App Shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/apple-touch-icon.png'
];

// =============================================
// INSTALL EVENT - Cache App Shell
// =============================================
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('[ServiceWorker] App shell cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Cache failed:', error);
      })
  );
});

// =============================================
// ACTIVATE EVENT - Clean Old Caches
// =============================================
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activated');
        return self.clients.claim();
      })
  );
});

// =============================================
// FETCH EVENT - Serve from Cache, Fallback to Network
// =============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (except CDNs we trust)
  if (url.origin !== location.origin) {
    // Allow certain CDNs
    const allowedOrigins = [
      'https://api.anthropic.com',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];
    
    if (!allowedOrigins.some(origin => url.origin === origin)) {
      return;
    }
  }
  
  // HTML pages - Network first, cache fallback
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }
  
  // API requests - Network only (don't cache)
  if (url.pathname.includes('/api/') || url.origin.includes('anthropic')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }
  
  // Static assets - Cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // Cache valid responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline placeholder for images
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="#1C1C1E" width="100" height="100"/><text fill="#8E8E93" font-family="system-ui" font-size="12" x="50" y="50" text-anchor="middle">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
          });
      })
  );
});

// =============================================
// PUSH NOTIFICATIONS
// =============================================
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'SafeAlert NG',
        body: event.data.text(),
        icon: '/web-app-manifest-192x192.png'
      };
    }
  }
  
  const options = {
    body: data.body || 'New safety alert',
    icon: data.icon || '/web-app-manifest-192x192.png',
    badge: '/web-app-manifest-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'safealert-notification',
    renotify: true,
    requireInteraction: data.urgent || false,
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: {
      url: data.url || '/',
      type: data.type || 'alert'
    }
  };
  
  // Customize based on alert type
  if (data.type === 'emergency') {
    options.vibrate = [500, 200, 500, 200, 500];
    options.requireInteraction = true;
    options.actions = [
      { action: 'respond', title: '🚨 I\'m Safe' },
      { action: 'help', title: '🆘 Need Help' }
    ];
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'SafeAlert NG', options)
  );
});

// =============================================
// NOTIFICATION CLICK
// =============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  // Handle actions
  if (event.action === 'respond' || event.action === 'view') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Focus existing window if open
          for (const client of clientList) {
            if (client.url.includes('safealert') && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else if (event.action === 'help') {
    // Trigger emergency
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          for (const client of clientList) {
            client.postMessage({ type: 'TRIGGER_SOS' });
          }
          if (clientList.length === 0 && clients.openWindow) {
            return clients.openWindow('/?action=sos');
          }
        })
    );
  }
});

// =============================================
// BACKGROUND SYNC (for offline actions)
// =============================================
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncOfflineReports());
  }
  
  if (event.tag === 'sync-location') {
    event.waitUntil(syncLocationData());
  }
});

async function syncOfflineReports() {
  try {
    const cache = await caches.open('offline-reports');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const data = await response.json();
      
      // Send to server
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      // Remove from cache
      await cache.delete(request);
    }
    
    console.log('[ServiceWorker] Offline reports synced');
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

async function syncLocationData() {
  // Sync any pending location updates
  console.log('[ServiceWorker] Location sync complete');
}

// =============================================
// MESSAGE HANDLER
// =============================================
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

console.log('[ServiceWorker] Script loaded');
