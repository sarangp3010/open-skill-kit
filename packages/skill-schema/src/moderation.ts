import { z } from 'zod';
import { safePathSchema } from './paths';
const id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const reviewEvidenceSchema = z
  .object({
    path: z
      .string()
      .max(240)
      .refine(
        (path) => safePathSchema.safeParse(path).success,
        'Use a portable evidence path',
      )
      .regex(
        /^(?:skills|reviews|evaluations|docs)\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/,
      )
      .refine(
        (path) =>
          path
            .split('/')
            .every((part) => part !== '..' && part !== '.' && part !== ''),
        'Evidence must use a canonical repository-relative path',
      ),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
/** A human-authored statement; parsing cannot authenticate the person named here. */
export const maintainerReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    skillId: id,
    packageDigest: z.string().regex(/^[a-f0-9]{64}$/),
    reviewer: z.string().regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i),
    reviewedAt: z.string().datetime(),
    decision: z.enum(['approved', 'rejected', 'withdrawn']),
    pullRequest: z.number().int().positive(),
    reason: z.string().trim().min(20).max(4000),
    checks: z
      .object({
        schema: z.string().trim().min(20).max(4000),
        safety: z.string().trim().min(20).max(4000),
        originality: z.string().trim().min(20).max(4000),
        usefulness: z.string().trim().min(20).max(4000),
        completeness: z.string().trim().min(20).max(4000),
        compatibility: z.string().trim().min(20).max(4000),
        evaluation: z.string().trim().min(20).max(4000),
        limitations: z.string().trim().min(20).max(4000),
      })
      .strict(),
    reviewReport: reviewEvidenceSchema.refine(
      (ref) =>
        ref.path.startsWith('reviews/founding/reports/') &&
        ref.path.endsWith('.json'),
      'Use the generated founding report',
    ),
    evidenceReferences: z.array(reviewEvidenceSchema).min(1).max(50),
  })
  .strict();
export type MaintainerReview = z.infer<typeof maintainerReviewSchema>;
export const submissionRequestSchema = z.discriminatedUnion('operation', [
  z
    .object({ schemaVersion: z.literal(1), operation: z.literal('new') })
    .strict(),
  z
    .object({
      schemaVersion: z.literal(1),
      operation: z.literal('update'),
      basePackageDigest: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
]);
export const publicationRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    decisions: z
      .array(
        z
          .object({
            skillId: id,
            packageDigest: z.string().regex(/^[a-f0-9]{64}$/),
            decision: z.enum(['approved', 'withdrawn']),
            reviewer: z.string().regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i),
            reviewedAt: z.string().datetime(),
            pullRequest: z.number().int().positive(),
            reason: z.string().trim().min(20).max(4000),
            reviewRecord: reviewEvidenceSchema
              .refine(
                (ref) =>
                  ref.path.startsWith('reviews/maintainer/') &&
                  ref.path.endsWith('.json'),
                'Use a maintainer review record',
              )
              .optional(),
          })
          .strict(),
      )
      .max(1000),
  })
  .strict()
  .superRefine(({ decisions }, ctx) => {
    if (
      new Set(decisions.map((record) => record.skillId)).size !==
      decisions.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Only one current publication decision per skill is allowed',
      });
  });
export type PublicationRegistry = z.infer<typeof publicationRegistrySchema>;

export const maintainersSchema = z
  .object({
    schemaVersion: z.literal(1),
    maintainers: z
      .array(z.string().regex(/^[a-z0-9-]{1,39}$/i))
      .min(1)
      .max(50),
  })
  .strict();

export const foundingNotesSchema = z
  .object({
    schemaVersion: z.literal(1),
    assessmentKind: z.literal(
      'assistant-preliminary-content-triage-not-maintainer-approval',
    ),
    notes: z.array(
      z
        .object({
          skillId: z.string(),
          usefulness: z.string().min(20),
          safetyConcerns: z.string().min(20),
          nextReview: z.string().min(20),
          shortlistRank: z.number().int().min(1).max(15).nullable(),
        })
        .strict(),
    ),
  })
  .strict();

/** Evidence fields consumed by the gate; detailed triage fields remain descriptive. */
export const foundingEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    skillId: id,
    packageDigest: z.string().regex(/^[a-f0-9]{64}$/),
    schema: z
      .object({ catalog: z.object({ valid: z.boolean() }).passthrough() })
      .passthrough(),
    quality: z.object({ blocked: z.boolean() }).passthrough(),
    sourceFiles: z.array(reviewEvidenceSchema).min(1).max(100),
    evaluation: z
      .object({
        fixtureDefinitions: z.array(reviewEvidenceSchema.passthrough()).max(50),
        completedArtifacts: z
          .array(
            z
              .object({ reportPath: z.string(), reportDigest: z.string() })
              .passthrough(),
          )
          .max(50),
      })
      .passthrough(),
  })
  .passthrough();
