import { resolve } from 'node:path';
import { generateCatalog } from '@uas/catalog-indexer';
import { validateSkill } from '@uas/skill-validator';
import type { Catalog, CatalogEntry, DiscoverySkill } from '@uas/skill-schema';
import {
  assertSkillId,
  getPlatform,
  getScope,
  platforms,
} from '@uas/platform-adapters';
import {
  directoryPath,
  inspectInstallations,
  installManagedSkill,
  uninstallManagedSkill,
  type InstallationContext,
} from '@uas/skill-installer';

export interface CliOptions {
  dataRoot: string;
  cwd: string;
  homeDir?: string;
  version: string;
  log: (message: string) => void;
}
export async function runPlatformCommand(
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
  const [command, ...rest] = args;
  if (command === 'platforms') {
    if (rest.length) throw new Error('platforms takes no arguments');
    options.log(
      platforms
        .map(
          (platform) =>
            `${platform.id}\t${platform.title}\n  project: ${platform.directory}\n  global: ~/${platform.directory}\n  ${platform.docs}`,
        )
        .join('\n'),
    );
    return;
  }
  const positional: string[] = [];
  const flags = new Map<string, string | boolean>();
  const values = ['--platform', '--scope', '--source', '--project-dir'];
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (values.includes(arg)) {
      if (flags.has(arg)) throw new Error(`Duplicate option: ${arg}`);
      const value = rest[++index];
      if (!value || value.startsWith('-'))
        throw new Error(`${arg} requires a value`);
      flags.set(arg, value);
    } else if (['--dry-run', '--allow-draft'].includes(arg)) {
      if (flags.has(arg)) throw new Error(`Duplicate option: ${arg}`);
      flags.set(arg, true);
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  const browse = command === 'list' || command === 'show';
  const reading = command === 'installed' || command === 'inspect';
  const removing = command === 'uninstall';
  if (
    command === 'list' || command === 'installed'
      ? positional.length > 1
      : positional.length !== 1
  )
    throw new Error(`Invalid arguments for ${command}. Use --help.`);
  if (command === 'installed' && positional.length)
    throw new Error('installed takes no skill name; use inspect <name>');
  if (browse && [...flags.keys()].some((key) => key !== '--source'))
    throw new Error(`${command} only supports --source`);
  if (
    (reading || removing) &&
    (flags.has('--source') || flags.has('--allow-draft'))
  )
    throw new Error(
      `${command} does not use a source library or --allow-draft`,
    );
  if (reading && flags.has('--dry-run'))
    throw new Error(`${command} is already read-only`);
  let context: InstallationContext | undefined;
  if (!browse) {
    if (!flags.has('--platform'))
      throw new Error(
        '--platform is required. Use platforms to list supported platforms.',
      );
    const platform = getPlatform(String(flags.get('--platform')));
    const scope = getScope(String(flags.get('--scope') ?? 'project'));
    if (scope === 'global' && flags.has('--project-dir'))
      throw new Error('--project-dir is only valid with project scope');
    context = {
      platform: platform.id,
      scope,
      projectDir: resolve(
        options.cwd,
        String(flags.get('--project-dir') ?? '.'),
      ),
      homeDir: options.homeDir,
      dryRun: flags.has('--dry-run'),
    };
    if (reading) {
      const installations = await inspectInstallations(context);
      const selected =
        command === 'inspect'
          ? installations.filter(
              (item) =>
                item.slug === positional[0] || item.id === positional[0],
            )
          : installations;
      if (command === 'inspect' && !selected.length)
        throw new Error(`Installation not found: ${positional[0]}`);
      options.log(
        selected.length
          ? selected
              .map(
                (item) =>
                  `${item.id ?? item.slug}\t${item.state}\t${item.version ?? 'unknown version'}\n  ${item.target}${item.detail ? `\n  ${item.detail}` : ''}`,
              )
              .join('\n')
          : 'No installed skills found in the selected platform and scope.',
      );
      return;
    }
    if (removing) {
      const result = await uninstallManagedSkill(positional[0], context);
      options.log(
        `${result.dryRun ? 'Would uninstall' : 'Uninstalled'} ${result.target}`,
      );
      return;
    }
  }
  let available: DiscoverySkill[];
  if (flags.has('--source')) {
    const source = resolve(options.cwd, String(flags.get('--source')));
    await directoryPath(source, false);
    available = (await generateCatalog(source)).catalog.skills;
  } else {
    const catalog = await library.loadLibrary(options.dataRoot);
    if (command === 'list') {
      available = catalog.skills.map(
        (entry) =>
          ({
            id: entry.metadata.id,
            title: entry.metadata.title,
            description: entry.description,
            tags: entry.metadata.tags,
            status: entry.metadata.status,
          }) as DiscoverySkill,
      );
    } else {
      const entry = catalog.skills.find(
        ({ metadata }) =>
          metadata.id === positional[0] || metadata.slug === positional[0],
      );
      if (!entry)
        throw new Error(
          `Unknown published skill: ${positional[0]}. Use list, or --source <skills-root> for a local checkout.`,
        );
      const files = await library.skillFiles(options.dataRoot, entry);
      const result = validateSkill(files, entry.metadata.id, {
        profile: 'catalog',
      });
      if (!result.valid || !result.skill)
        throw new Error(`Invalid bundled skill: ${result.errors.join('; ')}`);
      available = [result.skill];
    }
  }
  if (command === 'list') {
    const query = positional[0]?.toLowerCase() ?? '';
    const matches = available.filter((skill) =>
      `${skill.id} ${skill.title} ${skill.description} ${skill.tags.join(' ')}`
        .toLowerCase()
        .includes(query),
    );
    options.log(
      matches.length
        ? matches
            .map(
              (skill) =>
                `${skill.id}\t${skill.title}\t${skill.status}\n  ${skill.description}`,
            )
            .join('\n')
        : 'No skills match the selected library.',
    );
    return;
  }
  const requested = positional[0];
  if (requested.includes('/')) assertSkillId(requested);
  const matches = available.filter(
    (skill) => skill.id === requested || skill.slug === requested,
  );
  if (matches.length !== 1)
    throw new Error(
      `Unknown or ambiguous skill: ${requested}. Use list with the same --source.`,
    );
  const skill = matches[0];
  if (command === 'show') {
    options.log(skill.files['SKILL.md']);
    return;
  }
  const result = await installManagedSkill(skill, {
    ...context!,
    allowDraft: flags.has('--allow-draft'),
    update: command === 'update',
  });
  options.log(
    `${result.dryRun ? 'Would ' : ''}${command === 'update' ? 'Update' : 'Install'} ${skill.id} (${skill.status})\n  ${result.target}\n${result.files.join('\n')}\nNo skill content was executed. Review its instructions before use.`,
  );
}
