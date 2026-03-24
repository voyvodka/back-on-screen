import { ADDON_NAME, ADDON_VERSION, BASE_URL } from '../config/constants';
import { LOGO_SVG } from '../assets/logo';
import {
  COUNTRY_NAMES,
  COUNTRY_OPTIONS,
  LANGUAGE_COUNTRY_DEFAULTS,
  SupportedCountry,
  getCountryFlagUrl,
} from '../config/countries';

import { CONFIGURE_LOCALES, COUNTRY_LANGUAGE_MAP, getLanguageForCountry, getLocale } from './i18n';


function buildCountryOptionsJson(): string {
  return JSON.stringify(
    COUNTRY_OPTIONS.map((code) => ({
      code,
      name: COUNTRY_NAMES[code],
      flagUrl: getCountryFlagUrl(code),
    }))
  );
}

export function buildConfigurePage(selectedCountry: SupportedCountry, autoDetectCountry = false): string {
  const selectedLanguage = getLanguageForCountry(selectedCountry);
  const locale = getLocale(selectedLanguage);
  const baseUrl = new URL(BASE_URL);

  return `<!doctype html>
<html lang="${selectedLanguage}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${locale.pageTitle}</title>
  <link rel="icon" type="image/svg+xml" href="/logo.svg"/>
  <meta name="description" content="${locale.heroDescription}"/>
  <meta property="og:title" content="${locale.pageTitle}"/>
  <meta property="og:description" content="${locale.heroDescription}"/>
  <meta property="og:image" content="${BASE_URL}/logo.svg"/>
  <meta property="og:type" content="website"/>
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
      --gray: #9ca3af;
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

    .hero-logo{width:72px;height:72px;border-radius:18px;margin-bottom:16px;display:inline-block}
    .hero{position:relative;overflow:hidden;padding:64px 24px 48px;text-align:center}
    .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,var(--accent-glow),transparent 70%);pointer-events:none}
    .hero-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;background:var(--surface-raised);border:1px solid var(--border-strong);font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--accent);margin-bottom:20px}
    .hero-badge .dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .hero h1{margin:0 0 12px;font-size:clamp(32px,6vw,52px);font-weight:800;letter-spacing:-0.02em;line-height:1.1}
    .hero h1 .gradient{background:linear-gradient(135deg,var(--accent),#ff9a76);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .hero p{margin:0 auto;max-width:520px;color:var(--text-secondary);font-size:16px}

    .container{max-width:960px;margin:0 auto;padding:0 20px}
    section{padding:40px 0}

    .config-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;margin-bottom:32px}
    .config-section h2{margin:0 0 4px;font-size:18px;font-weight:700}
    .config-section .desc{margin:0 0 18px;color:var(--text-secondary);font-size:14px}
    .country-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
    .country-btn{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface-raised);color:var(--text);font:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s ease}
    .country-btn:hover{border-color:var(--border-strong);background:var(--surface-overlay)}
    .country-btn.active{border-color:var(--accent);background:rgba(232,93,58,0.08);color:var(--accent)}
    .country-btn .flag{width:18px;height:13px;object-fit:cover;border-radius:3px;box-shadow:0 0 0 1px rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);flex:0 0 auto}
    .country-btn .country-code{display:inline-block;line-height:1}

    .stats-bar{display:flex;justify-content:center;gap:32px;flex-wrap:wrap;padding:24px 0;margin-bottom:8px}
    .stat{text-align:center}
    .stat-value{font-size:28px;font-weight:700;line-height:1;transition:opacity .3s ease}
    .stat-value.loading{opacity:.4;animation:pulse 2s ease-in-out infinite}
    .stat-value.now{color:var(--green)}
    .stat-value.soon{color:var(--yellow)}
    .stat-value.recent{color:var(--blue)}
    .stat-value.ended{color:var(--gray)}
    .stat-label{font-size:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-top:4px}

    .filter-bar{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:24px}
    .filter-pill{padding:8px 18px;border-radius:999px;border:1px solid var(--border);background:var(--surface-raised);color:var(--text-secondary);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s ease;user-select:none}
    .filter-pill.disabled{opacity:.4;pointer-events:none;cursor:default}
    .filter-pill:hover{border-color:var(--border-strong);color:var(--text)}
    .filter-pill.active{border-color:var(--accent);background:rgba(232,93,58,0.1);color:var(--accent)}
    .filter-pill .pill-count{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:var(--surface);font-size:11px;font-weight:700;color:var(--text-secondary)}
    .filter-pill.active .pill-count{background:rgba(232,93,58,0.15);color:var(--accent)}

    .movie-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;position:relative}
    .movie-card{position:relative;border-radius:var(--radius-sm);overflow:hidden;background:var(--surface-raised);border:1px solid var(--border);transition:transform .2s ease,border-color .2s ease,opacity .3s ease}
    .movie-card:hover{transform:translateY(-4px);border-color:var(--border-strong)}
    .movie-card.card-enter{animation:cardIn .35s ease both}
    .movie-card.card-exit{animation:cardOut .25s ease both}
    @keyframes cardIn{from{opacity:0;transform:translateY(12px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes cardOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(0.94)}}
    .movie-poster{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:var(--surface)}
    .movie-poster-placeholder{width:100%;aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--text-secondary);font-size:32px}
    .card-top{position:absolute;top:8px;left:8px;right:8px;display:flex;justify-content:space-between;align-items:flex-start;gap:6px;pointer-events:none}
    .movie-badge{position:static;padding:3px 8px;border-radius:var(--radius-xs);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;backdrop-filter:blur(8px);max-width:72%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .badge-now{background:rgba(52,211,153,0.2);color:var(--green);border:1px solid rgba(52,211,153,0.3)}
    .badge-soon{background:rgba(251,191,36,0.2);color:var(--yellow);border:1px solid rgba(251,191,36,0.3)}
    .badge-recent{background:rgba(96,165,250,0.2);color:var(--blue);border:1px solid rgba(96,165,250,0.3)}
    .badge-ended{background:rgba(156,163,175,0.2);color:var(--gray);border:1px solid rgba(156,163,175,0.3)}
    .catalog-tag{position:static;padding:2px 6px;border-radius:var(--radius-xs);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;background:rgba(0,0,0,0.6);color:var(--text-secondary);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.08);flex:0 0 auto}
    .movie-info{padding:10px}
    .movie-title{margin:0;font-size:12px;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .movie-year{font-size:11px;color:var(--text-secondary);margin-top:2px}
    .movie-date{font-size:10px;color:var(--text-secondary);margin-top:4px;opacity:0.7}
    .empty-catalog{color:var(--text-secondary);font-size:14px;padding:24px;text-align:center;background:var(--surface);border:1px dashed var(--border);border-radius:var(--radius-sm)}

    .features{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:40px}
    .feature{padding:24px;border-radius:var(--radius);background:var(--surface);border:1px solid var(--border)}
    .feature-icon{font-size:28px;margin-bottom:12px}
    .feature h4{margin:0 0 6px;font-size:15px;font-weight:700}
    .feature p{margin:0;font-size:13px;color:var(--text-secondary);line-height:1.5}

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

    footer{padding:32px 20px;text-align:center;border-top:1px solid var(--border);color:var(--text-secondary);font-size:12px}
    footer a{color:var(--accent);text-decoration:none}
    footer a:hover{text-decoration:underline}

    .loading{display:flex;justify-content:center;align-items:center;padding:48px;gap:8px;color:var(--text-secondary);font-size:14px}
    .loading-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);animation:bounce .6s ease-in-out infinite}
    .loading-dot:nth-child(2){animation-delay:.1s}
    .loading-dot:nth-child(3){animation-delay:.2s}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

    @media(max-width:600px){
      .hero{padding:48px 20px 32px}
      .stats-bar{gap:20px}
      .stat-value{font-size:22px}
      .config-section{padding:20px}
      .country-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}
      .movie-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
      .install-section{padding:24px 20px}
      .features{grid-template-columns:1fr}
      .filter-bar{gap:6px}
      .filter-pill{padding:6px 14px;font-size:12px}
    }
  </style>
</head>
<body>
  <header class="hero">
    <div>${LOGO_SVG.replace('<svg ', '<svg class="hero-logo" ')}</div>
    <div class="hero-badge"><span class="dot"></span><span id="hero-badge-text">${locale.heroBadge}</span></div>
    <h1><span class="gradient">${ADDON_NAME}</span></h1>
    <p id="hero-description">${locale.heroDescription}</p>
  </header>

  <div class="container">
    <div class="config-section">
      <h2 id="country-title">${locale.selectCountry}</h2>
      <p class="desc" id="country-description">${locale.countryDescription}</p>
      <div class="country-grid" id="country-grid"></div>
    </div>
  </div>

  <div class="container">
    <div class="stats-bar" id="stats-bar">
      <div class="stat"><div class="stat-value loading" id="stat-total">-</div><div class="stat-label" id="stat-label-total">${locale.totalMovies}</div></div>
      <div class="stat"><div class="stat-value now loading" id="stat-now">-</div><div class="stat-label" id="stat-label-now">${locale.inTheaters}</div></div>
      <div class="stat"><div class="stat-value soon loading" id="stat-soon">-</div><div class="stat-label" id="stat-label-soon">${locale.comingSoon}</div></div>
      <div class="stat"><div class="stat-value ended loading" id="stat-ended">-</div><div class="stat-label" id="stat-label-ended">${locale.recentlyEnded}</div></div>
    </div>
  </div>

  <div class="container">
    <section id="catalog-preview">
      <div class="filter-bar" id="filter-bar">
        <button class="filter-pill active disabled" data-filter="all" id="filter-all">${locale.filterAll} <span class="pill-count" id="count-all">0</span></button>
        <button class="filter-pill disabled" data-filter="rerelease" id="filter-rerelease">${locale.filterRerelease} <span class="pill-count" id="count-rerelease">0</span></button>
        <button class="filter-pill disabled" data-filter="imax-returning" id="filter-imax">${locale.filterImax} <span class="pill-count" id="count-imax">0</span></button>
        <button class="filter-pill disabled" data-filter="ended" id="filter-ended">${locale.filterEnded} <span class="pill-count" id="count-ended">0</span></button>
      </div>
      <div id="movie-grid-container">
        <div class="loading" id="loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span><span id="loading-label">${locale.loadingCatalog}</span></div>
      </div>
    </section>
  </div>

  <div class="container">
    <div class="features">
      <div class="feature"><div class="feature-icon">&#127916;</div><h4 id="feature-rerelease-title">${locale.featureRereleaseTitle}</h4><p id="feature-rerelease-description">${locale.featureRereleaseDescription}</p></div>
      <div class="feature"><div class="feature-icon">&#127909;</div><h4 id="feature-imax-title">${locale.featureImaxTitle}</h4><p id="feature-imax-description">${locale.featureImaxDescription}</p></div>
      <div class="feature"><div class="feature-icon">&#127760;</div><h4 id="feature-smart-title">${locale.featureSmartTitle}</h4><p id="feature-smart-description">${locale.featureSmartDescription}</p></div>
    </div>
  </div>

  <div class="container">
    <div class="install-section">
      <h2 id="install-title">${locale.installTitle}</h2>
      <p class="desc" id="install-description">${locale.installDescription.replace('{{addonName}}', ADDON_NAME)}</p>
      <div class="install-actions"><button class="btn btn-primary" id="btn-install">${locale.installButton}</button><a class="btn btn-secondary" id="btn-manifest" href="#" target="_blank">${locale.viewManifest}</a></div>
      <div class="manifest-url" id="manifest-url-box"><span id="manifest-url-text"></span><button class="btn-copy" id="btn-copy" type="button">${locale.copy}</button></div>
    </div>
  </div>

  <footer><div class="container"><span id="footer-label">${locale.footer.replace('{{addonName}}', ADDON_NAME).replace('{{addonVersion}}', ADDON_VERSION)}</span><a id="footer-github" href="https://github.com/Voyvodka/back-on-screen" target="_blank">${locale.githubLabel}</a></div></footer>
  <div class="copy-toast" id="copy-toast">${locale.copied}</div>

  <script>
    (function() {
      var host = ${JSON.stringify(baseUrl.host)};
      var base = ${JSON.stringify(BASE_URL)};
      var addonName = ${JSON.stringify(ADDON_NAME)};
      var addonVersion = ${JSON.stringify(ADDON_VERSION)};
      var countries = ${buildCountryOptionsJson()};
      var locales = ${JSON.stringify(CONFIGURE_LOCALES)};
      var countryLanguageMap = ${JSON.stringify(COUNTRY_LANGUAGE_MAP)};
      var languageCountryDefaults = ${JSON.stringify(LANGUAGE_COUNTRY_DEFAULTS)};
      var selectedCountry = ${JSON.stringify(selectedCountry)};
      var autoDetectCountry = ${JSON.stringify(autoDetectCountry)};
      var selectedLanguage = countryLanguageMap[selectedCountry] || 'en';
      var countryStorageKey = 'back-on-screen:selected-country';
      var usingStoredCountry = false;
      var previewCache = {};
      var activeFilter = 'all';
      var allItems = [];
      var isLoading = true;

      var grid = document.getElementById('country-grid');
      var gridContainer = document.getElementById('movie-grid-container');
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
      var footerGithub = document.getElementById('footer-github');
      var statLabelTotal = document.getElementById('stat-label-total');
      var statLabelNow = document.getElementById('stat-label-now');
      var statLabelSoon = document.getElementById('stat-label-soon');
      var statLabelEnded = document.getElementById('stat-label-ended');
      var statTotal = document.getElementById('stat-total');
      var statNow = document.getElementById('stat-now');
      var statSoon = document.getElementById('stat-soon');
      var statEnded = document.getElementById('stat-ended');
      var filterAll = document.getElementById('filter-all');
      var filterRerelease = document.getElementById('filter-rerelease');
      var filterImax = document.getElementById('filter-imax');
      var filterEndedBtn = document.getElementById('filter-ended');

      function t(key) {
        var active = locales[selectedLanguage] || locales.en;
        if (active && Object.prototype.hasOwnProperty.call(active, key)) return active[key];
        return locales.en[key] || key;
      }

      function normalizeCountryCode(value) {
        if (typeof value !== 'string') return null;
        var candidate = value.trim().toUpperCase();
        for (var i = 0; i < countries.length; i++) {
          if (countries[i].code === candidate) return candidate;
        }
        return null;
      }

      function getStoredCountry() {
        try {
          return normalizeCountryCode(window.localStorage.getItem(countryStorageKey));
        } catch {
          return null;
        }
      }

      function persistCountry(country) {
        try {
          window.localStorage.setItem(countryStorageKey, country);
        } catch {
          return;
        }
      }

      function getCountryFromLocale(locale) {
        if (typeof locale !== 'string') return null;

        var normalizedLocale = locale.trim().replace(/_/g, '-');
        if (!normalizedLocale) return null;

        var parts = normalizedLocale.split('-').filter(Boolean);

        for (var i = parts.length - 1; i >= 1; i--) {
          var region = parts[i].toUpperCase();
          if (/^[A-Z]{2}$/.test(region)) {
            var matchedRegion = normalizeCountryCode(region);
            if (matchedRegion) return matchedRegion;
          }
        }

        var language = parts[0].toLowerCase();
        if (Object.prototype.hasOwnProperty.call(languageCountryDefaults, language)) {
          return languageCountryDefaults[language];
        }

        return null;
      }

      function detectCountryFromLocale() {
        var languageList = [];

        if (Array.isArray(navigator.languages)) {
          languageList = navigator.languages;
        } else if (typeof navigator.language === 'string') {
          languageList = [navigator.language];
        }

        for (var i = 0; i < languageList.length; i++) {
          var country = getCountryFromLocale(languageList[i]);
          if (country) return country;
        }

        return null;
      }

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
        var months = t('months');
        return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
      }

      function badgeClass(status) {
        if (status === 'NOW') return 'badge-now';
        if (status === 'SOON') return 'badge-soon';
        if (status === 'ENDED') return 'badge-ended';
        return 'badge-recent';
      }

      function badgeText(status) {
        if (status === 'NOW') return t('badgeNow');
        if (status === 'SOON') return t('badgeSoon');
        if (status === 'ENDED') return t('badgeEnded');
        return t('badgeRecent');
      }

      function updatePageUrl() {
        var url = new URL(window.location.href);
        url.searchParams.set('country', selectedCountry);
        window.history.replaceState({}, '', url.toString());
      }

      function applyTranslations() {
        document.documentElement.lang = selectedLanguage;
        document.title = t('pageTitle');
        heroBadgeText.textContent = t('heroBadge');
        heroDescription.textContent = t('heroDescription');
        statLabelTotal.textContent = t('totalMovies');
        statLabelNow.textContent = t('inTheaters');
        statLabelSoon.textContent = t('comingSoon');
        statLabelEnded.textContent = t('recentlyEnded');
        countryTitle.textContent = t('selectCountry');
        countryDescription.textContent = t('countryDescription');
        if (loadingLabel) loadingLabel.textContent = t('loadingCatalog');
        featureRereleaseTitle.textContent = t('featureRereleaseTitle');
        featureRereleaseDescription.textContent = t('featureRereleaseDescription');
        featureImaxTitle.textContent = t('featureImaxTitle');
        featureImaxDescription.textContent = t('featureImaxDescription');
        featureSmartTitle.textContent = t('featureSmartTitle');
        featureSmartDescription.textContent = t('featureSmartDescription');
        installTitle.textContent = t('installTitle');
        installDescription.innerHTML = t('installDescription').replace('{{addonName}}', addonName);
        btnInstall.textContent = t('installButton');
        btnManifest.textContent = t('viewManifest');
        btnCopy.textContent = t('copy');
        toast.textContent = t('copied');
        footerLabel.textContent = t('footer').replace('{{addonName}}', addonName).replace('{{addonVersion}}', addonVersion);
        if (footerGithub) {
          footerGithub.textContent = t('githubLabel');
        }

        updateFilterLabels();
      }

      function updateFilterLabels() {
        var rereleaseCount = 0;
        var imaxCount = 0;
        var endedCount = 0;
        for (var i = 0; i < allItems.length; i++) {
          var isEnded = allItems[i].status === 'RECENT' || allItems[i].status === 'ENDED';
          if (isEnded) endedCount++;
          if (!isEnded && allItems[i].catalogs.indexOf('rerelease') !== -1) rereleaseCount++;
          if (!isEnded && allItems[i].catalogs.indexOf('imax-returning') !== -1) imaxCount++;
        }
        var activeCount = allItems.length - endedCount;

        filterAll.innerHTML = t('filterAll') + ' <span class="pill-count">' + activeCount + '</span>';
        filterRerelease.innerHTML = t('filterRerelease') + ' <span class="pill-count">' + rereleaseCount + '</span>';
        filterImax.innerHTML = t('filterImax') + ' <span class="pill-count">' + imaxCount + '</span>';
        filterEndedBtn.innerHTML = t('filterEnded') + ' <span class="pill-count">' + endedCount + '</span>';
      }

      function updateInstallLinks() {
        var mu = manifestUrl(selectedCountry);
        var su = stremioUrl(selectedCountry);
        btnInstall.onclick = function(e) { e.preventDefault(); window.location.href = su; };
        btnManifest.href = mu;
        manifestText.textContent = mu;
      }

      function applySelectedCountry(country, source) {
        var normalizedCountry = normalizeCountryCode(country);
        if (!normalizedCountry) return;

        selectedCountry = normalizedCountry;
        selectedLanguage = countryLanguageMap[selectedCountry] || 'en';
        if (source === 'manual') {
          persistCountry(selectedCountry);
        }
        applyTranslations();
        renderCountryGrid();
        updateInstallLinks();
      }

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

      function renderCountryGrid() {
        grid.innerHTML = '';
        countries.forEach(function(c) {
          var btn = document.createElement('button');
          btn.className = 'country-btn' + (c.code === selectedCountry ? ' active' : '');
          btn.title = c.name;

          var flag = document.createElement('img');
          flag.className = 'flag';
          flag.src = c.flagUrl;
          flag.alt = '';
          flag.width = 18;
          flag.height = 13;
          flag.loading = 'lazy';
          flag.decoding = 'async';
          flag.setAttribute('aria-hidden', 'true');
          flag.addEventListener('error', function() {
            this.style.display = 'none';
          });

          var code = document.createElement('span');
          code.className = 'country-code';
          code.textContent = c.code;

          btn.appendChild(flag);
          btn.appendChild(code);

          btn.addEventListener('click', function() {
            applySelectedCountry(c.code, 'manual');
            loadPreview();
            updatePageUrl();
          });
          grid.appendChild(btn);
        });
      }

      function isEnded(m) {
        return m.status === 'RECENT' || m.status === 'ENDED';
      }

      function sortByLatestEnd(items) {
        return items.slice().sort(function(left, right) {
          var leftDate = left.endDate || left.startDate || '';
          var rightDate = right.endDate || right.startDate || '';
          return rightDate.localeCompare(leftDate);
        });
      }

      function getFilteredItems() {
        if (activeFilter === 'all') {
          return allItems.filter(function(m) { return !isEnded(m); });
        }
        if (activeFilter === 'rerelease') {
          return allItems.filter(function(m) { return m.catalogs.indexOf('rerelease') !== -1 && !isEnded(m); });
        }
        if (activeFilter === 'imax-returning') {
          return allItems.filter(function(m) { return m.catalogs.indexOf('imax-returning') !== -1 && !isEnded(m); });
        }
        if (activeFilter === 'ended') {
          return sortByLatestEnd(allItems.filter(function(m) { return isEnded(m); }));
        }
        return allItems;
      }

      function setFilterPillsDisabled(disabled) {
        var pills = document.querySelectorAll('.filter-pill');
        for (var i = 0; i < pills.length; i++) {
          pills[i].classList.toggle('disabled', disabled);
        }
      }

      function showLoadingState() {
        gridContainer.innerHTML = '<div class="loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span> ' + t('loadingCatalog') + '</div>';
        statTotal.textContent = '-';
        statNow.textContent = '-';
        statSoon.textContent = '-';
        statEnded.textContent = '-';
        statTotal.classList.add('loading');
        statNow.classList.add('loading');
        statSoon.classList.add('loading');
        statEnded.classList.add('loading');
        setFilterPillsDisabled(true);
      }

      function renderMovieGrid(animate) {
        if (isLoading) {
          showLoadingState();
          return;
        }

        var items = getFilteredItems();

        if (items.length === 0) {
          gridContainer.innerHTML = '<div class="empty-catalog">' + t('noMovies') + '</div>';
          return;
        }

        var fragment = document.createDocumentFragment();
        var gridEl = document.createElement('div');
        gridEl.className = 'movie-grid';

        items.forEach(function(m, idx) {
          var card = document.createElement('div');
          card.className = 'movie-card' + (animate ? ' card-enter' : '');
          if (animate) {
            card.style.animationDelay = (idx * 0.04) + 's';
          }

          var img = document.createElement('img');
          img.className = 'movie-poster';
          img.src = m.poster;
          img.alt = m.title;
          img.loading = 'lazy';

          var placeholder = document.createElement('div');
          placeholder.className = 'movie-poster-placeholder';
          placeholder.style.display = 'none';
          placeholder.innerHTML = '&#127916;';

          img.addEventListener('error', function() {
            this.style.display = 'none';
            placeholder.style.display = 'flex';
          });

          var badge = document.createElement('div');
          badge.className = 'movie-badge ' + badgeClass(m.status);
          badge.textContent = badgeText(m.status);

          var tag = document.createElement('div');
          tag.className = 'catalog-tag';
          var hasRerelease = m.catalogs.indexOf('rerelease') !== -1;
          var hasImax = m.catalogs.indexOf('imax-returning') !== -1;
          var tagTitle = '';
          if (hasRerelease && hasImax) {
            tag.textContent = t('catalogTagBoth');
            tagTitle = t('catalogRerelease') + ' + ' + t('catalogImax');
          } else if (hasRerelease) {
            tag.textContent = t('catalogTagRerelease');
            tagTitle = t('catalogRerelease');
          } else {
            tag.textContent = t('catalogTagImax');
            tagTitle = t('catalogImax');
          }
          tag.title = tagTitle;
          tag.setAttribute('aria-label', tagTitle);

          var topRow = document.createElement('div');
          topRow.className = 'card-top';
          topRow.appendChild(badge);
          topRow.appendChild(tag);

          var info = document.createElement('div');
          info.className = 'movie-info';

          var title = document.createElement('div');
          title.className = 'movie-title';
          title.textContent = m.title;

          var year = document.createElement('div');
          year.className = 'movie-year';
          year.textContent = m.year;

          var dateEl = document.createElement('div');
          dateEl.className = 'movie-date';
          if (m.status === 'ENDED' && m.endDate) {
            dateEl.textContent = t('endedOnDate').replace('{{date}}', formatDate(m.endDate));
          } else {
            var dateText = formatDate(m.startDate);
            if (m.endDate && m.endDate !== m.startDate) {
              dateText += t('dateRangeSeparator') + formatDate(m.endDate);
            }
            dateEl.textContent = dateText;
          }

          info.appendChild(title);
          info.appendChild(year);
          info.appendChild(dateEl);

          card.appendChild(img);
          card.appendChild(placeholder);
          card.appendChild(topRow);
          card.appendChild(info);

          gridEl.appendChild(card);
        });

        fragment.appendChild(gridEl);
        gridContainer.innerHTML = '';
        gridContainer.appendChild(fragment);
      }

      function setActiveFilter(filter) {
        if (filter === activeFilter) return;
        activeFilter = filter;

        var pills = document.querySelectorAll('.filter-pill');
        for (var i = 0; i < pills.length; i++) {
          pills[i].classList.toggle('active', pills[i].getAttribute('data-filter') === filter);
        }

        renderMovieGrid(true);
      }

      document.getElementById('filter-bar').addEventListener('click', function(e) {
        if (!(e.target instanceof Element)) return;
        var pill = e.target.closest('.filter-pill');
        if (!pill) return;
        var filter = pill.getAttribute('data-filter');
        if (filter) setActiveFilter(filter);
      });

      function renderPreview(data) {
        var merged = {};
        data.catalogs.forEach(function(cat) {
          cat.items.forEach(function(m) {
            if (merged[m.imdbId]) {
              if (merged[m.imdbId].catalogs.indexOf(cat.id) === -1) {
                merged[m.imdbId].catalogs.push(cat.id);
              }
            } else {
              merged[m.imdbId] = {
                imdbId: m.imdbId,
                title: m.title,
                year: m.year,
                poster: m.poster,
                status: m.status,
                catalogs: [cat.id],
                startDate: m.startDate,
                endDate: m.endDate,
                source: m.source,
              };
            }
          });
        });

        allItems = [];
        var countNow = 0;
        var countSoon = 0;
        var countEndedStat = 0;
        var keys = Object.keys(merged);
        for (var i = 0; i < keys.length; i++) {
          var item = merged[keys[i]];
          allItems.push(item);
          if (item.status === 'NOW') countNow++;
          else if (item.status === 'SOON') countSoon++;
          else countEndedStat++;
        }

        statTotal.textContent = allItems.length;
        statNow.textContent = countNow;
        statSoon.textContent = countSoon;
        statEnded.textContent = countEndedStat;
        statTotal.classList.remove('loading');
        statNow.classList.remove('loading');
        statSoon.classList.remove('loading');
        statEnded.classList.remove('loading');
        setFilterPillsDisabled(false);

        updateFilterLabels();
        activeFilter = 'all';

        var pills = document.querySelectorAll('.filter-pill');
        for (var i = 0; i < pills.length; i++) {
          pills[i].classList.toggle('active', pills[i].getAttribute('data-filter') === 'all');
        }

        renderMovieGrid(true);
      }

      function loadPreview() {
        if (previewCache[selectedCountry]) {
          isLoading = false;
          renderPreview(previewCache[selectedCountry]);
          return;
        }

        isLoading = true;
        allItems = [];
        showLoadingState();

        fetch(base + '/api/catalog-preview?country=' + selectedCountry)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            previewCache[selectedCountry] = data;
            if (data.country === selectedCountry) {
              isLoading = false;
              renderPreview(data);
            }
          })
          .catch(function() {
            isLoading = false;
            gridContainer.innerHTML = '<div class="empty-catalog">' + t('loadError') + '</div>';
          });
      }

      function resolveInitialCountry() {
        if (!autoDetectCountry) {
          return Promise.resolve(selectedCountry);
        }

        if (usingStoredCountry) {
          return Promise.resolve(selectedCountry);
        }

        var localeCountry = detectCountryFromLocale();
        if (localeCountry) {
          return Promise.resolve(localeCountry);
        }

        return Promise.resolve(selectedCountry);
      }

      if (autoDetectCountry) {
        var storedCountry = getStoredCountry();
        if (storedCountry) {
          selectedCountry = storedCountry;
          selectedLanguage = countryLanguageMap[selectedCountry] || 'en';
          usingStoredCountry = true;
        }
      }

      applyTranslations();
      renderCountryGrid();
      updateInstallLinks();

      resolveInitialCountry()
        .then(function(resolvedCountry) {
          if (resolvedCountry !== selectedCountry) {
            applySelectedCountry(resolvedCountry, 'auto');
          }
        })
        .finally(function() {
          loadPreview();
          updatePageUrl();
        });
    })();
  </script>
</body>
</html>`;
}
