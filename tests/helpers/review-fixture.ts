/** Synthetic offline review data for temporary test repositories only. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { evidenceDigest } from '../../packages/catalog-indexer/src/maintainer-review';
import { publicationDigest } from '../../packages/catalog-indexer/src/publication';
export async function writeSyntheticReview(
  root: string,
  skillId: string,
  files: Record<string, string>,
  reviewer = 'sarangp3010',
) {
  async function put(path: string, content: string) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
    return { path, sha256: evidenceDigest(content) };
  }
  await put(
    'catalog/maintainers.json',
    JSON.stringify({ schemaVersion: 1, maintainers: [reviewer] }),
  );
  const packageHash = publicationDigest(files);
  const sourceFiles = [];
  for (const [path, content] of Object.entries(files))
    sourceFiles.push(await put(`skills/${skillId}/${path}`, content));
  const reviewReport = await put(
    `reviews/founding/reports/${skillId}.json`,
    JSON.stringify({
      schemaVersion: 1,
      skillId,
      packageDigest: packageHash,
      schema: { catalog: { valid: true } },
      quality: { blocked: false },
      sourceFiles,
      evaluation: { fixtureDefinitions: [], completedArtifacts: [] },
    }),
  );
  const source = await put(`skills/${skillId}/SKILL.md`, files['SKILL.md']);
  const review = {
    schemaVersion: 1 as const,
    skillId,
    packageDigest: packageHash,
    decision: 'approved' as const,
    reviewer,
    reviewedAt: '2026-11-10T00:00:00Z',
    pullRequest: 1,
    reason:
      'Synthetic offline packaging fixture only; no actual approval is claimed.',
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
      ].map((key) => [
        key,
        'Synthetic test statement; never actual maintainer review.',
      ]),
    ),
    reviewReport,
    evidenceReferences: [source],
  };
  const reviewRecord = await put(
    `reviews/maintainer/${skillId.replace('/', '--')}.json`,
    JSON.stringify(review),
  );
  return { review, reviewRecord };
}
