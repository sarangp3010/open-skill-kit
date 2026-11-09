# Contributing

Start with the [README](README.md), [status](docs/implementation-status.md), and [authoring contract](docs/skill-authoring.md). Discuss larger changes in an issue. Keep pull requests focused on the current epic. Respect the [code of conduct](CODE_OF_CONDUCT.md).

1. Install the pinned tools and run `pnpm install --frozen-lockfile`.
2. Make a focused change with meaningful tests. Keep new skills as drafts.
3. Run the validation commands in the README, including formatting and documentation link checks.
4. Open a PR using the template. Describe behavior, validation, provenance, and security implications.

Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`); breaking changes use `!` and a `BREAKING CHANGE:` footer. Follow the [release process](docs/releases.md).

By contributing, you license your original work under MIT. Identify third-party sources, their licenses, and any modifications; do not submit private information or content you lack permission to redistribute. Maintainers review provenance, safety boundaries and compatibility evidence before publishing skills. Structured behavioral cases document expectations only; no LLM evaluation runs in baseline CI.
