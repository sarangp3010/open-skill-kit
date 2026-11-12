import { posix, win32 } from 'node:path';
/** Windows is case-insensitive; POSIX case/alias checks remain exact. */
export function sameFilesystemPath(
  a: string,
  b: string,
  platform: NodeJS.Platform = process.platform,
) {
  const paths = platform === 'win32' ? win32 : posix;
  const left =
      platform === 'win32'
        ? win32.toNamespacedPath(paths.resolve(a))
        : paths.resolve(a),
    right =
      platform === 'win32'
        ? win32.toNamespacedPath(paths.resolve(b))
        : paths.resolve(b);
  return platform === 'win32'
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}
