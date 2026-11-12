# Platform installation and lifecycle

The CLI copies complete validated packages into assistant discovery directories. No account or paid API is needed. It never invokes an assistant, executes skill content, changes assistant settings or silently fetches remote skills. Documented directory support is distinct from executed assistant compatibility testing.

## Verified conventions

Checked against official documentation on **2026-11-10**:

| CLI platform  | Project directory       | User-global directory     | Official source                                               |
| ------------- | ----------------------- | ------------------------- | ------------------------------------------------------------- |
| `codex`       | `.agents/skills/<slug>` | `~/.agents/skills/<slug>` | [Codex skills](https://learn.chatgpt.com/docs/build-skills)   |
| `claude-code` | `.claude/skills/<slug>` | `~/.claude/skills/<slug>` | [Claude Code skills](https://code.claude.com/docs/en/skills)  |
| `cursor`      | `.cursor/skills/<slug>` | `~/.cursor/skills/<slug>` | [Cursor skills](https://cursor.com/help/customization/skills) |
| `gemini-cli`  | `.gemini/skills/<slug>` | `~/.gemini/skills/<slug>` | [Gemini CLI skills](https://geminicli.com/docs/cli/skills/)   |

Project scope uses the selected working directory, not a guessed Git root. Global scope means your local home, independently of how the CLI itself was installed. Both scopes are currently supported for all four adapters. System/enterprise installation is not supported. Shared discovery aliases can shadow or duplicate other installations; this CLI changes only the selected adapter directory. Claude reserves synced and anthropic-skills as names. Local, remote and cloud sessions may discover different skills; consult the official guides. Reload/restart the assistant if needed and approve activation/tool access there.

## Current checkout workflow

The npm package remains unpublished and the current 42 library skills remain drafts. Published npm bundles continue to exclude drafts. Use an explicit local source and review/opt in before installing unpublished content:

```sh
pnpm install --frozen-lockfile
pnpm build:npm
pnpm cli platforms
pnpm cli list --source ./skills
pnpm cli show software-development/code-reviewer --source ./skills
pnpm cli install software-development/code-reviewer --source ./skills --platform codex --scope project --project-dir ../your-project --allow-draft --dry-run
pnpm cli install software-development/code-reviewer --source ./skills --platform codex --scope project --project-dir ../your-project --allow-draft
pnpm cli installed --platform codex --project-dir ../your-project
pnpm cli inspect software-development/code-reviewer --platform codex --project-dir ../your-project
```

Replace ../your-project with an existing project and quote paths containing spaces. Relative source and project paths resolve from the invoking directory. Without --project-dir, project scope uses the current directory. --source names the local skills root containing sector directories, not a remote URL. --allow-draft does not change editorial status. Inspect instructions, supporting files, provenance and limitations first. For a separately installed packed CLI, replace pnpm cli with its binary and use an absolute source path.

User-global installation uses the same commands with --scope global and no --project-dir:

```sh
pnpm cli install software-development/code-reviewer --source ./skills --platform claude-code --scope global --allow-draft --dry-run
pnpm cli install software-development/code-reviewer --source ./skills --platform claude-code --scope global --allow-draft
pnpm cli installed --platform claude-code --scope global
```

Select cursor or gemini-cli in the same way. Unsupported platforms/scopes, duplicate/unknown flags and conflicts cause clear errors rather than choosing a fallback destination.

## Update, inspect and remove

Updates synchronize one selected installation with the chosen local source or bundled release. They do not poll a registry or choose an upstream version. Obtain and review a new source/CLI release first. The chosen source can intentionally contain an older version: review its version before synchronizing. Missing versions remain unknown.

```sh
pnpm cli update software-development/code-reviewer --source ./skills --platform codex --project-dir ../your-project --allow-draft --dry-run
pnpm cli update software-development/code-reviewer --source ./skills --platform codex --project-dir ../your-project --allow-draft
pnpm cli uninstall software-development/code-reviewer --platform codex --project-dir ../your-project --dry-run
pnpm cli uninstall software-development/code-reviewer --platform codex --project-dir ../your-project
```

Use the same platform/scope/project selection as installation. installed and inspect are read-only and do not load a source library. They report managed, modified or unmanaged state, destination, version and conflicts. Manually copied skills and legacy generic add installations have no managed receipt and cannot be adopted, overwritten, updated or removed automatically.

## Ownership and filesystem safety

- All admitted package files are preserved: SKILL.md, examples, references, metadata and test descriptions. Existing UTF-8 text formats, file/byte/depth limits, reference checks and binary/executable restrictions remain enforced. No contributed scripts execute.
- Native installs add .open-skill-kit-install.json with a versioned owner, identity, platform, scope, version and SHA-256 hashes for every package file. This receipt is bookkeeping, not a signature or proof of review.
- New installs refuse existing destinations and case-insensitive collisions. Project/home anchors must already exist. Destination ancestors must be ordinary directories. Use canonical paths where the OS exposes aliases such as /tmp as symlinks.
- Updates/removal require a matching receipt and unchanged package. Modified, missing or extra files, extra empty directories, symlinks and hard-linked installed files are refused. There is no force option. Preserve personal edits separately or resolve the conflict manually.
- Mutations take an exclusive per-directory lock. Stale locks are never automatically removed: review .open-skill-kit.lock after confirming no process is active. Dry runs validate sources, ownership and conflicts without creating folders/locks; previews are not reservations.
- Updates stage a full package and move the previous package aside. Failed publication restores the previous folder when possible. Removal verifies a quarantined package and unlinks only unchanged receipt-listed files, then removes directories nonrecursively. Unexpected user files are not recursively deleted. Failures may leave a recovery directory named in the error; inspect it manually.
- Locks coordinate Open Skill Kit processes. These checks are not an OS sandbox against a hostile same-user process racing filesystem calls or deliberately forging receipts. Avoid shared adversarially writable directories. Process interruption can require manual recovery; there is no automatic destructive recovery or rollback command.

The static marketplace uses the same browser-safe adapter registry for paths, official links and copyable preview/install commands. It cannot write to a visitor's filesystem. ZIP/Markdown fallbacks remain available. Platform conventions were checked in documentation; tests exercise filesystem operations and UI, not actual assistant/model execution.

## Filesystem portability and review hashes

Use native host paths for project/home directories. Windows drive and UNC roots are handled by native path utilities; backslash separators on POSIX are rejected explicitly rather than silently interpreted as different directory levels. Package/evidence paths use forward slashes, NFC Unicode and portable components, with Windows device names and case/Unicode aliases rejected. Git text checkout uses LF through .gitattributes. UTF-8 BOM and line-ending changes remain part of full package hashing: they cannot silently preserve prior approval. Native hosted results must be observed separately; path-syntax regression tests do not establish assistant behavior or complete platform compatibility.
