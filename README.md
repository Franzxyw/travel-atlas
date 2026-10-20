# Travel Atlas

A mobile-first travel reconstruction tool built with React, TypeScript, Vite and Leaflet. The app and repository are public; personal visit records stay in each browser. Start with an empty atlas: select real administrative polygons, explore smaller divisions, and explicitly record **Visited**, **Uncertain**, or **Transit-only**. No home cities, shortcuts, or personal travel history are seeded.

Live application: https://franzxyw.github.io/travel-atlas/

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The default URL path is `/travel-atlas/`. For deployment at an origin root, set `ATLAS_BASE_PATH=/` when building (PowerShell: `$env:ATLAS_BASE_PATH='/'`). The private Sites deployment uses the root path; the optional Pages build uses `/travel-atlas/`.

## Map workflow

1. Tap a country polygon (or its corresponding list row).
2. Choose **Explore divisions**. Tap a smaller polygon, and continue drilling down as needed.
3. Choose a visit status. **Only the explicitly selected region is recorded.** A province record means a visit somewhere in that province; it does not confirm any city or district. A dashed parent indication means it contains manually recorded places and never creates a visit record.
4. Use **Select several**, select polygons/list rows, then choose a status. **Select shown** explicitly selects every row in the current filtered list. Each batch can be undone as one operation (40 recent operations in this session).
5. Search names, common aliases, or pinyin. Search navigates to a place without marking it. Notes can be added after recording a visit.

English is the default interface language. The switcher persists Simplified Chinese or English locally. Geographic names are independent of UI language. China uses Chinese names; Germany uses German names, with aliases including München / Munich / 慕尼黑. Where geoBoundaries identifies Bozen or Bolzano, both variants are displayed. Global datasets may lack native names or multilingual aliases; the interface discloses this limitation. The search catalog covers countries plus China and Germany's divisions; other countries' subregions become searchable when loaded. There is no global geocoding service or autocomplete in this MVP.

## Data, geometry and limitations

Boundaries describe source snapshots, **not a current official administrative registry**. They are for personal recollection, not navigation or authoritative boundary claims.

| Coverage | Source | Loading |
| --- | --- | --- |
| World country overview | Natural Earth, distributed by `world-atlas` | Small initial overview; local/native names from `world-countries` where available. Date-line rings repaired. Low-resolution countries may omit small islands. |
| China province → prefecture footprint → county/district | **Default: same-origin, licensed geoBoundaries historical bundles**. [geoBoundaries CHN ADM1](https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM1/) (2019, underlying source Public Domain), [CHN ADM3](https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM3/) (2017, ODbL 1.0). | One local parent bundle per request; no external China boundary service is required for covered regions. City shapes are dissolved footprints of matched historical counties, not an authoritative city-boundary layer. Coverage gaps are shown. The explicit **China boundary data → External snapshot** option retains DataV / GitHub-provider loading for missing or changed divisions. Province-direct municipalities skip the city level. |
| Germany Bundesland → Landkreis / Kreisfreie Stadt → Gemeinde | BKG VG250 via [juliuste/german-administrative-areas](https://github.com/juliuste/german-administrative-areas), revision `c3670defbbff4f4281f0b88b601177cbba4bb850` | Included as separate per-parent bundles: 16 states, 401 districts, 10,997 municipalities. Historical, deprecated source; may not reflect current reorganizations. UTM32/GRS80 coordinates converted to WGS84, simplified and rounded. Maritime duplicates excluded. IDs retain AGS codes. |
| Other countries | [geoBoundaries gbOpen API](https://www.geoboundaries.org/api.html) | Requested country and administrative level only; up to ADM5 where available. Loads simplified GeoJSON, capped at 16 MB. Subregions are matched to a parent by representative-point containment, which can be imperfect for enclaves or conflicting snapshots. This geometry association never infers visits. |

German independent cities may repeat as a single municipality at the next level. Urban boroughs/neighborhoods below Gemeinde are not included in this MVP. For a name shared by a city and its surrounding district, the district is labeled `(Landkreis)`.

### China local snapshot: licence, coverage and updates

DataV mirror repositories do not establish permission to redistribute their upstream polygons. **No DataV polygon is bundled.** The local county geometries instead come from geoBoundaries' licensed OpenStreetMap / Lee Beryman snapshot, pinned at Git revision `9469f09`; province geometries come from its Public Domain Wikimedia source. Native names, six-digit codes, parent relationships and centre/centroid points are factual fields from the MIT-licensed ChinaGeoJson catalog at `7aa2c5fabc6a892015625898c3482874b233f9de`; its original MIT notice is preserved. Geometry is not taken from that catalog or from DataV.

- 356 per-parent GeoJSON bundles; 2,366 verified historical county/code matches. Each match requires the same transliterated name (or one of three explicit documented aliases) **and** a matching catalog centre/centroid inside the source polygon. No nearest-neighbour guessing is used. Successful matches retain existing `CN:123456` record IDs.
- 498 source polygons cannot be unambiguously matched; 474 catalog county rows have no matched local polygon. The two counts refer to different snapshots and are not interchangeable. They are listed in `public/data/china/crosswalk.json`, together with every accepted code/source-ID mapping. **Local coverage is incomplete**, including reorganized/renamed districts and some multilingual names. Counts and historic/derived-shape warnings are displayed in the map panel. Use **External snapshot** when appropriate; switching sources never edits visits. Search results may refer to catalog places not present locally, producing an actionable source-switch error.
- Province polygons represent 2019. County polygons represent 2017. Prefecture footprints are unions of the matched counties grouped by catalog parent; they can contain gaps and do not establish present-day or historical official prefecture borders. Source-specific border/coastline differences remain. The source's mislabelled “Guangzhou Province” is explicitly mapped to the catalog's 广东省 / `440000`. Province-direct municipalities are served as district bundles. Uncovered provinces remain selectable and can use the external option.
- 江苏省 has all 13 prefecture footprints, and 南京市 has all 11 catalog districts, including 玄武区 / `320102` and 六合区 / `320116` (explicit source spelling “Luhe”). This is a coverage check, **not** a claim that 2017 geometry is current.
- Total geometry-bundle size is about 19.4 MB, but the browser never downloads it all at once. The largest single bundle is about 411 KB uncompressed; `scripts/check-china.mjs` enforces a 500 KB ceiling. It verifies SHA-256 hashes, parent links, unique codes, WGS84 coordinates and absence of travel-status/note fields. Only the three requested parent layers load for the China → Jiangsu → Nanjing → district flow. Source manifests and crosswalk details load only when opened explicitly.
- Attribution: © OpenStreetMap contributors, Lee Beryman, geoBoundaries / William & Mary geoLab. The derived county/city/crosswalk database is available under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/); province geometries retain their Public Domain provenance. These **data** terms are separate from application code. Licence notices appear in `public/data/china/LICENSE.txt`, `CATALOG-LICENSE.txt`, map attribution and the privacy/data page. The open JSON files, source links and transformation script provide the derived database and construction method.

To rebuild reproducibly, run `npm run data:china` and `npm run data:check`. Pinned inputs download into ignored `.cache/china/`; generated bundles, checksums and crosswalk are committed under `public/data/china/`. No raw source zip or personal record is used. To update: deliberately change source revisions in `scripts/prepare-china.mjs`, review licences and source metadata, refresh the cache inputs, rerun generation, inspect every added/removed code and rejected match in the crosswalk, rerun checks and browser tests, and commit the new manifest and bundles together. The generator rejects unexpected stale files; review obsolete paths before removing any. The generator's explicit Nanjing/Jiangsu coverage assertions must pass or be deliberately revised with evidence.

Run `node tests/china-fallback.mjs` against the production preview: it blocks DataV, **both** GitHub boundary mirrors and geoBoundaries, then verifies the complete map-selection workflow in desktop Chromium and mobile WebKit, only three same-origin lazy downloads, and no automatic parent/child visit creation. Set `ATLAS_TEST_URL` to check a deployed build. `src/data.test.ts` also covers explicit external primary-source failure, invalid hierarchy, duplicates, missing-local-asset retry and cache separation. A missing/invalid local bundle does not silently contact external services; its error directs the user to the explicit external source option.

Public source attribution: © GeoBasis-DE / BKG, data via Julius Tens' conversion; [Data licence Germany – attribution – version 2.0](https://www.govdata.de/dl-de/by-2-0). The converted German geometries in `public/data` are derived data under that licence. Natural Earth is public domain. Other geoBoundaries layers retain the licence and year reported by their metadata (shown in the selected region's Source details). OpenStreetMap map tiles: © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright). Do not bulk download map tiles.

Generated Germany bundles are already included, so normal builds do not need upstream access. To regenerate them, run `npm run data:germany`, then `npm run data:world`, then `node scripts/prepare-search.mjs`. Search-name catalog generation reads public Chinese place names, not travel history. Upstream snapshot changes should be deliberately reviewed before replacing boundary IDs or administrative parents.

## Privacy, persistence and ChatGPT

- **The repository and GitHub Pages app are public.** Source code and generic public boundaries contain no private visit records. Each visitor starts with their own empty atlas; nobody can read another browser's local records through this app.
- Records, notes and interface language live in browser `localStorage`. No analytics, accounts, travel upload or cloud synchronization is implemented. iPhone/iPad/desktop each keep a separate atlas until you transfer a JSON backup. Private browsing and clearing site data can erase records.
- **Export JSON backup** downloads a versioned, portable record. **Import JSON** validates the entire backup before merging; matching IDs are replaced. Undo can reverse an import. Back up regularly; local storage is not a backup.
- **Copy for ChatGPT** or **Download travel context** creates an explicit plain-text handoff that distinguishes confirmed, uncertain, and transit-only places. ChatGPT does not automatically read this site's browser storage.
- External tile/boundary services receive IP addresses and requested map areas. They do not receive your visit statuses or notes. Source names and network errors are displayed as text, never rendered as HTML.
- Files under `private/`, environment files, travel-history/backup JSON filenames, build output, and test artifacts are ignored. Never place private data under `public/`.

## Alternative private deployment

The `.openai/hosting.json` manifest binds this app to its owner-private Sites project. The production deployment is built at `/`, with only the static build artifact published. Sites enforces owner access before serving the app. A private code repository by itself is not website access control.

## Optional GitHub Pages automation

GitHub Actions runs the build and unit tests. Pages deployment is enabled for this public repository through `ENABLE_GITHUB_PAGES=true`; pushes to `main` automatically publish the app. Set this variable to `false` to stop subsequent Pages deployments. Normal Pages sites can be public even when their code repository is private; private Pages access requires eligible Enterprise organization hosting. See [GitHub's visibility documentation](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).

If you later deliberately choose compatible GitHub Pages hosting:

1. Repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. If your Enterprise organization supports private Pages, ensure the Pages visibility is set to private before enabling deployment. A normal personal account private repo does not provide this access control; use the existing private Sites deployment for this app.
3. **Settings → Secrets and variables → Actions → Variables → New repository variable**: `ENABLE_GITHUB_PAGES` = `true`.
4. Push to `main` or manually run **Deploy to GitHub Pages (explicit opt-in)**. It builds with `/travel-atlas/` and deploys through official Pages actions.

Nothing in the app relies on a secret embedded into JavaScript, and a client-side password is not used as access control.

## Verification

`npm test` checks parent/child isolation, batch edits, backup validation and context export. Production builds are checked at `/travel-atlas/` and at `/` for private hosting. `node tests/e2e.mjs` uses an already running production preview at port 4173 and exercises Chromium desktop plus WebKit with iPhone/iPad viewports, persistent language, hierarchy, bulk statuses, undo and multilingual search. Install test browsers with `npx playwright install chromium webkit` first. WebKit on Windows with device emulation is **not a physical iPhone/iPad Safari test**; real-device verification remains necessary before claiming native Safari validation. External services may fail or lack coverage, in which case the app reports an error rather than inventing regions.
