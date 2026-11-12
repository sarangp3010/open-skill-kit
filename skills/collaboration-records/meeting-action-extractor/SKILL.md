---
name: meeting-action-extractor
description: Extract decisions, explicit commitments and unresolved proposals from supplied meeting notes; use when a team needs an attributable action register without invented owners or deadlines.
---

# Meeting Action Extractor

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Extract decisions, explicit commitments and unresolved proposals from supplied meeting notes; use when a team needs an attributable action register without invented owners or deadlines. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Meeting notes/transcript with speaker labels; meeting date and time zone; participant-role mapping; supplied deadline conventions; desired register scope.

## Workflow

1. Identify the meeting context and source completeness. Keep direct speaker statements separate from a note-taker’s interpretation; do not imply access to a recording that was not supplied.

2. Separate decisions, accepted actions, suggestions and open questions. A suggestion with no acceptance is not an assigned action, and silence is not consent.

3. Extract the action verb, deliverable, explicitly accepting owner, dependencies and stated deadline phrase. Missing owners or dates stay unassigned or unspecified.

4. Normalize relative deadlines only when the meeting date, time zone and counting convention are sufficient. Preserve the original phrase alongside any candidate date and ask about ambiguity.

5. Flag contradictory decisions, duplicate tasks and conditional commitments. Merge duplicates only when deliverable and owner match; retain source references and unresolved alternatives.

6. Return the register and a short confirmation message for participants to review. Do not send reminders, create tasks in external systems or declare work complete from a promise alone.

## Output

- Meeting context.
- decision log.
- accepted action table (source, deliverable, owner, original deadline, candidate date, dependency).
- proposals/questions.
- confirmation draft.

## Boundaries

No invented consensus, ownership, deadlines or completion status. Sensitive personnel or client details should be omitted from broad circulation. This workflow organizes supplied text and does not autonomously contact people or modify task systems.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
