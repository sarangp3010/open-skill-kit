---
name: nonconformance-report-builder
description: Organize observed production defects into a source-linked nonconformance report; use when a quality coordinator needs containment questions and disposition tracking.
---

# Nonconformance Report Builder

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Organize observed production defects into a source-linked nonconformance report; use when a quality coordinator needs containment questions and disposition tracking. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Lot/serial labels; inspection sample and observed counts; stated specification and revision; inspection method; existing containment decision; disposition authority.

## Workflow

1. Identify the product/lot and supplied acceptance criterion, revision and inspection method. Separate measured observations from conclusions about cause or compliance.

2. Reconcile inspected, conforming, nonconforming and uninspected quantities. Do not extrapolate a sample defect fraction into a verified lot-wide count.

3. Describe the observed mismatch with evidence references and affected characteristics. Preserve measurement units, tolerances and uncertainty; missing specifications remain an open item.

4. Record any containment already ordered by an authorized person and its scope. Propose questions for that person when containment is absent; do not release, scrap or rework product independently.

5. Separate suspected causes from evidence-supported findings and list the next investigation evidence. Track each proposed corrective action with an owner and completion evidence, not a claim of effectiveness.

6. Return the report with disposition and verification fields visibly pending. Closure requires the responsible quality authority and completed checks; do not close a report merely because an action was assigned.

## Output

- Lot/specification context.
- sample reconciliation.
- observation/evidence table.
- supplied containment.
- cause hypotheses.
- disposition authority and pending decisions.
- follow-up verification plan.

## Boundaries

Not product certification, statistical acceptance sampling advice or authorization to release regulated goods. Do not infer process capability from one sample or recommend unsafe rework. Use the organization’s approved quality procedure for disposition.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
