# Licensing and third-party content review

The repository [LICENSE](../LICENSE) is MIT and retains its existing copyright notice. No new license or copyright ownership is invented by this phase. Original project contributions are offered under those terms; each skill's metadata also declares its license and provenance. All 42 current packages declare MIT and describe original/fictional authoring. This is a review of the recorded metadata, not an independent legal determination of every contributor's rights.

Contributors must identify third-party source URLs, authors/copyright holders, licenses and modifications. Retain required notices in an admitted text file such as references/NOTICE.md and link it from SKILL.md. A public URL alone does not grant redistribution rights. Do not copy proprietary manuals, patient/client records, restricted course material or unlicensed imagery. Prefer linking authoritative material to reproducing it, and keep claims appropriately scoped. Maintainers must resolve uncertain provenance before acceptance or publication; structural validation is not a license audit.

## Distribution notices

The existing npm build collects licenses/notices for bundled dependency modules. This collector is now shared with the browser build; both outputs contain THIRD_PARTY_NOTICES.txt and the project license (LICENSE in npm, LICENSE.txt in the web build). Actual installed dependency versions and available license/notice texts are recorded at build time; missing dependency notice material fails the build. Keep those files when redistributing either artifact. Tests exercise license inclusion and deterministic collection. Source-level notices within dependencies remain intact.

No third-party skill package or remote image/font service was introduced. The UI uses existing local dependencies/icons. Dependency notices are not a substitute for maintainer review of contributed prose. Attribution records separately document a completed authorship review; they are not a relicensing mechanism and cannot manufacture permission from a GitHub username.

Before any public release, inspect the actual tarball/web artifact, retained notices and content provenance. npm's published-only gate still excludes all drafts and rejects an empty release. No package is published, site deployed or repository made public by this workflow. See [contribution guide](../CONTRIBUTING.md), [release policy](releases.md) and [readiness](community-readiness.md).

## Recorded missing-notice exception

The installed react-remove-scroll-bar@2.3.8 manifest and README declare MIT, but its npm artifact omits the license text. The npm metadata's gitHead (b3b1287aad81def2e2ae707274b74531b61ddbaf) returned 404 from the declared upstream repository during this review. The available upstream source at commit 8ca9ba5ea52de03308fe8ced94f7b159a44d28ff declares version 2.3.7/MIT and contains Anton Korzunov's MIT notice. That verbatim notice is retained in third-party/ with its source URL and SHA-256. It is **not claimed to be exact-release source verification** for 2.3.8.

The shared collector accepts this explicit version-scoped exception only when the installed license declaration and notice hash match. No build fetches remote licensing content. Other missing notices fail the build. Maintainers should resolve the upstream release-source discrepancy before a public redistribution decision; no visibility or release decision is made here. See [the recorded exception](../third-party/license-overrides.json).

## Current audit and portable notices

Every current skill and the reusable template now includes the exact existing root MIT notice as LICENSE.txt. Its copyright wording is retained, not replaced by an invented author assignment. Metadata declarations still require human rights confirmation. All 42 package hashes changed and prior exact-content reviews/evidence must be rechecked; the old fixture artifact is retained stale. See the [per-file inventory](launch/PROVENANCE_INVENTORY.json), [owner action queue](launch/SHORTLIST_REVIEW.md) and [unresolved confirmations](launch/UNRESOLVED_BLOCKERS.md).

Builds emit DEPENDENCY_MANIFEST.json alongside THIRD_PARTY_NOTICES.txt in npm/web output, derived from actual bundle inputs; generated Tailwind CSS also retains its dependency notice. The artifact audit checks those records against the installed inventory and hashes all output files. Installed development/native packages with missing standalone notices are listed separately; no SPDX string is treated as independent provenance verification. The inventory is host-scoped for optional native packages, with a lockfile hash guarding source dependency changes across hosts.
