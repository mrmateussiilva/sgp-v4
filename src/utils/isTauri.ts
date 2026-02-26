export function isTauri(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const win = window as unknown as Record<string, unknown>;
  return Boolean(win.__TAURI_IPC__ || win.__TAURI__ || win.__TAURI_INTERNALS__);
}
