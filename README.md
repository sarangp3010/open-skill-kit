# Open Skill Kit

Portable AI workflows for many professions, with a static React marketplace and a local installation CLI. Start with the [skill library](skills/README.md), [sector taxonomy](docs/sector-taxonomy.md), [installation guide](docs/platform-installation.md), or [contribution guide](CONTRIBUTING.md).

The catalog contains **42 draft skill packages across 20 broad sectors and 47 specialties**. Available packages and planned collections are labeled separately. Read instructions, examples, limitations and provenance before use. A structural quality score, documented directory or authored fixture replay does not establish actual assistant compatibility, effectiveness or professional correctness.

## Run the marketplace locally

Requires Node.js 22.13+ on the 22.x line, 24.x, or 26+, and pnpm 10.20.0.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Vite prints its local address, normally http://127.0.0.1:5173. Browsing, search, Markdown previews, themes and ZIP downloads need no account, database, API key or paid service. Every package in skills/ works as plain text independently of React. The app consumes a generated catalog, not hardcoded skill arrays.

## Install a skill from this checkout

The npm package remains unpublished and published bundles exclude drafts. Use the built local CLI and inspect a preview first:

```sh
pnpm build:npm
pnpm cli list --source ./skills
pnpm cli show software-development/code-reviewer --source ./skills
pnpm cli install software-development/code-reviewer --source ./skills --platform codex --scope project --project-dir ../your-project --allow-draft --dry-run
```

Use an existing project, inspect the skill's source and limits, then omit --dry-run when you choose to install. Adapters support Codex, Claude Code, Cursor and Gemini CLI; project/global scope, inspection, managed updates and safe removal are documented in [platform installation](docs/platform-installation.md). Installation preserves supporting files and refuses unsafe conflicts. It does not activate an assistant or run skill code. Read [compatibility](docs/compatibility.md); documented installation is separate from completed platform testing. Browser ZIPs are a CLI-free alternative.

## Submit a skill

Use the marketplace's **Submit a skill** or **Contribute** links, or start with [CONTRIBUTING.md](CONTRIBUTING.md). Copy the complete [template](templates/skill/SKILL.md), choose a canonical specialty, author a focused workflow with realistic fictional examples and limitations, validate locally, regenerate the catalog and submit your own draft GitHub pull request. GitHub submission requires an account and repository access; no marketplace signup is needed. No automated submission or publication occurs.

```sh
pnpm contributions:check
pnpm skills:index
pnpm exec playwright install chromium
pnpm validate:all
```

The complete local suite runs formatting/lint/types, tests, contribution/duplicate/safety checks, offline evaluations, skill/link/catalog checks, builds, Playwright/accessibility and local npm packing. It stops on the first failure. CI provides actionable file diagnostics and a contribution summary. Dependency audit is separately available with pnpm audit --audit-level high. See [community workflow and readiness](docs/community-readiness.md) for workflow permissions and unverified remote settings.

## Trust, evidence and licensing

All current skills remain drafts awaiting human review, including appropriate domain review for consequential uses. Author strings are declarations. Contributor attribution appears as maintainer-recorded only when a separate review is recorded against the exact package and evidence digests; no actual identity approvals are prefilled. Structural quality, validation, editorial status, installation, attribution and measured evaluation are separate signals.

[Phase 4 evaluation](docs/skill-evaluation.md) provides realistic scenarios, isolated baseline/assisted execution and reproducible reports. pnpm evaluate:fixtures runs without providers or paid APIs. Its authored observations are not real model results. Optional real-agent execution requires separate configuration and explicit opt-in; normal contribution CI never invokes an agent. Do not invent test outcomes or infer compatibility from installation tests.

Code and original content use the [MIT license](LICENSE). Preserve third-party source attribution and redistribution rights; builds include dependency notices for both web and npm artifacts. See [licensing](docs/licensing.md), [security policy](SECURITY.md), [code of conduct](CODE_OF_CONDUCT.md) and [governance](GOVERNANCE.md).

## Build and repository layout

```sh
pnpm build
VITE_BASE_PATH=/open-skill-kit/ pnpm build:pages
pnpm pack:npm
```

Normal builds emit apps/web/dist with route-specific static HTML, canonical/social metadata, a sitemap, robots file and license notices. Known Pages routes load directly; JavaScript powers search, previews and downloads. Metadata/noscript output is not full server-side rendering. VITE_SITE_URL configures the intended HTTPS directory URL for another host; VITE_BASE_PATH configures its asset/router prefix. Local builds and npm packing do not deploy or publish.

| Directory        | Purpose                                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| skills/          | Portable sector/skill/SKILL.md packages and supporting text files                   |
| apps/web/        | Independent React/TypeScript/Vite/Tailwind/shadcn/ui marketplace                    |
| packages/        | Existing schema, parser, validator, indexer, adapters, installer, evaluator and CLI |
| catalog/         | Sector registry, generated discovery catalog and maintainer attribution registry    |
| evaluations/     | Scenario definitions and deliberately reviewed report artifacts                     |
| templates/skill/ | Complete reusable authoring example, outside the active catalog                     |
| scripts/         | Catalog, contribution, build, notice and local-validation commands                  |
| docs/            | Authoring, installation, trust, evaluation, architecture and implementation reports |

[Phase 5 report](docs/PHASE_5_REPORT.md) · [Implementation status](docs/IMPLEMENTATION_STATUS.md) · [Architecture](docs/architecture.md) · [Catalog pipeline](docs/catalog-pipeline.md) · [Marketplace](docs/marketplace.md) · [Quality](docs/skill-quality.md) · [50-skill expansion plan](docs/skill-expansion-plan.md) · [Release policy](docs/releases.md)

The owner controls any future repository visibility, hosting and release decisions. This workflow uses existing local tooling and free GitHub features; no paid API, hosting, database or external account service was introduced.

## Moderated submissions

Use Create from the contribution page to edit, validate, preview and export a skill entirely in the browser. Submit Skill opens a PR preparation guide; it cannot publish. Community proposals go under submissions/ and remain outside website/npm catalog generation. Only an authorized maintainer's exact-package approval, current-head GitHub review and merge admit a package to the separate /published catalog. The existing source library remains explicitly labeled as draft/source previews. No publication decisions are prefilled. See [moderated submissions](docs/moderated-submissions.md) for acceptance, rejection, updates, withdrawal and required GitHub policy settings.

## Founding review

The [42 exact-package review packets and proposed 12-skill launch shortlist](reviews/founding/README.md) await owner review. See the [maintainer procedure](docs/founding-skills-review.md) and [review worksheet](templates/maintainer-review.md). `pnpm founding:review` generates preliminary reports; `pnpm founding:check` checks freshness without writing approval records. All source skills remain drafts, with no invented reviewer identities or agent results.

## First public release review

Start with the [owner summaries for 12 candidates](docs/launch/SHORTLIST_REVIEW.md), [launch checklist and blockers](docs/launch/CHECKLIST.md), and [GitHub settings audit](docs/launch/GITHUB_SETTINGS.md). `pnpm release:review` regenerates the summaries; `pnpm release:check` checks them without creating approval. Technical checks passing do not authorize release: all 42 current packages remain drafts and the published catalog is empty.

See [CI architecture and local pre-push checks](docs/CI_ARCHITECTURE.md) for the proposed checks/E2E split, the unchanged required validate gate, exact browser-image version, $0 safeguards and remaining Linux verification limits. No commit or push is authorized by a passing local suite.
