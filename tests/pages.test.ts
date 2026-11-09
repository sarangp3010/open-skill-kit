import { afterEach, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { preparePages } from '../scripts/prepare-pages';
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
    '<html><script type="module" src="/open-skill-kit/assets/app.js"></script></html>';
  await writeFile(join(output, 'index.html'), html);
  await writeFile(join(output, 'catalog.json'), JSON.stringify(catalog));
  return { output, catalog, html };
}
it('creates direct-load entry points for every generated skill and sector without changing assets', async () => {
  const { output, catalog, html } = await fixture();
  const catalogBefore = await readFile(join(output, 'catalog.json'), 'utf8');
  expect(await preparePages(output)).toBe(
    5 + catalog.sectors.length + catalog.skills.length,
  );
  const routes = [
    'skills',
    'sectors',
    'docs',
    'contribute',
    'about',
    ...catalog.sectors.map((sector) => `sectors/${sector.slug}`),
    ...catalog.skills.map((skill) => `skills/${skill.sector}/${skill.slug}`),
  ];
  for (const route of routes)
    expect(await readFile(join(output, route, 'index.html'), 'utf8')).toBe(
      html,
    );
  expect(await readFile(join(output, '404.html'), 'utf8')).toBe(html);
  expect(await readFile(join(output, '.nojekyll'), 'utf8')).toBe('');
  expect(await readFile(join(output, 'index.html'), 'utf8')).toBe(html);
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
