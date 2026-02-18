/**
 * Cross-Origin Isolation Service Worker
 *
 * This service worker enables SharedArrayBuffer on hosts that don't support
 * custom headers (like GitHub Pages) by intercepting responses and adding
 * the required COOP/COEP headers.
 *
 * Based on: https://github.com/nicoleahmed/coi-serviceworker
 */

const CACHE_NAME = 'coi-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle same-origin requests
  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response so we can modify headers
        const newHeaders = new Headers(response.headers);

        // Add cross-origin isolation headers
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
      .catch((error) => {
        console.error('Service worker fetch failed:', error);
        throw error;
      })
  );
});
