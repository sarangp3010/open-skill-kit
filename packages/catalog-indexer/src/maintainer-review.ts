import { sameFilesystemPath } from './path-identity';
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { publicationDigest } from './package-digest';
import {
  maintainerReviewSchema,
  reviewEvidenceSchema,
  maintainersSchema,
  foundingEvidenceSchema,
  type MaintainerReview,
  type PublicationRegistry,
} from '@uas/skill-schema';
export const evidenceDigest = (content: string | Uint8Array) =>
  createHash('sha256').update(content).digest('hex');

/** Local evidence only. Reject links/aliases, traversal, hard links and oversized data. */
export async function readReviewEvidence(
  root: string,
  input: unknown,
  observed?: Map<string, string>,
) {
  const ref = reviewEvidenceSchema.parse(input);
  const base = await realpath(root);
  const path = resolve(base, ref.path);
  if (relative(base, path).startsWith('..'))
    throw new Error('Evidence escapes repository');
  for (let part = path; part !== base; part = dirname(part)) {
    const info = await lstat(part);
    if (
      info.isSymbolicLink() ||
      !sameFilesystemPath(await realpath(part), part)
    )
      throw new Error(`Unsafe evidence alias: ${ref.path}`);
  }
  const info = await lstat(path);
  if (!info.isFile() || info.nlink !== 1 || info.size > 1048576)
    throw new Error(`Unsafe evidence file: ${ref.path}`);
  const bytes = await readFile(path);
  if (evidenceDigest(bytes) !== ref.sha256)
    throw new Error(`Evidence hash changed: ${ref.path}`);
  observed?.set(path, ref.sha256);
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
    bytes,
  );
}
export async function validateMaintainerReview(
  root: string,
  input: unknown,
  now = new Date(),
  observed?: Map<string, string>,
): Promise<MaintainerReview> {
  const review = maintainerReviewSchema.parse(input);
  const rosterPath = resolve(root, 'catalog/maintainers.json'),
    rosterBytes = await readFile(rosterPath);
  observed?.set(rosterPath, evidenceDigest(rosterBytes));
  const roster = maintainersSchema.parse(
    JSON.parse(rosterBytes.toString('utf8')),
  );
  if (!roster.maintainers.includes(review.reviewer))
    throw new Error('Reviewer is not an authorized maintainer');
  if (new Date(review.reviewedAt).getTime() > now.getTime())
    throw new Error('Review date cannot be in the future');
  const report = foundingEvidenceSchema.parse(
    JSON.parse(await readReviewEvidence(root, review.reviewReport, observed)),
  );
  if (
    report.schemaVersion !== 1 ||
    report.skillId !== review.skillId ||
    report.packageDigest !== review.packageDigest
  )
    throw new Error('Review report targets another package or stale hash');
  if (
    review.decision === 'approved' &&
    (!report.schema?.catalog?.valid || report.quality?.blocked)
  )
    throw new Error('Cannot approve an invalid or blocked review report');
  if (
    new Set(review.evidenceReferences.map((ref) => ref.path)).size !==
    review.evidenceReferences.length
  )
    throw new Error('Duplicate review evidence paths');
  const files: Record<string, string> = {};
  const prefix = `skills/${review.skillId}/`;
  for (const ref of report.sourceFiles) {
    if (
      !ref.path.startsWith(prefix) ||
      Object.hasOwn(files, ref.path.slice(prefix.length))
    )
      throw new Error('Review manifest must list each exact package file once');
    files[ref.path.slice(prefix.length)] = await readReviewEvidence(
      root,
      ref,
      observed,
    );
  }
  if (publicationDigest(files) !== review.packageDigest)
    throw new Error(
      'Review manifest does not reproduce the exact package hash',
    );
  for (const ref of [
    ...review.evidenceReferences,
    ...report.evaluation.fixtureDefinitions.map(({ path, sha256 }) => ({
      path,
      sha256,
    })),
    ...report.evaluation.completedArtifacts.map(
      ({ reportPath, reportDigest }) => ({
        path: reportPath,
        sha256: reportDigest,
      }),
    ),
  ])
    await readReviewEvidence(root, ref, observed);
  return review;
}
/** Read-only validation. No command here writes or manufactures human decisions. */
export async function validateRecordedReview(
  root: string,
  record: PublicationRegistry['decisions'][number],
  observed?: Map<string, string>,
) {
  if (!record.reviewRecord)
    throw new Error(
      `${record.skillId}: a human-completed reviewRecord is required`,
    );
  const review = await validateMaintainerReview(
    root,
    JSON.parse(await readReviewEvidence(root, record.reviewRecord, observed)),
    new Date(),
    observed,
  );
  for (const field of [
    'skillId',
    'packageDigest',
    'reviewer',
    'reviewedAt',
    'decision',
    'pullRequest',
    'reason',
  ] as const)
    if (review[field] !== record[field])
      throw new Error(
        `${record.skillId}: review record does not match ledger ${field}`,
      );
  return review;
}
