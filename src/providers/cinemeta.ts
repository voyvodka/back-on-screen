import { fetchJson } from '../utils/http';

const CINEMETA_TTL_MS = 1000 * 60 * 60 * 12;

interface CinemetaResponse {
  meta?: CinemetaMeta;
}

export interface CinemetaMeta {
  id: string;
  type: string;
  name: string;
  genres?: string[];
  poster?: string;
  posterShape?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  director?: string[];
  cast?: string[];
  imdbRating?: string;
  released?: string;
  trailers?: Array<{ source: string; type: string }>;
  runtime?: string;
  language?: string;
  country?: string;
  awards?: string;
  website?: string;
  links?: Array<{ name: string; category: string; url: string }>;
}

const metaCache = new Map<string, { expiresAt: number; meta: CinemetaMeta | null }>();

function isCinemetaMeta(value: unknown): value is CinemetaMeta {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CinemetaMeta>;
  return typeof candidate.id === 'string' && typeof candidate.type === 'string' && typeof candidate.name === 'string';
}

export async function getCinemetaMeta(type: string, id: string): Promise<CinemetaMeta | null> {
  const cacheKey = `${type}:${id}`;
  const cached = metaCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.meta;
  }

  try {
    const response = await fetchJson<CinemetaResponse>(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`);
    const meta = isCinemetaMeta(response.meta) ? response.meta : null;
    metaCache.set(cacheKey, { expiresAt: Date.now() + CINEMETA_TTL_MS, meta });
    return meta;
  } catch {
    metaCache.set(cacheKey, { expiresAt: Date.now() + 1000 * 60, meta: null });
    return null;
  }
}
