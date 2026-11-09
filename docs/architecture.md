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
