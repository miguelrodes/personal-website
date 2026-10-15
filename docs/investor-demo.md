# Investor Portal synthetic demo

The homepage **Explore Demo** link and the standalone Investor Portal page open the synthetic demo in a modal. The outcome poster is also clickable. The modal loads the isolated demo on demand; all names, narratives, and financial figures are fictional.

## Local review

Run `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`, then open:

[Local synthetic demo preview](http://127.0.0.1:5173/tests/fixtures/investor-demo.html)

Select **Preview synthetic demo**. This test fixture is a separate Vite development entry and is not an input to the production build. It permits reviewing the modal without navigating the portfolio. Escape or a click outside the desktop dialog dismisses the preview.

## Entirely fictional data

The header and all reports use **Aldea Synthetic Fund**, with code `SYNTHETIC` and slug `synthetic-fund`. There are five invested funds:

| Holding | Companies | Names |
| --- | ---: | --- |
| Fund A | 32 | Fund A 1–Fund A 32 |
| Fund B | 34 | Fund B 1–Fund B 34 |
| Fund C | 31 | Fund C 1–Fund C 31 |
| Fund D | 35 | Fund D 1–Fund D 35 |
| Fund E | 33 | Fund E 1–Fund E 33 |

All 165 identities, investment relationships, managers, strategies, business descriptions, operating updates, and financial figures are invented. The previous qualitative snapshot has been deleted, not renamed or sampled. No original record IDs, company domains, LinkedIn URLs, logos, biographies, or former names are used. Actual country/city labels exist only to demonstrate geography; assignment of those places to fictional entities is invented. Sectors, industries, locations, stages, and statuses vary across the example portfolio.

- `src/demo/mock-data/syntheticPortfolio.ts`: the explicitly invented qualitative catalogue and fund specifications.
- `src/demo/mock-data/investorPortal.ts`: deterministic financial scenarios using seed `ALDEA_FULLY_SYNTHETIC_V1`.
- `src/demo/validateMockData.ts`: rejects unknown identities, missing entities, external identity metadata, invalid numbers, or broken financial reconciliations.
- `src/demo/InvestorPortalDemo.tsx`: opens the latest synthetic report (2026 Q2) and supplies its local history to the reporting UI.

## Financial model

Six quarter-end reports run from 2025 Q1 through 2026 Q2. A generated 2024 Q4 opening position supplies the first NAV bridge. Synthetic company investment dates precede the reports and follow each invented fund's first close; founding years precede investment.

Company investment cost, valuations, staged follow-on calls, partial cash realizations, full exits, and write-offs are generated once from the fixed seed. A terminal exit or write-off stops further investment. Exited and written-off positions have zero residual value and ownership; written-off positions have no proceeds. Active companies can appreciate or decline. Revenue, post-money values, stages, and operating commentary follow each company's simulated state.

Company amounts are attributed look-through exposures in EUR. They sum exactly into each fund's investment cost, residual value, and distributions, then into the wrapper's KPIs and strategy total. Geography and industry exposure buckets use these same company rows. TVPI = DPI + RVPI; company MOIC uses residual value plus realized cash divided by invested cost. IRR solves the dated synthetic contribution/distribution ledger with terminal NAV. Historical chart endpoints use the same quarterly report values.

The model deliberately excludes separate wrapper fees, carried interest, debt, and other assets. Those bridge rows are zero and gross/net returns therefore coincide. This simplifying assumption is described in report notes; it does not represent actual Aldea economics. Post-money USD figures use an illustrative constant EUR/USD rate of 1.10. ARR is an invented scenario estimate, not an observation.

## UI and isolation

The extracted reporting components retain Overview, Portfolio Explorer, and Exposure, including fund/company details, searches, filters, maps, and scatter trajectories. Fund, company, and map views all receive the same new records. Shared zoom and pan behavior is retained. The header uses the local Aldea wordmark with the synthetic fund title.

The provider supports only `kind: "mock"`, with no live fallback. The demo imports no production client, authentication, environment credentials, external data loader, or persistence service. Fonts and map geometry are local. There are no external company links or remote logos. Public entry points load only this synthetic dataset. The production build excludes the local review fixture and its launch button.

## Checks

- `npm run build`: TypeScript and production build.
- `npm run demo:audit`: source dependency boundary, local-only data access, scoped styles, absence of the legacy snapshot, and exclusion of the local review fixture from built assets.
- `npx playwright test tests/investor-mock.spec.ts --project=laptop`: fictional identities/counts, cash-flow and NAV reconciliation, IRR, timeline/status consistency, exposure buckets, chart history, and rejection of substituted data.
- `npx playwright test tests/investor-demo.spec.ts tests/investor-chart-navigation.spec.ts`: desktop/mobile public and local launches, synthetic fund/company details, maps, chart navigation, local requests, and invalid/missing-data behavior.

Existing portfolio screenshot assets, descriptive case-study content, and walkthrough media are outside this interactive data replacement and have not been rewritten. The public launch points are enabled only for this fictional dataset.
