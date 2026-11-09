# Expected audit

**Journey:** first-time student selects a PDF and needs a trustworthy submission confirmation. Evidence is the supplied textual walkthrough; interaction behavior is not independently observed.

| Step       | Evidence / type                                                      | Concern and priority                                                                | Bounded change                                                                                                                                          |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continue   | The supplied label does not identify submission; observed copy       | Hypothesis: students may expect a review step rather than final submission. Medium  | If Continue performs submission, label it Submit assignment; if a review step exists, retain an accurate review label. Confirm the actual action first. |
| Done panel | No filename or assignment title supplied; observed state description | High: the confirmation gives insufficient context to verify which work was accepted | Show received filename, assignment title and next action; use a receipt/time only if the backend actually supplies it.                                  |
| Failure    | Try again replaces chooser; selection persistence unknown            | Hypothesis: recovery may require repeating selection. Medium                        | Explain the failure and what retry does; verify whether the chosen file can safely remain selected.                                                     |

Acceptance: a confirmation identifies the submitted file/assignment using actual response data, and errors explain the retry path. Do not promise autosave under the stated constraint.

Validation prompt: “Submit this sample assignment and tell me how you know it was received.” Observe whether consenting participants identify the correct file and final state. No sessions, completion rates or accessibility checks were executed.
