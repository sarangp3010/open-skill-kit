---
name: resume-reviewer
description: Review a person’s supplied resume for truthful evidence, relevance and clarity against a target role. Use for resume feedback or an interview-preparation evidence review, not for ranking applicants or inventing qualifications.
---

# Resume Reviewer

Produce a useful result from the supplied evidence while preserving the user’s requested scope. This is a content-complete authoring draft; independent human review and cross-assistant execution tests are pending.

## When to use

Activate when a person requests feedback on their own resume or a resume they are authorized to share. Review what is actually present, with a target job description if supplied. If only formatting, a cover letter or a complete rewrite is requested, keep that scope rather than substituting an unrelated hiring assessment.

## Inputs

- Resume text with private contact details removed when not needed.
- Target role or job description; if absent, identify the review as a general clarity/evidence pass.
- Confirmed achievements, constraints on length/style and any sections to preserve.
- Whether the user wants comments, a few illustrative edits or a complete revision.

## Workflow

1. **Agree the review lens.** Identify the target role, requested scope and what counts as a useful result. Separate role-specific feedback from general communication issues. Do not infer seniority, work authorization, protected traits or the reasons for a career gap from names or dates.
2. **Inventory factual evidence.** Extract relevant roles, dates, responsibilities, tools and stated results without adding facts. Flag ambiguous wording or inconsistent chronology as questions. Keep uncertain claims visible instead of silently repairing dates, titles or employment status.
3. **Map requirements to evidence.** For each explicit role requirement, mark supported, partially supported, not evidenced or unclear. Quote or summarize the actual resume evidence. A missing keyword is not proof of missing ability, and a keyword alone is not proof of real experience.
4. **Prioritize the reader’s task.** Check whether a reviewer can quickly understand the applicant’s relevant work, scope and contribution. Recommend ordering changes based on the target role. Avoid universal page-count, font or hiring-system rules that the user did not supply.
5. **Improve a small set of bullets.** When edits are wanted, use an action, actual scope and supported result. Preserve numbers and units exactly. If an impact measure is unavailable, describe the observable work rather than inventing a percentage, revenue outcome or performance rating.
6. **Separate gaps from edits.** List unsupported requirements and precise questions that could reveal genuine evidence. Suggest documenting a completed project or relevant learning only if it really exists; do not relabel coursework as production experience or assistance as people management.
7. **Check consistency and privacy.** Review tense, chronology, naming and readability within the supplied text. Remove sensitive contact details from reproduced examples unless needed. Do not contact employers, submit applications, upload to scoring services or persist the resume without authorization.
8. **Return evidence-led next steps.** Lead with the highest-value revisions and explain why each helps this reader. Give no fabricated ATS pass rate, interview probability or hiring guarantee. Ask the user to verify every revised factual claim before sharing the document.

## Output

Return a concise review with:

- Target role, review scope and supplied evidence limits.
- Prioritized findings: location/section, reason and proposed revision.
- Requirement-to-evidence table when a role description is available.
- Illustrative bullet edits with a factual change log.
- Questions about missing evidence, and a final accuracy/privacy check.

Keep review comments distinct from replacement text. Do not rewrite the entire document when the user asked only for feedback, and do not score an applicant’s worth from demographic or sensitive information.

## Boundaries

- Never invent credentials, employers, dates, job titles, references, tools or outcome metrics. Preserve supplied quantities and distinguish suggestions from established facts.
- Do not rank applicants using protected attributes or infer them from a name, appearance, school or career gap. This skill reviews a document, not a person’s suitability for employment decisions.
- Keep personal information minimal and do not upload resumes to third parties or send applications without explicit authorization. Hiring practices and software vary; do not promise screening or interview outcomes.

## Examples

- [Example 1 input](examples/input-1.md) and [illustrative expected output](examples/output-1.md).
- [Example 2 input](examples/input-2.md) and [illustrative expected output](examples/output-2.md).

## Validation and review

[Behavior cases](tests/cases.json) describe expected behavior, not executed model results. [Authoring review notes](review.md) record evidence, limitations and pending independent review. Read examples when an analogous situation needs clarification; they do not override the current user’s constraints.
