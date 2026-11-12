import { readFile, readdir, mkdir, writeFile, lstat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { directoryPath } from '../packages/skill-installer/src/filesystem';
import {
  generateCatalog,
  publicationDigest,
  readEvaluationReports,
  assessEvaluationArtifact,
} from '../packages/catalog-indexer/src/index';
import {
  evidenceDigest,
  validateMaintainerReview,
} from '../packages/catalog-indexer/src/maintainer-review';
import { validateSkill } from '../packages/skill-validator/src/index';
import {
  evaluationSuiteSchema,
  sectorsSchema,
  foundingNotesSchema,
  type DiscoverySkill,
} from '../packages/skill-schema/src/index';
import { readEvaluationJson } from '../packages/skill-evaluator/src/index';
export const normalizedInstructionBody = (body: string) =>
  body
    .replace(/^#\s+.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const excerpt = (body: string, heading: string) =>
  body.split(`## ${heading}`)[1]?.split('\n## ')[0]?.trim() ??
  'No section found; inspect source.';
export async function foundingReports(root: string) {
  const noteText = await readFile(
    resolve(root, 'reviews/founding/editorial-notes.json'),
    'utf8',
  );
  const notes = foundingNotesSchema.parse(JSON.parse(noteText));
  const sectors = sectorsSchema.parse(
    JSON.parse(await readFile(resolve(root, 'catalog/sectors.json'), 'utf8')),
  );
  const catalog = (await generateCatalog(resolve(root, 'skills'), sectors))
    .catalog;
  if (
    new Set(notes.notes.map((n) => n.skillId)).size !== notes.notes.length ||
    notes.notes.length !== catalog.skills.length ||
    notes.notes.some((n) => !catalog.skills.some((s) => s.id === n.skillId))
  )
    throw new Error(
      'Editorial notes must cover every source skill exactly once; review additions explicitly',
    );
  const ranks = notes.notes
    .flatMap((n) => (n.shortlistRank === null ? [] : [n.shortlistRank]))
    .sort((a, b) => a - b);
  if (
    ranks.length < 10 ||
    ranks.length > 15 ||
    ranks.some((rank, i) => rank !== i + 1)
  )
    throw new Error('Shortlist requires 10–15 distinct contiguous ranks');
  const suites: {
    path: string;
    sha256: string;
    skillId: string;
    cases: number;
    assertionCount: number;
    identicalArms: boolean;
  }[] = [];
  for (const name of (
    await readdir(resolve(root, 'evaluations/scenarios'))
  ).sort()) {
    if (!name.endsWith('.json')) continue;
    const path = `evaluations/scenarios/${name}`;
    const suite = evaluationSuiteSchema.parse(
      await readEvaluationJson(resolve(root, path), 1048576),
    );
    suites.push({
      path,
      sha256: evidenceDigest(await readFile(resolve(root, path))),
      skillId: suite.skillId,
      cases: suite.scenarios.length,
      assertionCount: suite.scenarios.reduce(
        (sum, scenario) => sum + scenario.assertions.length,
        0,
      ),
      identicalArms: suite.scenarios.every(
        (scenario) =>
          JSON.stringify(scenario.fixtures?.baseline) ===
          JSON.stringify(scenario.fixtures?.assisted),
      ),
    });
  }
  const artifacts = await readEvaluationReports(
    resolve(root, 'evaluations/reports'),
  );
  const reports = catalog.skills.map((skill) => {
    const note = notes.notes.find((n) => n.skillId === skill.id)!;
    if (
      note.shortlistRank !== null &&
      (skill.riskLevel !== 'low' || (skill.quality?.score ?? 0) < 85)
    )
      throw new Error(
        `${skill.id}: shortlist requires low declared risk and structural score >=85`,
      );
    const checked = (profile: 'catalog' | 'publication') => {
      const result = validateSkill(skill.files, skill.id, { profile });
      return {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
      };
    };
    const related = catalog.skills
      .filter(
        (other) =>
          other.id !== skill.id &&
          (other.sector === skill.sector ||
            (skill.slug.includes('resume') && other.slug.includes('resume')) ||
            (skill.slug.includes('code-review') &&
              other.slug.includes('code-review')) ||
            (skill.slug.includes('weekly') && other.slug.includes('weekly'))),
      )
      .map((s) => s.id);
    return {
      schemaVersion: 1 as const,
      skillId: skill.id,
      title: skill.title,
      packageDigest: publicationDigest(skill.files),
      sourceStatus: skill.status,
      assessmentKind: notes.assessmentKind,
      approval: 'not-granted' as const,
      sourceFiles: Object.entries(skill.files)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([path, content]) => ({
          path: `skills/${skill.id}/${path}`,
          sha256: evidenceDigest(content),
        })),
      editorialInput: {
        path: 'reviews/founding/editorial-notes.json',
        entryDigest: evidenceDigest(json(note)),
      },
      schema: {
        catalog: checked('catalog'),
        publication: checked('publication'),
      },
      quality: skill.quality,
      safety: {
        declaredRisk: skill.riskLevel,
        concerns: note.safetyConcerns,
        authoredBoundaries: excerpt(skill.body, 'Boundaries'),
        verification:
          'Static checks and preliminary content triage only; no security certification or domain approval.',
      },
      originality: {
        declaredProvenance: skill.provenance ?? null,
        normalizedBodySha256: evidenceDigest(
          normalizedInstructionBody(skill.body),
        ),
        exactNormalizedMatches: catalog.skills
          .filter(
            (other) =>
              other.id !== skill.id &&
              normalizedInstructionBody(other.body) ===
                normalizedInstructionBody(skill.body),
          )
          .map((s) => s.id),
        relatedTasks: related,
        limitation:
          'Self-declared provenance and local exact-copy indicators only. No external plagiarism search, authorship authentication or originality certification.',
      },
      usefulness: {
        proposedTask: note.usefulness,
        expectedOutput: excerpt(skill.body, 'Output'),
        limitation:
          'Editorial task fit, not demonstrated user value or measured effectiveness.',
      },
      completeness: {
        exampleFiles: Object.keys(skill.files)
          .filter((path) => path.startsWith('examples/'))
          .sort(),
        behaviorCases: skill.files['tests/cases.json']
          ? JSON.parse(skill.files['tests/cases.json'])
          : null,
        nextReview: note.nextReview,
      },
      compatibility: skill.compatibility,
      evaluation: {
        fixtureDefinitions: suites.filter(
          (suite) => suite.skillId === skill.id,
        ),
        completedArtifacts: artifacts
          .filter((a) => a.report.suite.skillId === skill.id)
          .map((a) => assessEvaluationArtifact(a, skill)),
        limitation:
          'Behavior cases and authored fixture definitions are expectations, not completed agent tests. Identical baseline/assisted fixtures cannot demonstrate benefit. Only completed artifacts listed here are evidence; fixture replay tests the harness. Platform directory documentation is separate from behavioral testing.',
      },
      launchRecommendation: {
        rank: note.shortlistRank,
        status:
          note.shortlistRank === null
            ? 'defer-owner-review'
            : 'shortlist-for-owner-review',
        conditions:
          'No publication approval. Resolve findings, complete independent maintainer review and retain testing limitations; changing any package file requires a fresh exact-hash review.',
      },
    };
  });
  return reports;
}
export type FoundingReport = Awaited<
  ReturnType<typeof foundingReports>
>[number];
export function unsignedReviewTemplate(
  report: FoundingReport,
  reportText = json(report),
) {
  return {
    schemaVersion: 1,
    skillId: report.skillId,
    packageDigest: report.packageDigest,
    reviewer: null,
    reviewedAt: null,
    decision: null,
    pullRequest: null,
    reason: '',
    checks: Object.fromEntries(
      [
        'schema',
        'safety',
        'originality',
        'usefulness',
        'completeness',
        'compatibility',
        'evaluation',
        'limitations',
      ].map((key) => [key, '']),
    ),
    reviewReport: {
      path: `reviews/founding/reports/${report.skillId}.json`,
      sha256: evidenceDigest(reportText),
    },
    evidenceReferences: report.sourceFiles.filter(
      (ref) =>
        ref.path.endsWith('/SKILL.md') || ref.path.endsWith('/metadata.json'),
    ),
  };
}
export async function checkLocalReview(
  root: string,
  input: unknown,
  skill: DiscoverySkill,
) {
  const review = await validateMaintainerReview(root, input);
  if (
    review.skillId !== skill.id ||
    review.packageDigest !== publicationDigest(skill.files)
  )
    throw new Error(
      'Package changed: regenerate reports and re-review exact contents',
    );
  if (review.decision === 'approved') {
    const result = validateSkill(skill.files, skill.id);
    if (
      skill.status !== 'published' ||
      !result.valid ||
      result.quality.blocked ||
      skill.files['submission.json']
    )
      throw new Error(
        'Approval requires a valid promoted publication candidate without staging files; regenerate after promotion',
      );
  }
  return review;
}
function summary(reports: FoundingReport[]) {
  return `# Founding skills review\n\nGenerated by pnpm founding:review; checked read-only by pnpm founding:check. No timestamps, approvals or agent scores are generated. All findings are preliminary assistant triage for owner review. Full package digests cover every file, including metadata and platform-results.json.\n\n${reports.length} source packages inspected. ${reports.filter((r) => r.schema.catalog.valid).length} pass catalog validation; ${reports.filter((r) => r.schema.publication.valid).length} pass the stricter publication schema. ${reports.filter((r) => r.quality?.score === 100).length} have structural score 100. No independent security or originality verification is implied.\n\n## Proposed launch shortlist\n\nSelection favors declared low risk, structural scores of at least 85, bounded supplied-text tasks, and distinct use cases across sectors. Rank is an editorial proposal, not a measured performance ranking. All remain unapproved.\n\n| Rank | Skill / report | Structural score | Rationale |\n| --- | --- | --- | --- |\n${reports
    .filter((r) => r.launchRecommendation.rank !== null)
    .sort((a, b) => a.launchRecommendation.rank! - b.launchRecommendation.rank!)
    .map(
      (r) =>
        `| ${r.launchRecommendation.rank} | [${r.title}](reports/${r.skillId}.json) | ${r.quality?.score ?? 'unavailable'} | ${r.usefulness.proposedTask} |`,
    )
    .join(
      '\n',
    )}\n\n## All draft review packets\n\n| Skill / exact report | Declared risk | Quality | Publication schema | Disposition |\n| --- | --- | --- | --- | --- |\n${reports.map((r) => `| [${r.skillId}](reports/${r.skillId}.json) | ${r.safety.declaredRisk} | ${r.quality?.score ?? 'unavailable'} | ${r.schema.publication.valid ? 'pass' : 'needs work'} | ${r.launchRecommendation.status} |`).join('\n')}\n\n## Findings and limitations\n\nAll source packages currently lack completed platform behavior records. Four documented installation adapters do not establish compatibility testing. Only explicitly listed completed report artifacts count as evidence. Twenty suites define authored offline fixtures; only the existing stored Code Reviewer fixture artifact is linked as completed catalog evidence. Fresh local fixture runs are recorded separately in ignored evaluation output. No real-agent performance improvement has been demonstrated.\n\nShared starter structure is not proof of plagiarism or independent originality. In particular, Code Reviewer / Code Review Expert, Resume Reviewer / Resume Tailoring Assistant, and the two weekly-planning/reflection tasks warrant scope differentiation. Higher-stakes administrative packages require qualified domain review despite full structural scores. See each packet's concerns, boundaries and next-review action.\n\n[Maintainer procedure](../../docs/founding-skills-review.md). Reports and this shortlist are outside the skill source tree and never grant publication, attribution or compatibility badges.\n`;
}
export async function generateFoundingReview(root: string, check = false) {
  const reports = await foundingReports(root);
  const outputs = new Map(
    reports.map((report) => [
      `reviews/founding/reports/${report.skillId}.json`,
      json(report),
    ]),
  );
  outputs.set('reviews/founding/README.md', summary(reports));
  // Fail on orphaned reports. Never remove old work silently.
  async function inspect(directory: string) {
    let names: string[];
    try {
      names = await readdir(resolve(root, directory));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    for (const name of names) {
      const path = `${directory}/${name}`,
        info = await lstat(resolve(root, path));
      if (info.isDirectory() && !info.isSymbolicLink()) await inspect(path);
      else if (!info.isFile() || info.isSymbolicLink() || !outputs.has(path))
        throw new Error(
          `Unexpected review artifact: ${path}; archive explicitly outside generated reports`,
        );
    }
  }
  await inspect('reviews/founding/reports');
  for (const [path, content] of outputs) {
    await directoryPath(dirname(resolve(root, path)), !check);
    try {
      const info = await lstat(resolve(root, path));
      if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
        throw new Error(`Unsafe review output: ${path}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (check) {
      let existing = '';
      try {
        existing = await readFile(resolve(root, path), 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (existing !== content)
        throw new Error(
          `${path}: stale founding review; run pnpm founding:review and inspect changes`,
        );
    } else {
      await mkdir(dirname(resolve(root, path)), { recursive: true });
      await writeFile(resolve(root, path), content);
    }
  }
  return reports;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  try {
    const [command, arg] = process.argv.slice(2);
    if (command === '--template') {
      const reports = await foundingReports(root),
        report = reports.find((r) => r.skillId === arg);
      if (!report) throw new Error('Use pnpm founding:prepare <sector/slug>');
      const raw = await readFile(
        join(root, `reviews/founding/reports/${arg}.json`),
        'utf8',
      );
      if (raw !== json(report))
        throw new Error('Stale report; run pnpm founding:review');
      console.log(json(unsignedReviewTemplate(report, raw)));
    } else if (command === '--review') {
      if (!arg)
        throw new Error(
          'Use pnpm founding:check-review <manually-completed-record.json>',
        );
      const input = JSON.parse(await readFile(resolve(arg), 'utf8'));
      const catalog = (await generateCatalog(join(root, 'skills'))).catalog;
      const skill = catalog.skills.find((s) => s.id === input.skillId);
      if (!skill) throw new Error('Unknown source skill');
      await checkLocalReview(root, input, skill);
      console.log(
        'Local review integrity checks passed. Identity is self-asserted offline; GitHub approval/merge checks remain required. No approval record or ledger was written.',
      );
    } else {
      if (command && command !== '--check')
        throw new Error('Unknown founding review option');
      const reports = await generateFoundingReview(root, command === '--check');
      console.log(
        `${reports.length} reproducible founding reviews ${command === '--check' ? 'checked' : 'generated'}; no maintainer decisions written.`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
