import { MovieRecord } from '../types/domain';

export const mockMovies: MovieRecord[] = [
  {
    imdbId: 'tt0081505',
    title: 'The Shining',
    year: 1980,
    releases: [
      {
        catalogIds: ['rerelease'],
        country: 'TR',
        startDate: '2026-12-12',
        endDate: '2026-12-18',
        source: 'Paribu Cineverse (mock)',
      },
      {
        catalogIds: ['rerelease'],
        country: 'US',
        startDate: '2026-10-31',
        endDate: '2026-11-06',
        source: 'US repertory calendar (mock)',
      },
    ],
  },
  {
    imdbId: 'tt0816692',
    title: 'Interstellar',
    year: 2014,
    releases: [
      {
        catalogIds: ['rerelease', 'imax-returning'],
        country: 'US',
        startDate: '2026-03-07',
        endDate: '2026-03-13',
        source: 'IMAX US (mock)',
      },
      {
        catalogIds: ['rerelease', 'imax-returning'],
        country: 'TR',
        startDate: '2026-03-14',
        endDate: '2026-03-20',
        source: 'TR IMAX release plan (mock)',
      },
    ],
  },
  {
    imdbId: 'tt0062622',
    title: '2001: A Space Odyssey',
    year: 1968,
    releases: [
      {
        catalogIds: ['rerelease', 'imax-returning'],
        country: 'GB',
        startDate: '2026-04-04',
        endDate: '2026-04-10',
        source: 'BFI IMAX (mock)',
      },
      {
        catalogIds: ['rerelease', 'imax-returning'],
        country: 'US',
        startDate: '2026-03-28',
        endDate: '2026-04-03',
        source: 'IMAX US (mock)',
      },
    ],
  },
  {
    imdbId: 'tt0083658',
    title: 'Blade Runner',
    year: 1982,
    releases: [
      {
        catalogIds: ['rerelease'],
        country: 'FR',
        startDate: '2026-03-06',
        endDate: '2026-03-12',
        source: 'France rerelease calendar (mock)',
      },
      {
        catalogIds: ['rerelease'],
        country: 'TR',
        startDate: '2026-03-08',
        endDate: '2026-03-14',
        source: 'TR repertory slot (mock)',
      },
    ],
  },
  {
    imdbId: 'tt0113277',
    title: 'Heat',
    year: 1995,
    releases: [
      {
        catalogIds: ['rerelease'],
        country: 'US',
        startDate: '2026-03-01',
        endDate: '2026-03-07',
        source: 'US repertory calendar (mock)',
      },
      {
        catalogIds: ['rerelease'],
        country: 'DE',
        startDate: '2026-11-07',
        endDate: '2026-11-13',
        source: 'Germany special screenings (mock)',
      },
    ],
  },
  {
    imdbId: 'tt0364569',
    title: 'Oldboy',
    year: 2003,
    releases: [
      {
        catalogIds: ['rerelease'],
        country: 'KR',
        startDate: '2026-03-21',
        endDate: '2026-03-27',
        source: 'Korea anniversary screenings (mock)',
      },
      {
        catalogIds: ['rerelease'],
        country: 'TR',
        startDate: '2026-04-03',
        endDate: '2026-04-09',
        source: 'TR special screenings (mock)',
      },
    ],
  },
  {
    imdbId: 'tt0073195',
    title: 'Jaws',
    year: 1975,
    releases: [
      {
        catalogIds: ['rerelease', 'imax-returning'],
        country: 'US',
        startDate: '2026-03-02',
        endDate: '2026-03-06',
        source: 'IMAX US (mock)',
      },
      {
        catalogIds: ['rerelease'],
        country: 'GB',
        startDate: '2026-05-01',
        endDate: '2026-05-07',
        source: 'UK classic screenings (mock)',
      },
    ],
  },
  {
    imdbId: 'tt0090605',
    title: 'Aliens',
    year: 1986,
    releases: [
      {
        catalogIds: ['rerelease', 'imax-returning'],
        country: 'US',
        startDate: '2026-05-15',
        endDate: '2026-05-21',
        source: 'IMAX US (mock)',
      },
      {
        catalogIds: ['rerelease'],
        country: 'TR',
        startDate: '2026-06-05',
        endDate: '2026-06-11',
        source: 'TR classic action week (mock)',
      },
    ],
  },
];
