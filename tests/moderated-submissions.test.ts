import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync, strFromU8 } from 'fflate';
import {
  readSkillFiles,
  readPublicationRegistry,
  generateCatalog,
  packageDigest,
  publicationDigest,
  publishedCatalog,
} from '../packages/catalog-indexer/src/index';
import {
  publicationRegistrySchema,
  type DiscoveryCatalog,
  type DiscoverySkill,
} from '../packages/skill-schema/src/index';
import {
  safeDraft,
  checkDraft,
  proposalSkill,
  browserPackageDigest,
  type BrowserDraft,
} from '../apps/web/src/lib/skill-draft';
import { writeSyntheticReview } from './helpers/review-fixture';
import { createSkillZip } from '../apps/web/src/lib/download';
import { checkContributions } from '../scripts/check-contributions';
import {
  githubModeration,
  hasApproval,
  localModeration,
  validateDecisionChanges,
} from '../scripts/check-moderation';
let temp: string, catalog: DiscoveryCatalog, draft: BrowserDraft;
beforeEach(async () => {
  temp = await mkdtemp(join(await realpath(tmpdir()), 'osk-moderation-'));
  catalog = (await generateCatalog(resolve('skills'))).catalog;
  const files = await readSkillFiles(resolve('templates/skill'));
  draft = {
    schemaVersion: 1,
    id: 'collaboration-records/example-skill',
    operation: 'new',
    files,
  };
});
afterEach(async () => {
  await rm(temp, { recursive: true, force: true });
});
async function stage() {
  await mkdir(join(temp, 'skills'));
  const path = join(temp, 'submissions', draft.id);
  await mkdir(path, { recursive: true });
  const skill = proposalSkill(draft, catalog);
  for (const [name, text] of Object.entries(skill.files)) {
    await mkdir(resolve(path, name, '..'), { recursive: true });
    await writeFile(join(path, name), text);
  }
  return { path, skill };
}
const registry = (digest: string) =>
  publicationRegistrySchema.parse({
    schemaVersion: 1,
    decisions: [
      {
        skillId: 'collaboration-records/example-skill',
        packageDigest: digest,
        decision: 'approved',
        reviewer: 'sarangp3010',
        reviewedAt: '2026-11-10T12:00:00Z',
        pullRequest: 12,
        reason:
          'Synthetic moderation regression fixture only, not a real identity or approval record.',
      },
    ],
  });
describe('browser draft packages and untrusted proposals', () => {
  it('validates and exports complete draft packages with an explicit new-proposal request', () => {
    expect(checkDraft(draft, catalog).valid).toBe(true);
    const skill = proposalSkill(draft, catalog),
      zip = unzipSync(createSkillZip(skill));
    for (const [path, text] of Object.entries(skill.files))
      expect(strFromU8(zip[`${skill.slug}/${path}`])).toBe(text);
    expect(JSON.parse(skill.files['submission.json'])).toEqual({
      schemaVersion: 1,
      operation: 'new',
    });
    expect(skill.status).toBe('draft');
    expect(skill.testedPlatforms).toEqual([]);
  });
  it('blocks authored publishing/testing claims and missing references without altering the source', () => {
    const original = JSON.stringify(draft.files);
    const metadata = JSON.parse(draft.files['metadata.json']);
    metadata.status = 'published';
    const unsafe = {
      ...draft,
      files: { ...draft.files, 'metadata.json': JSON.stringify(metadata) },
    };
    expect(checkDraft(unsafe, catalog).errors.join(' ')).toContain(
      'must be drafts',
    );
    expect(() => proposalSkill(unsafe, catalog)).toThrow('Fix validation');
    const broken = {
      ...draft,
      files: {
        ...draft.files,
        'SKILL.md':
          draft.files['SKILL.md'] + '\n[missing](references/absent.md)\n',
      },
    };
    expect(checkDraft(broken, catalog).valid).toBe(false);
    expect(JSON.stringify(draft.files)).toBe(original);
  });
  it.each([
    '../escape.md',
    '/tmp/escape.md',
    'references/payload.sh',
    'submission.json',
  ])('refuses unsafe or reserved JSON file path %s', (path) => {
    expect(() =>
      safeDraft({ ...draft, files: { ...draft.files, [path]: 'untrusted' } }),
    ).toThrow();
  });
  it('preserves unfinished safe drafts as JSON but requires a valid package for ZIP export', () => {
    const unfinished = safeDraft({
      ...draft,
      files: { 'notes.md': 'A safe unfinished task.' },
    });
    expect(unfinished.files['notes.md']).toBe('A safe unfinished task.');
    expect(checkDraft(unfinished, catalog).valid).toBe(false);
    expect(() => proposalSkill(unfinished, catalog)).toThrow();
  });
  it('binds approval/update digests to platform-result files as well as instructions', async () => {
    const files = {
      ...catalog.skills[0].files,
      'tests/platform-results.json': '{"schemaVersion":1,"runs":[]}',
    };
    expect(publicationDigest(files)).not.toBe(packageDigest(files));
    expect(await browserPackageDigest(files)).toBe(publicationDigest(files));
  });
  it('matches browser update digests to the existing Node package digest', async () => {
    const source = catalog.skills[0];
    expect(await browserPackageDigest(source.files)).toBe(
      packageDigest(source.files),
    );
    expect(
      checkDraft(
        { ...draft, id: source.id, files: source.files },
        catalog,
      ).errors.join(' '),
    ).toContain('Duplicate identifier');
  });
  it('checks pending proposals while excluding them from discovery and publication', async () => {
    await stage();
    const checks = await checkContributions(temp);
    expect(checks).toMatchObject({ valid: true, pending: 1, packages: 0 });
    const source = (await generateCatalog(join(temp, 'skills'))).catalog;
    expect(source.skills).toEqual([]);
    expect(
      publishedCatalog(source, { schemaVersion: 1, decisions: [] }).skills,
    ).toEqual([]);
  });
  it('rejects forged published proposals and stale updates with actionable request paths', async () => {
    const { path } = await stage();
    await writeFile(
      join(path, 'submission.json'),
      JSON.stringify({
        schemaVersion: 1,
        operation: 'update',
        basePackageDigest: '0'.repeat(64),
      }),
    );
    expect(
      (await checkContributions(temp)).errors.some(
        (error) =>
          error.path.endsWith('submission.json') &&
          error.message.includes('stale'),
      ),
    ).toBe(true);
    const metadata = JSON.parse(
      await readFile(join(path, 'metadata.json'), 'utf8'),
    );
    metadata.status = 'published';
    await writeFile(join(path, 'metadata.json'), JSON.stringify(metadata));
    expect(
      (await checkContributions(temp)).errors.some((error) =>
        error.message.includes('remain draft'),
      ),
    ).toBe(true);
  });
});
describe('publication admission and real-review requirements', () => {
  it('keeps all real packages separate from published skills without fabricating reviews', async () => {
    expect(
      publishedCatalog(catalog, { schemaVersion: 1, decisions: [] }).skills,
    ).toEqual([]);
    expect((await localModeration(resolve('.'))).decisions).toEqual([]);
  });
  it('requires exact-package approval and excludes stale or withdrawn decisions', async () => {
    const skill: DiscoverySkill = {
      ...proposalSkill(draft, catalog),
      status: 'published' as const,
    };
    skill.files = Object.fromEntries(
      Object.entries(skill.files).filter(
        ([path]) => path !== 'submission.json',
      ),
    ) as typeof skill.files;
    skill.files['metadata.json'] = JSON.stringify({
      ...JSON.parse(skill.files['metadata.json']),
      status: 'published',
    });
    const input = { ...catalog, skills: [skill] };
    const { review, reviewRecord } = await writeSyntheticReview(
      temp,
      skill.id,
      skill.files,
    );
    const receipt = {
      skillId: skill.id,
      packageDigest: publicationDigest(skill.files),
      decision: 'approved',
      reviewer: review.reviewer,
      reviewedAt: review.reviewedAt,
      pullRequest: review.pullRequest,
      reason: review.reason,
      reviewRecord,
    };
    await writeFile(
      join(temp, 'catalog/publication-reviews.json'),
      JSON.stringify({ schemaVersion: 1, decisions: [receipt] }),
    );
    const approval = await readPublicationRegistry(temp);
    expect(publishedCatalog(input, approval).skills).toHaveLength(1);
    expect(() => publishedCatalog(input, registry('0'.repeat(64)))).toThrow(
      'validated immutable',
    );
    expect(() => {
      approval.decisions[0].decision = 'withdrawn';
    }).toThrow();
    await writeFile(
      join(temp, 'catalog/publication-reviews.json'),
      JSON.stringify({
        schemaVersion: 1,
        decisions: [
          { ...receipt, decision: 'withdrawn', reviewRecord: undefined },
        ],
      }),
    );
    expect(
      publishedCatalog(input, await readPublicationRegistry(temp)).skills,
    ).toEqual([]);
  });
  it('does not accept approval for another commit, self-review, dismissed or superseded approval', () => {
    const review = {
      id: 1,
      state: 'APPROVED',
      commit_id: 'head',
      user: { login: 'sarangp3010' },
    };
    expect(hasApproval([review], 'sarangp3010', 'head', 'contributor')).toBe(
      true,
    );
    expect(
      hasApproval([review], 'sarangp3010', 'new-head', 'contributor'),
    ).toBe(false);
    expect(hasApproval([review], 'sarangp3010', 'head', 'sarangp3010')).toBe(
      false,
    );
    for (const state of ['CHANGES_REQUESTED', 'DISMISSED'])
      expect(
        hasApproval(
          [review, { ...review, id: 2, state }],
          'sarangp3010',
          'head',
          'contributor',
        ),
      ).toBe(false);
  });
  it('requires a genuine authorized review and merged main PR for historical records', async () => {
    const approval = registry('0'.repeat(64));
    const pr = {
      head: { sha: 'head' },
      base: { ref: 'main', repo: { full_name: 'sarangp3010/open-skill-kit' } },
      user: { login: 'contributor' },
      merged: false,
      merged_by: { login: 'sarangp3010' },
    };
    const get = async (path: string) =>
      path.includes('/reviews?')
        ? [
            {
              id: 1,
              state: 'APPROVED',
              commit_id: 'head',
              user: { login: 'sarangp3010' },
            },
          ]
        : pr;
    await githubModeration(approval, ['sarangp3010'], 12, get);
    await expect(
      githubModeration(approval, ['sarangp3010'], undefined, get),
    ).rejects.toThrow('merged');
    await expect(
      githubModeration(approval, ['other-maintainer'], 12, get),
    ).rejects.toThrow('not authorized');
    pr.merged = true;
    await githubModeration(approval, ['sarangp3010'], undefined, get);
    pr.merged_by = { login: 'not-authorized' };
    await expect(
      githubModeration(approval, ['sarangp3010'], undefined, get),
    ).rejects.toThrow('merge must be performed');
    pr.merged_by = { login: 'sarangp3010' };
    await expect(
      githubModeration(approval, ['sarangp3010'], 12, async (path) =>
        path.includes('/reviews?') ? [] : pr,
      ),
    ).rejects.toThrow('missing current-head approval');
  });
  it('allows develop validation but requires main for every publication decision change', () => {
    const empty = { schemaVersion: 1 as const, decisions: [] };
    const approval = registry('0'.repeat(64));
    expect(() =>
      validateDecisionChanges(empty, empty, 12, 'develop'),
    ).not.toThrow();
    expect(() =>
      validateDecisionChanges(approval, approval, 99, 'develop'),
    ).not.toThrow();
    for (const [previous, current] of [
      [empty, approval],
      [approval, empty],
      [
        approval,
        {
          ...approval,
          decisions: approval.decisions.map((record) => ({
            ...record,
            decision: 'withdrawn' as const,
          })),
        },
      ],
    ]) {
      expect(() =>
        validateDecisionChanges(previous, current, 12, 'develop'),
      ).toThrow('must target main');
    }
    expect(() =>
      validateDecisionChanges(empty, approval, 12, 'main'),
    ).not.toThrow();
  });
  it.each(['develop', 'feature/untrusted'])(
    'rejects GitHub publication approval targeting %s even with a valid review',
    async (branch) => {
      await expect(
        githubModeration(
          registry('0'.repeat(64)),
          ['sarangp3010'],
          12,
          async (path) =>
            path.includes('/reviews?')
              ? [
                  {
                    id: 1,
                    state: 'APPROVED',
                    commit_id: 'head',
                    user: { login: 'sarangp3010' },
                  },
                ]
              : {
                  head: { sha: 'head' },
                  base: {
                    ref: branch,
                    repo: { full_name: 'sarangp3010/open-skill-kit' },
                  },
                  user: { login: 'contributor' },
                  merged: false,
                  merged_by: null,
                },
        ),
      ).rejects.toThrow('PR to main');
    },
  );
  it('prevents borrowing old PR approvals or erasing withdrawal history', () => {
    const approval = registry('0'.repeat(64));
    expect(() =>
      validateDecisionChanges(
        { schemaVersion: 1, decisions: [] },
        approval,
        99,
        'main',
      ),
    ).toThrow('this PR');
    expect(() =>
      validateDecisionChanges(
        approval,
        { schemaVersion: 1, decisions: [] },
        12,
        'main',
      ),
    ).toThrow('withdrawal');
    expect(() =>
      validateDecisionChanges(
        { schemaVersion: 1, decisions: [] },
        approval,
        12,
        'main',
      ),
    ).not.toThrow();
  });
});
