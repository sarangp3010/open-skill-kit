---
name: contract-obligation-tracker
description: Extract explicit duties and notice triggers from supplied contract excerpts into a source-linked tracker; use when a contract manager prepares questions and operational reminders for counsel.
---

# Contract Obligation Tracker

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Extract explicit duties and notice triggers from supplied contract excerpts into a source-linked tracker; use when a contract manager prepares questions and operational reminders for counsel. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Contract version and excerpts with clause references; party-role mapping; definitions; supplied event dates; business-day calendar and counting rule if deadlines are requested.

## Workflow

1. Identify the supplied agreement version, parties and excerpts in scope. State what is missing; do not assume an excerpt contains every amendment, exception or governing definition.

2. Extract each express actor, action, trigger, condition, deadline phrase and evidence requirement. Quote only the minimum necessary clause text and retain the clause reference for review.

3. Separate a contractual duty from a discretionary right, permission or proposed negotiation point. Keep ambiguous modal language visible and ask counsel to resolve interpretation.

4. Calculate a candidate date only when the triggering event, counting rule, time zone and applicable calendar are supplied. Show the steps and assumptions; otherwise retain the original deadline phrase as unresolved.

5. Map each operational reminder to an owner supplied by the requester, not an assumed legal representative. Identify conflicting excerpts and dependencies without choosing which clause controls.

6. Return a draft tracker and a counsel-question list. Require authorized review before creating notices, relying on dates or asserting compliance; no external notice is sent by this workflow.

## Output

- Obligation table (clause, actor, action, trigger, deadline text, candidate date, evidence, owner).
- discretionary rights.
- conflicts.
- missing definitions.
- questions for counsel.

## Boundaries

Not legal advice, a deadline guarantee or a determination of enforceability, breach or compliance. Jurisdiction and counting rules can change the result. Do not invent authorities, governing law or legal citations. Do not send notices or represent a party.

A qualified legal professional must verify source excerpts against the full agreement and applicable current authorities before relying on any date or interpretation.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
