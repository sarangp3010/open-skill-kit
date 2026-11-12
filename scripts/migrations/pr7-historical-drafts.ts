import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sameFilesystemPath } from '../../packages/catalog-indexer/src/path-identity';
import { isDeepStrictEqual } from 'node:util';
import { publicationDigest } from '../../packages/catalog-indexer/src/package-digest';

export const PR7 = Object.freeze({
  repository: 'sarangp3010/open-skill-kit',
  repositoryId: 1451647247,
  number: 7,
  base: 'ffe6fc876373ea8f3152fff165e234f29a742ed7',
  historical: '8bb0057a860e0dbd1ec4217df6b4786a891ba505',
  snapshot: 'cd221b2a49579045ecede39942d4d15c44f67c72',
});
export const migrationPaths = Object.freeze([
  'scripts/check-moderation.ts',
  'scripts/migrations/pr7-historical-drafts.ts',
  'scripts/migrations/pr7-historical-drafts.json',
  'tests/historical-draft-baseline.test.ts',
  'docs/migrations/PR7_HISTORICAL_DRAFT_BASELINE.md',
  'docs/IMPLEMENTATION_STATUS.md',
  'CHANGELOG.md',
]);
export type GitRead = (args: string[], input?: Buffer) => Buffer;
export const gitReader =
  (root: string): GitRead =>
  (args, input) =>
    execFileSync('git', ['--no-replace-objects', ...args], {
      cwd: root,
      input,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
const sha256 = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');
const text = (bytes: Buffer) =>
  new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
const fail = (message: string): never => {
  throw new Error(`PR #7 draft-baseline migration rejected: ${message}`);
};
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}
const sha = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const split = (bytes: Buffer) => text(bytes).split('\0').filter(Boolean);
type File = { path: string; mode: string; sha256: string };
type Snapshot = { files: File[]; contents: Map<string, Buffer> };
/** Only reads Git objects; never checks out files or changes Git state. */
function snapshot(git: GitRead, ref: string): Snapshot {
  const rows = split(git(['ls-tree', '-r', '-z', ref, '--', 'skills'])).map(
    (row) => {
      const match = /^(100644) blob ([a-f0-9]{40})\t(skills\/.+)$/.exec(row);
      assert(match, 'unsafe Git mode, object or path');
      const [, mode, oid, path] = match;
      assert(
        !path.includes('\\') &&
          path.split('/').every((p) => p !== '.' && p !== '..'),
        'unsafe Git path',
      );
      return { mode, oid, path };
    },
  );
  assert(
    rows.length > 0 &&
      rows.length < 5000 &&
      new Set(rows.map((r) => r.path)).size === rows.length,
    'invalid skills tree',
  );
  const ids = [...new Set(rows.map((r) => r.oid))];
  const bytes = git(
    ['cat-file', '--batch'],
    Buffer.from(ids.join('\n') + '\n'),
  );
  const blobs = new Map<string, Buffer>();
  let offset = 0;
  for (const id of ids) {
    const end = bytes.indexOf(10, offset);
    const header = text(bytes.subarray(offset, end));
    const match = /^([a-f0-9]{40}) blob ([0-9]+)$/.exec(header);
    assert(match && match[1] === id, 'missing or invalid historical blob');
    const size = Number(match[2]);
    assert(
      size <= 1048576 &&
        size >= 0 &&
        end >= offset &&
        end + size + 1 < bytes.length,
      'oversized or incomplete blob',
    );
    const blob = bytes.subarray(end + 1, end + 1 + size);
    assert(bytes[end + 1 + size] === 10, 'invalid blob framing');
    text(blob);
    blobs.set(id, blob);
    offset = end + size + 2;
  }
  assert(offset === bytes.length, 'unexpected blob data');
  return {
    files: rows
      .map((r) => ({
        path: r.path,
        mode: r.mode,
        sha256: sha256(blobs.get(r.oid)!),
      }))
      .sort((a, b) => a.path.localeCompare(b.path, 'en')),
    contents: new Map(rows.map((r) => [r.path, blobs.get(r.oid)!])),
  };
}
const skillIds = (value: Snapshot) =>
  value.files
    .filter((f) => /^skills\/[^/]+\/[^/]+\/SKILL\.md$/.test(f.path))
    .map((f) => f.path.slice(7, -9))
    .sort();
function packageRecord(value: Snapshot, id: string) {
  const prefix = `skills/${id}/`;
  const files = value.files
    .filter((f) => f.path.startsWith(prefix))
    .map((f) => ({ ...f, path: f.path.slice(prefix.length) }));
  const contents = Object.fromEntries(
    files.map((f) => [f.path, text(value.contents.get(prefix + f.path)!)]),
  );
  assert(
    JSON.parse(contents['metadata.json']).status === 'draft',
    `${id} is not a draft`,
  );
  return { digest: publicationDigest(contents), files };
}
/** Reproducible observations, never a review/approval record or authority supplied by a caller. */
export function describePr7Baseline(git: GitRead) {
  git(['merge-base', '--is-ancestor', PR7.base, PR7.historical]);
  git(['merge-base', '--is-ancestor', PR7.historical, PR7.snapshot]);
  const base = snapshot(git, PR7.base),
    historical = snapshot(git, PR7.historical),
    current = snapshot(git, PR7.snapshot);
  const original = new Set(skillIds(base));
  const ids = skillIds(historical).filter((id) => !original.has(id));
  assert(
    original.size === 23 &&
      ids.length === 19 &&
      skillIds(current).length === 42,
    'historical package set changed',
  );
  assert(
    isDeepStrictEqual(skillIds(current), skillIds(historical)),
    'snapshot identities differ from historical expansion',
  );
  const license = git(['show', `${PR7.snapshot}:LICENSE`]);
  const packages = ids.map((id) => {
    const old = packageRecord(historical, id),
      now = packageRecord(current, id);
    assert(
      old.files.length === 7 && now.files.length === 8,
      `${id}: unexpected historical/current file set`,
    );
    assert(
      isDeepStrictEqual(
        old.files,
        now.files.filter((f) => f.path !== 'LICENSE.txt'),
      ),
      `${id}: unexpected historical changes`,
    );
    assert(
      now.files.find((f) => f.path === 'LICENSE.txt')?.sha256 ===
        sha256(license),
      `${id}: retained notice changed`,
    );
    return { id, historical: old, current: now };
  });
  for (const id of skillIds(current)) packageRecord(current, id);
  return {
    schemaVersion: 1,
    kind: 'historical-draft-import-not-publication-approval',
    ...PR7,
    packages,
  };
}
interface Repository {
  id: number;
  full_name: string;
}
interface Pull {
  number: number;
  state: string;
  merged: boolean;
  base: { ref: string; sha: string; repo: Repository };
  head: { ref: string; sha: string; repo: Repository };
}
export interface MigrationContext {
  root: string;
  event: { repository?: Repository; pull_request?: Pull };
  env: NodeJS.ProcessEnv;
  get: (path: string) => Promise<unknown>;
  git?: GitRead;
}
/** No generic opt-in flag: only this repository's exact PR can enter this path. */
export async function historicalDraftAdmission(
  context: MigrationContext,
): Promise<ReadonlySet<string>> {
  const { root, event, env, get } = context;
  if (event.pull_request?.number !== PR7.number) return new Set();
  const git = context.git ?? gitReader(root),
    pr = event.pull_request;
  const repository = (r: Repository | undefined) =>
    r?.id === PR7.repositoryId && r.full_name === PR7.repository;
  assert(
    env.GITHUB_ACTIONS === 'true' &&
      ['pull_request', 'pull_request_review'].includes(
        env.GITHUB_EVENT_NAME ?? '',
      ) &&
      env.GITHUB_REPOSITORY === PR7.repository &&
      env.GITHUB_REPOSITORY_ID === String(PR7.repositoryId),
    'wrong Actions identity or event',
  );
  assert(
    repository(event.repository) &&
      repository(pr.base?.repo) &&
      repository(pr.head?.repo),
    'wrong repository or fork',
  );
  assert(
    pr.number === PR7.number &&
      pr.state === 'open' &&
      pr.merged === false &&
      pr.base.ref === 'main' &&
      pr.head.ref === 'develop' &&
      pr.base.sha === PR7.base &&
      sha(pr.head.sha),
    'wrong PR, branches, base or lifecycle state',
  );
  assert(
    env.GITHUB_REF === 'refs/pull/7/merge' &&
      env.GITHUB_BASE_REF === 'main' &&
      env.GITHUB_HEAD_REF === 'develop' &&
      sha(env.GITHUB_SHA),
    'wrong checkout context',
  );
  assert(
    text(git(['rev-parse', 'HEAD'])).trim() === env.GITHUB_SHA,
    'checkout differs from event',
  );
  assert(
    text(git(['show', '-s', '--format=%P', 'HEAD'])).trim() ===
      `${PR7.base} ${pr.head.sha}`,
    'merge parents differ from event',
  );
  git(['merge-base', '--is-ancestor', PR7.snapshot, pr.head.sha]);
  const manifest = describePr7Baseline(git);
  const manifestPath = join(root, migrationPaths[2]);
  const stat = await lstat(manifestPath);
  assert(
    stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.nlink === 1 &&
      stat.size < 1048576 &&
      sameFilesystemPath(await realpath(manifestPath), resolve(manifestPath)),
    'unsafe migration manifest',
  );
  assert(
    isDeepStrictEqual(JSON.parse(text(await readFile(manifestPath))), manifest),
    'migration manifest differs from pinned Git evidence',
  );
  const allowed = new Set<string>(migrationPaths);
  const restrict = (paths: string[]) => {
    for (const path of paths)
      assert(allowed.has(path), `unreviewed post-snapshot path: ${path}`);
  };
  const commits = text(git(['rev-list', `${PR7.snapshot}..${pr.head.sha}`]))
    .trim()
    .split('\n')
    .filter(Boolean);
  assert(
    commits.length <= 20 && commits.every(sha),
    'invalid or excessive post-snapshot history',
  );
  for (const commit of commits) {
    git(['merge-base', '--is-ancestor', PR7.snapshot, commit]);
    restrict(
      split(
        git([
          'diff-tree',
          '--root',
          '-r',
          '-m',
          '--no-commit-id',
          '--no-renames',
          '--name-only',
          '-z',
          commit,
        ]),
      ),
    );
  }
  restrict(split(git(['diff', '--name-only', '-z', PR7.snapshot, 'HEAD'])));
  restrict(split(git(['diff', '--name-only', '-z', 'HEAD'])));
  restrict(split(git(['ls-files', '--others', '--exclude-standard', '-z'])));
  const expected = snapshot(git, PR7.snapshot);
  assert(
    isDeepStrictEqual(snapshot(git, 'HEAD').files, expected.files),
    'committed skills differ from snapshot',
  );
  const observed: File[] = [];
  const expectedPaths = new Set(expected.files.map((file) => file.path));
  const expectedDirectories = new Set(['skills']);
  for (const file of expected.files) {
    const parts = file.path.split('/');
    for (let i = 1; i < parts.length; i++)
      expectedDirectories.add(parts.slice(0, i).join('/'));
  }
  async function walk(path: string) {
    assert(
      expectedPaths.has(path) || expectedDirectories.has(path),
      `unexpected skill path: ${path}`,
    );
    const info = await lstat(join(root, path));
    assert(
      !info.isSymbolicLink() && observed.length < 5000,
      `unsafe skill path: ${path}`,
    );
    if (info.isDirectory()) {
      for (const name of (await readdir(join(root, path))).sort())
        await walk(`${path}/${name}`);
    } else {
      assert(
        info.isFile() &&
          info.nlink === 1 &&
          info.size <= 1048576 &&
          (info.mode & 0o111) === 0,
        `unsafe skill file: ${path}`,
      );
      observed.push({
        path,
        mode: '100644',
        sha256: sha256(await readFile(join(root, path))),
      });
    }
  }
  await walk('skills');
  observed.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  assert(
    isDeepStrictEqual(observed, expected.files),
    'working skills differ from snapshot',
  );
  const changed = text(
    git([
      'diff',
      '--name-status',
      '--no-renames',
      PR7.base,
      'HEAD',
      '--',
      'skills',
    ]),
  );
  const additions = changed
    .split('\n')
    .filter((l) => l.startsWith('A\t') && l.endsWith('/SKILL.md'))
    .map((l) => l.split('\t')[1].slice(7, -9))
    .sort();
  assert(
    isDeepStrictEqual(additions, manifest.packages.map((p) => p.id).sort()),
    'new package set differs from the 19 historical imports',
  );
  // Live state prevents old event payloads from reopening this admission after merge.
  const live = (await get(`/repos/${PR7.repository}/pulls/7`)) as Pull;
  const sameRef = (a: Pull['base'] | undefined, b: Pull['base']) =>
    a?.ref === b.ref && a.sha === b.sha && repository(a.repo);
  assert(
    live &&
      live.number === 7 &&
      live.state === 'open' &&
      live.merged === false &&
      sameRef(live.base, pr.base) &&
      sameRef(live.head, pr.head),
    'stale PR event, changed head/base or consumed migration',
  );
  const main = (await get(`/repos/${PR7.repository}/git/ref/heads/main`)) as {
    ref?: string;
    object?: { type?: string; sha?: string };
  };
  assert(
    main?.ref === 'refs/heads/main' &&
      main.object?.type === 'commit' &&
      main.object.sha === PR7.base,
    'main advanced or migration consumed',
  );
  return new Set(manifest.packages.map((p) => p.id));
}
