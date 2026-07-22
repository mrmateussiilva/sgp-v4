const GEMINI_API_KEY_STORAGE = 'sgp_gemini_api_key';

export function loadGeminiApiKey(): string | null {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function saveGeminiApiKey(key: string): void {
  localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
}

export function clearGeminiApiKey(): void {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE);
}
