import { describe, it, expect, afterEach } from 'vitest';
import {
  mkdtemp,
  realpath,
  readFile,
  writeFile,
  rm,
  mkdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { safePathSchema, slugSchema } from '../packages/skill-schema/src/index';
import { sameFilesystemPath } from '../packages/catalog-indexer/src/path-identity';
import {
  readSkillFiles,
  publicationDigest,
} from '../packages/catalog-indexer/src/index';
import { directoryPath } from '../packages/skill-installer/src/filesystem';
import {
  portabilityErrors,
  checkRepositoryPortability,
} from '../scripts/check-portability';
import { isDependencyModuleId } from '../scripts/third-party-notices';
const temporary: string[] = [];
afterEach(async () => {
  for (const path of temporary.splice(0))
    await rm(path, { recursive: true, force: true });
});
describe('portable names and filesystem identity', () => {
  it.each(['con', 'aux', 'nul', 'prn', 'com1', 'lpt9'])(
    'rejects reserved sector/skill slug %s',
    (name) => {
      expect(slugSchema.safeParse(name).success).toBe(false);
    },
  );
  it.each([
    'CON.txt',
    'refs/COM¹.md',
    'refs/LPT².txt',
    'CONIN$.txt',
    'a/trailing.',
    'a/trailing ',
    'C:/escape.md',
    'a\\b.md',
    'cafe\u0301.md',
  ])('rejects nonportable package path %s', (path) => {
    expect(safePathSchema.safeParse(path).success).toBe(false);
  });
  it('distinguishes POSIX case and aliases but accepts native Windows drive case/separators/namespaces', () => {
    expect(
      sameFilesystemPath('C:\\Work\\skill', 'c:/work/skill', 'win32'),
    ).toBe(true);
    expect(
      sameFilesystemPath('\\\\?\\C:\\Work\\skill', 'c:/work/skill', 'win32'),
    ).toBe(true);
    expect(
      sameFilesystemPath(
        '\\\\server\\share\\skill',
        '//SERVER/share/skill',
        'win32',
      ),
    ).toBe(true);
    expect(sameFilesystemPath('/Repo/skill', '/repo/skill', 'linux')).toBe(
      false,
    );
    expect(
      sameFilesystemPath('/private/tmp/skill', '/tmp/skill', 'darwin'),
    ).toBe(false);
    expect(
      isDependencyModuleId('C:\\repo\\node_modules\\package\\index.js'),
    ).toBe(true);
  });
  it('detects case/Unicode collisions and keeps both historical documents under distinct names', async () => {
    expect(portabilityErrors(['docs/STATUS.md', 'docs/status.md'])).not.toEqual(
      [],
    );
    expect(
      portabilityErrors(['refs/café.md', 'refs/cafe\u0301.md']),
    ).not.toEqual([]);
    expect(
      portabilityErrors([
        'docs/IMPLEMENTATION_STATUS.md',
        'docs/implementation-status.md',
      ]),
    ).toEqual([]);
    expect(await checkRepositoryPortability(resolve('.'))).toBeGreaterThan(400);
    expect(
      await readFile(resolve('docs/implementation-status.md'), 'utf8'),
    ).toContain('Historical foundation record');
    expect(
      await readFile(resolve('docs/IMPLEMENTATION_STATUS.md'), 'utf8'),
    ).toContain('implementation-status.md');
  });
  it('uses native directory separators and retains BOM/CRLF changes in package hashes', async () => {
    const root = await mkdtemp(join(await realpath(tmpdir()), 'osk-portable-'));
    temporary.push(root);
    await directoryPath(join(root, 'nested', 'child'), true);
    await writeFile(join(root, 'nested', 'child', 'SKILL.md'), 'text\n');
    const before = publicationDigest(
      await readSkillFiles(join(root, 'nested', 'child')),
    );
    await writeFile(join(root, 'nested', 'child', 'SKILL.md'), '\uFEFFtext\n');
    const bom = await readSkillFiles(join(root, 'nested', 'child'));
    expect(bom['SKILL.md'].charCodeAt(0)).toBe(0xfeff);
    expect(publicationDigest(bom)).not.toBe(before);
    await writeFile(join(root, 'nested', 'child', 'SKILL.md'), 'text\r\n');
    expect(
      publicationDigest(await readSkillFiles(join(root, 'nested', 'child'))),
    ).not.toBe(before);
    if (sep === '/')
      await expect(
        directoryPath(join(root, 'bad\\name'), true),
      ).rejects.toThrow('Backslash');
    await mkdir(join(root, 'different'));
    expect(await readFile(resolve('.gitattributes'), 'utf8')).toContain(
      '* text=auto eol=lf',
    );
  });
});
