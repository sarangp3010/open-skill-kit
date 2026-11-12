import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  discoveryCatalogSchema,
  type DiscoveryCatalog,
} from '../packages/skill-schema/src/index';
import {
  DEFAULT_SITE_URL,
  REPOSITORY_URL,
  escapeHtml,
  metadataHtml,
  pageMetadata,
  siteAddress,
} from '../apps/web/src/lib/site-metadata';

export function renderStaticPage(
  html: string,
  catalog: DiscoveryCatalog,
  path: string,
  site: string,
) {
  const metadata = pageMetadata(catalog, path, site);
  const marker = /<!-- osh:metadata:start -->[\s\S]*?<!-- osh:metadata:end -->/;
  if (!marker.test(html))
    throw new Error('Static HTML metadata markers are missing');
  let result = html.replace(
    marker,
    () =>
      `<!-- osh:metadata:start -->\n${metadataHtml(metadata)}\n<!-- osh:metadata:end -->`,
  );
  result = result.replace(
    /<!-- osh:fallback:start -->[\s\S]*?<!-- osh:fallback:end -->/,
    '',
  );
  const links =
    path === 'skills'
      ? catalog.skills.map((skill) => ({
          label: skill.title,
          path: `skills/${skill.id}`,
        }))
      : path === 'sectors'
        ? catalog.sectors
            .filter((sector) => !sector.aliasOf)
            .map((sector) => ({
              label: sector.title,
              path: `sectors/${sector.slug}`,
            }))
        : [
            { label: 'Browse skills', path: 'skills' },
            { label: 'Browse sectors', path: 'sectors' },
            { label: 'Submit a skill', path: 'contribute' },
          ];
  const fallback = `<!-- osh:fallback:start --><noscript><main><h1>${escapeHtml(metadata.title)}</h1><p>${escapeHtml(metadata.description)}</p><p>Enable JavaScript for search, Markdown previews and ZIP downloads. Portable source packages are also available on GitHub.</p><p><a href="${REPOSITORY_URL}/tree/main/skills">Browse source packages on GitHub</a></p><ul>${links.map((link) => `<li><a href="${escapeHtml(new URL(link.path + '/', site).href)}">${escapeHtml(link.label)}</a></li>`).join('')}</ul></main></noscript><!-- osh:fallback:end -->`;
  result = result.replace('</body>', () => `${fallback}\n</body>`);
  return result;
}
export async function preparePages(
  outputDirectory: string,
  options: { siteUrl?: string } = {},
) {
  const output = resolve(outputDirectory),
    site = siteAddress(
      options.siteUrl ?? process.env.VITE_SITE_URL ?? DEFAULT_SITE_URL,
    );
  const html = await readFile(join(output, 'index.html'), 'utf8');
  const catalog = discoveryCatalogSchema.parse(
    JSON.parse(await readFile(join(output, 'catalog.json'), 'utf8')),
  );
  const routes = new Set([
    'skills',
    'sectors',
    'docs',
    'contribute',
    'about',
    'create',
    'published',
    ...catalog.sectors.map((sector) => `sectors/${sector.slug}`),
    ...catalog.skills.map((skill) => `skills/${skill.sector}/${skill.slug}`),
  ]);
  for (const route of routes)
    if (
      !route.split('/').every((part) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))
    )
      throw new Error(`Unsafe Pages route: ${route}`);
  // Compute every page before writing; metadata/data are never executed.
  const pages = [...routes].map((route) => ({
    route,
    html: renderStaticPage(html, catalog, route, site),
  }));
  for (const page of pages) {
    const directory = join(output, page.route);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), page.html);
  }
  await writeFile(
    join(output, 'index.html'),
    renderStaticPage(html, catalog, '', site),
  );
  await writeFile(
    join(output, '404.html'),
    renderStaticPage(html, catalog, '404', site),
  );
  await writeFile(join(output, '.nojekyll'), '');
  const indexed = ['', ...routes].filter((route) => {
    const meta = pageMetadata(catalog, route, site);
    return (
      meta.robots === 'index, follow' &&
      meta.canonical === new URL(route ? route + '/' : '', site).href
    );
  });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed.map((route) => `  <url><loc>${escapeHtml(new URL(route ? route + '/' : '', site).href)}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(join(output, 'sitemap.xml'), sitemap);
  await writeFile(
    join(output, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', site).href}\n`,
  );
  return routes.size;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(
      `Prepared ${await preparePages(fileURLToPath(new URL('../apps/web/dist/', import.meta.url)))} static route entries with SEO metadata.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
