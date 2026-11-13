# Website deployment (GitHub Pages)

The public marketplace at <https://sarangp3010.github.io/open-skill-kit/> is deployed by [.github/workflows/pages.yml](../.github/workflows/pages.yml). Deployment ships the static website only. It never publishes skills, npm packages, tags or release notes, and it never changes moderation, approval or publication rules.

## When the site updates

1. A commit lands on `main` (normally by merging a reviewed PR).
2. The **CI** workflow runs for that push: checks (moderation, licensing, lint, types, tests, catalog freshness, builds), browser E2E, the `validate` gate and native portability.
3. When the whole CI run concludes **success**, GitHub starts the **Pages** workflow through `workflow_run`. That file always runs from the default branch, never from a pull request, and its jobs accept only `push` events on `main` from this repository.
4. **build** (read-only `contents: read`) checks out the exact CI commit (`workflow_run.head_sha`), verifies it is still the `main` tip, installs with the frozen lockfile and no lifecycle scripts, runs `pnpm catalog:check`, then runs the browser **release** build:
   `OPEN_SKILL_KIT_RELEASE_BUILD=1 VITE_BASE_PATH=/open-skill-kit/ pnpm build`
   `pnpm pages:verify --stamp` then writes `version.json` and verifies the output before the official `upload-pages-artifact` action uploads `apps/web/dist`.
5. **deploy** holds the only write permissions (`pages: write`, `id-token: write`) and the `github-pages` environment. It runs no checkout or repository code. It rechecks that the commit is still the `main` tip, then runs the official `deploy-pages` action.

Failed, cancelled or skipped CI runs never deploy. Pull requests, `develop` pushes, review events and manual CI dispatches never deploy.

## Ordering and concurrency

- Only one Pages run executes at a time (`cancel-in-progress: false`, so a running deployment is never interrupted). A queued run is replaced by a newer one.
- Both jobs compare the commit with the live `main` tip (`git ls-remote`). A superseded commit is skipped with a notice; the newer commit's own CI run deploys it. Rerunning an old CI or Pages run therefore cannot roll the site back.
- If the newest `main` commit fails CI, the site stays on the last commit that passed.

## What `pages:verify` enforces

`scripts/verify-pages.ts` is read-only apart from the optional stamp. It fails when any of the following is true:

- an HTML `src`/`href` outside `/open-skill-kit/`, or a referenced asset is missing
- a direct-load page is missing for the home, skills, sectors or published routes, or for any catalog skill
- `data/index.json`, `data/search.json` or a per-skill `data/skills/<sector>/<slug>.json` file is missing, stale or unexpected
- `catalog.json` or `published.json` differ by even one byte from the committed `catalog/` files (`published.json` is derived from the moderated publication ledger, so a website build can never widen what is published)
- the output contains source maps, dotfiles (other than `.nojekyll`) or internal ledger or evidence names (owner decisions, provenance inventory, maintainer, attribution or review ledgers)

## Licensing gate

The build uses `OPEN_SKILL_KIT_RELEASE_BUILD=1`, the prescribed browser release procedure in [releases](releases.md). That flag runs the fail-closed dependency licensing preflight over every bundled dependency, and any unresolved or override-only notice blocks the build, so nothing deploys.

react-remove-scroll-bar@2.3.8, whose npm artifact has no license file and whose retained notice is not exact-release evidence, previously blocked this build. It was removed by replacing the Radix dialog with a native `<dialog>` (owner-approved). The release build now passes in a clean frozen install, and its `DEPENDENCY_MANIFEST.json` no longer lists the package. If a future dependency lacks exact-release notice evidence, the Pages run fails at "Build the browser release" and the site keeps serving the last deployment. Never remove the flag or deploy a diagnostic build to get past it.

## Required GitHub settings

These settings were observed read-only on 2026-11-12; no setting was changed.

| Setting                                                        | Required value                            | Observed                                                      |
| -------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Settings → Pages → Build and deployment → Source               | **GitHub Actions**                        | `build_type: workflow` ✓                                      |
| Settings → Environments → `github-pages` → Deployment branches | Selected branches: **main** only, no tags | `main` branch policy ✓                                        |
| Enforce HTTPS                                                  | On                                        | `https_enforced: true` ✓                                      |
| Settings → Actions → General → Workflow permissions            | Read repository contents                  | Unverified; the workflow declares its own minimal permissions |
| Repository visibility                                          | Public (Pages on GitHub Free)             | Public ✓                                                      |

Optional: adding **required reviewers** to the `github-pages` environment makes each deployment wait for manual approval, as the [settings guide](launch/GITHUB_SETTINGS.md) recommends. Updates would then not be fully automatic; approve the pending deployment in the Actions run. No secrets or tokens are needed or should be stored in the environment.

Standard GitHub-hosted runners on a public repository and GitHub Pages hosting are free. The workflow uses no paid service, personal access token or repository secret.

## Verify the deployed commit

```sh
curl -s https://sarangp3010.github.io/open-skill-kit/version.json
git rev-parse origin/main
```

`version.json` contains `commit` (the deployed `main` SHA), `ciRunId` (the CI run that passed) and `pagesRunId`. The run URLs are `https://github.com/sarangp3010/open-skill-kit/actions/runs/<id>`. Settings → Environments → `github-pages` and the repository's **Deployments** list also show the deployed SHA. Pages' CDN may serve a cached copy for a few minutes after deployment.

## Local checks (no deployment)

```sh
VITE_BASE_PATH=/open-skill-kit/ pnpm build   # diagnostic Pages-path build
pnpm pages:verify                             # verify apps/web/dist
OPEN_SKILL_KIT_RELEASE_BUILD=1 VITE_BASE_PATH=/open-skill-kit/ pnpm build  # release gate; currently fails as intended
```

A diagnostic local build is for checking only; never upload it manually. If `pages:verify` reports files such as `index 2.html`, the local `dist` holds file-sync duplicates from an earlier build. Rebuild into a clean directory; CI checkouts never contain them.

## Troubleshooting

| Symptom                                                               | Cause and action                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Site shows an old version and no Pages run exists                     | CI on `main` did not succeed, or the change never reached `main`. Check the CI run for the merge commit.                 |
| Pages run skipped entirely                                            | The CI run was not a successful `push` on `main` (for example, a PR or dispatch run). Expected.                          |
| Pages build skipped with a "superseded" notice                        | A newer `main` commit exists; its own run deploys it.                                                                    |
| Fails at "Build the browser release" with `Release licensing blocked` | The licensing gate (see above). Resolve provenance through the owner process; do not remove the flag.                    |
| Fails at `pnpm catalog:check` or `pages:verify`                       | Committed catalogs are stale or the build output is wrong. Run `pnpm skills:index` and `pnpm build`, and fix it in a PR. |
| deploy waits for approval                                             | The environment has required reviewers. Approve in the run, or remove the rule if fully automatic deployment is wanted.  |
| deploy fails "branch not allowed"                                     | `github-pages` deployment branches must include `main`.                                                                  |
| Assets 404 under `/open-skill-kit/`                                   | `VITE_BASE_PATH` is missing or wrong; `pages:verify` should catch this before upload.                                    |
