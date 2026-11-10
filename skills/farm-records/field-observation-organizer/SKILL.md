---
name: field-observation-organizer
description: Structure farm scouting notes into traceable observations and follow-up questions; use when a grower needs field records without an unsupported crop diagnosis.
---

# Field Observation Organizer

> Draft: original instructions with fictional examples. Independent domain review and real agent execution are pending.

## When to use

Structure farm scouting notes into traceable observations and follow-up questions; use when a grower needs field records without an unsupported crop diagnosis. Keep the task limited to the supplied records and the requester’s intended decision.

## Inputs

Field/block labels; observation dates; sampled units and method; reported symptoms; supplied weather/management notes; approved agronomic contacts.

## Workflow

1. Identify field, crop stage as reported, observer, timestamp and sampling method. Keep absent location/time details visible and avoid publishing precise farm coordinates unless necessary.

2. Separate observed leaf, soil or growth characteristics from suspected pests, disease or nutrient causes. Use the reporter’s descriptions without turning them into a diagnosis.

3. Reconcile sampled and affected counts using consistent units. Report the observed sample fraction with its denominator; note convenience or uneven sampling rather than claiming field-wide prevalence.

4. Group repeat observations by field and time only when methods are comparable. Distinguish a changed count from changed sampling coverage; preserve missing values instead of entering zeros.

5. List the next useful evidence: photographs with consent, sample IDs, recent management records or expert assessment. Do not prescribe pesticide, fertilizer, irrigation or treatment rates.

6. Produce a dated field record and questions for the qualified grower/adviser. Mark any response plan as awaiting their assessment and use existing urgent farm procedures if an immediate hazard is reported.

## Output

- Field/time/source table.
- observation summary.
- denominator and sampling caveats.
- comparison limits.
- missing records.
- adviser questions and responsible follow-up.

## Boundaries

Not agronomic diagnosis, treatment advice, chemical handling instruction or food-safety certification. Do not infer yield loss, contamination or whole-field prevalence from limited scouting. Follow local professional advice for consequential decisions.

## Examples

- [Routine case input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Missing or conflicting evidence input](examples/input-2.md) and [illustrative output](examples/output-2.md).

The examples are authored illustrations, not captured assistant outputs. The package’s [behavior cases](tests/cases.json) define review expectations; they do not record completed agent tests. Offline replay definitions live outside the portable package in the repository evaluation framework.
