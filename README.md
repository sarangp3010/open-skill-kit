# Open Skill Kit

An open-source library of portable AI skill packages and a responsive React marketplace.

Browse by task or sector, inspect Markdown instructions and examples, and copy or download a complete package. The files in `skills/` remain usable independently of the website. Current starter skills are **drafts awaiting human review**; no verified platform support or model evaluation is claimed.

## Run locally

Requires pnpm 10.20.0 and Node.js 22.13+ on the 22.x line, 24.x, or 26+.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Vite prints the local address, normally http://127.0.0.1:5173. No account, backend, API key or paid service is needed.

```sh
pnpm skills:validate
pnpm skills:index
pnpm catalog:check
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm catalog:check-assets
```

The app regenerates its catalog before dev/build. `pnpm build` emits `apps/web/dist`; use `pnpm --filter @osh/web preview` to serve production output locally. Static hosts need an SPA fallback for readable detail URLs; see [marketplace development](docs/marketplace.md).

For browser and accessibility tests:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

## Repository structure

```text
skills/                  Portable sector/skill/SKILL.md packages
apps/web/                React, TypeScript, Vite, Tailwind and shadcn/ui
packages/skill-schema/   Typed contracts and runtime schemas
packages/skill-parser/   Safe YAML/frontmatter parser
packages/skill-validator/ Content, path and reference validation
packages/catalog-indexer/ Deterministic discovery and diagnostics
packages/cli/            Existing independent npm CLI/distribution source
scripts/                 Catalog generation and packaging commands
catalog/                 Sector data and canonical generated catalog
docs/                   Architecture, authoring, development and status
```

The React application consumes generated `catalog/catalog.json` through its static public copy. No skill metadata arrays live in React components. Adding a valid package and running `pnpm skills:index` updates the library without component edits. See [catalog pipeline](docs/catalog-pipeline.md) for optional metadata, diagnostic formats, freshness checks and security boundaries.

## Skill files and trust

Explore the [Markdown skill index](skills/README.md). The exact first ten specification skills now have substantive instructions, two example pairs, six behavior cases and authoring review notes; see [review evidence](docs/initial-skills-review.md). The active library also retains thirteen earlier drafts, with two superseded same-name sources preserved in the archive. Canonical frontmatter contains only name and description; marketplace metadata belongs in metadata.json. Each existing starter draft includes two example pairs and structured behavioral expectations. These expectations are not executed model tests.

Contributed scripts are never executed. Validation rejects unsafe YAML, path traversal, symlinks, oversized/binary packages, unsafe local references and raw HTML. Browser previews additionally sanitize Markdown; ZIP generation revalidates file safety. Actual usefulness, provenance, professional correctness and assistant compatibility require human review.

## npm distribution

The earlier npm CLI setup is preserved and remains unpublished. Its release bundle excludes drafts and requires reviewed content before publication. See [npm distribution](docs/npm-distribution.md); registry installation commands are intended usage after an authorized release, not a claim that a package is currently available.

## Documentation

[Implementation status](docs/IMPLEMENTATION_STATUS.md) · [Progress](docs/progress.md) · [Architecture](docs/architecture.md) · [Catalog pipeline](docs/catalog-pipeline.md) · [Marketplace](docs/marketplace.md) · [Authoring](docs/skill-authoring.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Governance](GOVERNANCE.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Release policy](docs/releases.md) · [Specification](OPEN_SKILL_KIT_CODEX_IMPLEMENTATION.md)

Code and original repository content are [MIT licensed](LICENSE). Preserve third-party attribution and check each package's declared provenance/license before reuse.

## Install into a local assistant

Codex, Claude Code, Cursor and Gemini CLI installation, inspection, updates and safe removal are implemented. Start with [platform installation](docs/platform-installation.md) for verified project/global paths and preview commands. Current drafts require explicit local --source and --allow-draft; they are not published npm releases or independently assistant-tested packages.

## Quality and marketplace trust

Cards/details now show generated structural scores, validation and separate installation/test evidence. Assess a local skill with pnpm cli quality <sector>/<slug> --source ./skills after building the CLI. Scores and declarations never imply verification. Start authoring from templates/skill and read [quality and trust](docs/skill-quality.md) for the rubric, evidence format and contributor workflow.

Phase 4 adds [reproducible evaluations](docs/skill-evaluation.md): run pnpm evaluate:fixtures for offline scenario replay, or use the built CLI evaluate command for structured baseline/assisted reports. Marketplace evidence distinguishes fixture mechanics from actual agent performance. Real-agent container execution requires separate configuration and explicit opt-in; no real platform evaluation is included or claimed.
