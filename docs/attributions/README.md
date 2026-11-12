# Attribution review evidence

No contributor identity reviews have been recorded yet. Existing package author strings are declarations, not verified identities. Do not add sample or invented approvals here.

A maintainer may add a bounded Markdown review record after checking the contributor's identity/consent and authorship or redistribution rights against a real repository pull request. Record what was checked, who reviewed it, when, the actual PR URL, package digest and limitations. A separate reviewer is required. Add the matching record to catalog/attributions.json with the exact SHA-256 of this evidence file and the existing CLI quality command's package digest, then regenerate the catalog.

Records are unsigned maintainer assertions, not automatic identity verification by GitHub or proof of professional qualifications. Protect this directory and the registry through maintainer review. A changed package makes its attribution stale; re-review rather than updating hashes without review. No original skill files need modification. See [contribution guide](../../CONTRIBUTING.md).

## Authorization boundary

Local validation requires the existing catalog/maintainers.json roster, a separate authorized reviewer, a valid non-future UTC review date and bounded, hash-matching evidence. Missing authorization or evidence fails closed. Direct catalog options must match the recorded evidence; a package digest alone cannot supply reviewer authority. These local unsigned records do not independently verify identity, ownership or rights.

The existing moderation command also enforces attribution review in CI, using the trusted base roster and the same read-only GitHub PR/review checks used for publication. New or changed records must reference their own PR, preventing reuse of an unrelated approval. Historical referenced PRs must be merged by an authorized maintainer; the current PR can be checked before merge. Approval must be independent of the PR author, match the exact current head and not be dismissed or superseded by a change request. The recorded review date cannot follow the genuine approval submission date; missing, invalid or future approval dates fail. No extra reviewer allowlist or new credential scope is introduced. Main-only publication rules are unchanged: attribution never promotes a skill or supplies publication approval.

The real roster and attribution registry remain owner-controlled files. CI and review policy must protect changes to the validation code and authorization sources; local file checks are not a cryptographic identity attestation. Actual rights/consent review remains a human responsibility. Synthetic regression fixtures never create real records.
