import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  INDEX_BUDGET_BYTES,
  webArtifacts,
} from '../packages/catalog-indexer/src/index';
import {
  catalogIndexSchema,
  catalogSearchSchema,
  discoveryCatalogSchema,
  normalizeSearchText,
  skillDetailSchema,
  type DiscoveryCatalog,
} from '../packages/skill-schema/src/index';
import { regenerateCatalog } from '../scripts/catalog';
import {
  PAGE_SIZE,
  bodySearchEntries,
  facetCount,
  searchTerms,
  selectSkills,
  type CatalogFilters,
} from '../apps/web/src/lib/catalog';
import { resolvePackagePath } from '../apps/web/src/lib/markdown-paths';

let serialized: string;
let catalog: DiscoveryCatalog;
beforeAll(async () => {
  serialized = await readFile(resolve('catalog/catalog.json'), 'utf8');
  catalog = discoveryCatalogSchema.parse(JSON.parse(serialized));
});
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe('browser data artifacts', () => {
  it('are deterministic, sorted and bound to the canonical catalog digest', () => {
    const first = webArtifacts(serialized);
    expect(webArtifacts(serialized)).toEqual(first);
    const paths = first.artifacts.map(([path]) => path);
    expect(paths).toEqual([...paths].sort());
    expect(new Set(paths).size).toBe(paths.length);
    expect(first.catalogDigest).toBe(
      createHash('sha256').update(serialized).digest('hex'),
    );
    expect(paths).toEqual(
      [
        'data/index.json',
        'data/search.json',
        ...catalog.skills.map(
          (skill) => `data/skills/${skill.sector}/${skill.slug}.json`,
        ),
      ].sort(),
    );
  });

  it('keeps the initial index within budget and free of file contents', () => {
    const files = new Map(webArtifacts(serialized).artifacts);
    const raw = files.get('data/index.json')!;
    expect(Buffer.byteLength(raw)).toBeLessThanOrEqual(INDEX_BUDGET_BYTES);
    expect(Buffer.byteLength(raw)).toBeLessThan(Buffer.byteLength(serialized));
    const index = catalogIndexSchema.parse(JSON.parse(raw));
    expect(index.sectors).toEqual(catalog.sectors);
    expect(index.skills.map((skill) => skill.id)).toEqual(
      catalog.skills.map((skill) => skill.id),
    );
    for (const skill of index.skills) {
      for (const key of ['body', 'files', 'examples', 'provenance'])
        expect(skill).not.toHaveProperty(key);
      const source = catalog.skills.find((item) => item.id === skill.id)!;
      expect(skill.status).toBe(source.status);
      expect(skill.quality).toEqual({
        score: source.quality!.score,
        blocked: source.quality!.blocked,
      });
      expect(skill.validation).toEqual({ status: source.validation!.status });
      expect(skill.compatibility).toEqual(
        source.compatibility!.map(({ platform, installation, testing }) => ({
          platform,
          installation,
          testing,
        })),
      );
    }
  });

  it('rejects an index over its budget instead of shipping it', () => {
    expect(() => webArtifacts(serialized, 1000)).toThrow(
      /index\.json is \d+ bytes; the initial catalog budget is 1000 bytes/,
    );
  });

  it('writes one complete, digest-bound detail per skill and full-text entries', () => {
    const { artifacts, catalogDigest } = webArtifacts(serialized);
    const files = new Map(artifacts);
    for (const skill of catalog.skills) {
      const detail = skillDetailSchema.parse(
        JSON.parse(
          files.get(`data/skills/${skill.sector}/${skill.slug}.json`)!,
        ),
      );
      expect(detail.catalogDigest).toBe(catalogDigest);
      expect(detail.skill).toEqual(skill);
    }
    const search = catalogSearchSchema.parse(
      JSON.parse(files.get('data/search.json')!),
    );
    expect(search.catalogDigest).toBe(catalogDigest);
    expect(Object.keys(search.entries).sort()).toEqual(
      catalog.skills.map((skill) => skill.id).sort(),
    );
    for (const skill of catalog.skills)
      expect(search.entries[skill.id]).toBe(normalizeSearchText(skill.body));
  });

  it('keeps every skill draft and publishes nothing through the new artifacts', () => {
    const files = new Map(webArtifacts(serialized).artifacts);
    const index = catalogIndexSchema.parse(
      JSON.parse(files.get('data/index.json')!),
    );
    expect(index.skills.length).toBe(catalog.skills.length);
    expect(index.skills.every((skill) => skill.status === 'draft')).toBe(true);
  });
});

describe('generated artifact freshness', () => {
  async function fixtureRoot() {
    const directory = await mkdtemp(
      join(await realpath(tmpdir()), 'osk-web-artifacts-'),
    );
    directories.push(directory);
    await cp(resolve('tests/fixtures/valid'), join(directory, 'skills'), {
      recursive: true,
    });
    await mkdir(join(directory, 'catalog'));
    await writeFile(join(directory, 'catalog/sectors.json'), '[]');
    return directory;
  }
  it('detects stale, missing and unexpected browser data and replaces orphans on rebuild', async () => {
    const directory = await fixtureRoot();
    const { web } = await regenerateCatalog(directory);
    const check = () =>
      regenerateCatalog(directory, { check: true, checkPublic: true });
    await check();
    const [detailPath, detail] = web.artifacts.find(([path]) =>
      path.startsWith('data/skills/'),
    )!;
    const target = join(directory, 'apps/web/public', detailPath);
    await writeFile(target, detail.replace('"draft"', '"published"'));
    await expect(check()).rejects.toThrow(/stale generated artifact/);
    await rm(target);
    await expect(check()).rejects.toThrow(/missing generated artifact/);
    await regenerateCatalog(directory);
    await check();
    const orphan = join(
      directory,
      'apps/web/public/data/skills/removed/old-skill.json',
    );
    await mkdir(join(orphan, '..'), { recursive: true });
    await writeFile(orphan, '{}');
    await expect(check()).rejects.toThrow(/unexpected generated artifact/);
    await regenerateCatalog(directory);
    await expect(readFile(orphan)).rejects.toMatchObject({ code: 'ENOENT' });
    await check();
    // The pre-build CI check covers committed catalogs only.
    await rm(join(directory, 'apps/web/public/data'), { recursive: true });
    await regenerateCatalog(directory, { check: true });
  });

  async function outsideSentinel() {
    const outside = await mkdtemp(
      join(await realpath(tmpdir()), 'osk-outside-'),
    );
    directories.push(outside);
    await mkdir(join(outside, 'data'));
    await writeFile(join(outside, 'keep.txt'), 'outside');
    await writeFile(join(outside, 'data', 'keep.txt'), 'outside');
    return outside;
  }
  async function expectSentinels(outside: string) {
    expect(await readFile(join(outside, 'keep.txt'), 'utf8')).toBe('outside');
    expect(await readFile(join(outside, 'data', 'keep.txt'), 'utf8')).toBe(
      'outside',
    );
  }
  it('refuses to replace a symlinked data directory or delete its target', async () => {
    const directory = await fixtureRoot();
    const outside = await outsideSentinel();
    await mkdir(join(directory, 'apps/web/public'), { recursive: true });
    await symlink(outside, join(directory, 'apps/web/public/data'), 'dir');
    await expect(regenerateCatalog(directory)).rejects.toThrow(
      /apps\/web\/public\/data: generated data path must be a real directory/,
    );
    await expectSentinels(outside);
    // Nothing was written through the refused path in this run.
    await expect(
      readFile(join(directory, 'apps/web/public/catalog.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    // Freshness checks also refuse to traverse a symlinked data directory.
    await rm(join(directory, 'apps/web/public/data'));
    await regenerateCatalog(directory);
    await rm(join(directory, 'apps/web/public/data'), { recursive: true });
    await symlink(outside, join(directory, 'apps/web/public/data'), 'dir');
    await expect(
      regenerateCatalog(directory, { check: true, checkPublic: true }),
    ).rejects.toThrow(/must be a real directory/);
    await expectSentinels(outside);
  });
  it('refuses a symlinked public ancestor and a data path that is a file', async () => {
    const directory = await fixtureRoot();
    const outside = await outsideSentinel();
    await mkdir(join(directory, 'apps/web'), { recursive: true });
    await symlink(outside, join(directory, 'apps/web/public'), 'dir');
    await expect(regenerateCatalog(directory)).rejects.toThrow(
      /apps\/web\/public: generated data path must be a real directory/,
    );
    await expectSentinels(outside);
    const second = await fixtureRoot();
    await mkdir(join(second, 'apps/web/public'), { recursive: true });
    await writeFile(join(second, 'apps/web/public/data'), 'not a directory');
    await expect(regenerateCatalog(second)).rejects.toThrow(
      /must be a real directory/,
    );
    expect(await readFile(join(second, 'apps/web/public/data'), 'utf8')).toBe(
      'not a directory',
    );
  });
  it('removes a nested symlink without following it and rejects it during checks', async () => {
    const directory = await fixtureRoot();
    const outside = await outsideSentinel();
    await regenerateCatalog(directory);
    const link = join(directory, 'apps/web/public/data/skills/escape');
    await symlink(join(outside, 'data'), link, 'dir');
    await expect(
      regenerateCatalog(directory, { check: true, checkPublic: true }),
    ).rejects.toThrow(/generated artifacts must be regular files/);
    await regenerateCatalog(directory);
    await expect(readFile(join(link, 'keep.txt'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expectSentinels(outside);
    await regenerateCatalog(directory, { check: true, checkPublic: true });
  });
});

describe('browse search, facets and paging contracts', () => {
  const index = () =>
    catalogIndexSchema.parse(
      JSON.parse(
        new Map(webArtifacts(serialized).artifacts).get('data/index.json')!,
      ),
    );
  it('searches body text only through supplied full-text entries', () => {
    const browse = index();
    const entries = bodySearchEntries(catalog.skills);
    // Find a three-word phrase from a skill body absent from all index metadata.
    const target = catalog.skills[0];
    const bodyOnly = searchTerms(target.body)
      .map((_, i, words) => words.slice(i, i + 3).join(' '))
      .find(
        (candidate) =>
          candidate.split(' ').length === 3 &&
          selectSkills(browse, { query: candidate }).length === 0 &&
          selectSkills(browse, { query: candidate }, entries).length > 0,
      );
    expect(bodyOnly, 'no body-only phrase found').toBeDefined();
    const found = selectSkills(browse, { query: bodyOnly }, entries);
    expect(found.map((skill) => skill.id)).toContain(target.id);
    // Full catalogs without entries still search their own bodies.
    expect(
      selectSkills(catalog, { query: bodyOnly }).map((skill) => skill.id),
    ).toEqual(found.map((skill) => skill.id));
    expect(searchTerms('  Résumé   REVIEW ')).toEqual(
      normalizeSearchText('résumé review').split(' '),
    );
  });

  it('counts each facet option with every other active filter applied', () => {
    const browse = index();
    const entries = bodySearchEntries(catalog.skills);
    const filters: CatalogFilters = {
      query: 'review',
      broadSector: 'technology',
      minQuality: 80,
    };
    for (const capability of new Set(
      browse.skills.flatMap((skill) => skill.capabilities),
    ))
      expect(
        facetCount(browse, filters, entries, 'capability', capability),
      ).toBe(selectSkills(browse, { ...filters, capability }, entries).length);
    for (const sector of browse.sectors)
      expect(facetCount(browse, filters, entries, 'sector', sector.slug)).toBe(
        selectSkills(browse, { ...filters, sector: sector.slug }, entries)
          .length,
      );
    // Choosing a broad sector clears an active specialty, as the URL does.
    const withSector = { ...filters, sector: 'software-development' };
    expect(
      facetCount(browse, withSector, entries, 'broadSector', 'finance'),
    ).toBe(
      selectSkills(
        browse,
        { ...filters, broadSector: 'finance', sector: '' },
        entries,
      ).length,
    );
    expect(facetCount(browse, {}, entries, 'testing', 'recorded-pass')).toBe(0);
    expect(facetCount(browse, {}, entries, 'status', 'published')).toBe(0);
    expect(facetCount(browse, {}, entries, 'status', 'draft')).toBe(
      browse.skills.length,
    );
  });

  it('uses a page size that exposes every result across pages', () => {
    const results = selectSkills(index(), {});
    expect(PAGE_SIZE).toBeGreaterThan(0);
    const pages = Math.ceil(results.length / PAGE_SIZE);
    const shown = Array.from({ length: pages }, (_, page) =>
      results.slice(0, (page + 1) * PAGE_SIZE),
    );
    expect(shown.at(-1)).toEqual(results);
    expect(shown[0].length).toBe(Math.min(PAGE_SIZE, results.length));
  });
});

describe('package-relative example links', () => {
  it('resolves relative to the current file and rejects escapes or schemes', () => {
    expect(resolvePackagePath('examples/input-1.md', 'output-1.md')).toBe(
      'examples/output-1.md',
    );
    expect(resolvePackagePath('examples/input-1.md', './output-2.md')).toBe(
      'examples/output-2.md',
    );
    expect(resolvePackagePath('examples/input-1.md', '../review.md')).toBe(
      'review.md',
    );
    expect(resolvePackagePath('SKILL.md', 'examples/input-1.md')).toBe(
      'examples/input-1.md',
    );
    expect(resolvePackagePath('SKILL.md', 'notes%20file.md')).toBe(
      'notes file.md',
    );
    expect(resolvePackagePath('examples/input-1.md', '../../escape.md')).toBe(
      null,
    );
    expect(resolvePackagePath('SKILL.md', '/etc/passwd')).toBe(null);
    expect(resolvePackagePath('SKILL.md', 'javascript:alert(1)')).toBe(null);
    expect(resolvePackagePath('SKILL.md', '%E0%A4%A')).toBe(null);
  });
});
