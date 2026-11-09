import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoveryCatalogSchema } from '../packages/skill-schema/src/index';

export async function preparePages(outputDirectory: string) {
  const output = resolve(outputDirectory);
  const html = await readFile(join(output, 'index.html'), 'utf8');
  const catalog = discoveryCatalogSchema.parse(
    JSON.parse(await readFile(join(output, 'catalog.json'), 'utf8')),
  );
  // Pages has no SPA rewrite rules. Give each known route a physical entry
  // point so direct links and refreshes return a real HTML page.
  const routes = new Set([
    'skills',
    'sectors',
    'docs',
    'contribute',
    'about',
    ...catalog.sectors.map((sector) => `sectors/${sector.slug}`),
    ...catalog.skills.map((skill) => `skills/${skill.sector}/${skill.slug}`),
  ]);
  // Validate every output before writing any route, including future schema
  // changes. Generated catalog content must never escape the build directory.
  for (const route of routes) {
    if (
      !route.split('/').every((part) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))
    )
      throw new Error(`Unsafe Pages route: ${route}`);
  }
  for (const route of routes) {
    const directory = join(output, route);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), html);
  }
  await writeFile(join(output, '404.html'), html);
  await writeFile(join(output, '.nojekyll'), '');
  return routes.size;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const output = fileURLToPath(new URL('../apps/web/dist/', import.meta.url));
  try {
    const count = await preparePages(output);
    console.log(`Prepared ${count} static route entries for GitHub Pages.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
