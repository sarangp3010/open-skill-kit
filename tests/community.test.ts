import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  checkContributions,
  contributionSummary,
  annotationEscape,
} from '../scripts/check-contributions';
import {
  readAttributions,
  assessAttribution,
  generateCatalog,
  readSkillFiles,
  packageDigest,
} from '../packages/catalog-indexer/src/index';
import { validateSkill } from '../packages/skill-validator/src/index';
import { attributionRegistrySchema } from '../packages/skill-schema/src/index';
import { thirdPartyNotices } from '../scripts/third-party-notices';
// Reuse the YAML parser already installed for the skill parser; no new dependency.
const { parse } = createRequire(resolve('packages/skill-parser/package.json'))(
  'yaml',
) as { parse: (source: string) => unknown };
let temp: string;
beforeEach(async () => {
  temp = await mkdtemp(join(await realpath(tmpdir()), 'osk-community-'));
});
afterEach(async () => {
  await rm(temp, { recursive: true, force: true });
});
async function fixture() {
  await cp(resolve('tests/fixtures/valid'), join(temp, 'skills'), {
    recursive: true,
  });
  return join(temp, 'skills/education/example-skill');
}
describe('actionable contribution diagnostics', () => {
  it('checks the real library without changing editorial or platform evidence', async () => {
    const report = await checkContributions(resolve('.'));
    expect(report).toMatchObject({ valid: true, packages: 42, errors: [] });
    expect(report.quality).toHaveLength(42);
  });
  it('detects duplicate bodies even when the copied skill has another slug and title', async () => {
    const source = await fixture(),
      target = join(temp, 'skills/education/another-skill');
    await cp(source, target, { recursive: true });
    const skill = await readFile(join(target, 'SKILL.md'), 'utf8');
    await writeFile(
      join(target, 'SKILL.md'),
      skill
        .replace('name: example-skill', 'name: another-skill')
        .replace('# Example Skill', '# Another Title'),
    );
    const metadata = JSON.parse(
      await readFile(join(target, 'metadata.json'), 'utf8'),
    );
    metadata.id = 'education/another-skill';
    metadata.slug = 'another-skill';
    metadata.title = 'Another Title';
    await writeFile(join(target, 'metadata.json'), JSON.stringify(metadata));
    const cases = JSON.parse(
      await readFile(join(target, 'tests/cases.json'), 'utf8'),
    );
    cases.skillId = metadata.id;
    await writeFile(join(target, 'tests/cases.json'), JSON.stringify(cases));
    const report = await checkContributions(temp);
    expect(report.valid).toBe(false);
    expect(
      report.errors.some(
        (error) =>
          error.message.includes('Duplicate instruction body') &&
          error.path.endsWith('SKILL.md'),
      ),
    ).toBe(true);
  });
  it('aggregates unsafe payload and invalid YAML diagnostics with source paths', async () => {
    const source = await fixture();
    await writeFile(join(source, 'payload.sh'), 'echo unsafe');
    await writeFile(join(source, 'SKILL.md'), '---\nname: [invalid\n---');
    const report = await checkContributions(temp);
    expect(report.valid).toBe(false);
    expect(
      report.errors.some(
        (error) =>
          error.path.endsWith('payload.sh') &&
          error.message.includes('Unsupported file type'),
      ),
    ).toBe(true);
    await rm(join(source, 'payload.sh'));
    const malformed = await checkContributions(temp);
    expect(
      malformed.errors.some((error) => error.path.endsWith('SKILL.md')),
    ).toBe(true);
  });
  it('refuses linked package files and escapes annotation/summary command injection', async () => {
    const source = await fixture();
    await symlink(join(source, 'SKILL.md'), join(source, 'linked.md'));
    expect(
      (await checkContributions(temp)).errors.some((error) =>
        error.message.includes('Symlinks'),
      ),
    ).toBe(true);
    const injected = 'bad%\n::error::injected\r<script>bad()</script>';
    const escaped = annotationEscape(injected);
    expect(escaped).not.toContain('\n');
    expect(escaped).toContain('%25');
    expect(escaped).toContain('%0A');
    const summary = contributionSummary({
      valid: false,
      pending: 0,
      packages: 1,
      errors: [{ path: injected, message: injected }],
      warnings: [],
      quality: [],
    });
    expect(summary).not.toContain('<script>');
    expect(summary).not.toContain('\n::error::injected');
    expect(summary).toContain('pnpm contributions:check');
  });
});
async function attributionFixture() {
  const source = await fixture();
  const skill = validateSkill(
    await readSkillFiles(source),
    'education/example-skill',
    { profile: 'catalog' },
  ).skill!;
  const evidence =
    'Synthetic attribution review for orchestration tests only. No real identity review was performed.\n';
  await mkdir(join(temp, 'catalog'));
  await mkdir(join(temp, 'docs/attributions'), { recursive: true });
  await writeFile(join(temp, 'docs/attributions/test.md'), evidence);
  const record = {
    skillId: skill.id,
    displayName: 'Synthetic Contributor',
    githubUsername: 'synthetic-contributor',
    reviewedBy: 'synthetic-reviewer',
    reviewedAt: '2026-11-10T12:00:00Z',
    reviewUrl: 'https://github.com/sarangp3010/open-skill-kit/pull/1',
    packageDigest: packageDigest(skill.files),
    evidencePath: 'docs/attributions/test.md',
    evidenceDigest: createHash('sha256').update(evidence).digest('hex'),
  };
  await writeFile(
    join(temp, 'catalog/attributions.json'),
    JSON.stringify({ schemaVersion: 1, records: [record] }),
  );
  return { record, skill };
}
describe('maintainer-recorded attribution, not self-declared verification', () => {
  it('ships no invented identities and preserves older catalogs without attribution', async () => {
    expect(await readAttributions(resolve('.'))).toEqual([]);
    expect(await readAttributions(temp)).toEqual([]);
  });
  it('requires matching bounded review evidence and marks changed packages stale', async () => {
    const { record, skill } = await attributionFixture();
    expect(await readAttributions(temp)).toEqual([record]);
    expect(assessAttribution(record, skill).status).toBe('current');
    expect(
      assessAttribution(record, {
        ...skill,
        files: { ...skill.files, 'notes.txt': 'Changed package' },
      }).status,
    ).toBe('stale');
    const catalog = (
      await generateCatalog(join(temp, 'skills'), [], {
        attributions: await readAttributions(temp),
      })
    ).catalog;
    expect(catalog.skills[0].attribution?.status).toBe('current');
    expect(catalog.skills[0].status).toBe('draft');
    expect(catalog.skills[0].testedPlatforms).toEqual([]);
    await writeFile(join(temp, 'docs/attributions/test.md'), 'Modified review');
    await expect(readAttributions(temp)).rejects.toThrow('digest mismatch');
  });
  it('rejects self-review, external review URLs, duplicate IDs and unsafe evidence paths', async () => {
    const { record } = await attributionFixture();
    for (const altered of [
      { ...record, reviewedBy: record.githubUsername },
      { ...record, reviewUrl: 'https://evil.example/pull/1' },
      { ...record, evidencePath: '../escape.md' },
    ])
      expect(
        attributionRegistrySchema.safeParse({
          schemaVersion: 1,
          records: [altered],
        }).success,
      ).toBe(false);
    expect(
      attributionRegistrySchema.safeParse({
        schemaVersion: 1,
        records: [record, record],
      }).success,
    ).toBe(false);
    await expect(
      generateCatalog(join(temp, 'skills'), [], {
        attributions: [{ ...record, skillId: 'absent/skill' }],
      }),
    ).rejects.toThrow('unknown skill');
  });
  it.each(['   ', '\0binary'])(
    'refuses empty or binary attribution evidence even with a matching digest',
    async (content) => {
      const { record } = await attributionFixture();
      await writeFile(join(temp, 'docs/attributions/test.md'), content);
      record.evidenceDigest = createHash('sha256')
        .update(content)
        .digest('hex');
      await writeFile(
        join(temp, 'catalog/attributions.json'),
        JSON.stringify({ schemaVersion: 1, records: [record] }),
      );
      await expect(readAttributions(temp)).rejects.toThrow(
        'nonempty UTF-8 text',
      );
    },
  );
  it('rejects a symlink review artifact rather than following it', async () => {
    await attributionFixture();
    const evidence = join(temp, 'docs/attributions/test.md');
    await cp(evidence, join(temp, 'original.md'));
    await rm(evidence);
    await symlink(join(temp, 'original.md'), evidence);
    await expect(readAttributions(temp)).rejects.toThrow(
      'Unsafe attribution file',
    );
  });
});
interface Workflow {
  on: Record<string, unknown> & {
    pull_request?: { branches: string[] };
    push?: { branches: string[] };
  };
  permissions: Record<string, string>;
  jobs: Record<
    string,
    {
      if?: string;
      needs?: string | string[];
      environment?: { name: string };
      container?: { image: string; options: string };
      env?: Record<string, string>;
      'runs-on': string;
      strategy?: { matrix: { os: string[] } };
      permissions?: Record<string, string>;
      steps: Array<{
        uses?: string;
        run?: string;
        env?: Record<string, string>;
        with?: Record<string, unknown>;
      }>;
    }
  >;
}
describe('workflow and community configuration boundaries', () => {
  it('documents the actual validation-only workflow boundary without implying deployment authorization', async () => {
    const policy = await readFile(resolve('SECURITY.md'), 'utf8');
    expect(policy).toContain('CI workflows validate only');
    expect(policy).toContain('No Pages build/deploy jobs');
    expect(policy).toContain('no Pages/OIDC write permissions');
    expect(policy).toContain('Publication and deployment remain unauthorized');
    expect(policy).not.toContain('Pages application builds run in a separate');
    expect(policy).not.toContain('Only the pinned official deployment action');
    for (const name of await readdir(resolve('.github/workflows'))) {
      const workflow = parse(
        await readFile(resolve('.github/workflows', name), 'utf8'),
      ) as Workflow;
      expect(workflow.permissions).toEqual({ contents: 'read' });
      for (const job of Object.values(workflow.jobs)) {
        expect(job.permissions).not.toHaveProperty('pages');
        expect(job.permissions).not.toHaveProperty('id-token');
        expect(job.environment).toBeUndefined();
        for (const step of job.steps) {
          expect(step.uses ?? '').not.toMatch(
            /deploy-pages|configure-pages|upload-pages-artifact/,
          );
          expect(step.run ?? '').not.toMatch(/(?:npm|pnpm) publish/);
        }
      }
    }
  });

  it('keeps every PR-capable job read-only, secret-free and on hosted runners', async () => {
    for (const name of await readdir(resolve('.github/workflows'))) {
      const raw = await readFile(resolve('.github/workflows', name), 'utf8'),
        workflow = parse(raw) as Workflow;
      expect(workflow.permissions).toEqual({ contents: 'read' });
      expect(workflow.on).not.toHaveProperty('pull_request_target');
      expect(workflow.on).not.toHaveProperty('workflow_run');
      expect(raw).not.toMatch(/secrets\.|self-hosted|npm publish|pnpm publish/);
      for (const [id, job] of Object.entries(workflow.jobs)) {
        if (id === 'portability') {
          expect(job['runs-on']).toBe('${{ matrix.os }}');
          expect(job.strategy?.matrix.os).toEqual([
            'windows-latest',
            'macos-latest',
          ]);
          expect(job.if).toBe('github.event.repository.private == false');
        } else expect(job['runs-on']).toBe('ubuntu-24.04');
        expect(job.permissions).toEqual(
          id === 'checks'
            ? { contents: 'read', 'pull-requests': 'read' }
            : { contents: 'read' },
        );
        expect(job.environment).toBeUndefined();
        for (const step of job.steps) {
          expect(step.uses ?? '').not.toMatch(
            /deploy-pages|configure-pages|upload-pages-artifact/,
          );
          if (step.uses)
            expect(step.uses).toMatch(
              /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+@[a-f0-9]{40}$/,
            );
          if (step.uses?.startsWith('actions/checkout@'))
            expect(step.with?.['persist-credentials']).toBe(false);
          if (step.uses?.startsWith('actions/setup-node@'))
            expect(step.with).not.toHaveProperty('cache');
          if (step.run?.startsWith('pnpm install'))
            expect(step.run).toContain('--frozen-lockfile --ignore-scripts');
          expect(step.run ?? '').not.toMatch(
            /\$\{\{\s*github\.(event|head_ref)/,
          );
        }
      }
    }
  });
  it('keeps CI validation read-only and disables automatic Pages publication', async () => {
    const workflow = parse(
      await readFile(resolve('.github/workflows/ci.yml'), 'utf8'),
    ) as Workflow;
    expect(workflow.on.pull_request?.branches).toEqual(['main', 'develop']);
    expect(workflow.on.push?.branches).toEqual(['main', 'develop']);
    expect(Object.keys(workflow.jobs)).toEqual([
      'checks',
      'e2e',
      'validate',
      'portability',
    ]);
    expect(workflow.jobs['build-pages']).toBeUndefined();
    expect(workflow.jobs['deploy-pages']).toBeUndefined();
    for (const job of Object.values(workflow.jobs)) {
      expect(job.permissions).not.toHaveProperty('pages');
      expect(job.permissions).not.toHaveProperty('id-token');
      expect(
        job.steps.some((step) => step.uses?.includes('deploy-pages')),
      ).toBe(false);
    }
    expect(
      workflow.jobs.checks.steps.some(
        (step) => step.run === 'pnpm release:check',
      ),
    ).toBe(true);
    for (const command of [
      'contributions:check',
      'moderation:check',
      'founding:check',
      'release:check',
      'lint',
      'format:check',
      'typecheck',
      'test',
      'portability:check',
      'licensing:check',
      'evaluate:fixtures',
      'validate:skills',
      'check:links',
      'catalog:check',
      'build:marketplace',
      'build',
      'catalog:check-assets',
      'pack:npm',
      'licensing:artifacts',
    ])
      expect(
        workflow.jobs.checks.steps.some(
          (step) => step.run === `pnpm ${command}`,
        ),
        command,
      ).toBe(true);
    const tokenSteps = workflow.jobs.checks.steps.filter(
      (step) => step.env?.GH_TOKEN,
    );
    expect(tokenSteps).toHaveLength(1);
    expect(tokenSteps[0].run).toBe('pnpm moderation:check');
    expect(tokenSteps[0].env?.GH_TOKEN).toBe('${{ github.token }}');
  });
  it('requires both independent suites under the existing validate check, including failed or skipped dependencies', async () => {
    const workflow = parse(
      await readFile(resolve('.github/workflows/ci.yml'), 'utf8'),
    ) as Workflow;
    const gate = workflow.jobs.validate;
    expect(gate.if).toBe('always()');
    expect(gate.needs).toEqual(['checks', 'e2e']);
    expect(gate.steps).toHaveLength(1);
    expect(gate.steps[0].uses).toBeUndefined();
    expect(gate.steps[0].env).toEqual({
      CHECKS_RESULT: '${{ needs.checks.result }}',
      E2E_RESULT: '${{ needs.e2e.result }}',
    });
    // Execute the actual gate, rather than only searching its text. It must
    // reject failed, skipped and cancelled prerequisites as well as failures.
    for (const checks of ['success', 'failure', 'skipped', 'cancelled'])
      for (const e2e of ['success', 'failure', 'skipped', 'cancelled']) {
        const result = spawnSync('sh', ['-e', '-c', gate.steps[0].run!], {
          env: { ...process.env, CHECKS_RESULT: checks, E2E_RESULT: e2e },
        });
        expect(result.error).toBeUndefined();
        expect(result.status === 0).toBe(
          checks === 'success' && e2e === 'success',
        );
      }
  });
  it('uses an immutable matching Playwright image without apt/browser installation or privileged container access', async () => {
    const raw = await readFile(resolve('.github/workflows/ci.yml'), 'utf8');
    const workflow = parse(raw) as Workflow;
    const lock = parse(await readFile(resolve('pnpm-lock.yaml'), 'utf8')) as {
      importers: Record<
        string,
        { devDependencies: Record<string, { version: string }> }
      >;
    };
    const version =
      lock.importers['.'].devDependencies['@playwright/test'].version;
    const e2e = workflow.jobs.e2e;
    expect(e2e.needs).toBe('checks');
    expect(e2e.container?.image.split('@')[0]).toBe(
      `mcr.microsoft.com/playwright:v${version}-noble`,
    );
    expect(e2e.container?.image.split('@')[1]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(e2e.container?.options).toBe('--user 1001 --shm-size=1gb');
    expect(e2e.env?.PLAYWRIGHT_BROWSERS_PATH).toBe('/ms-playwright');
    expect(e2e.env?.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD).toBe('1');
    expect(e2e.steps.some((step) => step.run === 'pnpm test:e2e')).toBe(true);
    expect(e2e.steps.some((step) => step.env?.GH_TOKEN)).toBe(false);
    expect(raw).not.toMatch(
      /playwright install|apt-get|apt update|--privileged|--ipc=host|docker\.sock|continue-on-error/,
    );
    const scripts = JSON.parse(await readFile(resolve('package.json'), 'utf8'))
      .scripts as Record<string, string>;
    expect(scripts['check:duplicates']).toBe(scripts['validate:skills']);
    expect(
      workflow.jobs.checks.steps.some(
        (step) => step.run === 'pnpm validate:skills',
      ),
    ).toBe(true);
  });
  it('provides parseable issue forms with unique IDs and required fields plus private-report guidance', async () => {
    for (const name of [
      'bug_report.yml',
      'skill_request.yml',
      'documentation.yml',
    ]) {
      const form = parse(
        await readFile(resolve('.github/ISSUE_TEMPLATE', name), 'utf8'),
      ) as {
        name: string;
        body: Array<{ id?: string; validations?: { required: boolean } }>;
      };
      expect(form.name).toBeTruthy();
      const ids = form.body.flatMap((item) => (item.id ? [item.id] : []));
      expect(new Set(ids).size).toBe(ids.length);
      expect(form.body.some((item) => item.validations?.required)).toBe(true);
    }
    const config = await readFile(
      resolve('.github/ISSUE_TEMPLATE/config.yml'),
      'utf8',
    );
    expect(config).toContain('SECURITY.md');
    const pr = await readFile(
      resolve('.github/PULL_REQUEST_TEMPLATE.md'),
      'utf8',
    );
    expect(pr).toContain('pnpm validate:all');
    expect(pr).toContain('license');
  });
});
describe('shared distribution notice collection', () => {
  it('includes the pinned upstream missing-notice exception and rejects hash tampering', async () => {
    const module = resolve('node_modules/.pnpm');
    const packageDir = (await readdir(module)).find((name) =>
      name.startsWith('react-remove-scroll-bar@2.3.8'),
    )!;
    const input = join(
      module,
      packageDir,
      'node_modules/react-remove-scroll-bar/dist/es2015/index.js',
    );
    const notices = await thirdPartyNotices([input], resolve('third-party'));
    expect(notices).toContain('react-remove-scroll-bar@2.3.8');
    expect(notices).toContain('Anton Korzunov');
    expect(notices).toContain('Permission is hereby granted');
    await cp(resolve('third-party'), join(temp, 'third-party'), {
      recursive: true,
    });
    await writeFile(
      join(temp, 'third-party/react-remove-scroll-bar-2.3.8-LICENSE.txt'),
      'Changed license',
    );
    await expect(
      thirdPartyNotices([input], join(temp, 'third-party')),
    ).rejects.toThrow('mismatch');
    await expect(thirdPartyNotices([input])).rejects.toThrow(
      'Missing bundled dependency',
    );
  });
});
