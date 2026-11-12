import { cp, mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  foundingReports,
  generateFoundingReview,
  unsignedReviewTemplate,
  type FoundingReport,
} from '../scripts/founding-review';
import { generateOwnerReview } from '../scripts/release-review';
import { regenerateCatalog } from '../scripts/catalog';
import { buildMarketplace } from '../scripts/build-marketplace';
import {
  publicationDigest,
  readSkillFiles,
} from '../packages/catalog-indexer/src/index';
import { createReleaseFixture } from './helpers/release-fixture';
const root = resolve('.');
const temporary: string[] = [];
afterEach(async () => {
  for (const path of temporary.splice(0))
    await rm(path, { recursive: true, force: true });
});
describe('first public release review preparation', () => {
  it('summarizes all twelve shortlist purposes, full hashes, risks, evidence and pending approvals', async () => {
    // This checks freshness and returns the same fully validated content.
    const content = await generateOwnerReview(root, true);
    const reports = (await foundingReports(root)).filter(
      (report) => report.launchRecommendation.rank !== null,
    );
    expect(content.match(/^## \d+\./gm)).toHaveLength(12);
    for (const report of reports) {
      expect(content).toContain(report.packageDigest);
      expect(content).toContain(report.usefulness.proposedTask);
      expect(content).toContain(
        `declared risk **${report.safety.declaredRisk}**`,
      );
      expect(content).toContain(
        `reviews/founding/reports/${report.skillId}.json`,
      );
    }
    expect(content.match(/\*\*Evidence limits:\*\*/g)).toHaveLength(12);
    expect(content.match(/\*\*Approval still required:\*\*/g)).toHaveLength(12);
    expect(content).toContain(
      '**42 drafts**; **0 recorded publication approvals**',
    );
  });
  // Each operation gets an isolated copy and the same complete integrity
  // assertions. Avoid putting five full-library scans into one 5-second test.
  it.each(['founding review', 'owner review', 'catalog validation'] as const)(
    '%s preserves all 42 packages and creates no approval or attribution records',
    async (operation) => {
      const root = await mkdtemp(
        join(await realpath(tmpdir()), 'osk-review-operations-'),
      );
      temporary.push(root);
      await Promise.all(
        ['skills', 'catalog', 'evaluations', 'reviews'].map((name) =>
          cp(resolve(name), join(root, name), { recursive: true }),
        ),
      );
      // The committed packets are expected hashes, not an approval capability.
      // Check them against actual package bytes before AND after the operation.
      const reportDirectory = join(root, 'reviews/founding/reports');
      const before: FoundingReport[] = await Promise.all(
        (await readdir(reportDirectory, { recursive: true }))
          .filter((name) => name.endsWith('.json'))
          .map(async (name) =>
            JSON.parse(await readFile(join(reportDirectory, name), 'utf8')),
          ),
      );
      expect(before).toHaveLength(42);
      for (const report of before)
        expect(
          publicationDigest(
            await readSkillFiles(join(root, 'skills', report.skillId)),
          ),
        ).toBe(report.packageDigest);
      const ledger = await readFile(
        join(root, 'catalog/publication-reviews.json'),
        'utf8',
      );
      const attribution = await readFile(
        join(root, 'catalog/attributions.json'),
        'utf8',
      );
      const records = await readdir(join(root, 'reviews/maintainer'));
      if (operation === 'founding review') await generateFoundingReview(root);
      if (operation === 'owner review') await generateOwnerReview(root);
      const result = await regenerateCatalog(root, { validateOnly: true });
      for (const report of before) {
        const unsigned = unsignedReviewTemplate(report);
        expect(unsigned.reviewer).toBeNull();
        expect(unsigned.reviewedAt).toBeNull();
        expect(unsigned.decision).toBeNull();
        expect(
          publicationDigest(
            await readSkillFiles(join(root, 'skills', report.skillId)),
          ),
        ).toBe(report.packageDigest);
      }
      expect(result.published.skills).toEqual([]);
      expect(result.catalog.skills).toHaveLength(42);
      expect(
        result.catalog.skills.every((skill) => skill.status === 'draft'),
      ).toBe(true);
      expect(
        await readFile(join(root, 'catalog/publication-reviews.json'), 'utf8'),
      ).toBe(ledger);
      expect(
        await readFile(join(root, 'catalog/attributions.json'), 'utf8'),
      ).toBe(attribution);
      expect(await readdir(join(root, 'reviews/maintainer'))).toEqual(records);
    },
  );
  it('keeps the legacy export entry point on the current typed catalog and approval gate', async () => {
    const fixture = await createReleaseFixture();
    temporary.push(fixture.root);
    await fixture.writeRegistry({ schemaVersion: 1, decisions: [] });
    const result = await buildMarketplace(fixture.root);
    expect(result.marketplace.skills).toHaveLength(2);
    expect(result.published.skills).toEqual([]);
    expect(
      await readdir(join(fixture.root, 'apps/web/public/downloads')),
    ).toEqual([]);
    expect(
      JSON.parse(
        await readFile(
          join(fixture.root, 'apps/web/public/catalog.json'),
          'utf8',
        ),
      ),
    ).toEqual(result.marketplace);
    await fixture.writeRegistry(fixture.registry);
    const approved = await buildMarketplace(fixture.root);
    expect(approved.published.skills.map((skill) => skill.id)).toEqual([
      fixture.id,
    ]);
    expect(
      await readdir(join(fixture.root, 'apps/web/public/downloads')),
    ).toEqual(['example-skill.zip']);
  });
});
