import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  evaluationReportSchema,
  type DiscoverySkill,
  type EvaluationReport,
  type EvaluationSummary,
} from '@uas/skill-schema';
import {
  canonicalJson,
  evaluationConfiguration,
  evaluationSummary,
  reproduceEvaluation,
} from '@uas/skill-validator';
import { packageDigest } from './trust';
export interface EvaluationArtifact {
  reportPath: string;
  reportDigest: string;
  report: EvaluationReport;
}
export async function readEvaluationReports(
  directory: string,
): Promise<EvaluationArtifact[]> {
  const path = resolve(directory);
  let actual: string;
  try {
    actual = await realpath(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  if (actual !== path)
    throw new Error(
      `Evaluation report directory must not contain symlink aliases: ${path}`,
    );
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error(`Expected ordinary report directory: ${path}`);
  const names = (await readdir(path)).sort();
  if (names.length > 50)
    throw new Error('Too many evaluation report artifacts');
  const results: EvaluationArtifact[] = [];
  let bytes = 0;
  for (const name of names) {
    if (name === 'README.md' || name === '.gitkeep') continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(name))
      throw new Error(`Invalid evaluation report filename: ${name}`);
    const file = join(path, name),
      stat = await lstat(file);
    bytes += stat.size;
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1 ||
      stat.size > 4194304 ||
      bytes > 16777216
    )
      throw new Error(`Unsafe or oversized evaluation report: ${file}`);
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(
      await readFile(file),
    );
    try {
      results.push({
        reportPath: `evaluations/reports/${name}`,
        reportDigest: createHash('sha256').update(raw).digest('hex'),
        report: evaluationReportSchema.parse(JSON.parse(raw)),
      });
    } catch (error) {
      throw new Error(
        `Invalid evaluation report ${file}: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
        { cause: error },
      );
    }
  }
  return results;
}
export function assessEvaluationArtifact(
  artifact: EvaluationArtifact,
  skill: DiscoverySkill,
): EvaluationSummary {
  const report = artifact.report,
    issues = reproduceEvaluation(report);
  const suiteDigest = createHash('sha256')
    .update(canonicalJson(report.suite))
    .digest('hex');
  if (suiteDigest !== report.suiteDigest)
    issues.push('Suite definition does not match its digest');
  const configurationDigest = createHash('sha256')
    .update(canonicalJson(evaluationConfiguration(report)))
    .digest('hex');
  if (configurationDigest !== report.configurationDigest)
    issues.push('Execution configuration does not match its digest');
  if (report.suite.skillId !== skill.id)
    issues.push('Evaluation targets another skill');
  const stale = report.skillDigest !== packageDigest(skill.files);
  const verification = issues.length
    ? 'invalid'
    : stale
      ? 'stale'
      : 'reproduced';
  if (stale) issues.push('Tested skill package has changed since evaluation');
  return {
    reportPath: artifact.reportPath,
    reportDigest: artifact.reportDigest,
    suiteId: report.suite.id,
    mode: report.mode,
    platform: report.platform,
    verification,
    baselineScore:
      verification === 'reproduced' ? report.summary.baselineScore : null,
    assistedScore:
      verification === 'reproduced' ? report.summary.assistedScore : null,
    delta: verification === 'reproduced' ? report.summary.delta : null,
    completedAt: report.completedAt,
    completedCases: evaluationSummary(report.cases).completedCases,
    totalCases: report.suite.scenarios.length,
    modelRequested: report.modelRequested,
    issues,
  };
}
