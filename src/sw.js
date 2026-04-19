import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Precache de assets do build (injetado pelo Vite PWA)
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Cache de API com timeout para falhar rápido se o backend estiver offline
registerRoute(
  ({ url }) => url.pathname.includes('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3, // Se não responder em 3s, usa cache (evita hang infinito)
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Não cachear chamadas de login ou multipart (uploads)
          if (request.url.includes('/auth/login') || request.method === 'POST') {
            return null;
          }
          return request;
        }
      }
    ]
  })
);

// Fallback de navegação: se a página não carregar (offline), retorna o index.html
const navigationRoute = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: ({ request }: any) => request.mode === 'navigate',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async ({ event }: any) => {
    try {
      return await new NetworkFirst({
        cacheName: 'pages-cache',
      }).handle({ event, request: event.request });
    } catch {
      // Se falhar tudo, tenta retornar o index.html do precache
      return caches.match('/');
    }
  }
};
registerRoute(navigationRoute.match, navigationRoute.handler);

/**
 * Notificações do SGP
 * Este Service Worker permite exibir alertas mesmo com o app fechado.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Escutar mensagens enviadas pelo app via postMessage
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SGP_NOTIFICATION') {
    const { title, body, icon, tag } = event.data;

    event.waitUntil(
      self.registration.showNotification(title || 'SGP', {
        body: body || '',
        icon: icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: tag || 'sgp-notification',
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: event.data.data || {},
      })
    );
  }
});

// Handler de clique na notificação: foca a janela do app ou abre uma nova
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se o app já está aberto, focar na aba existente
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Caso contrário, abrir uma nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
