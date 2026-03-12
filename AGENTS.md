# AGENTS.md
## Purpose
- This repo contains the `Back on Screen` Stremio v4.4 addon.
- Stack: Node.js, TypeScript, Express, `stremio-addon-sdk`, Yarn.
- Main goal: expose rerelease and IMAX-return movie catalogs.

## Repository-Specific Rules
- No `.cursor/rules/` directory exists.
- No `.cursorrules` file exists.
- No `.github/copilot-instructions.md` file exists.
- If any of those files are added later, treat them as higher-priority repo instructions.

## Project Layout
- `src/index.ts` - Express entrypoint, `/configure`, router mount.
- `src/addon.ts` - manifest, `catalog` and `meta` handlers.
- `src/config/*` - constants, env flags, country list.
- `src/lib/*` - sorting, descriptions, poster helpers.
- `src/providers/*` - live sources, Cinemeta, cache orchestration.
- `src/data/mockMovies.ts` - optional mock dataset.
- `src/types/*` - domain types and declarations.
- `src/utils/*` - HTTP, text, date helpers.
## Install And Run
```bash
yarn install
yarn dev
```
- `yarn dev` runs `tsx watch src/index.ts`.
- Local URLs:
  - `http://127.0.0.1:7000/manifest.json`
  - `http://127.0.0.1:7000/configure`
- `yarn start` runs `node dist/index.js` once without watch mode.

## Build / Lint / Test
### Build
```bash
yarn build
```
- This runs `tsc -p tsconfig.json`.
- Use this as the default validation step before handoff.

### Lint
- There is no lint script.
- There is no ESLint or Prettier config in the repo today.
- Do not claim lint passed; say lint is not configured.

### Test
- There is no test script.
- There is no test framework config.
- There are no test files in the current codebase.

### Running A Single Test
- Not available right now.
- There is no Jest/Vitest/Mocha setup.
- If you add tests later, update this file with the exact single-test command.

## Useful Manual Validation
```bash
curl http://127.0.0.1:7000/health
curl http://127.0.0.1:7000/manifest.json
curl http://127.0.0.1:7000/catalog/movie/rerelease.json
curl http://127.0.0.1:7000/catalog/movie/imax-returning.json
curl http://127.0.0.1:7000/meta/movie/tt1392170.json
```
- Use these when you need validation without opening Stremio.
- For UI validation, open `http://127.0.0.1:7000/configure` and install the addon into Stremio v4.4.

## TypeScript Rules
- `tsconfig.json` uses `strict: true`; keep new code strict and type-safe.
- Prefer explicit return types on exported functions.
- Prefer narrow unions and shared interfaces for domain models.
- Reuse types from `src/types/domain.ts` instead of duplicating shapes.
- Keep modules small and focused; this repo favors utility/provider modules over large classes.

## Import Style
- Use side-effect imports first when needed, e.g. `import 'dotenv/config';`.
- Group imports in this order:
  1. side-effect imports
  2. Node built-ins
  3. external packages
  4. internal modules
- Separate groups with a blank line.
- Use `import` by default.
- Keep the current `require('stremio-addon-sdk')` style unless you intentionally refactor that file.

## Formatting
- Use single quotes.
- Keep semicolons.
- Use 2-space indentation.
- Wrap long imports and object literals across multiple lines.
- Match the existing template-string HTML style in `src/index.ts`.

## Naming
- `camelCase` for variables, functions, and helpers.
- `PascalCase` for interfaces, types, and major shapes.
- `UPPER_SNAKE_CASE` for exported constants and env-derived flags.
- Prefer descriptive names such as `getMovieRecords`, `buildReleaseInfo`, `getCinemetaMeta`.

## Error Handling
- Follow the current fail-soft pattern for remote providers.
- External fetches should usually degrade to `[]`, `null`, redirect fallback, or cached data.
- Wrap network and disk-cache work in `try/catch`.
- Do not crash addon endpoints because a source site is temporarily broken.
- Add a short comment only if swallowed errors are not self-explanatory.

## Async / Networking
- Prefer async helper functions and isolated provider modules.
- Reuse `src/utils/http.ts` for fetch boilerplate.
- Keep timeouts explicit for remote calls.
- Preserve caching for expensive live-source requests.
- Be careful with cold-start latency; this repo already uses in-memory and disk-backed cache.
- Never put a multi-page live scrape directly on the critical first Home/Board response path without a fast cache or bootstrap fallback.
- If a provider fan-outs to many remote detail pages, add bounded concurrency and per-item fail-soft wrappers.
- A single remote `ECONNRESET` or timeout must not zero-out the whole catalog refresh.

## Data And Domain Conventions
- Movie identifiers are IMDb `tt...` IDs.
- Catalog items remain `type: 'movie'` unless the product scope changes.
- Country-aware ordering is important; preserve selected-country-first behavior.
- Live records should carry `sourceKind: 'live'`.
- Mock records should carry `sourceKind: 'mock'`.
- Do not silently mix mock data into default live mode.

## Stremio-Specific Guidance
- Keep manifest IDs and catalog IDs stable unless a breaking change is intended.
- Current catalogs:
  - `rerelease`
  - `imax-returning`
- `meta` and `catalog` are both expected resources now.
- If detail screens look empty, inspect the addon `meta` response first.
- If manifest shape changes, verify install/upgrade behavior in Stremio v4.4.
- Standard addons cannot force Home/Board rows above Stremio system rows; do not attempt unsupported priority hacks.
- The practical ceiling is addon install order plus `manifest.catalogs` order.
- If Home rows disappear, check cold `catalog` latency before assuming a manifest or poster bug.

## UI / Content Notes
- The configure page is intentionally custom and lightweight.
- Preserve the current visual direction; avoid generic restyling.
- Turkish UI strings must use correct Turkish characters and spelling (`Ö, Ü, Ğ, Ş, İ, Ç, ı, ğ, ş, ç, ö, ü`); do not use ASCII fallbacks like `Once`/`Yakinda` when the language is Turkish.
- Catalog rows prefer direct lightweight poster URLs; do not depend on runtime badge rendering for Home/Board reliability.
- Keep fallback-to-original-poster behavior intact.
- Prefer lightweight catalog posters; Stremio catalog cards are more reliable with small static-like images.
- Avoid large runtime-generated catalog posters; prefer small direct poster URLs whenever possible.
- If poster strategy changes, verify the catalog JSON poster URLs directly before relying on Stremio UI checks.

## Environment And Cache Notes
- Default host: `127.0.0.1`
- Default port: `7000`
- Dev cache durations are shorter than production cache durations.
- Persisted movie cache is stored in the OS temp directory.
- If you suspect stale data, clear the temp cache file and restart the server.
- On cold start (no memory or disk cache), the addon waits for live API responses before returning catalog data.
- The configure page shows a loading state (animated stats, disabled filters, loading dots) while waiting for data.

## Files Worth Reading Before Changes
- `src/addon.ts`
- `src/index.ts`
- `src/providers/catalogData.ts`
- `src/providers/live/boxOfficeTurkey.ts`
- `src/providers/live/paribu.ts`
- `src/lib/catalog.ts`

## Handoff Checklist
- Read the touched module and nearby helpers before editing.
- Prefer extending existing providers/utilities over adding duplicate abstractions.
- Run `yarn build` after non-trivial changes.
- If addon responses changed, validate the relevant local `curl` endpoint.
- If manifest, catalog, or meta behavior changed, also verify in Stremio v4.4.
- Update `README.md` when setup, runtime, or install behavior changes.
- For Home/Board regressions, validate a cold `catalog` request and a warm `catalog` request separately.
- For poster changes, validate direct image responses with status code, size, and timing before relying on Stremio UI checks.
- If you change live providers, confirm partial upstream failures still leave the addon usable from cache or bootstrap data.

## Release And Deploy Rules

### Versioning
- Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.
- Patch (`0.1.1` → `0.1.2`): bug fixes, UI tweaks, loading state improvements.
- Minor (`0.1.2` → `0.2.0`): new features, new providers, new catalog types.
- Major (`0.2.0` → `1.0.0`): breaking manifest changes, catalog ID renames, config schema changes.
- Version must be updated in **three places** simultaneously:
  1. `package.json` → `"version"`
  2. `src/config/constants.ts` → `ADDON_VERSION`
  3. Git tag → `v{version}` (e.g. `v0.1.2`)
- All three must match exactly.

### Pre-Release Checklist
1. Run `yarn build` — must pass with zero errors.
2. Verify changed endpoints locally with `curl` (see Useful Manual Validation).
3. If configure page changed, open `http://127.0.0.1:7000/configure` in a browser.
4. If manifest or catalog behavior changed, verify in Stremio v4.4.
5. Ensure no `.env`, credentials, or secrets are staged.

### Release Steps
```bash
# 1. Update version in package.json and src/config/constants.ts
# 2. Build
yarn build
# 3. Stage, commit
git add -A
git commit -m "feat: v0.X.Y — short description of changes"
# 4. Tag
git tag v0.X.Y
# 5. Push commit and tag together
git push origin main --follow-tags
```

### What Happens After Push
- **CI workflow** (`.github/workflows/ci.yml`): runs `yarn build` on every push to `main`.
- **Release workflow** (`.github/workflows/release.yml`): triggers on `v*` tags, creates a GitHub Release with auto-generated notes.
- **Render**: auto-deploys from `main` branch on every push. No manual deploy hook needed.

### Post-Deploy Verification
```bash
curl https://back-on-screen.onrender.com/health
curl https://back-on-screen.onrender.com/manifest.json
```
- Confirm `version` in manifest matches the released version.
- Confirm `catalog.cacheSource` in health response becomes `refresh` after live data loads.
- Open `https://back-on-screen.onrender.com/configure` and verify UI.
