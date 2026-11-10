import { appendFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizedInstructionBody } from './founding-review';
import { inspectSkills } from '../packages/catalog-indexer/src/index';
import { submissionRequestSchema } from '../packages/skill-schema/src/index';
import { publicationDigest } from '../packages/catalog-indexer/src/index';
import type { Diagnostic } from '../packages/skill-validator/src/index';

export async function checkContributions(root: string) {
  const inspected = await inspectSkills(join(root, 'skills'), 'catalog');
  const errors: Diagnostic[] = [...inspected.diagnostics];
  let pending: Awaited<ReturnType<typeof inspectSkills>> = {
    results: [],
    diagnostics: [],
  };
  try {
    await lstat(join(root, 'submissions'));
    pending = await inspectSkills(join(root, 'submissions'), 'publication');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  errors.push(...pending.diagnostics);
  for (const { id, result } of pending.results) {
    if (!result.skill) continue;
    const path = `submissions/${id}/submission.json`;
    try {
      const request = submissionRequestSchema.parse(
        JSON.parse(result.skill.files['submission.json'] ?? 'null'),
      );
      if (result.skill.status !== 'draft')
        throw new Error(
          'Submissions must remain draft; contributors cannot publish through metadata',
        );
      const original = inspected.results.find((item) => item.id === id)?.result
        .skill;
      if (
        request.operation === 'new' &&
        inspected.results.some(
          (item) =>
            item.id === id || item.id.split('/')[1] === result.skill!.slug,
        )
      )
        throw new Error(
          'Duplicate identifier/slug: use an update proposal for the existing skill',
        );
      if (
        request.operation === 'update' &&
        (!original ||
          request.basePackageDigest !== publicationDigest(original.files))
      )
        throw new Error(
          'Update base is missing or stale; refresh the source package and re-review the changes',
        );
    } catch (error) {
      errors.push({
        path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const fingerprints = new Map<string, string>();
  for (const { id, result } of inspected.results) {
    if (!result.skill) continue;
    // Existing parser/validator supplies the body. This is exact normalized-copy
    // detection, not a claim of semantic plagiarism or AI-content detection.
    const fingerprint = normalizedInstructionBody(result.skill.body);
    const previous = fingerprints.get(fingerprint);
    if (previous)
      errors.push({
        path: `skills/${id}/SKILL.md`,
        category: 'duplicate',
        message: `Duplicate instruction body also appears in skills/${previous}/SKILL.md. Reuse that skill or explain a distinct workflow.`,
      });
    else fingerprints.set(fingerprint, id);
  }
  for (const { id, result } of pending.results) {
    if (!result.skill) continue;
    const fingerprint = normalizedInstructionBody(result.skill.body);
    const previous = fingerprints.get(fingerprint);
    if (previous && previous !== id)
      errors.push({
        path: `submissions/${id}/SKILL.md`,
        message: `Duplicate instruction body matches ${previous}; reuse the original workflow`,
      });
    else fingerprints.set(fingerprint, id);
  }
  return {
    pending: pending.results.length,
    valid: errors.length === 0,
    packages: inspected.results.length,
    errors,
    warnings: [...inspected.results, ...pending.results].flatMap(
      ({ result }) => result.warnings,
    ),
    quality: [...inspected.results, ...pending.results].map(
      ({ id, result }) => ({
        id,
        score: result.quality.score,
        blocked: result.quality.blocked,
      }),
    ),
  };
}
export const annotationEscape = (value: string) =>
  value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
const markdownEscape = (value: string) =>
  value.replace(/[&<>`|\r\n]/g, (character) => `&#${character.charCodeAt(0)};`);
export function contributionSummary(
  report: Awaited<ReturnType<typeof checkContributions>>,
) {
  return `## Skill contribution checks\n\n${report.valid ? 'PASS' : 'FAIL'}: ${report.packages} source packages and ${report.pending} pending proposals inspected with the existing schema, package-safety and reference validator.\n\n${report.errors.map((error) => `- ${markdownEscape(error.path)}: ${markdownEscape(error.message)}`).join('\n') || 'No invalid packages or normalized duplicate bodies found.'}\n\n${report.warnings.length} advisory warnings. Structural quality and fixture replay are not professional review or model-performance evidence.\n\nReproduce: pnpm contributions:check. Fix the named files, run pnpm skills:index, then pnpm validate:all. See CONTRIBUTING.md.\n`;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  try {
    const report = await checkContributions(root);
    const output = join(root, '.open-skill-kit');
    await mkdir(output, { recursive: true });
    await writeFile(
      join(output, 'contribution-report.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(contributionSummary(report));
    if (process.env.GITHUB_ACTIONS === 'true') {
      for (const error of report.errors)
        console.log(
          `::error::${annotationEscape(`${error.path}: ${error.message}`)}`,
        );
      if (process.env.GITHUB_STEP_SUMMARY)
        await appendFile(
          process.env.GITHUB_STEP_SUMMARY,
          contributionSummary(report),
        );
    }
    if (!report.valid) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
