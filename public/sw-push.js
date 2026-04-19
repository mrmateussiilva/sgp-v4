/**
 * Service Worker para notificações push do SGP
 * Este SW é ativado mesmo quando o app não está aberto.
 * Ele escuta por mensagens do tipo 'SGP_NOTIFICATION' e exibe
 * uma notificação nativa na barra de notificações do sistema.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
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
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se o app já está aberto, focar na aba existente
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Caso contrário, abrir uma nova janela
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
