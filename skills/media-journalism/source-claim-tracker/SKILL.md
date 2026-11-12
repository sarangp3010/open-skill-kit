---
name: source-claim-tracker
description: Build an editorial claim ledger linking draft statements to supplied evidence; use when an editor needs attribution, contradictions and verification gaps before publication.
---

# Source Claim Tracker

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Build an editorial claim ledger linking draft statements to supplied evidence; use when an editor needs attribution, contradictions and verification gaps before publication. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Draft text; source excerpts with IDs, dates and provenance; quote permissions if supplied; editorial scope and publication cutoff; confidential-source handling rules.

## Workflow

1. Split the draft into checkable factual claims, attributed opinions and commentary. Keep compound claims separate so one supported detail does not validate an entire sentence.

2. Link each claim to the exact supplied source excerpt and date. Distinguish primary records, secondhand summaries and unverified statements; never invent an interview or source access.

3. Compare the scope, time period, units and denominator of each source to the draft wording. Note whether the evidence supports, contradicts or only partially addresses the claim.

4. Keep exact quotations separate from paraphrases and flag missing quotation context or permission questions. Do not expose confidential identities in the public-facing ledger.

5. List contradictions and required follow-up questions with owners supplied by the editor. Do not resolve a conflict merely because one source is newer, more confident or more convenient.

6. Return an editor-review ledger and suggested qualified wording where supported. Publication remains pending for unresolved factual claims; this workflow neither contacts sources nor publishes content.

## Output

- Claim-ID ledger.
- draft wording.
- source references/date.
- support status and scope caveat.
- quote/paraphrase distinction.
- follow-up owner.
- suggested wording and publication blockers.

## Boundaries

No claim of live fact checking, independent source authentication or legal clearance. Supplied excerpts can be incomplete or false. Do not fabricate quotes, statistics, interviews or verification labels; independently check consequential claims before publication.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
