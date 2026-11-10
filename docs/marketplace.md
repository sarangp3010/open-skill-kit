# Marketplace development and verification

Open Skill Kit's read-only marketplace is a static React + TypeScript + Vite app using Tailwind CSS 4, semantic tokens and local shadcn/ui primitives. It does not require authentication, a backend or paid APIs. Existing draft skills remain drafts.

## Run and build

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @osh/web preview
```

The app's dev/build commands regenerate the [typed catalog](catalog-pipeline.md). The production output is `apps/web/dist`. Asset URLs use Vite's configured base. BrowserRouter uses that base; static hosting must rewrite non-asset routes to index.html. `public/_redirects` provides the SPA fallback convention for hosts that support it. For hosts without rewrite support, use the static route entries described below.

## Pages and interactions

- `/`: landing page, generated skill preview/cards, task search, sector entry points and getting-started content. Counts come from the catalog; no invented popularity or verification badges.
- `/skills`: search, sector and capability filters, alphabetical/sector sort, result counts and resettable empty states. q, sector, capability and sort live in URL parameters and survive refresh/back navigation.
- `/sectors` and `/sectors/:sector`: generated sector collections with actual authored packages.
- `/skills/:sector/:slug`: provenance/status, instructions, file and example previews, source link, clipboard action and safe ZIP download.
- `/docs`, `/contribute`, `/about`: use, privacy, portability and contribution information.
- Unknown URLs, missing skills, loading, malformed catalog and failed fetches have explicit states; failed fetches can be retried.

Light/dark/system selection is a labeled native control. Only the theme preference is optionally saved in localStorage; no private skill content or AI keys are stored. A system preference listener updates the effective theme when system mode is selected. The Radix mobile dialog handles focus trapping, Escape and return focus. All visible action controls have real behavior.

The browser fetches only static catalog data, aside from user-initiated external navigation. Markdown uses react-markdown, remark-gfm and rehype-sanitize with raw HTML disabled and no remote image requests. Local package links open another file preview. ZIP generation is lazy-loaded and runs entirely in-browser; manual copy and generic assistant guidance do not imply native support for every product.

## Browser/accessibility checks

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

On Linux CI, use `pnpm exec playwright install --with-deps chromium`. For an existing local Chrome installation, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can identify the executable; it is never hardcoded into the project configuration. The Playwright web server runs generation and Vite automatically.

The browser suite runs real downloads, checks extracted SKILL.md bytes, keyboard search/detail/download, URL persistence/back navigation, system and saved themes, and 320px navigation/focus/overflow. Axe scans the landing, catalog and detail pages in light and dark modes, plus the mobile catalog, using WCAG 2 A/AA, 2.1 AA and 2.2 AA tags. Theme transitions are allowed to finish before measuring contrast.

Passing automated scans is not a complete WCAG conformance claim or a substitute for manual screen-reader and device testing. Some Markdown tables/code blocks are horizontally scrollable with keyboard focus rather than forcing the page to overflow. Human/editorial review and actual assistant execution evidence are outside these UI tests.

Detail/Markdown code and ZIP functionality are split from initial page code, with separate React/Markdown vendor chunks. No account, analytics, API provider, paid service or automatic publication was added.

## GitHub Pages

`pnpm build:pages` generates the production app plus a physical index.html for each catalog, informational, sector and skill route. This supports direct links and reloads on GitHub Pages without changing BrowserRouter or search URL behavior. Route names come from the validated catalog; no skill metadata is hardcoded in React. Unknown URLs use the generated 404.html and retain HTTP 404 semantics.

For the project site, build locally with:

```sh
VITE_BASE_PATH=/open-skill-kit/ pnpm build:pages
```

`VITE_BASE_PATH` defaults to `/` for local development and ordinary builds. The deployment job obtains the correct repository/custom-domain path from actions/configure-pages instead of hardcoding this repository name. Assets, generated catalog fetches and BrowserRouter all use the same base.

The `deploy-pages` job in CI runs only after validation succeeds for main pushes or manually dispatched main runs. Pull requests validate without deploying. It builds and uploads only apps/web/dist using the official configure-pages, upload-pages-artifact and deploy-pages actions. Deployment uses the github-pages environment and scoped contents-read, pages-write and id-token-write permissions. Deployments are serialized. npm publication is separate and is not performed.

Before the first deployment, enable GitHub Pages with GitHub Actions as its publishing source in repository Settings → Pages. This change, committing/pushing the prepared workflow, and the first deployment require the user's explicit approval. Once enabled, approved future main pushes automatically deploy only after CI passes. The expected project URL is https://sarangp3010.github.io/open-skill-kit/; no live deployment is claimed until verified.

References: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite static deployment](https://vite.dev/guide/static-deploy.html).

## Platform installation guidance

Detail pages now provide Codex, Claude Code, Cursor and Gemini CLI project/global selectors, exact paths, official links and copyable preview/install commands from the shared adapter registry. Current drafts use the explicit local-checkout workflow and opt-in; no npm publication or assistant execution is implied. Clipboard denial has a manual-copy fallback. See [platform installation](platform-installation.md).

## Quality and marketplace trust

The generated catalog now carries optional structural quality, validation and platform assessment fields. Cards/details consume those fields, with not-assessed fallbacks for older catalogs. Detail pages explain each scoring check and display contributor-recorded evidence separately from documented installation and legacy testing declarations. No score or declaration produces a verified label. Additional URL filters cover difficulty, editorial state, minimum score, platform, evidence and validation; quality/evidence sorting reuses the existing catalog selector. See [quality and trust](skill-quality.md).

## Phase 5 onboarding and metadata

Submit a skill on the landing page and Contribute in desktop/mobile navigation open the local contribution guide. It explains complete templates, deterministic validation, draft PR submission, provenance and the distinction between account-free browsing/local work and GitHub submission. Docs reuse the same generated-skill installation guide as detail pages. Attribution displays declared author text separately from current maintainer-reviewed records; stale records require re-review and no real approvals are prefilled.

Normal builds now include the route preparation previously specific to build:pages. Each known route has its own title/description/canonical/social tags and safe JSON-LD, with client updates on navigation and a noscript source-navigation fallback. The deterministic sitemap excludes aliases/planned collections/404 while retaining all skill URLs. This is static metadata, not full React SSR. The Pages project-subpath robots.txt cannot replace host-root crawling controls. Both web and npm outputs retain project/dependency notices. See [readiness and SEO limits](community-readiness.md) and [licensing](licensing.md).

## Browser proposals and published catalog

/create now edits and previews complete tab-local drafts, validates through the existing package/rubric logic, saves/imports bounded JSON and exports proposal ZIPs. Submit Skill shows GitHub PR instructions and never uploads or publishes. Pending submissions are absent from public assets. /published loads the separate approval-gated artifact and fails closed on a load error; it does not substitute source drafts. /skills and existing detail URLs remain explicitly labeled source/draft previews. The publication ledger starts empty. See [moderation policy](moderated-submissions.md).
