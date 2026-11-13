# Security policy

Only the current main branch is supported before a release. Open Skill Kit is a static marketplace, portable text-package library and local CLI. It has no hosted account/database or provider keys. Optional real-agent evaluation is separately configured and never part of contribution CI.

## Private reporting

Do not post vulnerabilities, exploit payloads, secrets or private data in public issues or skill proposals. Use [GitHub private vulnerability reporting](https://github.com/sarangp3010/open-skill-kit/security/advisories/new) **if the owner has enabled it**. Otherwise use a private contact method published on [the maintainer's profile](https://github.com/sarangp3010); if unavailable, request a private reporting route without disclosing details. These remote reporting settings and a dedicated contact address are not configured or verified by local changes. Acknowledgement within three business days and initial triage within seven are targets, not guarantees.

Include affected version/skill ID, impact, minimal reproduction and a safe way to contact you. Do not include real credentials or other people's private records. Coordinate disclosure with maintainers and avoid testing against systems without authorization. No bug bounty or payment is offered.

## Content and client boundaries

Skills are untrusted data. The existing validator rejects unsafe YAML, traversal, symlinks, unsupported executable/binary files, size/collision violations, invalid references and raw Markdown HTML. Markdown previews sanitize content, ZIP exports revalidate it, and package installation uses ownership receipts, conflict checks and guarded removal. These checks cannot prove natural-language instructions safe, factually correct, professionally appropriate or free of malicious intent. Review contributed instructions, provenance and external links before use. Never put secrets in examples or evaluation reports.

Optional agent adapters use explicit opt-in, trusted pinned images and isolated temporary workspaces; limitations and recovery are in [the evaluation guide](docs/skill-evaluation.md). A structural score, fixture replay or unsigned attribution record is not a security certification. npm packages remain unpublished and publication is manual under [the release policy](docs/releases.md).

## Pull request and deployment boundaries

CI uses pull_request, not pull_request_target. Validation/audit jobs have read-only contents permission, no repository secret references, no deployment environment, no self-hosted runner and no shared dependency cache. Checkout does not persist credentials. Installs use a frozen lockfile with lifecycle scripts disabled; repository validation/test code still executes, so it runs without privileged credentials. No workflow publishes npm packages.

CI workflows validate only on main/develop pushes, eligible pull requests/reviews and the configured audit schedule or manual validation dispatch; they hold no Pages/OIDC write permissions. The checks → e2e → validate gate requires both prerequisites to succeed. The separate Pages workflow is the only deployment path: it runs from the default branch only after the whole CI workflow succeeds for a push to main, builds that exact commit with read-only permissions as a licensing-gated browser release, and refuses superseded commits. Only its deploy job, which runs no checkout or repository code, receives Pages/OIDC write permissions and the github-pages environment. It never publishes skills or packages: the deployed catalog must byte-match the committed, moderated catalog/published.json. A successful build or deployment is not skill publication authorization, and PRs cannot trigger deployment. Actions remain pinned to full commit IDs. See [deployment](docs/deployment.md).

Fork PR token/secret restrictions also depend on GitHub settings. Keep write-token/secret sharing to forks disabled, require approval for outside collaborators, keep production secrets in protected environments rather than repository-wide PR contexts, and review workflow/dependency/trust changes manually. CODEOWNERS routes reviews but is not enforcement by itself. See [community readiness](docs/community-readiness.md) for free-feature limitations, official sources and unverified settings. No remote setting, visibility, publication or deployment is changed by these files.

Moderated submissions extend the read-only validation job with pull-requests read access and a step-scoped read token for GitHub review GET requests. They do not grant PR write, merge, publication, Pages or OIDC rights. Pending packages are never copied into public artifacts. Main publication builds require exact-package decisions backed by real current-head approval and merged PR evidence; missing evidence/API failures block publication. Branch/check/maintainer enforcement settings remain owner-controlled and unverified locally. See [moderation policy](docs/moderated-submissions.md).
