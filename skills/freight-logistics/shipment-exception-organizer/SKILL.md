---
name: shipment-exception-organizer
description: Reconcile supplied shipment milestones and draft an exception follow-up; use when a logistics coordinator needs traceable delay, quantity and next-contact records.
---

# Shipment Exception Organizer

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Reconcile supplied shipment milestones and draft an exception follow-up; use when a logistics coordinator needs traceable delay, quantity and next-contact records. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Shipment/order labels; booked and observed milestones with time zones; item/pallet quantities and units; supplied carrier messages; escalation policy and customer promises.

## Workflow

1. Match shipment, order and carrier references without assuming similarly named loads are identical. Record the source time and time zone of every milestone.

2. Compare planned versus observed milestones using compatible timestamps. Distinguish a missed milestone from missing telemetry and an estimated arrival from a carrier-confirmed commitment.

3. Reconcile dispatched, received, damaged and unlocated quantities using the same unit. Do not infer that an unconfirmed pallet is lost or that a sealed shipment is undamaged.

4. Classify the exception under the supplied operating policy, retaining any unknown cause. Ask the carrier or receiving team for specific missing evidence rather than inventing tracking updates.

5. Draft separate internal next actions and customer-facing language. Do not promise a replacement date, issue a credit or file a claim without authorized decisions and actual terms.

6. Prepare the case record with owner, next contact time and closure evidence. An acknowledgement or guessed ETA does not close the exception; require the supplied resolution criterion.

## Output

- Shipment identity.
- planned/observed timeline.
- quantity reconciliation.
- exception and uncertainty.
- owner/next contact.
- customer update draft.
- closure evidence required.

## Boundaries

No live tracking access, customs advice, insurance interpretation or automatic carrier/customer contact. Do not classify goods as safe, lost or compliant without evidence. Protect commercial and recipient information.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
