import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const frontmatterSchema = z
  .object({
    name: slugSchema,
    description: z.string().trim().min(1).max(1024),
  })
  .strict();
export const safePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (value) =>
      ![...value].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) &&
      !/[\\:%?#<>"|*]/.test(value) &&
      !value.startsWith('/') &&
      value
        .split('/')
        .every(
          (part) =>
            part !== '' &&
            part !== '.' &&
            part !== '..' &&
            !part.startsWith('.') &&
            !/[. ]$/.test(part) &&
            !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part),
        ),
    'Expected a portable relative path without traversal or reserved names',
  );
const text = z.string().trim().min(1).max(1024);
export const metadataSchema = z
  .object({
    id: z
      .string()
      .refine(
        (id) =>
          id.split('/').length === 2 &&
          id.split('/').every((p) => slugSchema.safeParse(p).success),
        'Expected sector/slug',
      ),
    slug: slugSchema,
    title: text,
    sector: slugSchema,
    tags: z.array(slugSchema).max(30),
    version: z
      .string()
      .regex(
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
      ),
    license: text,
    author: text,
    riskLevel: z.enum(['low', 'medium', 'high']),
    capabilities: z.array(slugSchema).min(1).max(30),
    testedPlatforms: z.array(slugSchema).max(30),
    lastVerified: z.string().date().nullable(),
    examples: z
      .array(safePathSchema)
      .min(2)
      .max(40)
      .refine(
        (paths) => new Set(paths).size === paths.length,
        'Duplicate example paths',
      ),
    status: z
      .enum(['planned', 'draft', 'reviewed', 'published'])
      .default('draft'),
    provenance: text,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.id !== `${value.sector}/${value.slug}`)
      ctx.addIssue({
        code: 'custom',
        message: 'ID must match sector/slug',
        path: ['id'],
      });
    if (value.testedPlatforms.length && !value.lastVerified)
      ctx.addIssue({
        code: 'custom',
        message: 'Tested platforms require a verification date',
        path: ['lastVerified'],
      });
  });
export const testCasesSchema = z
  .object({
    skillId: text,
    cases: z
      .array(
        z
          .object({
            name: text,
            input: text,
            expectedBehaviors: z.array(slugSchema).min(1),
          })
          .strict(),
      )
      .min(3),
  })
  .strict();
export const catalogEntrySchema = z
  .object({
    metadata: metadataSchema,
    description: frontmatterSchema.shape.description,
    body: z.string().min(1),
    files: z.array(safePathSchema),
  })
  .strict();
export const catalogSchema = z
  .object({ schemaVersion: z.literal(1), skills: z.array(catalogEntrySchema) })
  .strict()
  .superRefine(({ skills }, ctx) => {
    for (const key of ['id', 'slug'] as const) {
      const seen = new Set<string>();
      for (const { metadata } of skills) {
        if (seen.has(metadata[key]))
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate ${key}: ${metadata[key]}`,
          });
        seen.add(metadata[key]);
      }
    }
  });
export type SkillMetadata = z.infer<typeof metadataSchema>;
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export type Catalog = z.infer<typeof catalogSchema>;

export const sectorSchema = z
  .object({
    slug: slugSchema,
    title: text,
    description: text,
    aliases: z.array(text).max(20),
  })
  .strict();
export const sectorsSchema = z
  .array(sectorSchema)
  .superRefine((sectors, ctx) => {
    if (new Set(sectors.map((sector) => sector.slug)).size !== sectors.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate sector slug' });
  });
export const marketplaceSkillSchema = catalogEntrySchema.extend({
  content: z.record(safePathSchema, z.string()),
  archive: safePathSchema,
});
export const marketplaceSchema = z
  .object({
    schemaVersion: z.literal(1),
    sectors: sectorsSchema,
    skills: z.array(marketplaceSkillSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    const catalog = catalogSchema.safeParse({
      schemaVersion: 1,
      skills: value.skills.map((entry) => ({
        metadata: entry.metadata,
        description: entry.description,
        body: entry.body,
        files: entry.files,
      })),
    });
    if (!catalog.success)
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid or duplicate catalog entries',
      });
    const sectors = new Set(value.sectors.map((sector) => sector.slug));
    for (const skill of value.skills) {
      if (!sectors.has(skill.metadata.sector))
        ctx.addIssue({
          code: 'custom',
          message: `Unknown sector: ${skill.metadata.sector}`,
        });
      if (skill.metadata.status === 'planned')
        ctx.addIssue({
          code: 'custom',
          message: 'Planned skills cannot be listed',
        });
    }
  });
export type Sector = z.infer<typeof sectorSchema>;
export type MarketplaceSkill = z.infer<typeof marketplaceSkillSchema>;
export type Marketplace = z.infer<typeof marketplaceSchema>;

/** Catalog-only metadata is optional. Unknown identity/provenance stays unknown. */
export const catalogSourceMetadataSchema = z
  .object({
    id: z.string().optional(),
    slug: slugSchema.optional(),
    sector: slugSchema.optional(),
    title: text.optional(),
    displayName: text.optional(),
    tags: z.array(text).max(30).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
      .optional(),
    license: text.optional(),
    author: text.optional(),
    provenance: text.optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    capabilities: z.array(slugSchema).max(30).optional(),
    testedPlatforms: z.array(slugSchema).max(30).optional(),
    testedWith: z.array(slugSchema).max(30).optional(),
    lastVerified: z.string().date().nullable().optional(),
    examples: z.array(safePathSchema).max(40).optional(),
    status: z
      .enum(['draft', 'planned', 'community', 'reviewed', 'published'])
      .optional(),
  })
  .strict();
export const discoverySkillSchema = z
  .object({
    id: z.string(),
    slug: slugSchema,
    sector: slugSchema,
    name: slugSchema,
    title: text,
    description: frontmatterSchema.shape.description,
    tags: z.array(text),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
    capabilities: z.array(slugSchema),
    riskLevel: z.enum(['low', 'medium', 'high']).nullable(),
    status: z.enum(['draft', 'community', 'reviewed', 'published']),
    version: z.string().nullable(),
    license: text.nullable(),
    author: text.nullable(),
    provenance: text.nullable(),
    lastVerified: z.string().date().nullable(),
    testedPlatforms: z.array(slugSchema),
    sourcePath: safePathSchema,
    body: z.string().min(1),
    files: z.record(safePathSchema, z.string()),
    examples: z.array(safePathSchema),
  })
  .strict()
  .superRefine((skill, ctx) => {
    if (
      skill.id !== `${skill.sector}/${skill.slug}` ||
      skill.name !== skill.slug ||
      skill.sourcePath !== `skills/${skill.id}/SKILL.md`
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Skill identity and source path must match',
      });
    for (const path of skill.examples)
      if (!Object.hasOwn(skill.files, path))
        ctx.addIssue({ code: 'custom', message: `Missing example: ${path}` });
  });
export const discoveryCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    sectors: sectorsSchema,
    skills: z.array(discoverySkillSchema),
  })
  .strict()
  .superRefine((catalog, ctx) => {
    const ids = new Set<string>();
    const slugs = new Set<string>();
    const sectors = new Set(catalog.sectors.map((sector) => sector.slug));
    for (const skill of catalog.skills) {
      if (ids.has(skill.id) || slugs.has(skill.slug))
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate skill: ${skill.id}`,
        });
      if (!sectors.has(skill.sector))
        ctx.addIssue({
          code: 'custom',
          message: `Unknown sector: ${skill.sector}`,
        });
      ids.add(skill.id);
      slugs.add(skill.slug);
    }
  });
export type DiscoverySkill = z.infer<typeof discoverySkillSchema>;
export type DiscoveryCatalog = z.infer<typeof discoveryCatalogSchema>;
