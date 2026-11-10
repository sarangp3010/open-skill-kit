import { afterEach, it, expect } from 'vitest';
import { readFile, writeFile, rm } from 'node:fs/promises';
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
import { provenanceInventory } from '../scripts/audit-provenance';
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
  const missing = inventory.unresolvedDependencyNotices.find(
    (entry) => entry.name === 'react-remove-scroll-bar',
  );
  expect(missing).toMatchObject({
    version: '2.3.8',
    status: 'human-confirmation-required',
  });
  expect(missing?.recordedException.sourceVersion).toBe('2.3.7');
});
