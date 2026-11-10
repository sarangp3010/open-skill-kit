import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { readSkillFiles } from '@uas/catalog-indexer';
import { validateSkill } from '@uas/skill-validator';
import { evaluationSuiteSchema } from '@uas/skill-schema';
import { assertSkillId, getPlatform } from '@uas/platform-adapters';
import { directoryPath } from '@uas/skill-installer';
import {
  executionAdapters,
  readEvaluationJson,
  runEvaluation,
  writeEvaluationReport,
} from '@uas/skill-evaluator';
import type { CliOptions } from './platform-cli';

export async function runEvaluationCommand(
  args: string[],
  options: CliOptions,
) {
  if (args[0] === 'adapters') {
    if (args.length !== 1)
      throw new Error('evaluate adapters takes no options');
    options.log(
      `fixture: deterministic offline replay; no agent/model performance claim.\n${executionAdapters.map((adapter) => `${adapter.id}: opt-in configured container only\n  ${adapter.docs}`).join('\n')}`,
    );
    return;
  }
  const flags = new Map<string, string | boolean>();
  const values = [
    '--suite',
    '--source',
    '--output',
    '--mode',
    '--platform',
    '--agent-config',
  ];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (flags.has(arg)) throw new Error(`Duplicate evaluation option: ${arg}`);
    if (values.includes(arg)) {
      const value = args[++index];
      if (!value || value.startsWith('-'))
        throw new Error(`${arg} requires a value`);
      flags.set(arg, value);
    } else if (
      ['--allow-agent', '--fail-on-regression', '--fail-on-assertion'].includes(
        arg,
      )
    )
      flags.set(arg, true);
    else throw new Error(`Unknown evaluation option: ${arg}`);
  }
  if (!flags.has('--suite') || !flags.has('--source'))
    throw new Error(
      'evaluate requires --suite <json> and --source <local-skills-root>',
    );
  const mode = String(flags.get('--mode') ?? 'fixture');
  if (mode !== 'fixture' && mode !== 'agent')
    throw new Error('Evaluation mode must be fixture or agent');
  if (
    mode === 'fixture' &&
    (flags.has('--platform') ||
      flags.has('--agent-config') ||
      flags.has('--allow-agent'))
  )
    throw new Error(
      'Real-agent options require --mode agent; fixture replay never runs an agent',
    );
  const suite = evaluationSuiteSchema.parse(
    await readEvaluationJson(
      resolve(options.cwd, String(flags.get('--suite'))),
      1048576,
    ),
  );
  const source = resolve(options.cwd, String(flags.get('--source')));
  await directoryPath(source, false);
  assertSkillId(suite.skillId);
  const [sector, slug] = suite.skillId.split('/');
  await directoryPath(join(source, sector), false);
  const files = await readSkillFiles(join(source, sector, slug));
  const result = validateSkill(files, suite.skillId, { profile: 'catalog' });
  if (!result.valid || !result.skill)
    throw new Error(`Invalid evaluation source: ${result.errors.join('; ')}`);
  const platform =
    mode === 'agent'
      ? getPlatform(String(flags.get('--platform') ?? '')).id
      : undefined;
  const agentConfig = flags.has('--agent-config')
    ? await readEvaluationJson(
        resolve(options.cwd, String(flags.get('--agent-config'))),
        65536,
      )
    : undefined;
  const report = await runEvaluation({
    suite,
    skill: result.skill,
    mode,
    platform,
    agentConfig,
    allowAgent: flags.has('--allow-agent'),
  });
  const output = resolve(
    options.cwd,
    String(
      flags.get('--output') ??
        join(
          '.open-skill-kit',
          'evaluations',
          `${suite.id}-${randomUUID()}.json`,
        ),
    ),
  );
  await writeEvaluationReport(output, report);
  options.log(
    `${mode === 'fixture' ? 'Fixture replay (not agent performance)' : 'Real-agent evaluation'}\nReport: ${output}\nComplete comparisons: ${report.summary.completedCases}/${report.summary.totalCases}\nBaseline: ${report.summary.baselineScore ?? 'unscored'}; assisted: ${report.summary.assistedScore ?? 'unscored'}; difference: ${report.summary.delta ?? 'unscored'}`,
  );
  if (report.summary.completedCases !== report.summary.totalCases)
    throw new Error(
      'Evaluation incomplete; inspect recorded errors. No missing results were inferred.',
    );
  if (
    flags.has('--fail-on-regression') &&
    report.summary.delta !== null &&
    report.summary.delta < 0
  )
    throw new Error('Evaluation regression detected; report saved.');
  if (
    flags.has('--fail-on-assertion') &&
    report.cases.some(
      (item) =>
        item.baseline.assertions.some((assertion) => !assertion.passed) ||
        item.assisted.assertions.some((assertion) => !assertion.passed),
    )
  )
    throw new Error(
      'Evaluation assertions failed; the complete report was saved.',
    );
}
