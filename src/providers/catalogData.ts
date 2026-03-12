import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import { mockMovies } from '../data/mockMovies';
import { ENABLE_MOCK_FALLBACK, PROVIDER_CACHE_TTL_MS, STALE_RECORD_MAX_AGE_MS } from '../config/constants';
import { CATALOG_IDS, MovieRecord, ReleaseEvent } from '../types/domain';
import { startOfUtcDay, toDateValue } from '../utils/date';
import { uniqueBy } from '../utils/text';

import { getBoxOfficeTurkeyRecords } from './live/boxOfficeTurkey';
import { getParibuImaxTitles } from './live/paribu';
import { getPrNewswireRegalRecords } from './live/prNewswireRegal';

interface CachedRecords {
  expiresAt: number;
  updatedAt: number;
  movies: MovieRecord[];
}

interface CatalogRuntimeStatus {
  cacheSource: 'memory' | 'disk' | 'refresh' | 'stale' | 'empty';
  cachedRecordCount: number;
  cacheUpdatedAt: number | null;
  refreshInFlight: boolean;
  lastRefreshAttemptAt: number | null;
  lastSuccessfulRefreshAt: number | null;
  lastError: string | null;
  lastLiveRecordCount: number;
  lastSourceBreakdown: {
    turkey: number;
    regal: number;
  };
}

let cachedRecords: CachedRecords | null = null;
let activeLoad: Promise<MovieRecord[]> | null = null;
const runtimeStatus: CatalogRuntimeStatus = {
  cacheSource: 'empty',
  cachedRecordCount: 0,
  cacheUpdatedAt: null,
  refreshInFlight: false,
  lastRefreshAttemptAt: null,
  lastSuccessfulRefreshAt: null,
  lastError: null,
  lastLiveRecordCount: 0,
  lastSourceBreakdown: {
    turkey: 0,
    regal: 0,
  },
};

const DISK_CACHE_FILE = path.join(os.tmpdir(), 'back-on-screen-records-cache.json');

interface DiskCachePayload {
  updatedAt: number;
  movies: MovieRecord[];
}

interface LiveLoadResult {
  turkeyRecords: MovieRecord[];
  prNewswireRegalRecords: MovieRecord[];
}

function canUseStaleRecords(updatedAt: number): boolean {
  return Date.now() - updatedAt <= STALE_RECORD_MAX_AGE_MS;
}

function isDateValue(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isReleaseEvent(value: unknown): value is ReleaseEvent {
  if (!isPlainObject(value) || !Array.isArray(value.catalogIds)) {
    return false;
  }

  return (
    value.catalogIds.every((catalogId) => typeof catalogId === 'string' && CATALOG_IDS.includes(catalogId as (typeof CATALOG_IDS)[number])) &&
    typeof value.country === 'string' &&
    isDateValue(value.startDate) &&
    (value.endDate === undefined || isDateValue(value.endDate)) &&
    typeof value.source === 'string' &&
    (value.sourceKind === undefined || value.sourceKind === 'live' || value.sourceKind === 'mock') &&
    (value.sourceUrl === undefined || typeof value.sourceUrl === 'string') &&
    (value.note === undefined || typeof value.note === 'string')
  );
}

function isMovieRecord(value: unknown): value is MovieRecord {
  if (!isPlainObject(value) || !Array.isArray(value.releases)) {
    return false;
  }

  return (
    typeof value.imdbId === 'string' &&
    /^tt\d+$/.test(value.imdbId) &&
    typeof value.title === 'string' &&
    (value.originalTitle === undefined || typeof value.originalTitle === 'string') &&
    Number.isInteger(value.year) &&
    value.releases.every((release) => isReleaseEvent(release))
  );
}

function updateCacheStatus(source: CatalogRuntimeStatus['cacheSource'], records: CachedRecords | null): void {
  runtimeStatus.cacheSource = source;
  runtimeStatus.cachedRecordCount = records?.movies.length ?? 0;
  runtimeStatus.cacheUpdatedAt = records?.updatedAt ?? null;
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getCatalogStatus(): CatalogRuntimeStatus {
  return {
    ...runtimeStatus,
    lastSourceBreakdown: { ...runtimeStatus.lastSourceBreakdown },
  };
}

function mergeReleaseEvents(releases: ReleaseEvent[]): ReleaseEvent[] {
  return uniqueBy(releases, (release) => {
    const catalogs = release.catalogIds.slice().sort().join(',');
    return `${catalogs}:${release.country}:${release.startDate}:${release.endDate ?? ''}`;
  });
}

function mergeMovieRecords(records: MovieRecord[]): MovieRecord[] {
  const byImdb = new Map<string, MovieRecord>();

  for (const record of records) {
    const existing = byImdb.get(record.imdbId);

    if (!existing) {
      byImdb.set(record.imdbId, {
        ...record,
        releases: mergeReleaseEvents(record.releases),
      });
      continue;
    }

    existing.title = existing.title || record.title;
    existing.originalTitle = existing.originalTitle || record.originalTitle;
    existing.year = Math.min(existing.year, record.year);
    existing.releases = mergeReleaseEvents([...existing.releases, ...record.releases]);
  }

  return Array.from(byImdb.values());
}

function getReleaseEndDateValue(release: ReleaseEvent): string {
  return release.endDate ?? release.startDate;
}

function pickCarryoverEndedRecords(records: MovieRecord[], now: Date): MovieRecord[] {
  const nowDateValue = toDateValue(startOfUtcDay(now));
  const endedMovies: MovieRecord[] = [];

  for (const movie of records) {
    const endedReleases = movie.releases.filter((release) => {
      const endDate = getReleaseEndDateValue(release);
      return endDate < nowDateValue;
    });

    if (endedReleases.length > 0) {
      endedMovies.push({
        imdbId: movie.imdbId,
        title: movie.title,
        originalTitle: movie.originalTitle,
        year: movie.year,
        releases: endedReleases.map((release) => ({ ...release })),
      });
    }
  }

  return endedMovies;
}

function buildMockFallbackRecords(): MovieRecord[] {
  return mockMovies
    .map((movie) => ({
      ...movie,
      releases: movie.releases
        .filter((release) => release.country !== 'TR')
        .map((release) => ({
          ...release,
          sourceKind: 'mock' as const,
        })),
    }))
    .filter((movie) => movie.releases.length > 0);
}

function buildMockRecords(): MovieRecord[] {
  return mockMovies.map((movie) => ({
    ...movie,
    releases: movie.releases.map((release) => ({
      ...release,
      sourceKind: 'mock' as const,
    })),
  }));
}

async function loadLiveRecords(now: Date): Promise<LiveLoadResult> {
  const [paribuImaxTitles, prNewswireRegalRecords] = await Promise.all([
    getParibuImaxTitles().catch(() => new Set<string>()),
    getPrNewswireRegalRecords().catch(() => []),
  ]);
  const turkeyRecords = await getBoxOfficeTurkeyRecords(now, paribuImaxTitles).catch(() => []);

  return {
    turkeyRecords,
    prNewswireRegalRecords,
  };
}

async function readDiskCache(): Promise<CachedRecords | null> {
  try {
    const raw = await fs.readFile(DISK_CACHE_FILE, 'utf8');
    const payload = JSON.parse(raw) as DiskCachePayload;

    if (!Array.isArray(payload.movies) || !Number.isFinite(payload.updatedAt) || !canUseStaleRecords(payload.updatedAt)) {
      return null;
    }

    const movies = payload.movies.filter((movie) => isMovieRecord(movie));

    if (movies.length === 0) {
      return null;
    }

    return {
      expiresAt: Date.now() + PROVIDER_CACHE_TTL_MS,
      updatedAt: payload.updatedAt,
      movies,
    };
  } catch {
    return null;
  }
}

async function writeDiskCache(movies: MovieRecord[]): Promise<void> {
  const payload: DiskCachePayload = {
    updatedAt: Date.now(),
    movies,
  };

  try {
    await fs.writeFile(DISK_CACHE_FILE, JSON.stringify(payload), 'utf8');
  } catch {
    // Ignore cache write errors.
  }
}

async function refreshMovieRecords(now: Date): Promise<MovieRecord[]> {
  runtimeStatus.lastRefreshAttemptAt = Date.now();

  let liveLoad: LiveLoadResult = {
    turkeyRecords: [],
    prNewswireRegalRecords: [],
  };

  try {
    liveLoad = await loadLiveRecords(now);
    runtimeStatus.lastSuccessfulRefreshAt = Date.now();
    runtimeStatus.lastError = null;
  } catch (error) {
    runtimeStatus.lastError = formatErrorMessage(error);
    console.warn(`[catalogData] Live refresh failed: ${runtimeStatus.lastError}`);
  }

  const liveRecords = [...liveLoad.turkeyRecords, ...liveLoad.prNewswireRegalRecords];
  const carryoverEndedRecords = pickCarryoverEndedRecords(cachedRecords?.movies ?? [], now);
  runtimeStatus.lastLiveRecordCount = liveRecords.length;
  runtimeStatus.lastSourceBreakdown = {
    turkey: liveLoad.turkeyRecords.length,
    regal: liveLoad.prNewswireRegalRecords.length,
  };
  const fallbackRecords = buildMockFallbackRecords();

  let movies: MovieRecord[];

  if (liveRecords.length > 0) {
    movies = mergeMovieRecords(
      ENABLE_MOCK_FALLBACK
        ? [...liveRecords, ...carryoverEndedRecords, ...fallbackRecords]
        : [...liveRecords, ...carryoverEndedRecords]
    );
  } else {
    movies = ENABLE_MOCK_FALLBACK
      ? mergeMovieRecords([...carryoverEndedRecords, ...buildMockRecords()])
      : mergeMovieRecords(carryoverEndedRecords);
  }

  if (movies.length === 0 && cachedRecords && cachedRecords.movies.length > 0 && canUseStaleRecords(cachedRecords.updatedAt)) {
    cachedRecords = {
      expiresAt: Date.now() + PROVIDER_CACHE_TTL_MS,
      updatedAt: cachedRecords.updatedAt,
      movies: cachedRecords.movies,
    };

    updateCacheStatus('stale', cachedRecords);
    console.warn('[catalogData] Refresh returned empty; keeping stale cached records.');

    return cachedRecords.movies;
  }

  cachedRecords = {
    expiresAt: Date.now() + PROVIDER_CACHE_TTL_MS,
    updatedAt: Date.now(),
    movies,
  };
  updateCacheStatus('refresh', cachedRecords);
  console.info(
    `[catalogData] Refresh ok: turkey=${liveLoad.turkeyRecords.length}, regal=${liveLoad.prNewswireRegalRecords.length}, total=${movies.length}`
  );

  await writeDiskCache(movies);
  return movies;
}

function scheduleRefresh(now: Date): Promise<MovieRecord[]> {
  if (!activeLoad) {
    runtimeStatus.refreshInFlight = true;
    activeLoad = refreshMovieRecords(now)
      .then((movies) => {
        activeLoad = null;
        runtimeStatus.refreshInFlight = false;
        return movies;
      })
      .catch((error) => {
        activeLoad = null;
        runtimeStatus.refreshInFlight = false;

        if (cachedRecords && canUseStaleRecords(cachedRecords.updatedAt)) {
          return cachedRecords.movies;
        }

        throw error;
      });
  }

  return activeLoad;
}

export async function getMovieRecords(now = new Date()): Promise<MovieRecord[]> {
  if (cachedRecords) {
    if (cachedRecords.expiresAt > Date.now()) {
      updateCacheStatus('memory', cachedRecords);
      return cachedRecords.movies;
    }

    if (!canUseStaleRecords(cachedRecords.updatedAt)) {
      return scheduleRefresh(now);
    }

    void scheduleRefresh(now);
    updateCacheStatus('stale', cachedRecords);
    return cachedRecords.movies;
  }

  // Try disk cache while waiting; still trigger live refresh.
  const diskCache = await readDiskCache();

  if (diskCache && diskCache.movies.length > 0) {
    cachedRecords = diskCache;

    void scheduleRefresh(now);
    updateCacheStatus('disk', cachedRecords);
    return diskCache.movies;
  }

  // No memory or disk cache available — wait for live data.
  if (activeLoad) {
    return activeLoad;
  }

  return scheduleRefresh(now);
}
