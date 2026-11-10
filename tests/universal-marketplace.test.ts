import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import {
  broadSectors,
  canonicalSector,
  matchesSector,
  sectorsSchema,
  testCasesSchema,
  evaluationSuiteSchema,
  type DiscoveryCatalog,
} from '../packages/skill-schema/src/index';
import {
  generateCatalog,
  readEvaluationReports,
  readSkillFiles,
} from '../packages/catalog-indexer/src/index';
import {
  validateSkill,
  reproduceEvaluation,
} from '../packages/skill-validator/src/index';
import { runEvaluation } from '../packages/skill-evaluator/src/index';
import { selectSkills } from '../apps/web/src/lib/catalog';
import { createSkillZip } from '../apps/web/src/lib/download';

const plan = await readFile(resolve('docs/skill-expansion-plan.md'), 'utf8');
const proposals = [
  ...plan.matchAll(
    /^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|[^|]+\|\s*(Authored draft|Proposed)\s*\|/gm,
  ),
].map((match) => ({ id: match[1], state: match[2] }));
const authored = proposals
  .filter((item) => item.state === 'Authored draft')
  .map((item) => item.id);
const registry = sectorsSchema.parse(
  JSON.parse(await readFile(resolve('catalog/sectors.json'), 'utf8')),
);
const legacy = JSON.parse(
  await readFile(
    resolve('tests/fixtures/taxonomy/legacy-identities.json'),
    'utf8',
  ),
) as { sectors: string[]; skills: Record<string, Record<string, string>> };
let catalog: DiscoveryCatalog;
beforeAll(async () => {
  catalog = (
    await generateCatalog(resolve('skills'), registry, {
      evaluationReports: await readEvaluationReports(
        resolve('evaluations/reports'),
      ),
    })
  ).catalog;
});
describe('universal taxonomy and preserved identities', () => {
  it('has 20 broad sectors, valid specialized collections and 50 unique proposals with exactly 19 authored', () => {
    expect(broadSectors(registry)).toHaveLength(20);
    expect(proposals).toHaveLength(50);
    expect(new Set(proposals.map((item) => item.id)).size).toBe(50);
    expect(authored).toHaveLength(19);
    for (const item of proposals) {
      expect(
        registry.some(
          (sector) => sector.slug === item.id.split('/')[0] && !sector.aliasOf,
        ),
      ).toBe(true);
      expect(catalog.skills.some((skill) => skill.id === item.id)).toBe(
        item.state === 'Authored draft',
      );
    }
    for (const root of broadSectors(registry))
      expect(
        registry.filter((item) => item.parent === root.slug && !item.aliasOf)
          .length,
      ).toBeGreaterThanOrEqual(2);
  });
  it('preserves every legacy sector, source file and skill URL byte-for-byte', () => {
    for (const slug of legacy.sectors)
      expect(registry.some((item) => item.slug === slug)).toBe(true);
    for (const [id, files] of Object.entries(legacy.skills)) {
      const current = catalog.skills.find((skill) => skill.id === id)!;
      expect(current.sourcePath).toBe(`skills/${id}/SKILL.md`);
      expect(Object.keys(current.files).sort()).toEqual(
        Object.keys(files).sort(),
      );
      for (const [path, digest] of Object.entries(files))
        expect(
          createHash('sha256').update(current.files[path]).digest('hex'),
        ).toBe(digest);
    }
    expect(
      catalog.skills.find(
        (item) => item.id === 'software-development/code-reviewer',
      )?.evaluations?.[0],
    ).toMatchObject({ mode: 'fixture', verification: 'reproduced', delta: 0 });
  });
  it('assigns each package to exactly one broad sector and counts canonical aliases only once', () => {
    for (const skill of catalog.skills)
      expect(
        broadSectors(registry).filter((root) =>
          matchesSector(registry, skill.sector, root.slug),
        ),
      ).toHaveLength(1);
    const canonical = selectSkills(catalog, { sector: 'software-development' });
    const legacySelection = selectSkills(catalog, {
      sector: 'software-engineering',
    });
    expect(canonical.map((skill) => skill.id)).toEqual(
      legacySelection.map((skill) => skill.id),
    );
    expect(
      canonical.some((skill) => skill.sector === 'software-engineering'),
    ).toBe(true);
    expect(
      canonical.some((skill) => skill.sector === 'software-development'),
    ).toBe(true);
    expect(canonicalSector(registry, 'software-engineering')).toBe(
      'software-development',
    );
  });
  it('derives available/planned status from actual discoverable files, not registry promises', async () => {
    for (const sector of catalog.sectors) {
      const actual = selectSkills(catalog, { sector: sector.slug }).length;
      expect(sector.skillCount).toBe(actual);
      expect(sector.availability).toBe(actual ? 'available' : 'planned');
    }
    expect(selectSkills(catalog, { sector: 'healthcare-research' })).toEqual(
      [],
    );
    const altered = registry.map((item) => ({
      ...item,
      skillCount: 999,
      availability: 'available' as const,
    }));
    const rebuilt = (await generateCatalog(resolve('skills'), altered)).catalog;
    expect(
      rebuilt.sectors.find((item) => item.slug === 'healthcare-research'),
    ).toMatchObject({ availability: 'planned', skillCount: 0 });
  });
  it('uses parent-sector words in search and composes industry, specialty and existing filters', () => {
    const group = selectSkills(catalog, {
      broadSector: 'technology',
      status: 'draft',
      platform: 'codex',
    });
    expect(group.length).toBeGreaterThan(0);
    const specialized = selectSkills(catalog, {
      broadSector: 'technology',
      sector: 'software-development',
      query: 'Technology',
    });
    expect(specialized.map((skill) => skill.id)).toEqual(
      selectSkills(catalog, { sector: 'software-development' }).map(
        (skill) => skill.id,
      ),
    );
    expect(
      selectSkills(catalog, {
        broadSector: 'finance',
        sector: 'software-development',
      }),
    ).toEqual([]);
    expect(
      selectSkills(catalog, {
        broadSector: 'healthcare',
        testing: 'recorded-pass',
      }),
    ).toEqual([]);
  });
  it.each([
    'unknown-parent',
    'cycle',
    'alias-chain',
    'cross-sector-alias',
    'self-alias',
  ])('rejects malformed taxonomy: %s', (kind) => {
    const invalid = structuredClone(registry);
    const child = invalid.find((item) => item.slug === 'software-development')!;
    if (kind === 'unknown-parent') child.parent = 'absent';
    if (kind === 'cycle')
      invalid.find((item) => item.slug === 'technology')!.parent =
        'software-development';
    if (kind === 'alias-chain') child.aliasOf = 'software-engineering';
    if (kind === 'cross-sector-alias') child.aliasOf = 'assessment-design';
    if (kind === 'self-alias') child.aliasOf = child.slug;
    expect(sectorsSchema.safeParse(invalid).success).toBe(false);
  });
  it('continues reading the older flat sector contract', () => {
    const flat = [
      {
        slug: 'older-sector',
        title: 'Older Sector',
        description: 'An old flat registry.',
        aliases: [],
      },
    ];
    expect(sectorsSchema.parse(flat)).toEqual(flat);
    expect(matchesSector(flat, 'older-sector', 'older-sector')).toBe(true);
    expect(broadSectors(flat)).toHaveLength(1);
  });
});
describe('nineteen complete drafts and offline replay only', () => {
  it.each(authored)(
    '%s validates, round-trips all package files and reproduces both fictional cases without agent claims',
    async (id) => {
      const files = await readSkillFiles(resolve('skills', id));
      const validation = validateSkill(files, id);
      expect(validation.errors).toEqual([]);
      const skill = catalog.skills.find((item) => item.id === id)!;
      expect(skill.quality?.score).toBe(100);
      expect(skill).toMatchObject({
        status: 'draft',
        testedPlatforms: [],
        lastVerified: null,
      });
      expect(
        skill.compatibility?.every((row) => row.testing === 'not-recorded'),
      ).toBe(true);
      expect(skill.evaluations).toBeUndefined();
      const cases = testCasesSchema.parse(
        JSON.parse(files['tests/cases.json']),
      );
      expect(cases.skillId).toBe(id);
      expect(cases.cases.length).toBeGreaterThanOrEqual(6);
      const restored = Object.fromEntries(
        Object.entries(unzipSync(createSkillZip(skill))).map(([path, data]) => [
          path.slice(skill.slug.length + 1),
          strFromU8(data),
        ]),
      );
      expect(restored).toEqual(files);
      const suite = evaluationSuiteSchema.parse(
        JSON.parse(
          await readFile(
            resolve('evaluations/scenarios', skill.slug + '.json'),
            'utf8',
          ),
        ),
      );
      expect(suite.skillId).toBe(id);
      for (let i = 0; i < 2; i++) {
        expect(suite.scenarios[i].fixtures?.baseline).toEqual(
          suite.scenarios[i].fixtures?.assisted,
        );
        expect(
          suite.scenarios[i].fixtures?.assisted.files['output/review.md'],
        ).toBe(files[`examples/output-${i + 1}.md`]);
      }
      const report = await runEvaluation({ suite, skill });
      expect(report).toMatchObject({
        mode: 'fixture',
        platform: 'fixture',
        modelRequested: null,
        summary: { completedCases: 2, delta: 0 },
      });
      expect(reproduceEvaluation(report)).toEqual([]);
      expect(
        report.cases.every((item) =>
          [...item.baseline.assertions, ...item.assisted.assertions].every(
            (check) => check.passed,
          ),
        ),
      ).toBe(true);
    },
  );
});

describe('illustrative arithmetic from supplied inputs, not agent effectiveness', () => {
  const read = (id: string, path: string) =>
    readFile(resolve('skills', id, `examples/${path}-1.md`), 'utf8');
  it('reconciles invoice quantities and preserves the partial-receipt difference', async () => {
    const id = 'accounting-operations/invoice-reconciliation-assistant';
    const input = await read(id, 'input'),
      output = await read(id, 'output');
    const [, quantity, price] = /lists (\d+) filters at USD (\d+)/.exec(input)!;
    const received = Number(/confirms (\d+) filters/.exec(input)![1]);
    expect(Number(/Invoiced extension:.*?= USD (\d+)/.exec(output)![1])).toBe(
      Number(quantity) * Number(price),
    );
    expect(Number(/Quantity exception:.*?USD (\d+)/.exec(output)![1])).toBe(
      (Number(quantity) - received) * Number(price),
    );
  });
  it('reconciles observed waste net masses and diversion denominator without emissions claims', async () => {
    const id = 'environmental-management/waste-audit-reconciler';
    const input = await read(id, 'input'),
      output = await read(id, 'output');
    const nets = [...input.matchAll(/gross (\d+) kg and tare (\d+) kg/g)].map(
      (match) => Number(match[1]) - Number(match[2]),
    );
    expect(nets).toHaveLength(3);
    expect(Number(/totaling (\d+) kg/.exec(output)![1])).toBe(
      nets.reduce((a, b) => a + b, 0),
    );
    expect(Number(/= (\d+)%/.exec(output)![1])).toBe(
      ((nets[1] + nets[2]) / nets.reduce((a, b) => a + b, 0)) * 100,
    );
  });
  it('computes the candidate contract date only under the explicit fictional counting rule', async () => {
    const id = 'contract-operations/contract-obligation-tracker';
    const input = await read(id, 'input'),
      output = await read(id, 'output');
    const date = new Date(
      /recorded on (\d{4}-\d{2}-\d{2})/.exec(input)![1] + 'T00:00:00Z',
    );
    date.setUTCDate(
      date.getUTCDate() + Number(/within (\d+) calendar days/.exec(input)![1]),
    );
    expect(output).toContain(date.toISOString().slice(0, 10));
    expect(output).toContain('not a certified legal deadline');
  });
});
