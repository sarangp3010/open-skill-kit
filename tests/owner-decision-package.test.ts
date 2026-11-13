import { afterEach, beforeAll, expect, it } from 'vitest';
import {
  mkdtemp,
  mkdir,
  symlink,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  collectOwnerDecisionData,
  instructionDisplay,
  decisionPackageFiles,
  dependencyClass,
  packetDirectory,
  sourceSnapshot,
  noticeEvidence,
  preservedEvidencePath,
  checkedBaselineHead,
  unsignedReleaseManifest,
  writeDecisionFiles,
  type OwnerDecisionData,
} from '../scripts/owner-decision-package';
import {
  maintainerReviewSchema,
  publicationRegistrySchema,
} from '../packages/skill-schema/src/index';
let data: OwnerDecisionData;
const directories: string[] = [];
beforeAll(async () => {
  data = await collectOwnerDecisionData(resolve('.'), { artifactRoots: [] });
});
afterEach(async () => {
  for (const path of directories.splice(0))
    await rm(path, { recursive: true, force: true });
});
it('includes all 12 complete source instruction sets, exact package hashes, risks and unselected decisions', () => {
  const files = decisionPackageFiles(data),
    document = files.get('SKILL_DECISIONS.md')!;
  expect(data.skills).toHaveLength(12);
  for (const skill of data.skills) {
    expect(document).toContain(instructionDisplay(skill.instructions));
    expect(document).toContain(skill.report.packageDigest);
    expect(document).toContain(skill.report.safety.concerns);
  }
  expect(
    document.match(/\[ \] Approve · \[ \] Reject · \[ \] Defer/g),
  ).toHaveLength(12);
  expect(document.match(/Reviewer: __________/g)).toHaveLength(12);
});
it('contains every notice case with exact evidence and distinguishes stale local versions from locked dependencies', () => {
  expect(data.triage).toHaveLength(11);
  expect(data.noticeScope).toEqual({ active: 8, historical: 3 });
  expect(
    data.triage.filter((item) => item.evidenceStatus === 'active-inventory'),
  ).toHaveLength(8);
  for (const item of data.triage.filter(
    (item) => item.evidenceStatus === 'historical-only',
  )) {
    expect(item.role).toBe('historical-only');
    expect(item.distributedIn).toEqual([]);
    expect(item.evidenceSource.path).toBe(preservedEvidencePath);
  }
  expect(
    data.triage.filter((item) => item.name !== 'react-remove-scroll-bar'),
  ).toHaveLength(10);
  for (const name of ['keyv', 'react-remove-scroll-bar', 'stackback'])
    expect(
      data.triage.find((item) => item.name === name)?.lockHeadings,
    ).toEqual([]);
  // Removed from the lockfile, not resolved: the case stays undecided and keeps
  // its recorded cross-version exception.
  const removed = data.triage.find(
    (item) => item.key === 'react-remove-scroll-bar@2.3.8',
  );
  expect(removed?.evidenceStatus).toBe('historical-only');
  expect(removed?.disposition).toBeNull();
  expect(removed?.reviewer).toBeNull();
  expect(removed?.recordedException?.sourceVersion).toBe('2.3.7');
  const document = decisionPackageFiles(data).get('DEPENDENCY_TRIAGE.md')!;
  for (const item of data.triage) {
    expect(document).toContain(item.key);
    expect(document).toContain(item.manifestSha256);
    expect(document).toContain(item.question);
    expect(item.disposition).toBeNull();
  }
  expect(
    dependencyClass(
      'react-remove-scroll-bar',
      '2.3.8',
      [
        {
          root: 'apps/web/dist',
          manifest: { path: 'manifest.json', sha256: 'a'.repeat(64) },
          dependencies: [
            {
              name: 'react-remove-scroll-bar',
              version: '2.3.8',
              manifestSha256: 'b'.repeat(64),
            },
          ],
          buildCommit: null,
        },
      ],
      true,
    ).role,
  ).toBe('distributed-runtime');
  expect(
    dependencyClass(
      'keyv',
      '4.5.4',
      [
        {
          root: 'apps/web/dist',
          manifest: { path: 'manifest.json', sha256: 'a'.repeat(64) },
          dependencies: [],
          buildCommit: null,
        },
      ],
      false,
    ).role,
  ).toBe('unreferenced-local-record');
  expect(dependencyClass('saxes', '6.0.0', [], true).role).toBe(
    'distribution-unobserved',
  );
});
it('produces an unsigned planning manifest that cannot be parsed as an actual approval', () => {
  const manifest = unsignedReleaseManifest(data);
  expect(manifest.authorization).toMatchObject({
    state: 'unsigned',
    authorizedBy: null,
    authorizedAt: null,
    signature: null,
  });
  expect(
    Object.values(manifest.authorization.actions).every(
      (value) => value === null,
    ),
  ).toBe(true);
  expect(
    manifest.skills.every(
      (skill) =>
        skill.ownerDecision === null &&
        skill.reviewer === null &&
        skill.reviewedAt === null,
    ),
  ).toBe(true);
  expect(maintainerReviewSchema.safeParse(manifest).success).toBe(false);
  expect(publicationRegistrySchema.safeParse(manifest).success).toBe(false);
  expect(manifest.observedArtifacts.buildCommit).toBeNull();
  for (const [index, skill] of data.skills.entries())
    expect(manifest.skills[index].instructions).toBe(skill.instructions);
});
it('binds snapshot hashes to exact bytes and rejects traversal', async () => {
  const root = await mkdtemp(
    join(await realpath(tmpdir()), 'osk-owner-snapshot-'),
  );
  directories.push(root);
  await writeFile(join(root, 'input.txt'), 'first');
  const before = await sourceSnapshot(root, ['input.txt']);
  await writeFile(join(root, 'input.txt'), 'changed');
  expect((await sourceSnapshot(root, ['input.txt'])).sha256).not.toBe(
    before.sha256,
  );
  for (const path of [
    '../escape.txt',
    'C:\\outside\\secret.txt',
    '\\\\server\\share\\secret.txt',
  ])
    await expect(sourceSnapshot(root, [path])).rejects.toThrow(
      'escapes repository',
    );
});
it('preserves changed owner paperwork, fails freshness checks and never creates approval directories', async () => {
  const root = await mkdtemp(
    join(await realpath(tmpdir()), 'osk-owner-worksheet-'),
  );
  directories.push(root);
  const files = new Map([
    ['README.md', 'Unsigned owner notes.\n'],
    ['release-manifest.unsigned.json', '{"authorization":null}\n'],
  ]);
  await writeDecisionFiles(root, files);
  await writeDecisionFiles(root, files, true);
  await writeFile(
    join(root, packetDirectory, 'README.md'),
    'Owner-entered decision notes must be retained.\n',
  );
  await expect(writeDecisionFiles(root, files)).rejects.toThrow(
    'changed owner paperwork',
  );
  await expect(writeDecisionFiles(root, files, true)).rejects.toThrow(
    'changed owner paperwork',
  );
  expect(
    await readFile(join(root, packetDirectory, 'README.md'), 'utf8'),
  ).toContain('Owner-entered');
  expect(await readdir(root)).toEqual(['docs']);
});
it('collecting and rendering the real packet leaves all actual approvals and source statuses untouched', async () => {
  const root = resolve('.'),
    before = await readFile(
      join(root, 'catalog/publication-reviews.json'),
      'utf8',
    ),
    records = await readdir(join(root, 'reviews/maintainer'));
  const again = await collectOwnerDecisionData(root, { artifactRoots: [] });
  decisionPackageFiles(again);
  expect(again.counts).toEqual({ source: 42, drafts: 42, approved: 0 });
  expect(
    await readFile(join(root, 'catalog/publication-reviews.json'), 'utf8'),
  ).toBe(before);
  expect(await readdir(join(root, 'reviews/maintainer'))).toEqual(records);
});

async function noticeFixture() {
  const root = await mkdtemp(
    join(await realpath(tmpdir()), 'osk-owner-notices-'),
  );
  directories.push(root);
  const path = join(root, preservedEvidencePath);
  await mkdir(join(root, 'docs/owner-decision'), { recursive: true });
  const bytes = await readFile(resolve(preservedEvidencePath));
  await writeFile(path, bytes);
  const inventory = JSON.parse(
    await readFile(resolve('docs/launch/PROVENANCE_INVENTORY.json'), 'utf8'),
  );
  return { root, path, bytes, inventory };
}
it('rejects altered historical evidence without modifying preserved worksheets', async () => {
  const { root, path, bytes, inventory } = await noticeFixture();
  await noticeEvidence(root, inventory);
  await writeFile(path, Buffer.concat([bytes, Buffer.from(' ')]));
  await expect(noticeEvidence(root, inventory)).rejects.toThrow(
    'historical notice evidence changed',
  );
});
it('rejects linked historical evidence rather than following it', async () => {
  const { root, path, bytes, inventory } = await noticeFixture();
  await rm(path);
  await writeFile(join(root, 'external.json'), bytes);
  await symlink(join(root, 'external.json'), path);
  await expect(noticeEvidence(root, inventory)).rejects.toThrow(
    'Unsafe preserved',
  );
});
it('fails closed for changed active scope or restoration of obsolete versions', async () => {
  const { root, inventory } = await noticeFixture();
  const missing = structuredClone(inventory);
  missing.unresolvedDependencyNotices.pop();
  await expect(noticeEvidence(root, missing)).rejects.toThrow(
    'Active notice scope changed',
  );
  const restored = structuredClone(inventory);
  const historical = JSON.parse(
    await readFile(resolve(preservedEvidencePath), 'utf8'),
  );
  restored.dependencies.push(
    historical.triage.find(
      (item: { key: string }) => item.key === 'keyv@4.5.4',
    ),
  );
  await expect(noticeEvidence(root, restored)).rejects.toThrow(
    'must not be restored',
  );
});
it('records a real baseline ancestor and rejects fabricated commit identifiers', () => {
  expect(checkedBaselineHead(resolve('.'), data.head)).toBe(data.head);
  expect(() => checkedBaselineHead(resolve('.'), '0'.repeat(40))).toThrow(
    'not an ancestor',
  );
  expect(() => checkedBaselineHead(resolve('.'), '../escape')).toThrow(
    'Invalid owner',
  );
});
it('renders the refreshed packet separately with no automatic deployment claim', () => {
  expect(packetDirectory).toBe('docs/owner-decision/current');
  const files = decisionPackageFiles(data);
  expect(files.get('README.md')).toContain(
    'parent worksheets remain byte-for-byte unchanged',
  );
  expect(files.get('DEPENDENCY_TRIAGE.md')).toContain(
    '8 active inventory cases',
  );
  expect(files.get('DEPENDENCY_TRIAGE.md')).toContain(
    '3 historical-only cases',
  );
  expect(files.get('RELEASE_AUTHORIZATION.md')).toContain(
    'do not deploy or publish',
  );
  expect(files.get('RELEASE_AUTHORIZATION.md')).not.toContain(
    'can deploy once configuration',
  );
  expect(files.get('SKILL_DECISIONS.md')).toContain('../../../skills/');
});
