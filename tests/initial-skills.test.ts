import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { strFromU8, unzipSync } from 'fflate';
import {
  readSkillFiles,
  generateCatalog,
} from '../packages/catalog-indexer/src/index';
import { validateSkill } from '../packages/skill-validator/src/index';
import { parseSkill } from '../packages/skill-parser/src/index';
import {
  sectorsSchema,
  testCasesSchema,
} from '../packages/skill-schema/src/index';
import { createSkillZip } from '../apps/web/src/lib/download';

const specification = await readFile(
  resolve('OPEN_SKILL_KIT_CODEX_IMPLEMENTATION.md'),
  'utf8',
);
const initialSection = specification
  .split('## 8. Initial 10 fully authored skills (Milestone 1)')[1]
  .split('## 9.')[0];
const ids = [...initialSection.matchAll(/^\d+\. `([^`]+)`/gm)].map(
  (match) => match[1],
);
const read = (id: string, path: string) =>
  readFile(resolve('skills', id, path), 'utf8');
function jsonBlock(source: string) {
  const match = /```json\s*\n([\s\S]*?)\n```/.exec(source);
  if (!match) throw new Error('Expected an explicit JSON fixture');
  return JSON.parse(match[1]);
}
function allocations(source: string) {
  return [
    ...source.matchAll(/^\|\s*([^|]+?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|$/gm),
  ].map((match) => ({ label: match[1].trim(), value: Number(match[2]) }));
}

describe('initial ten specification packages', () => {
  it('takes its exact ten targets from the implementation specification', () => {
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });
  it.each(ids)(
    '%s meets the full package contract with two example pairs and explicit review limits',
    async (id) => {
      const files = await readSkillFiles(resolve('skills', id));
      const result = validateSkill(files, id);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
      const { frontmatter, body } = parseSkill(files['SKILL.md']);
      expect(frontmatter.name).toBe(id.split('/')[1]);
      expect(body.match(/^\d+\. /gm)?.length).toBeGreaterThanOrEqual(5);
      expect(result.entry?.metadata.examples).toHaveLength(4);
      for (const path of result.entry!.metadata.examples)
        expect(files[path].trim().length).toBeGreaterThan(100);
      const cases = testCasesSchema.parse(
        JSON.parse(files['tests/cases.json']),
      );
      expect(cases.skillId).toBe(id);
      expect(cases.cases.length).toBeGreaterThanOrEqual(6);
      expect(new Set(cases.cases.map((item) => item.name)).size).toBe(
        cases.cases.length,
      );
      expect(new Set(cases.cases.map((item) => item.input)).size).toBe(
        cases.cases.length,
      );
      expect(files['review.md']).toContain('independent');
      expect(result.entry?.metadata).toMatchObject({
        status: 'draft',
        testedPlatforms: [],
        lastVerified: null,
      });
    },
  );
  it.each(ids)(
    '%s exports and revalidates independently of the website',
    async (id) => {
      const files = await readSkillFiles(resolve('skills', id));
      const skill = validateSkill(files, id, { profile: 'catalog' }).skill!;
      const decoded = unzipSync(createSkillZip(skill));
      const restored = Object.fromEntries(
        Object.entries(decoded).map(([path, data]) => {
          expect(path.startsWith(`${skill.slug}/`)).toBe(true);
          expect(path.includes('..')).toBe(false);
          return [path.slice(skill.slug.length + 1), strFromU8(data)];
        }),
      );
      expect(restored).toEqual(files);
      expect(validateSkill(restored, id).errors).toEqual([]);
    },
  );
  it('indexes every required skill under a declared specification sector without duplicates', async () => {
    const sectors = sectorsSchema.parse(
      JSON.parse(await readFile(resolve('catalog/sectors.json'), 'utf8')),
    );
    const { catalog } = await generateCatalog(resolve('skills'), sectors);
    for (const id of ids) {
      expect(catalog.skills.filter((skill) => skill.id === id)).toHaveLength(1);
      expect(sectors.some((sector) => sector.slug === id.split('/')[0])).toBe(
        true,
      );
    }
    expect(new Set(catalog.skills.map((skill) => skill.slug)).size).toBe(
      catalog.skills.length,
    );
    expect(
      catalog.skills.some(
        (skill) =>
          skill.id === 'education/personal-tutor' ||
          skill.id === 'design-ux/accessibility-reviewer',
      ),
    ).toBe(false);
  });
  it('preserves every archived source file byte-for-byte', async () => {
    const manifest = JSON.parse(
      await readFile(resolve('archive/skills/manifest.json'), 'utf8'),
    ) as {
      entries: {
        archivedPath: string;
        replacementId: string;
        files: { path: string; sha256: string }[];
      }[];
    };
    expect(manifest.entries).toHaveLength(2);
    for (const entry of manifest.entries) {
      expect(ids).toContain(entry.replacementId);
      for (const file of entry.files) {
        expect(file.path.includes('..')).toBe(false);
        const bytes = await readFile(resolve(entry.archivedPath, file.path));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(
          file.sha256,
        );
      }
    }
  });
});

describe('initial-skill illustrative example invariants (not model evaluations)', () => {
  it('keeps the fraction solutions mathematically consistent', async () => {
    for (const number of [1, 2]) {
      const output = await read(
        'education-teaching/personal-tutor',
        `examples/output-${number}.md`,
      );
      const additions = [
        ...output.matchAll(
          /(\d+)\/(\d+)\s*\+\s*(\d+)\/(\d+)\s*=\s*(\d+)\/(\d+)/g,
        ),
      ];
      expect(additions.length).toBeGreaterThan(0);
      for (const match of additions) {
        const [a, b, c, d, e, f] = match.slice(1).map(Number);
        expect((a * d + c * b) * f).toBe(e * b * d);
      }
    }
  });
  it('reconciles campaign allocations to the supplied cap and cost threshold', async () => {
    const id = 'marketing-advertising/campaign-planner';
    const input = await read(id, 'examples/input-1.md');
    const output = await read(id, 'examples/output-1.md');
    const budget = Number(/Total budget: USD (\d+)/.exec(input)![1]);
    const target = Number(/threshold: (\d+) qualified/.exec(input)![1]);
    const rows = allocations(output);
    const total = rows.find((row) => /total/i.test(row.label))!.value;
    expect(
      rows
        .filter((row) => !/total/i.test(row.label))
        .reduce((sum, row) => sum + row.value, 0),
    ).toBe(total);
    expect(total).toBeLessThanOrEqual(budget);
    const division = /(\d+)\s*\/\s*(\d+)\s*=\s*USD\s*(\d+)/.exec(output)!;
    expect(Number(division[1])).toBe(budget);
    expect(Number(division[2])).toBe(target);
    expect(Number(division[3])).toBe(budget / target);
  });
  it('includes a positive buffer without overbooking the supplied next-week capacity', async () => {
    const id = 'personal-productivity/weekly-review-coach';
    const input = await read(id, 'examples/input-1.md');
    const output = await read(id, 'examples/output-1.md');
    const capacity = Number(/Next week also has (\d+)h/.exec(input)![1]);
    const rows = allocations(output);
    const assigned = rows
      .filter((row) => !/total/i.test(row.label))
      .reduce((sum, row) => sum + row.value, 0);
    expect(
      rows.find((row) => /buffer/i.test(row.label))!.value,
    ).toBeGreaterThan(0);
    expect(assigned).toBe(capacity);
    expect(rows.find((row) => /total/i.test(row.label))!.value).toBe(capacity);
  });
  it('demonstrates SQL fan-out and corrected existence semantics using data only', async () => {
    const id = 'data-analytics-bi/sql-query-reviewer';
    const fixture = jsonBlock(await read(id, 'examples/input-1.md')) as {
      customers: { id: number }[];
      orders: { id: number; customer_id: number; total: number }[];
      payments: { order_id: number; status: string }[];
    };
    const expected = jsonBlock(await read(id, 'examples/output-1.md'));
    const original = fixture.customers.flatMap((customer) => {
      const matched = fixture.orders
        .filter((order) => order.customer_id === customer.id)
        .flatMap((order) =>
          fixture.payments
            .filter(
              (payment) =>
                payment.order_id === order.id && payment.status === 'settled',
            )
            .map(() => order.total),
        );
      return matched.length
        ? [
            {
              id: customer.id,
              settled_order_total: matched.reduce(
                (sum, total) => sum + total,
                0,
              ),
            },
          ]
        : [];
    });
    const corrected = fixture.customers.map((customer) => ({
      id: customer.id,
      settled_order_total: fixture.orders
        .filter(
          (order) =>
            order.customer_id === customer.id &&
            fixture.payments.some(
              (payment) =>
                payment.order_id === order.id && payment.status === 'settled',
            ),
        )
        .reduce((sum, order) => sum + order.total, 0),
    }));
    expect(original).toEqual(expected.originalRows);
    expect(corrected).toEqual(expected.correctRows);
  });
  it('parses the authored React output snippets without executing contributed code', async () => {
    for (const number of [1, 2]) {
      const output = await read(
        'web-design-ux/react-component-designer',
        `examples/output-${number}.md`,
      );
      const blocks = [...output.matchAll(/```tsx\s*\n([\s\S]*?)\n```/g)];
      expect(blocks).toHaveLength(1);
      for (const block of blocks) {
        const result = ts.transpileModule(block[1], {
          reportDiagnostics: true,
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        });
        expect(
          result.diagnostics?.filter(
            (item) => item.category === ts.DiagnosticCategory.Error,
          ),
        ).toEqual([]);
      }
    }
  });
});
