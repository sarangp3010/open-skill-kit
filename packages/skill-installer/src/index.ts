import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  rmdir,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { readSkillFiles } from '@uas/catalog-indexer';
import {
  safePathSchema,
  slugSchema,
  type DiscoverySkill,
} from '@uas/skill-schema';
import { validateSkill, type SkillFiles } from '@uas/skill-validator';
import {
  assertPlatformSkill,
  assertSkillId,
  getPlatform,
  getScope,
  type InstallScope,
  type PlatformId,
} from '@uas/platform-adapters';
import { directoryPath } from './filesystem';
export { directoryPath } from './filesystem';

export const RECEIPT = '.open-skill-kit-install.json' as const;
const receiptSchema = z
  .object({
    owner: z.literal('open-skill-kit'),
    formatVersion: z.literal(1),
    id: z.string().refine((id) => {
      try {
        assertSkillId(id);
        return true;
      } catch {
        return false;
      }
    }),
    platform: z.enum(['codex', 'claude-code', 'cursor', 'gemini-cli']),
    scope: z.enum(['project', 'global']),
    version: z.string().nullable(),
    files: z.record(safePathSchema, z.string().regex(/^[a-f0-9]{64}$/)),
  })
  .strict();
type Receipt = z.infer<typeof receiptSchema>;
export interface InstallationContext {
  platform: PlatformId | string;
  scope?: InstallScope;
  projectDir: string;
  homeDir?: string;
  dryRun?: boolean;
}
export interface InstallationInfo {
  slug: string;
  target: string;
  state: 'managed' | 'modified' | 'unmanaged';
  id?: string;
  version?: string | null;
  detail?: string;
}
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const fingerprints = (files: SkillFiles) =>
  Object.fromEntries(
    Object.keys(files)
      .sort()
      .map((path) => [path, hash(files[path])]),
  );
function sameFiles(a: Record<string, string>, b: Record<string, string>) {
  return (
    JSON.stringify(Object.entries(a).sort()) ===
    JSON.stringify(Object.entries(b).sort())
  );
}
async function exists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
export function installationRoot(context: InstallationContext) {
  const adapter = getPlatform(context.platform);
  const scope = getScope(context.scope ?? 'project');
  return resolve(
    scope === 'global' ? (context.homeDir ?? homedir()) : context.projectDir,
    adapter.directory,
  );
}
async function checkedRoot(context: InstallationContext) {
  const root = installationRoot(context);
  const anchor = resolve(
    (context.scope ?? 'project') === 'global'
      ? (context.homeDir ?? homedir())
      : context.projectDir,
  );
  await directoryPath(anchor, false);
  const info = await lstat(anchor);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error(
      `Installation anchor must be an existing ordinary directory: ${anchor}`,
    );
  return root;
}
function targetFor(root: string, name: string, platform: string) {
  const slug = name.includes('/')
    ? assertSkillId(name).split('/')[1]
    : slugSchema.parse(name);
  assertPlatformSkill(platform, slug);
  return { slug, target: join(root, slug) };
}
function expectedDirectories(paths: string[]) {
  const result = new Set<string>();
  for (const path of paths) {
    const parts = path.split('/');
    parts.pop();
    while (parts.length) {
      result.add(parts.join('/'));
      parts.pop();
    }
  }
  return result;
}
async function verifyTree(target: string, receipt: Receipt) {
  const files = await readSkillFiles(target, { receiptFile: RECEIPT });
  if (!sameFiles(fingerprints(files), receipt.files))
    throw new Error(
      'Package has modified, missing or additional files; refusing to overwrite or delete user changes',
    );
  const allowed = expectedDirectories(Object.keys(files));
  async function walk(directory: string, prefix = '') {
    for (const name of await readdir(directory)) {
      const path = prefix + name;
      const info = await lstat(join(directory, name));
      if (info.isSymbolicLink())
        throw new Error(`Symlink in installation: ${path}`);
      if (info.isDirectory()) {
        if (!allowed.has(path))
          throw new Error(`Additional user directory: ${path}`);
        await walk(join(directory, name), `${path}/`);
      } else if (!info.isFile() || info.nlink !== 1)
        throw new Error(`Unsafe installed entry: ${path}`);
    }
  }
  await walk(target);
  return files;
}
async function readReceipt(
  target: string,
  context: InstallationContext,
  slug: string,
) {
  try {
    await directoryPath(target, false);
    const path = join(target, RECEIPT);
    const info = await lstat(path);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.nlink !== 1 ||
      info.size > 64 * 1024
    )
      throw new Error('Invalid installation receipt');
    const receipt = receiptSchema.parse(
      JSON.parse(await readFile(path, 'utf8')),
    );
    if (
      receipt.id.split('/')[1] !== slug ||
      receipt.platform !== context.platform ||
      receipt.scope !== (context.scope ?? 'project')
    )
      throw new Error(
        'Receipt identity, platform or scope does not match this installation',
      );
    if (!Object.hasOwn(receipt.files, 'SKILL.md'))
      throw new Error('Receipt is missing SKILL.md');
    return receipt;
  } catch (error) {
    throw new Error(
      `Unmanaged or invalid installation at ${target}; refusing to change it: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
async function locked<T>(root: string, operation: () => Promise<T>) {
  await directoryPath(root, true);
  const lock = join(root, '.open-skill-kit.lock');
  let handle;
  try {
    handle = await open(lock, 'wx', 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      throw new Error(
        `Installation is locked: ${lock}. Another operation may be running; review a stale lock manually.`,
        { cause: error },
      );
    throw error;
  }
  try {
    return await operation();
  } finally {
    await handle.close();
    await unlink(lock);
  }
}
async function collision(root: string, slug: string) {
  if (
    (await readdir(root)).some(
      (name) => name.toLowerCase() === slug.toLowerCase(),
    )
  )
    throw new Error(
      `Destination already exists: ${join(root, slug)}. Use update for an unchanged managed installation.`,
    );
}
async function stage(root: string, files: SkillFiles, receipt: Receipt) {
  const path = join(root, `.open-skill-kit-stage-${randomUUID()}`);
  await mkdir(path, { mode: 0o700 });
  try {
    for (const name of Object.keys(files).sort()) {
      const destination = join(path, name);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, files[name], { flag: 'wx', mode: 0o644 });
    }
    await writeFile(
      join(path, RECEIPT),
      JSON.stringify(receipt, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
  } catch (error) {
    await rm(path, { recursive: true, force: true });
    throw error;
  }
  return path;
}
async function publishStage(staged: string, target: string) {
  // Exclusive reservation prevents rename from replacing a pre-existing folder.
  await mkdir(target, { mode: 0o700 });
  try {
    await rename(staged, target);
  } catch (error) {
    await rmdir(target).catch(() => {});
    throw error;
  }
}
async function deleteOwned(target: string, receipt: Receipt) {
  await verifyTree(target, receipt);
  for (const path of Object.keys(receipt.files)) {
    const file = join(target, path);
    const info = await lstat(file);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.nlink !== 1 ||
      hash(await readFile(file, 'utf8')) !== receipt.files[path]
    )
      throw new Error(`File changed during removal; preserved at ${target}`);
    await unlink(file);
  }
  const directories = [...expectedDirectories(Object.keys(receipt.files))].sort(
    (a, b) => b.split('/').length - a.split('/').length,
  );
  for (const directory of directories) await rmdir(join(target, directory));
  await unlink(join(target, RECEIPT));
  // rmdir, never recursive rm: an unexpected user file is preserved.
  await rmdir(target);
}
export async function inspectInstallations(
  context: InstallationContext,
): Promise<InstallationInfo[]> {
  const root = await checkedRoot(context);
  await directoryPath(root, false);
  if (!(await exists(root))) return [];
  const result: InstallationInfo[] = [];
  for (const slug of (await readdir(root)).sort()) {
    if (!slugSchema.safeParse(slug).success) continue;
    const target = join(root, slug);
    let receipt: Receipt;
    try {
      receipt = await readReceipt(target, context, slug);
    } catch (error) {
      result.push({
        slug,
        target,
        state: 'unmanaged',
        detail: error instanceof Error ? error.message : 'No valid receipt',
      });
      continue;
    }
    try {
      await verifyTree(target, receipt);
      result.push({
        slug,
        target,
        state: 'managed',
        id: receipt.id,
        version: receipt.version,
      });
    } catch (error) {
      result.push({
        slug,
        target,
        state: 'modified',
        id: receipt.id,
        version: receipt.version,
        detail: error instanceof Error ? error.message : 'Modified package',
      });
    }
  }
  return result;
}
export async function installManagedSkill(
  skill: DiscoverySkill,
  context: InstallationContext & { allowDraft?: boolean; update?: boolean },
) {
  const root = await checkedRoot(context);
  const { slug, target } = targetFor(root, skill.id, context.platform);
  const validation = validateSkill(skill.files, skill.id, {
    profile: 'catalog',
  });
  if (!validation.valid || !validation.skill)
    throw new Error(`Invalid skill package: ${validation.errors.join('; ')}`);
  const source = validation.skill;
  if (source.status !== 'published' && !context.allowDraft)
    throw new Error(
      'Unpublished skill: review it and explicitly pass --allow-draft to install',
    );
  const receipt: Receipt = {
    owner: 'open-skill-kit',
    formatVersion: 1,
    id: source.id,
    platform: getPlatform(context.platform).id,
    scope: getScope(context.scope ?? 'project'),
    version: source.version,
    files: fingerprints(source.files),
  };
  await directoryPath(root, false);
  if (!context.update && (await exists(root))) await collision(root, slug);
  let previous: Receipt | undefined;
  if (context.update) {
    previous = await readReceipt(target, context, slug);
    if (previous.id !== source.id)
      throw new Error('Installation conflict: another skill owns this name');
    await verifyTree(target, previous);
  }
  const result = {
    target,
    files: Object.keys(source.files).sort(),
    dryRun: !!context.dryRun,
  };
  if (context.dryRun) return result;
  return locked(root, async () => {
    if (!context.update) await collision(root, slug);
    else {
      previous = await readReceipt(target, context, slug);
      if (previous.id !== source.id)
        throw new Error('Installation identity changed');
      await verifyTree(target, previous);
    }
    const staged = await stage(root, source.files, receipt);
    let backup: string | undefined;
    try {
      if (previous) {
        backup = join(root, `.open-skill-kit-backup-${randomUUID()}`);
        await rename(target, backup);
        await verifyTree(backup, previous);
      }
      await publishStage(staged, target);
    } catch (error) {
      if (backup && !(await exists(target))) await rename(backup, target);
      await rm(staged, { recursive: true, force: true });
      throw new Error(
        `${error instanceof Error ? error.message : 'Installation failed'}${backup && (await exists(backup)) ? `; preserved previous installation at ${backup}` : ''}`,
        { cause: error },
      );
    }
    if (backup && previous) await deleteOwned(backup, previous);
    return result;
  });
}
export async function uninstallManagedSkill(
  name: string,
  context: InstallationContext,
) {
  const root = await checkedRoot(context);
  const { slug, target } = targetFor(root, name, context.platform);
  await directoryPath(root, false);
  const receipt = await readReceipt(target, context, slug);
  if (name.includes('/') && receipt.id !== name)
    throw new Error('Installation conflict: ID does not match receipt');
  await verifyTree(target, receipt);
  if (context.dryRun) return { target, dryRun: true };
  return locked(root, async () => {
    const current = await readReceipt(target, context, slug);
    if (current.id !== receipt.id || !sameFiles(current.files, receipt.files))
      throw new Error('Installation changed; retry after inspection');
    await verifyTree(target, current);
    const quarantine = join(root, `.open-skill-kit-remove-${randomUUID()}`);
    await rename(target, quarantine);
    try {
      await deleteOwned(quarantine, current);
    } catch (error) {
      if (!(await exists(target))) await rename(quarantine, target);
      throw error;
    }
    return { target, dryRun: false };
  });
}
