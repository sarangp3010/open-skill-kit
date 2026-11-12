import {
  catalogIndexSchema,
  catalogSearchSchema,
  discoveryCatalogSchema,
  skillDetailSchema,
  slugSchema,
  normalizeSearchText,
  matchesSector,
  canonicalSector,
  type CatalogIndex,
  type DiscoveryCatalog,
  type DiscoverySkill,
  type IndexSkill,
  type Sector,
} from '@uas/skill-schema';
export type {
  CatalogIndex,
  DiscoveryCatalog,
  DiscoverySkill,
  IndexSkill,
  Sector,
};
/** Anything browsable: the generated index or a full catalog such as published.json. */
export type BrowseCatalog = { sectors: Sector[]; skills: IndexSkill[] };
/** Normalized full-text search content keyed by skill id. */
export type SearchEntries = Record<string, string>;
export const PAGE_SIZE = 24;
export const INVALID_FORMAT =
  'The skill catalog has an invalid format. Please rebuild it.';
export const CATALOG_UPDATED =
  'The skill library was updated while this page was open. Reload the page to continue.';
export class CatalogMismatchError extends Error {}

async function fetchJson(path: string, failure: string, signal?: AbortSignal) {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`, {
    signal,
  });
  if (!response.ok) throw new Error(failure);
  return response.json();
}

/** Lightweight browse index loaded on start-up; never includes file contents. */
export async function loadCatalogIndex(
  signal?: AbortSignal,
): Promise<CatalogIndex> {
  const result = catalogIndexSchema.safeParse(
    await fetchJson(
      'data/index.json',
      'The skill catalog could not be loaded.',
      signal,
    ),
  );
  if (!result.success) throw new Error(INVALID_FORMAT);
  return result.data;
}

/** The separate approved-publication artifact. It never falls back to drafts. */
export async function loadPublishedCatalog(
  signal?: AbortSignal,
): Promise<DiscoveryCatalog> {
  const result = discoveryCatalogSchema.safeParse(
    await fetchJson(
      'published.json',
      'The skill catalog could not be loaded.',
      signal,
    ),
  );
  if (!result.success) throw new Error(INVALID_FORMAT);
  return result.data;
}

// One shared request per catalog digest; failures are evicted so retry works.
const searchRequests = new Map<string, Promise<SearchEntries>>();
const detailRequests = new Map<string, Promise<DiscoverySkill>>();
function remember<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
) {
  const cached = cache.get(key);
  if (cached) return cached;
  const request = load();
  cache.set(key, request);
  request.catch(() => {
    if (cache.get(key) === request) cache.delete(key);
  });
  return request;
}
export function clearCatalogRequests() {
  searchRequests.clear();
  detailRequests.clear();
}

export function loadSearchEntries(catalogDigest: string) {
  return remember(searchRequests, catalogDigest, async () => {
    const result = catalogSearchSchema.safeParse(
      await fetchJson(
        'data/search.json',
        'Full-text search could not be loaded.',
      ),
    );
    if (!result.success)
      throw new Error(
        'The search index has an invalid format. Please rebuild it.',
      );
    if (result.data.catalogDigest !== catalogDigest)
      throw new CatalogMismatchError(CATALOG_UPDATED);
    return result.data.entries;
  });
}

export function loadSkillDetail(
  catalogDigest: string,
  skill: { id: string; sector: string; slug: string },
) {
  return remember(detailRequests, `${catalogDigest}:${skill.id}`, async () => {
    if (
      !slugSchema.safeParse(skill.sector).success ||
      !slugSchema.safeParse(skill.slug).success
    )
      throw new Error('This skill address is not valid.');
    const result = skillDetailSchema.safeParse(
      await fetchJson(
        `data/skills/${skill.sector}/${skill.slug}.json`,
        'The skill details could not be loaded.',
      ),
    );
    if (!result.success || result.data.skill.id !== skill.id)
      throw new Error(
        'The skill details have an invalid format. Please rebuild the catalog.',
      );
    if (result.data.catalogDigest !== catalogDigest)
      throw new CatalogMismatchError(CATALOG_UPDATED);
    return result.data.skill;
  });
}

/** Search entries for a full catalog that already contains skill bodies. */
export function bodySearchEntries(
  skills: { id: string; body: string }[],
): SearchEntries {
  return Object.fromEntries(
    skills.map((skill) => [skill.id, normalizeSearchText(skill.body)]),
  );
}

export type CatalogFilters = {
  query?: string;
  sector?: string;
  broadSector?: string;
  sort?: string;
  capability?: string;
  difficulty?: string;
  status?: string;
  minQuality?: number;
  platform?: string;
  testing?: string;
  validation?: string;
};
export function searchTerms(query = '') {
  return normalizeSearchText(query).split(' ').filter(Boolean);
}

const metadataText = new WeakMap<IndexSkill, string>();
function skillText(catalog: BrowseCatalog, skill: IndexSkill) {
  let text = metadataText.get(skill);
  if (text === undefined) {
    const sector = catalog.sectors.find((item) => item.slug === skill.sector);
    const canonicalSlug = canonicalSector(catalog.sectors, skill.sector);
    const canonical = catalog.sectors.find(
      (item) => item.slug === canonicalSlug,
    );
    const parent = catalog.sectors.find(
      (item) => item.slug === (canonical?.parent ?? ''),
    );
    text = normalizeSearchText(
      `${skill.title} ${skill.description} ${skill.tags.join(' ')} ${sector?.title ?? ''} ${sector?.aliases.join(' ') ?? ''} ${canonical?.title ?? ''} ${parent?.title ?? ''} ${parent?.aliases.join(' ') ?? ''}`,
    );
    metadataText.set(skill, text);
  }
  return text;
}

// Full catalogs (for example published.json) carry their own bodies.
const bodyText = new WeakMap<IndexSkill, string>();
function ownBodyText(skill: IndexSkill) {
  let text = bodyText.get(skill);
  if (text === undefined) {
    const body = (skill as { body?: unknown }).body;
    text = typeof body === 'string' ? normalizeSearchText(body) : '';
    bodyText.set(skill, text);
  }
  return text;
}
function matches(
  catalog: BrowseCatalog,
  skill: IndexSkill,
  options: CatalogFilters,
  terms: string[],
  entries: SearchEntries | undefined,
) {
  if (
    options.sector &&
    !matchesSector(catalog.sectors, skill.sector, options.sector)
  )
    return false;
  if (
    options.broadSector &&
    !matchesSector(catalog.sectors, skill.sector, options.broadSector)
  )
    return false;
  if (options.capability && !skill.capabilities.includes(options.capability))
    return false;
  if (options.difficulty && skill.difficulty !== options.difficulty)
    return false;
  if (options.status && skill.status !== options.status) return false;
  if (options.minQuality && (skill.quality?.score ?? -1) < options.minQuality)
    return false;
  if (
    options.validation &&
    (skill.validation?.status ?? 'not-assessed') !== options.validation
  )
    return false;
  const rows = (skill.compatibility ?? []).filter(
    (row) => !options.platform || row.platform === options.platform,
  );
  if (
    options.platform &&
    !rows.some((row) => row.installation === 'documented')
  )
    return false;
  if (
    options.testing === 'not-recorded' &&
    (!rows.length || rows.some((row) => row.testing !== 'not-recorded'))
  )
    return false;
  if (
    options.testing &&
    options.testing !== 'not-recorded' &&
    !rows.some((row) => row.testing === options.testing)
  )
    return false;
  if (!terms.length) return true;
  const text = `${skillText(catalog, skill)} ${entries ? (entries[skill.id] ?? '') : ownBodyText(skill)}`;
  return terms.every((term) => text.includes(term));
}

/**
 * Filters and sorts the browse catalog. Body text comes from `entries`, or
 * from each skill's own body when a full catalog is supplied without entries.
 */
export function selectSkills(
  catalog: BrowseCatalog,
  options: CatalogFilters,
  entries?: SearchEntries,
) {
  const terms = searchTerms(options.query);
  const passing = (skill: IndexSkill) =>
    (skill.compatibility ?? []).filter(
      (row) =>
        row.testing === 'recorded-pass' &&
        (!options.platform || row.platform === options.platform),
    ).length;
  return catalog.skills
    .filter((skill) => matches(catalog, skill, options, terms, entries))
    .sort((a, b) => {
      const title =
        a.title.localeCompare(b.title, 'en') || a.id.localeCompare(b.id, 'en');
      if (options.sort === 'quality')
        return (b.quality?.score ?? -1) - (a.quality?.score ?? -1) || title;
      if (options.sort === 'testing') return passing(b) - passing(a) || title;
      if (options.sort === 'sector')
        return a.sector.localeCompare(b.sector, 'en') || title;
      return options.sort === 'za' ? -title : title;
    });
}

export type FacetKey = Exclude<keyof CatalogFilters, 'query' | 'sort'>;
/**
 * Number of results if `key` were set to `value`, keeping every other active
 * filter. Choosing a broad sector clears the specialty, as the URL update does.
 */
export function facetCount(
  catalog: BrowseCatalog,
  options: CatalogFilters,
  entries: SearchEntries | undefined,
  key: FacetKey,
  value: string | number,
) {
  const next: CatalogFilters = {
    ...options,
    [key]: value,
    ...(key === 'broadSector' ? { sector: '' } : {}),
  };
  const terms = searchTerms(next.query);
  return catalog.skills.filter((skill) =>
    matches(catalog, skill, next, terms, entries),
  ).length;
}

export const sourceUrl = (path: string) =>
  `https://github.com/sarangp3010/open-skill-kit/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`;
