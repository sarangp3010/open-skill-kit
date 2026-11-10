import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  catalogEntrySchema,
  catalogSchema,
  type CatalogEntry,
} from '@uas/skill-schema';
import { readSkillFiles } from '@uas/catalog-indexer';
import { validateSkill } from '@uas/skill-validator';
import { directoryPath } from '@uas/skill-installer';
import { runEvaluationCommand } from './evaluation-command';
import { runQualityCommand } from './quality-command';
import { runPlatformCommand, type CliOptions } from './platform-cli';

export const HELP = `open-skill-kit — portable skill files

Usage:
  open-skill-kit list [query]
  open-skill-kit show <skill-id-or-slug>
  open-skill-kit add <skill-id-or-slug> [--dir <directory>] [--dry-run]
  open-skill-kit evaluate adapters
  open-skill-kit evaluate --suite <json> --source <skills-root> [--output <new-json>]
  Real evaluations: --mode agent --platform <platform> --agent-config <json> --allow-agent
  open-skill-kit quality <id-or-slug> [--source <skills-root>] [--json]
  open-skill-kit platforms
  open-skill-kit install <id> --platform <platform> [--scope project|global]
  open-skill-kit installed --platform <platform> [--scope project|global]
  open-skill-kit inspect <id-or-slug> --platform <platform> [--scope project|global]
  open-skill-kit update <id> --platform <platform> [--scope project|global]
  open-skill-kit uninstall <id-or-slug> --platform <platform> [--scope project|global] [--dry-run]
  Native install/update: [--source <skills-root>] [--allow-draft] [--dry-run]
  Project operations: [--project-dir <directory>] (defaults to current directory)
  list/show also accept --source <skills-root> for local skills.
  open-skill-kit --help
  open-skill-kit --version

Default directory: ./.open-skill-kit/skills
Default library: only published skills bundled with this package.
Use --source for local packages; installing unpublished packages requires --allow-draft.
Adding copies files; it does not execute a skill or configure an AI assistant.
Existing destinations and symbolic links are never overwritten.
`;

export async function loadLibrary(dataRoot: string) {
  const info = await lstat(dataRoot);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error('Library data directory must be an ordinary directory');
  const indexPath = join(dataRoot, 'catalog.json');
  const indexInfo = await lstat(indexPath);
  if (
    !indexInfo.isFile() ||
    indexInfo.isSymbolicLink() ||
    indexInfo.size > 10 * 1024 * 1024
  )
    throw new Error('Invalid library index');
  const catalog = catalogSchema.parse(
    JSON.parse(await readFile(indexPath, 'utf8')),
  );
  if (catalog.skills.some((skill) => skill.metadata.status !== 'published'))
    throw new Error('Library index contains an unpublished skill');
  return catalog;
}

export async function skillFiles(dataRoot: string, entry: CatalogEntry) {
  entry = catalogEntrySchema.parse(entry);
  if (entry.metadata.status !== 'published')
    throw new Error('Only published skills can be installed or shown');
  const [sector, slug] = entry.metadata.id.split('/');
  // Inspect each boundary before reading the package, including the sector directory.
  for (const path of [
    join(dataRoot, 'skills'),
    join(dataRoot, 'skills', sector),
  ]) {
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error('Library skill directories must not be symlinks');
  }
  const files = await readSkillFiles(join(dataRoot, 'skills', sector, slug));
  const result = validateSkill(files, entry.metadata.id);
  if (!result.valid || !result.entry)
    throw new Error(`Invalid bundled skill: ${result.errors.join('; ')}`);
  if (JSON.stringify(result.entry) !== JSON.stringify(entry))
    throw new Error('Bundled skill does not match its catalog entry');
  return files;
}

export async function installSkill(
  dataRoot: string,
  entry: CatalogEntry,
  directory: string,
  dryRun = false,
) {
  const files = await skillFiles(dataRoot, entry);
  const root = resolve(directory);
  const target = join(root, entry.metadata.slug);
  await directoryPath(root, false);
  try {
    const names = await readdir(root);
    if (names.some((name) => name.toLowerCase() === entry.metadata.slug))
      throw new Error(`Destination already exists: ${target}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (dryRun) return { target, files: Object.keys(files).sort(), dryRun };
  await directoryPath(root, true);
  // Exclusive mkdir reserves the destination; there is deliberately no force/overwrite option.
  await mkdir(target);
  try {
    for (const path of Object.keys(files).sort()) {
      const destination = join(target, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, files[path], { flag: 'wx', mode: 0o644 });
    }
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    throw error;
  }
  return { target, files: Object.keys(files).sort(), dryRun };
}

export async function runCli(
  args: string[],
  options: CliOptions,
): Promise<void> {
  const [command, ...rest] = args;
  if (!command || command === '--help' || command === '-h') {
    options.log(HELP);
    return;
  }
  if (command === '--version') {
    if (rest.length) throw new Error('Unexpected arguments');
    options.log(options.version);
    return;
  }
  if (command === 'evaluate') {
    await runEvaluationCommand(rest, options);
    return;
  }
  if (command === 'quality') {
    await runQualityCommand(rest, options, { loadLibrary, skillFiles });
    return;
  }
  if (
    [
      'platforms',
      'install',
      'installed',
      'inspect',
      'update',
      'uninstall',
    ].includes(command) ||
    (['list', 'show'].includes(command) && rest.includes('--source'))
  ) {
    await runPlatformCommand(args, options, { loadLibrary, skillFiles });
    return;
  }
  if (!['list', 'show', 'add'].includes(command))
    throw new Error(`Unknown command: ${command}. Use --help.`);
  let directory = join(options.cwd, '.open-skill-kit', 'skills');
  let dryRun = false;
  const positional: string[] = [];
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (command === 'add' && arg === '--dir') {
      const value = rest[++index];
      if (!value || value.startsWith('-'))
        throw new Error('--dir requires a directory');
      directory = resolve(options.cwd, value);
    } else if (command === 'add' && arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (command === 'list' ? positional.length > 1 : positional.length !== 1)
    throw new Error(`Invalid arguments for ${command}. Use --help.`);
  const catalog = await loadLibrary(options.dataRoot);
  if (command === 'list') {
    const query = positional[0]?.toLowerCase() ?? '';
    const matches = catalog.skills.filter((entry) =>
      `${entry.metadata.id} ${entry.metadata.title} ${entry.description} ${entry.metadata.tags.join(' ')}`
        .toLowerCase()
        .includes(query),
    );
    options.log(
      matches.length
        ? matches
            .map(
              (entry) =>
                `${entry.metadata.id}\t${entry.metadata.title}\n  ${entry.description}`,
            )
            .join('\n')
        : 'No published skills match. This release may not contain any published skills yet.',
    );
    return;
  }
  const entry = catalog.skills.find(
    ({ metadata }) =>
      metadata.id === positional[0] || metadata.slug === positional[0],
  );
  if (!entry)
    throw new Error(
      `Unknown published skill: ${positional[0]}. Use list to see available skills.`,
    );
  if (command === 'show') {
    const files = await skillFiles(options.dataRoot, entry);
    options.log(files['SKILL.md']);
    return;
  }
  const result = await installSkill(options.dataRoot, entry, directory, dryRun);
  options.log(
    `${dryRun ? 'Would copy' : 'Copied'} ${result.files.length} files to ${result.target}\n${result.files.join('\n')}\nReview SKILL.md before using it. Assistant installation depends on your chosen directory and product.`,
  );
}
