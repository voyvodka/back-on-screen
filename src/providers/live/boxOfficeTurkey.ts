import { load } from 'cheerio';

import { RERELEASE_MIN_YEARS } from '../../config/constants';
import { MovieRecord, ReleaseEvent } from '../../types/domain';
import { addDays, parseDate, startOfUtcDay, toDateValue } from '../../utils/date';
import { fetchText } from '../../utils/http';
import { mapWithConcurrency, normalizeTitle, uniqueBy } from '../../utils/text';

const BOX_OFFICE_BASE_URL = 'https://boxofficeturkiye.com';
const SHOWTIMES_URL = `${BOX_OFFICE_BASE_URL}/seanslar`;
const MONTH_SLUGS = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
const MONTH_LOOKUP: Record<string, number> = {
  ocak: 0,
  subat: 1,
  mart: 2,
  nisan: 3,
  mayis: 4,
  haziran: 5,
  temmuz: 6,
  agustos: 7,
  eylul: 8,
  ekim: 9,
  kasim: 10,
  aralik: 11,
};
const CALENDAR_FETCH_CONCURRENCY = 4;
const DETAIL_FETCH_CONCURRENCY = 10;
const CALENDAR_MONTH_LOOKBACK = 6;
const CALENDAR_MONTH_LOOKAHEAD = 9;

interface CalendarEntry {
  releaseDate: string;
  detailPath: string;
}

interface BoxOfficeMovieSchema {
  name?: string;
  genre?: string | string[];
}

interface DetailPayload {
  imdbId: string;
  title: string;
  originalTitle?: string;
  year: number;
  genres: string[];
  locationCount: number;
  sourceUrl: string;
}

function buildMonthUrls(now: Date): string[] {
  const urls: string[] = [];
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (let offset = -CALENDAR_MONTH_LOOKBACK; offset <= CALENDAR_MONTH_LOOKAHEAD; offset += 1) {
    const current = new Date(monthStart);
    current.setUTCMonth(current.getUTCMonth() + offset);
    const year = current.getUTCFullYear();
    const monthSlug = MONTH_SLUGS[current.getUTCMonth()];
    urls.push(`${BOX_OFFICE_BASE_URL}/takvim/${year}/${monthSlug}`);
  }

  return uniqueBy(urls, (url) => url);
}

function parseCalendarDate(rawText: string): string | null {
  const normalizedText = rawText.replace(/\s+/g, ' ').trim();

  const match = normalizedText
    .toLocaleLowerCase('tr-TR')
    .match(/(\d{1,2})\s+([a-zçğıöşü]+).*?(\d{4})\s+yılı/i);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const monthKey = match[2]
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u');
  const monthIndex = MONTH_LOOKUP[monthKey];
  const year = Number(match[3]);

  if (!Number.isInteger(day) || monthIndex === undefined || !Number.isInteger(year)) {
    return null;
  }

  return toDateValue(new Date(Date.UTC(year, monthIndex, day)));
}

async function fetchCalendarEntries(url: string): Promise<CalendarEntry[]> {
  const html = await fetchText(url);
  const $ = load(html);
  const entries: CalendarEntry[] = [];

  $('.calendar-date-wrapper').each((_, section) => {
    const headerText = $(section).find('h3.c-section__title').first().text();
    const releaseDate = parseCalendarDate(headerText);
    if (!releaseDate) {
      return;
    }

    $(section)
      .find('.calendar-item__movie')
      .each((__, movieElement) => {
        const detailPath = $(movieElement).find('.media-bg--fullsize-link').first().attr('href');
        if (!detailPath) {
          return;
        }

        entries.push({
          releaseDate,
          detailPath,
        });
      });
  });

  return entries;
}

async function safeFetchCalendarEntries(url: string): Promise<CalendarEntry[]> {
  try {
    return await fetchCalendarEntries(url);
  } catch {
    return [];
  }
}

async function fetchActiveShowtimePaths(): Promise<Set<string>> {
  const html = await fetchText(SHOWTIMES_URL);
  const $ = load(html);
  const detailPaths = $('.c-sessions__grid a[href^="/film/"]')
    .map((_, element) => $(element).attr('href') ?? '')
    .get()
    .filter(Boolean);

  return new Set(uniqueBy(detailPaths, (detailPath) => detailPath));
}

async function safeFetchActiveShowtimePaths(): Promise<Set<string>> {
  try {
    return await fetchActiveShowtimePaths();
  } catch {
    return new Set<string>();
  }
}

function parseMovieSchema($: ReturnType<typeof load>): BoxOfficeMovieSchema | null {
  const scripts = $('script[type="application/ld+json"]')
    .map((_, element) => $(element).html() ?? '')
    .get();

  for (const scriptText of scripts) {
    try {
      const parsed = JSON.parse(scriptText) as { '@type'?: string } | Array<{ '@type'?: string }>;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      const movie = candidates.find((candidate) => candidate?.['@type'] === 'Movie') as BoxOfficeMovieSchema | undefined;

      if (movie) {
        return movie;
      }
    } catch {
      // Ignore invalid structured data blocks.
    }
  }

  return null;
}

async function fetchMovieDetail(detailPath: string): Promise<DetailPayload | null> {
  const sourceUrl = `${BOX_OFFICE_BASE_URL}${detailPath}`;
  const html = await fetchText(sourceUrl);
  const $ = load(html);
  const schema = parseMovieSchema($);
  const imdbMatch = html.match(/imdb\.com\/title\/(tt\d+)/i);
  const yearText = $('.title__year').first().text().trim();
  const title = $('.c-page-header__title').first().text().trim();

  if (!schema || !imdbMatch || !title || !yearText) {
    return null;
  }

  const year = Number(yearText);
  if (!Number.isInteger(year)) {
    return null;
  }

  const originalTitle = $('.c-page-header .subheading').first().text().trim() || undefined;
  const rawGenres = Array.isArray(schema.genre) ? schema.genre : schema.genre ? [schema.genre] : [];
  const genres = rawGenres.map((genre) => genre.trim()).filter(Boolean);
  const showtimesLabel = $('.movie-showtimes label').first().text().replace(/\s+/g, ' ').trim();
  const locationMatch = showtimesLabel.match(/(\d+)\s+(?:lokasyonda|sinemada)/i);
  const locationCount = locationMatch ? Number(locationMatch[1]) : 0;

  return {
    imdbId: imdbMatch[1],
    title,
    originalTitle,
    year,
    genres,
    locationCount,
    sourceUrl,
  };
}

async function safeFetchMovieDetail(detailPath: string): Promise<DetailPayload | null> {
  try {
    return await fetchMovieDetail(detailPath);
  } catch {
    return null;
  }
}

const DEFAULT_SHOWTIME_DAYS = 14;

function buildReleaseEvent(
  releaseDate: string,
  endDate: string | null,
  isNowShowing: boolean,
  source: string,
  sourceUrl: string,
  note?: string
): ReleaseEvent {
  const start = parseDate(releaseDate);
  let computedEnd: string;

  if (isNowShowing) {
    computedEnd = toDateValue(addDays(startOfUtcDay(new Date()), 7));
  } else if (endDate) {
    computedEnd = endDate;
  } else {
    computedEnd = toDateValue(addDays(start, DEFAULT_SHOWTIME_DAYS));
  }

  return {
    catalogIds: ['rerelease'],
    country: 'TR',
    startDate: releaseDate,
    endDate: computedEnd,
    source,
    sourceKind: 'live',
    sourceUrl,
    note,
  };
}

export async function getBoxOfficeTurkeyRecords(
  now = new Date(),
  paribuImaxTitles: Set<string> = new Set<string>()
): Promise<MovieRecord[]> {
  const calendarUrls = buildMonthUrls(now);
  const [calendarBatches, activeShowtimePaths] = await Promise.all([
    mapWithConcurrency(calendarUrls, CALENDAR_FETCH_CONCURRENCY, safeFetchCalendarEntries),
    safeFetchActiveShowtimePaths(),
  ]);
  const calendarEntries = uniqueBy(calendarBatches.flat(), (entry) => `${entry.detailPath}:${entry.releaseDate}`);
  const detailPaths = uniqueBy(calendarEntries.map((entry) => entry.detailPath), (detailPath) => detailPath);
  const detailPayloads = await mapWithConcurrency(detailPaths, DETAIL_FETCH_CONCURRENCY, safeFetchMovieDetail);
  const detailMap = new Map<string, DetailPayload>();

  detailPayloads.forEach((payload, index) => {
    const detailPath = detailPaths[index];
    if (payload) {
      detailMap.set(detailPath, payload);
    }
  });

  const nowDate = startOfUtcDay(now);
  const movies = new Map<string, MovieRecord>();

  // Sort calendar entries chronologically to derive endDate from next entry's date.
  const sortedEntries = [...calendarEntries].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

  // Collect unique sorted release dates to compute endDate per film.
  const allDates = uniqueBy(
    sortedEntries.map((e) => e.releaseDate).sort(),
    (d) => d
  );

  function findNextDate(releaseDate: string): string | null {
    for (const d of allDates) {
      if (d > releaseDate) return d;
    }
    return null;
  }

  for (const entry of sortedEntries) {
    const detail = detailMap.get(entry.detailPath);
    if (!detail) {
      continue;
    }

    const isClassic = detail.year <= nowDate.getUTCFullYear() - RERELEASE_MIN_YEARS;
    if (!isClassic) {
      continue;
    }

    const hasImax = detail.genres.some((genre) => genre.toUpperCase() === 'IMAX');
    const normalizedTitle = normalizeTitle(detail.originalTitle ?? detail.title);
    const paribuVerified = hasImax && paribuImaxTitles.has(normalizedTitle);
    const showtimesVerified = activeShowtimePaths.has(entry.detailPath);
    const effectiveReleaseDate =
      showtimesVerified && parseDate(entry.releaseDate) > nowDate ? toDateValue(nowDate) : entry.releaseDate;
    const isNowShowing = showtimesVerified || (detail.locationCount > 0 && parseDate(effectiveReleaseDate) <= nowDate);

    // Derive endDate from next calendar entry's start date.
    const inferredEndDate = isNowShowing ? null : findNextDate(entry.releaseDate);

    const note = [
      paribuVerified ? 'Also listed on the Paribu IMAX page.' : undefined,
      showtimesVerified ? 'Actively listed on the Box Office Turkiye showtimes page.' : undefined,
    ]
      .filter(Boolean)
      .join(' ');
    const releaseEvent = buildReleaseEvent(
      effectiveReleaseDate,
      inferredEndDate,
      isNowShowing,
      paribuVerified ? 'Box Office Turkiye + Paribu Cineverse IMAX' : 'Box Office Turkiye',
      detail.sourceUrl,
      note || undefined
    );

    if (hasImax) {
      releaseEvent.catalogIds = ['rerelease', 'imax-returning'];
    }

    const existing = movies.get(detail.imdbId);
    if (existing) {
      existing.releases.push(releaseEvent);
      continue;
    }

    movies.set(detail.imdbId, {
      imdbId: detail.imdbId,
      title: detail.title,
      originalTitle: detail.originalTitle,
      year: detail.year,
      releases: [releaseEvent],
    });
  }

  return Array.from(movies.values()).map((movie) => ({
    ...movie,
    releases: uniqueBy(
      movie.releases,
      (release) => `${release.country}:${release.startDate}:${release.catalogIds.slice().sort().join(',')}`
    ),
  }));
}
