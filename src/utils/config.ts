import { isTauri } from './isTauri';

const CONFIG_FILENAME = 'api_config.json';
const CONFIG_STORAGE_KEY = 'sgp_api_config';

export interface AppConfig {
  api_url: string;
}

export async function loadConfig(): Promise<AppConfig | null> {
  if (isTauri()) {
    try {
      const { appDataDir, join } = await import('@tauri-apps/api/path');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');

      const dir = await appDataDir();
      const path = await join(dir, CONFIG_FILENAME);
      const data = await readTextFile(path);
      const parsed = JSON.parse(data) as AppConfig;
      if (typeof parsed?.api_url === 'string' && parsed.api_url.trim().length > 0) {
        return { api_url: parsed.api_url.trim() };
      }
      return null;
    } catch {
      return null;
    }
  }

  // Web: usar localStorage
  try {
    const data = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as AppConfig;
    if (typeof parsed?.api_url === 'string' && parsed.api_url.trim().length > 0) {
      return { api_url: parsed.api_url.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveConfig(apiUrl: string): Promise<void> {
  const normalizedUrl = apiUrl.trim();
  if (!normalizedUrl) {
    throw new Error('API URL is required');
  }
  const payload: AppConfig = { api_url: normalizedUrl };

  if (isTauri()) {
    const { appDataDir, join, dirname } = await import('@tauri-apps/api/path');
    const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');

    const dir = await appDataDir();
    const path = await join(dir, CONFIG_FILENAME);
    const directory = await dirname(path);
    await mkdir(directory, { recursive: true });
    await writeTextFile(path, JSON.stringify(payload));
    return;
  }

  // Web: usar localStorage
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(payload));
}

export async function deleteConfig(): Promise<void> {
  if (isTauri()) {
    try {
      const { appDataDir, join } = await import('@tauri-apps/api/path');
      const { remove } = await import('@tauri-apps/plugin-fs');

      const dir = await appDataDir();
      const path = await join(dir, CONFIG_FILENAME);
      await remove(path);
    } catch {
      // Ignore errors when removing config
    }
    return;
  }

  // Web: remover do localStorage
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
