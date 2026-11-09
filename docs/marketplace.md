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

The app's dev/build commands regenerate the [typed catalog](catalog-pipeline.md). The production output is `apps/web/dist`. Asset URLs use Vite's configured base. BrowserRouter uses that base; static hosting must rewrite non-asset routes to index.html. `public/_redirects` provides the SPA fallback convention for hosts that support it. For other hosts configure the equivalent rewrite. No hosting deployment is performed here.

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
