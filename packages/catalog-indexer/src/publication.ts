import { sameFilesystemPath } from './path-identity';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { lstatSync, readFileSync, realpathSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute, join, sep } from 'node:path';
import {
  publicationRegistrySchema,
  maintainersSchema,
  matchesSector,
  type DiscoveryCatalog,
  type PublicationRegistry,
} from '@uas/skill-schema';
import { publicationDigest } from './package-digest';
export { publicationDigest } from './package-digest';
import { validateRecordedReview, evidenceDigest } from './maintainer-review';
import { validateSkill } from '@uas/skill-validator';
const validatedRegistries = new WeakSet<object>();
const registryProofs = new WeakMap<
  object,
  {
    path: string;
    sha256: string | null;
    evidence: Map<string, string>;
    packages: { root: string; files: string[] }[];
  }
>();
function currentRegistry(registry: PublicationRegistry) {
  if (!validatedRegistries.has(registry)) return false;
  const proof = registryProofs.get(registry)!;
  if (proof.sha256 === null) return !registry.decisions.length;
  try {
    for (const item of proof.packages) {
      const actual: string[] = [];
      function walk(directory: string, prefix = '') {
        const info = lstatSync(directory);
        if (!info.isDirectory() || info.isSymbolicLink())
          throw new Error('Unsafe package tree');
        for (const name of readdirSync(directory).sort()) {
          const path = join(directory, name),
            stat = lstatSync(path);
          if (stat.isSymbolicLink()) throw new Error('Unsafe package alias');
          if (stat.isDirectory()) walk(path, prefix + name + '/');
          else {
            if (!stat.isFile() || actual.length >= 100)
              throw new Error('Unsafe package contents');
            actual.push(prefix + name);
          }
        }
      }
      walk(item.root);
      if (JSON.stringify(actual.sort()) !== JSON.stringify(item.files))
        return false;
    }
    for (const [path, digest] of proof.evidence) {
      const info = lstatSync(path);
      if (
        !info.isFile() ||
        info.isSymbolicLink() ||
        info.nlink !== 1 ||
        !sameFilesystemPath(realpathSync(path), path) ||
        evidenceDigest(readFileSync(path)) !== digest
      )
        return false;
    }
    const info = lstatSync(proof.path);
    return (
      info.isFile() &&
      !info.isSymbolicLink() &&
      info.nlink === 1 &&
      sameFilesystemPath(realpathSync(proof.path), proof.path) &&
      evidenceDigest(readFileSync(proof.path)) === proof.sha256
    );
  } catch {
    return false;
  }
}
function admittedRegistry(
  registry: PublicationRegistry,
  path: string,
  sha256: string | null,
  evidence = new Map<string, string>(),
) {
  const packages = registry.decisions
    .filter((record) => record.decision === 'approved')
    .map((record) => {
      const root = resolve(dirname(path), '../skills', record.skillId);
      const files = [...evidence.keys()]
        .map((file) => relative(root, file))
        .filter(
          (file) =>
            file &&
            !isAbsolute(file) &&
            file !== '..' &&
            !file.startsWith('..' + sep),
        )
        .map((file) => file.split(sep).join('/'))
        .sort();
      return { root, files };
    });
  registryProofs.set(registry, { path, sha256, evidence, packages });
  for (const decision of registry.decisions) {
    if (decision.reviewRecord) Object.freeze(decision.reviewRecord);
    Object.freeze(decision);
  }
  Object.freeze(registry.decisions);
  Object.freeze(registry);
  validatedRegistries.add(registry);
  return registry;
}
export async function readPublicationRegistry(
  root: string,
): Promise<PublicationRegistry> {
  const path = resolve(root, 'catalog/publication-reviews.json');
  try {
    const info = await lstat(path);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.nlink !== 1 ||
      info.size > 1048576 ||
      !sameFilesystemPath(await realpath(path), path)
    )
      throw new Error(`${path}: unsafe publication registry`);
    const bytes = await readFile(path);
    const registry = publicationRegistrySchema.parse(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
          bytes,
        ),
      ),
    );
    let maintainers = ['sarangp3010'];
    try {
      maintainers = maintainersSchema.parse(
        JSON.parse(
          await readFile(resolve(root, 'catalog/maintainers.json'), 'utf8'),
        ),
      ).maintainers;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (
      registry.decisions.some(
        (record) => !maintainers.includes(record.reviewer),
      )
    )
      throw new Error('Publication reviewer is not an authorized maintainer');
    const evidence = new Map<string, string>();
    for (const record of registry.decisions) {
      if (record.decision === 'approved' || record.reviewRecord)
        await validateRecordedReview(root, record, evidence);
    }
    return admittedRegistry(registry, path, evidenceDigest(bytes), evidence);
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === 'ENOENT' &&
      (error as NodeJS.ErrnoException).path === path
    )
      return admittedRegistry({ schemaVersion: 1, decisions: [] }, path, null);
    throw error;
  }
}
export function isApprovedPackage(
  id: string,
  files: Record<string, string>,
  status: string,
  registry: PublicationRegistry,
) {
  if (!currentRegistry(registry)) return false;
  const checked = validateSkill(files, id);
  return (
    checked.valid &&
    !checked.quality.blocked &&
    checked.entry?.metadata.status === 'published' &&
    status === 'published' &&
    !Object.hasOwn(files, 'submission.json') &&
    registry.decisions.some(
      (record) =>
        record.skillId === id &&
        record.decision === 'approved' &&
        record.packageDigest === publicationDigest(files),
    )
  );
}
/** Authored status alone never admits a package to publication. */
export function publishedCatalog(
  catalog: DiscoveryCatalog,
  input: PublicationRegistry,
): DiscoveryCatalog {
  const parsed = publicationRegistrySchema.parse(input);
  if (parsed.decisions.length && !currentRegistry(input))
    throw new Error(
      'Publication requires a validated immutable registry from readPublicationRegistry',
    );
  const registry = validatedRegistries.has(input) ? input : parsed;
  for (const decision of registry.decisions) {
    if (
      !catalog.skills.some((skill) => skill.id === decision.skillId) &&
      decision.decision !== 'withdrawn'
    )
      throw new Error(
        `Publication review targets missing skill: ${decision.skillId}`,
      );
  }
  const skills = catalog.skills.filter((skill) =>
    isApprovedPackage(skill.id, skill.files, skill.status, registry),
  );
  return {
    ...catalog,
    skills,
    sectors: catalog.sectors.map((sector) => {
      const skillCount = skills.filter((skill) =>
        matchesSector(catalog.sectors, skill.sector, sector.slug),
      ).length;
      return {
        ...sector,
        skillCount,
        availability: skillCount ? 'available' : 'planned',
      };
    }),
  };
}
