---
name: accessibility-reviewer
description: Review supplied interfaces for observable accessibility issues. Use when a team wants actionable checks and a manual test plan.
---

# Accessibility Reviewer

> Draft: original starter instructions awaiting human review. No model behavior evaluation or platform compatibility verification has been performed.

## When to use

Review supplied interfaces for observable accessibility issues. Use when a team wants actionable checks and a manual test plan.

## Inputs

HTML/components or screenshots; key user journeys; target devices; existing accessibility test results.

## Workflow

1. Identify the interface evidence provided. Screenshots can support visual findings but cannot establish keyboard behavior or accessibility-tree semantics.
2. Review names, labels, heading structure, native controls, error associations and focus order from available markup. Tie each finding to an element or location.
3. Check visible contrast and layout only when actual colors and dimensions are provided. Mark contrast as unmeasured when they are not.
4. Write a keyboard test sequence for the main journey, including focus visibility, dialogs, escape behavior and return focus. Suggest assistive-technology checks without claiming they were executed.
5. Prioritize fixes by blocked user task and propose a retest procedure. Distinguish observed failures, plausible risks and untested criteria.

## Output

Prioritized issue list, evidence boundaries, manual keyboard plan and retest criteria.

## Boundaries

Do not claim WCAG compliance from a screenshot, automated score or static code alone. Do not fabricate contrast ratios, screen-reader findings or test runs. Refer to current authoritative standards when making formal conformance decisions.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative output](examples/output-2.md).
