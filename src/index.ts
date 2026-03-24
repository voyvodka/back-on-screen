import 'dotenv/config';

import express from 'express';

import { getRouter } from 'stremio-addon-sdk';

import { addonInterface } from './addon';
import { LOGO_SVG } from './assets/logo';
import { BASE_URL, CATALOG_NAMES, HOST, PORT } from './config/constants';
import {
  DEFAULT_CONFIGURE_COUNTRY,
  detectCountryFromAcceptLanguage,
  normalizeCountry,
  SupportedCountry,
} from './config/countries';
import { buildConfigurePage } from './configure/page';
import { getCatalogItems } from './lib/catalog';
import { getPosterFallbackUrl } from './lib/posterBadge';
import { getCatalogStatus, getMovieRecords } from './providers/catalogData';
import { CatalogId, CATALOG_IDS } from './types/domain';

const app = express();

interface PreviewItem {
  imdbId: string;
  title: string;
  year: number;
  poster: string;
  status: 'NOW' | 'SOON' | 'RECENT' | 'ENDED';
  catalogId: CatalogId;
  startDate: string;
  endDate?: string;
  source: string;
}

interface PreviewResponse {
  country: string;
  catalogs: {
    id: CatalogId;
    name: string;
    items: PreviewItem[];
  }[];
  stats: {
    total: number;
    now: number;
    soon: number;
    recent: number;
  };
}

async function buildPreview(country: SupportedCountry): Promise<PreviewResponse> {
  const catalogs: PreviewResponse['catalogs'] = [];
  let totalNow = 0;
  let totalSoon = 0;
  let totalRecent = 0;
  const seenIds = new Set<string>();

  for (const catalogId of CATALOG_IDS) {
    const items = await getCatalogItems(catalogId, country, new Date(), { includePast: true });
    const mapped: PreviewItem[] = [];

    for (const item of items) {
      mapped.push({
        imdbId: item.movie.imdbId,
        title: item.movie.originalTitle ?? item.movie.title,
        year: item.movie.year,
        poster: getPosterFallbackUrl(item.movie.imdbId),
        status: item.availability.statusText,
        catalogId,
        startDate: item.availability.release.startDate,
        endDate: item.availability.release.endDate,
        source: item.availability.release.source,
      });

      if (!seenIds.has(item.movie.imdbId)) {
        seenIds.add(item.movie.imdbId);
        if (item.availability.statusText === 'NOW') totalNow++;
        else if (item.availability.statusText === 'SOON') totalSoon++;
        else totalRecent++;
      }
    }

    catalogs.push({
      id: catalogId,
      name: CATALOG_NAMES[catalogId],
      items: mapped,
    });
  }

  return {
    country,
    catalogs,
    stats: {
      total: seenIds.size,
      now: totalNow,
      soon: totalSoon,
      recent: totalRecent,
    },
  };
}

app.get('/logo.svg', (_request, response) => {
  response.setHeader('Content-Type', 'image/svg+xml');
  response.setHeader('Cache-Control', 'public, max-age=86400');
  response.send(LOGO_SVG);
});

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    baseUrl: BASE_URL,
    catalog: getCatalogStatus(),
  });
});

app.get('/api/catalog-preview', async (request, response) => {
  try {
    const country = normalizeCountry(request.query.country);
    const preview = await buildPreview(country);
    response.json(preview);
  } catch {
    response.status(500).json({ error: 'Preview unavailable' });
  }
});

app.get('/configure', (request, response) => {
  const hasCountryQuery = typeof request.query.country === 'string';
  const fallbackCountry = hasCountryQuery
    ? DEFAULT_CONFIGURE_COUNTRY
    : detectCountryFromAcceptLanguage(request.headers['accept-language'], DEFAULT_CONFIGURE_COUNTRY);
  const country = normalizeCountry(request.query.country, fallbackCountry);
  response.type('html').send(buildConfigurePage(country, !hasCountryQuery));
});

// Redirect bare root to the configure page for browser visitors.
// Must be registered before the SDK router so it takes priority.
app.get('/', (_request, response) => {
  response.redirect('/configure');
});

app.use('/', getRouter(addonInterface));

app.listen(PORT, HOST, () => {
  console.log(`${BASE_URL}/manifest.json`);
  console.log(`${BASE_URL}/configure`);

  void getMovieRecords().catch(() => undefined);
});
