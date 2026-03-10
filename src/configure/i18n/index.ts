import { SupportedCountry } from '../../config/countries';

import { CONFIGURE_LOCALES } from './locales';
import { ConfigureLanguage, ConfigureLocale } from './types';

const COUNTRY_LANGUAGE_MAP: Record<SupportedCountry, ConfigureLanguage> = {
  TR: 'tr',
  US: 'en',
  GB: 'en',
  DE: 'de',
  FR: 'fr',
  IT: 'it',
  ES: 'es',
  NL: 'nl',
  CA: 'en',
  AU: 'en',
  JP: 'ja',
};

export function getLanguageForCountry(country: SupportedCountry): ConfigureLanguage {
  return COUNTRY_LANGUAGE_MAP[country] ?? 'en';
}

export function getLocale(language: ConfigureLanguage): ConfigureLocale {
  return CONFIGURE_LOCALES[language] ?? CONFIGURE_LOCALES.en;
}

export { CONFIGURE_LOCALES, COUNTRY_LANGUAGE_MAP };
export type { ConfigureLanguage, ConfigureLocale };
