import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/** Reuse the npm distributor's license collection for the browser bundle too. */
export const isDependencyModuleId = (id: string) =>
  !id.startsWith('\0') && id.replaceAll('\\', '/').includes('node_modules/');
export async function dependencyNoticeRecord(directory: string) {
  const raw = await readFile(join(directory, 'package.json'), 'utf8');
  const manifest = JSON.parse(raw);
  const notices = [];
  for (const name of (await readdir(directory))
    .filter((name) => /^(licen[cs]e|copying|notice)([.-]|$)/i.test(name))
    .sort()) {
    const bytes = await readFile(join(directory, name));
    notices.push({
      file: name,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return {
    name: manifest.name as string,
    version: manifest.version as string,
    license: manifest.license ?? manifest.licenses ?? null,
    repository: manifest.repository ?? null,
    manifestSha256: createHash('sha256').update(raw).digest('hex'),
    notices,
  };
}
export type DependencyNoticeRecord = Awaited<
  ReturnType<typeof dependencyNoticeRecord>
>;
export async function thirdPartyNotices(
  inputs: Iterable<string>,
  overrideDirectory?: string,
  observe?: (record: DependencyNoticeRecord) => void,
) {
  const dependencyNotices = new Map<string, string>();
  const missing = new Set<string>();
  for (let input of inputs) {
    if (!isDependencyModuleId(input)) continue;
    input = input.replaceAll('\\', '/');
    input = input.split('?')[0];
    let directory = dirname(resolve(input));
    while (dirname(directory) !== directory) {
      let dependency: { name?: string; version?: string } | undefined;
      try {
        dependency = JSON.parse(
          await readFile(join(directory, 'package.json'), 'utf8'),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (dependency?.name) {
        const key = `${dependency.name}@${dependency.version}`;
        if (!dependencyNotices.has(key)) {
          observe?.(await dependencyNoticeRecord(directory));
          const licenses = (await readdir(directory))
            .filter((name) =>
              /^(licen[cs]e|copying|notice)([.-]|$)/i.test(name),
            )
            .sort();
          if (!licenses.length) {
            if (overrideDirectory) {
              const overrides = JSON.parse(
                await readFile(
                  join(overrideDirectory, 'license-overrides.json'),
                  'utf8',
                ),
              ) as Record<
                string,
                {
                  license: string;
                  file: string;
                  sha256: string;
                  source: string;
                  note?: string;
                }
              >;
              const override = overrides[key];
              if (override) {
                if (
                  !/^[a-z0-9.-]+-LICENSE\.txt$/.test(override.file) ||
                  !/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[a-f0-9]{40}\/LICENSE$/.test(
                    override.source,
                  )
                )
                  throw new Error(`Unsafe license override: ${key}`);
                const source = await readFile(
                  join(overrideDirectory, override.file),
                );
                const manifest = JSON.parse(
                  await readFile(join(directory, 'package.json'), 'utf8'),
                );
                if (
                  manifest.license !== override.license ||
                  createHash('sha256').update(source).digest('hex') !==
                    override.sha256
                )
                  throw new Error(`License override mismatch: ${key}`);
                dependencyNotices.set(
                  key,
                  `${key}\nSource: ${override.source}\n${override.note ? `Provenance limitation: ${override.note}\n` : ''}${source.toString('utf8')}`,
                );
                break;
              }
            }
            missing.add(key);
            break;
          }
          const notices = await Promise.all(
            licenses.map((name) => readFile(join(directory, name), 'utf8')),
          );
          dependencyNotices.set(key, `${key}\n${notices.join('\n')}`);
        }
        break;
      }
      directory = dirname(directory);
    }
  }
  if (missing.size)
    throw new Error(
      `Missing bundled dependency licenses: ${[...missing].join(', ')}`,
    );
  return [...dependencyNotices]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([, notice]) => notice)
    .join('\n\n---\n\n');
}
