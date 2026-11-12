---
name: volunteer-coverage-planner
description: Build a volunteer assignment draft against supplied event roles and availability; use when a sports organizer needs conflict and coverage gaps made visible.
---

# Sports Volunteer Coverage Planner

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Build a volunteer assignment draft against supplied event roles and availability; use when a sports organizer needs conflict and coverage gaps made visible. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Event schedule/time zone; required roles and headcounts; volunteer availability and supplied qualifications; shift/break rules; safeguarding and emergency-role approval process.

## Workflow

1. List each event interval, location and required role using the organizer’s definitions. Distinguish ordinary support roles from approved medical, safeguarding, security or official roles.

2. Create a roster using only supplied availability and role eligibility. Missing qualifications are unknown, not satisfied; do not infer suitability from age, identity or prior enthusiasm.

3. Assign candidates to non-overlapping intervals and include travel/changeover constraints where supplied. Check break rules and do not double-book one volunteer to fill two simultaneous gaps.

4. Count assigned people against the required headcount for every interval/role. Report uncovered slots explicitly instead of assuming an on-call person can cover incompatible duties.

5. Prepare contingency questions and a communication draft for organizer approval. Do not recruit, contact volunteers or designate an unqualified person to a specialist role.

6. Return the proposed rota with pending confirmations, gaps and approval owners. Separate staffing arithmetic from event safety clearance and keep emergency planning with authorized personnel.

## Output

- Requirement table.
- candidate rota.
- interval/role coverage totals.
- double-booking and qualification blockers.
- break/changeover assumptions.
- pending confirmations and escalation owner.

## Boundaries

Not safety clearance, medical staffing advice, safeguarding vetting or authority to run an event. Do not fill specialist roles without supplied eligibility and organizer approval. Keep volunteer personal/contact data out of public rosters.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
