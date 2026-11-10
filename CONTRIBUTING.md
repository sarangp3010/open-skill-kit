# Contributing to Open Skill Kit

Start with the [42-skill library](skills/README.md), [canonical taxonomy](docs/sector-taxonomy.md), [authoring contract](docs/skill-authoring.md) and [code of conduct](CODE_OF_CONDUCT.md). Search existing skills and [the proposal plan](docs/skill-expansion-plan.md) before adding another workflow. Small corrections can go straight to a pull request; discuss a substantially different task in the skill-proposal issue form first.

Browsing, downloading, authoring and local validation need no marketplace account. Submitting an issue or pull request requires a GitHub account and repository access. Forking, public access and hosting depend on the owner's repository settings; these instructions do not change them.

## 1. Set up a fork and branch

Install Node.js 22.13+ on the 22.x line, 24.x, or 26+, and pnpm 10.20.0. Fork the repository using GitHub, clone your fork, and create a focused branch. Replace YOUR-USER below with your actual account:

```sh
git clone https://github.com/YOUR-USER/open-skill-kit.git
cd open-skill-kit
git switch -c feat/my-skill
pnpm install --frozen-lockfile --ignore-scripts
```

The website is optional: skills are portable Markdown folders. Run pnpm dev only if you want to preview the marketplace. No API key, Docker or provider subscription is needed for ordinary contributions.

## 2. Create a complete package

Choose a canonical specialty from catalog/sectors.json; avoid alias collections. Copy the **whole** [reusable template](templates/skill/SKILL.md), including examples and behavior cases, to submissions/sector/skill-name. For example, after choosing a distinct skill name:

```sh
skill_sector=collaboration-records
skill_name=your-skill-name
mkdir -p "submissions/$skill_sector"
if test ! -e "submissions/$skill_sector/$skill_name"; then
  cp -R templates/skill "submissions/$skill_sector/$skill_name"
  printf '{"schemaVersion":1,"operation":"new"}\n' > "submissions/$skill_sector/$skill_name/submission.json"
fi
```

Use the browser editor at /create for automatic request generation, or retain the new-proposal submission.json from the recipe above. See the [moderation policy](docs/moderated-submissions.md) for updates and maintainer-only promotion. Replace the template's illustrative workflow; do not submit it as a new skill. Align the folder name, frontmatter name, metadata id/slug/sector, and tests/cases.json skillId. Use lowercase kebab-case names up to 64 characters. Record your actual declared author name, original-work provenance and license. Do not add a maintainer attribution approval yourself.

A contribution should include clear activation criteria, required inputs, actionable steps, structured output, limitations, two realistic fictional input/output pairs, and behavior expectations covering normal, missing and conflicting inputs. High-stakes workflows need source verification and professional escalation. Do not add private/patient/payment data, credential-bearing URLs, scripts, binaries, symlinks or instructions that authorize unrelated actions. Keep status draft, testedPlatforms empty and lastVerified null unless genuine completed testing supports a separate reviewed claim.

Preserve all supporting files. Existing package IDs, URLs, source files and review/evaluation records should not be renamed or silently replaced. A new sector registry entry is a planned collection, not a reason to create empty packages.

## 3. Validate and preview

```sh
pnpm contributions:check
pnpm skills:index
pnpm catalog:check
pnpm build:npm
pnpm cli quality collaboration-records/your-skill-name --source ./submissions --json
pnpm exec playwright install chromium
pnpm validate:all
```

Replace the sample ID with your package. contributions:check reuses the existing reader/schema/validator, checks duplicate slugs and normalized instruction-body copies, and reports actionable file paths. It writes ignored .open-skill-kit/contribution-report.json; CI also displays a job summary and error annotations. Quality gaps can be advisory; safety/schema/reference errors block acceptance. Normalized-copy detection is not semantic plagiarism detection: reviewers still assess overlapping tasks.

validate:all runs lint, formatting, types, unit/integration/component tests, contribution checks, offline fixture replay, skill/link/duplicate/catalog checks, production build, public-asset checks, Playwright/accessibility, local npm packing and a Pages-path build. It stops at the first failing command. Run pnpm format to fix formatting, pnpm skills:index for stale generated data, and the named failing command for other errors. Commit the generated canonical catalog with a skill change, but not ignored reports, downloads, dist or node_modules.

The existing evaluation framework supports optional suites under evaluations/scenarios. Use [the evaluation guide](docs/skill-evaluation.md); authored fixture replay is not an actual assistant evaluation or a measured improvement. Standard CI never runs an agent. Real provider execution requires a separately configured container, explicit opt-in and authorization for that particular run; it is not required for contributing.

## 4. Submit your own draft pull request

Push your branch to your fork when you choose to submit, then use GitHub's Compare page to open a **draft** PR into main. This guide authorizes no automatic push, PR creation, publication or deployment by a tool. Use the PR checklist and include:

- The task, canonical ID, intended user, and difference from existing packages.
- Exact validation results and any command not run, with sanitized diagnostics.
- Provenance, source URLs/licenses, modifications and retained notices.
- A clear distinction between authored examples, deterministic checks and actual completed model tests, including failures.
- Existing identities/evidence preserved and any workflow, dependency or trust-sensitive changes called out.

A maintainer reviews usefulness, safety, provenance, licensing and evidence. High-stakes content needs suitable domain review. Passing CI does not verify model behavior, make a contributor identity authentic, approve a professional decision, change a draft to published, or create an npm release. Revisions should respond to observed issues, not remove assertions to hide a failure.

## Attribution and evidence

The metadata author field is a declaration. A separate maintainer must check a real PR and authorship/redistribution evidence before adding an [attribution review record](docs/attributions/README.md). Records bind to the exact package and review evidence digests; changing a package makes its record stale. The marketplace distinguishes current maintainer-recorded attribution from declared authors and stale records. These unsigned records are not independent identity attestations, professional credentials or effectiveness endorsements. No real attribution approvals are prefilled in this repository.

Only record platform runs that actually completed, with real runner/version/time, outcome, package digest and nonprivate artifacts. Retain failures and stale evidence. See [quality and trust](docs/skill-quality.md), [compatibility](docs/compatibility.md) and [evaluation](docs/skill-evaluation.md).

## Licensing, security and conduct

By submitting original contributions, you agree to license them under the repository's MIT terms. You must have redistribution rights; preserve third-party copyright notices and licenses and document modifications. Do not paste proprietary manuals, restricted training material or content of uncertain origin. See [licensing review](docs/licensing.md).

Report vulnerabilities privately using [SECURITY.md](SECURITY.md), never an ordinary public issue. Conduct concerns follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Maintainer review, free-feature CI controls, repository-setting limitations and the remaining public-readiness decisions are documented in [community security and readiness](docs/community-readiness.md). Use Conventional Commits for proposed changes; releases follow the separate [release policy](docs/releases.md).

## Moderated browser proposals

The [browser editor and moderation policy](docs/moderated-submissions.md) supersede the earlier direct-source recipe **for new community proposals**. Create/edit/validate/preview freely at /create, export the complete package and place it under submissions/{sector}/{slug}/ in your PR. Do not add new community packages directly to skills/ or edit publication approvals. Pending packages are checked but never indexed or published. Current 42 source drafts stay in a separate labeled library; /published starts empty.

Acceptance requires an authorized maintainer's exact-package decision, explicit current-head GitHub approval and merge. CI checks real review/merge evidence with read-only GitHub requests; it never approves or merges automatically. Updates use an original-package digest, and withdrawals retain a reviewed decision. See the moderation policy for rejection, changes requested, stale approvals and removal. pnpm moderation:check is part of pnpm validate:all. GitHub required-review/check settings must be configured by the owner; local files do not assert those settings are enabled.

## Founding skills and maintainer decisions

See the [Founding Skills Review workflow](docs/founding-skills-review.md), [review packets and proposed shortlist](reviews/founding/README.md), and [human worksheet](templates/maintainer-review.md). Automated reports never grant approval. An approved ledger decision additionally requires an exact-hash completed human review with authentic evidence references, followed by actual GitHub approval and maintainer merge. Preserve unapproved drafts and previous completed review forms.
