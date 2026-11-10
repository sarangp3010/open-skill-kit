## Problem and resulting behavior

Describe the task, intended user, scope and relevant issue. For a new skill, give its canonical sector/slug and explain how it differs from existing packages.

## Evidence and validation

List exact commands and outcomes (or explain any check not run):

- pnpm contributions:check
- pnpm skills:index and pnpm catalog:check
- pnpm validate:all (lint, formatting, types, tests, fixtures, skill/link/duplicate/catalog checks, builds, Playwright and local packaging)

Describe examples, missing-input cases and any platform evidence separately. Authored fixtures are not actual agent outputs. Keep failed observations visible; no inferred effectiveness or compatibility claims.

## Provenance and licensing

Identify original work, third-party source URLs/licenses, notices and modifications. Record author metadata as a declaration; attribution review records are maintainer-controlled and require real review evidence.

## Review checklist

- [ ] New skills are drafts with no unsupported testing, review, approval or professional-correctness claims.
- [ ] All package files and local references validate; no scripts, binary payloads, symlinks, unsafe paths or unauthorized external actions were introduced.
- [ ] At least two realistic example pairs and structured behavior-review cases are included for new skills; examples contain no real private data.
- [ ] Existing IDs, URLs, supporting files, download behavior and evaluation evidence are preserved.
- [ ] Catalog was regenerated; documentation matches the change.
- [ ] I have the right to redistribute this contribution under the documented license terms and preserved third-party notices.
- [ ] No secrets or private information are included. Security concerns are reported privately.
- [ ] Workflow/dependency/trust changes are called out for maintainer review. This PR does not request automatic publication or deployment.

## Moderated proposal

- [ ] New community packages are under submissions/{sector}/{slug}/ with a generated submission.json; updates name the current base-package digest.
- [ ] I have not self-approved publication or directly promoted a proposed skill into the public source/catalog.
- [ ] Maintainer-only promotions/withdrawals identify this PR and require fresh current-head approval; no automatic merge or publish is requested.
