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

Latest verification (October 7, 2026): build/type checking, lint, and `git diff --check` passed. Of 30 Chromium browser checks, 26 passed, two homepage accessibility checks failed on the requested lilac social links against white (2.39:1 contrast), one was skipped because the contents guide is hidden on mobile, and one timed out during browser setup and passed on an isolated rerun. The contrast failures remain open; the requested colors have been preserved. Checks cover homepage/contact/project routes and refreshes, case-study copy, drilldown opening/closing and top alignment, keyboard focus, reduced motion, narrow layouts, and the résumé checksum. Desktop and mobile drilldown screenshots were visually inspected. Safari and Firefox have not been tested.

For visual review, inspect a laptop viewport and a narrow mobile viewport. Check the profile/contact/work order, direct case-study URLs, keyboard focus, email and résumé links, reduced motion, absent horizontal overflow, and honest states for unavailable media.

## Structure and content

The site uses React, TypeScript, and Vite, with CSS custom properties and a locally bundled Manrope font. Native anchors handle navigation and external actions. No authentication, database, CMS, or contact-form backend is required.

`src/content.ts` contains the profile, project metadata, all case-study prose, image paths, alternative text, captions, and external media URLs. Every case study uses exactly five sections: Intro, The problem, Context & constraints, Process, and Outcome. Change `profile.banner.enabled` to show or hide the optional shallow banner.

The profile uses a white surface and dark-blue text. Aldea work uses burgundy with lilac accents; independent work uses dark blue with mint accents. Project details keep their section’s colors, thin rules, and open layout. The right-side contents guide tracks the current project, with reduced-motion support.

The supplied portrait and coastal banner are in `public/images/` and configured in `src/content.ts`. The banner is enabled behind the name and meets the portrait edge on desktop; CSS crops it horizontally without modifying the original image, using the visual’s editable `objectPosition`. Its empty alternative text marks this background as decorative. The portrait retains descriptive alternative text and a reserved 4:5 ratio.

All four homepage project previews use supplied images in `public/images/`; original assets and cropped variants are retained. Clicking an image opens a larger lightbox. The five section visuals within each case study remain placeholders with `null` paths. Supply real assets through each visual’s `src` field, retaining appropriate alternative text and reserved aspect ratios. The Investor Portal has a supplied Loom walkthrough link. Other missing external media URLs remain `null`; KUSPACE’s preview Demo label is inactive until its URL is supplied. Unavailable media is presented as a static state without a fake launch or play destination. Simulation and Helios have images only, and their unconfirmed technology stacks are omitted.

The supplied résumé is copied unchanged to `public/miguel-rodes-knuth-resume.pdf` and served at `/miguel-rodes-knuth-resume.pdf`.

## Routes and static hosting

On the homepage, the project title and “View project” controls expand the case study in place. The preview scrolls out of view as the details unfold at the top of the screen. Internal horizontal rules and image outlines expand from the center on every opening, and the left guide line draws downward to mark the nested content. Close controls return focus to the preview. Each project can be opened independently; closed details are excluded from keyboard navigation. Case-study layouts mix alternating text/image rows with a pair of visuals, shared by the inline details and standalone pages.

The four project routes are:

- `/work/aldea-investor-portal`
- `/work/aldea-investor-simulation`
- `/work/aldea-helios`
- `/work/kuspace`

Vite’s development and preview servers provide a single-page-app fallback for direct requests, including the `/contact` page. For the production build, `vite.config.ts` also writes `dist/work/<slug>/index.html` for every project, with its own title and description, plus `dist/404.html`. A future production host must provide an SPA fallback for `/contact` or generate a matching directory index.

When a later deployment is authorized, serve the contents of `dist/` at the domain root with directory-index serving enabled. This lets direct project links and refreshes resolve to their generated HTML files. If the host does not support directory indexes, configure `/work/*` requests to fall back to `/index.html`, and configure the host’s not-found handling for `404.html`. Public deployment is outside this draft and is not configured or authorized.

## Assets and URLs still needed

Shared images may be reused between preview and case-study slots. The exact labels, captions, and aspect ratios live in `src/content.ts`.

| Area | Images needed | External URLs needed |
| --- | --- | --- |
| Profile | Portrait and banner supplied and integrated; no remaining profile assets | None |
| Aldea Investor Portal | Preview supplied; five section visuals for fund overview, quarterly comparison, company drill-down, sample reporting output, and portfolio exploration; demo poster; Loom walkthrough poster | Separately hosted synthetic-data demo; Loom walkthrough supplied |
| Aldea Investor Simulation | Preview supplied and cropped; five section visuals for exit assumptions, holdings and distributions, scenario assumptions, projected J-curve, and scenario output | None for this draft |
| Aldea Helios | Preview supplied; five section visuals for company intelligence, company-record relationships, the existing company view, an illustrated platform contribution, and company-record mapping | None; images only |
| KUSPACE | Preview supplied and cropped; five section visuals for event workspace, scheduling and lineups, budgets and guestlists, ticket checkout, and the event-management MVP; demo poster; walkthrough poster | Product demo; public repository; Loom walkthrough |

The investor portal application remains a separate project/repository; it is neither merged into this portfolio nor embedded in an iframe. Before any future public demo deployment, inspect its source and verify synthetic-data isolation: no production reads, writes, document exports, fallback services, or secret/service-role credentials in client code. Prefer bundled synthetic fixtures, or an isolated synthetic backend only if necessary, without weakening the real portal’s authentication or access controls.

## Continue the work

Draft branch: `feat/portfolio-first-draft`. Read `git log -1 --oneline` for the current commit and check the actual remote state before reporting a push.

Ready-to-paste continuation prompt:

> Continue the personal portfolio in this repository on `feat/portfolio-first-draft`. Read the repository instructions, README, `src/content.ts`, `git status`, and `git log -1 --oneline` before editing. Preserve unrelated changes. The first draft has four case studies and intentional image/media placeholders; keep the exact five-section template and ownership distinctions. Add supplied assets or URLs only, rerun the documented verification commands, and inspect laptop and mobile layouts. Keep the investor portal app separate and verify synthetic-data isolation before any future public demo deployment. Public website deployment requires a new explicit request.
