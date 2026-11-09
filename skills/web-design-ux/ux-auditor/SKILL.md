---
name: ux-auditor
description: Audit a supplied interface against a specific user journey and constraints. Use when someone requests UX feedback on screens, flows or prototypes; distinguish observed friction from untested user-research hypotheses.
---

# UX Auditor

Produce a useful result from the supplied evidence while preserving the user’s requested scope. This is a content-complete authoring draft; independent human review and cross-assistant execution tests are pending.

## When to use

Activate for a requested UX audit of a concrete screen, prototype, flow description or interface. Anchor findings to a user completing a task. If the request is only a visual restyle, code implementation or a formal accessibility conformance audit, preserve that narrower task rather than claiming this workflow substitutes for it.

## Inputs

- Primary audience, user goal and success condition for one journey.
- Screens, prototype steps, copy or a textual walkthrough; identify what is actually available.
- Known business, technical, accessibility and platform constraints.
- Research/analytics already supplied, their dates and limitations; no new tracking is assumed.

## Workflow

1. **Frame one journey.** State who is trying to accomplish what, where the journey begins and what counts as completion. If this is unknown, ask one focused question or describe your working assumption. Avoid evaluating every screen against an imagined ideal user.
2. **Inventory the evidence.** List the provided screens and observed states, including loading, empty, error and success states when available. Mark missing interactions as not inspectable. A screenshot does not prove how focus, validation, navigation history or persistence behave.
3. **Walk the task.** Describe the next action a user must discover at each step and what feedback follows. Look for unclear labels, hidden prerequisites, lost context and decisions requiring information the screen has not supplied. Quote supplied labels rather than inventing interface details.
4. **Test consistency and recovery.** Compare labels, units, navigation and affordances across the supplied flow. Check whether users can correct mistakes, understand save/submit outcomes and recover from interruption. Distinguish absent evidence of recovery from a demonstrated lack of recovery.
5. **Classify the concerns.** For each concern record the affected step, evidence, user consequence and confidence. Use observed for directly supplied facts and hypothesis for likely confusion that still needs testing. Do not turn your preference into a measured usability failure.
6. **Prioritize a bounded improvement.** Rank task blockers before smaller friction and aesthetic preferences. Suggest a concrete change consistent with the stated constraints, with an acceptance condition the team can check. Do not propose a broad redesign when a label or state correction may suffice.
7. **Design validation.** Write neutral task prompts and observable outcomes for uncertain findings. Use small consent-based usability sessions or existing approved analytics when appropriate. Define what result would challenge your hypothesis instead of searching only for confirmation.
8. **Return a decision-ready audit.** Summarize the highest-impact changes, preserved strengths and unanswered questions. Keep accessibility risks visible but separate from a formal conformance result. Stop before contacting users, changing tracking, publishing screenshots or modifying a product unless authorized.

## Output

Return a task-led audit:

- Journey, audience and evidence inventory.
- A findings table: step/location, evidence, observed or hypothesis, user impact, priority and recommended change.
- Acceptance conditions for the top changes.
- A short usability validation plan with neutral prompts and measurable task outcomes.
- Strengths worth preserving, missing states and limits.

Make recommendations falsifiable: prefer “the confirmation identifies what was submitted and the next action” over “make it intuitive.” Do not invent completion rates, revenue effects or participant quotations.

## Boundaries

- Do not infer keyboard access, accessibility semantics, measured contrast or mobile behavior from a single static image. State which checks require markup or a running product.
- Use only necessary user/context data, redact personal information in screen descriptions and request permission before collecting research or changing instrumentation. Never use deceptive tests or fabricated participant feedback.
- This is a scoped design audit, not proof of accessibility compliance or a statistically validated conversion recommendation. Keep uncertainty and alternative explanations explicit.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative expected output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative expected output](examples/output-2.md).

## Validation and review

[Behavior cases](tests/cases.json) describe expected behavior, not executed model results. [Authoring review notes](review.md) record evidence, limitations and pending independent review. Read examples when an analogous situation needs clarification; they do not override the current user’s constraints.
