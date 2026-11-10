# Changelog

Use [Semantic Versioning](https://semver.org/) and the [release policy](docs/releases.md). No release has been published.

## Unreleased

### Release preparation

- 42 complete draft packages across 20 broad sectors, structural quality reports and an offline fixture evaluation framework; no real-agent performance claims.
- Safe native lifecycle adapters for Codex, Claude Code, Cursor and Gemini CLI, with local/project installation, inspection, updates and removal.
- Browser authoring, validation, preview and proposal export; moderated GitHub review/merge gates, exact-package/evidence hashes and approved-only npm/publication artifacts.
- Reproducible founding reviews, a 12-skill owner-review shortlist, unsigned human review worksheets, launch checklist, permission/settings guide and additional publication/download regressions.
- Read-only contribution CI, separate Pages build/deploy permissions, route metadata/sitemap and contributor onboarding. No release, deployment or skill approval is created by these changes.

### Added

- pnpm/TypeScript React/Vite workspace with shared checks and CI templates.
- Safe frontmatter parsing, Zod contracts, content validation and deterministic catalog indexing.
- Synthetic fixtures, regression tests and contributor documentation.

- npm distribution build and CLI for listing, previewing and safely copying published skill packages, with offline tarball installation tests and an empty-release guard.

### Changed

- Kept portable skills and the independent `apps/web` React workspace in the monorepo; the app consumes the generated catalog, with separate discovery and approved publication artifacts.

### Added

- Typed generated discovery catalog, optional metadata normalization, aggregate file/line diagnostics and freshness checks.
- Read-only marketplace with generated search/filter data, safe detail/examples, themes, responsive navigation and local ZIP/copy actions.
- Parser/pipeline/component/browser tests, including actual ZIP downloads and automated light/dark/mobile accessibility scans.
