# GitHub review and Pages configuration

This is an owner configuration guide and local workflow audit dated 2026-11-10. **No remote setting, repository visibility, permission, workflow run or deployment was changed or verified.** The available connector exposes no repository-settings reader. Treat every remote control below as unverified until an owner checks it. Do not upgrade a plan or change visibility as part of local preparation.

## Local workflow audit

| Workflow/job                | Token scope                                | Executed code and artifact boundary                                                                                                                                     | Local result                       |
| --------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| CI / validate               | contents read, pull-requests read          | Untrusted PR code runs on a disposable GitHub-hosted runner; no secret references or environment; only moderation receives the step-scoped read token                   | PASS                               |
| CI / portability            | contents read                              | Public repositories only; Windows/macOS standard hosted runners execute the focused portability regressions, no secrets or deployment                                   | Configured; hosted results pending |
| Dependency security / audit | contents read                              | Frozen install without lifecycle scripts; free registry advisory query; no publishing or deployment                                                                     | PASS                               |
| CI / build-pages            | contents read                              | Needs validate and successful public-only portability matrix; canonical repository main push/manual dispatch only; application build and same-run Pages artifact upload | PASS                               |
| CI / deploy-pages           | contents read, pages write, id-token write | Needs build-pages; identical main/event guard; github-pages environment; one pinned official deploy action, no checkout/install/application code                        | PASS                               |

Inspect [CI](../../.github/workflows/ci.yml), [dependency audit](../../.github/workflows/security.yml) and [CODEOWNERS](../../.github/CODEOWNERS). Top-level permissions default to contents read. All direct action references use full commit SHAs; checkouts disable persisted credentials. There is no pull_request_target, workflow_run trust escalation, self-hosted runner, shared dependency cache, npm publish or automatic merge. Review events rerun moderation after approval/dismissal. PRs cannot enter Pages jobs or contribute artifacts to a privileged follow-up run. Tests assert the job dependency chain, guards, permissions, pins and narrow token exposure.

These are source-code findings, not proof of hosted behavior. PR code can read/exfiltrate anything provided to its runner, so only read access is supplied. Disabling lifecycle scripts does not make test/build scripts trusted. Review direct action pins and their transitive action dependencies before updating; this audit does not certify the complete upstream dependency graph. Generic code changes still require independent review even if checks are green.

## Actions → General

Owner targets:

- Allow GitHub-authored actions; keep the four direct actions used here available: checkout, setup-node, upload-pages-artifact and deploy-pages. Retain reviewed full-SHA references; consider the platform SHA enforcement option after checking composite/transitive compatibility.
- Set Workflow permissions to **Read repository contents and packages permissions**. Leave **Allow GitHub Actions to create and approve pull requests** disabled. Job-scoped Pages/OIDC rights remain explicitly declared only where needed.
- Require approval for workflows from **all outside collaborators**. If private-fork settings are offered, disable sending write tokens and secrets to fork PR workflows. Never rerun an untrusted PR with privileged credentials.
- Keep production secrets out of PR contexts; no provider, npm or deployment secret is required by these workflows. Keep Actions spending controls at the owner's free allowance and use short retention; the Pages artifact already retains for one day.

The exact options depend on account/organization policy. Consult [GitHub Actions repository settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository); these desired values are not observations of this repository.

## Branches → main protection

Create a main rule before relying on merges: require a PR, at least one approving review, Code Owner review, dismissal of stale approvals, approval of the most recent reviewable push, and resolved conversations. Require current-branch status checks **validate** (CI), **audit** (Dependency security), **portability (windows-latest)** and **portability (macos-latest)** (CI, public repositories), selecting their actual GitHub Actions check contexts after the first authorized hosted run. Require the branch up to date. The validate job includes licensing, artifact-manifest and repository-portability checks. Select the matrix contexts only where those public-only jobs actually run; skipped private-repository checks are not execution evidence. Disable force pushes/deletion and bypasses; keep repository auto-merge off. Restrict write/merge access to actual trusted maintainers; use push restrictions where available.

A protection rule cannot authenticate a local form. The publication checker additionally requires the named reviewer in the trusted-base maintainer roster, a genuine current-head approval distinct from the PR author, a matching full-package decision and an authorized main merge. The sole current maintainer cannot self-approve their own promotion PR: use a contributor-authored PR reviewed/merged by that maintainer, or first establish a second real authorized maintainer through reviewed policy changes. Never invent a reviewer to unblock CI.

Protected branches are available for public repositories on GitHub Free; private availability differs by plan. [Rule setup](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule) and [review/check options](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) explain the controls. If unavailable, record a blocker; do not silently substitute CODEOWNERS or purchase a feature.

## Pages and the deployment environment

Only after separate owner authorization for hosting:

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**. No branch-folder publisher or custom domain is needed. Use the default HTTPS project address and enforce HTTPS where offered.
2. Settings → Environments → **github-pages**: select only branch **main**, no tags; require an actual designated reviewer. Enable prevention of self-review and disable administrator bypass if available. Arrange a genuinely independent deployment reviewer; a sole actor cannot satisfy a self-review prohibition. Do not store provider/npm secrets in this environment.
3. Keep the existing workflow path `/open-skill-kit/` consistent with the site URL. The local build validates `VITE_BASE_PATH=/open-skill-kit/`; route metadata defaults to `https://sarangp3010.github.io/open-skill-kit/`. Configure a different origin only with corresponding reviewed build settings.
4. Recheck the checklist and exact approved catalog before an authorized main push or manual main dispatch. These events can deploy automatically once Pages and environment requirements are enabled. Approval to push must explicitly include hosting/deployment when applicable. An environment deployment approval is separate from content approval and publication authorization.

GitHub documents the custom source, build/deploy dependency, Pages/OIDC scopes and environment requirements in [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Pages on GitHub Free requires a public repository; no visibility change is performed here. Environment reviewer/self-review options and public-repository availability are described in [deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments). If unavailable under the owner's free configuration, keep hosting disabled and record the blocker.

## Additional owner checks

Confirm an operational confidential vulnerability/conduct reporting route, relevant collaborators, account security, package-name ownership and release permissions. Keep npm publication manual and separate from Pages; no publish job exists. Review repository history for accidentally exposed content before making anything public. Making a repository or its draft-preview site public exposes its source drafts; an unpublished catalog status is **not confidentiality**.

Record the actual setting, date and person who checked it in a real owner review outside automated reports. This document deliberately contains no prefilled approval identity or remote-setting attestation. See the [launch checklist](CHECKLIST.md), [security policy](../../SECURITY.md), [moderation procedure](../moderated-submissions.md) and [founding review procedure](../founding-skills-review.md).

The Pages build now depends on both validate and the portability matrix. Because that matrix is public-only, private-repository Pages builds skip; no paid/private hosting path is introduced. A future owner-approved public release must obtain successful native matrix results as well as protected reviews. Local Windows path-syntax tests alone are not native Windows execution evidence.
