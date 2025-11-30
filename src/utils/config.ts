import { mkdir, readTextFile, writeTextFile, remove } from '@tauri-apps/plugin-fs';
import { appConfigDir, join, dirname } from '@tauri-apps/api/path';

const CONFIG_FILENAME = 'api_config.json';

export interface AppConfig {
  api_url: string;
}

async function getConfigPath(): Promise<string> {
  const dir = await appConfigDir();
  return await join(dir, CONFIG_FILENAME);
}

export async function loadConfig(): Promise<AppConfig | null> {
  try {
    const path = await getConfigPath();
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

export async function saveConfig(apiUrl: string): Promise<void> {
  const normalizedUrl = apiUrl.trim();
  if (!normalizedUrl) {
    throw new Error('API URL is required');
  }
  const payload: AppConfig = { api_url: normalizedUrl };
  const path = await getConfigPath();
  const directory = await dirname(path);
  await mkdir(directory, { recursive: true });
  await writeTextFile(path, JSON.stringify(payload));
}

export async function deleteConfig(): Promise<void> {
  try {
    const path = await getConfigPath();
    await remove(path);
  } catch {
    // Ignore errors when removing config
  }
}
