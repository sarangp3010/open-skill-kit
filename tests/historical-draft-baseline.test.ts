import { beforeAll, beforeEach, afterEach, afterAll, it, expect } from 'vitest';
import {
  mkdtemp,
  cp,
  mkdir,
  rm,
  readFile,
  writeFile,
  chmod,
  symlink,
  link,
  realpath,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  PR7,
  migrationPaths,
  gitReader,
  describePr7Baseline,
  historicalDraftAdmission,
  type GitRead,
  type MigrationContext,
} from '../scripts/migrations/pr7-historical-drafts';

const repo = resolve('.'),
  merge = 'a'.repeat(40),
  head = 'b'.repeat(40);
const immutableGit = gitReader(repo),
  cache = new Map<string, Buffer>();
const cached: GitRead = (args, input) => {
  const key = JSON.stringify(args) + (input?.toString() ?? '');
  if (!cache.has(key)) cache.set(key, immutableGit(args, input));
  return cache.get(key)!;
};
let base: string, root: string;
beforeAll(async () => {
  base = await mkdtemp(join(await realpath(tmpdir()), 'osk-pr7-fixture-'));
  await cp(join(repo, 'skills'), join(base, 'skills'), { recursive: true });
  await mkdir(join(base, 'scripts/migrations'), { recursive: true });
  await cp(join(repo, migrationPaths[2]), join(base, migrationPaths[2]));
});
beforeEach(async () => {
  root = await mkdtemp(join(await realpath(tmpdir()), 'osk-pr7-case-'));
  await cp(base, root, { recursive: true });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
afterAll(async () => {
  await rm(base, { recursive: true, force: true });
});
// A synthetic merge/head graph layered over real immutable pinned Git objects.
// No Git commits, refs or working files in the real checkout are changed.
function simulatedGit(): GitRead {
  return (args, input) => {
    if (args[0] === 'rev-parse' && args[1] === 'HEAD')
      return Buffer.from(merge + '\n');
    if (args[0] === 'show' && args[1] === '-s')
      return Buffer.from(`${PR7.base} ${head}\n`);
    if (args[0] === 'merge-base' && args.includes(head)) return Buffer.alloc(0);
    if (args[0] === 'rev-list') return Buffer.from(head + '\n');
    if (args[0] === 'diff-tree') return Buffer.from(migrationPaths[0] + '\0');
    if (args[0] === 'diff' && args[1] === '--name-only') return Buffer.alloc(0);
    if (args[0] === 'ls-files') return Buffer.alloc(0);
    return cached(
      args.map((arg) => (arg === 'HEAD' ? PR7.snapshot : arg)),
      input,
    );
  };
}
function fixture(): MigrationContext {
  const repository = { id: PR7.repositoryId, full_name: PR7.repository };
  const pr = {
    number: 7,
    state: 'open',
    merged: false,
    base: { ref: 'main', sha: PR7.base, repo: repository },
    head: { ref: 'develop', sha: head, repo: repository },
  };
  return {
    root,
    event: { repository, pull_request: pr },
    git: simulatedGit(),
    env: {
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REPOSITORY: PR7.repository,
      GITHUB_REPOSITORY_ID: String(PR7.repositoryId),
      GITHUB_REF: 'refs/pull/7/merge',
      GITHUB_BASE_REF: 'main',
      GITHUB_HEAD_REF: 'develop',
      GITHUB_SHA: merge,
    },
    get: async (path) =>
      path.endsWith('/pulls/7')
        ? structuredClone(pr)
        : { ref: 'refs/heads/main', object: { type: 'commit', sha: PR7.base } },
  };
}
it('reproduces the exact 19 historical/current manifests and admits only unchanged drafts', async () => {
  const manifest = describePr7Baseline(cached);
  expect(manifest).toEqual(
    JSON.parse(await readFile(join(root, migrationPaths[2]), 'utf8')),
  );
  expect(manifest.packages).toHaveLength(19);
  for (const p of manifest.packages) {
    expect(p.historical.files).toHaveLength(7);
    expect(p.current.files).toHaveLength(8);
    expect(p.historical.digest).not.toBe(p.current.digest);
  }
  const admitted = await historicalDraftAdmission(fixture());
  expect([...admitted]).toEqual(manifest.packages.map((p) => p.id));
});
it('supports the existing review trigger without trusting unrelated review metadata', async () => {
  const c = fixture();
  c.env.GITHUB_EVENT_NAME = 'pull_request_review';
  expect((await historicalDraftAdmission(c)).size).toBe(19);
});
it('ordinary PRs receive no exception and cause no new GitHub requests', async () => {
  const c = fixture();
  c.event.pull_request!.number = 8;
  c.get = async () => {
    throw new Error('must not request');
  };
  expect((await historicalDraftAdmission(c)).size).toBe(0);
});
it.each([
  'repository',
  'repository-id',
  'fork',
  'number-context',
  'base',
  'direction',
  'head-context',
  'checkout',
  'event',
  'closed',
  'merged',
])('rejects incorrect %s identity/context', async (kind) => {
  const c = fixture(),
    pr = c.event.pull_request!;
  if (kind === 'repository') c.event.repository!.full_name = 'example/other';
  if (kind === 'repository-id') c.env.GITHUB_REPOSITORY_ID = '0';
  if (kind === 'fork') pr.head.repo = { id: 1, full_name: 'example/fork' };
  if (kind === 'number-context') c.env.GITHUB_REF = 'refs/pull/8/merge';
  if (kind === 'base') pr.base.sha = 'c'.repeat(40);
  if (kind === 'direction') {
    pr.base.ref = 'develop';
    pr.head.ref = 'main';
  }
  if (kind === 'head-context') c.env.GITHUB_HEAD_REF = 'feature/not-develop';
  if (kind === 'checkout') c.env.GITHUB_SHA = 'c'.repeat(40);
  if (kind === 'event') c.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
  if (kind === 'closed') pr.state = 'closed';
  if (kind === 'merged') pr.merged = true;
  await expect(historicalDraftAdmission(c)).rejects.toThrow(
    'migration rejected',
  );
});
it.each([
  'parents',
  'missing-history',
  'ancestry',
  'git-mode',
  'committed-content',
  'removed-addition',
  'all-additions-removed',
  'added-package',
])('rejects %s in the candidate history', async (kind) => {
  const c = fixture(),
    git = c.git!;
  c.git = (args, input) => {
    if (kind === 'parents' && args[0] === 'show' && args[1] === '-s')
      return Buffer.from(`${PR7.base} ${'c'.repeat(40)}`);
    if (kind === 'missing-history' && args[0] === 'cat-file')
      throw new Error('missing historical object');
    if (kind === 'ancestry' && args[0] === 'merge-base' && args.includes(head))
      throw new Error('not descendant');
    const bytes = git(args, input);
    if (args[0] === 'ls-tree' && args.includes('HEAD')) {
      if (kind === 'git-mode')
        return Buffer.from(bytes.toString().replace('100644', '120000'));
      if (kind === 'committed-content')
        return bytes.subarray(bytes.indexOf(0) + 1);
    }
    if (args[0] === 'diff' && args[1] === '--name-status') {
      if (kind === 'all-additions-removed') return Buffer.alloc(0);
      if (kind === 'removed-addition')
        return Buffer.from(
          bytes
            .toString()
            .replace(
              /^A\tskills\/accounting-operations\/invoice-reconciliation-assistant\/SKILL.md\n/m,
              '',
            ),
        );
      if (kind === 'added-package')
        return Buffer.concat([
          bytes,
          Buffer.from('\nA\tskills/education/new-unapproved/SKILL.md\n'),
        ]);
    }
    return bytes;
  };
  await expect(historicalDraftAdmission(c)).rejects.toThrow();
});
it.each([
  '.github/workflows/ci.yml',
  'scripts/release-license-gate.ts',
  'scripts/build-npm.ts',
  'apps/web/vite.config.ts',
  'catalog/publication-reviews.json',
  'catalog/attributions.json',
  'catalog/maintainers.json',
  'third-party/license-overrides.json',
  'docs/launch/PROVENANCE_INVENTORY.json',
  'docs/owner-decision/current/VALIDATION.md',
  'package.json',
  'pnpm-lock.yaml',
  'skills/README.md',
  'unexpected.txt',
])(
  'rejects even subsequently reverted changes to protected/unreviewed path %s',
  async (path) => {
    const c = fixture(),
      git = c.git!;
    c.git = (args, input) =>
      args[0] === 'diff-tree' ? Buffer.from(path + '\0') : git(args, input);
    await expect(historicalDraftAdmission(c)).rejects.toThrow(
      'unreviewed post-snapshot path',
    );
  },
);
it.each([
  'extra-file',
  'extra-directory',
  'changed-file',
  'removed-file',
  'removed-package',
  'published',
  'symlink',
  'mode',
])('rejects %s in the working package tree', async (kind) => {
  const folder = join(
    root,
    'skills/accounting-operations/invoice-reconciliation-assistant',
  );
  const file = join(folder, 'examples/input-1.md');
  if (kind === 'extra-file')
    await writeFile(join(folder, '.ignored-extra'), 'unexpected');
  if (kind === 'extra-directory')
    await mkdir(join(folder, 'unexpected-empty-directory'));
  if (kind === 'changed-file') await writeFile(file, 'changed');
  if (kind === 'removed-file') await rm(file);
  if (kind === 'removed-package') await rm(folder, { recursive: true });
  if (kind === 'published')
    await writeFile(join(folder, 'metadata.json'), '{"status":"published"}');
  if (kind === 'symlink') {
    await rm(file);
    await symlink(join(folder, 'SKILL.md'), file);
  }
  if (kind === 'mode') await chmod(file, 0o755);
  await expect(historicalDraftAdmission(fixture())).rejects.toThrow();
});
it('rejects changes to an existing package outside the historical 19', async () => {
  await writeFile(
    join(
      root,
      'skills/ai-machine-learning/prompt-evaluator/examples/input-1.md',
    ),
    'changed',
  );
  await expect(historicalDraftAdmission(fixture())).rejects.toThrow(
    'working skills differ',
  );
});
it.each(['historical', 'current', 'file-hash', 'extra-field'])(
  'rejects tampered manifest %s',
  async (kind) => {
    const path = join(root, migrationPaths[2]),
      value = JSON.parse(await readFile(path, 'utf8'));
    if (kind === 'historical')
      value.packages[0].historical.digest = '0'.repeat(64);
    if (kind === 'current') value.packages[0].current.digest = '0'.repeat(64);
    if (kind === 'file-hash')
      value.packages[0].current.files[0].sha256 = '0'.repeat(64);
    if (kind === 'extra-field') value.approved = true;
    await writeFile(path, JSON.stringify(value));
    await expect(historicalDraftAdmission(fixture())).rejects.toThrow(
      'manifest differs',
    );
  },
);
it.each([
  'merged',
  'closed',
  'head',
  'base',
  'main',
  'api-error',
  'malformed',
  'main-error',
])(
  'rejects stale events/post-merge replay or API failure: %s',
  async (kind) => {
    const c = fixture(),
      original = c.get;
    c.get = async (path) => {
      if (
        kind === 'api-error' ||
        (kind === 'main-error' && path.endsWith('/main'))
      )
        throw new Error('API unavailable');
      if (kind === 'malformed') return {};
      const value = (await original(path)) as Record<string, unknown>;
      if (path.endsWith('/pulls/7')) {
        if (kind === 'merged') value.merged = true;
        if (kind === 'closed') value.state = 'closed';
        if (kind === 'head')
          (value.head as { sha: string }).sha = 'c'.repeat(40);
        if (kind === 'base')
          (value.base as { sha: string }).sha = 'c'.repeat(40);
      } else if (kind === 'main')
        value.object = { type: 'commit', sha: 'c'.repeat(40) };
      return value;
    };
    await expect(historicalDraftAdmission(c)).rejects.toThrow();
  },
);
it('rejects dirty protected paths and untracked files outside the seven paths', async () => {
  for (const command of ['diff', 'ls-files']) {
    const c = fixture(),
      git = c.git!;
    c.git = (args, input) =>
      (command === 'diff' &&
        args[0] === 'diff' &&
        args[1] === '--name-only' &&
        args[3] === 'HEAD') ||
      (command === 'ls-files' && args[0] === 'ls-files')
        ? Buffer.from('unreviewed.txt\0')
        : git(args, input);
    await expect(historicalDraftAdmission(c)).rejects.toThrow(
      'unreviewed post-snapshot path',
    );
  }
});
it('subprocess admission exits 0 only for the valid fixture and rejects a replay with exit 1', () => {
  // Explicit test harness dependencies, not a production flag or environment override.
  const source = `
    import {historicalDraftAdmission,gitReader,PR7,migrationPaths} from ${JSON.stringify(pathToFileURL(join(repo, migrationPaths[1])).href)};
    const read=gitReader(${JSON.stringify(repo)}),head=${JSON.stringify(head)},merge=${JSON.stringify(merge)};
    const git=(args,input)=>{
      if(args[0]==='rev-parse'&&args[1]==='HEAD')return Buffer.from(merge+'\\n');
      if(args[0]==='show'&&args[1]==='-s')return Buffer.from(PR7.base+' '+head+'\\n');
      if(args[0]==='merge-base'&&args.includes(head))return Buffer.alloc(0);
      if(args[0]==='rev-list')return Buffer.from(head+'\\n');
      if(args[0]==='diff-tree')return Buffer.from(migrationPaths[0]+'\\0');
      if(args[0]==='diff'&&args[1]==='--name-only'||args[0]==='ls-files')return Buffer.alloc(0);
      return read(args.map(arg=>arg==='HEAD'?PR7.snapshot:arg),input);
    };
    const context=${JSON.stringify({ ...fixture(), git: undefined, get: undefined })};
    context.git=git;
    context.get=async path=>path.endsWith('/pulls/7')?{...context.event.pull_request,merged:process.argv[1]==='replay'}:{ref:'refs/heads/main',object:{type:'commit',sha:PR7.base}};
    try{const admitted=await historicalDraftAdmission(context);if(admitted.size!==19)throw Error('unexpected admission');console.log('19 drafts; no publication approval');}
    catch(error){console.error(error.message);process.exitCode=1;}
  `;
  for (const replay of [false, true]) {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--input-type=module',
        '-e',
        source,
        ...(replay ? ['replay'] : []),
      ],
      {
        cwd: repo,
        env: { ...process.env, TSX_DISABLE_CACHE: '1' },
        encoding: 'utf8',
        timeout: 20000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(replay ? 1 : 0);
    expect(result.stdout + result.stderr).toContain(
      replay ? 'consumed migration' : 'no publication approval',
    );
  }
});
it('the actual moderation CLI preserves normal success and rejects an ordinary PR adding these packages', async () => {
  const env: NodeJS.ProcessEnv = { ...process.env, TSX_DISABLE_CACHE: '1' };
  delete env.GITHUB_ACTIONS;
  const normal = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/check-moderation.ts'],
    { cwd: repo, env, encoding: 'utf8', timeout: 20000 },
  );
  expect(normal.status, normal.stderr).toBe(0);
  const eventPath = join(root, 'event.json');
  const event = fixture().event;
  event.pull_request!.number = 8;
  await writeFile(eventPath, JSON.stringify(event));
  const rejected = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/check-moderation.ts'],
    {
      cwd: repo,
      env: { ...env, GITHUB_ACTIONS: 'true', GITHUB_EVENT_PATH: eventPath },
      encoding: 'utf8',
      timeout: 20000,
    },
  );
  expect(rejected.status, rejected.stderr).toBe(1);
  expect(rejected.stderr).toContain('new source packages require approval');
  expect(
    JSON.parse(
      await readFile(join(repo, 'catalog/publication-reviews.json'), 'utf8'),
    ).decisions,
  ).toEqual([]);
  expect(
    JSON.parse(await readFile(join(repo, 'catalog/published.json'), 'utf8'))
      .skills,
  ).toEqual([]);
});

it.each(['symlink', 'hardlink'])(
  'rejects a %s migration manifest',
  async (kind) => {
    const path = join(root, migrationPaths[2]),
      alias = join(root, 'manifest-copy.json');
    await cp(path, alias);
    await rm(path);
    if (kind === 'symlink') await symlink(alias, path);
    else await link(alias, path);
    await expect(historicalDraftAdmission(fixture())).rejects.toThrow(
      'unsafe migration manifest',
    );
  },
);
