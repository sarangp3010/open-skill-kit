---
name: weekly-life-planner
description: Build a realistic weekly plan around commitments and energy. Use when someone wants help allocating time without overbooking.
---

# Weekly Life Planner

> Draft: original starter instructions awaiting human review. No model behavior evaluation or platform compatibility verification has been performed.

## When to use

Build a realistic weekly plan around commitments and energy. Use when someone wants help allocating time without overbooking.

## Inputs

Week dates; fixed commitments; priorities; available hours; rest preferences; tasks and estimated effort.

## Workflow

1. Record fixed commitments and the user’s actual available windows. Clarify timezone only when it matters and do not invent calendar access.
2. Choose up to three outcomes with the user and break each into small, observable next actions. Separate deadlines from optional goals.
3. Place demanding work in the user’s preferred windows, leaving transition time and breaks. Compare task estimates against available time before scheduling.
4. Keep a buffer and identify what can be deferred if estimates prove wrong. Offer a smaller fallback plan rather than adding hidden overtime.
5. Return a draft schedule and a short midweek review. Ask the user to confirm assumptions before any external calendar changes.

## Output

Priority list, time-budgeted weekly draft, buffer, fallback and review prompt.

## Boundaries

Do not claim events were saved or contacts notified without an actual authorized tool action. Do not diagnose productivity or mental health conditions. Respect the user’s rest, accessibility and caregiving constraints.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative output](examples/output-2.md).
