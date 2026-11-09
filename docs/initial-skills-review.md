# Initial ten skills: authoring and validation evidence

These are the exact ten packages named in section 8 of the implementation specification. They are complete authoring drafts with substantive instructions, explicit activation/limits, eight-step workflows, output contracts, two realistic input/output pairs, six structured behavior cases and review notes. They require no Open Skill Kit service to read or use.

**Status is draft, not verified.** The examples are authored illustrations. No independent human editorial approval, live assistant evaluation, database execution, native platform test or professional certification is implied by package validation.

| Package                                                                               | Distinctive decisions and example walkthrough                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Code Reviewer](../skills/software-development/code-reviewer/SKILL.md)                | Requires a concrete contract/trigger before a finding. Omitted discount yields an incorrect value; the valid inclusive age predicate intentionally receives no defect finding.                                                        |
| [Bug Investigator](../skills/software-development/bug-investigator/SKILL.md)          | Separates observations, hypotheses and discriminating checks. The last-row loop bound explains the fixture; a generic upstream timeout cannot establish a cause.                                                                      |
| [UX Auditor](../skills/web-design-ux/ux-auditor/SKILL.md)                             | Anchors recommendations to a task and distinguishes observed copy from untested confusion. Submission confirmation needs context; a single museum page does not justify a full redesign.                                              |
| [React Component Designer](../skills/web-design-ux/react-component-designer/SKILL.md) | Defines parent/state ownership and stable accessible IDs. The controlled email form guards pending submission; the FAQ uses a button without unnecessary modal behavior.                                                              |
| [Accessibility Reviewer](../skills/web-design-ux/accessibility-reviewer/SKILL.md)     | Distinguishes missing names, unhelpful symbol names and untested runtime behavior. The static form has label/error issues; the screenshot-only dialog supports a test plan, not a conformance verdict.                                |
| [Personal Tutor](../skills/education-teaching/personal-tutor/SKILL.md)                | Uses equal-size fraction pieces, responds to actual reasoning and waits for learner replies. The authored solutions are 7/8 and 3/4; no learner response or mastery claim is fabricated.                                              |
| [Resume Reviewer](../skills/recruitment-careers/resume-reviewer/SKILL.md)             | Maps role requirements to evidence without inventing achievements. Edits preserve 12 weekly reports and six months; onboarding support is not promoted to people management.                                                          |
| [Campaign Planner](../skills/marketing-advertising/campaign-planner/SKILL.md)         | Reconciles a USD 600 budget and labels the USD 50 cost threshold as a decision rule, not a forecast. Zero outcomes mean undefined cost per outcome; external actions remain unexecuted.                                               |
| [Weekly Review Coach](../skills/personal-productivity/weekly-review-coach/SKILL.md)   | Reviews actual completion before carryover. The six-hour scenario leaves 1.5 hours of next-week buffer; the private emergency example remains a short review without diagnosis.                                                       |
| [SQL Query Reviewer](../skills/data-analytics-bi/sql-query-reviewer/SKILL.md)         | Defines result grain, exposes fan-out and preserves outer-join semantics. The fixture totals 200 under duplicated joins versus 100/0 under the intended existence rule. A valid tenant/time query gets no invented defect or speedup. |

## What the tests establish

`tests/initial-skills.test.ts` reads the target IDs from the specification, avoiding a second independently maintained target list. It validates each complete package against the strict publication-quality schema while retaining draft status, checks example pairs and structured cases, and ZIP-round-trips all ten packages through the app's actual export function. The case JSON records observable behavioral expectations for ordinary, missing-input and adversarial requests; those cases are not automatically run against a model.

Additional deterministic checks validate fraction arithmetic, campaign allocations/cost thresholds, next-week capacity/buffer, relational fixture results and TSX syntax. TSX is transpiled for diagnostics without executing it. SQL results are independently calculated from JSON rows in memory; the SQL text is not executed. These checks catch internal example errors but do not establish how another assistant will follow the skill.

The package-local review.md files contain an authoring self-assessment against the eight-dimension rubric, including a lower test-coverage score because model execution is pending. The 15/16 authoring scores clear the specification's readiness threshold for an independent editorial pass; they are not that pass, a verified badge or a human sign-off. A maintainer must independently assess the rubric and record real execution evidence before making stronger claims.

For actual command outcomes, see [implementation status](IMPLEMENTATION_STATUS.md) and [progress](progress.md).

## Preservation and catalog migration

Two earlier drafts shared portable names with required canonical packages. To preserve their complete content and keep active slugs unique:

- skills/design-ux/accessibility-reviewer moved to archive/skills/design-ux/accessibility-reviewer.
- skills/education/personal-tutor moved to archive/skills/education/personal-tutor.

Their original bytes are retained and protected by an [archive manifest](../archive/skills/manifest.json) hash test. The expanded canonical replacements live under web-design-ux and education-teaching. The [archive index](../archive/README.md) explains the mapping; old local sector URLs are superseded, not deployed redirects. The other thirteen earlier drafts remain in place.

The active library therefore contains **23** packages: the exact ten initial skills plus thirteen existing drafts. Six populated specification-sector entries were added to the existing registry, without attempting the separate 50-sector migration or generating placeholder skills. The browser catalog is regenerated from these packages; no React metadata was hardcoded. Drafts remain excluded from the npm release bundle.
