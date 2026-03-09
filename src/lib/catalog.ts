import { RECENT_RETENTION_DAYS } from '../config/constants';
import { getMovieRecords } from '../providers/catalogData';
import { CatalogId, CatalogItem, DerivedAvailability, MovieRecord, ReleaseEvent } from '../types/domain';
import { addDays, formatDateValue, parseDate, startOfUtcDay } from '../utils/date';

const statusDescriptionMap: Record<DerivedAvailability['statusText'], string> = {
  NOW: 'in theaters',
  SOON: 'coming soon',
  RECENT: 'recently ended',
};

function getEndDate(release: ReleaseEvent): Date {
  return parseDate(release.endDate ?? release.startDate);
}

function isNowShowing(release: ReleaseEvent, now: Date): boolean {
  const start = parseDate(release.startDate);
  const end = getEndDate(release);
  return now >= start && now <= end;
}

function isUpcoming(release: ReleaseEvent, now: Date): boolean {
  return parseDate(release.startDate) > now;
}

function isRecentlyEnded(release: ReleaseEvent, now: Date): boolean {
  const end = getEndDate(release);
  return now > end && now <= addDays(end, RECENT_RETENTION_DAYS);
}

function pickEarliest(releases: ReleaseEvent[], field: 'startDate' | 'endDate'): ReleaseEvent {
  return [...releases].sort((left, right) => {
    const leftValue = field === 'endDate' ? left.endDate ?? left.startDate : left.startDate;
    const rightValue = field === 'endDate' ? right.endDate ?? right.startDate : right.startDate;
    return leftValue.localeCompare(rightValue);
  })[0];
}

function pickLatest(releases: ReleaseEvent[], field: 'startDate' | 'endDate'): ReleaseEvent {
  return [...releases].sort((left, right) => {
    const leftValue = field === 'endDate' ? left.endDate ?? left.startDate : left.startDate;
    const rightValue = field === 'endDate' ? right.endDate ?? right.startDate : right.startDate;
    return rightValue.localeCompare(leftValue);
  })[0];
}

function deriveAvailability(
  movie: MovieRecord,
  catalogId: CatalogId,
  country: string,
  now: Date
): DerivedAvailability | null {
  const relevant = movie.releases.filter((release) => release.catalogIds.includes(catalogId));

  if (relevant.length === 0) {
    return null;
  }

  const countryLive = relevant.filter((release) => release.country === country && isNowShowing(release, now));
  if (countryLive.length > 0) {
    const release = pickEarliest(countryLive, 'endDate');
    return {
      kind: 'country-now',
      label: country,
      statusText: 'NOW',
      sortTier: 0,
      sortDate: release.endDate ?? release.startDate,
      release,
    };
  }

  const globalLive = relevant.filter((release) => isNowShowing(release, now));
  if (globalLive.length > 0) {
    const release = pickEarliest(globalLive, 'endDate');
    return {
      kind: 'global-now',
      label: 'GLOBAL',
      statusText: 'NOW',
      sortTier: 1,
      sortDate: release.endDate ?? release.startDate,
      release,
    };
  }

  const countryUpcoming = relevant.filter((release) => release.country === country && isUpcoming(release, now));
  if (countryUpcoming.length > 0) {
    const release = pickEarliest(countryUpcoming, 'startDate');
    return {
      kind: 'country-soon',
      label: country,
      statusText: 'SOON',
      sortTier: 2,
      sortDate: release.startDate,
      release,
    };
  }

  const globalUpcoming = relevant.filter((release) => isUpcoming(release, now));
  if (globalUpcoming.length > 0) {
    const release = pickEarliest(globalUpcoming, 'startDate');
    return {
      kind: 'global-soon',
      label: 'GLOBAL',
      statusText: 'SOON',
      sortTier: 3,
      sortDate: release.startDate,
      release,
    };
  }

  const countryRecent = relevant.filter(
    (release) => release.country === country && isRecentlyEnded(release, now)
  );
  if (countryRecent.length > 0) {
    const release = pickLatest(countryRecent, 'endDate');
    return {
      kind: 'country-recent',
      label: country,
      statusText: 'RECENT',
      sortTier: 4,
      sortDate: release.endDate ?? release.startDate,
      release,
    };
  }

  const globalRecent = relevant.filter((release) => isRecentlyEnded(release, now));
  if (globalRecent.length > 0) {
    const release = pickLatest(globalRecent, 'endDate');
    return {
      kind: 'global-recent',
      label: 'GLOBAL',
      statusText: 'RECENT',
      sortTier: 5,
      sortDate: release.endDate ?? release.startDate,
      release,
    };
  }

  return null;
}

function compareCatalogItems(left: CatalogItem, right: CatalogItem): number {
  if (left.availability.sortTier !== right.availability.sortTier) {
    return left.availability.sortTier - right.availability.sortTier;
  }

  const leftIsMock = left.availability.release.sourceKind === 'mock';
  const rightIsMock = right.availability.release.sourceKind === 'mock';
  if (leftIsMock !== rightIsMock) {
    return leftIsMock ? 1 : -1;
  }

  if (left.availability.statusText === 'RECENT' && right.availability.statusText === 'RECENT') {
    return right.availability.sortDate.localeCompare(left.availability.sortDate);
  }

  const dateCompare = left.availability.sortDate.localeCompare(right.availability.sortDate);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return left.movie.title.localeCompare(right.movie.title);
}

function buildSourceLabel(item: CatalogItem): string {
  return item.availability.release.sourceKind === 'mock'
    ? 'Temporary catalog entry'
    : `Official source: ${item.availability.release.source}`;
}

function buildWindowLabel(release: ReleaseEvent): string {
  if (release.endDate && release.endDate !== release.startDate) {
    return `Showtime window: ${formatDateValue(release.startDate)} - ${formatDateValue(release.endDate)}.`;
  }

  return `Scheduled date: ${formatDateValue(release.startDate)}.`;
}

export async function getCatalogItems(
  catalogId: CatalogId,
  country: string,
  now = new Date()
): Promise<CatalogItem[]> {
  const normalizedNow = startOfUtcDay(now);
  const movies = await getMovieRecords(normalizedNow);

  return movies
    .map((movie) => ({
      movie,
      availability: deriveAvailability(movie, catalogId, country, normalizedNow),
    }))
    .filter((item): item is CatalogItem => item.availability !== null)
    .sort(compareCatalogItems);
}

export function buildAvailabilityDescription(item: CatalogItem, selectedCountry: string): string {
  const statusText = statusDescriptionMap[item.availability.statusText];
  const selectedLabel =
    item.availability.label === 'GLOBAL'
      ? `No showings in the selected country; available globally ${statusText}.`
      : `${selectedCountry}: ${statusText}.`;

  return [
    selectedLabel,
    buildWindowLabel(item.availability.release),
    buildSourceLabel(item),
    item.availability.release.note ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildAvailabilityLabel(item: CatalogItem): string {
  const statusText = statusDescriptionMap[item.availability.statusText];
  return `${item.availability.label} - ${statusText}`;
}

export function buildReleaseInfo(item: CatalogItem): string {
  return `${item.movie.year} / ${formatDateValue(item.availability.release.startDate)}`;
}
