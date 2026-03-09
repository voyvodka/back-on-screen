import { load } from 'cheerio';

import { RERELEASE_MIN_YEARS } from '../../config/constants';
import { getCinemetaMeta } from '../cinemeta';
import { MovieRecord } from '../../types/domain';
import { addDays, parseDate, startOfUtcDay, toDateValue } from '../../utils/date';
import { fetchJson, fetchText } from '../../utils/http';
import { mapWithConcurrency, normalizeTitle, uniqueBy } from '../../utils/text';

const PR_NEWSWIRE_BASE_URL = 'https://www.prnewswire.com';
const SEARCH_URLS = [
  `${PR_NEWSWIRE_BASE_URL}/search/news/?keyword=return%20to%20Regal&pagesize=25`,
];
const SEARCH_FETCH_CONCURRENCY = 1;
const ARTICLE_FETCH_CONCURRENCY = 2;
const TITLE_RESOLVE_CONCURRENCY = 4;
const MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

interface SearchArticle {
  articleId: string;
  sourceUrl: string;
}

interface ArticleTitle {
  title: string;
  releaseDate: string;
  sourceUrl: string;
}

interface CinemetaSearchResponse {
  metas?: CinemetaSearchMeta[];
}

interface CinemetaSearchMeta {
  id: string;
  imdb_id?: string;
  type?: string;
  name?: string;
  releaseInfo?: string;
}

interface ResolvedMovie {
  imdbId: string;
  title: string;
  year: number;
}

function extractArticleId(url: string): string | null {
  return url.match(/-(\d+)\.html$/)?.[1] ?? null;
}

function decodeHtmlText(value: string): string {
  return load(`<div>${value}</div>`)('div').text().replace(/\s+/g, ' ').trim();
}

function parseReleaseDate(monthToken: string, dayToken: string, publishedAt: Date): string | null {
  const monthIndex = MONTH_LOOKUP[monthToken.toLowerCase()];
  const day = Number(dayToken);

  if (monthIndex === undefined || !Number.isInteger(day)) {
    return null;
  }

  let year = publishedAt.getUTCFullYear();
  let candidate = new Date(Date.UTC(year, monthIndex, day));
  const normalizedPublishedAt = startOfUtcDay(publishedAt);
  const ninetyDaysBefore = addDays(normalizedPublishedAt, -90);

  if (candidate < ninetyDaysBefore) {
    year += 1;
    candidate = new Date(Date.UTC(year, monthIndex, day));
  }

  return toDateValue(candidate);
}

function extractDatedTitles(bodyHtml: string, publishedAt: Date): ArticleTitle[] {
  const matches = bodyHtml.matchAll(
    /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})\s*[\u2013\u2014-]\s*<i>([^<]+)<\/i>/gi
  );
  const titles: ArticleTitle[] = [];

  for (const match of matches) {
    const fullMatch = match[0] ?? '';
    const monthTokenMatch = fullMatch.match(/^[A-Za-z]+/);
    const monthToken = monthTokenMatch?.[0];
    const dayToken = match[1];
    const rawTitle = match[2];

    if (!monthToken || !dayToken || !rawTitle) {
      continue;
    }

    const releaseDate = parseReleaseDate(monthToken, dayToken, publishedAt);
    const title = decodeHtmlText(rawTitle);

    if (!releaseDate || !title) {
      continue;
    }

    titles.push({
      title,
      releaseDate,
      sourceUrl: '',
    });
  }

  return titles;
}

async function fetchSearchArticles(url: string): Promise<SearchArticle[]> {
  const html = await fetchText(url);
  const $ = load(html);
  const articles: SearchArticle[] = [];

  $('.row.newsCards[lang="en-US"]').each((_, element) => {
    const href = $(element)
      .find('a.news-release[href*="/news-releases/"][href$=".html"]')
      .first()
      .attr('href');

    if (!href) {
      return;
    }

    const sourceUrl = new URL(href, PR_NEWSWIRE_BASE_URL).toString();
    const articleId = extractArticleId(sourceUrl);

    if (!articleId) {
      return;
    }

    articles.push({
      articleId,
      sourceUrl,
    });
  });

  return uniqueBy(articles, (article) => article.articleId);
}

async function fetchArticleTitles(article: SearchArticle): Promise<ArticleTitle[]> {
  const html = await fetchText(article.sourceUrl);
  const $ = load(html);
  const publishedRaw = $('meta[name="date"]').attr('content') ?? '';
  const bodyHtml = $('section.release-body').html() ?? '';

  if (!publishedRaw || !bodyHtml) {
    return [];
  }

  const publishedAt = new Date(publishedRaw);
  if (Number.isNaN(publishedAt.getTime())) {
    return [];
  }

  return extractDatedTitles(bodyHtml, publishedAt).map((entry) => ({
    ...entry,
    sourceUrl: article.sourceUrl,
  }));
}

function parseCandidateYear(releaseInfo?: string): number | null {
  if (!releaseInfo) {
    return null;
  }

  const year = Number(releaseInfo.match(/\d{4}/)?.[0]);
  return Number.isInteger(year) ? year : null;
}

function isExactTitleMatch(name: string | undefined, queryTitle: string): boolean {
  if (!name) {
    return false;
  }

  return normalizeTitle(name) === normalizeTitle(queryTitle);
}

function getReleaseYearFromMeta(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getUTCFullYear();
}

async function verifyResolvedMovie(
  candidate: ResolvedMovie,
  queryTitle: string,
  releaseDate: string
): Promise<ResolvedMovie | null> {
  const releaseYear = parseDate(releaseDate).getUTCFullYear();
  const cinemeta = await getCinemetaMeta('movie', candidate.imdbId);

  if (cinemeta && !isExactTitleMatch(cinemeta.name, queryTitle)) {
    return null;
  }

  const originalYear =
    getReleaseYearFromMeta(cinemeta?.released) ?? parseCandidateYear(cinemeta?.releaseInfo) ?? candidate.year;

  if (originalYear > releaseYear - RERELEASE_MIN_YEARS) {
    return null;
  }

  return {
    ...candidate,
    title: cinemeta?.name || candidate.title,
    year: originalYear,
  };
}

function resolveCandidate(meta: CinemetaSearchMeta, queryTitle: string, releaseDate: string): ResolvedMovie | null {
  const imdbId = meta.imdb_id ?? (meta.id.startsWith('tt') ? meta.id : undefined);
  const name = meta.name?.trim();

  if (!imdbId || !name || meta.type !== 'movie') {
    return null;
  }

  const releaseYear = parseDate(releaseDate).getUTCFullYear();
  const candidateYear = parseCandidateYear(meta.releaseInfo) ?? releaseYear;
  const isFutureRelease = candidateYear > releaseYear;
  const isEligibleRerelease = candidateYear <= releaseYear - RERELEASE_MIN_YEARS;

  if (!isExactTitleMatch(name, queryTitle)) {
    return null;
  }

  if (isFutureRelease || !isEligibleRerelease) {
    return null;
  }

  return {
    imdbId,
    title: name,
    year: candidateYear,
  };
}

async function resolveMovie(title: string, releaseDate: string): Promise<ResolvedMovie | null> {
  const response = await fetchJson<CinemetaSearchResponse>(
    `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(title)}.json`
  );
  const releaseYear = parseDate(releaseDate).getUTCFullYear();
  const exactTitleMatches = (response.metas ?? []).filter(
    (meta) => meta.type === 'movie' && isExactTitleMatch(meta.name, title)
  );
  const hasRecentExactTitle = exactTitleMatches.some((meta) => {
    const candidateYear = parseCandidateYear(meta.releaseInfo);

    return candidateYear !== null && candidateYear > releaseYear - RERELEASE_MIN_YEARS;
  });

  if (hasRecentExactTitle) {
    return null;
  }

  const candidates = exactTitleMatches
    .map((meta) => resolveCandidate(meta, title, releaseDate))
    .filter((candidate): candidate is ResolvedMovie => candidate !== null);

  if (candidates.length === 0) {
    return null;
  }

  const prioritized = candidates.sort((left, right) => {
    const leftExact = normalizeTitle(left.title) === normalizeTitle(title);
    const rightExact = normalizeTitle(right.title) === normalizeTitle(title);

    if (leftExact !== rightExact) {
      return leftExact ? -1 : 1;
    }

    return Math.abs(left.year - parseDate(releaseDate).getUTCFullYear()) - Math.abs(right.year - parseDate(releaseDate).getUTCFullYear());
  });

  for (const candidate of prioritized) {
    const verified = await verifyResolvedMovie(candidate, title, releaseDate);

    if (verified) {
      return verified;
    }
  }

  return null;
}

export async function getPrNewswireRegalRecords(): Promise<MovieRecord[]> {
  const searchBatches = await mapWithConcurrency(SEARCH_URLS, SEARCH_FETCH_CONCURRENCY, async (url) => {
    try {
      return await fetchSearchArticles(url);
    } catch {
      return [];
    }
  });
  const articles = uniqueBy(searchBatches.flat(), (article) => article.articleId);
  const titleBatches = await mapWithConcurrency(articles, ARTICLE_FETCH_CONCURRENCY, async (article) => {
    try {
      return await fetchArticleTitles(article);
    } catch {
      return [];
    }
  });
  const articleTitles = uniqueBy(
    titleBatches.flat(),
    (entry) => `${normalizeTitle(entry.title)}:${entry.releaseDate}:${entry.sourceUrl}`
  );

  const resolved = await mapWithConcurrency(articleTitles, TITLE_RESOLVE_CONCURRENCY, async (entry) => {
    try {
      const movie = await resolveMovie(entry.title, entry.releaseDate);

      if (!movie) {
        return null;
      }

      return {
        ...movie,
        releaseDate: entry.releaseDate,
        sourceUrl: entry.sourceUrl,
      };
    } catch {
      return null;
    }
  });

  return resolved
    .filter(
      (
        entry
      ): entry is ResolvedMovie & {
        releaseDate: string;
        sourceUrl: string;
      } => entry !== null
    )
    .map((entry) => ({
      imdbId: entry.imdbId,
      title: entry.title,
      year: entry.year,
      releases: [
        {
          catalogIds: ['rerelease'],
          country: 'US',
          startDate: entry.releaseDate,
          endDate: entry.releaseDate,
          source: 'PR Newswire / Regal',
          sourceKind: 'live' as const,
          sourceUrl: entry.sourceUrl,
          note: 'Official rerelease announced by Regal.',
        },
      ],
    }));
}
