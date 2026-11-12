# Changelog

Use [Semantic Versioning](https://semver.org/) and the [release policy](docs/releases.md). No release has been published.

## Unreleased

### Release preparation

- 42 complete draft packages across 20 broad sectors, structural quality reports and an offline fixture evaluation framework; no real-agent performance claims.
- Safe native lifecycle adapters for Codex, Claude Code, Cursor and Gemini CLI, with local/project installation, inspection, updates and removal.
- Browser authoring, validation, preview and proposal export; moderated GitHub review/merge gates, exact-package/evidence hashes and approved-only npm/publication artifacts.
- Reproducible founding reviews, a 12-skill owner-review shortlist, unsigned human review worksheets, launch checklist, permission/settings guide and additional publication/download regressions.
- Read-only contribution CI with validation-only checks → e2e → validate; no Pages deployment jobs. Route metadata/sitemap and contributor onboarding remain available for separately authorized hosting. No release, deployment or skill approval is created by these changes.

### Added

- pnpm/TypeScript React/Vite workspace with shared checks and CI templates.
- Safe frontmatter parsing, Zod contracts, content validation and deterministic catalog indexing.
- Synthetic fixtures, regression tests and contributor documentation.

- npm distribution build and CLI for listing, previewing and safely copying published skill packages, with offline tarball installation tests and an empty-release guard.

### Changed

- Faster marketplace browsing: the app loads a lightweight generated index (about 62 KB instead of the 898 KB full catalog), fetches full-text search only when searching, and loads each skill's details on its own page. Results page with Load more, filters show counts and disable zero-result options, the published view has a dedicated empty state, and relative example links and anchors work. All skills remain drafts and the published catalog stays empty.
- Explicit release builds now reject unresolved dependency-license provenance independently of skill authorization; local notice collection stays available and default npm artifacts are private.

- Attribution validation now requires existing maintainer authorization and valid review dates; CI binds changed records to genuine independent current-head GitHub review without authorizing publication.
- License overrides compare declared source and dependency versions, require a nonempty limitation for mismatches and retain unresolved provenance rather than claiming cross-version verification.

- PR #1 and PR #2 are merged into develop; documented the owner-confirmed strict required validate protection without authorizing publication or deployment.
- Licensing checks now explain extra/missing installed records, version changes and manifest/notice or source drift while failing closed and preserving canonical evidence.
- Corrected security and launch guidance that still described removed automatic Pages jobs or outdated develop protection.

- Kept portable skills and the independent `apps/web` React workspace in the monorepo; the app consumes the generated catalog, with separate discovery and approved publication artifacts.

### Added

- Typed generated discovery catalog, optional metadata normalization, aggregate file/line diagnostics and freshness checks.
- Read-only marketplace with generated search/filter data, safe detail/examples, themes, responsive navigation and local ZIP/copy actions.
- Parser/pipeline/component/browser tests, including actual ZIP downloads and automated light/dark/mobile accessibility scans.
