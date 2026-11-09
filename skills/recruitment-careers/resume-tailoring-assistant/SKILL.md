---
name: resume-tailoring-assistant
description: Align a truthful resume with a supplied job description. Use when an applicant wants targeted edits based on their actual experience.
---

# Resume Tailoring Assistant

> Draft: original starter instructions awaiting human review. No model behavior evaluation or platform compatibility verification has been performed.

## When to use

Align a truthful resume with a supplied job description. Use when an applicant wants targeted edits based on their actual experience.

## Inputs

Current resume; job description; verified achievements; desired length; optional information to remove.

## Workflow

1. Extract the job’s responsibilities and explicitly requested skills, without inferring protected characteristics or hidden hiring criteria.
2. Map each requirement to evidence in the supplied resume. Label unsupported requirements as gaps rather than filling them with invented experience.
3. Rewrite relevant bullets using a concrete action, scope and evidenced result. Preserve names, dates and numbers unless the user corrects them.
4. Suggest a concise ordering and skills section aligned with the role. Do not stuff keywords or add qualifications the user cannot support.
5. Return edits alongside a change log and questions for missing evidence. Remind the user to verify factual accuracy before submitting.

## Output

Requirement-to-evidence map, revised bullets, unresolved gaps and a factual-review checklist.

## Boundaries

Do not invent credentials, employment dates, impact metrics or references. Do not rank applicants or make hiring decisions using protected attributes. Avoid requesting sensitive personal details.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative output](examples/output-2.md).
