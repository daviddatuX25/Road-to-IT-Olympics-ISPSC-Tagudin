const CACHE_NAME = 'rio-app-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/robots.txt',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-http/https protocols (e.g. chrome-extension://, data:, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 1. Skip /api/health (always go to network)
  if (url.pathname === '/api/health') {
    return;
  }

  // 2. Network-first strategy for /api/rpc
  if (url.pathname === '/api/rpc') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ ok: false, error: 'Network error talking to the server.' }),
          { headers: { 'content-type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 3. Cache-first strategy for static Next.js assets and media
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.includes('/fonts/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Stale-while-revalidate for page navigations and other GET requests
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });

        if (cachedResponse) {
          // Serve from cache immediately, update in background
          fetchPromise.catch(() => {});
          return cachedResponse;
        }

        // Return fetchPromise directly if no cached version is available
        return fetchPromise;
      })
    );
  }
});

// IndexedDB Helper for SW background execution
function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rio-offline', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function replayOutbox() {
  let db;
  try {
    db = await getDB();
  } catch (e) {
    console.error('[SW Sync] Failed to open DB:', e);
    return;
  }

  const getOutboxItems = () => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readonly');
      const store = transaction.objectStore('outbox');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  };

  const deleteOutboxItem = (id) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readwrite');
      const store = transaction.objectStore('outbox');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const updateOutboxItem = (item) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('outbox', 'readwrite');
      const store = transaction.objectStore('outbox');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const items = await getOutboxItems();
  if (items.length === 0) return;

  console.log(`[SW Sync] Found ${items.length} items to replay...`);

  for (const item of items) {
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: item.action, args: item.args })
      });
      
      const json = await res.json();
      if (res.ok && json.ok) {
        await deleteOutboxItem(item.id);
        console.log(`[SW Sync] Successfully synced action: ${item.action}`);
      } else {
        throw new Error(json.error || 'Server error');
      }
    } catch (err) {
      console.warn(`[SW Sync] Failed to sync action: ${item.action}`, err);
      
      const errMsg = String(err.message || '').toLowerCase();
      if (
        errMsg.includes('unauthorized') ||
        errMsg.includes('session expired') ||
        errMsg.includes('not logged in') ||
        errMsg.includes('auth')
      ) {
        console.warn('[SW Sync] Auth error encountered, pausing sync.');
        break;
      }

      if (item.retries < 3) {
        item.retries += 1;
        await updateOutboxItem(item);
      } else {
        await deleteOutboxItem(item.id);
        console.error(`[SW Sync] Discarded action ${item.action} after 3 retries.`, item);
      }
    }
  }
}

self.addEventListener('sync', event => {
  if (event.tag === 'rio-outbox-sync') {
    event.waitUntil(replayOutbox());
  }
});
