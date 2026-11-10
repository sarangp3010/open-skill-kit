# Founding Skills Review

The [42 reproducible review packets and proposed 12-skill shortlist](../reviews/founding/README.md) are preliminary assistant content triage for the owner. They are **not maintainer approval**, security verification, originality certification, identity verification, platform tests or effectiveness measurements. All 42 source packages remain drafts. The actual publication ledger and maintainer review directory contain no approval records.

## Reproduce and inspect

```sh
pnpm founding:review
pnpm founding:check
pnpm evaluate:fixtures
pnpm validate:all
```

`founding:review` regenerates only `reviews/founding/reports/` and its summary. `founding:check` compares them read-only; CI and the full local suite run this check. Neither command writes a maintainer decision, changes package status, or edits the publication ledger. Unexpected orphan reports cause an error instead of silent deletion. Source packages, pending submissions, archives, evidence reports and npm/marketplace publication policy remain separate.

Each JSON packet contains the exact all-file SHA-256 publication digest, individual source-file hashes, existing schema results for both profiles, every structural quality check, authored safety boundaries, task-specific preliminary concerns, declared provenance, normalized-body copy indicators, related-task overlaps, expected outputs, example/case coverage, next review actions, platform declarations versus recorded testing, authored fixture definitions and actual stored evaluation artifacts. The source note is individually hashed so unrelated editorial notes do not invalidate a packet. File sorting and stable JSON make regeneration deterministic; runtime and fabricated dates are excluded. This reuses the existing parser, validator, quality system, adapters and evidence assessor.

No local exact-body matches were detected. That does not establish originality: contributor provenance is self-declared, common starter structure exists, and related tasks may overlap semantically. No external plagiarism or rights investigation was performed. A useful task description is an editorial judgment, not evidence that an agent performed well.

## Findings for owner review

All 42 pass catalog and publication-schema validation. Nineteen have a structural score of 100; lower scores identify discovery metadata or output structure improvements, not measured lower effectiveness. All four installation adapters are documented, but all 42 lack completed platform behavior records. Twenty offline suites define 40 paired scenarios. Their authored outputs are not model observations; identical baseline/assisted arms cannot show improvement. Only the previously stored Code Reviewer fixture report appears as completed artifact evidence. Fresh local replay reports go to ignored evaluation output and are not automatically promoted into the marketplace.

The 12 proposed launch candidates span technology, education, people/careers, business, productivity and retail. They have lower declared risk, bounded supplied-text tasks and scores of at least 85. Code Review Expert overlaps Code Reviewer, Resume Tailoring Assistant overlaps Resume Reviewer, and weekly planning versus retrospective scope should remain distinct. Higher-stakes care, legal, accounting, construction, energy, fleet, manufacturing and similar record-organizing skills need qualified domain review even when structural scores are 100. Keep their drafts available only with existing draft labels, outside published distribution.

## Human review and local approval procedure

1. Choose one packet. Read **every package file**, both examples, behavior cases, supporting material, every check, provenance/rights claims and relevant fixtures. Follow the [maintainer review checklist](../templates/maintainer-review.md). Resolve blockers; seek qualified reviewers for consequential domains. Record unperformed tests and unresolved limitations honestly.
2. If proposing publication, explicitly change the package metadata to `published`, remove staging manifests and complete any edits **before** reviewing its final contents. This is only an authored candidate: existing gates still prevent publication. Regenerate the catalog and founding report. Any file edit, including a status change or `tests/platform-results.json`, changes its publication digest and requires a fresh review. Do not reuse a draft hash for promoted contents.
3. Prepare an **unsigned** form locally. Use a new filename; shell redirection can overwrite a file, so do not reuse an existing review filename:

   ```sh
   pnpm --silent founding:prepare software-development/code-reviewer > /tmp/code-reviewer-review.json
   ```

   The template contains `null` for reviewer, review date, decision and PR number; all eight review answers are blank. It is deliberately invalid as a completed review. The command never invents human fields or emits an approval record. It pre-populates only objective file/report references and hashes.

4. An actual authorized maintainer fills their GitHub login, actual ISO UTC review date, real PR number, decision (`approved`, `rejected` or `withdrawn`), rationale and substantive answers for schema, safety, originality, usefulness, completeness, compatibility, evaluation and limitations. Add genuine local evidence paths and raw-file SHA-256 values as needed. Never write `approved` merely because automated checks pass. Do not put private source records or sensitive reviewer evidence in the public repository.
5. Run `pnpm founding:check-review /tmp/code-reviewer-review.json`. It checks schema, authorized roster membership, nonfuture date, current package identity/hash, promotion eligibility, report identity/hash, source-file and fixture/artifact hashes, and evidence path safety. It **does not authenticate the person named**, perform the human review, generate approval records or modify a ledger. Approval of a draft is rejected; rejected/withdrawn reviews can retain draft status. A passed local check is only integrity checking.
6. Only after performing the real review, the maintainer manually saves the completed form at a unique `reviews/maintainer/<review-name>.json`. Preserve previous forms as history. For publication or withdrawal, manually enter a matching decision in the **existing** `catalog/publication-reviews.json`. Record its `reviewRecord: { "path": "reviews/maintainer/<review-name>.json", "sha256": "<actual raw JSON file hash>" }` alongside the identical skill ID, full package hash, reviewer, date, decision, PR number and reason. Rejected review forms remain outside the publication ledger, whose allowed dispositions stay `approved`/`withdrawn`.
7. Run `pnpm moderation:check`, `pnpm skills:index`, `pnpm founding:check` and the full suite. The registry reader used by the catalog and npm builder requires a bound completed review for an approved decision; missing/stale/altered evidence fails closed. Merely saving a review form cannot publish anything.
8. Submit through the existing PR process. The hosted moderation check separately requires a genuine current-head GitHub approval from an authorized maintainer distinct from the author, and an authorized maintainer merge to the canonical main branch. The trusted base roster controls authorization. A missing initial base roster falls back only to the existing repository owner, never a candidate PR roster. No automatic merge is introduced. Local identity assertions do not replace GitHub review evidence.

The workflow does not sign identities cryptographically or change repository settings. An owner must independently configure/enforce branch-required reviews and checks, and inspect privileged changes. Local files cannot prevent a repository administrator from bypassing rules. No remote configuration or actual maintainer approval has been performed as part of this implementation.

## Changes, rejection and revocation

A failed schema, stale digest, missing reference, invalid evidence path, conflicting claim or unresolved domain concern means revise or reject, retaining the draft and recording the reason. Preserve contributor URLs and explain the next actionable step; do not interpret a rejection as an assertion of malicious intent.

Any package edit invalidates approval for its previous digest. Regenerate reports and request a new explicit review of the final bytes. Keep earlier completed review forms unchanged, add a new form, and update the current publication decision through a new PR. Changes cannot borrow an unrelated historical PR approval.

To revoke, retain a `withdrawn` current ledger decision with the actual reviewer, date, PR and reason; if attaching a new withdrawal form, bind its exact hash and matching fields. Existing ledger decisions must not be deleted to erase withdrawal history. Withdrawal immediately excludes the skill from published catalog/npm generation, regardless of unchanged package hash. Reinstatement needs a new explicit review and genuine PR approval; replaying an old form is insufficient. For urgent professional/security concerns, follow SECURITY.md and the existing moderated-removal procedure. The source may remain a clearly marked draft for historical URLs, or be removed through reviewed changes; unapproved sources never gain publication automatically.
