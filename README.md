# Back on Screen

[![CI](https://github.com/Voyvodka/back-on-screen/actions/workflows/ci.yml/badge.svg)](https://github.com/Voyvodka/back-on-screen/actions/workflows/ci.yml)

A Stremio addon that surfaces movie rereleases and IMAX returns as catalog rows on your Board and Discover screens.

**Catalogs:**

- **BoS - ReReleases** — classic films returning to cinemas
- **BoS - IMAX** — titles coming back to IMAX screens

## Features

- Two dedicated Stremio catalog rows with live data
- Country-aware filtering (TR data stays in TR, global data available everywhere)
- Rich configure page with dark cinema theme, live catalog preview, and filter tabs
- First-open country auto-detection from browser language, with saved selection support and US/English fallback
- Localized UI in 8 languages (EN, TR, DE, FR, IT, ES, NL, JA) — auto-detected from country
- Lightweight poster URLs for reliable Stremio catalog cards
- In-memory + disk cache for faster warm responses, with loading UI during cold starts
- Availability status indicators: NOW, SOON, RECENT, ENDED
- Deduplication across catalogs with combined tags

## Data Sources

| Region | Source | Purpose |
|--------|--------|---------|
| TR | Box Office Türkiye | Rerelease listings + showtime verification |
| TR | Paribu Cineverse IMAX | IMAX return verification |
| Global | PR Newswire / Regal | Official rerelease announcements |

Mock data is available for development (`ENABLE_MOCK_FALLBACK=true`) but hidden by default.

## Requirements

- Node.js >= 20
- Yarn
- Stremio desktop app

## Quick Start

```bash
git clone https://github.com/Voyvodka/back-on-screen.git
cd back-on-screen
yarn install
yarn dev
```

Open `http://127.0.0.1:7000/configure` in your browser to preview catalogs and install the addon into Stremio.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Redirects to `/configure` |
| `GET /configure` | Configure page with country selection and catalog preview |
| `GET /health` | Health check with cache and refresh state |
| `GET /manifest.json` | Stremio addon manifest |
| `GET /catalog/movie/rerelease.json` | BoS - ReReleases catalog |
| `GET /catalog/movie/imax-returning.json` | BoS - IMAX catalog |
| `GET /meta/movie/:id.json` | Movie detail metadata |
| `GET /api/catalog-preview?country=TR` | JSON preview API for the configure page |

Country-configured manifest example:

```
http://127.0.0.1:7000/%7B%22country%22%3A%22TR%22%7D/manifest.json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Bind address |
| `PORT` | `7000` | Bind port |
| `BASE_URL` | `http://{HOST}:{PORT}` | Public URL used in manifest and configure links |
| `NODE_ENV` | `development` | Controls cache durations (shorter in dev) |
| `ENABLE_MOCK_FALLBACK` | `false` | Set to `true` to show mock records when live data is empty |

For production deployments, set `BASE_URL` to your public URL:

```
BASE_URL=https://your-service.onrender.com
```

## Install in Stremio

### Configure Page (Recommended)

1. Start the server (`yarn dev` or deploy to a host).
2. Open `/configure` in a browser.
3. Choose a country — the UI language switches automatically.
4. Click **Install in Stremio**.
5. Confirm in Stremio.

The configure page also provides live catalog preview cards, a manifest link, and one-click URL copy.

On first open without a `country` query parameter, the page tries to detect the user's country from the browser locale (`navigator.languages`, `navigator.language`, and `Accept-Language`). If nothing maps to a supported country, it falls back to `US` and English. Manual country changes are remembered for the next visit.

### Manual URL

Paste this into Stremio's **Add-on Repository URL** field:

```
http://127.0.0.1:7000/manifest.json
```

For a specific country:

```
http://127.0.0.1:7000/%7B%22country%22%3A%22TR%22%7D/manifest.json
```

## Build

```bash
yarn build    # TypeScript compilation
yarn start    # Run compiled output (dist/index.js)
```

## Deployment (Render)

This project is configured for Render free tier deployment.

**Render settings:**

| Setting | Value |
|---------|-------|
| Build Command | `yarn install && yarn build` |
| Start Command | `yarn start` |
| Environment | `NODE_ENV=production`, `BASE_URL=https://your-service.onrender.com` |

> **Note:** `typescript`, `@types/node`, and `@types/express` are in `dependencies` (not `devDependencies`) because Render's production install skips dev deps.

> **Cold start:** Render free tier spins down after inactivity. If memory or disk cache is cold, the addon waits for live provider responses before returning catalog data. The configure page shows a loading state while this happens.

Render auto-deploys on every push to `main`. No deploy hook needed — just push and Render picks it up.

### Creating a Release

Use the same version in `package.json`, `src/config/constants.ts`, and the git tag:

```bash
# 1. Update version in package.json and src/config/constants.ts
# 2. Build
yarn build
# 3. Commit
git add -A
git commit -m "feat: v0.X.Y - short release summary"
# 4. Tag and push
git tag v0.X.Y
git push origin main --follow-tags
```

The `release.yml` workflow builds and creates the GitHub Release automatically after the tag is pushed.

Each GitHub Release includes the hosted install links in the release body. The default GitHub source archives are useful for self-hosting, but a standalone `manifest.json` download is not attached because this addon needs a running server for dynamic catalog and meta responses.

## CI / Release

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push to `main`, PRs | Node 20 + `yarn install` + `yarn build` |
| `release.yml` | Tags matching `v*` | Node 20 build + GitHub Release |

## Project Structure

```
src/
├── index.ts                  # Express server, routes, API
├── addon.ts                  # Stremio manifest and handlers
├── config/
│   ├── constants.ts          # Addon ID/name, env, cache timings
│   └── countries.ts          # Country list, normalization
├── configure/
│   ├── page.ts               # Configure page builder
│   └── i18n/                 # 8-language localization
├── lib/
│   ├── catalog.ts            # Availability, sorting, filtering
│   ├── descriptions.ts       # Movie description builder
│   └── posterBadge.ts        # Poster URL helper
├── providers/
│   ├── catalogData.ts        # Cache orchestration, merge logic
│   ├── cinemeta.ts           # Cinemeta metadata fetch
│   └── live/
│       ├── boxOfficeTurkey.ts  # TR rerelease source
│       ├── paribu.ts           # IMAX verification
│       └── prNewswireRegal.ts  # Global rerelease source
├── data/
│   ├── bootstrapLiveMovies.ts  # Reserved placeholder for optional bootstrap data
│   └── mockMovies.ts           # Development mock data
├── types/
│   └── domain.ts             # Shared domain types
└── utils/
    ├── http.ts               # Fetch helpers with timeouts
    ├── text.ts               # Text utilities
    └── date.ts               # Date helpers
```

## Troubleshooting

**Catalogs not appearing on Stremio Board:**
- Check cold catalog response time — Stremio may skip slow addons on Board.
- Verify with `curl http://127.0.0.1:7000/catalog/movie/rerelease.json`.
- Clear temp cache and restart if data seems stale.

**Empty catalog responses:**
- Check `/health` for cache and refresh state.
- Verify the country parameter — TR data only appears for country=TR.
- Try `ENABLE_MOCK_FALLBACK=true` to confirm the addon pipeline works.

**Configure page not loading:**
- Ensure the server is running and `BASE_URL` matches your access URL.
- Open `/health` first to confirm the server is up.

**Footer shows an old version:**
- The configure page footer version comes from `src/config/constants.ts` via localized footer templates.
- If you bump a release, update `package.json`, `src/config/constants.ts`, and the git tag together.

## Roadmap

- SEO improvements for the configure page
- Personal watchlist row powered by IMDb or Trakt lists

## License

[MIT](LICENSE)
