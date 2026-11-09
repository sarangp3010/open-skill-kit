import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync, type Zippable } from 'fflate';
import {
  marketplaceSchema,
  sectorsSchema,
} from '../packages/skill-schema/src/index';
import {
  buildCatalog,
  readSkillFiles,
} from '../packages/catalog-indexer/src/index';

const repository = fileURLToPath(new URL('../', import.meta.url));
export async function buildMarketplace(
  root = repository,
  output = join(root, 'apps/web/public'),
) {
  const sectors = sectorsSchema.parse(
    JSON.parse(await readFile(join(root, 'catalog/sectors.json'), 'utf8')),
  );
  const { catalog, warnings, validated } = await buildCatalog(
    join(root, 'skills'),
    { includeDrafts: true },
  );
  const entries = await Promise.all(
    catalog.skills.map(async (entry) => ({
      ...entry,
      content: await readSkillFiles(join(root, 'skills', entry.metadata.id)),
      archive: `downloads/${entry.metadata.slug}.zip`,
    })),
  );
  const result = marketplaceSchema.parse({
    schemaVersion: 1,
    sectors,
    skills: entries,
  });
  await mkdir(output, { recursive: true });
  await rm(join(output, 'downloads'), { recursive: true, force: true });
  await mkdir(join(output, 'downloads'), { recursive: true });
  for (const entry of result.skills) {
    const archive: Zippable = {};
    for (const [path, text] of Object.entries(entry.content).sort(([a], [b]) =>
      a.localeCompare(b, 'en'),
    )) {
      archive[`${entry.metadata.slug}/${path}`] = [
        strToU8(text),
        { mtime: new Date(2020, 0, 1) },
      ];
    }
    await writeFile(join(output, entry.archive), zipSync(archive));
  }
  await writeFile(
    join(output, 'catalog.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
  return { marketplace: result, warnings, validated };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { marketplace, validated, warnings } = await buildMarketplace();
  warnings.forEach((warning) => console.warn(warning));
  console.log(
    `Marketplace: ${validated} validated packages, ${marketplace.skills.length} visible skills, ${marketplace.sectors.length} sectors.`,
  );
}
