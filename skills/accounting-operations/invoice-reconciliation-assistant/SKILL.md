---
name: invoice-reconciliation-assistant
description: Reconcile supplied invoice lines against purchase orders and receipts; use when an accounts-payable reviewer needs a traceable exception list before approval.
---

# Invoice Reconciliation Assistant

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Reconcile supplied invoice lines against purchase orders and receipts; use when an accounts-payable reviewer needs a traceable exception list before approval. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Invoice, purchase-order and goods-receipt IDs; line quantities and units; unit prices; currency; stated tax and shipping treatment; organization-approved tolerances.

## Workflow

1. Confirm the comparison scope, currency and whether amounts include tax. Keep every original document ID and line reference; do not combine documents just because vendor names look alike.

2. Match each invoice line to the supplied order and receipt using item, unit and reference. Separate unmatched lines, partial receipts, duplicate invoice IDs and credit notes before calculating differences.

3. Calculate invoiced and received extensions from stated quantities and unit prices. Keep quantity variance distinct from price variance; show the arithmetic and rounding convention instead of inventing a tolerance.

4. Account for stated shipping, discounts and tax in separate rows. If tax treatment, exchange rate or unit conversion is absent, mark the relevant total unresolved rather than borrowing a current rate.

5. Classify each exception by the supplied approval policy: within tolerance, investigate or unresolved. Missing policy never means auto-approve; obtain independent vendor verification through an established channel for changed payment details.

6. Produce a reviewer packet with source references, calculations and assigned follow-ups. Keep payment status pending unless the authorized reviewer supplies approval; never initiate a payment or alter vendor banking information.

## Output

- Document match table.
- line arithmetic.
- quantity/price/tax exceptions.
- duplicate flags.
- unresolved inputs.
- proposed reviewer/next action.
- approval status.

## Boundaries

Bookkeeping support only, not audit assurance, tax advice or payment authorization. Do not infer fraud from a mismatch. Do not expose bank details or alter financial records without separate authorization. Use supplied policies and ask a qualified reviewer to determine accounting treatment.

A qualified accounting professional must verify the invoice, order and receipt source records before approving an adjustment or payment.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
