# Architecture

Open Skill Kit is a pnpm/TypeScript monorepo with independent portable content and React application directories. The current approved implementation step is the workspace/toolchain scaffold. See [ADR 0001](adr/0001-monorepo-boundaries.md) for the adopted boundary and [current status](IMPLEMENTATION_STATUS.md) for evidence and remaining work.

## Workspace layout

- `skills/` contains portable Markdown packages independent of JavaScript, React or Open Skill Kit services. Existing drafts are preserved.
- `apps/web/` is a private React/Vite workspace with TypeScript, Tailwind CSS and local shadcn/ui components.
- `packages/` contains the existing schema, parser, validator, catalog indexer and npm CLI source workspaces.
- `scripts/` contains the existing explicit content/index/distribution commands, including a partial marketplace generator from earlier work.
- `docs/` contains the specification-derived checklist, historical status, setup, authoring and policy documents.

The shared compiler baseline is `tsconfig.base.json`. Library/scripts/tests use root TypeScript configuration; the app has separate browser and Node/Vite configurations. Browser code does not import Node filesystem modules. Vite and TypeScript map `@/*` to the app's source directory.

## Scaffold workflow

Root `dev` launches the app. Root `build` builds only the app. Root `typecheck` checks both existing shared code and the app; ESLint includes TypeScript, React Hooks and React Refresh rules. Prettier is configured at the root. The starter demonstrates local React state with a shadcn/ui Button and Tailwind semantic tokens. No catalog, search, marketplace route, ZIP download or backend feature is implemented by the scaffold.

## Existing content and distribution tooling

Existing dependency direction remains schema → parser → validator → Node indexer → content build/distribution commands. The npm CLI is a separate consumer of published catalog data. These packages and their existing validation policies are preserved; current root starter dev/build commands do not validate, generate or publish content.

The intended later pipeline is portable skills → parsing/validation → deterministic catalog/content/ZIP assets → React consumer. The partial generator in `scripts/build-marketplace.ts` must be separately completed and validated before integration. Generated skill metadata must never be hardcoded into React components. Draft, editorial review, publication and executed test evidence must remain distinct.

No account, database, hosted API, model credential or paid service is required. Publication, static hosting and native platform compatibility remain separate tasks. See the [scaffold guide](scaffold.md), [authoring contract](skill-authoring.md) and [existing npm setup](npm-distribution.md).

## Catalog and marketplace integration — 2026-11-09

The latest user authorization expands the earlier scaffold to the parser/catalog pipeline and read-only marketplace. Dev/build now regenerate the typed discovery catalog before running Vite. `catalog/catalog.json` is the deterministic canonical artifact; its identical public copy is consumed by the browser using the `DiscoveryCatalog` contract. `catalog:check` and `catalog:check-assets` check freshness without rewriting source. The existing strict publication/CLI contract remains independent of draft-inclusive discovery.

Catalog metadata is optional and normalized without inventing authorship, licenses, version or review dates. The reader/validator aggregate package diagnostics, reject unsafe references and preserve file boundaries. The browser renders safe Markdown, never executes skill contents, and lazy-loads a revalidating ZIP download module. All skill cards, counts, filters, details and examples derive from generated data.

The implemented app includes landing, catalog, sectors, details, docs/contribution/about pages, responsive Radix navigation, URL state, light/dark/system themes and explicit loading/error/empty states. No account, backend, paid API or automatic publishing was introduced. Earlier scaffold-only descriptions above are historical. See the [pipeline](catalog-pipeline.md), [marketplace](marketplace.md) and latest [status](IMPLEMENTATION_STATUS.md) for current behavior and verification.

## Local platform installation

packages/platform-adapters is browser-safe and owns platform IDs, documented paths, name restrictions, scope types and copyable instructions shared by React and CLI. packages/skill-installer owns Node filesystem operations, receipts, hashes, locking, staging, inspection, updates and guarded removal. It reuses the existing schema, validator and catalog reader. Readers remain strict by default; installed-package reads explicitly exclude only the reserved receipt after independent validation.

The CLI preserves published-bundle list/show/add behavior and dispatches native lifecycle commands through the shared installer. Local --source discovery uses the existing pipeline and explicit unpublished opt-in. The marketplace remains static/account-free and cannot write to the visitor's filesystem. See [platform installation](platform-installation.md).

## Quality and trust data flow

The existing parser exports one Markdown instruction-structure extractor. The validator reuses it and its own diagnostics to produce an explainable quality report; schema contracts validate report totals and optional completed-test records. The Node catalog indexer alone computes SHA-256 package digests and derives adapter compatibility/testing state. Browser-safe parser/schema/validator packages still import no Node filesystem/crypto modules. React consumes optional generated assessments, while CLI quality reads through existing package boundaries and the same validator/indexer. No second validation engine, external rating service or model API was added. See [quality and trust](skill-quality.md).

## Reproducible evaluation framework

Phase 4 extends the schema with scenario/report contracts and optional discovery evidence summaries. Browser-safe validator exports pure assertion scoring, output-envelope parsing and report consistency checks. The Node indexer imports reviewed, bounded JSON artifacts, recomputes scores/suite digests, compares package digests and marks evidence reproduced/stale/invalid. Existing catalog generation adds these optional fields; old catalog entries and CLI operations remain supported.

packages/skill-evaluator owns isolated temporary workspaces, offline replay and explicitly opted-in Docker execution. It reuses the validator, indexer package reader/digests, installer path boundaries and platform registry. Execution adapters only construct documented noninteractive commands and parse observable outputs; unavailable configuration is blocked without fallback. Dependency direction is schema → parser/validator → Node indexer → evaluator → CLI. The indexer does not import the evaluator, avoiding a cycle. React receives generated summaries and never imports Node execution code. Reports remain outside skill packages, avoiding a digest self-reference. Fresh offline outputs are ignored; reviewed artifacts drive deterministic catalog builds. See [evaluation contracts and limits](skill-evaluation.md).

## Universal sector taxonomy

The existing sector registry now describes 20 broad sectors and canonical specialties with optional parent and aliasOf fields. Stable collection slugs remain the source of folder identities and URLs. Four overlapping legacy names are browsing aliases, not duplicate canonical categories. Shared browser-safe schema helpers normalize membership for the existing indexer and React selectors; two-level schema checks prevent orphan parents, cycles, alias chains and cross-sector aliases. Catalog generation derives skillCount/availability from admitted packages, ignoring authored counts. Older flat registries and optional metadata remain supported.

The marketplace directory shows broad groups and available/planned specialties; home discovery uses broad groups. Broad-sector and collection filters compose with the existing query, sorting and trust filters. The existing URL history synchronization is retained. Breadcrumbs expose parents without changing skill links. No duplicate catalog service, hardcoded React metadata or Phase 4 report migration was added. See [taxonomy](sector-taxonomy.md) and [the 50-skill plan](skill-expansion-plan.md).
