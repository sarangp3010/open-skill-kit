import { z } from 'zod';
import { safePathSchema, slugSchema } from './paths';

const text = z.string().min(1).max(16384);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const platform = z.enum(['codex', 'claude-code', 'cursor', 'gemini-cli']);
const content = z
  .record(safePathSchema, z.string().max(65536))
  .refine((files) => Object.keys(files).length <= 50, 'At most 50 files');
const assertionBase = {
  id: slugSchema,
  weight: z.number().int().min(1).max(100),
};
export const evaluationAssertionSchema = z.discriminatedUnion('type', [
  z
    .object({ ...assertionBase, type: z.literal('text-contains'), value: text })
    .strict(),
  z
    .object({ ...assertionBase, type: z.literal('text-excludes'), value: text })
    .strict(),
  z
    .object({
      ...assertionBase,
      type: z.literal('text-equals'),
      value: z.string().max(65536),
    })
    .strict(),
  z
    .object({
      ...assertionBase,
      type: z.literal('json-field-equals'),
      path: z
        .array(
          z
            .string()
            .min(1)
            .max(128)
            .refine(
              (key) => !['__proto__', 'prototype', 'constructor'].includes(key),
            ),
        )
        .max(10),
      value: z.union([
        z.string().max(16384),
        z.number(),
        z.boolean(),
        z.null(),
      ]),
    })
    .strict(),
  z
    .object({
      ...assertionBase,
      type: z.literal('file-exists'),
      path: safePathSchema,
    })
    .strict(),
  z
    .object({
      ...assertionBase,
      type: z.literal('file-equals'),
      path: safePathSchema,
      value: z.string().max(65536),
    })
    .strict(),
  z
    .object({
      ...assertionBase,
      type: z.literal('file-contains'),
      path: safePathSchema,
      value: text,
    })
    .strict(),
]);
export const evaluationObservationSchema = z
  .object({ output: z.string().max(65536), files: content })
  .strict();
export const evaluationScenarioSchema = z
  .object({
    id: slugSchema,
    prompt: text,
    files: content,
    assertions: z.array(evaluationAssertionSchema).min(1).max(30),
    fixtures: z
      .object({
        baseline: evaluationObservationSchema,
        assisted: evaluationObservationSchema,
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((scenario, ctx) => {
    const paths = [
      ...Object.keys(scenario.files),
      ...Object.keys(scenario.fixtures?.baseline.files ?? {}),
      ...Object.keys(scenario.fixtures?.assisted.files ?? {}),
      ...scenario.assertions.flatMap((item) =>
        'path' in item && typeof item.path === 'string' ? [item.path] : [],
      ),
    ];
    if (
      paths.some((path) => path.split('/')[0].toLowerCase() === 'skill-context')
    )
      ctx.addIssue({
        code: 'custom',
        message: 'skill-context is reserved for the runner',
      });
    if (
      new Set(scenario.assertions.map((item) => item.id)).size !==
      scenario.assertions.length
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate assertion IDs' });
  });
export const evaluationSuiteSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: slugSchema,
    skillId: z
      .string()
      .refine(
        (id) =>
          id.split('/').length === 2 &&
          id.split('/').every((part) => slugSchema.safeParse(part).success),
      ),
    description: text,
    scenarios: z.array(evaluationScenarioSchema).min(1).max(10),
  })
  .strict()
  .superRefine((suite, ctx) => {
    if (
      new Set(suite.scenarios.map((item) => item.id)).size !==
      suite.scenarios.length
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate scenario IDs' });
  });
export const evaluationLimitsSchema = z
  .object({
    timeoutMs: z.number().int().min(50).max(120000).default(10000),
    suiteTimeoutMs: z.number().int().min(50).max(300000).default(60000),
    maxOutputBytes: z.number().int().min(128).max(65536).default(32768),
    maxWorkspaceBytes: z
      .number()
      .int()
      .min(1024)
      .max(16777216)
      .default(4194304),
    maxWorkspaceEntries: z.number().int().min(10).max(1000).default(512),
    memoryMiB: z.number().int().min(128).max(2048).default(512),
    cpus: z.number().min(0.1).max(2).default(1),
    pids: z.number().int().min(8).max(128).default(64),
  })
  .strict();
export const agentEvaluationConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    enabled: z.literal(true),
    platform,
    engine: z.string().min(1).max(1024),
    image: z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._/:-]*@sha256:[a-f0-9]{64}$/),
    model: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,127}$/),
    network: z.boolean().default(false),
    credentialEnv: z
      .array(z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/))
      .max(4)
      .default([]),
    limits: evaluationLimitsSchema.default({
      timeoutMs: 10000,
      suiteTimeoutMs: 60000,
      maxOutputBytes: 32768,
      maxWorkspaceBytes: 4194304,
      maxWorkspaceEntries: 512,
      memoryMiB: 512,
      cpus: 1,
      pids: 64,
    }),
  })
  .strict();
export const evaluationAssertionResultSchema = z
  .object({
    id: slugSchema,
    passed: z.boolean(),
    weight: z.number().int().positive(),
    earned: z.number().int().nonnegative(),
    message: z.string().max(1024),
  })
  .strict();
export const evaluationArmSchema = z
  .object({
    status: z.enum([
      'completed',
      'blocked',
      'error',
      'timeout',
      'limit-exceeded',
    ]),
    output: z.string().max(65536),
    files: content,
    stdout: z.string().max(65536),
    stderr: z.string().max(65536),
    runtimeMs: z.number().nonnegative(),
    exitCode: z.number().int().nullable(),
    modelReported: z.string().max(256).nullable(),
    platformVersion: z.string().max(256).nullable(),
    error: z
      .object({ code: z.string().max(128), message: z.string().max(2048) })
      .strict()
      .nullable(),
    score: z.number().min(0).max(100).nullable(),
    assertions: z.array(evaluationAssertionResultSchema).max(30),
  })
  .strict();
const nullableScore = z.number().min(0).max(100).nullable();
const difference = z.number().min(-100).max(100).nullable();
export const evaluationReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('skill-evaluation'),
    runnerVersion: z.literal('1.0.0'),
    suite: evaluationSuiteSchema,
    suiteDigest: digest,
    skillDigest: digest,
    configurationDigest: digest,
    mode: z.enum(['fixture', 'agent']),
    platform: z.enum([
      'fixture',
      'codex',
      'claude-code',
      'cursor',
      'gemini-cli',
    ]),
    engineVersion: z.string().max(256).nullable(),
    modelRequested: z.string().max(128).nullable(),
    image: z.string().max(512).nullable(),
    network: z.boolean(),
    credentialNames: z.array(z.string()).max(4),
    environment: z
      .object({ node: z.string().max(64), os: z.string().max(64) })
      .strict(),
    limits: evaluationLimitsSchema,
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    runtimeMs: z.number().nonnegative(),
    cases: z
      .array(
        z
          .object({
            id: slugSchema,
            baseline: evaluationArmSchema,
            assisted: evaluationArmSchema,
            delta: difference,
          })
          .strict(),
      )
      .max(10),
    summary: z
      .object({
        completedCases: z.number().int().nonnegative(),
        totalCases: z.number().int().positive(),
        baselineScore: nullableScore,
        assistedScore: nullableScore,
        delta: difference,
      })
      .strict(),
  })
  .strict();
export const evaluationSummarySchema = z
  .object({
    reportPath: safePathSchema,
    reportDigest: digest,
    suiteId: slugSchema,
    mode: z.enum(['fixture', 'agent']),
    platform: z.enum([
      'fixture',
      'codex',
      'claude-code',
      'cursor',
      'gemini-cli',
    ]),
    verification: z.enum(['reproduced', 'stale', 'invalid']),
    baselineScore: nullableScore,
    assistedScore: nullableScore,
    delta: difference,
    completedAt: z.string(),
    completedCases: z.number().int().nonnegative(),
    totalCases: z.number().int().positive(),
    modelRequested: z.string().nullable(),
    issues: z.array(z.string()),
  })
  .strict();
export type EvaluationSuite = z.infer<typeof evaluationSuiteSchema>;
export type EvaluationScenario = z.infer<typeof evaluationScenarioSchema>;
export type EvaluationLimits = z.infer<typeof evaluationLimitsSchema>;
export type AgentEvaluationConfig = z.infer<typeof agentEvaluationConfigSchema>;
export type EvaluationArm = z.infer<typeof evaluationArmSchema>;
export type EvaluationReport = z.infer<typeof evaluationReportSchema>;
export type EvaluationSummary = z.infer<typeof evaluationSummarySchema>;
