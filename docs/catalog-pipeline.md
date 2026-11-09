# Skill parsing, validation and generated catalog

The portable source of truth is `skills/<sector>/<skill>/SKILL.md`. The React app loads generated JSON; no skill arrays are maintained in components.

## Commands

```sh
pnpm skills:validate
pnpm skills:index
pnpm catalog:check
pnpm build
pnpm catalog:check-assets
```

`skills:validate` inspects every package without writing output. `skills:index` regenerates `catalog/catalog.json` and the identical `apps/web/public/catalog.json`. Root/app dev and production builds regenerate these assets before serving/building the app. Regenerate after editing skill files during a running dev session, then reload the page.

`catalog:check` compares the committed canonical JSON with freshly computed output without rewriting it. This works in a clean checkout even though the public copy is Git-ignored. `catalog:check-assets` also checks the generated app copy, so run it after generation/build. Missing or stale data returns a nonzero exit code. CI checks canonical freshness before building, then checks both copies afterward.

`catalog/index.json` is the earlier published-package index and is not the website's data source. Existing npm packaging uses `buildCatalog` directly and retains its publication-quality contract; this implementation does not publish npm packages or promote drafts.

## Contracts and normalization

`packages/skill-schema` exports `DiscoverySkill`, `DiscoveryCatalog`, and their Zod runtime schemas. Each entry has identity, title/name, description, sector, tags, capabilities, optional difficulty/version/provenance represented truthfully, review status, source path, body, examples and a validated relative file map. The sector registry is `catalog/sectors.json`; unknown valid sector folders receive a derived display label so adding a package does not require React changes. Search uses generated sector aliases and skill content, not hardcoded skill IDs.

Canonical frontmatter requires only name and description, with bounded lowercase kebab-case names and a nonempty bounded description. The parser rejects duplicate keys, YAML tags, anchors/aliases, oversized content, invalid schema fields and missing instructions. It reports YAML/frontmatter line information when available.

Catalog metadata is optional. Existing metadata fields are supported along with displayName/testedWith aliases and difficulty. Unknown fields, inconsistent identity, conflicting title aliases and unsupported platform testing claims fail validation. Missing author, license, version, provenance and verification date remain null; they are not invented. The default lifecycle is draft. Planned packages are validated but not listed. Reviewed/published labels are declarations requiring maintainer evidence; they are not assigned by a structural check.

Catalog validation requires nonempty When to use, Inputs, Workflow, Output and Boundaries sections and a numbered workflow. Examples/test cases are validated when supplied. Publication validation remains stricter: full provenance/license metadata, examples and structured cases are required. No behavior tests or model evaluations run merely because test-case JSON is valid.

## Diagnostics

`validateSkill` returns structured diagnostics and readable errors; `inspectSkills` aggregates errors across discovered packages. `CatalogValidationError.diagnostics` retains each file path, error and optional line/column. Example shape:

```text
skills/education/example-skill/SKILL.md:3:1: description: Invalid input...
skills/design-ux/example/metadata.json: sector: Invalid input...
skills/design-ux/example/examples/input.md:5:1: Unsafe link: ../secret.md
```

No output is rewritten if source validation fails. The generator validates all packages before selecting visible entries. Output ordering is stable and has no generated timestamps or fabricated source-control dates.

## File and reference safety

All package boundaries reject symlinks, including links that stay inside the tree. Files must be UTF-8 text with supported `.md`, `.json`, `.txt` or `.csv` extensions. Limits remain 100 files, 256 KiB/file and 1 MiB/package, with bounded traversal depth and directory entries. Filesystem builds assume a stable checkout, not concurrently hostile filesystem mutation.

Portable file paths reject absolute/drive paths, backslashes, percent-encoded names, traversal/dot segments, control characters, reserved platform names and case collisions. Markdown inline links, image references and reference definitions are parsed structurally. Local references must resolve within the package using allowed relative paths; encoded traversal, double encoding, credential-bearing URLs and executable/file schemes fail. Parent traversal is rejected even when it might remain in the package. Raw HTML is rejected; illustrative markup must be fenced as code. Remote URL availability and anchor existence are not checked.

The site additionally skips HTML, sanitizes Markdown and disables remote image loading. Its ZIP download revalidates the package, prefixes entries with the safe skill slug and enforces the same file constraints before creating an archive. Downloading never executes a skill. Natural-language prompt safety, professional correctness, licensing and review evidence still require human judgment.

## Test coverage

Node tests cover parser variants, schema/path validation, YAML locations, aggregated invalid-package diagnostics, optional metadata, deterministic generation, freshness failure, new-package discovery, symlink boundaries, unsafe/encoded references and ZIP round trips. Component tests cover generated-data consumption, search/filter state, detail previews, themes, loading/error/retry and malicious Markdown. Browser tests cover responsive/keyboard journeys, source-derived detail links, real ZIP downloads and automated axe scans in light/dark themes. See [marketplace development](marketplace.md) and [implementation status](IMPLEMENTATION_STATUS.md) for actual results.
