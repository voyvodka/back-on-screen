import 'dotenv/config';

import express from 'express';

import { getRouter } from 'stremio-addon-sdk';

import { addonInterface } from './addon';
import {
  ADDON_DESCRIPTION,
  ADDON_NAME,
  BASE_URL,
  CATALOG_NAMES,
  HOST,
  PORT,
} from './config/constants';
import {
  COUNTRY_FLAGS,
  COUNTRY_NAMES,
  COUNTRY_OPTIONS,
  normalizeCountry,
  SupportedCountry,
} from './config/countries';
import { getCatalogItems } from './lib/catalog';
import { getPosterFallbackUrl } from './lib/posterBadge';
import { getCatalogStatus, getMovieRecords } from './providers/catalogData';
import { CatalogId, CATALOG_IDS } from './types/domain';

const app = express();
const baseUrl = new URL(BASE_URL);

/* ------------------------------------------------------------------ */
/*  API: catalog preview for configure page                           */
/* ------------------------------------------------------------------ */

interface PreviewItem {
  imdbId: string;
  title: string;
  year: number;
  poster: string;
  status: 'NOW' | 'SOON' | 'RECENT';
  catalogId: CatalogId;
  startDate: string;
  endDate?: string;
  source: string;
}

interface PreviewResponse {
  country: string;
  catalogs: {
    id: CatalogId;
    name: string;
    items: PreviewItem[];
  }[];
  stats: {
    total: number;
    now: number;
    soon: number;
    recent: number;
  };
}

async function buildPreview(country: SupportedCountry): Promise<PreviewResponse> {
  const catalogs: PreviewResponse['catalogs'] = [];
  let totalNow = 0;
  let totalSoon = 0;
  let totalRecent = 0;
  const seenIds = new Set<string>();

  for (const catalogId of CATALOG_IDS) {
    const items = await getCatalogItems(catalogId, country);
    const mapped: PreviewItem[] = [];

    for (const item of items) {
      mapped.push({
        imdbId: item.movie.imdbId,
        title: item.movie.originalTitle ?? item.movie.title,
        year: item.movie.year,
        poster: getPosterFallbackUrl(item.movie.imdbId),
        status: item.availability.statusText,
        catalogId,
        startDate: item.availability.release.startDate,
        endDate: item.availability.release.endDate,
        source: item.availability.release.source,
      });

      if (!seenIds.has(item.movie.imdbId)) {
        seenIds.add(item.movie.imdbId);
        if (item.availability.statusText === 'NOW') totalNow++;
        else if (item.availability.statusText === 'SOON') totalSoon++;
        else totalRecent++;
      }
    }

    catalogs.push({
      id: catalogId,
      name: CATALOG_NAMES[catalogId],
      items: mapped,
    });
  }

  return {
    country,
    catalogs,
    stats: {
      total: seenIds.size,
      now: totalNow,
      soon: totalSoon,
      recent: totalRecent,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Configure page builder                                            */
/* ------------------------------------------------------------------ */

function encodeAddonConfig(country: string): string {
  return encodeURIComponent(JSON.stringify({ country }));
}

function buildCountryOptionsJson(): string {
  return JSON.stringify(
    COUNTRY_OPTIONS.map((code) => ({
      code,
      name: COUNTRY_NAMES[code],
      flag: COUNTRY_FLAGS[code],
    }))
  );
}

type SupportedLanguage = 'en' | 'tr';

function getLanguageForCountry(country: SupportedCountry): SupportedLanguage {
  return country === 'TR' ? 'tr' : 'en';
}

function buildConfigurePage(selectedCountry: SupportedCountry): string {
  const selectedLanguage = getLanguageForCountry(selectedCountry);
  const initialConfig = encodeAddonConfig(selectedCountry);

  return `<!doctype html>
<html lang="${selectedLanguage}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${ADDON_NAME} &mdash; Configure</title>
  <style>
    :root {
      --bg: #0d0d0f;
      --surface: #16161a;
      --surface-raised: #1e1e24;
      --surface-overlay: rgba(30,30,36,0.92);
      --text: #ececf1;
      --text-secondary: #8b8b9e;
      --accent: #e85d3a;
      --accent-hover: #ff7a56;
      --accent-glow: rgba(232,93,58,0.25);
      --green: #34d399;
      --yellow: #fbbf24;
      --blue: #60a5fa;
      --border: rgba(255,255,255,0.06);
      --border-strong: rgba(255,255,255,0.12);
      --radius: 16px;
      --radius-sm: 10px;
      --radius-xs: 6px;
      --font: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      --font-mono: ui-monospace,SFMono-Regular,'SF Mono',Menlo,monospace;
    }
    *,*::before,*::after{box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{margin:0;font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.5;-webkit-font-smoothing:antialiased}

    /* ---- HERO ---- */
    .hero{position:relative;overflow:hidden;padding:64px 24px 48px;text-align:center}
    .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,var(--accent-glow),transparent 70%);pointer-events:none}
    .hero-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;background:var(--surface-raised);border:1px solid var(--border-strong);font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--accent);margin-bottom:20px}
    .hero-badge .dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .hero h1{margin:0 0 12px;font-size:clamp(32px,6vw,52px);font-weight:800;letter-spacing:-0.02em;line-height:1.1}
    .hero h1 .gradient{background:linear-gradient(135deg,var(--accent),#ff9a76);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .hero p{margin:0 auto;max-width:520px;color:var(--text-secondary);font-size:16px}

    /* ---- LAYOUT ---- */
    .container{max-width:960px;margin:0 auto;padding:0 20px}
    section{padding:40px 0}

    /* ---- STATS ---- */
    .stats-bar{display:flex;justify-content:center;gap:32px;flex-wrap:wrap;padding:24px 0;margin-bottom:8px}
    .stat{text-align:center}
    .stat-value{font-size:28px;font-weight:700;line-height:1}
    .stat-value.now{color:var(--green)}
    .stat-value.soon{color:var(--yellow)}
    .stat-value.recent{color:var(--blue)}
    .stat-label{font-size:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-top:4px}

    /* ---- COUNTRY SELECTOR ---- */
    .config-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;margin-bottom:32px}
    .config-section h2{margin:0 0 4px;font-size:18px;font-weight:700}
    .config-section .desc{margin:0 0 18px;color:var(--text-secondary);font-size:14px}
    .country-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
    .country-btn{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface-raised);color:var(--text);font:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s ease}
    .country-btn:hover{border-color:var(--border-strong);background:var(--surface-overlay)}
    .country-btn.active{border-color:var(--accent);background:rgba(232,93,58,0.08);color:var(--accent)}
    .country-btn .flag{font-size:18px;line-height:1}

    /* ---- CATALOG PREVIEW ---- */
    .catalog-block{margin-bottom:36px}
    .catalog-header{display:flex;align-items:center;gap:10px;margin-bottom:16px}
    .catalog-header h3{margin:0;font-size:16px;font-weight:700}
    .catalog-count{font-size:12px;color:var(--text-secondary);background:var(--surface-raised);padding:2px 10px;border-radius:999px}
    .movie-scroll{display:flex;gap:14px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
    .movie-scroll::-webkit-scrollbar{height:4px}
    .movie-scroll::-webkit-scrollbar-track{background:transparent}
    .movie-scroll::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:2px}
    .movie-card{flex:0 0 150px;scroll-snap-align:start;position:relative;border-radius:var(--radius-sm);overflow:hidden;background:var(--surface-raised);border:1px solid var(--border);transition:transform .2s ease,border-color .2s ease}
    .movie-card:hover{transform:translateY(-4px);border-color:var(--border-strong)}
    .movie-poster{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:var(--surface)}
    .movie-poster-placeholder{width:100%;aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--text-secondary);font-size:32px}
    .movie-badge{position:absolute;top:8px;left:8px;padding:3px 8px;border-radius:var(--radius-xs);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;backdrop-filter:blur(8px)}
    .badge-now{background:rgba(52,211,153,0.2);color:var(--green);border:1px solid rgba(52,211,153,0.3)}
    .badge-soon{background:rgba(251,191,36,0.2);color:var(--yellow);border:1px solid rgba(251,191,36,0.3)}
    .badge-recent{background:rgba(96,165,250,0.2);color:var(--blue);border:1px solid rgba(96,165,250,0.3)}
    .movie-info{padding:10px}
    .movie-title{margin:0;font-size:12px;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .movie-year{font-size:11px;color:var(--text-secondary);margin-top:2px}
    .movie-date{font-size:10px;color:var(--text-secondary);margin-top:4px;opacity:0.7}
    .empty-catalog{color:var(--text-secondary);font-size:14px;padding:24px;text-align:center;background:var(--surface);border:1px dashed var(--border);border-radius:var(--radius-sm)}

    /* ---- FEATURES ---- */
    .features{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:40px}
    .feature{padding:24px;border-radius:var(--radius);background:var(--surface);border:1px solid var(--border)}
    .feature-icon{font-size:28px;margin-bottom:12px}
    .feature h4{margin:0 0 6px;font-size:15px;font-weight:700}
    .feature p{margin:0;font-size:13px;color:var(--text-secondary);line-height:1.5}

    /* ---- INSTALL ---- */
    .install-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:32px;text-align:center;margin-bottom:40px}
    .install-section h2{margin:0 0 8px;font-size:22px;font-weight:700}
    .install-section .desc{margin:0 0 24px;color:var(--text-secondary);font-size:14px}
    .install-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}
    .btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:999px;font:inherit;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;border:0;transition:all .15s ease}
    .btn-primary{background:var(--accent);color:white;box-shadow:0 4px 24px var(--accent-glow)}
    .btn-primary:hover{background:var(--accent-hover);transform:translateY(-1px)}
    .btn-secondary{background:var(--surface-raised);color:var(--text);border:1px solid var(--border-strong)}
    .btn-secondary:hover{background:var(--surface-overlay);border-color:var(--accent)}
    .btn-copy{background:var(--surface-raised);color:var(--text);border:1px solid var(--border);height:36px;min-width:84px;padding:0 14px;font-size:13px;border-radius:var(--radius-sm);display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;cursor:pointer}
    .btn-copy:hover{border-color:var(--accent);color:var(--accent)}
    .manifest-url{margin-top:16px;padding:8px;border-radius:var(--radius-sm);background:var(--bg);border:1px solid var(--border);font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);text-align:left;display:flex;align-items:center;gap:10px}
    #manifest-url-text{flex:1;min-width:0;word-break:break-all;padding:0 8px}
    .copy-toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--green);color:var(--bg);padding:10px 20px;border-radius:999px;font-size:13px;font-weight:600;opacity:0;transition:all .3s ease;pointer-events:none;z-index:100}
    .copy-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

    /* ---- FOOTER ---- */
    footer{padding:32px 20px;text-align:center;border-top:1px solid var(--border);color:var(--text-secondary);font-size:12px}
    footer a{color:var(--accent);text-decoration:none}
    footer a:hover{text-decoration:underline}

    /* ---- LOADING ---- */
    .loading{display:flex;justify-content:center;align-items:center;padding:48px;gap:8px;color:var(--text-secondary);font-size:14px}
    .loading-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);animation:bounce .6s ease-in-out infinite}
    .loading-dot:nth-child(2){animation-delay:.1s}
    .loading-dot:nth-child(3){animation-delay:.2s}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

    /* ---- RESPONSIVE ---- */
    @media(max-width:600px){
      .hero{padding:48px 20px 32px}
      .stats-bar{gap:20px}
      .stat-value{font-size:22px}
      .config-section{padding:20px}
      .country-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}
      .movie-card{flex:0 0 130px}
      .install-section{padding:24px 20px}
      .features{grid-template-columns:1fr}
    }
  </style>
</head>
<body>
  <!-- HERO -->
  <header class="hero">
    <div class="hero-badge"><span class="dot"></span><span id="hero-badge-text">Stremio Addon</span></div>
    <h1><span class="gradient">${ADDON_NAME}</span></h1>
    <p id="hero-description">${ADDON_DESCRIPTION}</p>
  </header>

  <!-- STATS -->
  <div class="container">
    <div class="stats-bar" id="stats-bar">
      <div class="stat">
        <div class="stat-value" id="stat-total">-</div>
        <div class="stat-label" id="stat-label-total">Total Movies</div>
      </div>
      <div class="stat">
        <div class="stat-value now" id="stat-now">-</div>
        <div class="stat-label" id="stat-label-now">In Theaters</div>
      </div>
      <div class="stat">
        <div class="stat-value soon" id="stat-soon">-</div>
        <div class="stat-label" id="stat-label-soon">Coming Soon</div>
      </div>
      <div class="stat">
        <div class="stat-value recent" id="stat-recent">-</div>
        <div class="stat-label" id="stat-label-recent">Recently Ended</div>
      </div>
    </div>
  </div>

  <!-- COUNTRY SELECTOR -->
  <div class="container">
    <div class="config-section">
      <h2 id="country-title">Select Your Country</h2>
      <p class="desc" id="country-description">Availability and scheduling is tailored to your region. Pick the country where you want to see theater listings.</p>
      <div class="country-grid" id="country-grid"></div>
    </div>
  </div>

  <!-- CATALOG PREVIEW -->
  <div class="container">
    <section id="catalog-preview">
      <div class="loading" id="loading">
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
        <span id="loading-label">Loading catalog&hellip;</span>
      </div>
    </section>
  </div>

  <!-- FEATURES -->
  <div class="container">
    <div class="features">
      <div class="feature">
        <div class="feature-icon">&#127916;</div>
        <h4 id="feature-rerelease-title">${CATALOG_NAMES.rerelease}</h4>
        <p id="feature-rerelease-description">Classic and beloved movies returning to the big screen. We track official theater rereleases across multiple countries.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">&#127909;</div>
        <h4 id="feature-imax-title">${CATALOG_NAMES['imax-returning']}</h4>
        <p id="feature-imax-description">Fan-favorite films making their way back to IMAX screens. Experience them the way they were meant to be seen.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">&#127760;</div>
        <h4 id="feature-smart-title">Smart Availability</h4>
        <p id="feature-smart-description">Country-aware scheduling shows what is playing in your area first. Global releases are displayed when no local listing exists.</p>
      </div>
    </div>
  </div>

  <!-- INSTALL -->
  <div class="container">
    <div class="install-section">
      <h2 id="install-title">Install Addon</h2>
      <p class="desc" id="install-description">Add <strong>${ADDON_NAME}</strong> to your Stremio with one click. Make sure Stremio desktop is running first.</p>
      <div class="install-actions">
        <button class="btn btn-primary" id="btn-install">Install in Stremio</button>
        <a class="btn btn-secondary" id="btn-manifest" href="#" target="_blank">View Manifest</a>
      </div>
      <div class="manifest-url" id="manifest-url-box">
        <span id="manifest-url-text"></span>
        <button class="btn-copy" id="btn-copy" type="button">Copy</button>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <footer>
    <div class="container">
      <span id="footer-label">${ADDON_NAME} v0.1.0 &middot; Compatible with Stremio v4.4+ &middot;</span>
      <a href="https://github.com" target="_blank">GitHub</a>
    </div>
  </footer>

  <!-- TOAST -->
  <div class="copy-toast" id="copy-toast">Copied to clipboard!</div>

  <script>
    (function() {
      var host = ${JSON.stringify(baseUrl.host)};
      var base = ${JSON.stringify(BASE_URL)};
      var addonName = ${JSON.stringify(ADDON_NAME)};
      var countries = ${buildCountryOptionsJson()};
      var selectedCountry = ${JSON.stringify(selectedCountry)};
      function getLanguageForCountryCode(countryCode) {
        return countryCode === 'TR' ? 'tr' : 'en';
      }

      var selectedLanguage = getLanguageForCountryCode(selectedCountry);
      var previewCache = {};

      var i18n = {
        en: {
          pageTitle: addonName + ' - Configure',
          heroBadge: 'Stremio Addon',
          heroDescription: 'Shows movie rereleases and official IMAX returns inside Stremio.',
          totalMovies: 'Total Movies',
          inTheaters: 'In Theaters',
          comingSoon: 'Coming Soon',
          recentlyEnded: 'Recently Ended',
          language: 'Language',
          selectCountry: 'Select Your Country',
          countryDescription:
            'Availability and scheduling is tailored to your region. Pick the country where you want to see theater listings.',
          loadingCatalog: 'Loading catalog...',
          featureRereleaseDescription:
            'Classic and beloved movies returning to the big screen. We track official theater rereleases across multiple countries.',
          featureImaxDescription:
            'Fan-favorite films making their way back to IMAX screens. Experience them the way they were meant to be seen.',
          featureSmartTitle: 'Smart Availability',
          featureSmartDescription:
            'Country-aware scheduling shows what is playing in your area first. Global releases are displayed when no local listing exists.',
          installTitle: 'Install Addon',
          installDescription:
            'Add <strong>' + addonName + '</strong> to your Stremio with one click. Make sure Stremio desktop is running first.',
          installButton: 'Install in Stremio',
          viewManifest: 'View Manifest',
          copy: 'Copy',
          copied: 'Copied to clipboard!',
          footer: addonName + ' v0.1.0 · Compatible with Stremio v4.4+ ·',
          moviesSuffix: 'movies',
          noMovies: 'No movies available for this catalog in your region right now.',
          loadError: 'Could not load catalog preview. The addon is still installing - try refreshing in a moment.',
          badgeNow: 'In Theaters',
          badgeSoon: 'Coming Soon',
          badgeRecent: 'Ended',
        },
        tr: {
          pageTitle: addonName + ' - Yapilandirma',
          heroBadge: 'Stremio Eklentisi',
          heroDescription: 'Stremio icinde film yeniden gosterimleri ve resmi IMAX geri donuslerini gosterir.',
          totalMovies: 'Toplam Film',
          inTheaters: 'Vizyonda',
          comingSoon: 'Yakinda',
          recentlyEnded: 'Yeni Sona Erdi',
          language: 'Dil',
          selectCountry: 'Ulkenizi Secin',
          countryDescription:
            'Uygunluk ve takvim bolgenize gore uyarlanir. Sinema listelerini gormek istediginiz ulkeyi secin.',
          loadingCatalog: 'Katalog yukleniyor...',
          featureRereleaseDescription:
            'Klasik ve sevilen filmler tekrar buyuk perdeye donuyor. Birden fazla ulkede resmi yeniden gosterimleri takip ediyoruz.',
          featureImaxDescription:
            'Hayranlarin sevdigi filmler yeniden IMAX salonlarina donuyor. Filmleri tasarlandigi sekilde deneyimleyin.',
          featureSmartTitle: 'Akilli Uygunluk',
          featureSmartDescription:
            'Ulke odakli siralama once bolgenizdeki gosterimleri gosterir. Yerel liste yoksa global gosterimler sunulur.',
          installTitle: 'Eklentiyi Kur',
          installDescription:
            '<strong>' + addonName + '</strong> eklentisini tek tikla Stremio hesabiniza ekleyin. Once Stremio masaustu uygulamasini acin.',
          installButton: 'Stremio Icinde Kur',
          viewManifest: 'Manifesti Gor',
          copy: 'Kopyala',
          copied: 'Panoya kopyalandi!',
          footer: addonName + ' v0.1.0 · Stremio v4.4+ ile uyumludur ·',
          moviesSuffix: 'film',
          noMovies: 'Bu katalog icin su anda bolgenizde film bulunmuyor.',
          loadError: 'Katalog onizlemesi yuklenemedi. Eklenti hala baslatiliyor olabilir, biraz sonra yenileyin.',
          badgeNow: 'Vizyonda',
          badgeSoon: 'Yakinda',
          badgeRecent: 'Bitti',
        },
      };

      /* --- DOM refs --- */
      var grid = document.getElementById('country-grid');
      var previewSection = document.getElementById('catalog-preview');
      var btnInstall = document.getElementById('btn-install');
      var btnManifest = document.getElementById('btn-manifest');
      var manifestText = document.getElementById('manifest-url-text');
      var btnCopy = document.getElementById('btn-copy');
      var toast = document.getElementById('copy-toast');
      var heroBadgeText = document.getElementById('hero-badge-text');
      var heroDescription = document.getElementById('hero-description');
      var countryTitle = document.getElementById('country-title');
      var countryDescription = document.getElementById('country-description');
      var loadingLabel = document.getElementById('loading-label');
      var featureRereleaseTitle = document.getElementById('feature-rerelease-title');
      var featureRereleaseDescription = document.getElementById('feature-rerelease-description');
      var featureImaxTitle = document.getElementById('feature-imax-title');
      var featureImaxDescription = document.getElementById('feature-imax-description');
      var featureSmartTitle = document.getElementById('feature-smart-title');
      var featureSmartDescription = document.getElementById('feature-smart-description');
      var installTitle = document.getElementById('install-title');
      var installDescription = document.getElementById('install-description');
      var footerLabel = document.getElementById('footer-label');
      var statLabelTotal = document.getElementById('stat-label-total');
      var statLabelNow = document.getElementById('stat-label-now');
      var statLabelSoon = document.getElementById('stat-label-soon');
      var statLabelRecent = document.getElementById('stat-label-recent');
      var statTotal = document.getElementById('stat-total');
      var statNow = document.getElementById('stat-now');
      var statSoon = document.getElementById('stat-soon');
      var statRecent = document.getElementById('stat-recent');

      function t(key) {
        if (i18n[selectedLanguage] && i18n[selectedLanguage][key]) return i18n[selectedLanguage][key];
        return i18n.en[key] || key;
      }

      /* --- helpers --- */
      function encodeConfig(c) {
        return encodeURIComponent(JSON.stringify({ country: c }));
      }

      function manifestUrl(c) {
        return base + '/' + encodeConfig(c) + '/manifest.json';
      }

      function stremioUrl(c) {
        return 'stremio://' + host + '/' + encodeConfig(c) + '/manifest.json';
      }

      function formatDate(d) {
        if (!d) return '';
        var parts = d.split('-');
        var months =
          selectedLanguage === 'tr'
            ? ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara']
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[parseInt(parts[1],10)-1] + ' ' + parseInt(parts[2],10);
      }

      function badgeClass(status) {
        if (status === 'NOW') return 'badge-now';
        if (status === 'SOON') return 'badge-soon';
        return 'badge-recent';
      }

      function badgeText(status) {
        if (status === 'NOW') return t('badgeNow');
        if (status === 'SOON') return t('badgeSoon');
        return t('badgeRecent');
      }

      function updatePageUrl() {
        var url = new URL(window.location.href);
        url.searchParams.set('country', selectedCountry);
        window.history.replaceState({}, '', url.toString());
      }

      function applyTranslations() {
        document.title = t('pageTitle');
        heroBadgeText.textContent = t('heroBadge');
        heroDescription.textContent = t('heroDescription');
        statLabelTotal.textContent = t('totalMovies');
        statLabelNow.textContent = t('inTheaters');
        statLabelSoon.textContent = t('comingSoon');
        statLabelRecent.textContent = t('recentlyEnded');
        countryTitle.textContent = t('selectCountry');
        countryDescription.textContent = t('countryDescription');
        if (loadingLabel) loadingLabel.textContent = t('loadingCatalog');
        featureRereleaseTitle.textContent =
          selectedLanguage === 'tr' ? 'Yeniden Vizyonda' : ${JSON.stringify(CATALOG_NAMES.rerelease)};
        featureRereleaseDescription.textContent = t('featureRereleaseDescription');
        featureImaxTitle.textContent =
          selectedLanguage === 'tr' ? 'IMAX Geri Donuyor' : ${JSON.stringify(CATALOG_NAMES['imax-returning'])};
        featureImaxDescription.textContent = t('featureImaxDescription');
        featureSmartTitle.textContent = t('featureSmartTitle');
        featureSmartDescription.textContent = t('featureSmartDescription');
        installTitle.textContent = t('installTitle');
        installDescription.innerHTML = t('installDescription');
        btnInstall.textContent = t('installButton');
        btnManifest.textContent = t('viewManifest');
        btnCopy.textContent = t('copy');
        toast.textContent = t('copied');
        footerLabel.textContent = t('footer');

      }

      /* --- install links --- */
      function updateInstallLinks() {
        var mu = manifestUrl(selectedCountry);
        var su = stremioUrl(selectedCountry);
        btnInstall.onclick = function(e) { e.preventDefault(); window.location.href = su; };
        btnManifest.href = mu;
        manifestText.textContent = mu;
      }

      /* --- copy to clipboard --- */
      btnCopy.addEventListener('click', function() {
        var text = manifestText.textContent;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text);
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        toast.classList.add('show');
        setTimeout(function() { toast.classList.remove('show'); }, 2000);
      });

      /* --- country grid --- */
      function renderCountryGrid() {
        grid.innerHTML = '';
        countries.forEach(function(c) {
          var btn = document.createElement('button');
          btn.className = 'country-btn' + (c.code === selectedCountry ? ' active' : '');
          btn.innerHTML = '<span class="flag">' + c.flag + '</span>' + c.code;
          btn.title = c.name;
          btn.addEventListener('click', function() {
            selectedCountry = c.code;
            selectedLanguage = getLanguageForCountryCode(selectedCountry);
            applyTranslations();
            renderCountryGrid();
            updateInstallLinks();
            loadPreview();
            updatePageUrl();
          });
          grid.appendChild(btn);
        });
      }

      /* --- render catalog --- */
      function renderPreview(data) {
        /* stats */
        statTotal.textContent = data.stats.total;
        statNow.textContent = data.stats.now;
        statSoon.textContent = data.stats.soon;
        statRecent.textContent = data.stats.recent;

        /* catalogs */
        var html = '';
        data.catalogs.forEach(function(cat) {
          html += '<div class="catalog-block">';
          var localizedCatalogName = cat.name;
          if (selectedLanguage === 'tr' && cat.id === 'rerelease') localizedCatalogName = 'Yeniden Vizyonda';
          if (selectedLanguage === 'tr' && cat.id === 'imax-returning') localizedCatalogName = 'IMAX Geri Donuyor';
          html += '<div class="catalog-header"><h3>' + localizedCatalogName + '</h3>';
          html += '<span class="catalog-count">' + cat.items.length + ' ' + t('moviesSuffix') + '</span></div>';
          if (cat.items.length === 0) {
            html += '<div class="empty-catalog">' + t('noMovies') + '</div>';
          } else {
            html += '<div class="movie-scroll">';
            cat.items.forEach(function(m) {
              html += '<div class="movie-card">';
              html += '<img class="movie-poster" data-fallback src="' + m.poster + '" alt="' + m.title.replace(/"/g,'&quot;') + '" loading="lazy">';
              html += '<div class="movie-poster-placeholder" style="display:none">&#127916;</div>';
              html += '<div class="movie-badge ' + badgeClass(m.status) + '">' + badgeText(m.status) + '</div>';
              html += '<div class="movie-info">';
              html += '<div class="movie-title">' + m.title + '</div>';
              html += '<div class="movie-year">' + m.year + '</div>';
              html += '<div class="movie-date">' + formatDate(m.startDate);
              if (m.endDate && m.endDate !== m.startDate) {
                html += ' - ' + formatDate(m.endDate);
              }
              html += '</div>';
              html += '</div></div>';
            });
            html += '</div>';
          }
          html += '</div>';
        });

        previewSection.innerHTML = html;

        /* attach poster error handlers after DOM insert */
        var imgs = previewSection.querySelectorAll('img[data-fallback]');
        for (var i = 0; i < imgs.length; i++) {
          imgs[i].addEventListener('error', function() {
            this.style.display = 'none';
            if (this.nextElementSibling) this.nextElementSibling.style.display = 'flex';
          });
        }
      }

      /* --- load preview data --- */
      function loadPreview() {
        if (previewCache[selectedCountry]) {
          renderPreview(previewCache[selectedCountry]);
          return;
        }

        previewSection.innerHTML = '<div class="loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span> ' + t('loadingCatalog') + '</div>';

        fetch(base + '/api/catalog-preview?country=' + selectedCountry)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            previewCache[selectedCountry] = data;
            if (data.country === selectedCountry) {
              renderPreview(data);
            }
          })
          .catch(function() {
            previewSection.innerHTML = '<div class="empty-catalog">' + t('loadError') + '</div>';
          });
      }

      /* --- init --- */
      applyTranslations();
      renderCountryGrid();
      updateInstallLinks();
      loadPreview();
      updatePageUrl();
    })();
  </script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Routes                                                            */
/* ------------------------------------------------------------------ */

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    baseUrl: BASE_URL,
    catalog: getCatalogStatus(),
  });
});

app.get('/api/catalog-preview', async (request, response) => {
  try {
    const country = normalizeCountry(request.query.country);
    const preview = await buildPreview(country);
    response.json(preview);
  } catch {
    response.status(500).json({ error: 'Preview unavailable' });
  }
});

app.get('/configure', (request, response) => {
  const country = normalizeCountry(request.query.country);
  response.type('html').send(buildConfigurePage(country));
});

app.use('/', getRouter(addonInterface));

app.listen(PORT, HOST, () => {
  console.log(`${BASE_URL}/manifest.json`);
  console.log(`${BASE_URL}/configure`);

  void getMovieRecords().catch(() => undefined);
});
