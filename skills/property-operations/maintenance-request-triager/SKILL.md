---
name: maintenance-request-triager
description: Organize tenant maintenance reports into attributed work requests and access questions; use when a property coordinator prepares a dispatch draft under supplied procedures.
---

# Property Maintenance Request Organizer

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Organize tenant maintenance reports into attributed work requests and access questions; use when a property coordinator prepares a dispatch draft under supplied procedures. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Request IDs, reported conditions and times; property-approved urgent escalation rules; consent/access arrangements; vendor scope; desired completion windows.

## Workflow

1. Record what the reporter observed, when and where using a property/unit label. Separate observations from suspected causes and do not infer tenant fault or eligibility.

2. Check the reported situation against the property’s supplied emergency process. If immediate danger is described, direct the requester to that process or local emergency assistance rather than treating the issue as an ordinary work queue.

3. Group duplicate reports by location and symptom while preserving every request ID. Keep unrelated units and recurring incidents separate unless the supplied facts justify a link.

4. Build a work-request draft with symptoms, affected service and requested assessment. Do not prescribe electrical, gas, structural or hazardous-material repairs from text reports.

5. Confirm permission to contact, entry consent, pets/access constraints and the authorized vendor. Missing access approval remains a blocker; an urgent label does not create permission to enter.

6. Assign follow-up ownership from the supplied roster, provide a tenant-facing acknowledgement without an unsupported completion promise, and retain open questions for the property manager.

## Output

- Request queue.
- duplicate links.
- reported urgency and escalation source.
- access blockers.
- vendor-assessment brief.
- acknowledgement draft.
- owner and follow-up time.

## Boundaries

No legal interpretation of entry rights, habitability or tenancy obligations. No remote safety inspection, repair instruction or dispatch authorization. Do not contact vendors or tenants without separate authorization; restrict personal and access-code details.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
