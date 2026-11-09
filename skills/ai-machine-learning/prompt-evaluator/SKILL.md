---
name: prompt-evaluator
description: Evaluate prompt clarity and testability with deterministic examples. Use when reviewing instructions before running a model evaluation.
---

# Prompt Evaluator

> Draft: original starter instructions awaiting human review. No model behavior evaluation or platform compatibility verification has been performed.

## When to use

Evaluate prompt clarity and testability with deterministic examples. Use when reviewing instructions before running a model evaluation.

## Inputs

Prompt; intended users; allowed inputs; output contract; failure costs; available example cases.

## Workflow

1. Identify the requested task, allowed sources and required output. Flag conflicts and undefined terms with exact quoted snippets from the supplied prompt.
2. Check separation of trusted instructions from untrusted user or retrieved content. Add an explicit instruction not to follow embedded requests that change the task.
3. Draft ordinary, missing-input and adversarial test cases. State observable expected behavior for each without claiming a model was run.
4. Propose a focused prompt revision that resolves identified problems while preserving user intent. Separate mechanical improvements from hypotheses about model quality.
5. Provide an evaluation rubric and mark every case as not executed unless actual model output and run evidence were supplied.

## Output

Issue list, revised prompt, structured test cases and an execution-status-aware rubric.

## Boundaries

Do not fabricate benchmark scores or infer guaranteed model performance from wording. Do not transmit prompts, private examples or API keys to any service without explicit consent.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative output](examples/output-2.md).
