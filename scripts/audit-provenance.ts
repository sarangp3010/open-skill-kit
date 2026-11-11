import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dependencyNoticeRecord } from './third-party-notices';
import {
  generateCatalog,
  publicationDigest,
} from '../packages/catalog-indexer/src/index';
import { evidenceDigest } from '../packages/catalog-indexer/src/maintainer-review';
const json = (input: unknown) => JSON.stringify(input, null, 2) + '\n';
export async function provenanceInventory(root: string) {
  const rootLicense = await readFile(join(root, 'LICENSE'), 'utf8');
  const catalog = (await generateCatalog(join(root, 'skills'))).catalog;
  const skills = catalog.skills.map((skill) => {
    if (skill.license !== 'MIT' || skill.files['LICENSE.txt'] !== rootLicense)
      throw new Error(
        `${skill.id}: preserve the declared project MIT notice; investigate conflicting licenses explicitly`,
      );
    return {
      id: skill.id,
      packageDigest: publicationDigest(skill.files),
      declaredAuthor: skill.author ?? null,
      declaredLicense: skill.license,
      declaredProvenance: skill.provenance ?? null,
      licenseNoticeSha256: evidenceDigest(skill.files['LICENSE.txt']),
      files: Object.entries(skill.files)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([path, text]) => ({ path, sha256: evidenceDigest(text) })),
      externalSourceIndicators: Object.entries(skill.files).flatMap(
        ([path, text]) =>
          [...text.matchAll(/https?:\/\/[^\s)"<>]+/g)].map(([url]) => ({
            path,
            url,
          })),
      ),
      rightsConfirmation: 'pending-human-confirmation',
    };
  });
  const dependencies: Awaited<ReturnType<typeof dependencyNoticeRecord>>[] = [];
  const seen = new Set<string>();
  async function consider(directory: string) {
    if ((await lstat(directory)).isSymbolicLink()) return;
    const record = await dependencyNoticeRecord(directory);
    const key = `${record.name}@${record.version}:${record.manifestSha256}`;
    if (!seen.has(key)) {
      seen.add(key);
      dependencies.push(record);
    }
  }
  for (const entry of (
    await readdir(join(root, 'node_modules/.pnpm'))
  ).sort()) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    if (!(await lstat(join(root, 'node_modules/.pnpm', entry))).isDirectory())
      continue;
    const directory = join(root, 'node_modules/.pnpm', entry, 'node_modules');
    try {
      await lstat(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name),
        stat = await lstat(path);
      if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
      if (name.startsWith('@')) {
        for (const child of (await readdir(path)).sort())
          await consider(join(path, child));
      } else await consider(path);
    }
  }
  dependencies.sort((a, b) =>
    (a.name + '@' + a.version).localeCompare(b.name + '@' + b.version, 'en'),
  );
  const overrides = JSON.parse(
    await readFile(join(root, 'third-party/license-overrides.json'), 'utf8'),
  );
  const thirdParty = [];
  for (const name of (await readdir(join(root, 'third-party'))).sort()) {
    const bytes = await readFile(join(root, 'third-party', name));
    thirdParty.push({
      path: `third-party/${name}`,
      sha256: evidenceDigest(bytes),
    });
  }
  return {
    schemaVersion: 1,
    dependencyInventoryPlatform: process.platform + '-' + process.arch,
    lockfileSha256: evidenceDigest(
      await readFile(join(root, 'pnpm-lock.yaml')),
    ),
    scope:
      'Installed dependency manifests/notices, all 42 portable packages and retained third-party materials. Not an authorship, legal or external originality attestation.',
    rootLicenseSha256: evidenceDigest(rootLicense),
    skills,
    dependencies,
    thirdParty,
    unresolvedDependencyNotices: dependencies
      .filter((dependency) => !dependency.notices.length)
      .map((dependency) => ({
        name: dependency.name,
        version: dependency.version,
        declaredLicense: dependency.license,
        recordedException:
          overrides[`${dependency.name}@${dependency.version}`] ?? null,
        status: 'human-confirmation-required',
      })),
    sourceRights:
      'Project/application code, UI primitives, examples and fixtures have declared project licensing. A maintainer must confirm ownership and any copied/adapted material; no independent rights clearance is fabricated.',
  };
}
export async function auditBundleManifests(root: string) {
  const inventory = await provenanceInventory(root);
  const artifacts = [];
  for (const path of ['dist/npm', 'apps/web/dist']) {
    const manifest = JSON.parse(
      await readFile(join(root, path, 'DEPENDENCY_MANIFEST.json'), 'utf8'),
    );
    const notices = await readFile(
      join(root, path, 'THIRD_PARTY_NOTICES.txt'),
      'utf8',
    );
    if (
      manifest.schemaVersion !== 1 ||
      !Array.isArray(manifest.dependencies) ||
      !manifest.dependencies.length
    )
      throw new Error(`${path}: missing actual bundle dependency evidence`);
    const projectNotice = await readFile(
      join(root, path, path === 'dist/npm' ? 'LICENSE' : 'LICENSE.txt'),
    );
    if (evidenceDigest(projectNotice) !== inventory.rootLicenseSha256)
      throw new Error(`${path}: project notice mismatch`);
    for (const record of manifest.dependencies) {
      if (
        !inventory.dependencies.some(
          (dependency) => json(dependency) === json(record),
        )
      )
        throw new Error(
          `${path}: dependency manifest changed or is not in the installed inventory`,
        );
      if (!notices.includes(`${record.name}@${record.version}`))
        throw new Error(`${path}: missing bundled dependency notice`);
    }
    const files: { path: string; sha256: string }[] = [];
    async function walk(directory: string, prefix = '') {
      for (const name of (await readdir(directory)).sort()) {
        const absolute = join(directory, name),
          info = await lstat(absolute),
          relative = prefix + name;
        if (info.isSymbolicLink())
          throw new Error(`${path}: artifact contains a link: ${relative}`);
        if (info.isDirectory()) await walk(absolute, relative + '/');
        else if (info.isFile())
          files.push({
            path: relative,
            sha256: evidenceDigest(await readFile(absolute)),
          });
        else throw new Error('Unsupported artifact entry');
      }
    }
    await walk(join(root, path));
    artifacts.push({ root: path, files });
  }
  await mkdir(join(root, '.open-skill-kit'), { recursive: true });
  await writeFile(
    join(root, '.open-skill-kit/artifact-audit.json'),
    json({
      schemaVersion: 1,
      kind: 'local-file-observations-not-approval',
      artifacts,
    }),
  );
}
type Inventory = Awaited<ReturnType<typeof provenanceInventory>>;
type Dependency = Inventory['dependencies'][number];
const dependencyKey = (record: Dependency) =>
  `${record.name}@${record.version}`;

/** Read-only diagnosis. The recorded inventory is evidence, never a repair target. */
export function provenanceDrift(
  expected: Inventory,
  actual: Inventory,
): string | null {
  const samePlatform =
    expected.dependencyInventoryPlatform === actual.dependencyInventoryPlatform;
  const hostFields = new Set([
    'dependencies',
    'unresolvedDependencyNotices',
    'dependencyInventoryPlatform',
  ]);
  const sourceFields = Object.keys({ ...expected, ...actual }).filter(
    (key) => !hostFields.has(key),
  ) as (keyof Inventory)[];
  const changedSource = sourceFields.filter(
    (key) => json(expected[key]) !== json(actual[key]),
  );
  // Preserve the existing host-scoped comparison policy; never mutate either input.
  if (!samePlatform)
    return changedSource.length
      ? `Canonical/source evidence drift: ${changedSource.join(', ')}. Installed dependency records are not compared across inventory platforms. Investigate the source/lockfile evidence; do not automatically regenerate the canonical inventory.`
      : null;
  if (json(expected) === json(actual)) return null;

  const unmatched = [...actual.dependencies];
  const missing: Dependency[] = [];
  for (const record of expected.dependencies) {
    const index = unmatched.findIndex(
      (candidate) => json(candidate) === json(record),
    );
    if (index >= 0) unmatched.splice(index, 1);
    else missing.push(record);
  }
  const changed: string[] = [];
  for (let index = missing.length - 1; index >= 0; index--) {
    const record = missing[index];
    const other = unmatched.findIndex(
      (candidate) => dependencyKey(candidate) === dependencyKey(record),
    );
    if (other < 0) continue;
    const installed = unmatched.splice(other, 1)[0];
    missing.splice(index, 1);
    const fields = Object.keys({ ...record, ...installed }).filter(
      (key) =>
        json(record[key as keyof Dependency]) !==
        json(installed[key as keyof Dependency]),
    );
    changed.push(
      `${dependencyKey(record)}: ${fields.join(', ')}; expected manifest ${record.manifestSha256}, installed ${installed.manifestSha256}`,
    );
  }
  const versions = [...new Set(missing.map((record) => record.name))]
    .sort()
    .flatMap((name) => {
      const installed = unmatched.filter((record) => record.name === name);
      return installed.length
        ? [
            `${name}: missing ${missing
              .filter((record) => record.name === name)
              .map((record) => record.version)
              .sort()
              .join(', ')}; extra installed ${installed
              .map((record) => record.version)
              .sort()
              .join(', ')}`,
          ]
        : [];
    });
  const expectedKeys = new Set(expected.dependencies.map(dependencyKey));
  const retainedNotices = actual.unresolvedDependencyNotices.filter((record) =>
    expectedKeys.has(`${record.name}@${record.version}`),
  );
  const installationOnly =
    unmatched.length > 0 &&
    unmatched.every((record) => !expectedKeys.has(dependencyKey(record))) &&
    !missing.length &&
    !changed.length &&
    !changedSource.length &&
    json(expected.unresolvedDependencyNotices) === json(retainedNotices);
  const describe = (records: Dependency[]) =>
    records
      .map(
        (record) =>
          `${dependencyKey(record)} [manifest ${record.manifestSha256}]`,
      )
      .sort();
  return [
    installationOnly
      ? 'Possible obsolete local installation: extra records remain beyond the canonical inventory.'
      : 'Provenance evidence mismatch against the canonical inventory.',
    `Extra installed dependency records (${unmatched.length}): ${json(describe(unmatched)).trim()}`,
    `Missing expected dependency records (${missing.length}): ${json(describe(missing)).trim()}`,
    `Changed manifest/notice evidence (${changed.length}): ${json(changed.sort()).trim()}`,
    `Changed version evidence (${versions.length}): ${json(versions).trim()}`,
    `Canonical/source fields changed: ${changedSource.join(', ') || 'none'}.`,
    `Unresolved notice-case evidence changed: ${json(expected.unresolvedDependencyNotices) === json(actual.unresolvedDependencyNotices) ? 'no' : 'yes'}.`,
    'Validation failed. Preserve the existing installation and compare in an isolated frozen-lockfile workspace. Investigate all drift before changing evidence; do not regenerate the canonical inventory to absorb obsolete or unexplained records.',
  ].join('\n');
}

export async function writeProvenanceInventory(root: string, check = false) {
  const content = json(await provenanceInventory(root)),
    path = join(root, 'docs/launch/PROVENANCE_INVENTORY.json');
  if (check) {
    const previous = JSON.parse(await readFile(path, 'utf8')) as Inventory;
    const diagnostic = provenanceDrift(
      previous,
      JSON.parse(content) as Inventory,
    );
    if (diagnostic) throw new Error(diagnostic);
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const root = fileURLToPath(new URL('../', import.meta.url)),
      arg = process.argv[2];
    if (arg === '--artifacts') await auditBundleManifests(root);
    else if (!arg || arg === '--check')
      await writeProvenanceInventory(root, arg === '--check');
    else throw new Error('Usage: audit-provenance.ts [--check | --artifacts]');
    console.log(
      'Provenance inventory checks complete. Declared rights and missing upstream evidence still require human confirmation; no approval recorded.',
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
