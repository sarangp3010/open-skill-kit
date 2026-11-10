---
name: outage-planning-brief
description: Organize approved energy-asset work requests into a dependency and communication brief; use when an operations planner needs scheduling questions without operating instructions.
---

# Outage Planning Brief

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Organize approved energy-asset work requests into a dependency and communication brief; use when an operations planner needs scheduling questions without operating instructions. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Asset labels; approved work scopes; supplied dependency map; proposed outage windows/time zones; named authorization roles; stakeholder communication requirements.

## Workflow

1. Fix the assets, work-request versions and scheduling time zone. Separate an approved scope from a requested window and an operating authorization; none implies the others.

2. List supplied prerequisites, resource conflicts and restoration dependencies. Do not infer electrical connectivity, isolation points or safe work methods from an asset name.

3. Calculate candidate sequential/parallel durations only from explicit dependencies and estimates. Show the arithmetic and keep contingency separate from the earliest theoretical finish.

4. Compare candidates with the supplied availability window and identify unconfirmed critical assumptions. Ask responsible operations staff to validate actual system constraints and resource availability.

5. Prepare a communication matrix using supplied owners, decision times and audiences. Missing switching, permit or safety authorization is a blocker for authorized staff, not a field to be completed by inference.

6. Issue a planning-only brief with decision gates and recovery questions. Do not initiate work, provide switching/isolation steps or declare restoration ready; authorized professionals control operational release.

## Output

- Asset/work context.
- supplied prerequisites.
- duration arithmetic.
- candidate schedule and assumptions.
- resource/authorization blockers.
- stakeholder matrix.
- review and restoration decision gates.

## Boundaries

Not electrical engineering, dispatch, switching, isolation, lockout/tagout or safety instruction. No inference of energization state or safe access. A schedule that fits a window is not operational authorization, grid adequacy analysis or permission to work.

Qualified operations professionals must verify the source dependency and authorization records before approving any actual outage or work window.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
