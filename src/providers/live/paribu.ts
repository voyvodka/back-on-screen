import { load } from 'cheerio';

import { fetchText } from '../../utils/http';
import { normalizeTitle } from '../../utils/text';

const PARIBU_IMAX_URL = 'https://www.paribucineverse.com/ayricalikli-salonlar/imax';

export async function getParibuImaxTitles(): Promise<Set<string>> {
  const html = await fetchText(PARIBU_IMAX_URL);
  const $ = load(html);
  const normalized = new Set<string>();

  $('.hall-movie-item[data-techs*="imax"]').each((_, element) => {
    const rawTitle = $(element).attr('data-movie-title')?.trim();
    if (!rawTitle) {
      return;
    }

    normalized.add(normalizeTitle(rawTitle));
  });

  if (normalized.size > 0) {
    return normalized;
  }

  const matches = html.matchAll(/selected_tech=imax[\s\S]{0,2000}?<h3[^>]*>\s*([^<]+?)\s*<\/h3>/gi);
  for (const match of matches) {
    const rawTitle = match[1]?.trim();
    if (rawTitle) {
      normalized.add(normalizeTitle(rawTitle));
    }
  }

  return normalized;
}
