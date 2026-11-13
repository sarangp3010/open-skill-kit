import { lstat, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webArtifacts } from '../packages/catalog-indexer/src/index';
import { discoveryCatalogSchema } from '../packages/skill-schema/src/index';

export const PAGES_BASE_PATH = '/open-skill-kit/';
export const VERSION_FILE = 'version.json';
const COMMIT = /^[0-9a-f]{40}$/;
const RUN_ID = /^[1-9][0-9]{0,19}$/;
/** Generated outputs never carry source maps, environment files or owner evidence. */
const FORBIDDEN =
  /(?:^|\/)\.(?!nojekyll$)|\.map$|owner-decision|PROVENANCE|publication-reviews|maintainers\.json|attributions\.json/i;

async function listFiles(directory: string, root = directory) {
  const files: string[] = [];
  for (const name of (await readdir(directory)).sort()) {
    const path = join(directory, name);
    const info = await lstat(path);
    if (info.isSymbolicLink())
      throw new Error(
        `${relative(root, path)}: symlinks are not deployable output`,
      );
    if (info.isDirectory()) files.push(...(await listFiles(path, root)));
    else if (info.isFile())
      files.push(relative(root, path).split(sep).join('/'));
    else throw new Error(`${relative(root, path)}: unsupported entry type`);
  }
  return files;
}

/**
 * Read-only check that a built site works under the GitHub Pages project path,
 * mirrors the committed catalogs exactly (so a build can never widen what is
 * published) and contains no internal evidence.
 */
export async function verifyPagesOutput(
  root: string,
  output: string,
  options: { base?: string } = {},
) {
  const base = options.base ?? PAGES_BASE_PATH;
  if (!/^\/(?:[a-z0-9-]+\/)*$/.test(base))
    throw new Error(`${base}: base path must be an absolute directory path`);
  const files = await listFiles(output);
  const present = new Set(files);
  for (const file of files)
    if (FORBIDDEN.test(file))
      throw new Error(`${file}: internal or development file in Pages output`);

  for (const name of ['catalog.json', 'published.json']) {
    const built = await readFile(join(output, name), 'utf8').catch(() => {
      throw new Error(`${name}: missing from Pages output`);
    });
    if (built !== (await readFile(join(root, 'catalog', name), 'utf8')))
      throw new Error(
        `${name}: differs from committed catalog/${name}; deploy only the committed, moderated catalog`,
      );
  }
  const serialized = await readFile(join(root, 'catalog/catalog.json'), 'utf8');
  const catalog = discoveryCatalogSchema.parse(JSON.parse(serialized));
  const expected = new Map(webArtifacts(serialized).artifacts);
  for (const file of files)
    if (file.startsWith('data/') && !expected.has(file))
      throw new Error(`${file}: unexpected browser data artifact`);
  for (const [path, content] of expected)
    if (
      (await readFile(join(output, path), 'utf8').catch(() => '')) !== content
    )
      throw new Error(`${path}: missing or stale browser data artifact`);

  const routes = [
    '',
    'skills/',
    'sectors/',
    'published/',
    ...catalog.skills.map((skill) => `skills/${skill.id}/`),
  ];
  for (const required of [
    ...routes.map((route) => `${route}index.html`),
    '404.html',
    'robots.txt',
    'sitemap.xml',
    'LICENSE.txt',
    'THIRD_PARTY_NOTICES.txt',
  ])
    if (!present.has(required))
      throw new Error(`${required}: missing from Pages output`);

  let pages = 0;
  for (const file of files.filter((name) => name.endsWith('.html'))) {
    const html = await readFile(join(output, file), 'utf8');
    for (const [, url] of html.matchAll(/\b(?:src|href)="([^"]*)"/g)) {
      if (!url.startsWith('/') || url.startsWith('//')) continue;
      if (!url.startsWith(base))
        throw new Error(
          `${file}: ${url} is outside the Pages base path ${base}`,
        );
      const target = url.slice(base.length).split(/[?#]/)[0];
      if (target.startsWith('assets/') && !present.has(target))
        throw new Error(`${file}: ${url} references a missing asset`);
    }
    if (!html.includes(`src="${base}assets/`))
      throw new Error(`${file}: application script is not under ${base}`);
    pages++;
  }
  const published = JSON.parse(
    await readFile(join(output, 'published.json'), 'utf8'),
  ) as { skills: unknown[] };
  return {
    files: files.length,
    pages,
    skills: catalog.skills.length,
    published: published.skills.length,
  };
}

/** Records which commit and runs produced the deployed site. */
export async function stampPagesVersion(
  output: string,
  stamp: { commit: string; ciRunId: string; pagesRunId: string },
) {
  if (!COMMIT.test(stamp.commit))
    throw new Error('Deploy commit must be a full 40-character Git SHA');
  if (!RUN_ID.test(stamp.ciRunId) || !RUN_ID.test(stamp.pagesRunId))
    throw new Error('Workflow run identifiers must be numeric');
  const content =
    JSON.stringify(
      {
        schemaVersion: 1,
        commit: stamp.commit,
        ciRunId: stamp.ciRunId,
        pagesRunId: stamp.pagesRunId,
      },
      null,
      2,
    ) + '\n';
  await writeFile(join(output, VERSION_FILE), content);
  return content;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== '--stamp'))
      throw new Error('Usage: verify-pages.ts [--stamp]');
    const root = fileURLToPath(new URL('../', import.meta.url));
    const output = join(root, 'apps/web/dist');
    if (args.includes('--stamp'))
      await stampPagesVersion(output, {
        commit: process.env.DEPLOY_COMMIT ?? '',
        ciRunId: process.env.CI_RUN_ID ?? '',
        pagesRunId: process.env.GITHUB_RUN_ID ?? '',
      });
    const result = await verifyPagesOutput(root, output, {
      base: process.env.VITE_BASE_PATH || PAGES_BASE_PATH,
    });
    console.log(
      `Verified ${result.pages} HTML entry points and ${result.files} files under the Pages base path; ${result.skills} catalog entries, ${result.published} published. No deployment performed.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
