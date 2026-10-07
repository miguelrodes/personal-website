# Miguel Rodés Knuth — Portfolio

A first working draft for product management, product design, and full-stack development applications. The homepage leads with the profile, contact actions, and four separate case studies, grouped under Aldea Ventures and Independent work.

## Run locally

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). If that port is occupied, use the local URL printed by Vite.

```sh
npm run build
npm run preview
```

The build runs TypeScript checks followed by Vite and writes `dist/`. The preview command serves the production build locally; use the URL it prints.

## Verify

```sh
npm run build
npm run lint
npx playwright install chromium
npm test
```

`npm run lint` runs Oxlint. `npm test` runs the Playwright browser checks; install Chromium before the first run.

Draft verification: build/type checking and lint passed, along with all 14 Chromium browser tests. Automated checks cover the homepage and all four direct project URLs and refreshes, exact case-study copy/headings, missing-media states, WCAG A/AA accessibility scans, keyboard focus/navigation, reduced motion, 320px overflow, and the résumé checksum. Laptop (1366 × 768 and 1440 × 900) and mobile (390px) screenshots were also visually inspected. A separate plain static server successfully served all five production pages and their assets without a Vite fallback. Safari and Firefox have not been tested.

For visual review, inspect a laptop viewport and a narrow mobile viewport. Check the profile/contact/work order, direct case-study URLs, keyboard focus, email and résumé links, reduced motion, absent horizontal overflow, and honest states for unavailable media.

## Structure and content

The site uses React, TypeScript, and Vite, with CSS custom properties and a locally bundled Manrope font. Native anchors handle navigation and external actions. No authentication, database, CMS, or contact-form backend is required.

`src/content.ts` contains the profile, project metadata, all case-study prose, image paths, alternative text, captions, and external media URLs. Every case study uses exactly five sections: Intro, The problem, Context & constraints, Process, and Outcome. Change `profile.banner.enabled` to show or hide the optional shallow banner.

The visual system uses white surfaces, deep ink type, thin neutral rules, blue for Aldea work, and orange for KUSPACE. Open rows and rectangular image placeholders keep the composition light. A restrained gutter guide follows the page sections, with reduced-motion support.

All image paths start as `null`. Supply real assets through each visual’s `src` field, retaining appropriate alternative text and reserved aspect ratios. Missing external media URLs also remain `null`; supply actual URLs only when available. Unavailable media is presented as a static state without a fake launch or play destination. Simulation and Helios have images only, and their unconfirmed technology stacks are omitted.

The supplied résumé is copied unchanged to `public/miguel-rodes-knuth-resume.pdf` and served at `/miguel-rodes-knuth-resume.pdf`.

## Routes and static hosting

The four project routes are:

- `/work/aldea-investor-portal`
- `/work/aldea-investor-simulation`
- `/work/aldea-helios`
- `/work/kuspace`

Vite’s development and preview servers provide a single-page-app fallback for direct requests. For the production build, `vite.config.ts` also writes `dist/work/<slug>/index.html` for every project, with its own title and description, plus `dist/404.html`.

When a later deployment is authorized, serve the contents of `dist/` at the domain root with directory-index serving enabled. This lets direct project links and refreshes resolve to their generated HTML files. If the host does not support directory indexes, configure `/work/*` requests to fall back to `/index.html`, and configure the host’s not-found handling for `404.html`. Public deployment is outside this draft and is not configured or authorized.

## Assets and URLs still needed

Shared images may be reused between preview and case-study slots. The exact labels, captions, and aspect ratios live in `src/content.ts`.

| Area | Images needed | External URLs needed |
| --- | --- | --- |
| Profile | Portrait; optional shallow banner, currently disabled | None |
| Aldea Investor Portal | Homepage preview; five section visuals for fund overview, quarterly comparison, company drill-down, sample reporting output, and portfolio exploration; demo poster; Loom walkthrough poster | Separately hosted synthetic-data demo; Loom walkthrough |
| Aldea Investor Simulation | Homepage preview; five section visuals for exit assumptions, holdings and distributions, scenario assumptions, projected J-curve, and scenario output | None for this draft |
| Aldea Helios | Homepage preview; five section visuals for company intelligence, company-record relationships, the existing company view, an illustrated platform contribution, and company-record mapping | None; images only |
| KUSPACE | Homepage preview; five section visuals for event workspace, scheduling and lineups, budgets and guestlists, ticket checkout, and the event-management MVP; demo poster; walkthrough poster | Product demo; public repository; Loom walkthrough |

The investor portal application remains a separate project/repository; it is neither merged into this portfolio nor embedded in an iframe. Before any future public demo deployment, inspect its source and verify synthetic-data isolation: no production reads, writes, document exports, fallback services, or secret/service-role credentials in client code. Prefer bundled synthetic fixtures, or an isolated synthetic backend only if necessary, without weakening the real portal’s authentication or access controls.

## Continue the work

Draft branch: `feat/portfolio-first-draft`. Read `git log -1 --oneline` for the current commit and check the actual remote state before reporting a push.

Ready-to-paste continuation prompt:

> Continue the personal portfolio in this repository on `feat/portfolio-first-draft`. Read the repository instructions, README, `src/content.ts`, `git status`, and `git log -1 --oneline` before editing. Preserve unrelated changes. The first draft has four case studies and intentional image/media placeholders; keep the exact five-section template and ownership distinctions. Add supplied assets or URLs only, rerun the documented verification commands, and inspect laptop and mobile layouts. Keep the investor portal app separate and verify synthetic-data isolation before any future public demo deployment. Public website deployment requires a new explicit request.
