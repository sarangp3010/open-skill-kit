import {
  assessEvaluationArtifact,
  type EvaluationArtifact,
} from './evaluations';
export {
  readEvaluationReports,
  assessEvaluationArtifact,
  type EvaluationArtifact,
} from './evaluations';
import { assessCompatibility } from './trust';
export { packageDigest, assessCompatibility } from './trust';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  catalogSchema,
  discoveryCatalogSchema,
  sectorsSchema,
  safePathSchema,
  slugSchema,
  type Catalog,
  type Sector,
} from '@uas/skill-schema';
import {
  LIMITS,
  validateSkill,
  formatDiagnostic,
  type Diagnostic,
  type ValidationResult,
  type SkillFiles,
} from '@uas/skill-validator';

/** Reject all symlinks, including links within the root, before reading content. */
export async function readSkillFiles(
  root: string,
  options: { receiptFile?: '.open-skill-kit-install.json' } = {},
): Promise<SkillFiles> {
  const files: SkillFiles = Object.create(null) as SkillFiles;
  let total = 0;
  let count = 0;
  async function walk(
    directory: string,
    prefix = '',
    depth = 0,
  ): Promise<void> {
    if (depth > 10) throw new Error('Package directory nesting exceeds limit');
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error(`Expected ordinary directory: ${directory}`);
    for (const entry of (await readdir(directory)).sort()) {
      if (!prefix && entry === options.receiptFile) continue;
      if (++count > LIMITS.files * 2)
        throw new Error('Package entry count exceeds limit');
      const path = prefix + entry;
      if (!safePathSchema.safeParse(path).success)
        throw new Error(`Unsafe package path: ${path}`);
      const diskPath = join(directory, entry);
      const info = await lstat(diskPath);
      if (info.isSymbolicLink())
        throw new Error(`Symlinks are forbidden: ${path}`);
      if (info.isDirectory()) await walk(diskPath, `${path}/`, depth + 1);
      else {
        if (!info.isFile())
          throw new Error(`Unsupported filesystem entry: ${path}`);
        total += info.size;
        if (info.size > LIMITS.fileBytes || total > LIMITS.packageBytes)
          throw new Error('Package byte limit exceeded');
        if (Object.keys(files).length >= LIMITS.files)
          throw new Error('Package file count exceeds limit');
        const data = await readFile(diskPath);
        files[path] = new TextDecoder('utf-8', { fatal: true }).decode(data);
      }
    }
  }
  await walk(root);
  return files;
}

export class CatalogValidationError extends Error {
  constructor(public diagnostics: Diagnostic[]) {
    super(diagnostics.map(formatDiagnostic).join('\n'));
    this.name = 'CatalogValidationError';
  }
}

/** Inspect every package and collect errors instead of stopping at the first invalid skill. */
export async function inspectSkills(
  root: string,
  profile: 'publication' | 'catalog' = 'publication',
) {
  const results: { id: string; result: ValidationResult }[] = [];
  const diagnostics: Diagnostic[] = [];
  const report = (path: string, error: unknown) =>
    diagnostics.push({
      path,
      message: error instanceof Error ? error.message : String(error),
    });
  try {
    const info = await lstat(root);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error('Skills root must be an ordinary directory');
  } catch (error) {
    report(root, error);
    return { results, diagnostics };
  }
  const slugs = new Map<string, string>();
  for (const sector of (await readdir(root)).sort()) {
    const sectorPath = join(root, sector);
    try {
      const info = await lstat(sectorPath);
      if (sector === '.gitkeep' || sector === 'README.md') {
        if (!info.isFile() || info.isSymbolicLink())
          throw new Error('Expected ordinary library documentation file');
        continue;
      }
      if (!slugSchema.safeParse(sector).success)
        throw new Error('Invalid sector directory name');
      if (!info.isDirectory() || info.isSymbolicLink())
        throw new Error('Expected ordinary sector directory');
    } catch (error) {
      report(sectorPath, error);
      continue;
    }
    for (const slug of (await readdir(sectorPath)).sort()) {
      const path = join(sectorPath, slug);
      const id = `${sector}/${slug}`;
      try {
        if (slug === 'README.md') {
          const info = await lstat(path);
          if (info.isFile() && !info.isSymbolicLink()) continue;
        }
        if (!slugSchema.safeParse(slug).success)
          throw new Error('Invalid skill directory name');
        const files = await readSkillFiles(path);
        const result = validateSkill(files, id, { profile });
        results.push({ id, result });
        diagnostics.push(
          ...result.diagnostics.map((diagnostic) => ({
            ...diagnostic,
            path: join(root, diagnostic.path),
          })),
        );
        if (slugs.has(slug))
          diagnostics.push({
            path: join(path, 'SKILL.md'),
            message: `Duplicate slug ${slug}; first seen at ${slugs.get(slug)}`,
          });
        else slugs.set(slug, join(path, 'SKILL.md'));
      } catch (error) {
        report(join(path, 'SKILL.md'), error);
      }
    }
  }
  return { results, diagnostics };
}

/** Existing publication contract: all packages validate, only explicitly published entries ship. */
export async function buildCatalog(
  root: string,
  options: { includeDrafts?: boolean } = {},
): Promise<{ catalog: Catalog; warnings: string[]; validated: number }> {
  const { results, diagnostics } = await inspectSkills(root);
  if (diagnostics.length) throw new CatalogValidationError(diagnostics);
  const skills = results.flatMap(({ result }) =>
    result.entry &&
    (result.entry.metadata.status === 'published' ||
      (options.includeDrafts && result.entry.metadata.status !== 'planned'))
      ? [result.entry]
      : [],
  );
  return {
    catalog: catalogSchema.parse({ schemaVersion: 1, skills }),
    warnings: results.flatMap(({ result }) => result.warnings),
    validated: results.length,
  };
}

/** Website contract includes valid drafts with their actual review status and optional metadata. */
export async function generateCatalog(
  root: string,
  sectors: Sector[] = [],
  options: { evaluationReports?: EvaluationArtifact[] } = {},
) {
  const { results, diagnostics } = await inspectSkills(root, 'catalog');
  if (diagnostics.length) throw new CatalogValidationError(diagnostics);
  const declared = sectorsSchema.parse(sectors);
  const known = new Set(declared.map((sector) => sector.slug));
  const derived = [...new Set(results.map(({ id }) => id.split('/')[0]))]
    .filter((slug) => !known.has(slug))
    .sort()
    .map((slug) => ({
      slug,
      title: slug
        .split('-')
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' '),
      description: `Skill packages in ${slug}.`,
      aliases: [],
    }));
  for (const artifact of options.evaluationReports ?? []) {
    if (!results.some((item) => item.id === artifact.report.suite.skillId))
      throw new Error(
        `Evaluation report ${artifact.reportPath} references unknown skill ${artifact.report.suite.skillId}`,
      );
  }
  const catalog = discoveryCatalogSchema.parse({
    schemaVersion: 1,
    sectors: [...declared, ...derived].sort((a, b) =>
      a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0,
    ),
    skills: results.flatMap(({ result }) =>
      result.skill
        ? [
            {
              ...result.skill,
              compatibility: assessCompatibility(result.skill),
              ...((options.evaluationReports ?? []).some(
                (item) => item.report.suite.skillId === result.skill!.id,
              )
                ? {
                    evaluations: (options.evaluationReports ?? [])
                      .filter(
                        (item) =>
                          item.report.suite.skillId === result.skill!.id,
                      )
                      .map((item) =>
                        assessEvaluationArtifact(item, result.skill!),
                      ),
                  }
                : {}),
            },
          ]
        : [],
    ),
  });
  return {
    catalog,
    warnings: results.flatMap(({ result }) => result.warnings),
    validated: results.length,
  };
}
