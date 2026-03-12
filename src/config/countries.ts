export const COUNTRY_OPTIONS = [
  'TR',
  'US',
  'GB',
  'DE',
  'FR',
  'IT',
  'ES',
  'NL',
  'CA',
  'AU',
  'JP',
] as const;

export type SupportedCountry = (typeof COUNTRY_OPTIONS)[number];

export const DEFAULT_COUNTRY: SupportedCountry = 'TR';
export const DEFAULT_CONFIGURE_COUNTRY: SupportedCountry = 'US';

export const COUNTRY_NAMES: Record<SupportedCountry, string> = {
  TR: 'Turkey',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
};

export const COUNTRY_FLAGS: Record<SupportedCountry, string> = {
  TR: '\u{1F1F9}\u{1F1F7}',
  US: '\u{1F1FA}\u{1F1F8}',
  GB: '\u{1F1EC}\u{1F1E7}',
  DE: '\u{1F1E9}\u{1F1EA}',
  FR: '\u{1F1EB}\u{1F1F7}',
  IT: '\u{1F1EE}\u{1F1F9}',
  ES: '\u{1F1EA}\u{1F1F8}',
  NL: '\u{1F1F3}\u{1F1F1}',
  CA: '\u{1F1E8}\u{1F1E6}',
  AU: '\u{1F1E6}\u{1F1FA}',
  JP: '\u{1F1EF}\u{1F1F5}',
};

export const LANGUAGE_COUNTRY_DEFAULTS: Record<string, SupportedCountry> = {
  tr: 'TR',
  de: 'DE',
  fr: 'FR',
  it: 'IT',
  es: 'ES',
  nl: 'NL',
  ja: 'JP',
};

const COUNTRY_SET = new Set<string>(COUNTRY_OPTIONS);

export function normalizeCountry(value: unknown, fallback: SupportedCountry = DEFAULT_COUNTRY): SupportedCountry {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : fallback;

  if (COUNTRY_SET.has(candidate)) {
    return candidate as SupportedCountry;
  }

  return fallback;
}

export function getCountryFlagUrl(country: SupportedCountry): string {
  return `https://flagcdn.com/${country.toLowerCase()}.svg`;
}

export function getCountryFromLocale(value: unknown): SupportedCountry | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/_/g, '-');

  if (!normalized) {
    return null;
  }

  const parts = normalized.split('-').filter(Boolean);

  for (let index = parts.length - 1; index >= 1; index -= 1) {
    const region = parts[index]?.toUpperCase();

    if (region && /^[A-Z]{2}$/.test(region) && COUNTRY_SET.has(region)) {
      return region as SupportedCountry;
    }
  }

  const language = parts[0]?.toLowerCase();

  if (language && Object.prototype.hasOwnProperty.call(LANGUAGE_COUNTRY_DEFAULTS, language)) {
    return LANGUAGE_COUNTRY_DEFAULTS[language];
  }

  return null;
}

export function detectCountryFromAcceptLanguage(
  value: unknown,
  fallback: SupportedCountry = DEFAULT_CONFIGURE_COUNTRY
): SupportedCountry {
  if (typeof value !== 'string') {
    return fallback;
  }

  const locales = value
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter((part): part is string => Boolean(part));

  for (const locale of locales) {
    const country = getCountryFromLocale(locale);

    if (country) {
      return country;
    }
  }

  return fallback;
}
