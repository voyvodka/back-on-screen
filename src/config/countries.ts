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

const COUNTRY_SET = new Set<string>(COUNTRY_OPTIONS);

export function normalizeCountry(value: unknown): SupportedCountry {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : 'TR';

  if (COUNTRY_SET.has(candidate)) {
    return candidate as SupportedCountry;
  }

  return 'TR';
}
