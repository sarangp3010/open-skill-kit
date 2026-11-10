import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  readdir,
  rm,
  symlink,
  writeFile,
  access,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  packageDigest,
  readSkillFiles,
  buildCatalog,
} from '../packages/catalog-indexer/src/index';
import { installSkill, loadLibrary, runCli } from '../packages/cli/src/index';
import { buildNpmPackage } from '../scripts/build-npm';
import { writeSyntheticReview } from './helpers/review-fixture';

const execute = promisify(execFile);
const repo = resolve('.');
let temp: string;
let skills: string;
let artifact: string;
let data: string;

beforeAll(async () => {
  temp = await mkdtemp(join(await realpath(tmpdir()), 'uas-npm-'));
  skills = join(temp, 'skills');
  await cp(resolve('tests/fixtures/valid'), skills, { recursive: true });
  const metadataPath = join(skills, 'education/example-skill/metadata.json');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  // Synthetic test publication exists only in this temporary tree, never the real release.
  await writeFile(
    metadataPath,
    JSON.stringify({ ...metadata, status: 'published' }),
  );
  const { reviewRecord, review } = await writeSyntheticReview(
    temp,
    'education/example-skill',
    await readSkillFiles(join(skills, 'education/example-skill')),
  );
  await mkdir(join(temp, 'catalog'), { recursive: true });
  await writeFile(
    join(temp, 'catalog/publication-reviews.json'),
    JSON.stringify({
      schemaVersion: 1,
      decisions: [
        {
          skillId: 'education/example-skill',
          packageDigest: packageDigest(
            await readSkillFiles(join(skills, 'education/example-skill')),
          ),
          decision: 'approved',
          reviewer: 'sarangp3010',
          reviewedAt: review.reviewedAt,
          reviewRecord,
          pullRequest: 1,
          reason:
            'Synthetic offline packaging fixture only; no actual approval is claimed.',
        },
      ],
    }),
  );
  artifact = join(temp, 'dist/npm');
  await buildNpmPackage(repo, artifact, skills);
  data = join(artifact, 'data');
});
afterAll(async () => {
  if (temp) await rm(temp, { recursive: true, force: true });
});

async function invoke(args: string[], cwd = temp, dataRoot = data) {
  const lines: string[] = [];
  await runCli(args, {
    dataRoot,
    cwd,
    version: '0.1.0',
    log: (line) => lines.push(line),
  });
  return lines.join('\n');
}

describe('npm CLI', () => {
  it('provides help and version without loading skill data', async () => {
    expect(await invoke(['--help'], temp, '/does-not-exist')).toContain(
      '--dry-run',
    );
    expect(await invoke(['--version'], temp, '/does-not-exist')).toBe('0.1.0');
  });
  it('lists, searches and shows actual Markdown by ID or slug', async () => {
    expect(await invoke(['list'])).toContain('education/example-skill');
    expect(await invoke(['list', 'study'])).toContain('example-skill');
    expect(await invoke(['list', 'no-match'])).toContain('No published skills');
    expect(await invoke(['show', 'education/example-skill'])).toContain(
      '## Workflow',
    );
    expect(await invoke(['show', 'example-skill'])).toContain(
      'name: example-skill',
    );
  });
  it.each([
    ['add'],
    ['add', '../escape'],
    ['add', 'example-skill', '--dir'],
    ['add', 'example-skill', '--force'],
    ['show', 'example-skill', 'extra'],
    ['unknown'],
  ])('rejects malformed invocation %j', async (...args) => {
    await expect(invoke(args)).rejects.toThrow();
  });
  it('dry run makes no destination directories', async () => {
    const cwd = join(temp, 'dry-run');
    await mkdir(cwd);
    expect(await invoke(['add', 'example-skill', '--dry-run'], cwd)).toContain(
      'Would copy',
    );
    expect(await readdir(cwd)).toEqual([]);
  });
  it('copies a complete package to the default project directory without overwriting', async () => {
    const cwd = join(temp, 'consumer');
    await mkdir(cwd);
    expect(await invoke(['add', 'example-skill'], cwd)).toContain(
      'Copied 5 files',
    );
    const target = join(cwd, '.open-skill-kit/skills/example-skill');
    expect(await readFile(join(target, 'SKILL.md'), 'utf8')).toContain(
      '## Boundaries',
    );
    expect(await readFile(join(target, 'examples/input.md'), 'utf8')).toContain(
      'fraction',
    );
    await expect(invoke(['add', 'example-skill'], cwd)).rejects.toThrow(
      'already exists',
    );
  });
  it('supports an explicit directory and leaves preexisting files untouched', async () => {
    const directory = join(temp, 'explicit');
    await mkdir(directory);
    await writeFile(join(directory, 'keep.txt'), 'keep');
    await invoke(['add', 'example-skill', '--dir', directory]);
    expect(await readFile(join(directory, 'keep.txt'), 'utf8')).toBe('keep');
    await access(join(directory, 'example-skill/tests/cases.json'));
  });
  it('rejects symlink destinations and ancestors without writing through them', async () => {
    const outside = join(temp, 'outside');
    await mkdir(outside);
    const link = join(temp, 'linked');
    await symlink(outside, link, 'dir');
    await expect(
      invoke(['add', 'example-skill', '--dir', join(link, 'nested')]),
    ).rejects.toThrow('ordinary directories');
    expect(await readdir(outside)).toEqual([]);
    await symlink(outside, join(temp, 'explicit/example-skill-link'), 'dir');
    const entry = (await loadLibrary(data)).skills[0];
    const root = join(temp, 'collision');
    await mkdir(root);
    await symlink(outside, join(root, entry.metadata.slug), 'dir');
    await expect(installSkill(data, entry, root)).rejects.toThrow(
      'already exists',
    );
  });
  it('rejects corrupted or draft bundled data before creating destinations', async () => {
    const badData = join(temp, 'bad-data');
    await cp(data, badData, { recursive: true });
    const skillPath = join(badData, 'skills/education/example-skill');
    await writeFile(join(skillPath, 'SKILL.md'), 'malformed');
    const target = join(temp, 'invalid-target');
    await expect(
      invoke(['add', 'example-skill', '--dir', target], temp, badData),
    ).rejects.toThrow('Invalid bundled skill');
    await expect(access(target)).rejects.toThrow();
    const draft = (await buildCatalog(skills)).catalog;
    draft.skills[0].metadata.status = 'draft';
    await writeFile(join(badData, 'catalog.json'), JSON.stringify(draft));
    await expect(loadLibrary(badData)).rejects.toThrow('unpublished');
    await expect(installSkill(data, draft.skills[0], target)).rejects.toThrow(
      'Only published',
    );
  });
  it('rejects a symlinked bundled sector', async () => {
    const badData = join(temp, 'symlink-data');
    await cp(data, badData, { recursive: true });
    await rm(join(badData, 'skills/education'), { recursive: true });
    await symlink(
      join(data, 'skills/education'),
      join(badData, 'skills/education'),
      'dir',
    );
    await expect(
      invoke(['show', 'example-skill'], temp, badData),
    ).rejects.toThrow('must not be symlinks');
  });
  it('runs platform lifecycle commands from the bundled binary without workspace dependencies', async () => {
    const cwd = join(temp, 'native-binary-consumer');
    await mkdir(cwd);
    const binary = join(artifact, 'bin/open-skill-kit.js');
    const flags = ['--platform', 'cursor', '--scope', 'project'];
    const invokeBinary = (args: string[]) =>
      execute(process.execPath, [binary, ...args], { cwd });
    const assessment = JSON.parse(
      (await invokeBinary(['quality', 'education/example-skill', '--json']))
        .stdout,
    );
    expect(assessment.valid).toBe(true);
    expect(assessment.quality.checks).toHaveLength(12);
    expect(
      assessment.compatibility.every(
        (row: { testing: string }) => row.testing === 'not-recorded',
      ),
    ).toBe(true);
    await invokeBinary(['install', 'education/example-skill', ...flags]);
    expect(
      (await invokeBinary(['inspect', 'example-skill', ...flags])).stdout,
    ).toContain('managed');
    await access(join(cwd, '.cursor/skills/example-skill/examples/input.md'));
    await invokeBinary(['update', 'education/example-skill', ...flags]);
    await invokeBinary(['uninstall', 'education/example-skill', ...flags]);
    expect((await invokeBinary(['installed', ...flags])).stdout).toContain(
      'No installed',
    );
  });
  it('seals approved package/catalog bytes and rejects unlisted package directories before publication', async () => {
    await execute(process.execPath, [join(artifact, 'release-check.js')]);
    for (const kind of ['package', 'catalog', 'extra']) {
      const output = join(temp, 'tampered-' + kind);
      await cp(artifact, output, { recursive: true });
      if (kind === 'package')
        await writeFile(
          join(output, 'data/skills/education/example-skill/SKILL.md'),
          'Unreviewed replacement.',
        );
      if (kind === 'catalog')
        await writeFile(join(output, 'data/catalog.json'), '{}');
      if (kind === 'extra')
        await mkdir(join(output, 'data/skills/education/unapproved'), {
          recursive: true,
        });
      await expect(
        execute(process.execPath, [join(output, 'release-check.js')]),
      ).rejects.toThrow('Release blocked');
    }
  });
  it('excludes all drafts and blocks publishing an empty release', async () => {
    const emptyArtifact = join(temp, 'empty/dist/npm');
    await buildNpmPackage(repo, emptyArtifact, resolve('tests/fixtures/valid'));
    const catalog = await loadLibrary(join(emptyArtifact, 'data'));
    expect(catalog.skills).toEqual([]);
    expect(await readdir(join(emptyArtifact, 'data'))).toEqual([
      'catalog.json',
    ]);
    await expect(
      execute(process.execPath, [join(emptyArtifact, 'release-check.js')]),
    ).rejects.toMatchObject({ code: 1 });
  });
  it('packs, installs from the tarball offline, and runs the npm binary in a fresh project', async () => {
    const env = { ...process.env, npm_config_cache: join(temp, 'npm-cache') };
    const packed = await execute(
      'npm',
      [
        'pack',
        artifact,
        '--json',
        '--pack-destination',
        temp,
        '--ignore-scripts',
      ],
      { cwd: temp, env },
    );
    const [info] = JSON.parse(packed.stdout) as {
      filename: string;
      files: { path: string }[];
    }[];
    const paths = info.files.map((file) => file.path);
    expect(paths).toContain('bin/open-skill-kit.js');
    expect(paths).toContain('THIRD_PARTY_NOTICES.txt');
    expect(
      await readFile(join(artifact, 'THIRD_PARTY_NOTICES.txt'), 'utf8'),
    ).toContain('yaml@');
    expect(paths).toContain('data/skills/education/example-skill/SKILL.md');
    expect(paths).not.toContain('src/cli.ts');
    expect(paths).not.toContain('.env');
    const manifest = JSON.parse(
      await readFile(join(artifact, 'package.json'), 'utf8'),
    );
    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.bin['open-skill-kit']).toBe('./bin/open-skill-kit.js');
    const consumer = join(temp, 'npm-consumer');
    await mkdir(consumer);
    await writeFile(
      join(consumer, 'package.json'),
      JSON.stringify({ name: 'consumer', version: '1.0.0', private: true }),
    );
    await execute(
      'npm',
      [
        'install',
        join(temp, info.filename),
        '--offline',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
      ],
      { cwd: consumer, env },
    );
    const result = await execute(
      'npm',
      ['exec', '--offline', '--', 'open-skill-kit', 'list'],
      { cwd: consumer, env },
    );
    expect(result.stdout).toContain('education/example-skill');
    await execute(
      'npm',
      [
        'exec',
        '--offline',
        '--',
        'open-skill-kit',
        'add',
        'example-skill',
        '--dir',
        'installed',
      ],
      { cwd: consumer, env },
    );
    await access(join(consumer, 'installed/example-skill/SKILL.md'));
    const source = await readFile(
      join(artifact, 'bin/open-skill-kit.js'),
      'utf8',
    );
    expect(source.startsWith('#!/usr/bin/env node')).toBe(true);
  }, 20_000);
});
