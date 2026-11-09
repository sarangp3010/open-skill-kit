import { afterEach, describe, expect, it } from 'vitest';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseSkill,
  SkillParseError,
} from '../packages/skill-parser/src/index';
import { validateSkill } from '../packages/skill-validator/src/index';
import {
  CatalogValidationError,
  generateCatalog,
  readSkillFiles,
} from '../packages/catalog-indexer/src/index';
import { discoveryCatalogSchema } from '../packages/skill-schema/src/index';
import { regenerateCatalog } from '../scripts/catalog';
import { selectSkills } from '../apps/web/src/lib/catalog';
import { createSkillZip } from '../apps/web/src/lib/download';
import { strFromU8, unzipSync } from 'fflate';
const fixture = resolve('tests/fixtures/valid');
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function root() {
  const directory = await mkdtemp(
    join(await realpath(tmpdir()), 'osk-catalog-'),
  );
  directories.push(directory);
  await cp(fixture, join(directory, 'skills'), { recursive: true });
  await mkdir(join(directory, 'catalog'));
  await writeFile(join(directory, 'catalog/sectors.json'), '[]');
  return directory;
}
describe('catalog contracts and diagnostics', () => {
  it('includes canonical packages without catalog metadata or test files', async () => {
    const directory = await root();
    await rm(join(directory, 'skills/education/example-skill/metadata.json'));
    await rm(join(directory, 'skills/education/example-skill/tests'), {
      recursive: true,
    });
    const { catalog } = await generateCatalog(join(directory, 'skills'));
    expect(discoveryCatalogSchema.safeParse(catalog).success).toBe(true);
    expect(catalog.skills[0]).toMatchObject({
      id: 'education/example-skill',
      title: 'Example Skill',
      version: null,
      license: null,
      author: null,
      status: 'draft',
      sourcePath: 'skills/education/example-skill/SKILL.md',
    });
  });
  it('reports YAML field errors with actual line positions', () => {
    try {
      parseSkill(
        '---\nname: Bad_Name\ndescription: Use when testing.\n---\nInstructions',
      );
      throw new Error('Expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(SkillParseError);
      expect(error).toMatchObject({ line: 2, column: 1 });
    }
  });
  it('collects all invalid packages with paths and fields', async () => {
    const directory = await root();
    await cp(
      join(directory, 'skills/education/example-skill'),
      join(directory, 'skills/education/other-skill'),
      { recursive: true },
    );
    await writeFile(
      join(directory, 'skills/education/example-skill/SKILL.md'),
      '---\nname: example-skill\n---\nbody',
    );
    await writeFile(
      join(directory, 'skills/education/other-skill/metadata.json'),
      '{broken json',
    );
    try {
      await generateCatalog(join(directory, 'skills'));
      throw new Error('Expected validation failure');
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogValidationError);
      const diagnostics = (error as CatalogValidationError).diagnostics;
      expect(
        diagnostics.some(
          (item) =>
            item.path.endsWith('example-skill/SKILL.md') &&
            item.message.includes('description'),
        ),
      ).toBe(true);
      expect(
        diagnostics.some((item) =>
          item.path.endsWith('other-skill/metadata.json'),
        ),
      ).toBe(true);
    }
  });
  it('produces ordered, byte-stable output and detects stale/missing copies', async () => {
    const directory = await root();
    await regenerateCatalog(directory);
    const path = join(directory, 'catalog/catalog.json');
    const first = await readFile(path, 'utf8');
    expect(
      await readFile(join(directory, 'apps/web/public/catalog.json'), 'utf8'),
    ).toBe(first);
    await regenerateCatalog(directory);
    expect(await readFile(path, 'utf8')).toBe(first);
    await regenerateCatalog(directory, { check: true });
    await writeFile(path, '{}');
    await expect(regenerateCatalog(directory, { check: true })).rejects.toThrow(
      'stale generated',
    );
    await rm(path);
    await expect(regenerateCatalog(directory, { check: true })).rejects.toThrow(
      'missing generated',
    );
  });
  it('adds a new valid skill after indexing without any React edits', async () => {
    const directory = await root();
    await cp(
      join(directory, 'skills/education/example-skill'),
      join(directory, 'skills/education/new-skill'),
      { recursive: true },
    );
    const base = join(directory, 'skills/education/new-skill');
    await rm(join(base, 'metadata.json'));
    await rm(join(base, 'tests'), { recursive: true });
    const source = await readFile(join(base, 'SKILL.md'), 'utf8');
    await writeFile(
      join(base, 'SKILL.md'),
      source.replace('name: example-skill', 'name: new-skill'),
    );
    const result = await regenerateCatalog(directory);
    expect(result.catalog.skills.map((skill) => skill.slug)).toEqual([
      'example-skill',
      'new-skill',
    ]);
  });
  it.each([
    '../outside.md',
    '/etc/passwd',
    '%2e%2e/outside.md',
    '%252e%252e/outside.md',
    'javascript:alert(1)',
    '//evil.example/x',
    'file:///etc/passwd',
  ])('rejects unsafe reference %s with source line', async (url) => {
    const files = await readSkillFiles(
      resolve('tests/fixtures/valid/education/example-skill'),
    );
    files['SKILL.md'] += `\n[unsafe](${url})\n`;
    const result = validateSkill(files, 'education/example-skill', {
      profile: 'catalog',
    });
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some(
        (item) =>
          item.path === 'education/example-skill/SKILL.md' &&
          typeof item.line === 'number',
      ),
    ).toBe(true);
  });
  it('validates metadata aliases and rejects forged identity or unsupported fields', async () => {
    const files = await readSkillFiles(
      resolve('tests/fixtures/valid/education/example-skill'),
    );
    files['metadata.json'] = JSON.stringify({
      displayName: 'Study Notes',
      difficulty: 'beginner',
      tags: ['classroom'],
      status: 'community',
    });
    expect(
      validateSkill(files, 'education/example-skill', { profile: 'catalog' })
        .skill?.title,
    ).toBe('Study Notes');
    files['metadata.json'] = JSON.stringify({
      id: '../outside',
      sector: 'education',
    });
    expect(
      validateSkill(files, 'education/example-skill', { profile: 'catalog' })
        .valid,
    ).toBe(false);
    files['metadata.json'] = JSON.stringify({ arbitrary: 'no' });
    expect(
      validateSkill(files, 'education/example-skill', { profile: 'catalog' })
        .diagnostics[0].path,
    ).toContain('metadata.json');
  });
  it('supports keyword search, aliases, sector filtering and stable sorting', async () => {
    const { catalog } = await generateCatalog(join(await root(), 'skills'), [
      {
        slug: 'education',
        title: 'Education',
        description: 'Learning workflows',
        aliases: ['classroom'],
      },
    ]);
    expect(
      selectSkills(catalog, { query: 'classroom notes', sector: 'education' }),
    ).toHaveLength(1);
    expect(selectSkills(catalog, { query: 'does-not-match' })).toHaveLength(0);
    expect(selectSkills(catalog, { sector: 'unknown' })).toHaveLength(0);
  });
  it('round trips a ZIP with only safe, complete package files', async () => {
    const { catalog } = await generateCatalog(join(await root(), 'skills'));
    const skill = catalog.skills[0];
    const zip = createSkillZip(skill);
    const decoded = unzipSync(zip);
    expect(
      Object.keys(decoded).every(
        (path) => path.startsWith(`${skill.slug}/`) && !path.includes('..'),
      ),
    ).toBe(true);
    expect(strFromU8(decoded[`${skill.slug}/SKILL.md`])).toBe(
      skill.files['SKILL.md'],
    );
    const restored = Object.fromEntries(
      Object.entries(decoded).map(([path, bytes]) => [
        path.slice(skill.slug.length + 1),
        strFromU8(bytes),
      ]),
    );
    expect(
      validateSkill(restored, skill.id, { profile: 'catalog' }).valid,
    ).toBe(true);
    expect(() =>
      createSkillZip({
        ...skill,
        files: { ...skill.files, '../outside.txt': 'unsafe' },
      }),
    ).toThrow('safety validation');
  });
});
