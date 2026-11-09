---
name: campaign-planner
description: Plan a bounded marketing campaign with audience hypotheses, truthful messaging, budget allocation and an evaluation plan. Use when a user requests a campaign brief; do not launch ads, contact audiences or promise performance.
---

# Campaign Planner

Produce a useful result from the supplied evidence while preserving the user’s requested scope. This is a content-complete authoring draft; independent human review and cross-assistant execution tests are pending.

## When to use

Activate for a request to design or review a specific marketing campaign. Work from the actual offer, audience, constraints and business objective. A draft plan is not authorization to purchase media, collect contacts or send messages. If the user only wants copy edits, keep that narrower task.

## Inputs

- Offer, intended audience, objective, region and campaign period.
- Budget/currency, available channels and delivery capacity.
- Substantiated claims, brand constraints and any required review or consent process.
- Existing baseline data and the definition of an outcome, or an explicit lack of historical evidence.

## Workflow

1. **Make the objective measurable.** Translate the business goal into one primary outcome with a definition, denominator and measurement window. Distinguish awareness, qualified interest and completed purchase. Ask what counts as qualified rather than optimizing an undefined lead count.
2. **Separate evidence from hypotheses.** Record what is known about the audience and what still needs validation. Use supplied research and baseline data without inventing market size, conversion rates or competitor claims. Keep assumptions labeled as planning inputs, not forecasts.
3. **Develop a truthful message.** Connect the audience’s problem to a specific offer and supported proof. Identify claims requiring substantiation or brand/legal review. Do not create false scarcity, fabricated testimonials, guaranteed outcomes or sensitive targeting assumptions.
4. **Choose a small channel mix.** Match channels to the audience and the team’s capacity. Prefer a bounded pilot over spreading a small budget across many unsupported channels. Describe channel roles and required creative assets; do not assume account access, contact consent or platform availability.
5. **Allocate the budget transparently.** Show line items, currency, total and contingency. Distinguish allocations from current media prices. Reconcile spending to the supplied ceiling and avoid counting an included production cost twice. Any target cost per outcome is a decision threshold, not a promised result.
6. **Define the experiment.** State the hypothesis, audience/placement, creative difference, duration and measurement approach. Change only the dimensions needed to answer the question. Specify stop/review conditions and do not claim statistical significance from a tiny or unobserved sample.
7. **Plan instrumentation and safeguards.** Identify approved data sources, event definitions, owners and a reporting cadence. Minimize personal data; use authorized aggregate reporting where possible. Mark consent, tracking and claims review as prerequisites rather than asserting legal compliance.
8. **Return a launch-ready draft.** List creative tasks, owners by role, dependencies, dates supplied or relative milestones and approval gates. End with success/revise/stop decisions based on the defined outcome. Stop before any spend, publishing, tracking change or external outreach unless explicitly authorized.

## Output

Return a campaign brief with objective, audience evidence/hypotheses, message/proof, channel roles, creative deliverables, reconciled budget, measurement definitions, experiment/stop rules, timeline and approval dependencies.

Show arithmetic and assumptions. Provide a simple results table template: period, spend, eligible reach/visits if measured, qualified outcomes, cost per outcome and interpretation limits. Zero outcomes mean cost per outcome is undefined, not zero.

## Boundaries

- Do not invent performance history, testimonials, audience data, price quotes or legal requirements. Numeric scenarios are planning assumptions and must not be presented as current market facts.
- No spending, account changes, tracking deployment, scraping contacts or outbound messages without authorization. Respect applicable consent and platform requirements; seek qualified review when claims or targeting are consequential.
- Campaign results are uncertain. Do not guarantee revenue, virality, conversion uplift or regulatory compliance. Do not target people through inferred sensitive attributes.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative expected output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative expected output](examples/output-2.md).

## Validation and review

[Behavior cases](tests/cases.json) describe expected behavior, not executed model results. [Authoring review notes](review.md) record evidence, limitations and pending independent review. Read examples when an analogous situation needs clarification; they do not override the current user’s constraints.
