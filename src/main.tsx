import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { enableDevtoolsShortcuts } from './utils/devtools';
import { ErrorBoundary } from './components/ErrorBoundary';

// Desregistra os service workers e limpa os caches no desktop (Tauri)
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function clearCachesAndWorkers() {
  if (!isTauri) return;

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('ServiceWorker unregistered successfully in Tauri.');
      }
    }

    if ('caches' in window) {
      const names = await caches.keys();
      for (const name of names) {
        await caches.delete(name);
        console.log(`Cache '${name}' cleared in Tauri.`);
      }
    }
  } catch (err) {
    console.error('Error clearing caches/workers:', err);
  }
}

// Resolve o problema "TypeError: error loading dynamically imported module" em PWA / Web
// Isso acontece quando a API sobe uma versão nova e o usuário navega tentando buscar o Javascript velho guardado em cache.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

function renderApp() {
  if (import.meta.env.PROD) {
    enableDevtoolsShortcuts();
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

clearCachesAndWorkers().finally(() => {
  renderApp();
});

