import { spawn } from 'node:child_process';
import { access, lstat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { directoryPath } from '@uas/skill-installer';
import { getPlatform, type PlatformId } from '@uas/platform-adapters';
import type {
  AgentEvaluationConfig,
  EvaluationLimits,
} from '@uas/skill-schema';

export interface ExecutionAdapter {
  id: PlatformId;
  docs: string;
  credentialNames: readonly string[];
  command(prompt: string, model: string): string[];
}
export const executionAdapters: readonly ExecutionAdapter[] = [
  {
    id: 'codex',
    docs: 'https://learn.chatgpt.com/docs/non-interactive-mode',
    credentialNames: ['CODEX_API_KEY'],
    command: (prompt, model) => [
      'codex',
      'exec',
      '--json',
      '--sandbox',
      'workspace-write',
      '--skip-git-repo-check',
      '--model',
      model,
      prompt,
    ],
  },
  {
    id: 'claude-code',
    docs: 'https://code.claude.com/docs/en/headless',
    credentialNames: ['ANTHROPIC_API_KEY'],
    command: (prompt, model) => [
      'claude',
      '-p',
      prompt,
      '--output-format',
      'json',
      '--model',
      model,
      '--permission-mode',
      'dontAsk',
      '--allowedTools',
      'Read,Edit,Write',
    ],
  },
  {
    id: 'cursor',
    docs: 'https://cursor.com/docs/cli/headless',
    credentialNames: ['CURSOR_API_KEY'],
    command: (prompt, model) => [
      'agent',
      '-p',
      prompt,
      '--output-format',
      'json',
      '--model',
      model,
    ],
  },
  {
    id: 'gemini-cli',
    docs: 'https://geminicli.com/docs/cli/headless/',
    credentialNames: ['GEMINI_API_KEY'],
    command: (prompt, model) => [
      'gemini',
      '--prompt',
      prompt,
      '--output-format',
      'json',
      '--model',
      model,
    ],
  },
];
export function getExecutionAdapter(platform: string) {
  getPlatform(platform);
  const adapter = executionAdapters.find((item) => item.id === platform);
  if (!adapter)
    throw new Error(`Noninteractive execution is unsupported for ${platform}`);
  return adapter;
}
export async function checkAgentConfig(config: AgentEvaluationConfig) {
  if (!isAbsolute(config.engine))
    throw new Error(
      'Container engine must be an absolute path to a trusted Docker executable',
    );
  await directoryPath(dirname(config.engine), false);
  const info = await lstat(config.engine);
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error('Container engine must be an ordinary executable file');
  await access(config.engine, constants.X_OK);
  const adapter = getExecutionAdapter(config.platform);
  for (const name of config.credentialEnv) {
    if (!adapter.credentialNames.includes(name))
      throw new Error(
        `Credential ${name} is not allowed for ${config.platform}`,
      );
    if (!process.env[name])
      throw new Error(`Configured credential is absent: ${name}`);
  }
  const probe = await runBoundedProcess(config.engine, ['--version'], {
    cwd: dirname(config.engine),
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
    limits: { timeoutMs: 2000, maxOutputBytes: 4096 },
  });
  if (
    probe.status !== 'completed' ||
    !/^Docker version [0-9]/.test(probe.stdout)
  )
    throw new Error(
      'Configured executable did not identify as a supported Docker CLI',
    );
  return probe.stdout.trim().slice(0, 256);
}
export function containerArguments(
  config: AgentEvaluationConfig,
  workspace: string,
  name: string,
  prompt: string,
) {
  if (/[\r\n,]/.test(workspace)) throw new Error('Unsafe workspace mount path');
  const adapter = getExecutionAdapter(config.platform),
    command = adapter.command(prompt, config.model);
  return [
    'run',
    '--name',
    name,
    '--pull=never',
    '--init',
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--user',
    `${process.getuid?.() || 65532}:${process.getgid?.() || 65532}`,
    '--memory',
    `${config.limits.memoryMiB}m`,
    '--memory-swap',
    `${config.limits.memoryMiB}m`,
    '--cpus',
    String(config.limits.cpus),
    '--pids-limit',
    String(config.limits.pids),
    '--network',
    config.network ? 'bridge' : 'none',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,size=67108864,mode=1777',
    '--tmpfs',
    '/home/evaluator:rw,nosuid,size=16777216,mode=1777',
    '--env',
    'HOME=/home/evaluator',
    '--env',
    'TMPDIR=/tmp',
    ...config.credentialEnv.flatMap((key) => ['--env', key]),
    '--mount',
    `type=bind,source=${workspace},target=/workspace`,
    '--workdir',
    '/workspace',
    '--entrypoint',
    command[0],
    config.image,
    ...command.slice(1),
  ];
}
export interface ProcessResult {
  status: 'completed' | 'error' | 'timeout' | 'limit-exceeded';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error: { code: string; message: string } | null;
}
/** Bounded process primitive; real agent callers always add the container boundary. */
export function runBoundedProcess(
  executable: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    limits: Pick<EvaluationLimits, 'timeoutMs' | 'maxOutputBytes'>;
    guard?: () => Promise<void>;
  },
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    let stdout = Buffer.alloc(0),
      stderr = Buffer.alloc(0),
      finished = false,
      polling = false;
    let failure: ProcessResult['error'] = null,
      status: ProcessResult['status'] = 'completed';
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const kill = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        /* Already exited. */
      }
    };
    const stop = (
      next: ProcessResult['status'],
      code: string,
      message: string,
    ) => {
      if (failure || finished) return;
      status = next;
      failure = { code, message };
      kill('SIGTERM');
      killTimer = setTimeout(() => kill('SIGKILL'), 200);
      killTimer.unref();
    };
    const timer = setTimeout(
      () =>
        stop('timeout', 'timeout', 'Execution exceeded the per-arm timeout'),
      options.limits.timeoutMs,
    );
    const monitor = options.guard
      ? setInterval(() => {
          if (polling || finished) return;
          polling = true;
          options.guard!()
            .catch((error) =>
              stop(
                'limit-exceeded',
                'workspace-limit',
                error instanceof Error
                  ? error.message
                  : 'Workspace limit exceeded',
              ),
            )
            .finally(() => {
              polling = false;
            });
        }, 100)
      : undefined;
    function collect(kind: 'stdout' | 'stderr', chunk: Buffer) {
      const remaining = Math.max(
        0,
        options.limits.maxOutputBytes - stdout.length - stderr.length,
      );
      const accepted = chunk.subarray(0, remaining);
      if (kind === 'stdout') stdout = Buffer.concat([stdout, accepted]);
      else stderr = Buffer.concat([stderr, accepted]);
      if (chunk.length > remaining)
        stop(
          'limit-exceeded',
          'output-limit',
          'Execution output exceeded the configured byte limit',
        );
    }
    child.stdout.on('data', (chunk) => collect('stdout', Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => collect('stderr', Buffer.from(chunk)));
    child.on('error', (error) => {
      status = 'error';
      failure = { code: 'spawn-error', message: error.message };
    });
    child.on('close', (code) => {
      finished = true;
      clearTimeout(timer);
      if (monitor) clearInterval(monitor);
      if (killTimer) clearTimeout(killTimer);
      if (!failure && code !== 0) {
        status = 'error';
        failure = {
          code: 'process-exit',
          message: `Process exited with ${code === null ? 'a signal' : code}`,
        };
      }
      resolve({
        status,
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
        exitCode: code,
        error: failure,
      });
    });
  });
}
