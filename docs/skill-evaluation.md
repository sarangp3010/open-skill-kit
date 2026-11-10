# Reproducible skill evaluations

Phase 4 adds offline replay and explicitly configured, optional agent execution to the existing validator, catalog, CLI and marketplace. It does not turn structural quality points into performance scores, run contributed scripts, promote drafts, or infer platform compatibility.

## Offline quick start

```sh
pnpm install --frozen-lockfile
pnpm evaluate:fixtures
pnpm build:npm
pnpm cli evaluate adapters
pnpm cli evaluate --suite evaluations/scenarios/code-reviewer.json --source ./skills
```

No Docker, provider credentials or paid API is needed for fixture replay. Fresh reports are written exclusively to unique files under ignored `.open-skill-kit/evaluations/`. `--output <new-json>` selects a destination; an existing file is never replaced. An incomplete run saves its errors and exits unsuccessfully. Completed comparisons can contain failing assertions: add `--fail-on-regression` to reject a negative difference or `--fail-on-assertion` to reject any failed baseline/assisted assertion.

The included Code Reviewer suite contains two realistic defect-review tasks: an empty-array average and a missing account lookup. Its outputs are **authored fixtures**, identical for both arms. The locally executed replay in [the reviewed report](../evaluations/reports/code-reviewer-fixture.json) has two complete comparisons, 100/100 assertion scores in both arms, and zero difference. These numbers demonstrate replay/scoring mechanics only. They are not measured assistant output, evidence of skill effectiveness, or a real platform test. No real-agent report is included.

## Scenario contract

The typed Zod contracts are in [evaluation.ts](../packages/skill-schema/src/evaluation.ts). Start from [the complete offline suite](../evaluations/scenarios/code-reviewer.json). Each version-1 suite declares a unique ID, canonical sector/skill ID, description and 1–10 scenarios. Each scenario has a unique ID, a task prompt, seed text files, 1–30 uniquely identified weighted assertions, and optional baseline/assisted fixtures. Every fixture explicitly declares its final response and file writes; absence blocks replay rather than generating an answer.

Assertions are declarative: `text-contains`, `text-excludes`, `text-equals`, `json-field-equals`, `file-exists`, `file-equals`, and `file-contains`. Each includes an ID and a weight (1–100). JSON lookup uses own properties and refuses prototype-related keys. There are no shell commands, arbitrary JavaScript, regex execution or contributed test scripts. Only assertion-referenced output files are captured. A passing file assertion can refer to an unchanged seeded file; design assertions that distinguish the intended behavior. A string match is not a professional correctness or safety assessment.

Paths must be portable relative paths; absolute paths, traversal, dot segments, encodings, Windows device names and hidden paths are rejected using the existing path contract. `skill-context/` is reserved. File maps admit at most 50 text files, with bounded content; total suite input is limited to 1 MiB. Supporting skill files are read and validated through the existing package reader. The complete admitted package is provisioned, with no generated substitute and no host installation.

## Baseline fairness and scoring

For each scenario the runner creates two new directories beneath one private temporary root. Both arms receive the same task prompt, seed files, requested model, pinned image and resource settings. Only the assisted arm receives the complete skill package and an instruction to read its native SKILL.md. Baseline receives no evaluated skill. No workspace is reused between arms or scenarios, and the root is removed after report creation or failure. The source package and the caller's project are never mounted into an agent container.

Each completed arm earns `100 × passed assertion weight / total weight`, rounded to two decimals. Case difference is assisted minus baseline. Suite scores are the equal-weight mean of scenario scores; the suite difference is the difference between those means. Every comparison must complete before aggregate scores are exposed. Blocked, timed-out, malformed, resource-limited or failed executions are unscored rather than converted into zero-valued model answers. Completed outputs that fail assertions retain their actual failing scores. Zero or negative differences are valid evidence.

Replay definitions, assertions, parsed output and file observations are deterministic; wall-clock timestamps and runtimes are measurements and naturally differ. Real model responses are not guaranteed deterministic, even with a pinned container and requested model. There is no hidden statistical-significance claim, seed control or automatic retry. Repeat runs and review the task coverage before drawing conclusions.

## Optional real execution

Real execution requires **all** of `--mode agent`, a supported `--platform`, `--allow-agent` and a valid `--agent-config`. There is no automatic host-binary fallback or fixture fallback. Missing configuration or unavailable engines produces blocked, unscored evidence. Agents are never run during normal catalog generation, builds, tests or offline replay.

Prepare your own trusted local Docker image containing the chosen CLI, and pin it by its actual SHA-256 digest. The runner neither downloads images nor installs assistant software. Set `engine` to the absolute, ordinary executable path of a trusted Docker CLI (symlink aliases are refused). Its bounded version probe must identify Docker. Review any credentials, provider charges and image behavior before opting in. A version string is not authentication of the executable; the configuration and container daemon are trusted operator inputs.

Example configuration (replace both placeholders with actual reviewed values):

```json
{
  "schemaVersion": 1,
  "enabled": true,
  "platform": "codex",
  "engine": "/absolute/path/to/docker",
  "image": "your-local-image@sha256:REPLACE_WITH_ACTUAL_64_HEX_DIGEST",
  "model": "your-explicit-model-id",
  "network": false,
  "credentialEnv": [],
  "limits": {
    "timeoutMs": 10000,
    "suiteTimeoutMs": 60000,
    "maxOutputBytes": 32768,
    "maxWorkspaceBytes": 4194304,
    "maxWorkspaceEntries": 512,
    "memoryMiB": 512,
    "cpus": 1,
    "pids": 64
  }
}
```

```sh
pnpm cli evaluate --suite evaluations/scenarios/code-reviewer.json --source ./skills --mode agent --platform codex --agent-config /absolute/path/to/reviewed-config.json --allow-agent
```

The example is intentionally invalid until the operator supplies a real digest. Network defaults off. Cloud-backed CLIs normally need explicit `network: true` and an allowed, already-set environment credential. Only credential names appear in arguments/reports; exact configured secret values are redacted from captured process output, observed files and errors before scoring. Assertions see those redacted observations. Do not put secrets in scenario prompts, files or configuration values. Redaction is not a general secret scanner. Saved host auth directories, assistant configurations, repository files and home directories are not mounted. Interactive authentication flows are unsupported; use an image and authentication mode that work unattended. Provider availability and quota errors remain errors.

### Adapter status and official conventions

Command/response contracts were checked against official documentation on 2026-11-10. These are implemented **execution adapters**, not claims that the four assistants have completed evaluations:

| Platform    | Noninteractive command/output                                                                                                        | Allowed credential  | Assisted package directory |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | -------------------------- |
| Codex       | `codex exec --json --sandbox workspace-write --skip-git-repo-check --model …`; completed JSONL turn and final agent message required | `CODEX_API_KEY`     | `.agents/skills/<slug>/`   |
| Claude Code | `claude -p … --output-format json --model … --permission-mode dontAsk --allowedTools Read,Edit,Write`; successful `result` required  | `ANTHROPIC_API_KEY` | `.claude/skills/<slug>/`   |
| Cursor      | `agent -p … --output-format json --model …`; successful `result` required                                                            | `CURSOR_API_KEY`    | `.cursor/skills/<slug>/`   |
| Gemini CLI  | `gemini --prompt … --output-format json --model …`; successful `response` required                                                   | `GEMINI_API_KEY`    | `.gemini/skills/<slug>/`   |

Sources: [Codex noninteractive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [Claude headless mode](https://code.claude.com/docs/en/headless), [Cursor headless mode](https://cursor.com/docs/cli/headless), [Gemini headless mode](https://geminicli.com/docs/cli/headless/). Native discovery path sources and limits are maintained in [platform installation](platform-installation.md).

No agent version is guessed: platformVersion remains null when unavailable. Requested model is configuration, not proof of the served model; a separately reported model is recorded only if the output supplies it. Incompatible output formats fail instead of being interpreted as success. Cursor may require permissions for file modifications; this adapter deliberately does not enable `--force` or `--yolo`. Claude restricts tool grants; Gemini may refuse file tools in headless mode. Response-only tasks can still be evaluated; file assertions honestly fail or the execution errors if the configured CLI cannot write. Installability is not tested activation, and successful protocol parsing is not universal compatibility.

### Isolation and limits

Real runs use shell-free Docker arguments, a generated container name, `--pull=never`, a read-only image filesystem, a non-root UID/GID, dropped capabilities, no-new-privileges, CPU/memory/swap/PID limits and bounded tmpfs home/tmp. Only that arm's generated workspace is writable through a bind mount. Network is none unless the operator explicitly enables bridge access. Image-installed plugins, trusted image contents and any network service are outside the skill-source validator's control.

The runner bounds per-arm time, suite scheduling time, combined captured stdout/stderr/file bytes, workspace entries/depth/bytes and input/report sizes. Workspace size is checked before/after execution and polled every 100 ms; it is **not a hard disk quota**, so transient disk growth between checks is possible. Container memory/CPU/PID limits are daemon-enforced. Timeout/output/workspace failures terminate the client process group; a separate bounded cleanup forcibly removes only its generated container, including after timeout. Cleanup failure invalidates that arm and is reported. Cleanup has its own five-second allowance per launched container beyond the suite scheduling budget. Hard interruption, daemon failure or hostile same-user races can require manual cleanup of the generated `osk-eval-…` container; no unrelated container or user directory is removed. This is not a sandbox against a hostile Docker daemon, administrator, image or same-user process.

## Evidence, catalog and review

Reports include the embedded scenario definition, canonical suite digest, full skill package digest, non-secret configuration digest, runner/schema version, mode/platform, requested/reported model when available, image/network/credential names, engine version, Node/OS, limits, actual times/runtime, raw bounded stdout/stderr, captured file observations, errors, individual assertions and aggregate comparisons. Reports are UTF-8 JSON, max 4 MiB, and exclusively written; reviewed catalog imports admit at most 50 files/16 MiB. Sensitive local reports stay ignored by default.

To propose catalog evidence, inspect a real generated report, remove sensitive material by rerunning with safe inputs if necessary, and add a uniquely named JSON file beneath `evaluations/reports/`. Do not hand-edit scores or relabel a fixture as an agent run. Run `pnpm skills:index` and `pnpm catalog:check`. Updating the embedded definition changes its digest and requires an actual new run; later scenario-source edits do not rewrite historical embedded scenarios. Report imports reject unsafe paths/files, malformed schemas and unknown skill IDs. Semantically inconsistent reports are labeled invalid, changed package digests stale, and consistent/current reports reproduced. Stale/invalid aggregate scores are suppressed. Every report remains individually visible; favorable older results do not erase failures.

The indexer recomputes assertions, comparisons and suite digests rather than trusting authored scores. SHA-256 provides content identity, **not a signature**: a contributor could author an internally consistent report. Maintainer review and independently observed execution are still required for stronger trust. Marketplace labels explain this limit and distinguish fixture replay from measured agent performance. The framework never converts an evaluation into the Phase 3 platform-testing fields or a verified badge automatically. Structural quality, editorial status, compatibility declarations, installation conventions and evaluation evidence remain separate.

## Validation coverage

The local test suite covers deterministic replay, failures/negative differences, missing fixtures, weighted and JSON/file assertions, traversal/duplicate IDs, package preservation, adapter opt-in/configuration, bounded subprocess exits/output/timeouts, isolated arm provisioning, container cleanup, malformed responses, unsafe output entries, report tampering/staleness, catalog integration, CLI gating, and marketplace evidence. Container orchestration tests use an explicitly synthetic local process double; those temporary results are never included as real evidence. Playwright checks the fixture label, zero-difference comparison, provenance link, unchanged absence of platform-test evidence, and accessibility. No real Docker image, assistant, model or paid API was executed for this implementation.
