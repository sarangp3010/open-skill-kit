import { lstat, mkdir } from 'node:fs/promises';
import { join, parse, resolve } from 'node:path';

export async function directoryPath(
  path: string,
  create: boolean,
): Promise<void> {
  const absolute = resolve(path);
  const { root } = parse(absolute);
  let current = root;
  for (const part of absolute
    .slice(root.length)
    .split(/[\\/]/)
    .filter(Boolean)) {
    current = join(current, part);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink() || !info.isDirectory())
        throw new Error(
          `Destination must contain ordinary directories only: ${current}`,
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (create) {
        try {
          await mkdir(current);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        }
        const info = await lstat(current);
        if (!info.isDirectory() || info.isSymbolicLink())
          throw new Error(`Unsafe destination directory: ${current}`, {
            cause: error,
          });
      }
    }
  }
}
