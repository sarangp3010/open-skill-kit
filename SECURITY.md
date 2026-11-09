# Security policy

This pre-release project treats contributed skills as untrusted data. The baseline accepts UTF-8 text assets only and rejects all symlinks, executable extensions, unsafe paths, raw Markdown HTML, and unsafe link schemes. It never executes package contents. Validation cannot establish that natural-language instructions are safe; maintainers must inspect prompt injection, exfiltration, misleading claims and provenance.

Do not post exploit details or secrets publicly. Once hosted on GitHub, use the repository Security tab's private vulnerability reporting if enabled; otherwise contact a maintainer privately using their profile contact. No repository URL or dedicated security address is configured yet. Acknowledgement within three business days and initial triage within seven are targets, not guarantees. Only the current main branch is supported before a release.

CI uses a lockfile, read-only permissions, dependency review on PRs, and a scheduled dependency audit. Enable GitHub secret scanning and private vulnerability reporting when the repository is created; these remote settings are not configured by local files. No backend, AI keys, archive importer, or Markdown renderer exists yet. Their controls must be validated in their own epics.

The npm CLI copies validated, published packages from its bundled catalog. It refuses destination collisions and symlinked paths and does not execute skill contents. npm publication is manual and requires review; source-to-tarball tests run locally and in CI. See [npm distribution](docs/npm-distribution.md) for the installer threat model.
