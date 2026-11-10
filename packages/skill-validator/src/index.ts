import { fromMarkdown } from 'mdast-util-from-markdown';
import {
  catalogSourceMetadataSchema,
  discoverySkillSchema,
  metadataSchema,
  safePathSchema,
  slugSchema,
  testCasesSchema,
  platformResultsSchema,
  type QualityReport,
  type CatalogEntry,
  type DiscoverySkill,
} from '@uas/skill-schema';
import { assessQuality, type QualityFacts } from './quality';
import {
  parseSkill,
  parseInstructionStructure,
  SkillParseError,
} from '@uas/skill-parser';

export const LIMITS = {
  files: 100,
  fileBytes: 256 * 1024,
  packageBytes: 1024 * 1024,
} as const;
export type SkillFiles = Record<string, string>;
export interface Diagnostic {
  path: string;
  message: string;
  line?: number;
  column?: number;
  category?: string;
}
export function formatDiagnostic(diagnostic: Diagnostic) {
  const location = diagnostic.line
    ? `:${diagnostic.line}:${diagnostic.column ?? 1}`
    : '';
  return `${diagnostic.path}${location}: ${diagnostic.message}`;
}
export interface ValidationResult {
  valid: boolean;
  quality: QualityReport;
  errors: string[];
  warnings: string[];
  diagnostics: Diagnostic[];
  entry?: CatalogEntry;
  skill?: DiscoverySkill;
}

/** Deterministic checks only: model behavior and professional safety require human review. */
export function validateSkill(
  files: SkillFiles,
  folder: string,
  options: { profile?: 'publication' | 'catalog' } = {},
): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  const warnings: string[] = [];
  let category = 'safety';
  const facts: QualityFacts = {
    valid: false,
    files,
    safetyChecked: false,
    referencesChecked: false,
    failures: new Set(),
  };
  const fail = (
    message: string,
    file = 'SKILL.md',
    line?: number,
    column?: number,
    group = category,
  ) => {
    facts.failures.add(group);
    diagnostics.push({
      path: `${folder}/${file}`,
      message,
      category: group,
      ...(line ? { line, column: column ?? 1 } : {}),
    });
  };
  const finish = (
    extra: Pick<ValidationResult, 'entry' | 'skill'> = {},
  ): ValidationResult => ({
    valid: !diagnostics.length,
    quality: assessQuality({ ...facts, valid: !diagnostics.length }),
    errors: diagnostics.map(formatDiagnostic),
    diagnostics,
    warnings,
    ...(!diagnostics.length ? extra : {}),
  });
  if (
    folder.split('/').length !== 2 ||
    !folder.split('/').every((part) => slugSchema.safeParse(part).success)
  ) {
    fail('Expected a safe sector/skill directory');
    return finish();
  }
  const paths = Object.keys(files).sort();
  if (paths.length > LIMITS.files) fail('Package exceeds 100 files');
  let size = 0;
  const pathTree = new Map<
    string,
    { path: string; kind: 'file' | 'directory' }
  >();
  for (const path of paths) {
    if (!safePathSchema.safeParse(path).success) fail('Unsafe path', path);
    if (!/\.(md|json|txt|csv)$/i.test(path))
      fail('Unsupported file type; executable content is not accepted', path);
    const parts = path.split('/');
    for (let index = 0; index < parts.length; index++) {
      const prefix = parts.slice(0, index + 1).join('/');
      const kind = index === parts.length - 1 ? 'file' : 'directory';
      const previous = pathTree.get(prefix.toLowerCase());
      if (previous && (previous.path !== prefix || previous.kind !== kind))
        fail(`Conflicting file/directory or case alias: ${prefix}`, path);
      else pathTree.set(prefix.toLowerCase(), { path: prefix, kind });
    }
    const bytes = new TextEncoder().encode(files[path]).length;
    size += bytes;
    if (bytes > LIMITS.fileBytes) fail('File exceeds 256 KiB', path);
    if (files[path].includes('\0')) fail('Binary content is unsupported', path);
  }
  if (new Set(paths.map((path) => path.toLowerCase())).size !== paths.length)
    fail('Case-insensitive filename collision');
  if (size > LIMITS.packageBytes) fail('Package exceeds 1 MiB');
  facts.safetyChecked = true;
  if (diagnostics.length) return finish();
  category = 'instructions';
  let parsed: ReturnType<typeof parseSkill>;
  try {
    parsed = parseSkill(files['SKILL.md'] ?? '');
  } catch (error) {
    fail(
      error instanceof Error ? error.message : 'Invalid skill',
      'SKILL.md',
      error instanceof SkillParseError ? error.line : undefined,
      error instanceof SkillParseError ? error.column : undefined,
    );
    return finish();
  }
  facts.parsed = parsed;
  const { frontmatter, body } = parsed;
  category = 'metadata';
  const [sector, slug] = folder.split('/');
  if (frontmatter.name !== slug)
    fail('Frontmatter name must match skill directory', 'SKILL.md', 2);
  let metadata: ReturnType<typeof catalogSourceMetadataSchema.parse>;
  let publicationMetadata: ReturnType<typeof metadataSchema.parse> | undefined;
  try {
    const input: unknown = Object.hasOwn(files, 'metadata.json')
      ? JSON.parse(files['metadata.json'])
      : {};
    if (options.profile !== 'catalog')
      publicationMetadata = metadataSchema.parse(input);
    metadata = catalogSourceMetadataSchema.parse(input);
  } catch (error) {
    const issues =
      error && typeof error === 'object' && 'issues' in error
        ? (error as { issues: { path: PropertyKey[]; message: string }[] })
            .issues
        : undefined;
    if (issues)
      for (const issue of issues)
        fail(
          `${issue.path.join('.') || 'metadata'}: ${issue.message}`,
          'metadata.json',
        );
    else
      fail(
        error instanceof Error ? error.message : 'Invalid JSON',
        'metadata.json',
      );
    return finish();
  }
  facts.metadata = metadata;
  if (
    (metadata.id && metadata.id !== folder) ||
    (metadata.slug && metadata.slug !== slug) ||
    (metadata.sector && metadata.sector !== sector)
  )
    fail('Folder, ID, slug and sector must match', 'metadata.json');
  if (
    metadata.title &&
    metadata.displayName &&
    metadata.title !== metadata.displayName
  )
    fail('title and displayName must agree', 'metadata.json');
  const tested = metadata.testedPlatforms ?? metadata.testedWith ?? [];
  if (tested.length && !metadata.lastVerified)
    fail(
      'Platform testing claims require a verification date',
      'metadata.json',
    );
  if (!/\bwhen\b|\buse (?:for|to)\b/i.test(frontmatter.description))
    warnings.push(
      `${folder}/SKILL.md: Description should explicitly explain when to activate the skill`,
    );
  category = 'instructions';
  const structure = parseInstructionStructure(body);
  facts.structure = structure;
  const { sections } = structure;
  for (const heading of [
    'when to use',
    'inputs',
    'workflow',
    'output',
    'boundaries',
  ])
    if (!sections.get(heading)?.trim())
      fail(`Missing or empty section: ${heading}`);
  if (!/^\s*\d+\.\s+\S/m.test(sections.get('workflow') ?? ''))
    fail('Workflow must include numbered actionable steps');
  if (
    metadata.riskLevel === 'high' ||
    /^(healthcare|legal|finance|personal-finance|banking|accounting|construction|government|aviation|cybersecurity|sports-fitness)(-|$)/.test(
      sector,
    )
  ) {
    const boundaries = sections.get('boundaries') ?? '';
    if (
      !/professional|qualified|specialist/i.test(boundaries) ||
      !/source|verify|verification/i.test(boundaries) ||
      !/limit|not |cannot|do not/i.test(boundaries)
    )
      fail(
        'High-stakes boundaries require limitations, source verification and professional escalation',
      );
  }
  category = 'examples';
  const examples =
    metadata.examples ??
    paths.filter((path) => /^examples\/.*\.md$/i.test(path));
  facts.examples = examples;
  for (const path of examples)
    if (!Object.hasOwn(files, path) || !files[path].trim())
      fail(`Missing or empty example: ${path}`, 'metadata.json');
  if (
    (options.profile !== 'catalog' || metadata.status === 'published') &&
    (!examples.some((path) => /input/i.test(path)) ||
      !examples.some((path) => /output/i.test(path)))
  )
    fail('Examples must identify input and output files', 'metadata.json');
  if (
    Object.hasOwn(files, 'tests/cases.json') ||
    options.profile !== 'catalog'
  ) {
    try {
      const cases = testCasesSchema.parse(
        JSON.parse(files['tests/cases.json'] ?? 'null'),
      );
      if (cases.skillId !== folder)
        fail('Test case skillId must match package ID', 'tests/cases.json');
    } catch (error) {
      fail(
        error instanceof Error ? error.message : 'Invalid test cases',
        'tests/cases.json',
      );
    }
  }
  if (Object.hasOwn(files, 'tests/platform-results.json')) {
    const result = platformResultsSchema.safeParse(
      (() => {
        try {
          return JSON.parse(files['tests/platform-results.json']);
        } catch {
          return null;
        }
      })(),
    );
    if (!result.success)
      fail(
        'Invalid completed platform test records',
        'tests/platform-results.json',
        undefined,
        undefined,
        'references',
      );
    else
      for (const run of result.data.runs)
        if (!files[run.evidencePath]?.trim())
          fail(
            `Missing or empty test evidence: ${run.evidencePath}`,
            'tests/platform-results.json',
            undefined,
            undefined,
            'references',
          );
  }
  category = 'references';
  facts.referencesChecked = true;
  for (const path of paths.filter((path) => path.endsWith('.md'))) {
    const ast = fromMarkdown(files[path]);
    function walk(node: unknown): void {
      if (!node || typeof node !== 'object') return;
      const n = node as {
        type: string;
        url?: string;
        children?: unknown[];
        position?: { start: { line: number; column: number } };
      };
      const at = (message: string) =>
        fail(message, path, n.position?.start.line, n.position?.start.column);
      if (n.type === 'html')
        fail(
          'Raw HTML is unsupported; fence illustrative code',
          path,
          n.position?.start.line,
          n.position?.start.column,
          'safety',
        );
      if (n.type === 'link' || n.type === 'image' || n.type === 'definition') {
        const url = n.url!;
        if (!url.startsWith('#')) {
          if (/^https?:\/\//i.test(url)) {
            try {
              const parsed = new URL(url);
              if (parsed.username || parsed.password)
                at('Credential-bearing link');
            } catch {
              at('Invalid URL');
            }
          } else if (!/^mailto:[^\s@]+@[^\s@]+$/i.test(url)) {
            let decoded = '';
            try {
              decoded = decodeURIComponent(url.split('#')[0]);
            } catch {
              at('Invalid link encoding');
            }
            if (!safePathSchema.safeParse(decoded).success)
              at(`Unsafe link: ${url}`);
            else {
              const resolved = [...path.split('/').slice(0, -1), decoded].join(
                '/',
              );
              if (!Object.hasOwn(files, resolved))
                at(`Broken local link: ${url}`);
            }
          }
        }
      }
      n.children?.forEach(walk);
    }
    walk(ast);
  }
  const extra: Pick<ValidationResult, 'entry' | 'skill'> = {};
  if (publicationMetadata)
    extra.entry = {
      metadata: publicationMetadata,
      description: frontmatter.description,
      body,
      files: paths,
    };
  if (!diagnostics.length && metadata.status !== 'planned')
    extra.skill = discoverySkillSchema.parse({
      id: folder,
      slug,
      sector,
      name: frontmatter.name,
      title:
        metadata.title ??
        metadata.displayName ??
        slug
          .split('-')
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(' '),
      description: frontmatter.description,
      tags: metadata.tags ?? [],
      difficulty: metadata.difficulty ?? null,
      capabilities: metadata.capabilities ?? [],
      riskLevel: metadata.riskLevel ?? null,
      status: metadata.status ?? 'draft',
      version: metadata.version ?? null,
      license: metadata.license ?? null,
      author: metadata.author ?? null,
      provenance: metadata.provenance ?? null,
      lastVerified: metadata.lastVerified ?? null,
      testedPlatforms: tested,
      sourcePath: `skills/${folder}/SKILL.md`,
      body,
      files,
      examples,
      quality: assessQuality({ ...facts, valid: true }),
      validation: { status: 'passed', profile: 'catalog', warnings },
    });
  return finish(extra);
}

export {
  canonicalJson,
  evaluationConfiguration,
  scoreEvaluation,
  extractAgentOutput,
  evaluationSummary,
  reproduceEvaluation,
} from './evaluation';
