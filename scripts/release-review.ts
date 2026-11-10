import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateFoundingReview } from './founding-review';
import { localModeration } from './check-moderation';
import { evidenceDigest } from '../packages/catalog-indexer/src/maintainer-review';
import { directoryPath } from '../packages/skill-installer/src/filesystem';
export const ownerReviewPath = 'docs/launch/SHORTLIST_REVIEW.md';
/** Derive owner-facing summaries from the existing 42 packets; never create decisions. */
export async function ownerReleaseReview(root: string) {
  const reports = await generateFoundingReview(root, true);
  const registry = await localModeration(root);
  const shortlist = reports
    .filter((report) => report.launchRecommendation.rank !== null)
    .sort(
      (a, b) => a.launchRecommendation.rank! - b.launchRecommendation.rank!,
    );
  const migration = JSON.parse(
    await readFile(
      resolve(root, 'reviews/founding/license-migration.json'),
      'utf8',
    ),
  ) as { previousPackages: Record<string, string> };
  const sections = await Promise.all(
    shortlist.map(async (report) => {
      const path = `reviews/founding/reports/${report.skillId}.json`;
      const hash = evidenceDigest(await readFile(resolve(root, path)));
      const missing =
        report.quality?.checks.filter((check) => check.status !== 'pass') ?? [];
      const fixtures = report.evaluation.fixtureDefinitions;
      const artifacts = report.evaluation.completedArtifacts;
      return (
        `## ${report.launchRecommendation.rank}. ${report.title}\n\n` +
        `**Purpose:** ${report.usefulness.proposedTask}\n\n` +
        `**Current package:** \`${report.skillId}\` · **${report.sourceStatus}** · declared risk **${report.safety.declaredRisk}** · structural quality **${report.quality?.score ?? 'unavailable'}/100**. These are preliminary triage signals, not safety or effectiveness verification.\n\n` +
        `Full package SHA-256 (covers every admitted file):\n\n\`\`\`text\n${report.packageDigest}\n\`\`\`\n\n` +
        `[Full review packet](../../${path}); packet raw-file SHA-256: \`${hash}\`.\n\n` +
        `**Risks to review:** ${report.safety.concerns}\n\n` +
        `**Evidence limits:** ${fixtures.length} authored fixture suite(s), ${fixtures.reduce((sum, suite) => sum + suite.cases, 0)} defined paired scenario(s); ${artifacts.length} stored completed artifact(s)${artifacts.length ? ` (${artifacts.map((artifact) => `${artifact.mode}: ${artifact.verification}`).join('; ')})` : ''}. Fixture definitions and behavior cases are expectations, not agent execution. Fixture replay cannot demonstrate efficacy. No completed platform behavior tests are recorded for this package. Installation documentation is separate from tested compatibility. Provenance remains self-declared; no independent originality, security or professional certification is supplied.\n\n` +
        `**Outstanding content work:** ${report.completeness.nextReview}${missing.length ? ` Structural follow-ups: ${missing.map((check) => `${check.id}: ${check.message}`).join(' ')}` : ' All structural checks pass; substantive review remains necessary.'}\n\n` +
        `**Next owner actions (not approval):** First confirm authorship/redistribution rights and the existing project notice; then resolve the specific content follow-ups above and choose a real reviewer. Inspect examples and any stored artifact, explicitly noting stale evidence. Previous package hash before the notice migration: \`${migration.previousPackages[report.skillId]}\`. The current hash above supersedes it; no old review can authorize these new bytes. Use \`pnpm --silent founding:prepare ${report.skillId}\` only to obtain an unsigned worksheet.\n\n` +
        `**Approval still required:** An actual authorized maintainer must read every final package file and evidence item, resolve or explicitly bound these findings, complete all eight human review answers, and record their own identity, real date, real PR and evidence references. Promotion changes metadata and therefore changes the hash above: regenerate and review the final promoted contents. A matching manually completed record and publication-ledger entry, genuine current-head GitHub approval by a maintainer distinct from the PR author, and authorized merge to main are required. This shortlist entry grants no approval or testing badge.\n`
      );
    }),
  );
  return `# Owner review: proposed first-launch skills\n\nGenerated locally with \`pnpm release:review\`; verified read-only with \`pnpm release:check\`. This document summarizes all ${shortlist.length} shortlisted packets from ${reports.length} founding reports. It is not a reviewer decision and contains no fabricated approval identity/date.\n\nCurrent source status: **${reports.filter((report) => report.sourceStatus === 'draft').length} drafts**; **${registry.decisions.filter((decision) => decision.decision === 'approved').length} recorded publication approvals**. No command generating this document writes a review record, publication decision or package status.\n\nThe hashes below identify the current source contents, not future promoted packages. Approving a title or shortlist does not approve changed bytes. Keep all drafts outside the published catalog until genuine exact-content approval and merge.\n\n[Launch checklist](CHECKLIST.md) · [GitHub settings and permissions audit](GITHUB_SETTINGS.md) · [Human review procedure](../founding-skills-review.md) · [All 42 reports](../../reviews/founding/README.md).\n\n${sections.join('\n')}`;
}
export async function generateOwnerReview(root: string, check = false) {
  const content = await ownerReleaseReview(root);
  const path = resolve(root, ownerReviewPath);
  await directoryPath(dirname(path), !check);
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
      throw new Error('Unsafe owner review output');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (check) {
    if ((await readFile(path, 'utf8')) !== content)
      throw new Error(
        `${ownerReviewPath}: stale owner summaries; run pnpm release:review`,
      );
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  return content;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length && args[0] !== '--check'))
      throw new Error('Usage: release-review.ts [--check]');
    await generateOwnerReview(
      fileURLToPath(new URL('../', import.meta.url)),
      args[0] === '--check',
    );
    console.log(
      'Owner review summaries current. No approvals written. Public release remains subject to the owner checklist and blockers.',
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
