import { test, expect, type Page } from '@playwright/test';
import { readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { createReleaseFixture } from '../helpers/release-fixture';
import { buildMarketplace } from '../../scripts/build-marketplace';
import { regenerateCatalog } from '../../scripts/catalog';
import { checkContributions } from '../../scripts/check-contributions';
import { publicationDigest } from '../../packages/catalog-indexer/src/index';
import { discoveryCatalogSchema } from '../../packages/skill-schema/src/index';
let fixture: Awaited<ReturnType<typeof createReleaseFixture>>;
let originalLedger: string;
test.beforeAll(async () => {
  originalLedger = await readFile(
    resolve('catalog/publication-reviews.json'),
    'utf8',
  );
});
test.beforeEach(async () => {
  fixture = await createReleaseFixture();
});
test.afterEach(async () => {
  await rm(fixture.root, { recursive: true, force: true });
});
test.afterAll(async () => {
  expect(
    await readFile(resolve('catalog/publication-reviews.json'), 'utf8'),
  ).toBe(originalLedger);
  const real = discoveryCatalogSchema.parse(
    JSON.parse(await readFile(resolve('catalog/catalog.json'), 'utf8')),
  );
  expect(real.skills).toHaveLength(42);
  expect(real.skills.every((skill) => skill.status === 'draft')).toBe(true);
});
// Only these two static data requests are routed to real pipeline outputs from
// the disposable synthetic repository. React, navigation and ZIP downloads run normally.
async function serveGenerated(page: Page) {
  for (const name of ['catalog.json', 'published.json'])
    await page.route(`**/${name}`, async (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: await readFile(
          join(fixture.root, 'apps/web/public', name),
          'utf8',
        ),
      }),
    );
}
async function downloadedFiles(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  const download = await pending;
  const entries = unzipSync(await readFile((await download.path())!));
  expect(download.suggestedFilename()).toBe('example-skill.zip');
  expect(
    Object.keys(entries).every(
      (path) => path.startsWith('example-skill/') && !path.includes('..'),
    ),
  ).toBe(true);
  return Object.fromEntries(
    Object.entries(entries).map(([path, bytes]) => [
      path.slice('example-skill/'.length),
      strFromU8(bytes),
    ]),
  );
}
test('synthetic approved-only generation reaches the marketplace without admitting drafts or pending submissions', async ({
  page,
}) => {
  const result = await buildMarketplace(fixture.root);
  expect(result.published.skills.map((skill) => skill.id)).toEqual([
    fixture.id,
  ]);
  expect(result.marketplace.skills.map((skill) => skill.id).sort()).toEqual(
    [fixture.id, fixture.unapproved].sort(),
  );
  expect(
    await readdir(join(fixture.root, 'apps/web/public/downloads')),
  ).toEqual(['example-skill.zip']);
  await serveGenerated(page);
  await page.goto('/published');
  await expect(
    page.getByRole('link', {
      name: 'Synthetic approved release fixture',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'Synthetic unapproved source fixture',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', {
      name: 'Synthetic rejected submission fixture',
      exact: true,
    }),
  ).toHaveCount(0);
  await page.goto('/skills');
  await expect(
    page.getByRole('link', {
      name: 'Synthetic unapproved source fixture',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Draft/source library · these packages are not approved publications.',
      { exact: false },
    ),
  ).toBeVisible();
});
test('synthetic approved browser and static ZIPs preserve every reviewed package file and full digest', async ({
  page,
}) => {
  await buildMarketplace(fixture.root);
  await serveGenerated(page);
  await page.goto('/published');
  await page
    .getByRole('link', {
      name: 'Synthetic approved release fixture',
      exact: true,
    })
    .click();
  const browserFiles = await downloadedFiles(page);
  expect(browserFiles).toEqual(fixture.files);
  expect(publicationDigest(browserFiles)).toBe(fixture.review.packageDigest);
  const entries = unzipSync(
    await readFile(
      join(fixture.root, 'apps/web/public/downloads/example-skill.zip'),
    ),
  );
  const staticFiles = Object.fromEntries(
    Object.entries(entries).map(([path, bytes]) => [
      path.slice('example-skill/'.length),
      strFromU8(bytes),
    ]),
  );
  expect(staticFiles).toEqual(fixture.files);
  expect(publicationDigest(staticFiles)).toBe(fixture.review.packageDigest);
});
test('rejected synthetic proposals and rejected decision flags cannot enter generated publications', async ({
  page,
}) => {
  const metadataPath = `submissions/${fixture.rejected}/metadata.json`;
  const metadata = JSON.parse(
    await readFile(join(fixture.root, metadataPath), 'utf8'),
  );
  await fixture.put(
    metadataPath,
    JSON.stringify({ ...metadata, status: 'published' }),
  );
  const checks = await checkContributions(fixture.root);
  expect(checks.valid).toBe(false);
  expect(
    checks.errors.some(
      (error) =>
        error.path.endsWith('submission.json') &&
        error.message.includes('remain draft'),
    ),
  ).toBe(true);
  // The publication ledger's schema cannot represent rejection as approval.
  await fixture.writeRegistry({
    schemaVersion: 1,
    decisions: [{ ...fixture.registry.decisions[0], decision: 'rejected' }],
  });
  await expect(regenerateCatalog(fixture.root)).rejects.toThrow();
  await fixture.writeRegistry({ schemaVersion: 1, decisions: [] });
  await buildMarketplace(fixture.root);
  expect(
    await readdir(join(fixture.root, 'apps/web/public/downloads')),
  ).toEqual([]);
  const published = JSON.parse(
    await readFile(
      join(fixture.root, 'apps/web/public/published.json'),
      'utf8',
    ),
  );
  expect(published.skills).toEqual([]);
  expect(JSON.stringify(published)).not.toContain('rejected-fixture');
  await serveGenerated(page);
  await page.goto('/published');
  await expect(
    page.getByRole('heading', { name: 'No skills found' }),
  ).toBeVisible();
  await page.goto(`/skills/${fixture.rejected}`);
  await expect(
    page.getByRole('heading', { name: 'Skill not found' }),
  ).toBeVisible();
});
test('revoking a synthetic approval removes its publication and generated archive on rebuild', async ({
  page,
}) => {
  await buildMarketplace(fixture.root);
  await serveGenerated(page);
  await page.goto('/published');
  await expect(
    page.getByRole('link', {
      name: 'Synthetic approved release fixture',
      exact: true,
    }),
  ).toBeVisible();
  await fixture.writeRegistry({
    schemaVersion: 1,
    decisions: [
      {
        ...fixture.registry.decisions[0],
        decision: 'withdrawn',
        reviewRecord: undefined,
      },
    ],
  });
  await buildMarketplace(fixture.root);
  expect(
    await readdir(join(fixture.root, 'apps/web/public/downloads')),
  ).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole('link', {
      name: 'Synthetic approved release fixture',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'No skills found' }),
  ).toBeVisible();
});
test('stale synthetic package hashes stop export and cannot replace previously reviewed browser downloads', async ({
  page,
}) => {
  await buildMarketplace(fixture.root);
  const before = await readFile(
    join(fixture.root, 'apps/web/public/published.json'),
    'utf8',
  );
  const examplePath = Object.keys(fixture.files).find((path) =>
    path.startsWith('examples/'),
  )!;
  await fixture.put(
    `skills/${fixture.id}/${examplePath}`,
    fixture.files[examplePath] + '\nUnapproved changed bytes.\n',
  );
  await expect(buildMarketplace(fixture.root)).rejects.toThrow(
    'Evidence hash changed',
  );
  expect(
    await readFile(
      join(fixture.root, 'apps/web/public/published.json'),
      'utf8',
    ),
  ).toBe(before);
  await serveGenerated(page);
  await page.goto('/published');
  await page
    .getByRole('link', {
      name: 'Synthetic approved release fixture',
      exact: true,
    })
    .click();
  expect(await downloadedFiles(page)).toEqual(fixture.files);
  // A failed build does not create or deploy a new artifact. The prior artifact
  // retains only its previous reviewed bytes, never the changed source.
});
test('a missing published catalog fails closed instead of falling back to the source drafts', async ({
  page,
}) => {
  await buildMarketplace(fixture.root);
  await serveGenerated(page);
  await page.route('**/published.json', (route) =>
    route.fulfill({ status: 503, body: 'Fixture-only unavailable catalog' }),
  );
  await page.goto('/published');
  await expect(page.getByRole('alert')).toContainText(
    'Published catalog unavailable',
  );
  await expect(
    page.getByRole('link', {
      name: 'Synthetic unapproved source fixture',
      exact: true,
    }),
  ).toHaveCount(0);
});
