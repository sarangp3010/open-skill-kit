import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseInstructionStructure } from '../packages/skill-parser/src/index';
import {
  validateSkill,
  type SkillFiles,
} from '../packages/skill-validator/src/index';
import {
  assessCompatibility,
  generateCatalog,
  packageDigest,
  readSkillFiles,
  CatalogValidationError,
} from '../packages/catalog-indexer/src/index';
import {
  discoveryCatalogSchema,
  qualityReportSchema,
} from '../packages/skill-schema/src/index';
import { runCli } from '../packages/cli/src/index';
import { selectSkills } from '../apps/web/src/lib/catalog';

let files: SkillFiles;
let temp: string;
const id = 'education/example-skill';
const assess = (input = files) =>
  validateSkill(input, id, { profile: 'catalog' });
const metadata = () => JSON.parse(files['metadata.json']);
const changeMetadata = (values: Record<string, unknown>) => {
  files['metadata.json'] = JSON.stringify({ ...metadata(), ...values });
};
const derived = () => assess().skill!;
function addRun(
  outcome: 'passed' | 'failed' = 'passed',
  completedAt = '2026-11-10T10:00:00Z',
  digest?: string,
) {
  const run = {
    platform: 'codex',
    platformVersion: 'test-fixture-version',
    runner: 'synthetic test runner, not actual assistant execution',
    completedAt,
    outcome,
    packageDigest: digest ?? '',
    evidencePath: 'tests/evidence/codex.txt',
  };
  const runs = files['tests/platform-results.json']
    ? JSON.parse(files['tests/platform-results.json']).runs
    : [];
  files['tests/evidence/codex.txt'] =
    'Synthetic completed test artifact: fixture outcome only.';
  run.packageDigest = digest ?? packageDigest(files);
  files['tests/platform-results.json'] = JSON.stringify({
    schemaVersion: 1,
    runs: [...runs, run],
  });
  return run;
}
beforeEach(async () => {
  files = await readSkillFiles(
    resolve('tests/fixtures/valid/education/example-skill'),
  );
  temp = await mkdtemp(join(await realpath(tmpdir()), 'osk-quality-'));
});
afterEach(async () => {
  await rm(temp, { recursive: true, force: true });
});
async function source() {
  const root = join(temp, 'skills');
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, id, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return root;
}
async function cli(args: string[]) {
  const lines: string[] = [];
  await runCli(args, {
    dataRoot: join(temp, 'missing-bundle'),
    cwd: temp,
    version: '0.1.0',
    log: (line) => lines.push(line),
  });
  return lines.join('\n');
}
describe('deterministic explainable quality rubric', () => {
  it('produces stable totals and specific missing-field explanations', () => {
    const report = assess().quality;
    expect(qualityReportSchema.safeParse(report).success).toBe(true);
    expect(report.checks.reduce((sum, check) => sum + check.weight, 0)).toBe(
      100,
    );
    expect(report.score).toBe(
      report.checks.reduce((sum, check) => sum + check.earned, 0),
    );
    expect(assess().quality).toEqual(report);
    expect(
      report.checks.find((check) => check.id === 'discovery-metadata'),
    ).toMatchObject({ status: 'warn', earned: 0, paths: ['metadata.json'] });
  });
  it('awards full structural points without manufacturing testing or review', () => {
    changeMetadata({ difficulty: 'beginner' });
    files['SKILL.md'] = files['SKILL.md'].replace(
      'A short summary and one review question.',
      '- A short summary.\n- One review question.',
    );
    files['examples/input-2.md'] =
      'Organize notes about perimeter; flag a missing measurement.';
    files['examples/output-2.md'] =
      'Perimeter is the distance around a figure. One side length is missing; ask for it.';
    changeMetadata({
      examples: [
        ...metadata().examples,
        'examples/input-2.md',
        'examples/output-2.md',
      ],
    });
    expect(assess().quality.score).toBe(100);
    const skill = derived();
    expect(skill.status).toBe('draft');
    expect(skill.testedPlatforms).toEqual([]);
    expect(
      assessCompatibility(skill).every((row) => row.testing === 'not-recorded'),
    ).toBe(true);
  });
  it('keeps minimal old skills valid and reports missing optional metadata/examples as advisory', () => {
    delete files['metadata.json'];
    delete files['tests/cases.json'];
    delete files['examples/input.md'];
    delete files['examples/output.md'];
    files['SKILL.md'] = files['SKILL.md'].replace(
      'See [sample input](examples/input.md).',
      '',
    );
    const result = assess();
    expect(result.valid).toBe(true);
    expect(result.quality.blocked).toBe(false);
    expect(result.quality.score).toBeLessThan(80);
  });
  it('uses Markdown structure, excluding fenced numbered examples from workflow steps', () => {
    const body =
      '## Workflow\n\n1. One real step.\n\n```text\n1. fake\n2. fake\n3. fake\n```\n\n## Output\n\n- Result';
    expect(parseInstructionStructure(body).orderedSteps).toBe(1);
    expect(parseInstructionStructure(body).structuredOutput).toBe(true);
    files['SKILL.md'] = files['SKILL.md'].replace(
      /## Workflow[\s\S]*?## Output/,
      '## Workflow\n\n1. One real step.\n\n```text\n1. fake\n2. fake\n3. fake\n```\n\n## Output',
    );
    expect(
      assess().quality.checks.find(
        (check) => check.id === 'actionable-workflow',
      )?.status,
    ).toBe('warn');
  });
  it.each([
    'unsafe path',
    'broken reference',
    'raw HTML',
    'malformed YAML',
    'bad metadata',
    'missing example',
  ] as const)('blocks a misleading positive score for %s', (kind) => {
    if (kind === 'unsafe path') files['../escape.md'] = 'bad';
    if (kind === 'broken reference')
      files['SKILL.md'] += '\n[missing](references/missing.md)';
    if (kind === 'raw HTML') files['SKILL.md'] += '\n<script>bad()</script>';
    if (kind === 'malformed YAML')
      files['SKILL.md'] = '---\nname: [broken\n---\nbody';
    if (kind === 'bad metadata') files['metadata.json'] = '{broken';
    if (kind === 'missing example') delete files['examples/input.md'];
    const result = assess();
    expect(result.valid).toBe(false);
    expect(result.quality).toMatchObject({ score: 0, blocked: true });
    expect(result.diagnostics[0].path).toContain(id);
  });
  it('rejects fabricated aggregate scores in catalog report schemas', () => {
    const report = assess().quality;
    expect(
      qualityReportSchema.safeParse({ ...report, score: 100 }).success,
    ).toBe(false);
  });
});
describe('compatibility declarations and completed evidence are separate', () => {
  it('never upgrades legacy testedPlatforms/date or compatiblePlatforms into test evidence', () => {
    changeMetadata({
      compatiblePlatforms: ['codex'],
      testedPlatforms: ['codex'],
      lastVerified: '2026-11-10',
    });
    expect(assessCompatibility(derived())[0]).toMatchObject({
      installation: 'documented',
      declaredCompatible: true,
      declaredTested: true,
      testing: 'not-recorded',
      runs: [],
    });
  });
  it('accepts a completed package-bound record with a readable artifact', () => {
    addRun();
    expect(assess().valid).toBe(true);
    expect(assessCompatibility(derived())[0]).toMatchObject({
      testing: 'recorded-pass',
      runs: [
        { runner: expect.stringContaining('synthetic'), outcome: 'passed' },
      ],
    });
  });
  it('invalidates passing evidence after any source change, including supporting files', () => {
    addRun();
    files['examples/input.md'] += '\nA changed exercise.';
    expect(assessCompatibility(derived())[0].testing).toBe('stale');
  });
  it('never hides a newer failure or stale run behind an older passing result', () => {
    addRun();
    addRun('failed', '2026-11-10T11:00:00Z');
    expect(assessCompatibility(derived())[0].testing).toBe('recorded-fail');
    addRun('passed', '2026-11-10T12:00:00Z', '0'.repeat(64));
    expect(assessCompatibility(derived())[0].testing).toBe('stale');
  });
  it('hashes every package file deterministically, excluding only the results document', () => {
    addRun();
    const before = packageDigest(files);
    files['tests/platform-results.json'] = JSON.stringify(
      JSON.parse(files['tests/platform-results.json']),
      null,
      2,
    );
    expect(packageDigest(files)).toBe(before);
    expect(
      packageDigest(Object.fromEntries(Object.entries(files).reverse())),
    ).toBe(before);
    files['tests/evidence/codex.txt'] += 'Changed evidence.';
    expect(packageDigest(files)).not.toBe(before);
  });

  it.each([
    'missing log',
    'empty log',
    'invalid result',
    'uncompleted result',
    'unsafe artifact',
    'duplicate time',
  ] as const)('rejects %s instead of treating it as testing proof', (kind) => {
    addRun();
    const record = JSON.parse(files['tests/platform-results.json']);
    if (kind === 'missing log') delete files['tests/evidence/codex.txt'];
    if (kind === 'empty log') files['tests/evidence/codex.txt'] = ' ';
    if (kind === 'invalid result') record.runs[0].outcome = 'verified';
    if (kind === 'uncompleted result') delete record.runs[0].completedAt;
    if (kind === 'unsafe artifact')
      record.runs[0].evidencePath = '../private.txt';
    if (kind === 'duplicate time')
      record.runs.push({ ...record.runs[0], outcome: 'failed' });
    files['tests/platform-results.json'] = JSON.stringify(record);
    expect(assess().valid).toBe(false);
    expect(assess().quality.score).toBe(0);
  });
});
describe('catalog and CLI integration', () => {
  it('generates stable typed reports from the same validator without modifying source', async () => {
    addRun();
    const root = await source();
    const first = (await generateCatalog(root)).catalog;
    expect((await generateCatalog(root)).catalog).toEqual(first);
    expect(first.skills[0].quality).toEqual(assess().quality);
    expect(first.skills[0].compatibility?.[0].testing).toBe('recorded-pass');
    expect(await readFile(join(root, id, 'SKILL.md'), 'utf8')).toBe(
      files['SKILL.md'],
    );
    const old = structuredClone(first);
    delete old.skills[0].quality;
    delete old.skills[0].validation;
    delete old.skills[0].compatibility;
    expect(discoveryCatalogSchema.safeParse(old).success).toBe(true);
  });
  it('reports quality and a package digest as JSON through the existing CLI', async () => {
    const root = await source();
    const result = JSON.parse(
      await cli(['quality', id, '--source', root, '--json']),
    );
    expect(result).toMatchObject({
      id,
      valid: true,
      packageDigest: packageDigest(files),
      quality: assess().quality,
    });
    expect(await cli(['quality', 'example-skill', '--source', root])).toContain(
      'Structural scoring',
    );
  });
  it('prints blocked reports and fails for invalid skills while catalog generation remains strict', async () => {
    files['SKILL.md'] += '\n[bad](missing.md)';
    const root = await source();
    const lines: string[] = [];
    await expect(
      runCli(['quality', id, '--source', root, '--json'], {
        dataRoot: 'unused',
        cwd: temp,
        version: 'test',
        log: (line) => lines.push(line),
      }),
    ).rejects.toThrow('blocked');
    expect(JSON.parse(lines[0])).toMatchObject({
      valid: false,
      quality: { blocked: true, score: 0 },
    });
    await expect(generateCatalog(root)).rejects.toBeInstanceOf(
      CatalogValidationError,
    );
  });
  it.each([
    ['../escape'],
    [id, '--json', '--json'],
    [id, '--source'],
    [id, '--force'],
  ])('rejects unsafe or malformed quality invocation %j', async (...args) => {
    await expect(
      cli(['quality', ...args, '--source', join(temp, 'missing')]),
    ).rejects.toThrow();
  });
  it('rejects symlinked quality source ancestors', async () => {
    const root = await source();
    const alias = join(temp, 'alias');
    await symlink(root, alias, 'dir');
    await expect(cli(['quality', id, '--source', alias])).rejects.toThrow(
      'ordinary',
    );
  });
  it('pairs platform filters with testing on the same platform and keeps sort ties stable', async () => {
    addRun();
    const root = await source();
    const catalog = (await generateCatalog(root)).catalog;
    expect(
      selectSkills(catalog, { platform: 'codex', testing: 'recorded-pass' }),
    ).toHaveLength(1);
    expect(
      selectSkills(catalog, { platform: 'cursor', testing: 'recorded-pass' }),
    ).toHaveLength(0);
    expect(selectSkills(catalog, { testing: 'not-recorded' })).toHaveLength(0);
    expect(
      selectSkills(catalog, { platform: 'cursor', testing: 'not-recorded' }),
    ).toHaveLength(1);
    expect(selectSkills(catalog, { minQuality: 100 })).toHaveLength(0);
    expect(selectSkills(catalog, { status: 'published' })).toHaveLength(0);
    expect(selectSkills(catalog, { difficulty: 'advanced' })).toHaveLength(0);
    expect(
      selectSkills(catalog, { validation: 'passed', sort: 'quality' }),
    ).toHaveLength(1);
    const legacy = structuredClone(catalog);
    delete legacy.skills[0].quality;
    delete legacy.skills[0].validation;
    delete legacy.skills[0].compatibility;
    expect(selectSkills(legacy, { minQuality: 80 })).toHaveLength(0);
    expect(selectSkills(legacy, { validation: 'not-assessed' })).toHaveLength(
      1,
    );
  });
});

it('validates the reusable template without adding it to the active catalog or fabricating test evidence', async () => {
  const template = await readSkillFiles(resolve('templates/skill'));
  const result = validateSkill(template, 'collaboration-records/example-skill');
  expect(result.valid).toBe(true);
  expect(
    result.quality.checks.find((check) => check.id === 'provenance-metadata'),
  ).toMatchObject({ status: 'warn', earned: 0 });
  expect(
    assessCompatibility(result.skill!).every(
      (row) => row.testing === 'not-recorded',
    ),
  ).toBe(true);
  const active = (await generateCatalog(resolve('skills'))).catalog;
  expect(
    active.skills.some(
      (skill) => skill.id === 'collaboration-records/example-skill',
    ),
  ).toBe(false);
});

it('sorts actual catalog scores descending with deterministic title ties and filters minimums', async () => {
  const catalog = (await generateCatalog(resolve('skills'))).catalog;
  const sorted = selectSkills(catalog, { sort: 'quality' });
  for (let index = 1; index < sorted.length; index++) {
    const a = sorted[index - 1],
      b = sorted[index];
    expect(a.quality!.score).toBeGreaterThanOrEqual(b.quality!.score);
    if (a.quality!.score === b.quality!.score)
      expect(
        a.title.localeCompare(b.title, 'en') || a.id.localeCompare(b.id, 'en'),
      ).toBeLessThanOrEqual(0);
  }
  expect(
    selectSkills(catalog, { minQuality: 90 }).every(
      (skill) => skill.quality!.score >= 90,
    ),
  ).toBe(true);
  expect(selectSkills(catalog, { testing: 'recorded-pass' })).toHaveLength(0);
});
