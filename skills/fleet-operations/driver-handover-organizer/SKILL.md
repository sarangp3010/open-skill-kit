---
name: driver-handover-organizer
description: Prepare a vehicle and route handover from supplied dispatch notes; use when a fleet coordinator needs unresolved defects, custody and timing questions recorded.
---

# Driver Handover Organizer

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Prepare a vehicle and route handover from supplied dispatch notes; use when a fleet coordinator needs unresolved defects, custody and timing questions recorded. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Vehicle/route labels; trip times and time zone; recorded inspections/defects; cargo custody; dispatch contacts; locally approved release and escalation process.

## Workflow

1. Confirm the vehicle, outgoing/incoming roles and shift boundary using one stated time zone. Preserve unconfirmed arrival times as estimates and do not infer legal driving availability.

2. Summarize recorded inspection status, fuel/charge as reported, keys/documents and custody changes with source timestamps. A missing check stays missing rather than becoming a pass.

3. Carry every unresolved defect forward with its report ID and authorized review status. Do not label a vehicle roadworthy, minimize a safety report or supply repair instructions.

4. Map the supplied route and cargo milestones to the handover time. Identify impossible or conflicting times without suggesting that the driver speed up, skip rest or bypass a procedure.

5. List missing signatures, cargo counts and receiving contacts for dispatch to resolve. Share only the minimum necessary location/access information through approved channels.

6. Issue a draft acknowledgement checklist. Require the authorized fleet role to confirm release and route readiness; the document does not dispatch a vehicle or assign a driver.

## Output

- Vehicle/shift context.
- custody checklist.
- unresolved defect register.
- milestone timeline.
- release blockers.
- responsible contacts and acknowledgement status.

## Boundaries

Not a roadworthiness inspection, driving-hours determination, route-safety assessment or dispatch order. No hazardous-goods instruction. Qualified dispatch/maintenance staff must apply actual transport regulations and approved procedures.

Qualified fleet professionals must verify source inspection and release records before authorizing any vehicle movement.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
