# Universal AI Skills

A static-first, open-source foundation for discovering and authoring portable AI skills.

**Current state:** Epic A and the B01–B04 content-engine foundation. The React app is a development placeholder. There are no published skills, verified platform adapters, builder, or backend yet. See [implementation status](docs/implementation-status.md) and the [master plan](UNIVERSAL_AI_SKILLS_CODEX_MASTER_PLAN.md).

## Quick start

Requires Node.js 22.13+ on the 22.x line, 24.x, or 26+, and pnpm 10.20.0. Install pnpm with `npm install --global pnpm@10.20.0` if needed.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173). Stop with Ctrl+C.

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm validate:skills
pnpm check:links
pnpm check:duplicates
pnpm build
```

`pnpm build` validates packages, writes the deterministic `catalog/index.json`, and builds `apps/web/dist`. `pnpm build:catalog` only builds the index. An empty catalog is intentional until B05–B08. Scripts never execute skill contents. No login, API key, or paid service is required.

## Workspace

- `apps/web`: minimal React/Vite application; UI epics remain planned.
- `packages/skill-schema`: Zod contracts and portable paths.
- `packages/skill-parser`: bounded, safe YAML frontmatter parser.
- `packages/skill-validator`: browser-safe content and link validation.
- `packages/catalog-indexer`: Node-only, bounded filesystem reader and index builder.
- `skills`: future reviewed content; synthetic fixtures live separately in `tests/fixtures`.

## Project documents

[Contributing](CONTRIBUTING.md) · [Authoring](docs/skill-authoring.md) · [Architecture](docs/architecture.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md) · [Governance](GOVERNANCE.md) · [Release policy](docs/releases.md) · [Changelog](CHANGELOG.md) · [Agent guidance](AGENTS.md)

Code and original repository content use the [MIT license](LICENSE). Contributors must identify third-party provenance and compatible licenses. A passing deterministic check is not a model evaluation or a professional safety review. Compatibility varies by product; no platform support has been verified in this batch.
