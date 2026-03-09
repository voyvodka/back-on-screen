export const ADDON_ID = 'dev.backonscreen.catalogs';
export const ADDON_NAME = 'Back on Screen';
export const ADDON_DESCRIPTION =
  'Shows movie rereleases and official IMAX returns inside Stremio.';

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

function normalizeBaseUrl(value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid BASE_URL value: ${value}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`BASE_URL must use http or https: ${value}`);
  }

  return parsed.toString().replace(/\/$/, '');
}

export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const IS_DEV = NODE_ENV !== 'production';
export const ENABLE_MOCK_FALLBACK = process.env.ENABLE_MOCK_FALLBACK === 'true';
export const HOST = process.env.HOST ?? '127.0.0.1';
export const PORT = parsePort(process.env.PORT ?? '7000');
export const BASE_URL = normalizeBaseUrl(process.env.BASE_URL ?? `http://${HOST}:${PORT}`);
export const RECENT_RETENTION_DAYS = 3;
export const RERELEASE_MIN_YEARS = 5;
export const PROVIDER_CACHE_TTL_MS = IS_DEV ? 1000 * 30 : 1000 * 60 * 30;
export const STALE_RECORD_MAX_AGE_MS = IS_DEV ? 1000 * 60 * 60 * 6 : 1000 * 60 * 60 * 24 * 3;
export const CATALOG_CACHE_SECONDS = IS_DEV ? 3 : 60 * 15;
export const STALE_REVALIDATE_SECONDS = IS_DEV ? 3 : 60 * 60;
export const STALE_ERROR_SECONDS = IS_DEV ? 3 : 60 * 60 * 24;

export const CATALOG_NAMES = {
  rerelease: 'Back in Theaters',
  'imax-returning': 'Returning to IMAX',
} as const;
