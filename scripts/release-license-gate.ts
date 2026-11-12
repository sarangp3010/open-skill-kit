import { readFile, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { sameFilesystemPath } from '../packages/catalog-indexer/src/path-identity';
import {
  dependencyNoticeRecord,
  type DependencyNoticeRecord,
} from './third-party-notices';

const hash = (value: Uint8Array) =>
  createHash('sha256').update(value).digest('hex');
/** Negative release preflight only. This never creates a license approval or waiver. */
export async function assertReleaseLicenseEvidence(
  root: string,
  dependencies: DependencyNoticeRecord[],
  locations: ReadonlyMap<string, string>,
): Promise<void> {
  const path = resolve(root, 'docs/launch/PROVENANCE_INVENTORY.json');
  const info = await lstat(path);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    info.nlink !== 1 ||
    info.size > 16 * 1024 * 1024 ||
    !sameFilesystemPath(await realpath(path), path)
  )
    throw new Error('Release licensing blocked: unsafe canonical inventory');
  const inventory = JSON.parse(await readFile(path, 'utf8'));
  if (
    inventory.schemaVersion !== 1 ||
    !Array.isArray(inventory.dependencies) ||
    !Array.isArray(inventory.unresolvedDependencyNotices) ||
    !Array.isArray(inventory.thirdParty) ||
    inventory.lockfileSha256 !==
      hash(await readFile(resolve(root, 'pnpm-lock.yaml'))) ||
    inventory.rootLicenseSha256 !==
      hash(await readFile(resolve(root, 'LICENSE')))
  )
    throw new Error(
      'Release licensing blocked: missing, invalid or stale canonical evidence',
    );
  if (!dependencies.length)
    throw new Error(
      'Release licensing blocked: missing distributed dependency evidence',
    );
  const overridesPath = resolve(root, 'third-party/license-overrides.json');
  const overrideBytes = await readFile(overridesPath);
  if (
    !inventory.thirdParty.some(
      (entry: { path: string; sha256: string }) =>
        entry.path === 'third-party/license-overrides.json' &&
        entry.sha256 === hash(overrideBytes),
    )
  )
    throw new Error('Release licensing blocked: override evidence changed');
  const overrides = JSON.parse(overrideBytes.toString('utf8'));
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const dependency of dependencies) {
    const key = `${dependency.name}@${dependency.version}`;
    if (seen.has(key)) problems.push(`${key}: duplicate dependency evidence`);
    seen.add(key);
    const matches = inventory.dependencies.filter(
      (entry: DependencyNoticeRecord) =>
        entry.name === dependency.name && entry.version === dependency.version,
    );
    if (
      matches.length !== 1 ||
      JSON.stringify(matches[0]) !== JSON.stringify(dependency)
    )
      problems.push(
        `${key}: exact-release dependency evidence differs from canonical inventory`,
      );
    if (
      inventory.unresolvedDependencyNotices.some(
        (entry: { name: string; version: string }) =>
          entry.name === dependency.name &&
          entry.version === dependency.version,
      )
    )
      problems.push(
        `${key}: unresolved dependency license provenance; human confirmation required`,
      );
    try {
      const directory = locations.get(key);
      if (!directory) throw new Error('missing package location');
      const packageRoot = await realpath(directory);
      if (
        JSON.stringify(await dependencyNoticeRecord(packageRoot)) !==
        JSON.stringify(dependency)
      )
        throw new Error('observed package evidence changed');
      for (const notice of dependency.notices) {
        if (
          !/^[^/\\]+$/.test(notice.file) ||
          !/^(licen[cs]e|copying|notice)([.-]|$)/i.test(notice.file)
        )
          throw new Error('unsafe notice reference');
        const file = resolve(packageRoot, notice.file);
        const stat = await lstat(file);
        if (
          !stat.isFile() ||
          stat.isSymbolicLink() ||
          stat.size > 2 * 1024 * 1024
        )
          throw new Error('unsafe notice material');
        const bytes = await readFile(file);
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        if (
          !text.trim() ||
          text.includes('\0') ||
          hash(bytes) !== notice.sha256
        )
          throw new Error('empty or invalid notice material');
      }
    } catch (error) {
      problems.push(
        `${key}: invalid required license evidence (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    if (
      typeof dependency.license !== 'string' ||
      !dependency.license.trim() ||
      dependency.license.trim().toUpperCase() === 'UNLICENSED'
    )
      problems.push(`${key}: missing or invalid license declaration`);
    if (
      !Array.isArray(dependency.notices) ||
      !dependency.notices.length ||
      dependency.notices.some(
        (notice) =>
          !/^[^/\\]+$/.test(notice.file) ||
          !/^(licen[cs]e|copying|notice)([.-]|$)/i.test(notice.file) ||
          !/^[a-f0-9]{64}$/.test(notice.sha256),
      )
    ) {
      const sourceVersion = overrides[key]?.sourceVersion;
      problems.push(
        `${key}: missing exact-release packaged notice evidence${sourceVersion && sourceVersion !== dependency.version ? ` (override source version ${sourceVersion} differs)` : ''}; notes, hashes and version declarations cannot waive this block`,
      );
    }
  }
  if (problems.length)
    throw new Error('Release licensing blocked:\n' + problems.join('\n'));
}
