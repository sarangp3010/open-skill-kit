import { join, resolve } from 'node:path';
import {
  readSkillFiles,
  generateCatalog,
  packageDigest,
  assessCompatibility,
} from '@uas/catalog-indexer';
import { directoryPath } from '@uas/skill-installer';
import { assertSkillId } from '@uas/platform-adapters';
import { validateSkill } from '@uas/skill-validator';
import type { Catalog, CatalogEntry } from '@uas/skill-schema';
import type { CliOptions } from './platform-cli';

export async function runQualityCommand(
  args: string[],
  options: CliOptions,
  library: {
    loadLibrary: (path: string) => Promise<Catalog>;
    skillFiles: (
      path: string,
      entry: CatalogEntry,
    ) => Promise<Record<string, string>>;
  },
) {
  let source: string | undefined;
  let json = false;
  const positional: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--source') {
      if (source !== undefined) throw new Error('Duplicate --source');
      const value = args[++index];
      if (!value || value.startsWith('-'))
        throw new Error('--source requires a local skills root');
      source = resolve(options.cwd, value);
    } else if (arg === '--json') {
      if (json) throw new Error('Duplicate --json');
      json = true;
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 1)
    throw new Error(
      'Usage: quality <id-or-slug> [--source <skills-root>] [--json]',
    );
  let id = positional[0];
  let files: Record<string, string>;
  if (source) {
    await directoryPath(source, false);
    if (!id.includes('/')) {
      const matches = (await generateCatalog(source)).catalog.skills.filter(
        (skill) => skill.slug === id,
      );
      if (matches.length !== 1)
        throw new Error(
          `Unknown skill: ${id}. Use sector/slug to inspect invalid local content.`,
        );
      id = matches[0].id;
    }
    assertSkillId(id);
    const [sector, slug] = id.split('/');
    await directoryPath(join(source, sector), false);
    files = await readSkillFiles(join(source, sector, slug));
  } else {
    const entry = (await library.loadLibrary(options.dataRoot)).skills.find(
      ({ metadata }) => metadata.id === id || metadata.slug === id,
    );
    if (!entry)
      throw new Error(
        `Unknown published skill: ${id}. Use --source for local drafts.`,
      );
    id = entry.metadata.id;
    files = await library.skillFiles(options.dataRoot, entry);
  }
  const result = validateSkill(files, id, { profile: 'catalog' });
  const report = {
    id,
    valid: result.valid,
    quality: result.quality,
    diagnostics: result.diagnostics,
    warnings: result.warnings,
    packageDigest: packageDigest(files),
    compatibility: result.skill ? assessCompatibility(result.skill) : [],
  };
  options.log(
    json
      ? JSON.stringify(report, null, 2)
      : [
          `${id}\nValidation: ${result.valid ? 'passed' : 'failed'}\nQuality: ${result.quality.score}/100 (rubric ${result.quality.rubricVersion}${result.quality.blocked ? ', blocked by validation' : ''})`,
          ...result.quality.checks.map(
            (check) =>
              `${check.status.toUpperCase()} ${check.id} ${check.earned}/${check.weight}: ${check.message}`,
          ),
          ...report.compatibility.map(
            (row) =>
              `${row.platform}: installation ${row.installation}; testing ${row.testing}${row.declaredTested ? '; legacy testing declaration only' : ''}`,
          ),
          ...result.errors,
          `Package digest: ${report.packageDigest}`,
          'Structural scoring and contributor-recorded evidence are not independent verification or safety certification.',
        ].join('\n'),
  );
  if (!result.valid)
    throw new Error(`Quality assessment blocked by validation errors in ${id}`);
}
