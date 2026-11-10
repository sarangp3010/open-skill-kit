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
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  jobs: Record<
    string,
    {
      if?: string;
      needs?: string | string[];
      environment?: { name: string };
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
        } else expect(job['runs-on']).toBe('ubuntu-latest');
        if (id !== 'deploy-pages')
          expect(job.permissions).toEqual(
            id === 'validate'
              ? { contents: 'read', 'pull-requests': 'read' }
              : { contents: 'read' },
          );
        for (const step of job.steps) {
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
  it('limits privileged deployment to the canonical main push/manual event and executes no application code there', async () => {
    const workflow = parse(
      await readFile(resolve('.github/workflows/ci.yml'), 'utf8'),
    ) as Workflow;
    const guard =
      "github.repository == 'sarangp3010/open-skill-kit' && github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')";
    for (const id of ['build-pages', 'deploy-pages'])
      expect(workflow.jobs[id].if).toBe(guard);
    const deploy = workflow.jobs['deploy-pages'];
    expect(deploy.permissions).toEqual({
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    });
    expect(deploy.steps).toHaveLength(1);
    expect(deploy.steps[0].uses).toMatch(/^actions\/deploy-pages@/);
    expect(deploy.steps[0].run).toBeUndefined();
    expect(
      workflow.jobs['validate'].steps.some(
        (step) => step.run === 'pnpm contributions:check',
      ),
    ).toBe(true);
  });
  it('keeps the reviewed build/deploy dependency chain and confines the read token to moderation', async () => {
    const workflow = parse(
      await readFile(resolve('.github/workflows/ci.yml'), 'utf8'),
    ) as Workflow;
    expect(workflow.jobs['build-pages'].needs).toEqual([
      'validate',
      'portability',
    ]);
    expect(workflow.jobs['deploy-pages'].needs).toBe('build-pages');
    expect(workflow.jobs['deploy-pages'].environment?.name).toBe(
      'github-pages',
    );
    const tokenSteps = workflow.jobs.validate.steps.filter(
      (step) => step.env?.GH_TOKEN,
    );
    expect(tokenSteps).toHaveLength(1);
    expect(tokenSteps[0].run).toBe('pnpm moderation:check');
    expect(tokenSteps[0].env?.GH_TOKEN).toBe('${{ github.token }}');
    expect(
      workflow.jobs.validate.steps.some(
        (step) => step.run === 'pnpm release:check',
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
