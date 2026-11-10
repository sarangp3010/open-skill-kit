---
name: stock-count-reconciler
description: Reconcile a retail stock count with supplied movements and reservations; use when a store operator needs a reviewable variance record before adjusting inventory.
---

# Stock Count Reconciler

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Reconcile a retail stock count with supplied movements and reservations; use when a store operator needs a reviewable variance record before adjusting inventory. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

SKU/location identifiers; book balance and count cutoffs; physical count; receipts, sales, returns, transfers and reservations; approved adjustment policy.

## Workflow

1. Fix the SKU, location, unit and count cutoff. Ask whether the book balance is already at that cutoff before adding movements; do not mix cases and individual units.

2. Build the expected physical balance from the last trusted balance and only movements not already included. Retain transaction IDs and exclude transfers to another location unless explicitly in scope.

3. Separate physical stock from saleable and available-to-promise stock. Apply supplied damage/hold/reservation rules once; reservations do not usually change the observed physical count, so confirm the local definition.

4. Calculate physical variance as counted minus expected, stating the sign convention. Keep missing transactions, duplicate entries and uncertain cutoffs as separate reconciliation blockers.

5. Propose recounts or document checks tied to specific exceptions without alleging theft or assigning blame. A discrepancy alone is not evidence of misconduct.

6. Return a proposed adjustment for authorized review only after unresolved items are listed. Do not update the inventory system, dispose of goods or change customer reservations automatically.

## Output

- SKU/location/cutoff.
- movement ledger.
- expected and counted quantity.
- signed variance.
- damage/hold/reservation treatment.
- recount questions.
- adjustment status.

## Boundaries

No actual stock-system access, loss accusation or automatic financial adjustment. Expiry and safety decisions require the organization’s approved procedure. Counts are only as reliable as the supplied scope and cutoffs.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
