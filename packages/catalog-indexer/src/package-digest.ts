import { createHash } from 'node:crypto';
/** Exact admitted UTF-8 file map; no evidence file is excluded. */
export const publicationDigest = (files: Record<string, string>) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        Object.keys(files)
          .sort()
          .map((path) => [path, files[path]]),
      ),
    )
    .digest('hex');
