import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateCatalog,
  readEvaluationReports,
  readAttributions,
  readPublicationRegistry,
  publishedCatalog,
  webArtifacts,
  WEB_DATA_DIRECTORY,
} from '../packages/catalog-indexer/src/index';
import { sectorsSchema } from '../packages/skill-schema/src/index';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const WEB_PUBLIC = 'apps/web/public';
const ARTIFACT_PATH = /^data\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.json$/;
/**
 * The generated data directory and every ancestor below the repository root
 * must be real directories (or absent). Symlinks and other path types are
 * refused, so replacement can never reach outside apps/web/public/data.
 */
export async function assertGeneratedDataDirectory(root: string) {
  const segments = [...WEB_PUBLIC.split('/'), WEB_DATA_DIRECTORY];
  for (let depth = 1; depth <= segments.length; depth++) {
    const relativePath = segments.slice(0, depth).join('/');
    let info;
    try {
      info = await lstat(join(root, relativePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    if (info.isSymbolicLink() || !info.isDirectory())
      throw new Error(
        `${relativePath}: generated data path must be a real directory, not a symlink or file; refusing to modify it`,
      );
  }
}
async function listFiles(directory: string): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const files: string[] = [];
  for (const name of names.sort()) {
    const path = join(directory, name);
    const info = await lstat(path);
    if (info.isDirectory()) files.push(...(await listFiles(path)));
    else if (info.isFile()) files.push(path);
    else throw new Error(`${path}: generated artifacts must be regular files`);
  }
  return files;
}
/** Byte-exact freshness for browser data, including orphaned or unexpected files. */
async function checkWebArtifacts(root: string, artifacts: [string, string][]) {
  await assertGeneratedDataDirectory(root);
  const expected = new Map(artifacts);
  const directory = join(root, WEB_PUBLIC, WEB_DATA_DIRECTORY);
  for (const file of await listFiles(directory)) {
    const path = relative(join(root, WEB_PUBLIC), file).split(sep).join('/');
    if (!expected.has(path))
      throw new Error(
        `${WEB_PUBLIC}/${path}: unexpected generated artifact; run pnpm skills:index`,
      );
  }
  for (const [path, content] of artifacts) {
    let actual: string;
    try {
      actual = await readFile(join(root, WEB_PUBLIC, path), 'utf8');
    } catch {
      throw new Error(
        `${WEB_PUBLIC}/${path}: missing generated artifact; run pnpm skills:index`,
      );
    }
    if (actual !== content)
      throw new Error(
        `${WEB_PUBLIC}/${path}: stale generated artifact; run pnpm skills:index`,
      );
  }
}
async function writeWebArtifacts(root: string, artifacts: [string, string][]) {
  for (const [path] of artifacts)
    if (!ARTIFACT_PATH.test(path))
      throw new Error(`${path}: unsafe generated artifact path`);
  await assertGeneratedDataDirectory(root);
  // The data directory is wholly generated; replace it so removed skills leave
  // no orphans. rm removes nested symlinks themselves, never their targets.
  await rm(join(root, WEB_PUBLIC, WEB_DATA_DIRECTORY), {
    recursive: true,
    force: true,
  });
  for (const [path, content] of artifacts) {
    const target = join(root, WEB_PUBLIC, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}
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
  const web = webArtifacts(serialized);
  // Refuse unsafe public paths before writing anything in this run.
  if (!options.check && !options.validateOnly)
    await assertGeneratedDataDirectory(root);
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
    if (options.checkPublic) await checkWebArtifacts(root, web.artifacts);
  } else if (!options.validateOnly) {
    for (const path of outputs) {
      const directory = path.slice(0, path.lastIndexOf('/'));
      await mkdir(join(root, directory), { recursive: true });
      await writeFile(join(root, path), serialized);
    }
    await writeWebArtifacts(root, web.artifacts);
  }
  return { ...result, published, web };
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
