import type { Sector } from '@uas/skill-schema';
/** Route metadata needs identities and summaries only; full catalogs also satisfy it. */
export type MetadataCatalog = {
  sectors: Sector[];
  skills: {
    id: string;
    sector: string;
    title: string;
    description: string;
    status: string;
    license: string | null;
  }[];
};
export const REPOSITORY_URL = 'https://github.com/sarangp3010/open-skill-kit';
export const DEFAULT_SITE_URL = 'https://sarangp3010.github.io/open-skill-kit/';
export function siteAddress(value = DEFAULT_SITE_URL) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/(?:[a-z0-9-]+\/)*$/.test(url.pathname)
  )
    throw new Error(
      'Site URL must be an HTTPS directory URL without credentials, query or fragment',
    );
  return url.href;
}
export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  type: string;
  structured: Record<string, unknown>;
}
export function pageMetadata(
  catalog: MetadataCatalog,
  pathname: string,
  site = DEFAULT_SITE_URL,
): PageMetadata {
  const base = siteAddress(site),
    path = pathname.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  const fixed: Record<string, [string, string]> = {
    '': [
      'Open Skill Kit — Portable AI skills',
      'Explore portable SKILL.md workflows by industry. Read draft instructions, inspect examples and download complete packages without accounts or paid APIs.',
    ],
    skills: [
      'Browse AI skills — Open Skill Kit',
      'Search portable AI workflows by task, sector and specialty. Inspect structural quality, limits and actual evidence before use.',
    ],
    sectors: [
      'AI skills by industry — Open Skill Kit',
      'Explore broad sectors and specialized collections. Available draft packages and planned specialties are labeled separately.',
    ],
    docs: [
      'Install and use skills — Open Skill Kit',
      'Learn how to inspect, download and install portable skill packages for Codex, Claude Code, Cursor and Gemini CLI.',
    ],
    create: [
      'Create a skill proposal — Open Skill Kit',
      'Create, validate, preview and export a draft locally. Publication requires authorized maintainer approval and merge.',
    ],
    published: [
      'Published skills — Open Skill Kit',
      'Only explicitly approved skill packages appear in the published catalog after maintainer review and merge.',
    ],
    contribute: [
      'Submit a skill — Open Skill Kit',
      'Create a focused skill from the template, validate locally and submit a GitHub pull request for human review.',
    ],
    about: [
      'About Open Skill Kit',
      'An open-source, static-first library of portable AI workflows. Learn about licensing, provenance and the limits of compatibility claims.',
    ],
  };
  const skill = catalog.skills.find((item) => path === `skills/${item.id}`);
  const sector = catalog.sectors.find(
    (item) => path === `sectors/${item.slug}`,
  );
  const fixedEntry = Object.hasOwn(fixed, path) ? fixed[path] : undefined;
  const known = !!fixedEntry || !!skill || !!sector;
  const canonicalPath = !known
    ? '404'
    : sector?.aliasOf
      ? `sectors/${sector.aliasOf}`
      : path;
  const canonical = new URL(canonicalPath ? `${canonicalPath}/` : '', base)
    .href;
  const title = skill
    ? `${skill.title} — Open Skill Kit`
    : sector
      ? `${sector.title} skills — Open Skill Kit`
      : (fixedEntry?.[0] ?? 'Page not found — Open Skill Kit');
  const description = (
    skill
      ? `${skill.status === 'draft' ? 'Draft workflow. ' : ''}${skill.description}`
      : sector
        ? `${sector.description} ${sector.skillCount ?? catalog.skills.filter((item) => item.sector === sector.slug).length} available packages.`
        : (fixedEntry?.[1] ?? 'This page is not in the Open Skill Kit catalog.')
  ).slice(0, 250);
  const robots =
    path === 'create'
      ? 'noindex, follow'
      : !known
        ? 'noindex, nofollow'
        : sector?.availability === 'planned'
          ? 'noindex, follow'
          : 'index, follow';
  const type = skill ? 'article' : 'website';
  const structured: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': skill
      ? 'CreativeWork'
      : path === ''
        ? 'WebSite'
        : 'CollectionPage',
    name: skill?.title ?? sector?.title ?? title,
    description,
    url: canonical,
    inLanguage: 'en',
    isAccessibleForFree: true,
    ...(skill
      ? {
          creativeWorkStatus: skill.status,
          ...(skill.license === 'MIT'
            ? { license: `${REPOSITORY_URL}/blob/main/LICENSE` }
            : {}),
        }
      : {}),
  };
  return { title, description, canonical, robots, type, structured };
}
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
export const safeJson = (value: unknown) =>
  JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
export function metadataHtml(meta: PageMetadata) {
  const tags: Record<string, string> = {
    description: meta.description,
    robots: meta.robots,
    'og:title': meta.title,
    'og:description': meta.description,
    'og:url': meta.canonical,
    'og:type': meta.type,
    'og:site_name': 'Open Skill Kit',
    'twitter:card': 'summary',
    'twitter:title': meta.title,
    'twitter:description': meta.description,
  };
  return `<title>${escapeHtml(meta.title)}</title>\n<link rel="canonical" href="${escapeHtml(meta.canonical)}">\n${Object.entries(
    tags,
  )
    .map(
      ([key, value]) =>
        `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}">`,
    )
    .join(
      '\n',
    )}\n<script id="page-structured-data" type="application/ld+json">${safeJson(meta.structured)}</script>`;
}
/** Update existing tags on client-side navigation without requiring server routing. */
export function applyMetadata(meta: PageMetadata, doc: Document = document) {
  doc.title = meta.title;
  for (const [key, value] of Object.entries({
    description: meta.description,
    robots: meta.robots,
    'og:title': meta.title,
    'og:description': meta.description,
    'og:url': meta.canonical,
    'og:type': meta.type,
    'og:site_name': 'Open Skill Kit',
    'twitter:card': 'summary',
    'twitter:title': meta.title,
    'twitter:description': meta.description,
  })) {
    const attribute = key.startsWith('og:') ? 'property' : 'name';
    const tag =
      doc.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`) ??
      doc.createElement('meta');
    tag.setAttribute(attribute, key);
    tag.content = value;
    doc.head.append(tag);
  }
  const canonical =
    doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ??
    doc.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = meta.canonical;
  doc.head.append(canonical);
  const structured =
    doc.getElementById('page-structured-data') ?? doc.createElement('script');
  structured.id = 'page-structured-data';
  structured.setAttribute('type', 'application/ld+json');
  structured.textContent = safeJson(meta.structured);
  doc.head.append(structured);
}
