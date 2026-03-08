import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './isTauri';

let isInitialized = false;

async function openDevtools() {
  try {
    await invoke('open_devtools');
  } catch {
    // ignore
  }
}

async function closeDevtools() {
  try {
    await invoke('close_devtools');
  } catch {
    // ignore
  }
}

async function toggleDevtools() {
  try {
    await invoke('toggle_devtools');
  } catch {
    // ignore
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
  isInitialized = true;
}
