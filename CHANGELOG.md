# Changelog

Use [Semantic Versioning](https://semver.org/) and the [release policy](docs/releases.md). No release has been published.

## Unreleased

### Added

- pnpm/TypeScript React/Vite workspace with shared checks and CI templates.
- Safe frontmatter parsing, Zod contracts, content validation and deterministic catalog indexing.
- Synthetic fixtures, regression tests and contributor documentation.

- npm distribution build and CLI for listing, previewing and safely copying published skill packages, with offline tarball installation tests and an empty-release guard.

### Changed

- Excluded `/apps/` from Git and the library workspace/checks; the root build now creates the catalog and npm CLI without the separately maintained React application.

### Added

- Typed generated discovery catalog, optional metadata normalization, aggregate file/line diagnostics and freshness checks.
- Read-only marketplace with generated search/filter data, safe detail/examples, themes, responsive navigation and local ZIP/copy actions.
- Parser/pipeline/component/browser tests, including actual ZIP downloads and automated light/dark/mobile accessibility scans.
