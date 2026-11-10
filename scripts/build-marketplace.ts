import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { regenerateCatalog } from './catalog';
import { createSkillZip } from '../apps/web/src/lib/download';
const repository = fileURLToPath(new URL('../', import.meta.url));
/** Legacy entry point delegates to the canonical moderated catalog pipeline. */
export async function buildMarketplace(
  root = repository,
  output = join(root, 'apps/web/public'),
) {
  const result = await regenerateCatalog(root);
  await mkdir(output, { recursive: true });
  await rm(join(output, 'downloads'), { recursive: true, force: true });
  await mkdir(join(output, 'downloads'), { recursive: true });
  // Static download artifacts are approved-only. Labeled source previews retain
  // their existing browser-local ZIP flow and stable URLs.
  for (const skill of result.published.skills)
    await writeFile(
      join(output, 'downloads', `${skill.slug}.zip`),
      createSkillZip(skill),
    );
  await writeFile(
    join(output, 'catalog.json'),
    JSON.stringify(result.catalog, null, 2) + '\n',
  );
  await writeFile(
    join(output, 'published.json'),
    JSON.stringify(result.published, null, 2) + '\n',
  );
  return {
    marketplace: result.catalog,
    published: result.published,
    warnings: result.warnings,
    validated: result.validated,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await buildMarketplace();
  console.log(
    `Marketplace: ${result.validated} source packages, ${result.published.skills.length} approved static downloads. No publication performed.`,
  );
}
