# Skill quality and marketplace trust

Quality, validation, editorial status, installation support and actual testing are separate signals. A high structural score does not prove accuracy, professional safety, originality, human review or assistant behavior. Open Skill Kit does not generate a verified badge from a score, compatible-platform declaration, legacy testing date or published status.

## Deterministic rubric v1

The existing validator produces the report; the catalog and CLI reuse it. No model/API is called. Each check awards all of its fixed weight when it passes and zero otherwise. Missing optional authoring information is advisory, not a new validation failure. Warnings never silently promote editorial status.

| Check ID             | Points | Requirement                                                                                                                 |
| -------------------- | -----: | --------------------------------------------------------------------------------------------------------------------------- |
| identity             |     10 | Parse frontmatter and match folder/metadata identity.                                                                       |
| discovery-metadata   |     10 | Explicit title/displayName, at least one tag and difficulty.                                                                |
| provenance-metadata  |     10 | Author, license, version and provenance; reject TODO/TBD/your name/replace before submission placeholders for these points. |
| capability-metadata  |      5 | Risk level and at least one declared capability.                                                                            |
| activation           |      5 | Activation language in description and a populated When to use section.                                                     |
| instruction-sections |     15 | Nonempty When to use, Inputs, Workflow, Output and Boundaries sections.                                                     |
| actionable-workflow  |     10 | At least three top-level ordered workflow steps parsed from Markdown; fenced examples do not count.                         |
| structured-output    |      5 | A list or fenced output format in Output.                                                                                   |
| example-pair         |     10 | A referenced, nonempty input and expected-output example.                                                                   |
| example-variety      |     10 | At least two inputs and two outputs with four distinct contents. This does not evaluate their correctness.                  |
| file-references      |      5 | Existing relative-reference and external-scheme checks pass, including declared example/evidence files.                     |
| package-safety       |      5 | Existing file/path/size/collision/text/raw-HTML checks pass. No scripts execute.                                            |

The 12 weights total 100. Reports include score, rawScore, blocked, rubricVersion and each check's status, weight, earned points, message and file paths. Status is pass, warn, fail or not-evaluated. Invalid packages are blocked at score zero even if some raw checks passed; unassessed checks do not earn points. Invalid packages continue to fail catalog generation rather than appearing as trusted marketplace entries. The quality command can explain an invalid local package by its full sector/slug ID.

This rubric measures detectable authoring structure, not semantic correctness or the truth of provenance. For example, prose can describe a valid output contract without using a list and lose five advisory points. Do not rewrite useful prose solely to imply stronger trust. The existing optional metadata policy is preserved; old valid drafts do not become invalid for missing difficulty, examples or provenance.

## Local quality CLI

```sh
pnpm build:npm
pnpm cli quality software-development/code-reviewer --source ./skills
pnpm cli quality software-development/code-reviewer --source ./skills --json
pnpm skills:validate
pnpm skills:index
pnpm catalog:check
```

The CLI prints the same report, diagnostics, compatibility rows and content digest used by the generator. Invalid packages return a nonzero exit code after emitting their blocked report. --json produces machine-readable stdout. Read failures, unsafe filesystem entries and unknown skills fail with path-aware errors instead of inventing a report. Quality is read-only. Existing list/show/add and Phase 2 lifecycle commands retain their behavior and publication policy.

## Compatibility and completed-test records

Each generated skill has one row per supported platform. Installation is documented or unsupported based on the shared adapter/name conventions. It does not establish runtime tool access or successful model execution. Optional metadata compatiblePlatforms is an explicit contributor declaration. Legacy testedPlatforms/testedWith and lastVerified remain accepted under the existing date rule, but are displayed as declarations and a declared date, never as completed test proof.

Actual completed test records live in optional tests/platform-results.json. Each run requires a supported platform, actual platformVersion, runner, ISO completion timestamp, passed/failed outcome, packageDigest and safe nonempty evidencePath under tests/evidence/. Duplicate completion times for the same platform are rejected as ambiguous. A cases.json behavior scenario is not a completed test record.

To record a real authorized test:

1. Run the assistant/test procedure only with the user's authorization and appropriate permissions. Record what actually happened, including failures and limitations. Do not infer a result from static validation or fabricate model execution.
2. Save the actual text artifact under tests/evidence/ using an admitted file extension such as .txt. Exclude secrets and private user data. Test records and evidence are public package content.
3. Finish all package/log edits, then obtain packageDigest using the quality CLI JSON output. The digest is SHA-256 of UTF-8 JSON.stringify applied to lexically sorted [relativePath, content] pairs for every package file except tests/platform-results.json itself. Logs are included; edits to instructions, examples, metadata or evidence invalidate old records. No machine paths or timestamps are fabricated.
4. Write the completed record. The following is a format illustration with deliberately invalid placeholders, not evidence:

```json
{
  "schemaVersion": 1,
  "runs": [
    {
      "platform": "codex",
      "platformVersion": "<actual installed version>",
      "runner": "<person or test runner that completed the test>",
      "completedAt": "<actual ISO completion timestamp>",
      "outcome": "passed",
      "packageDigest": "<64 hex characters from the CLI after saving the log>",
      "evidencePath": "tests/evidence/codex.txt"
    }
  ]
}
```

5. Revalidate and request review. Do not relabel an old record with a new digest without a corresponding completed test. Keep failed outcomes. Add records only for tests performed on the recorded package contents; new artifacts also change the package digest.

Testing states are not-recorded, recorded-pass, recorded-fail or stale. The most recent completed record determines a platform's state; a newer stale/failed run cannot be hidden by an older pass. All records remain inspectable. Missing or malformed evidence fails validation. A digest mismatch is displayed as stale rather than silently discarded or treated as a fresh pass.

Records are contributor-supplied, not signed attestations. The validator checks their format, artifact existence and package binding; it cannot independently establish that an author truthfully executed the stated test. The UI therefore says Recorded pass/failure and never promotes a skill to verified. Independent execution/review remains separate work.

## Marketplace and older catalogs

Cards show structural score, validation state, documented installation platforms and current recorded passing-test counts. Details show all weighted checks, warnings, compatibility declarations, legacy claims and completed/stale evidence. Evidence text is escaped; it is not executed or rendered as raw HTML.

Existing query/sector/capability filters are joined by difficulty, editorial status, minimum score, installation platform, test evidence and validation status. Quality and recorded-test sorts have deterministic title/ID tie-breakers. A testing filter applies to the selected platform, so a Codex pass cannot satisfy a Cursor filter. Filters/sorts remain shareable and survive refresh/back/forward. Editorial review and test evidence are separate choices.

The added discovery fields are optional for older input catalogs; the new UI displays absent reports as not assessed. Quality thresholds exclude unassessed entries. Regenerate the deterministic catalog to obtain current reports; older strict catalog consumers should rebuild with the current schema. Publication-only npm catalog entries are unchanged, and no skill is promoted or bundled solely because of its score.

## Contributor workflow

Copy the reusable [template](../templates/skill/SKILL.md) and its supporting files from templates/skill into skills/<sector>/<slug>. Rename folder, frontmatter name, metadata ID/sector/slug and test-case skillId together. Replace sample instructions, author and provenance. Keep draft status, empty testedPlatforms and null lastVerified until you have truthful declarations and evidence. The template has two realistic example pairs and behavior cases, but no completed platform results.

Run validation, quality assessment, catalog regeneration and the normal tests before requesting human review. High-stakes content still needs domain review and explicit boundaries. See [authoring](skill-authoring.md), [platform installation](platform-installation.md) and [contributing](../CONTRIBUTING.md). No quality command, template operation or local test publishes a package or deploys a website.
