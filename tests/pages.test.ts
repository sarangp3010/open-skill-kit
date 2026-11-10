import { afterEach, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pageMetadata, escapeHtml } from '../apps/web/src/lib/site-metadata';
import { preparePages, renderStaticPage } from '../scripts/prepare-pages';
import { discoveryCatalogSchema } from '../packages/skill-schema/src/index';

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
