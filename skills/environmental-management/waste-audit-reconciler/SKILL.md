---
name: waste-audit-reconciler
description: Reconcile supplied waste measurements and diversion categories with explicit denominators; use when a facilities team needs an auditable resource-measurement summary.
---

# Waste Audit Reconciler

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Reconcile supplied waste measurements and diversion categories with explicit denominators; use when a facilities team needs an auditable resource-measurement summary. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Measurement period and site; gross/tare/net weights and units; stream labels; supplied treatment evidence; contamination notes; organizational reporting definition.

## Workflow

1. Fix the reporting boundary, time window and measurement unit. Keep estimated volume, measured mass and invoices separate unless a supplied conversion justifies comparison.

2. Calculate net mass as gross minus tare where both are available. Negative nets, repeated container IDs or missing tare values are exceptions, not zero-weight observations.

3. Classify streams according to the supplied reporting definition and actual treatment evidence. Collection into a recycling bin alone does not establish recycling or diversion.

4. Reconcile the total mass and category denominator before computing percentages. Keep unknown treatment and contamination visible; do not force all material into favorable categories.

5. Show calculations and identify coverage gaps, scale uncertainty and excluded periods. Do not extrapolate a short audit into an annual verified total without an explicitly labeled method.

6. Return a facilities-review summary with improvement questions and evidence requests. Avoid emissions equivalencies, certification or zero-waste claims without appropriate factors, boundaries and independent verification.

## Output

- Boundary/unit statement.
- gross/tare/net table.
- category totals.
- explicit denominator and percentages.
- unknown treatment.
- data-quality exceptions.
- improvement questions and review status.

## Boundaries

Not an environmental certification, legal compliance review, hazardous-waste handling procedure or verified emissions inventory. Do not prescribe disposal for unknown materials. Use qualified waste professionals and applicable local requirements for consequential decisions.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
