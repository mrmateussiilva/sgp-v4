const FALLBACK_MANIFEST_URL = 'https://sgp.finderbit.com.br/update';

export function resolveManifestUrl(): string {
  const viteEnv = (import.meta as any)?.env?.VITE_SGP_MANIFEST_URL;
  if (viteEnv) {
    return viteEnv as string;
  }

  if (typeof window !== 'undefined') {
    const globalUrl = (window as any).__SGP_MANIFEST_URL__;
    if (globalUrl) {
      return String(globalUrl);
    }

    const metaTag = document.querySelector('meta[name="sgp-manifest-url"]') as
      | HTMLMetaElement
      | null;

    if (metaTag?.content) {
      return metaTag.content;
    }
  }

  return FALLBACK_MANIFEST_URL;
}

export const DEFAULT_MANIFEST_URL = resolveManifestUrl();


