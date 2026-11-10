import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateCatalog,
  readEvaluationReports,
  readAttributions,
  readPublicationRegistry,
  publishedCatalog,
} from '../packages/catalog-indexer/src/index';
import { sectorsSchema } from '../packages/skill-schema/src/index';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
export async function regenerateCatalog(
  root = repositoryRoot,
  options: {
    validateOnly?: boolean;
    check?: boolean;
    checkPublic?: boolean;
  } = {},
) {
  const sectors = sectorsSchema.parse(
    JSON.parse(await readFile(join(root, 'catalog/sectors.json'), 'utf8')),
  );
  const evaluationReports = await readEvaluationReports(
    join(root, 'evaluations/reports'),
  );
  const result = await generateCatalog(join(root, 'skills'), sectors, {
    evaluationReports,
    attributions: await readAttributions(root),
  });
  const serialized = JSON.stringify(result.catalog, null, 2) + '\n';
  const published = publishedCatalog(
    result.catalog,
    await readPublicationRegistry(root),
  );
  const approved = JSON.stringify(published, null, 2) + '\n';
  const outputs = [
    'catalog/catalog.json',
    ...(!options.check || options.checkPublic
      ? ['apps/web/public/catalog.json']
      : []),
  ];
  const publishedOutputs = [
    'catalog/published.json',
    ...(!options.check || options.checkPublic
      ? ['apps/web/public/published.json']
      : []),
  ];
  for (const path of publishedOutputs) {
    if (options.check) {
      if ((await readFile(join(root, path), 'utf8')) !== approved)
        throw new Error(
          `${path}: stale published catalog; run pnpm skills:index`,
        );
    } else if (!options.validateOnly) {
      await mkdir(join(root, path.slice(0, path.lastIndexOf('/'))), {
        recursive: true,
      });
      await writeFile(join(root, path), approved);
    }
  }
  if (options.check) {
    for (const path of outputs) {
      let actual: string;
      try {
        actual = await readFile(join(root, path), 'utf8');
      } catch {
        throw new Error(
          `${path}: missing generated catalog; run pnpm skills:index`,
        );
      }
      if (actual !== serialized)
        throw new Error(
          `${path}: stale generated catalog; run pnpm skills:index`,
        );
    }
  } else if (!options.validateOnly) {
    for (const path of outputs) {
      const directory = path.slice(0, path.lastIndexOf('/'));
      await mkdir(join(root, directory), { recursive: true });
      await writeFile(join(root, path), serialized);
    }
  }
  return { ...result, published };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (
      args.some(
        (arg) => !['--validate', '--check', '--check-public'].includes(arg),
      )
    )
      throw new Error(
        'Usage: catalog.ts [--validate | --check | --check-public]',
      );
    const { catalog, warnings, validated } = await regenerateCatalog(
      repositoryRoot,
      {
        validateOnly: args.includes('--validate'),
        check: args.includes('--check') || args.includes('--check-public'),
        checkPublic: args.includes('--check-public'),
      },
    );
    warnings.forEach((warning) => console.warn(warning));
    console.log(
      `Validated ${validated} packages; ${catalog.skills.length} catalog entries. Drafts remain labeled; no publication is implied.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
