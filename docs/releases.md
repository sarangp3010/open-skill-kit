# Versioning and releases

Use Conventional Commits and Semantic Versioning. `fix` changes patch, `feat` changes minor, and incompatible public contract changes major. During 0.x development, document breaking changes prominently and increment the minor version. Keep workspace package versions aligned until independent releases are justified; source workspace packages remain private; the separately built `dist/npm` artifact is the intended public `open-skill-kit` package. See the [npm distribution guide](npm-distribution.md).

Add user-visible changes to `CHANGELOG.md` under Unreleased in each PR. Skill metadata versions are independent: increment them whenever the skill package changes. Maintainers review provenance and safety again for substantive changes.

For a release, run all README checks from a clean checkout with the frozen lockfile, review the dependency audit, verify status and claims, move Unreleased entries to a dated version section, update package versions and lockfile, and review the diff. Tag `vX.Y.Z` and publish release notes only with explicit maintainer authorization. Deployment and release automation remain outside this batch. No release has been published. Git origin now points to the user-specified GitHub repository; npm publication remains a separate authorized action.

First-release preparation is tracked in the [owner checklist](launch/CHECKLIST.md), [per-skill summaries](launch/SHORTLIST_REVIEW.md), [repository settings guide](launch/GITHUB_SETTINGS.md) and [preparation report](launch/PREPARATION_REPORT.md). Current content remains draft and unapproved; the shortlist is a review proposal only. Never infer commit, push, visibility, hosting or publication permission from a successful local suite.
