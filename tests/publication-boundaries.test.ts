import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { afterEach, it, expect } from 'vitest';
import {
  readFile,
  writeFile,
  rm,
  mkdir,
  mkdtemp,
  realpath,
  copyFile,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { createReleaseFixture } from './helpers/release-fixture';
import {
  buildCatalog,
  generateCatalog,
  readPublicationRegistry,
  publishedCatalog,
  isApprovedPackage,
  publicationDigest,
} from '../packages/catalog-indexer/src/index';
import { buildMarketplace } from '../scripts/build-marketplace';
import { createSkillZip } from '../apps/web/src/lib/download';
import {
  provenanceInventory,
  provenanceDrift,
  writeProvenanceInventory,
} from '../scripts/audit-provenance';
const temporary: string[] = [];
afterEach(async () => {
  for (const path of temporary.splice(0))
    await rm(path, { recursive: true, force: true });
});
it('includes the existing MIT notice in all 42 ZIPs and invalidates every pre-notice package digest', async () => {
  const catalog = (await generateCatalog(resolve('skills'))).catalog;
  const previous = JSON.parse(
    await readFile(resolve('reviews/founding/license-migration.json'), 'utf8'),
  ).previousPackages;
  const notice = await readFile(resolve('LICENSE'), 'utf8');
  expect(catalog.skills).toHaveLength(42);
  for (const skill of catalog.skills) {
    const archive = unzipSync(createSkillZip(skill));
    expect(strFromU8(archive[`${skill.slug}/LICENSE.txt`])).toBe(notice);
    const oldFiles = { ...skill.files };
    delete oldFiles['LICENSE.txt'];
    expect(publicationDigest(oldFiles)).toBe(previous[skill.id]);
    expect(publicationDigest(skill.files)).not.toBe(previous[skill.id]);
    expect(skill.status).toBe('draft');
  }
});
it('does not promote unreviewed published flags through direct, legacy or copied registry objects', async () => {
  const fixture = await createReleaseFixture();
  temporary.push(fixture.root);
  const valid = await readPublicationRegistry(fixture.root);
  const source = (await generateCatalog(join(fixture.root, 'skills'))).catalog;
  expect(publishedCatalog(source, valid).skills).toHaveLength(1);
  await fixture.put(
    `skills/${fixture.id}/unreviewed.txt`,
    'Unreviewed added package content',
  );
  expect(isApprovedPackage(fixture.id, fixture.files, 'published', valid)).toBe(
    false,
  );
  await rm(join(fixture.root, 'skills', fixture.id, 'unreviewed.txt'));
  expect(publishedCatalog(source, valid).skills).toHaveLength(1);
  expect(() => publishedCatalog(source, structuredClone(valid))).toThrow(
    'validated immutable',
  );
  expect(
    isApprovedPackage(
      fixture.id,
      fixture.files,
      'published',
      structuredClone(valid),
    ),
  ).toBe(false);
  await fixture.writeRegistry({ schemaVersion: 1, decisions: [] });
  expect(() => publishedCatalog(source, valid)).toThrow('validated immutable');
  expect(isApprovedPackage(fixture.id, fixture.files, 'published', valid)).toBe(
    false,
  );
  expect(
    (await buildCatalog(join(fixture.root, 'skills'))).catalog.skills,
  ).toEqual([]);
  expect(
    (
      await buildCatalog(join(fixture.root, 'skills'), { includeDrafts: true })
    ).catalog.skills.every((entry) => entry.metadata.status !== 'published'),
  ).toBe(true);
  expect((await buildMarketplace(fixture.root)).published.skills).toEqual([]);
  await fixture.writeRegistry(fixture.registry);
  await writeFile(
    join(fixture.root, 'skills', fixture.id, 'SKILL.md'),
    fixture.files['SKILL.md'] + '\nchanged',
  );
  await expect(buildCatalog(join(fixture.root, 'skills'))).rejects.toThrow(
    'Evidence hash changed',
  );
  await expect(buildMarketplace(fixture.root)).rejects.toThrow(
    'Evidence hash changed',
  );
  expect(() => publishedCatalog(source, valid)).toThrow('validated immutable');
});
it('retains declared rights and missing upstream evidence as human-confirmation items, never approvals', async () => {
  const inventory = await provenanceInventory(resolve('.'));
  expect(inventory.skills).toHaveLength(42);
  expect(inventory.dependencies.length).toBeGreaterThan(300);
  expect(
    inventory.skills.every(
      (skill) => skill.rightsConfirmation === 'pending-human-confirmation',
    ),
  ).toBe(true);
  expect(inventory.unresolvedDependencyNotices.length).toBeGreaterThan(0);
  for (const entry of inventory.unresolvedDependencyNotices)
    expect(entry.status).toBe('human-confirmation-required');
  // react-remove-scroll-bar@2.3.8 (override-only, 2.3.7-sourced notice) is no
  // longer locked or distributed; its historical evidence stays retained.
  const committed = JSON.parse(
    await readFile(resolve('docs/launch/PROVENANCE_INVENTORY.json'), 'utf8'),
  ) as typeof inventory;
  for (const records of [
    committed.dependencies,
    committed.unresolvedDependencyNotices,
  ])
    expect(
      records.some((entry) => entry.name === 'react-remove-scroll-bar'),
    ).toBe(false);
  expect(committed.thirdParty.map((entry) => entry.path)).toEqual(
    expect.arrayContaining([
      'third-party/license-overrides.json',
      'third-party/react-remove-scroll-bar-2.3.8-LICENSE.txt',
    ]),
  );
});

async function licensingFixture() {
  const root = await mkdtemp(
    join(await realpath(tmpdir()), 'osk-notice-drift-'),
  );
  temporary.push(root);
  for (const directory of [
    'skills',
    'third-party',
    'docs/launch',
    'node_modules/.pnpm',
  ])
    await mkdir(join(root, directory), { recursive: true });
  await writeFile(join(root, 'LICENSE'), 'Synthetic fixture MIT notice.');
  await writeFile(
    join(root, 'pnpm-lock.yaml'),
    'synthetic frozen lock evidence',
  );
  await writeFile(join(root, 'third-party/license-overrides.json'), '{}');
  async function dependency(version = '1.0.0') {
    const directory = join(
      root,
      `node_modules/.pnpm/fixture@${version}/node_modules/fixture`,
    );
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ name: 'fixture', version, license: 'MIT' }),
    );
    await writeFile(join(directory, 'LICENSE'), 'Synthetic dependency notice');
    return directory;
  }
  const directory = await dependency();
  const inventory = await provenanceInventory(root);
  const path = join(root, 'docs/launch/PROVENANCE_INVENTORY.json');
  const bytes = JSON.stringify(inventory, null, 2) + '\n';
  await writeFile(path, bytes);
  return { root, directory, dependency, inventory, path, bytes };
}
it.each([
  'extra',
  'missing',
  'version',
  'manifest',
  'notice',
  'source',
] as const)(
  'reports %s drift without rewriting canonical evidence or accepting a mismatch',
  async (kind) => {
    const fixture = await licensingFixture();
    await writeProvenanceInventory(fixture.root, true);
    if (kind === 'extra') await fixture.dependency('0.5.0');
    if (kind === 'missing') await rm(fixture.directory, { recursive: true });
    if (kind === 'version' || kind === 'manifest')
      await writeFile(
        join(fixture.directory, 'package.json'),
        JSON.stringify({
          name: 'fixture',
          version: kind === 'version' ? '2.0.0' : '1.0.0',
          license: kind === 'manifest' ? 'Apache-2.0' : 'MIT',
        }),
      );
    if (kind === 'notice')
      await writeFile(
        join(fixture.directory, 'LICENSE'),
        'Altered fixture notice',
      );
    if (kind === 'source')
      await writeFile(
        join(fixture.root, 'pnpm-lock.yaml'),
        'unreviewed lock change',
      );
    const actual = await provenanceInventory(fixture.root);
    const before = JSON.stringify([fixture.inventory, actual]);
    const diagnostic = provenanceDrift(fixture.inventory, actual)!;
    expect(JSON.stringify([fixture.inventory, actual])).toBe(before);
    const expected = {
      extra: 'Extra installed dependency records (1)',
      missing: 'Missing expected dependency records (1)',
      version: 'Changed version evidence (1)',
      manifest: 'Changed manifest/notice evidence (1)',
      notice: 'Changed manifest/notice evidence (1)',
      source: 'Canonical/source fields changed: lockfileSha256',
    }[kind];
    expect(diagnostic).toContain(expected);
    if (kind === 'extra')
      expect(diagnostic).toContain('Possible obsolete local installation');
    else
      expect(diagnostic).not.toContain('Possible obsolete local installation');
    if (kind === 'manifest') expect(diagnostic).toContain('manifestSha256');
    if (kind === 'notice') expect(diagnostic).toContain('notices');
    await expect(writeProvenanceInventory(fixture.root, true)).rejects.toThrow(
      expected,
    );
    expect(await readFile(fixture.path, 'utf8')).toBe(fixture.bytes);
  },
);
it('retains host-scoped comparison without mutating evidence or ignoring source changes', async () => {
  const { inventory } = await licensingFixture();
  const other = structuredClone(inventory);
  other.dependencyInventoryPlatform = 'synthetic-other-platform';
  other.dependencies = [];
  const before = JSON.stringify([inventory, other]);
  expect(provenanceDrift(inventory, other)).toBeNull();
  expect(JSON.stringify([inventory, other])).toBe(before);
  other.lockfileSha256 = '0'.repeat(64);
  expect(provenanceDrift(inventory, other)).toContain(
    'Canonical/source evidence drift: lockfileSha256',
  );
  expect(provenanceDrift(inventory, other)).toContain(
    'not compared across inventory platforms',
  );
});
it('does not hide altered notice-case evidence or duplicate installed manifests', async () => {
  const { inventory } = await licensingFixture();
  const changed = structuredClone(inventory);
  changed.unresolvedDependencyNotices.push({
    name: 'fixture',
    version: '1.0.0',
    declaredLicense: 'MIT',
    recordedException: null,
    status: 'human-confirmation-required',
  });
  expect(provenanceDrift(inventory, changed)).not.toBeNull();
  expect(provenanceDrift(inventory, changed)).not.toContain(
    'Possible obsolete local installation',
  );
  const duplicate = structuredClone(inventory);
  duplicate.dependencies.push({
    ...duplicate.dependencies[0],
    manifestSha256: 'f'.repeat(64),
  });
  expect(provenanceDrift(inventory, duplicate)).toContain(
    'Extra installed dependency records (1)',
  );
  expect(provenanceDrift(inventory, duplicate)).not.toContain(
    'Possible obsolete local installation',
  );
  expect(provenanceDrift(inventory, changed)).toContain(
    'Unresolved notice-case evidence changed: yes',
  );
});

it.each(['validated', 'drift'] as const)(
  'returns the actual CLI exit code for a %s installation without rewriting canonical evidence',
  async (mode) => {
    const fixture = await licensingFixture();
    await mkdir(join(fixture.root, 'scripts'));
    // Exact CLI source, with its normal root-relative lookup in a disposable tree.
    for (const name of ['audit-provenance.ts', 'third-party-notices.ts'])
      await copyFile(
        resolve('scripts', name),
        join(fixture.root, 'scripts', name),
      );
    await writeFile(
      join(fixture.root, 'package.json'),
      '{"private":true,"type":"module"}',
    );
    // A Windows junction avoids file-symlink privileges; dependencies stay read-only.
    await symlink(
      resolve('packages'),
      join(fixture.root, 'packages'),
      'junction',
    );
    if (mode === 'drift') await fixture.dependency('0.5.0');
    const loader = createRequire(resolve('package.json')).resolve('tsx');
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        pathToFileURL(loader).href,
        join(fixture.root, 'scripts/audit-provenance.ts'),
        '--check',
      ],
      {
        cwd: fixture.root,
        encoding: 'utf8',
        timeout: 10_000,
        env: { ...process.env, TSX_DISABLE_CACHE: '1' },
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(mode === 'validated' ? 0 : 1);
    if (mode === 'validated')
      expect(result.stdout).toContain('Provenance inventory checks complete');
    else
      expect(result.stderr).toContain('Extra installed dependency records (1)');
    expect(await readFile(fixture.path, 'utf8')).toBe(fixture.bytes);
  },
  // The subprocess has its own hard deadline; allow time to report a timeout failure.
  15_000,
);
