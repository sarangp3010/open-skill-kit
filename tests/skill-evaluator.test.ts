import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  agentEvaluationConfigSchema,
  evaluationReportSchema,
  evaluationSuiteSchema,
  type EvaluationSuite,
  type DiscoverySkill,
} from '../packages/skill-schema/src/index';
import {
  extractAgentOutput,
  reproduceEvaluation,
  scoreEvaluation,
  validateSkill,
} from '../packages/skill-validator/src/index';
import {
  assessEvaluationArtifact,
  generateCatalog,
  packageDigest,
  readEvaluationReports,
  readSkillFiles,
} from '../packages/catalog-indexer/src/index';
import {
  readEvaluationJson,
  runEvaluation,
  writeEvaluationReport,
} from '../packages/skill-evaluator/src/index';
import {
  containerArguments,
  getExecutionAdapter,
  runBoundedProcess,
} from '../packages/skill-evaluator/src/execution';
import { runCli } from '../packages/cli/src/index';

let temp: string, skill: DiscoverySkill, suite: EvaluationSuite;
beforeEach(async () => {
  temp = await mkdtemp(join(await realpath(tmpdir()), 'osk-evaluator-test-'));
  skill = validateSkill(
    await readSkillFiles(
      resolve('tests/fixtures/valid/education/example-skill'),
    ),
    'education/example-skill',
    { profile: 'catalog' },
  ).skill!;
  suite = evaluationSuiteSchema.parse({
    schemaVersion: 1,
    id: 'replay-test',
    skillId: skill.id,
    description: 'Synthetic harness test, not an agent evaluation.',
    scenarios: [
      {
        id: 'summarize',
        prompt: 'Summarize the supplied fraction notes.',
        files: { 'input/notes.txt': 'One half is part of a whole.' },
        assertions: [
          { id: 'answer', type: 'text-contains', value: 'fraction', weight: 2 },
          {
            id: 'saved',
            type: 'file-equals',
            path: 'output/answer.txt',
            value: 'A fraction describes part of a whole.',
            weight: 1,
          },
        ],
        fixtures: {
          baseline: {
            output: 'A fraction describes part of a whole.',
            files: {
              'output/answer.txt': 'A fraction describes part of a whole.',
            },
          },
          assisted: {
            output: 'A fraction describes part of a whole.',
            files: {
              'output/answer.txt': 'A fraction describes part of a whole.',
            },
          },
        },
      },
    ],
  });
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(temp, { recursive: true, force: true });
});
const run = () => runEvaluation({ suite, skill });
function artifact(report: Awaited<ReturnType<typeof run>>) {
  return {
    report,
    reportPath: 'evaluations/reports/test.json',
    reportDigest: createHash('sha256')
      .update(JSON.stringify(report))
      .digest('hex'),
  };
}
function config() {
  return agentEvaluationConfigSchema.parse({
    schemaVersion: 1,
    enabled: true,
    platform: 'codex',
    engine: process.execPath,
    image: `local/test@sha256:${'a'.repeat(64)}`,
    model: 'test-only-model',
    credentialEnv: [],
  });
}

describe('objective offline evaluations', () => {
  it('executes reproducible fixture assertions, without assigning a real platform or inventing lift', async () => {
    const a = await run(),
      b = await run();
    expect(a.summary).toEqual(b.summary);
    expect(a.suiteDigest).toBe(b.suiteDigest);
    expect(a.skillDigest).toBe(packageDigest(skill.files));
    expect(a).toMatchObject({
      mode: 'fixture',
      platform: 'fixture',
      modelRequested: null,
      image: null,
      network: false,
      summary: {
        completedCases: 1,
        baselineScore: 100,
        assistedScore: 100,
        delta: 0,
      },
    });
    expect(a.cases[0].assisted.files['output/answer.txt']).toBe(
      'A fraction describes part of a whole.',
    );
    expect(a.cases[0].assisted.runtimeMs).toBeGreaterThanOrEqual(0);
    expect(reproduceEvaluation(a)).toEqual([]);
    expect(evaluationReportSchema.safeParse(a).success).toBe(true);
  });
  it('records genuine failing assertions and a negative difference without manufacturing success', async () => {
    suite.scenarios[0].fixtures!.assisted = {
      output: 'Wrong answer',
      files: {},
    };
    const report = await run();
    expect(report.cases[0].assisted.assertions[0].passed).toBe(false);
    expect(report.summary).toMatchObject({
      baselineScore: 100,
      assistedScore: 0,
      delta: -100,
    });
    expect(reproduceEvaluation(report)).toEqual([]);
  });
  it('does not replace missing fixtures with synthetic agent results', async () => {
    delete suite.scenarios[0].fixtures;
    const report = await run();
    expect(report.summary.completedCases).toBe(0);
    expect(report.summary.assistedScore).toBeNull();
    expect(report.cases[0].assisted).toMatchObject({
      status: 'blocked',
      score: null,
      assertions: [],
    });
  });
  it('bounds fixture output and workspace resources without scoring the failed execution', async () => {
    suite.scenarios[0].fixtures!.baseline.output = 'x'.repeat(1000);
    const report = await runEvaluation({
      suite,
      skill,
      limits: { maxOutputBytes: 128 },
    });
    expect(report.cases[0].baseline.status).toBe('limit-exceeded');
    expect(report.summary.baselineScore).toBeNull();
    const small = await runEvaluation({
      suite,
      skill,
      limits: { maxWorkspaceBytes: 1024 },
    });
    expect(small.summary.completedCases).toBe(0);
    expect(small.cases[0].assisted.score).toBeNull();
  });
  it('records suite time exhaustion explicitly', async () => {
    const clock = vi.spyOn(performance, 'now');
    let current = 0;
    clock.mockImplementation(() => (current += 1000));
    const report = await runEvaluation({
      suite,
      skill,
      limits: { suiteTimeoutMs: 50 },
    });
    expect(report.cases[0].baseline.status).toBe('timeout');
    expect(report.summary.delta).toBeNull();
  });
  it('cleans every temporary execution directory and leaves source packages unchanged', async () => {
    const before = JSON.stringify(skill.files);
    const directoriesBefore = await readdir(await realpath(tmpdir()));
    await run();
    expect(JSON.stringify(skill.files)).toBe(before);
    const directoriesAfter = await readdir(await realpath(tmpdir()));
    expect(
      directoriesAfter.filter((name) => name.startsWith('osk-evaluation-')),
    ).toEqual(
      directoriesBefore.filter((name) => name.startsWith('osk-evaluation-')),
    );
  });
  it('uses assertion weights and strict JSON own-property lookups without regex or code evaluation', () => {
    const scenario = evaluationSuiteSchema.parse({
      ...suite,
      scenarios: [
        {
          ...suite.scenarios[0],
          assertions: [
            {
              id: 'json',
              type: 'json-field-equals',
              path: ['ok'],
              value: true,
              weight: 3,
            },
            {
              id: 'excluded',
              type: 'text-excludes',
              value: 'unsafe',
              weight: 1,
            },
          ],
        },
      ],
    }).scenarios[0];
    expect(
      scoreEvaluation(scenario, { output: '{"ok":true}', files: {} }).score,
    ).toBe(100);
    expect(
      scoreEvaluation(scenario, { output: 'not JSON', files: {} }).score,
    ).toBe(25);
    expect(
      evaluationSuiteSchema.safeParse({
        ...suite,
        scenarios: [
          {
            ...scenario,
            assertions: [
              {
                id: 'bad',
                type: 'json-field-equals',
                path: ['__proto__'],
                value: 'x',
                weight: 1,
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
  it.each(['../escape', '/tmp/escape', '..\\escape', '%2e%2e/escape'])(
    'rejects unsafe scenario paths %s',
    (path) => {
      expect(
        evaluationSuiteSchema.safeParse({
          ...suite,
          scenarios: [{ ...suite.scenarios[0], files: { [path]: 'unsafe' } }],
        }).success,
      ).toBe(false);
    },
  );
  it('reserves runner context paths rather than accepting fixture overwrites', () => {
    expect(
      evaluationSuiteSchema.safeParse({
        ...suite,
        scenarios: [
          {
            ...suite.scenarios[0],
            files: { 'skill-context/example-skill/SKILL.md': 'replacement' },
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('rejects duplicate IDs and untrusted executable assertions', () => {
    const scenario = suite.scenarios[0];
    expect(
      evaluationSuiteSchema.safeParse({
        ...suite,
        scenarios: [scenario, scenario],
      }).success,
    ).toBe(false);
    expect(
      evaluationSuiteSchema.safeParse({
        ...suite,
        scenarios: [
          {
            ...scenario,
            assertions: [
              {
                id: 'execute',
                type: 'shell',
                command: 'touch /tmp/unsafe',
                weight: 1,
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('execution adapters and isolation gates', () => {
  it.each(['codex', 'claude-code', 'cursor', 'gemini-cli'] as const)(
    '%s remains blocked without explicit opt-in and never falls back to a fixture',
    async (platform) => {
      const report = await runEvaluation({
        suite,
        skill,
        mode: 'agent',
        platform,
      });
      expect(report.platform).toBe(platform);
      expect(report.cases[0].baseline.status).toBe('blocked');
      expect(report.summary.assistedScore).toBeNull();
      expect(report.mode).toBe('agent');
    },
  );
  it('requires valid configuration, matching platform and an ordinary executable', async () => {
    const missing = await runEvaluation({
      suite,
      skill,
      mode: 'agent',
      platform: 'codex',
      allowAgent: true,
    });
    expect(missing.cases[0].baseline.error?.message).toContain('configured');
    const mismatch = await runEvaluation({
      suite,
      skill,
      mode: 'agent',
      platform: 'cursor',
      allowAgent: true,
      agentConfig: config(),
    });
    expect(mismatch.cases[0].baseline.error?.message).toContain('match');
    const absent = await runEvaluation({
      suite,
      skill,
      mode: 'agent',
      platform: 'codex',
      allowAgent: true,
      agentConfig: { ...config(), engine: join(temp, 'missing') },
    });
    expect(absent.cases[0].baseline.status).toBe('blocked');
  });
  it('blocks missing or platform-inappropriate credentials before running any engine', async () => {
    vi.stubEnv('CODEX_API_KEY', '');
    for (const credential of ['CODEX_API_KEY', 'ANTHROPIC_API_KEY']) {
      const report = await runEvaluation({
        suite,
        skill,
        mode: 'agent',
        platform: 'codex',
        allowAgent: true,
        agentConfig: { ...config(), credentialEnv: [credential] },
      });
      expect(report.cases[0].baseline.status).toBe('blocked');
      expect(report.cases[0].baseline.error?.message).toMatch(
        /absent|not allowed/,
      );
    }
  });
  it('pins images and applies container resource/isolation settings without secret values or shell interpolation', () => {
    const policy = config();
    const args = containerArguments(
      policy,
      temp,
      'osk-test',
      'Prompt text; $(not-a-shell)',
    );
    for (const flag of [
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--pids-limit',
      '--memory',
      '--cpus',
      '--pull=never',
    ])
      expect(args).toContain(flag);
    expect(args).toContain('none');
    expect(args).toContain(policy.image);
    expect(args).not.toContain('--privileged');
    expect(args).not.toContain('--force');
    expect(
      agentEvaluationConfigSchema.safeParse({
        ...policy,
        image: 'unversioned:latest',
      }).success,
    ).toBe(false);
    expect(() => getExecutionAdapter('unsupported')).toThrow('Unsupported');
  });
  it('builds only documented noninteractive command shapes for all four platforms', () => {
    expect(getExecutionAdapter('codex').command('task', 'model')).toContain(
      '--json',
    );
    for (const platform of ['claude-code', 'cursor', 'gemini-cli'])
      expect(getExecutionAdapter(platform).command('task', 'model')).toContain(
        '--output-format',
      );
  });
  it('captures nonzero process exits and caps output without scoring success', async () => {
    const fail = await runBoundedProcess(
      process.execPath,
      ['-e', 'process.stderr.write("test failure");process.exit(3)'],
      { cwd: temp, env: {}, limits: { timeoutMs: 1000, maxOutputBytes: 1024 } },
    );
    expect(fail).toMatchObject({ status: 'error', exitCode: 3 });
    expect(fail.stderr).toBe('test failure');
    const overflow = await runBoundedProcess(
      process.execPath,
      [
        '-e',
        'process.stdout.write("x".repeat(100000));setInterval(()=>{},1000)',
      ],
      { cwd: temp, env: {}, limits: { timeoutMs: 1000, maxOutputBytes: 128 } },
    );
    expect(overflow.status).toBe('limit-exceeded');
    expect(Buffer.byteLength(overflow.stdout)).toBeLessThanOrEqual(128);
  });
  it('terminates a hung process at the configured timeout', async () => {
    const start = Date.now();
    const result = await runBoundedProcess(
      process.execPath,
      ['-e', 'setInterval(()=>{},1000)'],
      { cwd: temp, env: {}, limits: { timeoutMs: 100, maxOutputBytes: 1024 } },
    );
    expect(result.status).toBe('timeout');
    expect(Date.now() - start).toBeLessThan(3000);
  });
  // A local process double exercises orchestration only; it is never published as agent evidence.
  async function engineDouble(
    behavior:
      | 'complete'
      | 'hang'
      | 'malformed'
      | 'symlink'
      | 'cleanup-error'
      | 'secret',
  ) {
    const engine = join(temp, 'docker-test-double');
    const log = join(temp, 'calls.jsonl');
    await writeFile(
      engine,
      `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if(args[0] === '--version') { console.log('Docker version 28.0.0, synthetic test double'); process.exit(0); }
const mount = args.find(a => a.startsWith('type=bind,source='));
const root = mount?.slice('type=bind,source='.length).split(',target=')[0];
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({args, root, assisted: root ? fs.existsSync(path.join(root,'.agents/skills/example-skill/SKILL.md')) : null})+'\\n');
if(args[0] === 'rm') process.exit(${behavior === 'cleanup-error' ? 1 : 0});
${
  behavior === 'hang'
    ? 'setInterval(()=>{},1000);'
    : behavior === 'malformed'
      ? 'console.log("not-json");'
      : `fs.mkdirSync(path.join(root,'output'), {recursive:true});
fs.writeFileSync(path.join(root,'output/answer.txt'),'A fraction describes part of a whole.');
console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'A fraction describes part of a whole.'}}));
console.log(JSON.stringify({type:'turn.completed'}));`
}
${behavior === 'secret' ? `fs.writeFileSync(path.join(root,'output/answer.txt'),process.env.CODEX_API_KEY);process.stderr.write(process.env.CODEX_API_KEY);` : ''}
${behavior === 'symlink' ? "fs.symlinkSync('/etc/passwd',path.join(root,'unsafe-link'));" : ''}
`,
    );
    await chmod(engine, 0o700);
    return { engine, log };
  }
  it('runs both arms in separate workspaces, preserves skill context and removes each container', async () => {
    const { engine, log } = await engineDouble('complete');
    const report = await runEvaluation({
      suite,
      skill,
      mode: 'agent',
      platform: 'codex',
      allowAgent: true,
      agentConfig: { ...config(), engine },
    });
    expect(report.summary).toMatchObject({
      completedCases: 1,
      baselineScore: 100,
      assistedScore: 100,
      delta: 0,
    });
    expect(report.engineVersion).toContain('synthetic test double');
    expect(report.cases[0].assisted.platformVersion).toBeNull();
    expect(reproduceEvaluation(report)).toEqual([]);
    const calls = (await readFile(log, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const runs = calls.filter((call) => call.args[0] === 'run');
    expect(runs.map((call) => call.assisted)).toEqual([false, true]);
    expect(runs[0].root).not.toBe(runs[1].root);
    expect(calls.filter((call) => call.args[0] === 'rm')).toHaveLength(2);
    for (const call of runs) await expect(readdir(call.root)).rejects.toThrow();
  });
  it.each(['hang', 'malformed', 'symlink', 'cleanup-error'] as const)(
    'leaves %s execution unscored and performs container cleanup',
    async (behavior) => {
      const { engine, log } = await engineDouble(behavior);
      const report = await runEvaluation({
        suite,
        skill,
        mode: 'agent',
        platform: 'codex',
        allowAgent: true,
        agentConfig: { ...config(), engine },
        limits: { timeoutMs: 100 },
      });
      expect(report.summary.assistedScore).toBeNull();
      expect(report.cases[0].assisted.error).not.toBeNull();
      const calls = (await readFile(log, 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      expect(calls.filter((call) => call.args[0] === 'rm')).toHaveLength(2);
    },
  );
  it('redacts configured credential values in observed files and process output', async () => {
    vi.stubEnv('CODEX_API_KEY', 'synthetic-test-secret-value');
    const { engine } = await engineDouble('secret');
    const report = await runEvaluation({
      suite,
      skill,
      mode: 'agent',
      platform: 'codex',
      allowAgent: true,
      agentConfig: { ...config(), engine, credentialEnv: ['CODEX_API_KEY'] },
    });
    expect(report.summary.completedCases).toBe(1);
    expect(JSON.stringify(report)).not.toContain('synthetic-test-secret-value');
    expect(report.cases[0].assisted.files['output/answer.txt']).toBe(
      '[REDACTED]',
    );
    expect(
      report.cases[0].assisted.assertions.find((item) => item.id === 'saved')
        ?.passed,
    ).toBe(false);
  });
  it('blocks a generic interpreter instead of running it as a container engine', async () => {
    const report = await runEvaluation({
      suite,
      skill,
      mode: 'agent',
      platform: 'codex',
      allowAgent: true,
      agentConfig: config(),
    });
    expect(report.cases[0].baseline.status).toBe('blocked');
    expect(report.cases[0].baseline.error?.message).toContain('Docker CLI');
  });
  it.each(['claude-code', 'cursor', 'gemini-cli'])(
    'parses documented %s response envelopes without treating them as real evaluation evidence',
    (platform) => {
      const payload =
        platform === 'gemini-cli'
          ? { response: 'captured response' }
          : { result: 'captured response', is_error: false };
      expect(extractAgentOutput(platform, JSON.stringify(payload))).toEqual({
        output: 'captured response',
        modelReported: null,
      });
    },
  );
  it('rejects malformed/error agent envelopes instead of accepting a zero exit alone', () => {
    expect(() =>
      extractAgentOutput('codex', '{"type":"turn.failed"}'),
    ).toThrow();
    expect(() =>
      extractAgentOutput('claude-code', '{"is_error":true,"result":"failed"}'),
    ).toThrow();
    expect(() =>
      extractAgentOutput('gemini-cli', '{"error":{"message":"missing auth"}}'),
    ).toThrow();
    expect(() => extractAgentOutput('cursor', '{}')).toThrow();
    expect(
      extractAgentOutput(
        'codex',
        '{"type":"item.completed","item":{"type":"agent_message","text":"observed"}}\n{"type":"turn.completed"}',
      ).output,
    ).toBe('observed');
    expect(
      extractAgentOutput(
        'gemini-cli',
        '{"response":"observed","model":"reported-model"}',
      ),
    ).toEqual({ output: 'observed', modelReported: 'reported-model' });
  });
});

describe('report verification and existing CLI/catalog integration', () => {
  it('recomputes report evidence and marks altered packages stale, not newly tested', async () => {
    const report = await run();
    expect(assessEvaluationArtifact(artifact(report), skill)).toMatchObject({
      verification: 'reproduced',
      mode: 'fixture',
      platform: 'fixture',
      delta: 0,
    });
    const changed = {
      ...skill,
      files: { ...skill.files, 'notes.txt': 'source changed' },
    };
    expect(assessEvaluationArtifact(artifact(report), changed)).toMatchObject({
      verification: 'stale',
      assistedScore: null,
    });
  });
  it.each([
    'score',
    'output',
    'assertions',
    'suite',
    'delta',
    'configuration',
  ] as const)('does not verify tampered %s', async (kind) => {
    const report = await run();
    if (kind === 'configuration') report.limits.cpus = 0.5;
    if (kind === 'score') report.cases[0].assisted.score = 0;
    if (kind === 'output') report.cases[0].assisted.output = 'fabricated';
    if (kind === 'assertions')
      report.cases[0].assisted.assertions[0].earned = 0;
    if (kind === 'suite') report.suite.description += 'changed';
    if (kind === 'delta') report.summary.delta = 100;
    expect(assessEvaluationArtifact(artifact(report), skill)).toMatchObject({
      verification: 'invalid',
      assistedScore: null,
    });
  });
  it('writes new reports exclusively and refuses symlinks/oversized or malformed imported artifacts', async () => {
    const report = await run();
    const directory = join(temp, 'reports');
    await mkdir(directory);
    const path = join(directory, 'fixture.json');
    await writeEvaluationReport(path, report);
    await expect(writeEvaluationReport(path, report)).rejects.toThrow();
    expect(await readEvaluationJson(path)).toMatchObject({
      kind: 'skill-evaluation',
    });
    expect(await readEvaluationReports(directory)).toHaveLength(1);
    await symlink(path, join(directory, 'linked.json'));
    await expect(readEvaluationReports(directory)).rejects.toThrow('Unsafe');
  });
  it('indexes only reviewed report artifacts for the matching skill', async () => {
    const root = join(temp, 'skills');
    await cp(resolve('tests/fixtures/valid'), root, { recursive: true });
    const report = await run();
    const catalog = (
      await generateCatalog(root, [], { evaluationReports: [artifact(report)] })
    ).catalog;
    expect(catalog.skills[0].evaluations?.[0]).toMatchObject({
      verification: 'reproduced',
      platform: 'fixture',
    });
    expect(
      catalog.skills[0].compatibility?.every(
        (row) => row.testing === 'not-recorded',
      ),
    ).toBe(true);
    const wrong = structuredClone(report);
    wrong.suite.skillId = 'another/missing';
    await expect(
      generateCatalog(root, [], { evaluationReports: [artifact(wrong)] }),
    ).rejects.toThrow('unknown skill');
  });
  it('runs offline evaluation through the built-in CLI and preserves complete evidence on assertion failures', async () => {
    const root = join(temp, 'skills');
    await cp(resolve('tests/fixtures/valid'), root, { recursive: true });
    const suitePath = join(temp, 'suite.json'),
      reportPath = join(temp, 'report.json');
    await writeFile(suitePath, JSON.stringify(suite));
    const logs: string[] = [];
    const options = {
      cwd: temp,
      dataRoot: 'unused',
      version: 'test',
      log: (text: string) => logs.push(text),
    };
    await runCli(
      [
        'evaluate',
        '--suite',
        suitePath,
        '--source',
        root,
        '--output',
        reportPath,
      ],
      options,
    );
    expect(logs.join('\n')).toContain('not agent performance');
    expect(
      ((await readEvaluationJson(reportPath)) as { summary: { delta: number } })
        .summary.delta,
    ).toBe(0);
    suite.scenarios[0].fixtures!.assisted.output = 'wrong';
    await writeFile(suitePath, JSON.stringify(suite));
    const failedPath = join(temp, 'regression.json');
    await expect(
      runCli(
        [
          'evaluate',
          '--suite',
          suitePath,
          '--source',
          root,
          '--output',
          failedPath,
          '--fail-on-regression',
        ],
        options,
      ),
    ).rejects.toThrow('regression');
    expect(await readEvaluationJson(failedPath)).toMatchObject({
      kind: 'skill-evaluation',
    });
  });
});
