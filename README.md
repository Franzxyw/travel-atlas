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
| China province → prefecture → county/district | [Alibaba DataV.GeoAtlas](https://geo.datav.aliyun.com/), fallback [ChinaGeoJson](https://github.com/zhChuXiao/ChinaGeoJson) | One parent region per request. No China boundary dataset is redistributed in this repository. Provider availability and original data-use terms apply. Province-direct municipalities can skip a level. |
| Germany Bundesland → Landkreis / Kreisfreie Stadt → Gemeinde | BKG VG250 via [juliuste/german-administrative-areas](https://github.com/juliuste/german-administrative-areas), revision `c3670defbbff4f4281f0b88b601177cbba4bb850` | Included as separate per-parent bundles: 16 states, 401 districts, 10,997 municipalities. Historical, deprecated source; may not reflect current reorganizations. UTM32/GRS80 coordinates converted to WGS84, simplified and rounded. Maritime duplicates excluded. IDs retain AGS codes. |
| Other countries | [geoBoundaries gbOpen API](https://www.geoboundaries.org/api.html) | Requested country and administrative level only; up to ADM5 where available. Loads simplified GeoJSON, capped at 16 MB. Subregions are matched to a parent by representative-point containment, which can be imperfect for enclaves or conflicting snapshots. This geometry association never infers visits. |

German independent cities may repeat as a single municipality at the next level. Urban boroughs/neighborhoods below Gemeinde are not included in this MVP. For a name shared by a city and its surrounding district, the district is labeled `(Landkreis)`.

China fallback: the national province collection comes from the [Civitasv DataV mirror](https://github.com/Civitasv/DataV_GeoJSON/blob/master/geojson_full/100000_full.json); province/city child collections use ChinaGeoJson. A country-outline file is not a province collection. Both primary and fallback responses are validated for increasing administrative depth and matching parent codes before caching. Run `node tests/china-fallback.mjs` against the production preview to test the complete China → Jiangsu → Nanjing → district workflow with every primary boundary request deliberately blocked (desktop Chromium and mobile WebKit).

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
