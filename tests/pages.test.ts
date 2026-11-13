import { afterEach, describe, expect, it } from 'vitest';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pageMetadata, escapeHtml } from '../apps/web/src/lib/site-metadata';
import { preparePages, renderStaticPage } from '../scripts/prepare-pages';
import { discoveryCatalogSchema } from '../packages/skill-schema/src/index';
import { webArtifacts } from '../packages/catalog-indexer/src/index';
import { stampPagesVersion, verifyPagesOutput } from '../scripts/verify-pages';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function fixture() {
  const output = await mkdtemp(join(tmpdir(), 'osk-pages-'));
  directories.push(output);
  const catalog = discoveryCatalogSchema.parse(
    JSON.parse(await readFile(resolve('catalog/catalog.json'), 'utf8')),
  );
  const html =
    '<html><head><!-- osh:metadata:start --><title>Default</title><!-- osh:metadata:end --><script type="module" src="/open-skill-kit/assets/app.js"></script></head><body><div id="root"></div></body></html>';
  await writeFile(join(output, 'index.html'), html);
  await writeFile(join(output, 'catalog.json'), JSON.stringify(catalog));
  return { output, catalog, html };
}
it('creates direct-load entry points for every generated skill and sector without changing assets', async () => {
  const { output, catalog } = await fixture();
  const catalogBefore = await readFile(join(output, 'catalog.json'), 'utf8');
  expect(await preparePages(output)).toBe(
    7 + catalog.sectors.length + catalog.skills.length,
  );
  const routes = [
    'skills',
    'sectors',
    'docs',
    'contribute',
    'about',
    'create',
    'published',
    ...catalog.sectors.map((sector) => `sectors/${sector.slug}`),
    ...catalog.skills.map((skill) => `skills/${skill.sector}/${skill.slug}`),
  ];
  for (const route of routes) {
    const rendered = await readFile(join(output, route, 'index.html'), 'utf8');
    expect(rendered).toContain(
      '<title>' + escapeHtml(pageMetadata(catalog, route).title) + '</title>',
    );
    expect(rendered).toContain('src="/open-skill-kit/assets/app.js"');
    expect(rendered).toContain('application/ld+json');
    expect(rendered).toContain('<noscript>');
    expect(rendered).toContain(
      'href="https://github.com/sarangp3010/open-skill-kit/tree/main/skills"',
    );
  }
  expect(await readFile(join(output, '404.html'), 'utf8')).toContain(
    'noindex, nofollow',
  );
  expect(await readFile(join(output, '.nojekyll'), 'utf8')).toBe('');
  expect(await readFile(join(output, 'index.html'), 'utf8')).toContain(
    'Portable AI skills',
  );
  expect(await readFile(join(output, 'catalog.json'), 'utf8')).toBe(
    catalogBefore,
  );
});
it('rejects unsafe catalog paths before writing route entry points', async () => {
  const { output, catalog } = await fixture();
  catalog.skills[0]!.slug = '../escape';
  await writeFile(join(output, 'catalog.json'), JSON.stringify(catalog));
  await expect(preparePages(output)).rejects.toThrow();
  await expect(access(join(output, 'skills'))).rejects.toThrow();
});
it('fails clearly if the production catalog is missing', async () => {
  const { output } = await fixture();
  await rm(join(output, 'catalog.json'));
  await expect(preparePages(output)).rejects.toThrow(/catalog.json/);
});

it('writes a deterministic sitemap containing all skills and no planned or alias routes', async () => {
  const { output, catalog } = await fixture();
  await preparePages(output);
  const before = await readFile(join(output, 'sitemap.xml'), 'utf8');
  for (const skill of catalog.skills)
    expect(before).toContain(`/skills/${skill.id}/</loc>`);
  for (const sector of catalog.sectors.filter(
    (item) => item.aliasOf || item.availability === 'planned',
  ))
    expect(before).not.toContain(`/sectors/${sector.slug}/</loc>`);
  expect(before).not.toContain('lastmod');
  expect(before).not.toContain('404');
  expect(await readFile(join(output, 'robots.txt'), 'utf8')).toContain(
    'Sitemap: https://sarangp3010.github.io/open-skill-kit/sitemap.xml',
  );
  await preparePages(output);
  expect(await readFile(join(output, 'sitemap.xml'), 'utf8')).toBe(before);
  const home = await readFile(join(output, 'index.html'), 'utf8');
  expect(home.match(/id="page-structured-data"/g)).toHaveLength(1);
  expect(home.match(/<noscript>/g)).toHaveLength(1);
});
it('generates custom-origin metadata and escapes hostile catalog strings without executing them', async () => {
  const { catalog, html } = await fixture();
  const skill = catalog.skills[0];
  skill.title = 'Text </title><script>bad()</script>';
  skill.description =
    'Use when </script><script>bad()</script> appears in supplied data.';
  const rendered = renderStaticPage(
    html,
    catalog,
    `skills/${skill.id}`,
    'https://example.com/tools/',
  );
  expect(rendered).not.toContain('<script>bad()</script>');
  expect(rendered).toContain('&lt;/title&gt;');
  expect(rendered).toContain('\\u003c');
  expect(rendered).toContain(`https://example.com/tools/skills/${skill.id}/`);
  expect(pageMetadata(catalog, '/skills?q=test&sort=za').canonical).toBe(
    'https://sarangp3010.github.io/open-skill-kit/skills/',
  );
  expect(
    pageMetadata(catalog, '/sectors/software-engineering').canonical,
  ).toContain('/sectors/software-development/');
  expect(pageMetadata(catalog, '/https://evil.example/').canonical).toContain(
    '/404/',
  );
});
it.each([
  'javascript:alert(1)',
  'http://example.com/',
  'https://user:secret@example.com/',
  'https://example.com/?token=x',
])('rejects unsafe site configuration %s', async (siteUrl) => {
  const { output } = await fixture();
  await expect(preparePages(output, { siteUrl })).rejects.toThrow();
  await expect(access(join(output, 'sitemap.xml'))).rejects.toThrow();
});

it.each(['/constructor', '/toString', '/__proto__'])(
  'does not index prototype-like unknown route %s',
  async (path) => {
    const { catalog } = await fixture();
    expect(pageMetadata(catalog, path).robots).toBe('noindex, nofollow');
    expect(pageMetadata(catalog, path).canonical).toContain('/404/');
  },
);

/** A complete deployable site built from the committed catalogs. */
async function deployableSite() {
  const { output } = await fixture();
  const serialized = await readFile(resolve('catalog/catalog.json'), 'utf8');
  await writeFile(join(output, 'catalog.json'), serialized);
  await writeFile(
    join(output, 'published.json'),
    await readFile(resolve('catalog/published.json'), 'utf8'),
  );
  for (const [path, content] of webArtifacts(serialized).artifacts) {
    await mkdir(join(output, path, '..'), { recursive: true });
    await writeFile(join(output, path), content);
  }
  await mkdir(join(output, 'assets'));
  await writeFile(join(output, 'assets/app.js'), '');
  await writeFile(join(output, 'LICENSE.txt'), 'MIT');
  await writeFile(join(output, 'THIRD_PARTY_NOTICES.txt'), '');
  await preparePages(output);
  return output;
}
describe('Pages deployment output verification', () => {
  it('accepts a project-subpath site that mirrors the committed catalogs', async () => {
    const output = await deployableSite();
    const catalog = discoveryCatalogSchema.parse(
      JSON.parse(await readFile(resolve('catalog/catalog.json'), 'utf8')),
    );
    expect(await verifyPagesOutput(resolve('.'), output)).toMatchObject({
      skills: catalog.skills.length,
      published: 0,
    });
  });

  it('rejects assets built for the domain root instead of the project path', async () => {
    const output = await deployableSite();
    const page = join(output, 'skills/index.html');
    await writeFile(
      page,
      (await readFile(page, 'utf8')).replace(
        '/open-skill-kit/assets/app.js',
        '/assets/app.js',
      ),
    );
    await expect(verifyPagesOutput(resolve('.'), output)).rejects.toThrow(
      /outside the Pages base path/,
    );
  });

  it('rejects references to assets missing from the artifact', async () => {
    const output = await deployableSite();
    await rm(join(output, 'assets/app.js'));
    await expect(verifyPagesOutput(resolve('.'), output)).rejects.toThrow(
      /missing asset/,
    );
  });

  it('refuses a published catalog that differs from the committed ledger output', async () => {
    const output = await deployableSite();
    const published = JSON.parse(
      await readFile(join(output, 'published.json'), 'utf8'),
    );
    const catalog = JSON.parse(
      await readFile(join(output, 'catalog.json'), 'utf8'),
    );
    published.skills = [catalog.skills[0]];
    await writeFile(
      join(output, 'published.json'),
      JSON.stringify(published, null, 2) + '\n',
    );
    await expect(verifyPagesOutput(resolve('.'), output)).rejects.toThrow(
      /published.json: differs from committed/,
    );
  });

  it('requires direct-load pages and per-skill detail data for every skill', async () => {
    const output = await deployableSite();
    const catalog = discoveryCatalogSchema.parse(
      JSON.parse(await readFile(resolve('catalog/catalog.json'), 'utf8')),
    );
    const id = catalog.skills[0].id;
    await rm(join(output, `data/skills/${id}.json`));
    await expect(verifyPagesOutput(resolve('.'), output)).rejects.toThrow(
      /missing or stale browser data/,
    );
    const second = await deployableSite();
    await rm(join(second, `skills/${id}/index.html`));
    await expect(verifyPagesOutput(resolve('.'), second)).rejects.toThrow(
      /missing from Pages output/,
    );
  });

  it.each([
    'assets/app.js.map',
    '.env',
    'docs/owner-decision/RELEASE_AUTHORIZATION.md',
    'PROVENANCE_INVENTORY.json',
  ])('rejects internal or development file %s', async (path) => {
    const output = await deployableSite();
    await mkdir(join(output, path, '..'), { recursive: true });
    await writeFile(join(output, path), '');
    await expect(verifyPagesOutput(resolve('.'), output)).rejects.toThrow(
      /internal or development file/,
    );
  });

  it('stamps the exact deployed commit and rejects malformed identifiers', async () => {
    const output = await deployableSite();
    const commit = 'a'.repeat(40);
    await stampPagesVersion(output, {
      commit,
      ciRunId: '123',
      pagesRunId: '456',
    });
    expect(
      JSON.parse(await readFile(join(output, 'version.json'), 'utf8')),
    ).toEqual({ schemaVersion: 1, commit, ciRunId: '123', pagesRunId: '456' });
    await expect(verifyPagesOutput(resolve('.'), output)).resolves.toBeTruthy();
    for (const stamp of [
      { commit: 'abc', ciRunId: '1', pagesRunId: '2' },
      { commit: 'A'.repeat(40), ciRunId: '1', pagesRunId: '2' },
      { commit, ciRunId: '', pagesRunId: '2' },
      { commit, ciRunId: '1', pagesRunId: '2"x' },
    ])
      await expect(stampPagesVersion(output, stamp)).rejects.toThrow();
  });
});
