# Skill authoring contract (foundation)

The exact first ten packages from the current implementation specification are authored under their canonical sector paths. See [initial-skill review evidence](initial-skills-review.md). Use `tests/fixtures/valid/education/example-skill` only as a synthetic format fixture, not as a usable skill. Add packages at `skills/<sector>/<name>/`, with lowercase ASCII kebab-case names of at most 64 characters. Names, metadata ID, slug and directory must agree.

`SKILL.md` starts with YAML delimiters and only `name` and `description`. The description (1–1024 characters) should explain the task and when to activate it. Include nonempty level-two sections: When to use, Inputs, Workflow, Output and Boundaries. Workflow needs numbered steps. This repository profile is deliberately stricter than the [Agent Skills specification](https://agentskills.io/specification), checked on 2026-11-08, which also permits optional fields. Catalog-specific fields belong in `metadata.json`.

Metadata requires id, slug, title, sector, tags, version, license, author, riskLevel, capabilities, testedPlatforms, lastVerified, examples and provenance. Status defaults to draft; allowed values are planned, draft, reviewed and published. Even planned packages must satisfy validation; keep unimplemented ideas in the master plan rather than empty packages. Use empty testedPlatforms and null lastVerified until actual verification. Dates must be real ISO dates. See [schema source](../packages/skill-schema/src/index.ts) for exact contracts.

List at least one input and one output example path in metadata, with nonempty files. Add `tests/cases.json` with the matching skillId and at least three cases, each containing name, input and expectedBehaviors (kebab-case strings). These are structured expectations, not executed LLM evaluations. The initial ten each include two realistic input/output example pairs, six structured behavior cases and explicit authoring review notes.

Local Markdown links are relative to the containing file; use simple paths without traversal, dot segments or URL query strings. HTTPS/HTTP and mailto links are allowed; credential-bearing URLs, HTML and executable schemes are rejected. Fragment targets and remote availability are not checked. No scripts, symlinks or binary assets are allowed yet. High-stakes content must include limitations, source verification and professional escalation; keyword checks are only a review aid.

Run `pnpm validate:skills`, `pnpm test` and `pnpm build:catalog`. Maintainers must inspect realism, sourcing, safety and licensing before changing status to published. Do not imply universal product compatibility.

## Catalog discovery profile

The newer catalog pipeline accepts optional metadata.json and optional structured cases for draft discovery. Required canonical sections and safe path/reference checks still apply. Missing provenance, author, license, version and verification date remain unknown. Existing full metadata and publication-quality checks are preserved for the independent npm release pipeline. Use `pnpm skills:index` to regenerate the browser catalog; no React component edits are needed. See [catalog pipeline](catalog-pipeline.md) for contracts and diagnostics.

## Editorial rubric

The current specification scores clear triggering, actionable workflow, structured outputs, useful examples, correct boundaries, portability, privacy/permissions and test coverage from 0–2 each. A score of at least 13/16 and no critical safety failure is required for editorial review. An authoring self-assessment is not independent review or evidence of model performance. Keep status draft and platform/date fields empty until the appropriate evidence exists. Numeric example checks, archive preservation and ZIP validation are deterministic tests; model behavior cases must not be reported as executed unless actually run.

## Reusable template and quality reports

The [authoring template](../templates/skill/SKILL.md) includes portable frontmatter, a complete illustrative workflow, metadata, two input/output pairs and behavior cases. It is not indexed until copied into skills/<sector>/<slug>. Replace its sample task and placeholder author/provenance before requesting review.

Use the existing validator and the quality CLI described in [quality and trust](skill-quality.md). The versioned 100-point rubric explains missing structural information without turning optional metadata into hard draft requirements. Platform compatibility declarations and completed test artifacts have separate fields; no score creates a verified badge or changes editorial status.

## Selecting a sector or specialty

Use the [canonical taxonomy](sector-taxonomy.md) before creating a folder. Prefer an existing specialty and use tags for synonyms. Keep existing IDs/paths stable. Broad sectors aggregate specialties; legacy alias collections remain readable but new authoring should use their canonical collection. A new planned registry entry does not require an empty SKILL.md package. Keep proposals in [the expansion plan](skill-expansion-plan.md), outside the active skill source root. Availability is derived from actual validated files and is separate from publication, review and assistant testing.

The universal batch demonstrates 19 focused workflows with normal and uncertain-input examples, explicit boundaries and declared behavior cases. Its offline suites reuse the existing evaluation framework and intentionally use identical authored observations in both arms; no model improvement can be inferred. Real platform fields remain empty until actual authorized execution supplies evidence.

## Community submission checks

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for the complete template-to-draft-PR workflow. The template's current example uses canonical collaboration-records rather than the retained personal-productivity alias. Replace its illustrative task and identity fields before contributing; it remains outside the active catalog. pnpm contributions:check reports validator/safety/reference failures and duplicate slugs/normalized bodies with paths; pnpm validate:all runs the complete local suite. Attribution approval is maintained separately by reviewers, not authored into metadata.json.
