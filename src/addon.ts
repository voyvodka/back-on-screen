import { addonBuilder } from 'stremio-addon-sdk';
import type { CatalogHandlerArgs, MetaHandlerArgs } from 'stremio-addon-sdk';

import {
  BASE_URL,
  ADDON_DESCRIPTION,
  ADDON_ID,
  ADDON_NAME,
  ADDON_VERSION,
  CATALOG_CACHE_SECONDS,
  CATALOG_NAMES,
  RECENT_RETENTION_DAYS,
  STALE_ERROR_SECONDS,
  STALE_REVALIDATE_SECONDS,
} from './config/constants';
import { COUNTRY_OPTIONS, normalizeCountry } from './config/countries';
import {
  buildAvailabilityDescription,
  buildAvailabilityLabel,
  buildReleaseInfo,
  getCatalogItems,
} from './lib/catalog';
import { getPosterFallbackUrl } from './lib/posterBadge';
import { getMovieRecords } from './providers/catalogData';
import { getCinemetaMeta } from './providers/cinemeta';
import { CATALOG_IDS, CatalogId } from './types/domain';
import { addDays, formatDateValue, parseDate, startOfUtcDay } from './utils/date';

function prioritizeReleases(
  movie: Awaited<ReturnType<typeof getMovieRecords>>[number],
  selectedCountry: string
): Awaited<ReturnType<typeof getMovieRecords>>[number]['releases'] {
  return [...movie.releases].sort((left, right) => {
    const leftScore = left.country === selectedCountry ? 0 : 1;
    const rightScore = right.country === selectedCountry ? 0 : 1;

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return left.startDate.localeCompare(right.startDate);
  });
}

function getDisplayMovieName(movie: Awaited<ReturnType<typeof getMovieRecords>>[number]): string {
  return movie.originalTitle ?? movie.title;
}

function formatMetaReleaseLabel(
  release: Awaited<ReturnType<typeof getMovieRecords>>[number]['releases'][number]
): string {
  const now = startOfUtcDay(new Date());
  const start = parseDate(release.startDate);
  const end = parseDate(release.endDate ?? release.startDate);
  const formatLabel = release.catalogIds.includes('imax-returning') ? ' IMAX' : '';
  const windowLabel =
    release.endDate && release.endDate !== release.startDate
      ? `${formatDateValue(release.startDate)} - ${formatDateValue(release.endDate)}`
      : formatDateValue(release.startDate);
  let statusLabel = 'ended';

  if (now >= start && now <= end) {
    statusLabel = 'in theaters';
  } else if (start > now) {
    statusLabel = 'coming soon';
  } else if (now <= addDays(end, RECENT_RETENTION_DAYS)) {
    statusLabel = 'recently ended';
  }

  return `${release.country}${formatLabel}: ${statusLabel} (${windowLabel})`;
}

function buildMetaReleaseSummary(
  movie: Awaited<ReturnType<typeof getMovieRecords>>[number],
  selectedCountry: string
): string {
  const prioritized = prioritizeReleases(movie, selectedCountry);

  const topReleases = prioritized.slice(0, 3).map(formatMetaReleaseLabel);

  return topReleases.join(' | ');
}

function buildMetaReleaseLinks(
  movie: Awaited<ReturnType<typeof getMovieRecords>>[number],
  selectedCountry: string
): Array<{ name: string; category: string; url: string }> {
  return prioritizeReleases(movie, selectedCountry)
    .filter((release) => Boolean(release.sourceUrl))
    .slice(0, 3)
    .map((release) => ({
      name: `Rerelease: ${formatMetaReleaseLabel(release)} / ${release.source}`,
      category: 'rerelease',
      url: release.sourceUrl ?? `${BASE_URL}/manifest.json`,
    }));
}

function buildMetaDescription(
  movie: Awaited<ReturnType<typeof getMovieRecords>>[number] | undefined,
  baseDescription: string | undefined,
  releaseSummary: string | null
): string {
  return [
    releaseSummary ? `Rerelease status:\n${releaseSummary.replace(/ \| /g, '\n')}` : '',
    movie ? `Original release year: ${movie.year}` : '',
    baseDescription ?? '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

const builder = new addonBuilder({
  id: ADDON_ID,
  version: ADDON_VERSION,
  name: ADDON_NAME,
  description: ADDON_DESCRIPTION,
  logo: `${BASE_URL}/logo.svg`,
  resources: ['catalog', 'meta'],
  types: ['movie'],
  idPrefixes: ['tt'],
  catalogs: [
    {
      type: 'movie',
      id: 'rerelease',
      name: CATALOG_NAMES.rerelease,
    },
    {
      type: 'movie',
      id: 'imax-returning',
      name: CATALOG_NAMES['imax-returning'],
    },
  ],
  behaviorHints: {
    configurable: true,
  },
  config: [
    {
      key: 'country',
      type: 'select',
      default: 'TR',
      title: 'Country code for local availability',
      options: COUNTRY_OPTIONS,
      required: true,
    },
  ],
});

builder.defineCatalogHandler(async (args: CatalogHandlerArgs) => {
  if (args.type !== 'movie' || !CATALOG_IDS.includes(args.id as CatalogId)) {
    return { metas: [] };
  }

  const country = normalizeCountry(args.config?.country);
  const items = await getCatalogItems(args.id as CatalogId, country);

  return {
    metas: items.map((item) => ({
      id: item.movie.imdbId,
      type: 'movie',
      name: getDisplayMovieName(item.movie),
      poster: getPosterFallbackUrl(item.movie.imdbId),
      posterShape: 'poster',
      releaseInfo: buildReleaseInfo(item),
      description: buildAvailabilityDescription(item, country),
      links: [
        {
          name: buildAvailabilityLabel(item),
          category: 'availability',
          url: item.availability.release.sourceUrl ?? `${BASE_URL}/manifest.json`,
        },
      ],
    })),
    cacheMaxAge: CATALOG_CACHE_SECONDS,
    staleRevalidate: STALE_REVALIDATE_SECONDS,
    staleError: STALE_ERROR_SECONDS,
  };
});

builder.defineMetaHandler(async (args: MetaHandlerArgs) => {
  if (args.type !== 'movie') {
    return { meta: null };
  }

  const country = normalizeCountry(args.config?.country);
  const [cinemeta, movies] = await Promise.all([getCinemetaMeta(args.type, args.id), getMovieRecords()]);
  const localMovie = movies.find((movie) => movie.imdbId === args.id);
  const releaseSummary = localMovie ? buildMetaReleaseSummary(localMovie, country) : null;
  const releaseLinks = localMovie ? buildMetaReleaseLinks(localMovie, country) : [];

  if (cinemeta) {
    return {
      meta: {
        ...cinemeta,
        id: args.id,
        type: 'movie',
        name: cinemeta.name || (localMovie ? getDisplayMovieName(localMovie) : args.id),
        description: buildMetaDescription(localMovie, cinemeta.description, releaseSummary),
        links: [...releaseLinks, ...(cinemeta.links ?? [])],
      },
    };
  }

  if (!localMovie) {
    return { meta: null };
  }

  return {
    meta: {
      id: localMovie.imdbId,
      type: 'movie',
      name: getDisplayMovieName(localMovie),
      poster: getPosterFallbackUrl(localMovie.imdbId),
      posterShape: 'poster',
      releaseInfo: String(localMovie.year),
      description: buildMetaDescription(localMovie, 'Back on Screen catalog entry.', releaseSummary),
      links: releaseLinks,
    },
  };
});

export const addonInterface = builder.getInterface();
