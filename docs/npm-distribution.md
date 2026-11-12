# npm distribution

The user requested npm access alongside GitHub-readable Markdown skills. This explicitly brings forward a limited part of K01/K02: a package containing a CLI and published skill files. Other later epics remain deferred. No npm package has been published, no name has been reserved and no registry credentials are stored in the repository. A registry lookup for `open-skill-kit` returned E404 on 2026-11-09; check again before releasing.

## Try the implementation locally

From a checkout with dependencies installed:

```sh
pnpm build:npm
pnpm cli --help
pnpm cli list
pnpm pack:npm
```

The source catalog currently contains zero published skills, so `list` reports an empty library and `add` cannot install a real catalog skill yet. Automated tests use synthetic packages in temporary directories to exercise the full install flow without publishing fixtures.

`pnpm pack:npm` produces `dist/open-skill-kit-0.1.0.tgz` for the current version. In a separate project directory, install that local tarball using its absolute path:

```sh
npm install /absolute/path/to/open-skill-kit/dist/open-skill-kit-0.1.0.tgz
npx --no-install open-skill-kit --help
npx --no-install open-skill-kit list
```

Installing this tarball requires no workspace packages or runtime npm dependencies. It includes the built Node CLI, package metadata, README, MIT license, third-party license notices, a generated catalog and complete published skill folders. It excludes drafts, tests, application source, local configuration and secrets by an explicit files allowlist. The CLI has no install/postinstall hooks.

## Intended usage after publication

```sh
npx open-skill-kit list
npx open-skill-kit show <skill-id-or-slug>
npx open-skill-kit add <skill-id-or-slug> --dry-run
npx open-skill-kit add <skill-id-or-slug>
npx open-skill-kit add <skill-id-or-slug> --dir ./my-skill-directory
```

Replace the identifier with a result from `list`. `list` accepts one optional search string across ID, title, description and tags. `show` prints the bundled canonical Markdown. `add` copies all package files to `<directory>/<slug>`, defaulting to `./.open-skill-kit/skills/<slug>`. A global CLI installation using `npm install --global open-skill-kit` also works after publication.

These commands are **not available from the registry yet**. Do not infer that any planned flagship skill or platform installation has been verified. The [npm exec documentation](https://docs.npmjs.com/cli/v11/commands/npm-exec/) explains how npx obtains the CLI, while the [package.json documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) describes the bin/files fields used by this package.

## Installation behavior and trust

The CLI does not execute skills, run scripts, access AI services or fetch remote skill instructions. Generic copies and explicitly requested native installation use the existing safe local lifecycle commands; the CLI does not start assistants or claim their behavior was tested. npm/npx can access the registry to obtain the CLI; the CLI itself reads only bundled files. Review the Markdown and provenance first. A destination supported by a particular assistant can be selected with `--dir` after checking that product's current documentation; the generic default is storage, not verified native installation.

Both source and bundled packages are validated. Unpublished entries, unsafe package paths and symlinked skill directories fail. Existing skill folders are never overwritten, including case-insensitive filename matches. Destination ancestors must be ordinary directories, so symlink aliases such as `/tmp` may need their canonical path. Dry runs perform validation and collision checks without creating folders. A newly reserved destination is removed if copying fails; existing user folders are never removed. Concurrent hostile mutation of source/destination trees is outside the local installer threat model; avoid installing into shared writable directories. Automatic background updates, force-overwrite and a rollback command remain deferred. Explicit managed updates/removal are now available as described below.

## Build, test and release

`packages/cli` is a private source workspace. `scripts/build-npm.ts` builds a private diagnostic artifact in `dist/npm` by default; explicit `--release` preparation builds the intended public artifact only after the dependency-license preflight, bundles its workspace dependencies and copies only validated entries with `status: published`. Root source workspaces remain private. `dist/` is ignored by Git. The package version follows the root version; skill metadata versions remain independent.

Tests build a synthetic package, inspect its tarball, install it into a new temporary project with npm offline and scripts disabled, invoke the npm binary, and compare installed Markdown. They also cover empty/draft exclusion, corrupt content, path/symlink checks, dry run and overwrite refusal. The pack step runs in CI after the normal tests and build. It does not publish anything.

Before release, author actual skills and obtain human review, run all repository checks, inspect `npm pack --dry-run ./dist/npm`, confirm npm name ownership, confirm license/provenance for every bundled file, and verify package README/version/repository information. Explicit `pnpm exec tsx scripts/build-npm.ts --release` preparation first requires sufficient exact-release packaged license evidence for every bundled dependency, rejecting unresolved canonical notice cases and override-only evidence. The generated `prepublishOnly` guard refuses diagnostic builds, an empty catalog, unpublished entries and changed license/catalog/package bytes. See the [release preflight policy](releases.md#fail-closed-dependency-release-preflight). Do not bypass that guard. npm access is not an alternative to skill safety review.

Publishing is an explicit maintainer action after release approval. From `dist/npm`, an authorized maintainer can run `npm publish --access public` using their own npm account and required authentication. No publish workflow, account changes, token, release tag, registry upload or Git push has been performed by this implementation. See [release policy](releases.md).

## Phase 2 platform lifecycle

The published-only bundle policy above is preserved. Native install, installed, inspect, update and uninstall support Codex, Claude Code, Cursor and Gemini CLI. Explicit --source discovery plus --allow-draft enables locally reviewed draft installation without putting drafts in npm artifacts or changing release gates. Inspection/removal work without a source library. See [platform installation](platform-installation.md) for commands, scopes, verified paths, receipts, conflicts and recovery limits. No registry release has been made.
