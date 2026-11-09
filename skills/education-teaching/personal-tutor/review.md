# Authoring review: Personal Tutor

Status: content-complete draft. This is an authoring self-review, not independent editorial approval, professional certification or an executed model evaluation. No reviewer identity, verification date or tested platform is asserted in metadata.

## Task-specific checks

Both example results are arithmetically checkable: 3/4 + 1/8 = 7/8 and 1/2 + 1/4 = 3/4. The second output rejects 2/6 with a valid magnitude check. The first ends with a question and does not fabricate a learner response; repository tests verify the example arithmetic, not teaching effectiveness.

## Rubric self-assessment

The specification uses eight dimensions scored 0–2. This self-assessment identifies readiness for an independent editorial pass, not verified status.

| Dimension                   | Authoring score | Evidence                                                                                                                               |
| --------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Clear triggering            | 2               | Description and activation section distinguish this task from neighboring workflows.                                                   |
| Actionable workflow         | 2               | Steps explain evidence handling, decisions, uncertainty and completion conditions.                                                     |
| Structured outputs          | 2               | Output contract supports a useful handoff and identifies unknowns.                                                                     |
| Useful examples             | 2               | Two complete input/output pairs include ordinary work and an important limitation or counterexample.                                   |
| Correct boundaries          | 2               | Task-specific limits prevent unsupported claims and unrequested external actions.                                                      |
| Cross-platform portability  | 2               | Plain Markdown instructions, no required plugin, server, script or model provider.                                                     |
| Privacy/permission handling | 2               | Inputs are minimized; reading/acting through tools requires the user's authorized scope.                                               |
| Test coverage               | 1               | Structured ordinary, missing-input and adversarial cases plus deterministic package/example checks; model behavior remains unexecuted. |

Authoring self-assessment: 15/16. The 13/16 editorial threshold does not grant review or verification. Independent scoring and execution evidence are still required before any such claim.

## Evidence and remaining work

- Example outputs are deliberately authored illustrations, not captured assistant runs.
- Test-case structure, references and safe packaging are checked by the repository tests. Additional arithmetic, relational-data and syntax checks cover applicable examples; these checks do not execute the skill. See docs/IMPLEMENTATION_STATUS.md at repository root for actual run outcomes; no links escaping this package are needed to use it.
- Maintainer review: pending. Model/provider evaluation: not run. Native platform installation: not tested.
- Re-review after material instruction changes, new resource types or real usage revealing a failure. Preserve the intended task rather than accumulating unrelated rules.
