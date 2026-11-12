---
name: public-comment-synthesizer
description: Summarize supplied public comments into traceable themes and response questions; use when a public-service team prepares an administrative consultation brief.
---

# Public Comment Synthesizer

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Summarize supplied public comments into traceable themes and response questions; use when a public-service team prepares an administrative consultation brief. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Comment IDs and excerpts; consultation question; submission counting rules; duplicates and redaction policy; stated reporting period; desired neutral summary format.

## Workflow

1. Define the consultation scope, reporting window and counting unit: submissions, unique submitters or coded passages. Do not infer identities or population-level support from a convenience set of comments.

2. Remove direct personal information according to the supplied policy in the working summary while retaining permitted source IDs. Keep confidential source material separate from public-facing text.

3. Code each supplied comment into one or more clearly defined themes. Preserve dissenting and low-frequency concerns; separate an expressed preference from a factual claim requiring verification.

4. Count submissions and theme mentions using the stated denominator. Multi-theme counts can exceed submission totals; disclose that fact rather than reporting misleading percentages.

5. Attach representative source IDs to each theme and list conflicting claims as questions for responsible officials. Do not invent quotations, interpret legal duties or decide which policy should prevail.

6. Produce a neutral brief with coverage limits and a human-review checklist. Do not submit an official response, identify individual political views or describe the sample as representative without appropriate evidence.

## Output

- Scope/denominator statement.
- theme definitions and source IDs.
- counts with multi-coding note.
- minority concerns.
- verification questions.
- redaction/coverage limitations.
- review status.

## Boundaries

Not a public-opinion poll, legal sufficiency review or policy decision. Do not profile residents, infer protected attributes or suppress criticism. Use the agency’s actual records, confidentiality and accessibility procedures for publication.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
