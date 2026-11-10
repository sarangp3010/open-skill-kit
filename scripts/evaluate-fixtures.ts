import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { readSkillFiles } from '../packages/catalog-indexer/src/index';
import { evaluationSuiteSchema } from '../packages/skill-schema/src/index';
import { validateSkill } from '../packages/skill-validator/src/index';
import {
  readEvaluationJson,
  runEvaluation,
  writeEvaluationReport,
} from '../packages/skill-evaluator/src/index';

// Fresh runs go to ignored local storage. Reviewed catalog artifacts never get overwritten.
for (const filename of (
  await readdir(resolve('evaluations/scenarios'))
).sort()) {
  if (!filename.endsWith('.json')) continue;
  const suite = evaluationSuiteSchema.parse(
    await readEvaluationJson(
      resolve('evaluations/scenarios', filename),
      1048576,
    ),
  );
  const files = await readSkillFiles(resolve('skills', suite.skillId));
  const validation = validateSkill(files, suite.skillId, {
    profile: 'catalog',
  });
  if (!validation.valid || !validation.skill)
    throw new Error(
      `Invalid evaluation source ${suite.skillId}: ${validation.errors.join('; ')}`,
    );
  const report = await runEvaluation({ suite, skill: validation.skill });
  const output = await writeEvaluationReport(
    join('.open-skill-kit/evaluations', `${suite.id}-${randomUUID()}.json`),
    report,
  );
  console.log(
    `Fixture replay only: ${suite.id}; ${report.summary.completedCases}/${report.summary.totalCases} comparisons; difference ${report.summary.delta ?? 'unscored'}. ${output}`,
  );
  if (
    report.summary.completedCases !== report.summary.totalCases ||
    report.cases.some((item) =>
      [...item.baseline.assertions, ...item.assisted.assertions].some(
        (assertion) => !assertion.passed,
      ),
    )
  )
    throw new Error(`Offline replay failed; inspect ${output}`);
}
