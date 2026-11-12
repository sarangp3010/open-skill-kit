import { afterEach, it, expect } from 'vitest';
import {
  mkdtemp,
  mkdir,
  cp,
  readFile,
  writeFile,
  rm,
  realpath,
  symlink,
  access,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { assertReleaseLicenseEvidence } from '../scripts/release-license-gate';
import {
  thirdPartyNotices,
  dependencyNoticeRecord,
} from '../scripts/third-party-notices';
import { buildNpmPackage } from '../scripts/build-npm';
import { createReleaseFixture } from './helpers/release-fixture';
import { buildCatalog } from '../packages/catalog-indexer/src/index';
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function evidenceFixture() {
  const root = await mkdtemp(
    join(await realpath(tmpdir()), 'osk-release-license-'),
  );
  roots.push(root);
  await mkdir(join(root, 'docs/launch'), { recursive: true });
  for (const path of ['LICENSE', 'pnpm-lock.yaml'])
    await cp(resolve(path), join(root, path));
  await cp(resolve('third-party'), join(root, 'third-party'), {
    recursive: true,
  });
  const inventory = JSON.parse(
    await readFile(resolve('docs/launch/PROVENANCE_INVENTORY.json'), 'utf8'),
  );
  const path = join(root, 'docs/launch/PROVENANCE_INVENTORY.json');
  async function save() {
    await writeFile(path, JSON.stringify(inventory));
  }
  await save();
  return { root, inventory, path, save };
}
async function observedDependency(name: string) {
  const { readdir } = await import('node:fs/promises');
  const base = resolve('node_modules/.pnpm');
  const directory = (await readdir(base)).find((x) =>
    x.startsWith(name + '@'),
  )!;
  const packageRoot = join(base, directory, 'node_modules', name);
  const record = await dependencyNoticeRecord(packageRoot);
  return {
    record,
    packageRoot,
    locations: new Map([[`${record.name}@${record.version}`, packageRoot]]),
  };
}
it('allows complete ordinary exact-release notice evidence, without creating an approval', async () => {
  const f = await evidenceFixture();
  const { record, locations } = await observedDependency('fflate');
  const before = await readFile(f.path, 'utf8');
  await assertReleaseLicenseEvidence(f.root, [record], locations);
  expect(await readFile(f.path, 'utf8')).toBe(before);
});
it('local notice collection succeeds while unresolved cross-version release evidence fails', async () => {
  const f = await evidenceFixture();
  const { record, packageRoot, locations } = await observedDependency(
    'react-remove-scroll-bar',
  );
  const notices = await thirdPartyNotices(
    [join(packageRoot, 'dist/es2015/index.js')],
    join(f.root, 'third-party'),
  );
  expect(notices).toContain('Provenance limitation:');
  expect(notices).toContain('source version: 2.3.7; dependency version: 2.3.8');
  await expect(
    assertReleaseLicenseEvidence(f.root, [record], locations),
  ).rejects.toThrow('human confirmation required');
  // A matching declaration and hash do not create a clearance path for override-only evidence.
  f.inventory.unresolvedDependencyNotices =
    f.inventory.unresolvedDependencyNotices.filter(
      (x: { name: string }) => x.name !== record.name,
    );
  await f.save();
  await expect(
    assertReleaseLicenseEvidence(f.root, [record], locations),
  ).rejects.toThrow('missing exact-release packaged notice');
});
it.each([
  'pending',
  'missing',
  'invalid-notice',
  'manifest',
  'stale-lock',
  'unknown-status',
] as const)(
  'rejects %s licensing evidence independently of skill authorization',
  async (kind) => {
    const f = await evidenceFixture();
    const { record, locations } = await observedDependency('fflate');
    const dependency = structuredClone(record);
    if (kind === 'pending' || kind === 'unknown-status')
      f.inventory.unresolvedDependencyNotices.push({
        name: record.name,
        version: record.version,
        status: kind === 'pending' ? 'human-confirmation-required' : 'approved',
      });
    if (kind === 'missing') dependency.notices = [];
    if (kind === 'invalid-notice') dependency.notices[0].sha256 = 'invalid';
    if (kind === 'manifest') dependency.manifestSha256 = '0'.repeat(64);
    if (kind === 'stale-lock')
      await writeFile(join(f.root, 'pnpm-lock.yaml'), 'changed');
    await f.save();
    await expect(
      assertReleaseLicenseEvidence(f.root, [dependency], locations),
    ).rejects.toThrow('Release licensing blocked');
  },
);
it('blocks release output despite otherwise valid existing publication authorization', async () => {
  const fixture = await createReleaseFixture();
  roots.push(fixture.root);
  const evidence = await evidenceFixture();
  for (const path of ['LICENSE', 'pnpm-lock.yaml'])
    await cp(join(evidence.root, path), join(fixture.root, path));
  await cp(
    join(evidence.root, 'third-party'),
    join(fixture.root, 'third-party'),
    { recursive: true },
  );
  await mkdir(join(fixture.root, 'docs/launch'), { recursive: true });
  await cp(resolve('package.json'), join(fixture.root, 'package.json'));
  await symlink(
    resolve('packages'),
    join(fixture.root, 'packages'),
    'junction',
  );
  await symlink(
    resolve('node_modules'),
    join(fixture.root, 'node_modules'),
    'junction',
  );
  // Only this disposable inventory is altered; actual canonical evidence remains untouched.
  const diagnostic = join(fixture.root, 'diagnostic/dist/npm');
  await buildNpmPackage(fixture.root, diagnostic);
  const record = JSON.parse(
    await readFile(join(diagnostic, 'DEPENDENCY_MANIFEST.json'), 'utf8'),
  ).dependencies[0];
  expect(record).toBeDefined();
  evidence.inventory.unresolvedDependencyNotices.push({
    name: record.name,
    version: record.version,
    status: 'human-confirmation-required',
  });
  await writeFile(
    join(fixture.root, 'docs/launch/PROVENANCE_INVENTORY.json'),
    JSON.stringify(evidence.inventory),
  );
  const authorization = await buildCatalog(join(fixture.root, 'skills'));
  expect(authorization.catalog.skills).toHaveLength(1);
  const output = join(fixture.root, 'dist/npm');
  await expect(
    buildNpmPackage(fixture.root, output, undefined, { release: true }),
  ).rejects.toThrow('Release licensing blocked');
  await expect(access(join(output, 'package.json'))).rejects.toThrow();
  // Local diagnostic output remains possible but cannot be published normally.
  await buildNpmPackage(fixture.root, output);
  const manifest = JSON.parse(
    await readFile(join(output, 'package.json'), 'utf8'),
  );
  expect(manifest.private).toBe(true);
}, 20_000);

it.each(['', '   \n', '\0invalid'])(
  'rejects unusable notice material despite matching hashes (%j)',
  async (material) => {
    const f = await evidenceFixture();
    const observed = await observedDependency('fflate');
    const packageRoot = join(f.root, 'dependency');
    await cp(observed.packageRoot, packageRoot, { recursive: true });
    const notice = observed.record.notices[0].file;
    await writeFile(join(packageRoot, notice), material);
    const record = await dependencyNoticeRecord(packageRoot);
    f.inventory.dependencies = f.inventory.dependencies.map(
      (entry: { name: string; version: string }) =>
        entry.name === record.name && entry.version === record.version
          ? record
          : entry,
    );
    await f.save();
    await expect(
      assertReleaseLicenseEvidence(
        f.root,
        [record],
        new Map([[`${record.name}@${record.version}`, packageRoot]]),
      ),
    ).rejects.toThrow('invalid required license evidence');
  },
);
