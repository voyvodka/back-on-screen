import { DEFAULT_CONFIGURE_COUNTRY, normalizeCountry, SupportedCountry } from '../config/countries';

interface ReverseGeocodeResponse {
  countryCode?: unknown;
}

function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value);
}

export async function detectCountryFromCoordinates(latitude: number, longitude: number): Promise<SupportedCountry> {
  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
    return DEFAULT_CONFIGURE_COUNTRY;
  }

  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('localityLanguage', 'en');

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return DEFAULT_CONFIGURE_COUNTRY;
    }

    const payload = (await response.json()) as ReverseGeocodeResponse;
    return normalizeCountry(payload.countryCode, DEFAULT_CONFIGURE_COUNTRY);
  } catch {
    return DEFAULT_CONFIGURE_COUNTRY;
  }
}
