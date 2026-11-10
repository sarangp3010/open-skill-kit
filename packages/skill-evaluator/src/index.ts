import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import {
  agentEvaluationConfigSchema,
  evaluationLimitsSchema,
  evaluationReportSchema,
  evaluationSuiteSchema,
  safePathSchema,
  type AgentEvaluationConfig,
  type DiscoverySkill,
  type EvaluationArm,
  type EvaluationLimits,
  type EvaluationReport,
  type EvaluationScenario,
} from '@uas/skill-schema';
import {
  canonicalJson,
  evaluationConfiguration,
  evaluationSummary,
  extractAgentOutput,
  reproduceEvaluation,
  scoreEvaluation,
  validateSkill,
} from '@uas/skill-validator';
import { packageDigest } from '@uas/catalog-indexer';
import {
  assertPlatformSkill,
  getPlatform,
  type PlatformId,
} from '@uas/platform-adapters';
import { directoryPath } from '@uas/skill-installer';
import {
  checkAgentConfig,
  containerArguments,
  runBoundedProcess,
} from './execution';
export { executionAdapters, getExecutionAdapter } from './execution';
export const EVALUATOR_VERSION = '1.0.0';
export const evaluationDigest = (value: unknown) =>
  createHash('sha256').update(canonicalJson(value)).digest('hex');
export async function readEvaluationJson(
  path: string,
  maxBytes = 4194304,
): Promise<unknown> {
  const absolute = resolve(path);
  await directoryPath(dirname(absolute), false);
  const info = await lstat(absolute);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    info.nlink !== 1 ||
    info.size > maxBytes
  )
    throw new Error(`Expected bounded ordinary JSON file: ${absolute}`);
  return JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(await readFile(absolute)),
  );
}
export async function writeEvaluationReport(
  path: string,
  report: EvaluationReport,
) {
  const value = evaluationReportSchema.parse(report);
  const issues = reproduceEvaluation(value);
  if (value.suiteDigest !== evaluationDigest(value.suite))
    issues.push('Suite digest mismatch');
  if (
    value.configurationDigest !==
    evaluationDigest(evaluationConfiguration(value))
  )
    issues.push('Configuration digest mismatch');
  if (issues.length)
    throw new Error(
      `Evaluation report failed consistency checks: ${issues.join('; ')}`,
    );
  const serialized = JSON.stringify(value, null, 2) + '\n';
  if (Buffer.byteLength(serialized) > 4194304)
    throw new Error('Report exceeds 4 MiB');
  const absolute = resolve(path);
  await directoryPath(dirname(absolute), true);
  await writeFile(absolute, serialized, { flag: 'wx', mode: 0o600 });
  return absolute;
}
async function writeFiles(root: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    safePathSchema.parse(path);
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: 'wx', mode: 0o600 });
  }
}
async function guardWorkspace(root: string, limits: EvaluationLimits) {
  let count = 0,
    size = 0;
  async function walk(path: string, depth = 0): Promise<void> {
    if (depth > 15) throw new Error('Workspace depth limit exceeded');
    for (const name of await readdir(path)) {
      if (++count > limits.maxWorkspaceEntries)
        throw new Error('Workspace entry limit exceeded');
      const full = join(path, name),
        info = await lstat(full);
      if (
        info.isSymbolicLink() ||
        (!info.isDirectory() && !info.isFile()) ||
        (info.isFile() && info.nlink !== 1)
      )
        throw new Error(
          'Unsafe workspace entry (symlink, hard link or special file)',
        );
      if (info.isDirectory()) await walk(full, depth + 1);
      else size += info.size;
      if (size > limits.maxWorkspaceBytes)
        throw new Error('Workspace byte limit exceeded');
    }
  }
  await walk(root);
}
async function observations(
  root: string,
  scenario: EvaluationScenario,
  maxBytes: number,
) {
  const paths = [
    ...new Set(
      scenario.assertions.flatMap((assertion) =>
        'path' in assertion && typeof assertion.path === 'string'
          ? [assertion.path]
          : [],
      ),
    ),
  ];
  const files: Record<string, string> = {};
  let bytes = 0;
  for (const path of paths) {
    const target = join(root, path);
    try {
      await directoryPath(dirname(target), false);
      const info = await lstat(target);
      if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
        throw new Error(`Unsafe observation file: ${path}`);
      bytes += info.size;
      if (bytes > maxBytes)
        throw new Error('Observed files exceed output limit');
      files[path] = new TextDecoder('utf-8', {
        fatal: true,
        ignoreBOM: true,
      }).decode(await readFile(target));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return files;
}
function failed(
  status: EvaluationArm['status'],
  code: string,
  message: string,
): EvaluationArm {
  return {
    status,
    output: '',
    files: {},
    stdout: '',
    stderr: '',
    runtimeMs: 0,
    exitCode: null,
    modelReported: null,
    platformVersion: null,
    error: { code, message: message.slice(0, 2048) },
    score: null,
    assertions: [],
  };
}
export interface EvaluationOptions {
  suite: unknown;
  skill: DiscoverySkill;
  mode?: 'fixture' | 'agent';
  platform?: PlatformId;
  allowAgent?: boolean;
  agentConfig?: unknown;
  limits?: Partial<EvaluationLimits>;
}
export async function runEvaluation(
  options: EvaluationOptions,
): Promise<EvaluationReport> {
  const suite = evaluationSuiteSchema.parse(options.suite);
  if (Buffer.byteLength(JSON.stringify(suite)) > 1048576)
    throw new Error('Evaluation suite exceeds 1 MiB');
  const validation = validateSkill(options.skill.files, options.skill.id, {
    profile: 'catalog',
  });
  if (!validation.valid || !validation.skill)
    throw new Error(
      `Invalid evaluation skill: ${validation.errors.join('; ')}`,
    );
  const skill = validation.skill;
  if (suite.skillId !== skill.id)
    throw new Error(
      'Evaluation suite skill ID does not match the supplied package',
    );
  const mode = options.mode ?? 'fixture';
  if (mode === 'fixture' && options.agentConfig)
    throw new Error('Agent configuration cannot be used for fixture replay');
  const platform =
    mode === 'fixture' ? 'fixture' : getPlatform(options.platform ?? '').id;
  let engineVersion: string | null = null;
  let config: AgentEvaluationConfig | undefined, blocked: string | undefined;
  if (mode === 'agent') {
    if (!options.allowAgent)
      blocked = 'Real execution requires explicit --allow-agent opt-in';
    else if (!options.agentConfig)
      blocked = 'Real execution has no configured container adapter';
    else {
      const result = agentEvaluationConfigSchema.safeParse(options.agentConfig);
      if (!result.success)
        blocked = `Invalid real-agent configuration: ${result.error.message}`;
      else if (result.data.platform !== platform)
        blocked = 'Configured adapter does not match the selected platform';
      else {
        config = result.data;
        try {
          engineVersion = await checkAgentConfig(config);
          assertPlatformSkill(config.platform, skill.slug);
        } catch (error) {
          blocked =
            error instanceof Error ? error.message : 'Adapter unavailable';
        }
      }
    }
  }
  const limits = evaluationLimitsSchema.parse({
    ...config?.limits,
    ...options.limits,
  });
  if (config) config = { ...config, limits };
  const startedAt = new Date().toISOString(),
    start = performance.now(),
    deadline = start + limits.suiteTimeoutMs;
  const root = await mkdtemp(join(await realpath(tmpdir()), 'osk-evaluation-'));
  const cases: EvaluationReport['cases'] = [];
  const secrets =
    config?.credentialEnv.map((name) => process.env[name]!).filter(Boolean) ??
    [];
  const redact = (text: string) => {
    for (const secret of secrets) text = text.split(secret).join('[REDACTED]');
    return text.split(root).join('<temporary-workspace>');
  };
  async function arm(
    scenario: EvaluationScenario,
    variant: 'baseline' | 'assisted',
  ): Promise<EvaluationArm> {
    const began = performance.now();
    let result = failed('error', 'not-started', 'Execution did not start');
    const remaining = deadline - performance.now();
    if (remaining <= 0)
      return failed(
        'timeout',
        'suite-timeout',
        'Suite wall-clock budget exhausted',
      );
    if (blocked) return failed('blocked', 'adapter-blocked', redact(blocked));
    const workspace = join(root, `${scenario.id}-${variant}`);
    await mkdir(workspace);
    try {
      await writeFiles(workspace, scenario.files);
      if (variant === 'assisted') {
        const directory =
          mode === 'agent' ? getPlatform(platform).directory : 'skill-context';
        await writeFiles(join(workspace, directory, skill.slug), skill.files);
      }
      await guardWorkspace(workspace, limits);
      if (mode === 'fixture') {
        const fixture = scenario.fixtures?.[variant];
        if (!fixture) {
          result = failed(
            'blocked',
            'fixture-absent',
            'No declared fixture for this scenario; no agent was run',
          );
          return result;
        }
        if (Buffer.byteLength(fixture.output) > limits.maxOutputBytes) {
          result = failed(
            'limit-exceeded',
            'output-limit',
            'Fixture output exceeds configured limit',
          );
          return result;
        }
        for (const [path, content] of Object.entries(fixture.files)) {
          const target = join(workspace, path);
          await directoryPath(dirname(target), true);
          await writeFile(target, content, { mode: 0o600 });
        }
        await guardWorkspace(workspace, limits);
        result = {
          ...failed('completed', '', ''),
          status: 'completed',
          output: fixture.output,
          stdout: fixture.output,
          exitCode: 0,
          error: null,
          files: await observations(
            workspace,
            scenario,
            limits.maxOutputBytes - Buffer.byteLength(fixture.output),
          ),
        };
      } else if (config) {
        const name = `osk-eval-${randomUUID()}`;
        const prompt = `${scenario.prompt}\n\nTask files: ${Object.keys(scenario.files).sort().join(', ') || '(none)'}.${variant === 'assisted' ? `\nUse the complete workflow at ${getPlatform(platform).directory}/${skill.slug}/SKILL.md for this task.` : ''}`;
        const env: NodeJS.ProcessEnv = {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
        };
        for (const key of config.credentialEnv) env[key] = process.env[key];
        const processResult = await runBoundedProcess(
          config.engine,
          containerArguments(config, workspace, name, prompt),
          {
            cwd: workspace,
            env,
            limits: {
              ...limits,
              timeoutMs: Math.max(1, Math.min(limits.timeoutMs, remaining)),
            },
            guard: () => guardWorkspace(workspace, limits),
          },
        );
        // Remove the named container even if the client timed out; no unrelated names are used.
        const cleanup = await runBoundedProcess(
          config.engine,
          ['rm', '--force', name],
          {
            cwd: workspace,
            env: { PATH: process.env.PATH, HOME: process.env.HOME },
            limits: { timeoutMs: 5000, maxOutputBytes: 4096 },
          },
        );
        result = {
          ...failed(
            processResult.status,
            processResult.error?.code ?? 'process-error',
            redact(processResult.error?.message ?? ''),
          ),
          stdout: redact(processResult.stdout),
          stderr: redact(processResult.stderr),
          exitCode: processResult.exitCode,
          error: processResult.error
            ? {
                ...processResult.error,
                message: redact(processResult.error.message).slice(0, 2048),
              }
            : null,
        };
        if (cleanup.status !== 'completed') {
          result.status = 'error';
          result.error = {
            code: 'container-cleanup',
            message:
              'Container cleanup failed; inspect the configured engine manually',
          };
        }
        if (result.status === 'completed') {
          await guardWorkspace(workspace, limits);
          const parsed = extractAgentOutput(platform, result.stdout);
          result.output = parsed.output;
          result.modelReported = parsed.modelReported;
          result.files = await observations(
            workspace,
            scenario,
            Math.max(
              0,
              limits.maxOutputBytes -
                Buffer.byteLength(result.stdout) -
                Buffer.byteLength(result.stderr),
            ),
          );
        }
      }
      if (result.status === 'completed') {
        result.files = Object.fromEntries(
          Object.entries(result.files).map(([path, content]) => [
            path,
            redact(content),
          ]),
        );
        Object.assign(result, scoreEvaluation(scenario, result));
      }
    } catch (error) {
      result = {
        ...result,
        status: 'error',
        score: null,
        assertions: [],
        error: {
          code: 'execution-error',
          message: redact(
            error instanceof Error ? error.message : 'Unknown evaluation error',
          ).slice(0, 2048),
        },
      };
    } finally {
      result.runtimeMs = Math.round((performance.now() - began) * 100) / 100;
    }
    return result;
  }
  try {
    for (const scenario of suite.scenarios) {
      const baseline = await arm(scenario, 'baseline'),
        assisted = await arm(scenario, 'assisted');
      cases.push({
        id: scenario.id,
        baseline,
        assisted,
        delta:
          baseline.score === null || assisted.score === null
            ? null
            : Math.round((assisted.score - baseline.score) * 100) / 100,
      });
    }
    const configuration = evaluationConfiguration({
      runnerVersion: EVALUATOR_VERSION,
      mode,
      platform,
      engineVersion: engineVersion === null ? null : redact(engineVersion),
      modelRequested: config?.model ?? null,
      image: config?.image ?? null,
      network: config?.network ?? false,
      credentialNames: config?.credentialEnv ?? [],
      limits,
    });
    const report = evaluationReportSchema.parse({
      schemaVersion: 1,
      kind: 'skill-evaluation',
      ...configuration,
      suite,
      suiteDigest: evaluationDigest(suite),
      skillDigest: packageDigest(skill.files),
      configurationDigest: evaluationDigest(configuration),
      environment: { node: process.version, os: process.platform },
      startedAt,
      completedAt: new Date().toISOString(),
      runtimeMs: Math.round((performance.now() - start) * 100) / 100,
      cases,
      summary: evaluationSummary(cases),
    });
    const issues = reproduceEvaluation(report);
    if (issues.length)
      throw new Error(
        `Internal report consistency failure: ${issues.join('; ')}`,
      );
    return report;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
