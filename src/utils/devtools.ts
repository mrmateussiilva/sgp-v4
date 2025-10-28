import { invoke } from '@tauri-apps/api/tauri';
import { isTauri } from './isTauri';

let isInitialized = false;

async function openDevtools() {
  try {
    await invoke('open_devtools');
  } catch (error) {
    console.error('Erro ao abrir DevTools:', error);
  }
}

async function closeDevtools() {
  try {
    await invoke('close_devtools');
  } catch (error) {
    console.error('Erro ao fechar DevTools:', error);
  }
}

async function toggleDevtools() {
  try {
    await invoke('toggle_devtools');
  } catch (error) {
    console.error('Erro ao alternar DevTools:', error);
  }
}

export function enableDevtoolsShortcuts(): void {
  if (isInitialized || !isTauri()) {
    return;
  }

  const handler = (event: KeyboardEvent) => {
    if (event.key === 'F12') {
      event.preventDefault();
      toggleDevtools();
      return;
    }

    if (event.ctrlKey && event.shiftKey) {
      if (event.key.toUpperCase() === 'I') {
        event.preventDefault();
        toggleDevtools();
        return;
      }

      if (event.key.toUpperCase() === 'J') {
        event.preventDefault();
        openDevtools();
        return;
      }

      if (event.key.toUpperCase() === 'D') {
        event.preventDefault();
        closeDevtools();
      }
    }
  };

  document.addEventListener('keydown', handler);
  console.info('Atalhos do DevTools habilitados (F12, Ctrl+Shift+I/J/D).');
  isInitialized = true;
}
