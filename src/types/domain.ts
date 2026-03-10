export const CATALOG_IDS = ['rerelease', 'imax-returning'] as const;

export type CatalogId = (typeof CATALOG_IDS)[number];

export interface ReleaseEvent {
  catalogIds: CatalogId[];
  country: string;
  startDate: string;
  endDate?: string;
  source: string;
  sourceKind?: 'live' | 'mock';
  sourceUrl?: string;
  note?: string;
}

export interface MovieRecord {
  imdbId: string;
  title: string;
  originalTitle?: string;
  year: number;
  releases: ReleaseEvent[];
}

export type AvailabilityKind =
  | 'country-now'
  | 'global-now'
  | 'country-soon'
  | 'global-soon'
  | 'country-recent'
  | 'global-recent'
  | 'country-ended'
  | 'global-ended';

export interface DerivedAvailability {
  kind: AvailabilityKind;
  label: string;
  statusText: 'NOW' | 'SOON' | 'RECENT' | 'ENDED';
  sortTier: number;
  sortDate: string;
  release: ReleaseEvent;
}

export interface CatalogItem {
  movie: MovieRecord;
  availability: DerivedAvailability;
}
