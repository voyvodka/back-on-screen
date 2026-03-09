# Back on Screen

This Stremio v4.4 addon highlights movie rereleases in two catalogs:

- `Back in Theaters`
- `Returning to IMAX`

Country selection is configured through the addon settings. Catalog cards use lightweight direct poster URLs, while availability details appear in descriptions and on the detail page.

## Current data flow

- TR live source: `Box Office Turkiye` + `Paribu Cineverse IMAX`
- TR active-showing verification: `Box Office Turkiye / seanslar`
- Global official source experiment: `PR Newswire / Regal`
- Default behavior: live data, with disk cache and bootstrap records allowed on cold start
- Optional fallback: `ENABLE_MOCK_FALLBACK=true`

Mock data is hidden in the default mode. If you want to see mock records during development, run:

```bash
ENABLE_MOCK_FALLBACK=true yarn dev
```

## Requirements

- Node.js
- Yarn
- Stremio v4.4

## Development

```bash
yarn install
yarn dev
```

The server exposes:

- Health: `http://127.0.0.1:7000/health`
- Manifest: `http://127.0.0.1:7000/manifest.json`
- Configure: `http://127.0.0.1:7000/configure`
- Configure preview API: `http://127.0.0.1:7000/api/catalog-preview?country=TR`
- Country-configured manifest: `http://127.0.0.1:7000/%7B%22country%22%3A%22TR%22%7D/manifest.json`

`yarn dev` watches files and restarts the server automatically.

## Production-like run

```bash
yarn build
yarn start
```

`yarn start` runs the compiled `dist/index.js` output.

## Environment variables

- `HOST`: defaults to `127.0.0.1`
- `PORT`: defaults to `7000`
- `BASE_URL`: external address used in configure and manifest links
- `NODE_ENV`: `development` by default; cache timings differ in production
- `ENABLE_MOCK_FALLBACK=true`: enables mock records if live data ends up empty

## Install in Stremio

### Method 1 - Recommended

1. Keep `yarn dev` running.
2. Open `http://127.0.0.1:7000/configure` in a browser.
3. Choose a country. The configure page language follows the selected country (`TR` -> Turkish, others -> English).
4. Click `Install in Stremio`.
5. Confirm the installation in Stremio.

The configure page also provides:

- live catalog preview cards for the selected country
- `View Manifest` shortcut
- one-click manifest URL copy

### Method 2 - Manual repository URL

1. Open Stremio v4.4.
2. Use the `Add-on Repository URL` field in the Add-ons section.
3. For a quick test with the default country, add:

```text
http://127.0.0.1:7000/manifest.json
```

4. To pass the country directly in the URL, use:

```text
http://127.0.0.1:7000/%7B%22country%22%3A%22TR%22%7D/manifest.json
```

## Where it appears in Stremio

1. After installation, open `Board` or `Discover`.
2. You should see these rows:
   - `Back in Theaters`
   - `Returning to IMAX`
3. Card descriptions and source links reflect the selected country or `GLOBAL` availability.
4. Sorting works like this:
   - first currently playing titles
   - then upcoming titles
   - then recently ended titles

By default the catalogs are live-data driven. Mock data only appears when `ENABLE_MOCK_FALLBACK=true` is enabled.

To protect cold-start responsiveness, the addon can serve disk cache and bootstrap live records first, then refresh live data in the background.

`/health` returns more than a simple `ok` flag; it also includes basic cache and refresh state that is useful during operations.

## Development notes

- Mock data: `src/data/mockMovies.ts`
- Live source collector: `src/providers/live/boxOfficeTurkey.ts`
- IMAX verification helper: `src/providers/live/paribu.ts`
- Global official-source helper: `src/providers/live/prNewswireRegal.ts`
- Provider cache and merge flow: `src/providers/catalogData.ts`
- Catalog sorting logic: `src/lib/catalog.ts`
- Poster URL helper: `src/lib/posterBadge.ts`
- Addon manifest and handlers: `src/addon.ts`

## Next phase

The most likely next expansion is a personal row powered by an `IMDb` or `Trakt` list.

## License

MIT. See `LICENSE`.
