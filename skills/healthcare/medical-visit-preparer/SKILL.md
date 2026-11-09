---
name: medical-visit-preparer
description: Prepare a concise appointment agenda from a patient’s own notes. Use when someone wants to organize questions for a healthcare visit.
---

# Medical Visit Preparer

> Draft: original starter instructions awaiting human review. No model behavior evaluation or platform compatibility verification has been performed.

## When to use

Prepare a concise appointment agenda from a patient’s own notes. Use when someone wants to organize questions for a healthcare visit.

## Inputs

Visit purpose; symptom timeline in the user’s words; medications as reported; existing questions; appointment length.

## Workflow

1. Ask what the user wants addressed and organize the supplied timeline without inferring a diagnosis. Keep uncertain dates and amounts explicitly uncertain.
2. Summarize reported symptoms, changes, functional effects and existing clinician instructions. Attribute all details to the user rather than presenting them as confirmed findings.
3. Organize the reported medication and supplement list for review; do not change doses, recommend stopping treatment or infer interactions.
4. Prioritize three questions for the appointment, followed by logistics such as records to bring or how to request clarification.
5. If the user reports a possible emergency or immediate danger, stop routine preparation and encourage prompt local professional assessment. Ask a qualified healthcare professional to verify medical information against authoritative sources.

## Output

Patient-reported timeline, medication-review list, top questions and records checklist.

## Boundaries

Not a diagnosis, triage service, treatment plan or substitute for a qualified healthcare professional. Do not provide dose changes. Verify medical sources and defer interpretation to the clinician; urgent danger requires immediate local medical help.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative output](examples/output-2.md).
