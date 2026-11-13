# Phase 5 community workflow and public-readiness review

This phase prepares local contribution, marketplace and distribution behavior. It does not change repository visibility, GitHub settings, branch protections, security reporting, hosting, npm ownership or deployment state. No public-readiness claim should substitute for the owner's review of those settings.

## Contribution checks and trust separation

Use [CONTRIBUTING.md](../CONTRIBUTING.md) for the fork → complete template → validate → regenerate → draft PR → human review flow. Existing issue forms, PR template and code of conduct were extended rather than replaced with an external service. The marketplace opens documentation/compare/proposal links; it never submits on the visitor's behalf. Reading and local checks need no account; GitHub submission needs a GitHub account and access.

pnpm contributions:check reuses inspectSkills and the existing parser/schema/validator. It aggregates file diagnostics, duplicate slugs, normalized duplicate instruction bodies, safety/reference checks and explainable quality results. Invalid packages fail with paths and corrective commands; quality warnings remain advisory to preserve existing draft compatibility. Normalization ignores the title, collapses whitespace and compares case-insensitively. It detects copies, not semantic overlap, plagiarism or effectiveness. Human review remains necessary. Reports are ignored local JSON plus a GitHub job summary/error annotations; contributed text is escaped before annotation/summary rendering.

Maintainer attribution records live outside portable packages in catalog/attributions.json. Each requires a separate named reviewer, real repository PR URL, completion time, full package digest, bounded local review evidence and its SHA-256. Missing/unsafe/mismatched evidence fails catalog generation; changed packages produce stale attribution. Existing author strings are declarations. The registry is empty because no actual identity review was performed; there are no invented approvals or test contributors shipped to production. Records remain unsigned assertions requiring trusted maintainer review, not cryptographic identity attestations. See [attribution evidence](attributions/README.md).

## Free-feature CI security design

| Job              | Untrusted PR code?                          | Permissions and outputs                                                                                                                  |
| ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| CI checks        | Yes, disposable standard runner             | Contents and PR read only; moderation token scoped to its step; frozen install without lifecycle scripts; no cache, secret or deployment |
| CI e2e           | Yes, separate pinned official browser image | Contents read only; full browser/accessibility tests; no apt/browser download, privileged container option or artifact exchange          |
| CI validate      | No application checkout                     | Read-only final gate preserving the existing required-check name; checks and e2e must both succeed                                       |
| Dependency audit | Yes, same read-only boundary                | Existing free registry advisory query; no paid dependency-review action                                                                  |

CI and audit jobs hold no Pages/OIDC rights, and there are no publication jobs or automatic merges. The separate Pages workflow deploys the website only after CI succeeds for a main push, with write rights confined to the official deploy action; see the [deployment guide](deployment.md). Actions remain pinned to reviewed commit SHAs; Node 22/pnpm 10.20.0 and frozen dependency resolution are retained. No pull_request_target, PR-triggered workflow_run, self-hosted runner or shared dependency cache is introduced. The browser image is also pinned by version/digest and matched to the frozen Playwright dependency. Docker is not assumed to be free compute or a security guarantee. See [the CI architecture comparison, local workflow and verified Linux evidence and remaining platform limits](CI_ARCHITECTURE.md).

GitHub automatically restricts fork PR tokens and secrets subject to repository settings. Workflow files alone cannot prevent a repository administrator or a trusted writer from changing workflows/settings later. Keep repository-wide production secrets out of untrusted contexts, disable sending write tokens/secrets to forks, and require approval for outside collaborators. CODEOWNERS routes sensitive reviews; required-review enforcement depends on settings and the repository's plan. Do not enable a paid security or protection feature to satisfy this phase. The existing dependency-review action was removed because private-repository availability can require a paid plan; pnpm audit remains available locally and in CI. Private GitHub-hosted Actions minutes/storage can have free-tier limits; the owner must keep billing/spending disabled or within the free allowance. No service or paid plan was added.

Official sources: [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use), [fork workflow settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), [dependency review availability](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review). These sources describe platform controls, not verification of this repository's remote settings.

## Static GitHub Pages SEO and accessibility

Normal and Pages builds generate an HTML entry for every existing fixed/sector/skill route, with a unique title, description, canonical URL, Open Graph/Twitter summary metadata and JSON-LD derived from the catalog. There are no invented ratings, install counts, verified authors or model results in structured data. Skill status remains draft. Client navigation updates the same tags without adding duplicate head entries.

The deterministic sitemap includes canonical indexable routes and every actual skill. It excludes retained category aliases, planned empty collections and the 404 fallback. Alias pages point to their canonical collection; planned pages use noindex/follow; 404 uses noindex/nofollow. Filter/query URLs canonicalize to their base route. robots.txt points to the sitemap. No last-modified time is invented. Configure VITE_SITE_URL to the intended HTTPS directory URL when building for another origin, and set VITE_BASE_PATH to the corresponding asset/router path. The default site address is the known project Pages URL, not a new claim that the current local version is live. robots.txt at a project subpath is informational; a host-root robots file controls origin-wide crawling on GitHub Pages.

This is route-specific static metadata and a noscript navigation/description fallback, not full React SSR or guaranteed search ranking/indexation. Search, Markdown previews and ZIP downloads still require JavaScript; GitHub source folders remain available as plain text. Pages cannot set arbitrary per-route HTTP status/headers; known routes have real directory entries and unknown routes use 404.html. No account, analytics beacon, remote font or external SEO service is required. See [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) and [canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

The UI retains semantic navigation, skip links, keyboard focus, native selectors, labeled previews, responsive layout and theme controls. Playwright covers existing flows plus contribution entry points/onboarding, metadata on navigation, mobile contribution pages, attribution declarations, accessibility and unchanged downloads/history. Automated accessibility scans cover selected routes/states; they do not certify all assistive-technology use.

## Review before changing visibility or releasing

Completed locally:

- [x] Contribution templates/forms/checklist, original conduct policy, contributor guide and canonical-template guidance.
- [x] Read-only untrusted CI, no deployment/publication jobs, immutable action/image pins and offline-only skill evaluation.
- [x] Package safety, duplicate checks, current catalog, all 42 portable drafts/URLs/evidence preserved.
- [x] Honest contributor attribution and compatibility/quality/evaluation distinctions.
- [x] Static SEO/sitemap, marketplace onboarding, local license/third-party notice artifacts and regression tests.

Owner decisions/settings intentionally not changed or claimed verified:

- [ ] Review repository visibility and whether/when public access is intended.
- [ ] Confirm private vulnerability reporting and a usable confidential conduct/security contact. No dedicated address is invented.
- [ ] Verify fork approval, token/secret-sharing settings and Actions free-tier spending limits.
- [ ] Review sensitive changes/CODEOWNERS routing and any available branch/environment protections without upgrading to paid features.
- [ ] Independently review content/domain safety, provenance, rights and any actual contributor attribution evidence.
- [x] Corrected the earlier filename warning: IMPLEMENTATION_STATUS.md and implementation-status.md differ by underscore/hyphen and are portable distinct names. Both historical paths are retained. Actual case/Unicode aliases and reserved names have regression checks; hosted native results remain separate.
- [ ] Inspect final public artifacts and explicitly authorize any future commit, push, PR, publication or deployment.

Current local command results and file changes are recorded in [implementation status](IMPLEMENTATION_STATUS.md). No hosted CI, remote protection, live-site SEO or public-indexing success is inferred from local tests.

## Moderation extension

The newer [moderated submission policy](moderated-submissions.md) adds a browser editor, separate unpublished proposals and a published-only artifact. The checks job has pull-requests read access and a step-scoped read token to inspect actual reviews/merges; it still has no PR write, merge, Pages or OIDC rights. New/changed approvals must belong to the reviewed PR head and trusted-base maintainer, and main publication requires an authorized maintainer merge. No actual approval is prefilled. Require the CI validation/moderation check and authorized reviews in owner-controlled GitHub settings before relying on merge enforcement. No setting is enabled or verified here. Current static route count is 120; earlier Phase 5 figures above are historical.

## Current CI verification and protection observations — 2026-11-11

Commit `48951e86e5c6d3411a41da63caf10d413a34025c` passed [CI](https://github.com/sarangp3010/open-skill-kit/actions/runs/43050871016) (368 tests and all 22 Linux-container browser/accessibility cases) and [Dependency security](https://github.com/sarangp3010/open-skill-kit/actions/runs/43050871139). The workflow itself is committed/pushed; only this documentation follow-up remains local. The public-only native matrix was skipped; no Windows/macOS evidence is inferred.

The container is an execution environment, not the security boundary: GitHub runner 2.338.2 automatically mounted /var/run/docker.sock. Permissions/access were not measured. Keep PR jobs on disposable standard VMs with read-only credentials, no production secrets and no privileged downstream artifact consumers. No immediate workflow change is required solely because this default mount was present.

Read-only ruleset inspection found main's required validate check matches the successful GitHub Actions app/context. Develop has no required status check; both branches require zero approving reviews and no Code Owner review. These are owner policy gaps, not changes made by PR #1. See [the exact findings and proposed settings](PR1_MERGE_REVIEW.md). No protection/billing setting, PR state or publication authority was changed.
