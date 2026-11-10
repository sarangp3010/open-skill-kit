import { execFileSync } from 'node:child_process';
import { lstat, readdir } from 'node:fs/promises';
import { dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isReservedFilename,
  portablePathKey,
} from '../packages/skill-schema/src/paths';
export function portabilityErrors(paths: string[]) {
  const seen = new Map<string, string>(),
    errors: string[] = [];
  for (const path of paths) {
    if (
      path !== path.normalize('NFC') ||
      /[\\:<>"|?*]/.test(path) ||
      [...path].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) ||
      path
        .split('/')
        .some(
          (part) =>
            !part ||
            part === '.' ||
            part === '..' ||
            /[. ]$/.test(part) ||
            isReservedFilename(part),
        )
    )
      errors.push(`${path}: nonportable filename`);
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join('/'),
        key = portablePathKey(prefix),
        previous = seen.get(key);
      if (previous && previous !== prefix)
        errors.push(`${path}: case/Unicode alias of ${previous}`);
      else seen.set(key, prefix);
    }
  }
  return [...new Set(errors)];
}
export async function checkRepositoryPortability(root: string) {
  const candidates = execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { cwd: root, encoding: 'utf8' },
    )
      .split('\0')
      .filter(Boolean),
    paths = [];
  for (const path of candidates) {
    try {
      const actual = resolve(root, path),
        info = await lstat(actual);
      // Pending deletions/case aliases in the index must not stand in for real files.
      if (!(await readdir(dirname(actual))).includes(basename(actual)))
        continue;
      if (info.isSymbolicLink())
        throw new Error(
          `${path}: repository symlinks need explicit platform handling`,
        );
      paths.push(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  const errors = portabilityErrors(paths);
  if (errors.length) throw new Error(errors.join('\n'));
  return paths.length;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(
      `Portable repository filenames checked: ${await checkRepositoryPortability(fileURLToPath(new URL('../', import.meta.url)))}. Native platform execution evidence is separate.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
