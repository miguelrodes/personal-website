# Investor Portal portfolio demo

Open [the local portfolio](http://127.0.0.1:5173/), expand **Aldea Investor Portal**, and select **Explore Demo** near the project outcome. The poster image opens the same overlay. The same button is available on the existing project-detail page. The button opens an overlay without changing the current URL.

To start it again, run `npm install` followed by `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` from this repository. The predev/prebuild scripts generate the isolated reporting stylesheet.

## Extraction and files

The source was read from `diaspora-bloom-simulation-preview-local` at `eaa5309b3048ce95bef49888efe341e4f8a7635b`. That repository was not modified.

- `src/App.tsx`: launch button and modal state in `MediaActions`.
- `src/InvestorPortalModal.tsx` and `.css`: native modal dialog, persistent header, lazy boundary, scroll lock/restoration, keyboard focus and dismissal.
- `src/demo/`: extracted `FundReportSections`, `FundScatterChart`, `PortfolioMap`, their UI primitives and utilities, the existing reporting mock generator and sanitized qualitative snapshot. Only Overview, Portfolio and Exposure render. The wrapper opens directly into the Fund I, 2026 Q2 report with a required mock-only provider; fund/quarter selectors and the section navigation are omitted.
- `scripts/build-demo-styles.mjs`: builds and scopes Tailwind styles to `.aldea-demo`, retaining Aldea's 16px sizing and Onest typography. Small muted text is darkened for readability. Generated CSS is ignored and rebuilt automatically.
- `scripts/audit-demo.mjs`: follows runtime imports, checks the dependency allowlist, rejects network/persistence clients and production endpoints, inspects built assets, and verifies stylesheet scope.
- `package.json`, lockfile, `.gitignore`, `tsconfig.app.json`, and `vite.config.ts`: dependencies, scripts, the isolated import alias and build integration.
- `tests/investor-demo.spec.ts`, `tests/investor-mock.spec.ts`: modal behavior, complete drill-downs, mock arithmetic, data failures and network isolation. `tests/drilldown.spec.ts` also recognizes the existing Investor Portal image-pair layout.

Pre-existing edits to portfolio content, styles, images and tests were retained.

Runtime additions are Radix checkbox/popover/scroll-area/select/tooltip, `lucide-react`, `clsx`, `tailwind-merge`, `@fontsource/onest`, `react-simple-maps`, `world-atlas`, and the smaller `plotly.js-basic-dist-min` scatter build. Build additions are Tailwind's CLI, Tailwind, its animation plugin, PostCSS and chart/map typings. Unused original UI and Markdown dependencies were removed.

The modal header contains the original Aldea wordmark and a ghost Close button. The wordmark is copied unchanged from `src/assets/aldea-logo.png` in the source checkout to `public/images/aldea-logo.png`; the source app uses this transparent PNG and does not provide an SVG version of the wordmark. Header, scroll area and content share the report overview’s `#F4F1EB` background.

## Isolation and included behavior

The seed remains `ALDEA_PUBLIC_DEMO_2026`. All ten supported fund/quarter reports and their histories are generated locally from the existing sanitized qualitative snapshot. Real permitted names, descriptions, fund-company relationships and logo filename metadata remain; quantitative values come from the deterministic generator. byFounders and Lovable retain the source mock priority behavior.

The runtime provider supports only `kind: "mock"` and has no default live fallback. Snapshot schema checks run before generation. Report validation rejects empty/invalid packages, non-mock package IDs, source documents and non-finite values. Loading/rendering failures show **Demo temporarily unavailable.** No production client, report loader, environment configuration, authentication or persisted data is imported. There are no external requests from the demo: map geometry, fonts and code are all local. Company website identities are displayed without outbound navigation; logos are not remotely fetched.

Included interactions cover full KPIs and Quarter movement, fund and company tables/profiles, both scatter levels, trajectories, search, sector/location filters, sorting, geography/industry/stage exploration, map regions and country drill-downs. The original company scatter wheel-pan, trackpad-pinch and two-touch-pinch handlers are retained. Escape dismisses nested controls first; dropdowns are constrained to the modal's scroll area. Closing unmounts charts, observers and listeners and restores page focus/scroll. Reopening starts at Fund I, 2026 Q2.

Intentionally excluded: Portfolio Highlights, Financials, Fund Info and later sections; Simulation; administration/view switching; auth; upload/edit/review/publish workflows; save/print/download controls; Helios/app navigation and all backend access.

## Original extraction verification

These results describe the initial integration before the later header and selector simplification. The demo UI tests now reflect the fixed report entry view.

- `npm run build`: passed, including TypeScript project checking and the production Vite build.
- `npm run demo:audit`: passed for 24 local runtime modules/assets, six built JS/CSS assets, and all generated CSS selectors. The qualitative snapshot and scatter gesture utility match their approved source files byte for byte.
- `npm run lint`: exit 0, no errors; 42 React/Hook warnings remain in the extracted map/report/chart components. They include state synchronization in effects, render-time refs and dependency recommendations. They were not suppressed.
- Final `npm test -- --workers=2`: **51 passed, 6 failed, 1 skipped**. All 28 new demo/data checks passed, as did all ten project expand/collapse checks. The skipped check is the existing desktop-only contents navigation test on mobile.
- The six failures are existing contrast checks on `/`, `/contact`, and `/work/aldea-investor-portal`, each on desktop and mobile. The same three page failures reproduce on desktop in a temporary copy with the new modal import, launch UI and state removed. Examples include pale social/footer links and animated content/navigation during the scan. The surrounding site's appearance was preserved.
- Demo-specific checks passed for lazy loading; same URL/window; exactly three reporting sections; complete quarter movements; byFounders/Lovable detail; trajectories, wheel pan and both pinch paths; search/filter/sort; both funds and supported quarters; exposure/map drill-downs; chart resize and reopen; close/Escape/nested controls; focus/inactive background; scroll restoration; narrow layouts; and unchanged surrounding computed styles after closing.
- Fresh unauthenticated browser contexts recorded zero external HTTP requests through the tested demo paths. Missing and invalid mock modules both showed the required unavailable message. Axe found no WCAG 2 A/AA or 2.1 AA violations in the exercised modal exposure state. This is a targeted automated check, not a full accessibility certification.

The demo and Plotly remain separate lazy chunks (approximately 409KB and 359KB gzipped); Vite reports the expected large-chunk warning. The initial portfolio JavaScript is approximately 84KB gzipped. Physical mobile hardware and Safari-specific gestures have not been tested; mobile checks use Chromium with iPhone-sized/touch emulation and synthetic pinch events. No commit, push or deployment was performed.

## Header simplification verification

After replacing the header with the local Aldea wordmark and ghost Close button and removing fund/quarter selection and section navigation: `npm run build`, `npm run demo:audit`, and all 10 `tests/investor-demo.spec.ts` desktop/mobile checks passed. `npm run lint` completed with zero errors and the existing extracted-component warnings. Browser checks verify the removed controls, matching header/content background colors, logo, borderless close control, opening/closing, focus and scroll restoration, fund/company exploration, exposure controls, and missing/invalid data handling.

## Shared chart navigation

The fund-of-funds, fund-comparison, and underlying-company MOIC scatters share `src/demo/lib/chartGestures.ts`. Ordinary wheel or trackpad scrolling pans the data axes. Trackpad pinch/Ctrl-wheel, two-touch pinch, and Safari gesture events zoom the Y range around the pointer using the underlying-company scatter's sensitivity and acceleration. The canvas fits its frame, and axis ticks update with the visible domain. Reset view and double-click restore the initial ranges.

Both geographic exposure maps use the same input handler through `MapNavigation.tsx`. Pinch zoom anchors the geography beneath the pointer, accounting for SVG letterboxing and the modal's CSS scale. Ordinary scrolling pans the map, and zoom remains bounded between 1.8 and 6. Country filters, region presets, mouse dragging, and one-finger map dragging remain available. Reset view restores world navigation while preserving the selected country.

Verification: production build and demo audit passed for 26 local modules/assets; lint completed with zero errors and the existing extracted-component warnings. Six new desktop/mobile navigation checks cover panning, pointer anchoring, shared pinch speed, domain/zoom limits, reset, country filters, and mouse dragging. Four existing chart/exposure integration checks passed, including trajectories, fund/company exploration, filters, and the modal exposure accessibility scan. Mobile uses Chromium touch emulation; Safari gesture events are exercised synthetically in Chromium, rather than on Safari hardware.
