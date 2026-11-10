import { z } from 'zod';
import { safePathSchema } from './paths';

const githubName = z.string().regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i);
export const attributionRecordSchema = z
  .object({
    skillId: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/),
    displayName: z.string().trim().min(1).max(120),
    githubUsername: githubName,
    reviewedBy: githubName,
    reviewedAt: z.string().datetime(),
    reviewUrl: z
      .string()
      .regex(
        /^https:\/\/github\.com\/sarangp3010\/open-skill-kit\/pull\/[1-9]\d*$/,
      ),
    packageDigest: z.string().regex(/^[a-f0-9]{64}$/),
    evidencePath: safePathSchema.refine((path) =>
      /^docs\/attributions\/[a-z0-9-]+\.md$/.test(path),
    ),
    evidenceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .refine(
    (record) =>
      record.githubUsername.toLowerCase() !== record.reviewedBy.toLowerCase(),
    'Attribution requires a separate reviewer',
  );
export const attributionRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    records: z.array(attributionRecordSchema).max(500),
  })
  .strict()
  .superRefine(({ records }, ctx) => {
    if (
      new Set(records.map((record) => record.skillId)).size !== records.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate attribution skill IDs',
      });
  });
export const attributionSummarySchema = z
  .object({
    record: attributionRecordSchema,
    status: z.enum(['current', 'stale']),
  })
  .strict();
export type AttributionRecord = z.infer<typeof attributionRecordSchema>;
