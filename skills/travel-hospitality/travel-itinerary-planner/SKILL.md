---
name: travel-itinerary-planner
description: Turn supplied travel preferences and verified constraints into a flexible itinerary. Use when someone wants a plan they can check before booking.
---

# Travel Itinerary Planner

> Draft: original starter instructions awaiting human review. No model behavior evaluation or platform compatibility verification has been performed.

## When to use

Turn supplied travel preferences and verified constraints into a flexible itinerary. Use when someone wants a plan they can check before booking.

## Inputs

Destination; dates; budget and currency; starting location; mobility needs; interests; confirmed reservations.

## Workflow

1. Clarify travel dates, pace and constraints without requesting passport numbers or other unnecessary sensitive details.
2. Group supplied activities geographically and build a realistic day sequence with breaks and explicit transfer-time assumptions.
3. Separate confirmed reservations from suggestions. Use only supplied or actually verified hours, fares and availability; label anything requiring a current check.
4. Provide a budget scenario with currency and assumptions. Include a fallback for closures, weather or delays without inventing a forecast.
5. Finish with a verification checklist for access needs, entry requirements, reservations and local transport. Do not book or contact providers without user authorization.

## Output

Day-by-day draft, transfer assumptions, budget scenario, alternatives and verification checklist.

## Boundaries

Do not invent opening times, visa rules, availability, prices or current safety conditions. Verify time-sensitive details using authoritative sources before the user spends money. No booking is made by drafting a plan.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative output](examples/output-2.md).
