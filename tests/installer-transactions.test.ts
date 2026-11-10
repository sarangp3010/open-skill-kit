import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { readSkillFiles } from '../packages/catalog-indexer/src/index';
import { validateSkill } from '../packages/skill-validator/src/index';
import {
  installManagedSkill,
  installationRoot,
  uninstallManagedSkill,
  RECEIPT,
} from '../packages/skill-installer/src/index';
import type { DiscoverySkill } from '../packages/skill-schema/src/index';

vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>();
  return {
    ...actual,
    rename: vi.fn(actual.rename),
    unlink: vi.fn(actual.unlink),
  };
});
let temp: string;
let project: string;
let skill: DiscoverySkill;
let target: string;
let receipt: string;
beforeEach(async () => {
  vi.clearAllMocks();
  temp = await mkdtemp(join(await realpath(tmpdir()), 'osk-transactions-'));
  project = join(temp, 'project');
  await mkdir(project);
  skill = validateSkill(
    await readSkillFiles(
      resolve('tests/fixtures/valid/education/example-skill'),
    ),
    'education/example-skill',
    { profile: 'catalog' },
  ).skill!;
  target = (
    await installManagedSkill(skill, {
      platform: 'codex',
      projectDir: project,
      allowDraft: true,
    })
  ).target;
  receipt = await readFile(join(target, RECEIPT), 'utf8');
});
afterEach(async () => {
  vi.mocked(rename).mockClear();
  vi.mocked(unlink).mockClear();
  await rm(temp, { recursive: true, force: true });
});
async function unchanged() {
  for (const [path, content] of Object.entries(skill.files))
    expect(await readFile(join(target, path), 'utf8')).toBe(content);
  expect(await readFile(join(target, RECEIPT), 'utf8')).toBe(receipt);
  expect(
    await readdir(installationRoot({ platform: 'codex', projectDir: project })),
  ).toEqual([skill.slug]);
}
const update = () =>
  installManagedSkill(skill, {
    platform: 'codex',
    projectDir: project,
    allowDraft: true,
    update: true,
  });
it('leaves the installation intact if moving the old directory fails', async () => {
  vi.mocked(rename).mockRejectedValueOnce(
    new Error('simulated rename failure'),
  );
  await expect(update()).rejects.toThrow('simulated rename failure');
  await unchanged();
});
it('rolls back the original full package if publishing the staged update fails', async () => {
  const actual =
    await vi.importActual<typeof import('node:fs/promises')>(
      'node:fs/promises',
    );
  vi.mocked(rename)
    .mockImplementationOnce(actual.rename)
    .mockRejectedValueOnce(new Error('simulated publish failure'));
  await expect(update()).rejects.toThrow('simulated publish failure');
  await unchanged();
});
it('restores user files added while the old package is being moved', async () => {
  const actual =
    await vi.importActual<typeof import('node:fs/promises')>(
      'node:fs/promises',
    );
  vi.mocked(rename).mockImplementationOnce(async (from, to) => {
    await actual.rename(from, to);
    await writeFile(join(String(to), 'private.txt'), 'concurrent user data');
  });
  await expect(update()).rejects.toThrow('additional files');
  expect(await readFile(join(target, 'private.txt'), 'utf8')).toBe(
    'concurrent user data',
  );
  expect(await readFile(join(target, 'SKILL.md'), 'utf8')).toBe(
    skill.files['SKILL.md'],
  );
  expect(await readFile(join(target, RECEIPT), 'utf8')).toBe(receipt);
});
it('restores the directory if removal fails before deleting managed files', async () => {
  vi.mocked(unlink).mockRejectedValueOnce(
    new Error('simulated unlink failure'),
  );
  await expect(
    uninstallManagedSkill(skill.id, { platform: 'codex', projectDir: project }),
  ).rejects.toThrow('simulated unlink failure');
  await unchanged();
});
