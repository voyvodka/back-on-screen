# Back on Screen

[![CI](https://github.com/Voyvodka/back-on-screen/actions/workflows/ci.yml/badge.svg)](https://github.com/Voyvodka/back-on-screen/actions/workflows/ci.yml)

A Stremio v4.4 addon that surfaces movie rereleases and IMAX returns as catalog rows on your Board and Discover screens.

**Catalogs:**

- **Back in Theaters** — classic films returning to cinemas
- **Returning to IMAX** — titles coming back to IMAX screens

## Features

- Two dedicated Stremio catalog rows with live data
- Country-aware filtering (TR data stays in TR, global data available everywhere)
- Rich configure page with dark cinema theme, live catalog preview, and filter tabs
- Localized UI in 8 languages (EN, TR, DE, FR, IT, ES, NL, JA) — auto-detected from country
- Lightweight poster URLs for reliable Stremio catalog cards
- Disk cache + bootstrap records for fast cold-start responses
- Availability status indicators: NOW, SOON, ENDED
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
- Stremio v4.4 (for installation)

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
| `GET /catalog/movie/rerelease.json` | Back in Theaters catalog |
| `GET /catalog/movie/imax-returning.json` | Returning to IMAX catalog |
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

> **Cold start:** Render free tier spins down after inactivity. The addon uses disk cache and bootstrap records to serve fast responses even on cold start.

### Auto-deploy via GitHub Release

1. Add `RENDER_DEPLOY_HOOK_URL` as a GitHub repository secret (get the URL from Render dashboard).
2. Tag a release:

```bash
git tag v0.1.1
git push origin v0.1.1
```

3. The `release.yml` workflow builds, creates a GitHub Release, and pings the Render deploy hook.

## CI / Release

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push to `main`, PRs | `yarn install` + `yarn build` |
| `release.yml` | Tags matching `v*` | Build + GitHub Release + optional Render deploy |

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
│   ├── bootstrapLiveMovies.ts  # Cold-start bootstrap records
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

## Roadmap

- SEO improvements for the configure page
- Personal watchlist row powered by IMDb or Trakt lists

## License

[MIT](LICENSE)
