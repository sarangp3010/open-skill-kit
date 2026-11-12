import { sameFilesystemPath } from './path-identity';
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  attributionRegistrySchema,
  maintainersSchema,
  type AttributionRecord,
  type DiscoverySkill,
} from '@uas/skill-schema';
import { packageDigest } from './trust';

async function boundedFile(path: string, limit: number) {
  const info = await lstat(path);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    info.nlink !== 1 ||
    info.size > limit ||
    !sameFilesystemPath(await realpath(path), path)
  )
    throw new Error(`Unsafe attribution file: ${path}`);
  return readFile(path);
}
export async function readAttributions(
  root: string,
  now = new Date(),
): Promise<AttributionRecord[]> {
  const registry = resolve(root, 'catalog/attributions.json');
  let raw: Buffer;
  try {
    raw = await boundedFile(registry, 1048576);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const { records } = attributionRegistrySchema.parse(
    JSON.parse(
      new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw),
    ),
  );
  if (!records.length) return records;
  // Same checked-in authorization source as local publication review validation.
  // PR moderation additionally checks this against the trusted base roster.
  const roster = maintainersSchema.parse(
    JSON.parse(
      (
        await boundedFile(resolve(root, 'catalog/maintainers.json'), 1048576)
      ).toString('utf8'),
    ),
  ).maintainers;
  for (const record of records) {
    if (
      !roster.some(
        (name) => name.toLowerCase() === record.reviewedBy.toLowerCase(),
      )
    )
      throw new Error(
        `${record.skillId}: attribution reviewer is not an authorized maintainer`,
      );
    const reviewedAt = Date.parse(record.reviewedAt);
    if (
      !Number.isFinite(reviewedAt) ||
      !Number.isFinite(now.getTime()) ||
      reviewedAt > now.getTime()
    )
      throw new Error(
        `${record.skillId}: attribution review date is invalid or in the future`,
      );
    const evidence = await boundedFile(
      resolve(root, record.evidencePath),
      65536,
    );
    try {
      const text = new TextDecoder('utf-8', {
        fatal: true,
        ignoreBOM: true,
      }).decode(evidence);
      if (!text.trim() || text.includes('\0'))
        throw new Error('Empty or binary review');
    } catch (error) {
      throw new Error(
        `${record.evidencePath}: attribution review must be nonempty UTF-8 text`,
        { cause: error },
      );
    }
    if (
      createHash('sha256').update(evidence).digest('hex') !==
      record.evidenceDigest
    )
      throw new Error(
        `${record.evidencePath}: attribution review evidence digest mismatch`,
      );
  }
  return records;
}
/** Current means package-hash freshness, not independent identity verification. */
export function assessAttribution(
  record: AttributionRecord,
  skill: DiscoverySkill,
) {
  return {
    record,
    status:
      record.packageDigest === packageDigest(skill.files)
        ? ('current' as const)
        : ('stale' as const),
  };
}
