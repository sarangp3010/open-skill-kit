---
name: care-handoff-organizer
description: Organize supplied nonclinical care-transfer notes into an attributable handoff with open questions; use when a coordinator prepares records for the receiving care team.
---

# Care Handoff Organizer

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Organize supplied nonclinical care-transfer notes into an attributable handoff with open questions; use when a coordinator prepares records for the receiving care team. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Supplied transfer notes with timestamps and authors; intended receiving team; locally approved handoff fields; unresolved administrative tasks; minimum necessary identifiers.

## Workflow

1. Establish the sending and receiving roles, transfer time and approved communication channel. Use case labels instead of direct identifiers in working drafts; request missing recipients rather than guessing.

2. Build an attributed timeline from the supplied notes. Keep the event time separate from the time the note was recorded; preserve uncertainty and distinguish patient-reported information from clinician-authored records.

3. Copy existing care instructions verbatim only when needed for the administrative transfer, retaining their source and date. Do not reconcile conflicting medication lists, interpret results or change clinical instructions.

4. Separate completed logistics from pending records, transport arrangements and callback requests. For each unresolved item name the supplied owner, receiving role and due time; use unassigned if none is supplied.

5. Flag conflicting or missing facts as questions for the responsible professional. If the notes describe immediate danger, stop routine summarization and direct the coordinator to their local urgent escalation process.

6. Read back the handoff against the source list and ask the receiving team to acknowledge the outstanding items. Mark the document draft until the authorized team reviews it; acknowledgement is not clinical clearance.

## Output

- Case label and transfer context.
- source-indexed timeline.
- confirmed logistics.
- pending-item table (item, source, owner, due time, acknowledgement).
- contradictions and questions.
- review status.

## Boundaries

Administrative organization only, not clinical handover certification, triage, diagnosis or treatment. Do not infer fitness for transfer, discharge authorization or urgency from incomplete notes. Protect patient information and follow the organization’s approved escalation and record-retention procedures. No real patient data belongs in public examples.

Qualified care professionals must verify the source records, timestamps and receiving-team acknowledgement before relying on a transfer summary.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
