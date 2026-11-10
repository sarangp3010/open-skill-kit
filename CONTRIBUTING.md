# Contributing

Start with the [README](README.md), [status](docs/implementation-status.md), and [authoring contract](docs/skill-authoring.md). Discuss larger changes in an issue. Keep pull requests focused on the current epic. Respect the [code of conduct](CODE_OF_CONDUCT.md).

1. Install the pinned tools and run `pnpm install --frozen-lockfile`.
2. Make a focused change with meaningful tests. Keep new skills as drafts.
3. Run the validation commands in the README, including formatting and documentation link checks.
4. Open a PR using the template. Describe behavior, validation, provenance, and security implications.

Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`); breaking changes use `!` and a `BREAKING CHANGE:` footer. Follow the [release process](docs/releases.md).

By contributing, you license your original work under MIT. Identify third-party sources, their licenses, and any modifications; do not submit private information or content you lack permission to redistribute. Maintainers review provenance, safety boundaries and compatibility evidence before publishing skills. Structured behavioral cases document expectations only; no LLM evaluation runs in baseline CI.

## Quality and trust evidence

Start from templates/skill, outside the active catalog. Copy the complete folder to skills/<sector>/<slug>, align identity fields and replace the illustrative task/author/provenance. Run pnpm build:npm, then pnpm cli quality <sector>/<slug> --source ./skills --json alongside normal validation/tests. Regenerate the catalog before submitting changes. Missing optional quality metadata is advisory; invalid references and unsafe packages still fail validation.

Scores, editorial labels, documented installation and actual testing are separate. Keep drafts as drafts. Do not claim verification based on a structural score, a scenario file, an adapter installation test or a compatibility declaration. Only record platform runs that actually completed; include the real runner/version/time, package digest, outcome and nonprivate artifact, including failures. The UI treats these as contributor-recorded evidence, not independent verification. Full rubric, evidence format and template instructions: [quality and trust](docs/skill-quality.md).

Evaluation contributions must follow [the evaluation guide](docs/skill-evaluation.md). Define realistic tasks and objective declarative assertions, keep baseline/assisted conditions comparable, and run the offline harness with pnpm evaluate:fixtures. Store fresh reports in ignored local output; only deliberately reviewed, non-sensitive artifacts belong in evaluations/reports. Fixture replay is never real model evidence. Do not relabel outputs, invent scores, infer tested compatibility from directory support, or hide failing comparisons. No provider execution is part of ordinary contribution checks.

For new industries, use [the sector taxonomy](docs/sector-taxonomy.md) and [50-skill expansion plan](docs/skill-expansion-plan.md). Preserve existing IDs and URLs, avoid near-duplicate categories, and keep planned proposals outside skills/. Broad sectors and specialties are registry data; the marketplace derives available/planned labels from actual packages. Draft availability, professional review, publication and real-agent evaluation remain separate.
