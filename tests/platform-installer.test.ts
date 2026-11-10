import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  access,
  cp,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { readSkillFiles } from '../packages/catalog-indexer/src/index';
import { validateSkill } from '../packages/skill-validator/src/index';
import {
  platforms,
  getPlatform,
  getScope,
  getInstallInstructions,
} from '../packages/platform-adapters/src/index';
import {
  RECEIPT,
  installationRoot,
  inspectInstallations,
  installManagedSkill,
  uninstallManagedSkill,
  type InstallationContext,
} from '../packages/skill-installer/src/index';
import { runCli } from '../packages/cli/src/index';
import type { DiscoverySkill } from '../packages/skill-schema/src/index';

let temp: string;
let project: string;
let home: string;
let skill: DiscoverySkill;
beforeEach(async () => {
  temp = await mkdtemp(join(await realpath(tmpdir()), 'osk-adapters-'));
  project = join(temp, 'project');
  home = join(temp, 'home');
  await mkdir(project);
  await mkdir(home);
  const files = await readSkillFiles(
    resolve('tests/fixtures/valid/education/example-skill'),
  );
  skill = validateSkill(files, 'education/example-skill', {
    profile: 'catalog',
  }).skill!;
});
afterEach(async () => {
  await rm(temp, { recursive: true, force: true });
});
const context = (
  platform = 'codex',
  scope: 'project' | 'global' = 'project',
): InstallationContext => ({
  platform,
  scope,
  projectDir: project,
  homeDir: home,
});
const install = (ctx = context(), source = skill) =>
  installManagedSkill(source, { ...ctx, allowDraft: true });
async function invoke(args: string[]) {
  const lines: string[] = [];
  await runCli(args, {
    dataRoot: join(temp, 'missing-bundle'),
    cwd: project,
    homeDir: home,
    version: '0.1.0',
    log: (line) => lines.push(line),
  });
  return lines.join('\n');
}
describe('documented platform adapters', () => {
  it('uses verified project and global conventions without Node imports', () => {
    expect(platforms.map(({ id, directory }) => [id, directory])).toEqual([
      ['codex', '.agents/skills'],
      ['claude-code', '.claude/skills'],
      ['cursor', '.cursor/skills'],
      ['gemini-cli', '.gemini/skills'],
    ]);
    for (const adapter of platforms) {
      expect(installationRoot(context(adapter.id))).toBe(
        join(project, adapter.directory),
      );
      expect(installationRoot(context(adapter.id, 'global'))).toBe(
        join(home, adapter.directory),
      );
      const instructions = getInstallInstructions(skill, adapter.id, 'project');
      expect(instructions.command).toContain(
        `install ${skill.id} --platform ${adapter.id}`,
      );
      expect(instructions.command).toContain('--source ./skills');
      expect(instructions.command).toContain('--allow-draft');
      expect(instructions.preview).toBe(`${instructions.command} --dry-run`);
      expect(
        getInstallInstructions(skill, adapter.id, 'global').command,
      ).not.toContain('--project-dir');
    }
  });
  it('rejects unsupported platforms, scopes, reserved names and command injection', () => {
    expect(() => getPlatform('unknown')).toThrow('Unsupported platform');
    expect(() => getScope('system')).toThrow('Unsupported scope');
    expect(() =>
      getInstallInstructions(
        { ...skill, id: 'education/example;touch-file' },
        'codex',
        'project',
      ),
    ).toThrow('Invalid skill ID');
    expect(() =>
      getInstallInstructions(
        { ...skill, id: 'education/synced' },
        'claude-code',
        'project',
      ),
    ).toThrow('Reserved');
  });
});
describe('managed full-package lifecycle', () => {
  for (const adapter of platforms)
    for (const scope of ['project', 'global'] as const) {
      it(`${adapter.id} ${scope}: installs, inspects and safely uninstalls every supporting file`, async () => {
        const ctx = context(adapter.id, scope);
        const result = await install(ctx);
        for (const [path, content] of Object.entries(skill.files))
          expect(await readFile(join(result.target, path), 'utf8')).toBe(
            content,
          );
        expect(await inspectInstallations(ctx)).toMatchObject([
          { state: 'managed', id: skill.id, version: skill.version },
        ]);
        await uninstallManagedSkill(skill.id, ctx);
        await expect(access(result.target)).rejects.toThrow();
        expect(await readdir(installationRoot(ctx))).toEqual([]);
      });
    }
  it('dry runs have no filesystem effects, including missing platform roots', async () => {
    await installManagedSkill(skill, {
      ...context(),
      allowDraft: true,
      dryRun: true,
    });
    expect(await readdir(project)).toEqual([]);
    const result = await install();
    const before = await readFile(join(result.target, RECEIPT), 'utf8');
    await installManagedSkill(skill, {
      ...context(),
      update: true,
      allowDraft: true,
      dryRun: true,
    });
    await uninstallManagedSkill(skill.id, { ...context(), dryRun: true });
    expect(await readFile(join(result.target, RECEIPT), 'utf8')).toBe(before);
  });
  it('requires explicit draft opt-in and validates packages before writing', async () => {
    await expect(installManagedSkill(skill, context())).rejects.toThrow(
      '--allow-draft',
    );
    await expect(
      installManagedSkill(
        { ...skill, files: { ...skill.files, '../escape.txt': 'unsafe' } },
        { ...context(), allowDraft: true },
      ),
    ).rejects.toThrow('Invalid skill');
    expect(await readdir(project)).toEqual([]);
  });
  it('rejects directory aliases and file/directory collisions before creating destinations', async () => {
    const variants: Record<string, string>[] = [
      { 'References/a.txt': 'a', 'references/b.txt': 'b' },
      { 'notes.txt': 'file', 'notes.txt/inside.md': 'nested' },
    ];
    for (const additions of variants) {
      await expect(
        install(context(), {
          ...skill,
          files: { ...skill.files, ...additions },
        }),
      ).rejects.toThrow('Conflicting');
      expect(await readdir(project)).toEqual([]);
    }
  });
  it('updates complete packages and removes obsolete managed files', async () => {
    skill.files['notes.txt'] = 'obsolete';
    const result = await install();
    const files = { ...skill.files };
    delete files['notes.txt'];
    files['references/new.md'] = '# New supporting reference\n';
    files['metadata.json'] = JSON.stringify({
      ...JSON.parse(files['metadata.json']),
      version: '1.1.0',
    });
    const next = validateSkill(files, skill.id, { profile: 'catalog' }).skill!;
    await installManagedSkill(next, {
      ...context(),
      update: true,
      allowDraft: true,
    });
    await expect(access(join(result.target, 'notes.txt'))).rejects.toThrow();
    expect(
      await readFile(join(result.target, 'references/new.md'), 'utf8'),
    ).toBe(files['references/new.md']);
    expect(await inspectInstallations(context())).toMatchObject([
      { state: 'managed', version: '1.1.0' },
    ]);
    expect(
      (await readdir(installationRoot(context()))).filter((name) =>
        name.startsWith('.open-skill-kit'),
      ),
    ).toEqual([]);
  });
  it.each(['modified', 'missing', 'extra', 'empty directory'] as const)(
    'preserves %s user changes on both update and removal',
    async (kind) => {
      const { target } = await install();
      if (kind === 'modified')
        await writeFile(join(target, 'SKILL.md'), 'my edits');
      if (kind === 'missing') await rm(join(target, 'examples/input.md'));
      if (kind === 'extra')
        await writeFile(join(target, 'private.txt'), 'user owned');
      if (kind === 'empty directory')
        await mkdir(join(target, 'my-empty-directory'));
      const receiptBefore = await readFile(join(target, RECEIPT), 'utf8');
      expect(await inspectInstallations(context())).toMatchObject([
        { state: 'modified' },
      ]);
      await expect(
        installManagedSkill(skill, {
          ...context(),
          allowDraft: true,
          update: true,
        }),
      ).rejects.toThrow();
      await expect(
        uninstallManagedSkill(skill.id, context()),
      ).rejects.toThrow();
      expect(await readFile(join(target, RECEIPT), 'utf8')).toBe(receiptBefore);
      if (kind === 'extra')
        expect(await readFile(join(target, 'private.txt'), 'utf8')).toBe(
          'user owned',
        );
      if (kind === 'modified')
        expect(await readFile(join(target, 'SKILL.md'), 'utf8')).toBe(
          'my edits',
        );
    },
  );
  it('never adopts, overwrites or deletes unmanaged installations', async () => {
    const target = join(installationRoot(context()), skill.slug);
    await mkdir(target, { recursive: true });
    await writeFile(join(target, 'SKILL.md'), 'user owned');
    await expect(install()).rejects.toThrow('already exists');
    await expect(uninstallManagedSkill(skill.id, context())).rejects.toThrow();
    await expect(
      installManagedSkill(skill, {
        ...context(),
        update: true,
        allowDraft: true,
      }),
    ).rejects.toThrow();
    expect(await inspectInstallations(context())).toMatchObject([
      { state: 'unmanaged' },
    ]);
    expect(await readFile(join(target, 'SKILL.md'), 'utf8')).toBe('user owned');
  });
  it('blocks case-insensitive collisions and concurrent operations', async () => {
    const root = installationRoot(context());
    await mkdir(join(root, skill.slug.toUpperCase()), { recursive: true });
    await expect(install()).rejects.toThrow('already exists');
    await rm(root, { recursive: true });
    const results = await Promise.allSettled([install(), install()]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(await inspectInstallations(context())).toMatchObject([
      { state: 'managed' },
    ]);
  });
  it('fails clearly for a pre-existing lock without deleting it', async () => {
    const root = installationRoot(context());
    await mkdir(root, { recursive: true });
    await writeFile(join(root, '.open-skill-kit.lock'), 'another process');
    await expect(install()).rejects.toThrow('locked');
    expect(await readFile(join(root, '.open-skill-kit.lock'), 'utf8')).toBe(
      'another process',
    );
  });
  it('rejects mismatched or traversal-bearing receipts before mutation', async () => {
    const { target } = await install();
    const receipt = JSON.parse(await readFile(join(target, RECEIPT), 'utf8'));
    for (const changed of [
      { ...receipt, id: 'another/example-skill' },
      { ...receipt, platform: 'cursor' },
      {
        ...receipt,
        files: { ...receipt.files, '../escape.txt': 'a'.repeat(64) },
      },
    ]) {
      await writeFile(join(target, RECEIPT), JSON.stringify(changed));
      await expect(
        uninstallManagedSkill(skill.id, context()),
      ).rejects.toThrow();
      await expect(
        installManagedSkill(skill, {
          ...context(),
          allowDraft: true,
          update: true,
        }),
      ).rejects.toThrow();
      expect(await readFile(join(target, 'SKILL.md'), 'utf8')).toBe(
        skill.files['SKILL.md'],
      );
    }
  });
  it('rejects traversal, absolute paths, unsupported platforms and sibling-ID removal', async () => {
    for (const name of [
      '../escape',
      '/tmp/escape',
      'education/../../escape',
      '..\\escape',
    ])
      await expect(uninstallManagedSkill(name, context())).rejects.toThrow();
    await expect(install(context('bad'))).rejects.toThrow(
      'Unsupported platform',
    );
    await install();
    await expect(
      uninstallManagedSkill('another/example-skill', context()),
    ).rejects.toThrow('ID does not match');
  });
  it('blocks symlinked ancestors, skill folders, receipts, supporting files and hard links', async () => {
    const outside = join(temp, 'outside');
    await mkdir(outside);
    await symlink(outside, join(project, '.agents'), 'dir');
    await expect(install()).rejects.toThrow('ordinary directories');
    expect(await readdir(outside)).toEqual([]);
    await rm(join(project, '.agents'));
    const root = installationRoot(context());
    await mkdir(root, { recursive: true });
    await symlink(outside, join(root, skill.slug), 'dir');
    await expect(install()).rejects.toThrow('already exists');
    await expect(uninstallManagedSkill(skill.id, context())).rejects.toThrow();
    await rm(join(root, skill.slug));
    const { target } = await install();
    const receipt = await readFile(join(target, RECEIPT), 'utf8');
    await writeFile(join(outside, 'receipt.json'), receipt);
    await rm(join(target, RECEIPT));
    await symlink(join(outside, 'receipt.json'), join(target, RECEIPT));
    await expect(uninstallManagedSkill(skill.id, context())).rejects.toThrow(
      'receipt',
    );
    await rm(join(target, RECEIPT));
    await writeFile(join(target, RECEIPT), receipt);
    await rm(join(target, 'examples/input.md'));
    await writeFile(
      join(outside, 'input.md'),
      skill.files['examples/input.md'],
    );
    await symlink(join(outside, 'input.md'), join(target, 'examples/input.md'));
    await expect(uninstallManagedSkill(skill.id, context())).rejects.toThrow(
      'Symlinks',
    );
    await rm(join(target, 'examples/input.md'));
    await link(join(outside, 'input.md'), join(target, 'examples/input.md'));
    await expect(uninstallManagedSkill(skill.id, context())).rejects.toThrow(
      'Unsafe installed',
    );
    expect(await readFile(join(outside, 'input.md'), 'utf8')).toBe(
      skill.files['examples/input.md'],
    );
  });
});
describe('CLI adapter commands using explicit local sources', () => {
  async function source() {
    const root = join(temp, 'source');
    await cp(resolve('tests/fixtures/valid'), root, { recursive: true });
    return root;
  }
  it('lists, installs, inspects, updates and removes without a published bundle or real home writes', async () => {
    const root = await source();
    expect(await invoke(['platforms'])).toContain('gemini-cli');
    expect(await invoke(['list', 'example', '--source', root])).toContain(
      'draft',
    );
    expect(await invoke(['show', skill.id, '--source', root])).toContain(
      '## Workflow',
    );
    const flags = ['--platform', 'cursor', '--scope', 'global'];
    expect(
      await invoke([
        'install',
        skill.id,
        '--source',
        root,
        '--allow-draft',
        '--dry-run',
        ...flags,
      ]),
    ).toContain('Would Install');
    expect(await readdir(home)).toEqual([]);
    await invoke([
      'install',
      skill.id,
      '--source',
      root,
      '--allow-draft',
      ...flags,
    ]);
    expect(await invoke(['installed', ...flags])).toContain('managed');
    expect(await invoke(['inspect', skill.slug, ...flags])).toContain(skill.id);
    await invoke([
      'update',
      skill.id,
      '--source',
      root,
      '--allow-draft',
      ...flags,
    ]);
    await invoke(['uninstall', skill.id, ...flags]);
    expect(await invoke(['installed', ...flags])).toContain('No installed');
  });
  it('supports an explicit target project while resolving source paths from the invoking directory', async () => {
    const root = await source();
    const target = join(temp, 'other project');
    await mkdir(target);
    await invoke([
      'install',
      skill.id,
      '--source',
      root,
      '--platform',
      'gemini-cli',
      '--project-dir',
      target,
      '--allow-draft',
    ]);
    await access(join(target, '.gemini/skills', skill.slug, 'SKILL.md'));
    expect(await readdir(project)).toEqual([]);
  });
  it.each([
    ['install', 'example-skill'],
    ['install', 'example-skill', '--platform', 'bad'],
    ['install', 'example-skill', '--platform', 'codex', '--scope', 'system'],
    ['install', 'example-skill', '--platform', 'codex', '--platform', 'cursor'],
    ['install', 'example-skill', '--platform'],
    ['uninstall', '../escape', '--platform', 'codex'],
    ['inspect', '../escape', '--platform', 'codex'],
    ['installed', '--platform', 'codex', '--source', 'x'],
    ['install', 'example-skill', '--platform', 'codex', '--force'],
    [
      'installed',
      '--platform',
      'codex',
      '--scope',
      'global',
      '--project-dir',
      'x',
    ],
  ])('rejects malformed or unsupported invocation %j', async (...args) => {
    await expect(invoke(args)).rejects.toThrow();
    expect(await readdir(project)).toEqual([]);
  });
  it('rejects a symlinked source ancestor before reading it', async () => {
    const root = await source();
    const alias = join(temp, 'alias');
    await symlink(dirname(root), alias, 'dir');
    await expect(
      invoke(['list', '--source', join(alias, 'source')]),
    ).rejects.toThrow('ordinary directories');
  });
});
