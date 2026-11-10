import {
  mkdtemp,
  mkdir,
  cp,
  readFile,
  writeFile,
  symlink,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { parseSkill } from '../packages/skill-parser/src/index';
import {
  metadataSchema,
  catalogSchema,
  safePathSchema,
} from '../packages/skill-schema/src/index';
import {
  validateSkill,
  type SkillFiles,
} from '../packages/skill-validator/src/index';
import {
  buildCatalog,
  generateCatalog,
  readSkillFiles,
} from '../packages/catalog-indexer/src/index';

const fixture = resolve('tests/fixtures/valid/education/example-skill');
const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});
async function files() {
  return readSkillFiles(fixture);
}
async function root() {
  const directory = await mkdtemp(join(tmpdir(), 'uas-test-'));
  temporary.push(directory);
  await cp(resolve('tests/fixtures/valid'), directory, { recursive: true });
  return directory;
}
function updateMetadata(input: SkillFiles, changes: Record<string, unknown>) {
  input['metadata.json'] = JSON.stringify({
    ...JSON.parse(input['metadata.json']),
    ...changes,
  });
  return input;
}

describe('canonical parser', () => {
  it('parses LF, CRLF, BOM and block scalars', async () => {
    const input = (await files())['SKILL.md'];
    expect(parseSkill(input).frontmatter.name).toBe('example-skill');
    expect(
      parseSkill('\uFEFF' + input.replaceAll('\n', '\r\n')).body,
    ).toContain('## Workflow');
    expect(
      parseSkill(
        '---\nname: example-skill\ndescription: >\n  Use when summarizing notes.\n---\n# Instructions',
      ).frontmatter.description,
    ).toContain('summarizing');
  });
  it('rejects duplicate keys and alias fixtures from disk', async () => {
    for (const name of ['malformed', 'malicious']) {
      const source = await readFile(`tests/fixtures/${name}.md`, 'utf8');
      expect(() => parseSkill(source)).toThrow();
    }
  });
  it.each([
    '---\nname: bad--name\ndescription: test\n---\nbody',
    '---\nname: valid\ndescription: test\nextra: no\n---\nbody',
    '---\nname: !!str valid\ndescription: test\n---\nbody',
    '---\nname: valid\ndescription: test\n---\n',
    'x'.repeat(256 * 1024 + 1),
  ])('rejects invalid canonical input', (source) => {
    expect(() => parseSkill(source)).toThrow();
  });
});

describe('schemas and deterministic validation', () => {
  it.each([
    '../secret',
    '/absolute',
    'C:/file',
    'a\\b',
    '%2e%2e/file',
    'a//b',
    'a/./b',
    'CON.txt',
    '.env',
    'a?.md',
  ])('rejects unsafe path %s', (path) => {
    expect(safePathSchema.safeParse(path).success).toBe(false);
  });
  it('validates synthetic draft without claiming behavioral execution', async () => {
    const result = validateSkill(await files(), 'education/example-skill');
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.entry?.metadata.status).toBe('draft');
  });
  it('requires provenance and consistent IDs and dates', async () => {
    const metadata = JSON.parse((await files())['metadata.json']);
    for (const changes of [
      { provenance: undefined },
      { id: 'wrong/id' },
      { testedPlatforms: ['unverified'] },
      { lastVerified: '2026-02-30' },
    ])
      expect(
        metadataSchema.safeParse({ ...metadata, ...changes }).success,
      ).toBe(false);
  });
  it.each(['When to use', 'Inputs', 'Workflow', 'Output', 'Boundaries'])(
    'rejects missing section %s',
    async (heading) => {
      const input = await files();
      input['SKILL.md'] = input['SKILL.md'].replace(
        `## ${heading}`,
        `## Other`,
      );
      expect(validateSkill(input, 'education/example-skill').valid).toBe(false);
    },
  );
  it.each([
    'javascript:alert(1)',
    'data:text/html,bad',
    '../secret.md',
    '%2e%2e/secret.md',
    'missing.md',
    'https://user:secret@example.org',
  ])('rejects unsafe/broken link %s', async (url) => {
    const input = await files();
    input['SKILL.md'] += `\n[bad](${url})\n`;
    expect(validateSkill(input, 'education/example-skill').valid).toBe(false);
  });
  it('checks reference links and HTML', async () => {
    for (const content of [
      '<script>alert(1)</script>',
      '[x][evil]\n\n[evil]: javascript:alert(1)',
      '![x](missing.png)',
    ]) {
      const input = await files();
      input['SKILL.md'] += `\n${content}\n`;
      expect(validateSkill(input, 'education/example-skill').valid).toBe(false);
    }
  });
  it('requires examples, structured cases, folder identity and high-stakes boundaries', async () => {
    const input = await files();
    expect(validateSkill(input, 'wrong/folder').valid).toBe(false);
    expect(
      validateSkill(
        updateMetadata({ ...input }, { riskLevel: 'high' }),
        'education/example-skill',
      ).valid,
    ).toBe(false);
    delete input['examples/input.md'];
    expect(validateSkill(input, 'education/example-skill').valid).toBe(false);
    input['tests/cases.json'] = '{}';
    expect(validateSkill(input, 'education/example-skill').valid).toBe(false);
  });
  it('enforces file and byte limits, binaries, scripts and case collisions', async () => {
    const input = await files();
    for (const extra of [
      { 'run.sh': 'echo no' },
      { 'asset.txt': '\0' },
      { 'asset.txt': 'x'.repeat(256 * 1024 + 1) },
      { 'skill.md': 'case collision' },
      Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [`${i}.txt`, 'text']),
      ),
    ]) {
      expect(
        validateSkill({ ...input, ...extra }, 'education/example-skill').valid,
      ).toBe(false);
    }
  });
});

describe('filesystem indexer', () => {
  it('allows a GitHub library README and rejects a symlink in its place', async () => {
    const directory = await root();
    const path = join(directory, 'README.md');
    const before = await buildCatalog(directory);
    await writeFile(path, '# Skill library\n');
    expect(await buildCatalog(directory)).toEqual(before);
    await rm(path);
    await symlink(join(fixture, 'SKILL.md'), path);
    await expect(buildCatalog(directory)).rejects.toThrow(
      'ordinary library documentation',
    );
  });

  it('is deterministic, excludes drafts, and validates published entries', async () => {
    const directory = await root();
    expect((await buildCatalog(directory)).catalog.skills).toEqual([]);
    const draftEntries = (
      await buildCatalog(directory, { includeDrafts: true })
    ).catalog.skills;
    expect(draftEntries).toHaveLength(1);
    const path = join(directory, 'education/example-skill/metadata.json');
    const metadata = JSON.parse(await readFile(path, 'utf8'));
    await writeFile(path, JSON.stringify({ ...metadata, status: 'published' }));
    const first = await buildCatalog(directory);
    expect(first.validated).toBe(1);
    expect(first.catalog.skills).toHaveLength(0);
    const preview = (await generateCatalog(directory)).catalog;
    expect(preview.skills).toHaveLength(1);
    expect(await buildCatalog(directory)).toEqual(first);
    expect(
      catalogSchema.safeParse({
        schemaVersion: 1,
        skills: [...draftEntries, ...draftEntries],
      }).success,
    ).toBe(false);
  });
  it('fails the build on malformed content', async () => {
    const directory = await root();
    await writeFile(
      join(directory, 'education/example-skill/SKILL.md'),
      'malformed',
    );
    await expect(buildCatalog(directory)).rejects.toThrow('frontmatter');
  });
  it('fails the build on duplicate slugs across sectors', async () => {
    const directory = await root();
    await cp(join(directory, 'education'), join(directory, 'other'), {
      recursive: true,
    });
    const path = join(directory, 'other/example-skill');
    const input = updateMetadata(await files(), {
      id: 'other/example-skill',
      sector: 'other',
    });
    input['tests/cases.json'] = input['tests/cases.json'].replace(
      'education/example-skill',
      'other/example-skill',
    );
    await writeFile(join(path, 'metadata.json'), input['metadata.json']);
    await writeFile(join(path, 'tests/cases.json'), input['tests/cases.json']);
    await expect(buildCatalog(directory)).rejects.toThrow('Duplicate');
  });
  it('rejects symlinks at root, sector, package and asset boundaries', async () => {
    const directory = await root();
    const link = join(directory, 'linked');
    await symlink(fixture, link, 'dir');
    await expect(readSkillFiles(link)).rejects.toThrow();
    await expect(buildCatalog(link)).rejects.toThrow();
    await expect(buildCatalog(directory)).rejects.toThrow();
    await rm(link);
    await symlink(fixture, join(directory, 'education/linked'), 'dir');
    await expect(buildCatalog(directory)).rejects.toThrow();
    await rm(join(directory, 'education/linked'));
    await symlink(
      '/etc/passwd',
      join(directory, 'education/example-skill/secret.txt'),
    );
    await expect(buildCatalog(directory)).rejects.toThrow('Symlinks');
  });
  it('accepts an explicitly empty catalog', async () => {
    const directory = await root();
    await rm(join(directory, 'education'), { recursive: true });
    await mkdir(join(directory, 'empty-sector'));
    expect((await buildCatalog(directory)).validated).toBe(0);
  });
});
