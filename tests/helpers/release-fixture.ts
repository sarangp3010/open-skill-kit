/** Fictional publication states in a disposable tree. Never genuine approvals. */
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { readSkillFiles } from '../../packages/catalog-indexer/src/index';
import { publicationRegistrySchema } from '../../packages/skill-schema/src/index';
import { writeSyntheticReview } from './review-fixture';
export async function createReleaseFixture() {
  const root = await mkdtemp(
    join(await realpath(tmpdir()), 'osk-release-test-'),
  );
  async function put(path: string, content: string) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  await cp(resolve('tests/fixtures/valid'), join(root, 'skills'), {
    recursive: true,
  });
  await put(
    'catalog/sectors.json',
    await readFile(resolve('catalog/sectors.json'), 'utf8'),
  );
  const id = 'education/example-skill';
  const files = await readSkillFiles(join(root, 'skills', id));
  files['metadata.json'] = JSON.stringify({
    ...JSON.parse(files['metadata.json']),
    title: 'Synthetic approved release fixture',
    status: 'published',
  });
  const { review, reviewRecord } = await writeSyntheticReview(
    root,
    id,
    files,
    'fixture-maintainer',
  );
  const registry = publicationRegistrySchema.parse({
    schemaVersion: 1,
    decisions: [
      {
        skillId: id,
        packageDigest: review.packageDigest,
        reviewer: review.reviewer,
        reviewedAt: review.reviewedAt,
        decision: review.decision,
        pullRequest: review.pullRequest,
        reason: review.reason,
        reviewRecord,
      },
    ],
  });
  async function writeRegistry(value: unknown) {
    await put('catalog/publication-reviews.json', JSON.stringify(value));
  }
  await writeRegistry(registry);
  const unapproved = 'education/unapproved-fixture',
    rejected = 'education/rejected-fixture';
  for (const [newId, location] of [
    [unapproved, 'skills'],
    [rejected, 'submissions'],
  ] as const) {
    for (const [path, text] of Object.entries(files)) {
      let content = text.replaceAll('example-skill', newId.split('/')[1]);
      if (path === 'metadata.json')
        content = JSON.stringify({
          ...JSON.parse(content),
          id: newId,
          slug: newId.split('/')[1],
          title:
            location === 'skills'
              ? 'Synthetic unapproved source fixture'
              : 'Synthetic rejected submission fixture',
          status: 'draft',
        });
      if (path === 'SKILL.md')
        content += `\nDistinct synthetic ${location} instructions for isolation tests only.\n`;
      await put(`${location}/${newId}/${path}`, content);
    }
  }
  await put(
    `submissions/${rejected}/submission.json`,
    JSON.stringify({ schemaVersion: 1, operation: 'new' }),
  );
  return {
    root,
    id,
    files,
    unapproved,
    rejected,
    review,
    registry,
    put,
    writeRegistry,
  };
}
