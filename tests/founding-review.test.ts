import {
  cp,
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  foundingReports,
  generateFoundingReview,
  unsignedReviewTemplate,
  checkLocalReview,
  type FoundingReport,
} from '../scripts/founding-review';
import {
  evidenceDigest,
  readReviewEvidence,
  validateMaintainerReview,
} from '../packages/catalog-indexer/src/maintainer-review';
import {
  generateCatalog,
  publicationDigest,
  publishedCatalog,
  readPublicationRegistry,
  readSkillFiles,
} from '../packages/catalog-indexer/src/index';
import { maintainerReviewSchema } from '../packages/skill-schema/src/index';
import { validateSkill } from '../packages/skill-validator/src/index';
import { trustedMaintainers } from '../scripts/check-moderation';
import { writeSyntheticReview } from './helpers/review-fixture';
const root = resolve('.');
let reports: FoundingReport[];
const temporary: string[] = [];
beforeAll(async () => {
  reports = await foundingReports(root);
});
afterEach(async () => {
  for (const dir of temporary.splice(0))
    await rm(dir, { recursive: true, force: true });
});
async function fixture() {
  const dir = await mkdtemp(join(await realpath(tmpdir()), 'osk-founding-'));
  temporary.push(dir);
  const files = await readSkillFiles(
    resolve('tests/fixtures/valid/education/example-skill'),
  );
  files['metadata.json'] = JSON.stringify({
    ...JSON.parse(files['metadata.json']),
    status: 'published',
  });
  const skill = validateSkill(files, 'education/example-skill').skill!;
  expect(skill).toBeDefined();
  const data = await writeSyntheticReview(dir, skill.id, files);
  return { dir, skill, ...data };
}
async function ledger(
  dir: string,
  review: Awaited<ReturnType<typeof fixture>>['review'],
  reviewRecord: { path: string; sha256: string },
) {
  const record = {
    skillId: review.skillId,
    packageDigest: review.packageDigest,
    reviewer: review.reviewer,
    reviewedAt: review.reviewedAt,
    decision: review.decision,
    pullRequest: review.pullRequest,
    reason: review.reason,
  };
  const registry = {
    schemaVersion: 1 as const,
    decisions: [{ ...record, reviewRecord }],
  };
  await writeFile(
    join(dir, 'catalog/publication-reviews.json'),
    JSON.stringify(registry),
  );
  return registry;
}
describe('reproducible founding content triage', () => {
  it('covers all 42 exact packages without pretending reports are approval', async () => {
    const catalog = (await generateCatalog(resolve('skills'))).catalog;
    expect(reports).toHaveLength(42);
    expect(new Set(reports.map((r) => r.skillId)).size).toBe(42);
    for (const report of reports) {
      const skill = catalog.skills.find((s) => s.id === report.skillId)!;
      expect(report.packageDigest).toBe(publicationDigest(skill.files));
      expect(report.approval).toBe('not-granted');
      expect(report.sourceFiles).toHaveLength(Object.keys(skill.files).length);
      expect(report.schema.catalog.valid).toBe(true);
      expect(report.safety.concerns.length).toBeGreaterThan(20);
      expect(report.originality.limitation).toContain(
        'No external plagiarism search',
      );
      expect(
        report.compatibility?.every((p) => p.testing === 'not-recorded'),
      ).toBe(true);
    }
    expect(
      reports.flatMap((r) => r.evaluation.fixtureDefinitions),
    ).toHaveLength(20);
    expect(
      reports.flatMap((r) => r.evaluation.completedArtifacts),
    ).toHaveLength(1);
    expect(
      reports
        .flatMap((r) => r.evaluation.completedArtifacts)
        .every((a) => a.mode === 'fixture'),
    ).toBe(true);
  });
  it('proposes twelve low-risk candidates across multiple broad sectors, with unresolved review work', async () => {
    const shortlist = reports.filter(
      (r) => r.launchRecommendation.rank !== null,
    );
    expect(shortlist).toHaveLength(12);
    expect(
      new Set(shortlist.map((r) => r.skillId.split('/')[0])).size,
    ).toBeGreaterThanOrEqual(8);
    expect(
      shortlist.every(
        (r) => r.safety.declaredRisk === 'low' && r.quality!.score >= 85,
      ),
    ).toBe(true);
    expect(
      shortlist.every((r) =>
        r.launchRecommendation.conditions.includes('No publication approval'),
      ),
    ).toBe(true);
    const original = reports.find(
      (r) => r.skillId === 'software-development/code-reviewer',
    )!;
    expect(original.originality.relatedTasks).toContain(
      'software-engineering/code-review-expert',
    );
  });
  it('is deterministic, checks freshness read-only and never changes the ledger or source', async () => {
    const before = await readFile(
      resolve('catalog/publication-reviews.json'),
      'utf8',
    );
    expect(await foundingReports(root)).toEqual(reports);
    await generateFoundingReview(root, true);
    expect(
      await readFile(resolve('catalog/publication-reviews.json'), 'utf8'),
    ).toBe(before);
    expect((await readPublicationRegistry(root)).decisions).toEqual([]);
    const catalog = (await generateCatalog(resolve('skills'))).catalog;
    expect(catalog.skills.every((s) => s.status === 'draft')).toBe(true);
    expect(
      publishedCatalog(catalog, await readPublicationRegistry(root)).skills,
    ).toEqual([]);
  });
  it('regenerates reports only in the report tree and detects changed package contents', async () => {
    const dir = await mkdtemp(
      join(await realpath(tmpdir()), 'osk-founding-copy-'),
    );
    temporary.push(dir);
    for (const name of ['skills', 'evaluations', 'catalog', 'reviews/founding'])
      await cp(join(root, name), join(dir, name), { recursive: true });
    const before = await readFile(
      join(dir, 'catalog/publication-reviews.json'),
      'utf8',
    );
    await generateFoundingReview(dir);
    await generateFoundingReview(dir, true);
    const target = join(
      dir,
      'skills/software-development/code-reviewer/SKILL.md',
    );
    await writeFile(
      target,
      (await readFile(target, 'utf8')) + '\nChanged review context.\n',
    );
    await expect(generateFoundingReview(dir, true)).rejects.toThrow(
      'stale founding review',
    );
    await generateFoundingReview(dir);
    expect(
      await readFile(join(dir, 'catalog/publication-reviews.json'), 'utf8'),
    ).toBe(before);
    await writeFile(join(dir, 'reviews/founding/reports/orphan.json'), '{}');
    await expect(generateFoundingReview(dir)).rejects.toThrow(
      'Unexpected review artifact',
    );
  });
  it('prepares unsigned templates with no invented human identity, date or decision', () => {
    const template = unsignedReviewTemplate(reports[0]);
    expect(template).toMatchObject({
      reviewer: null,
      reviewedAt: null,
      decision: null,
      pullRequest: null,
    });
    expect(maintainerReviewSchema.safeParse(template).success).toBe(false);
    expect(template.packageDigest).toBe(reports[0].packageDigest);
  });
});
describe('human review integrity and publication isolation', () => {
  it('checks explicitly supplied synthetic human fields and exact evidence without writing an approval', async () => {
    const { dir, skill, review } = await fixture();
    expect(await checkLocalReview(dir, review, skill)).toEqual(review);
    await expect(
      readFile(join(dir, 'catalog/publication-reviews.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(
      publishedCatalog(
        { schemaVersion: 1, sectors: [], skills: [skill] },
        { schemaVersion: 1, decisions: [] },
      ).skills,
    ).toEqual([]);
  });
  it('requires a bound completed review for the actual registry reader', async () => {
    const { dir, review, reviewRecord } = await fixture();
    const registry = await ledger(dir, review, reviewRecord);
    expect(await readPublicationRegistry(dir)).toEqual(registry);
    const missing = {
      ...registry,
      decisions: registry.decisions.map((record) => ({
        ...record,
        reviewRecord: undefined,
      })),
    };
    await writeFile(
      join(dir, 'catalog/publication-reviews.json'),
      JSON.stringify(missing),
    );
    await expect(readPublicationRegistry(dir)).rejects.toThrow(
      'human-completed',
    );
  });
  it('rejects a changed support file including the self-referential platform-results file', async () => {
    const { dir, skill, review } = await fixture();
    for (const path of [
      'examples/output-1.md',
      'metadata.json',
      'tests/platform-results.json',
    ]) {
      const changed = {
        ...skill,
        files: {
          ...skill.files,
          [path]: (skill.files[path] ?? '') + 'changed',
        },
      };
      await expect(checkLocalReview(dir, review, changed)).rejects.toThrow(
        'Package changed',
      );
    }
  });
  it('does not let a review publish a draft or incomplete staging package', async () => {
    const { dir, skill, review } = await fixture();
    await expect(
      checkLocalReview(dir, review, { ...skill, status: 'draft' }),
    ).rejects.toThrow('promoted');
    await expect(
      checkLocalReview(dir, review, {
        ...skill,
        files: { ...skill.files, 'submission.json': '{}' },
      }),
    ).rejects.toThrow('Package changed');
  });
  it('rejects unauthorized identity, future dates and unanswered review questions', async () => {
    const { dir, review } = await fixture();
    await expect(
      validateMaintainerReview(dir, { ...review, reviewer: 'unknown' }),
    ).rejects.toThrow('authorized');
    await expect(
      validateMaintainerReview(dir, {
        ...review,
        reviewedAt: '2999-01-01T00:00:00Z',
      }),
    ).rejects.toThrow('future');
    await expect(
      validateMaintainerReview(dir, {
        ...review,
        checks: { ...review.checks, safety: '' },
      }),
    ).rejects.toThrow();
  });
  it('rejects altered report targets, stale evidence and altered review records', async () => {
    const { dir, review, reviewRecord } = await fixture();
    await ledger(dir, review, reviewRecord);
    await writeFile(
      join(dir, reviewRecord.path),
      JSON.stringify({
        ...review,
        reason: 'A changed unsigned rationale that does not match its receipt.',
      }),
    );
    await expect(readPublicationRegistry(dir)).rejects.toThrow(
      'Evidence hash changed',
    );
    const bad = { ...review, packageDigest: '0'.repeat(64) };
    await expect(validateMaintainerReview(dir, bad)).rejects.toThrow(
      'another package or stale hash',
    );
    await writeFile(
      join(dir, review.evidenceReferences[0].path),
      'Changed content',
    );
    await expect(validateMaintainerReview(dir, review)).rejects.toThrow(
      'Evidence hash changed',
    );
  });
  it('rejects ledger and review disagreements even with a correct review-record hash', async () => {
    const { dir, review, reviewRecord } = await fixture();
    const registry = await ledger(dir, review, reviewRecord);
    registry.decisions[0].reason =
      'An independently changed reason must not borrow a prior record.';
    await writeFile(
      join(dir, 'catalog/publication-reviews.json'),
      JSON.stringify(registry),
    );
    await expect(readPublicationRegistry(dir)).rejects.toThrow(
      'does not match ledger reason',
    );
  });
  it('keeps revoked approvals out of published content even with the same package hash', async () => {
    const { dir, skill, review, reviewRecord } = await fixture();
    const registry = await ledger(dir, review, reviewRecord);
    const catalog = { schemaVersion: 1 as const, sectors: [], skills: [skill] };
    expect(
      publishedCatalog(catalog, await readPublicationRegistry(dir)).skills,
    ).toHaveLength(1);
    const withdrawn = {
      schemaVersion: 1,
      decisions: [
        {
          ...registry.decisions[0],
          decision: 'withdrawn',
          reviewRecord: undefined,
        },
      ],
    };
    await writeFile(
      join(dir, 'catalog/publication-reviews.json'),
      JSON.stringify(withdrawn),
    );
    expect(
      publishedCatalog(catalog, await readPublicationRegistry(dir)).skills,
    ).toEqual([]);
  });
  it.each([
    '../secret',
    'reviews/../secret',
    '/etc/passwd',
    'reviews//file.json',
    'reviews/./file.json',
  ])('rejects unsafe evidence paths %s', async (path) => {
    await expect(
      readReviewEvidence(root, { path, sha256: '0'.repeat(64) }),
    ).rejects.toThrow();
  });
  it('rejects symbolic links and hard-linked evidence', async () => {
    const { dir, review } = await fixture();
    await mkdir(join(dir, 'docs'), { recursive: true });
    const source = join(dir, review.evidenceReferences[0].path);
    await symlink(source, join(dir, 'docs/linked.md'));
    await expect(
      readReviewEvidence(dir, {
        path: 'docs/linked.md',
        sha256: review.evidenceReferences[0].sha256,
      }),
    ).rejects.toThrow('alias');
    await link(source, join(dir, 'docs/hard.md'));
    await expect(
      readReviewEvidence(dir, {
        path: 'docs/hard.md',
        sha256: review.evidenceReferences[0].sha256,
      }),
    ).rejects.toThrow('Unsafe evidence file');
  });
  it('uses only the trusted base roster, including a fail-closed owner fallback', () => {
    expect(trustedMaintainers(undefined)).toEqual(['sarangp3010']);
    expect(
      trustedMaintainers(
        JSON.stringify({ schemaVersion: 1, maintainers: ['trusted-owner'] }),
      ),
    ).toEqual(['trusted-owner']);
    expect(() => trustedMaintainers('{}')).toThrow();
    expect(evidenceDigest('example')).toHaveLength(64);
  });
});
