# open-skill-kit

Browse and copy portable Markdown skill packages from the open-source [open-skill-kit repository](https://github.com/sarangp3010/open-skill-kit).

**Pre-release:** this package has not been published to npm, and the repository has no published skills yet. The registry commands below describe usage after a reviewed release. Installing the npm package installs the CLI and bundled files; it does not run AI tasks or automatically activate skills in every assistant.

## Usage after publication

```sh
npx open-skill-kit list
npx open-skill-kit list learning
npx open-skill-kit show <skill-id-or-slug>
npx open-skill-kit add <skill-id-or-slug> --dry-run
npx open-skill-kit add <skill-id-or-slug>
```

Replace `<skill-id-or-slug>` with an actual identifier from `list`. No flagship skill is available yet.

Alternatively, install the CLI once:

```sh
npm install --global open-skill-kit
open-skill-kit list
```

`add` copies the full package into `./.open-skill-kit/skills/<slug>/`. Use `--dir <directory>` to choose a different destination, including a directory supported by your assistant after consulting its current official installation instructions. Generic copying is not a promise of native compatibility. Existing folders and symbolic links are rejected. There is no force or script execution option. Native platform commands install into discovery directories without editing assistant settings.

Only human-approved packages marked published are bundled. Drafts, planned skills and test fixtures are excluded. The standard discovery/install CLI reads bundled data locally; it does not fetch remote skill content, send prompts or keys anywhere, or require an AI API. Separately configured real-agent evaluations are optional and require explicit opt-in (see below). npm/npx itself may use the network to obtain the CLI package. Inspect the skill instructions, examples, boundaries, license and provenance before use. Availability of external links and model behavior are not verified by installation.

Requires Node.js 22.13+ on the 22.x line, 24.x, or 26+. MIT licensed. See the repository for contribution and security policies.

## Native platform commands

From a local checkout, run pnpm install --frozen-lockfile and pnpm build:npm first. The npm package is not published; current drafts require a local source and explicit opt-in:

```sh
pnpm cli platforms
pnpm cli list --source ./skills
pnpm cli install software-development/code-reviewer --source ./skills --platform codex --project-dir ../your-project --allow-draft --dry-run
pnpm cli install software-development/code-reviewer --source ./skills --platform codex --project-dir ../your-project --allow-draft
pnpm cli installed --platform codex --project-dir ../your-project
pnpm cli inspect software-development/code-reviewer --platform codex --project-dir ../your-project
pnpm cli update software-development/code-reviewer --source ./skills --platform codex --project-dir ../your-project --allow-draft --dry-run
pnpm cli uninstall software-development/code-reviewer --platform codex --project-dir ../your-project --dry-run
```

Use an existing target project. Supported platforms are codex, claude-code, cursor and gemini-cli; scope is project by default or global with --scope global. --project-dir applies only to project scope. Review previews before omitting --dry-run. A separately installed packed CLI accepts the same commands with its binary name and an absolute --source path.

Native installations preserve all validated files and record ownership/hashes. Updates and removal require matching receipts and unchanged content. User changes, unmanaged folders, symlinks, unsafe paths and conflicts are refused. No command executes skill content or fetches remote skill instructions. Published-only bundling and release guards remain unchanged.

Full commands, verified official sources, paths, recovery and safety limits: https://github.com/sarangp3010/open-skill-kit/blob/main/docs/platform-installation.md. Directory conventions were checked on 2026-11-10; actual assistant/model execution is not claimed.

## Read-only quality assessment

```sh
pnpm cli quality software-development/code-reviewer --source ./skills
pnpm cli quality software-development/code-reviewer --source ./skills --json
```

Use the local checkout/built binary workflow above. Quality reuses the existing validator and reports individual weighted checks, validation diagnostics, a package digest and separate installation/testing states. Invalid packages emit a blocked zero score and fail; missing optional authoring information is advisory. Scores, legacy testing declarations and directory support do not create verified badges. No content is executed. Evidence format, reusable template and limits: https://github.com/sarangp3010/open-skill-kit/blob/main/docs/skill-quality.md.

## Evaluations

```sh
pnpm evaluate:fixtures
pnpm build:npm
pnpm cli evaluate adapters
pnpm cli evaluate --suite evaluations/scenarios/code-reviewer.json --source ./skills
```

Fixture mode is the default and runs without an assistant, credentials, Docker or paid API. It writes a new structured report under ignored .open-skill-kit/evaluations. --output chooses a new file without overwriting existing files. Incomplete executions save errors and fail. Use --fail-on-regression or --fail-on-assertion for explicit comparison gates; a baseline assertion failure alone otherwise remains valid comparison data.

Optional real execution additionally requires --mode agent --platform <platform> --agent-config <json> --allow-agent and a trusted digest-pinned local container image. It can use a configured provider only under that explicit opt-in; normal CLI commands never invoke agents. No real agent compatibility or effectiveness is claimed by fixture replay. Read [evaluation configuration, sources, report semantics and limits](../../docs/skill-evaluation.md) before opting in. The CLI package remains unpublished; use the checkout workflow above.
