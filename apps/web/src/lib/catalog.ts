import {
  discoveryCatalogSchema,
  type DiscoveryCatalog,
  type DiscoverySkill,
} from '@uas/skill-schema';
export type { DiscoveryCatalog, DiscoverySkill };
export async function loadCatalog(
  signal?: AbortSignal,
): Promise<DiscoveryCatalog> {
  const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`, {
    signal,
  });
  if (!response.ok) throw new Error('The skill catalog could not be loaded.');
  const result = discoveryCatalogSchema.safeParse(await response.json());
  if (!result.success)
    throw new Error(
      'The skill catalog has an invalid format. Please rebuild it.',
    );
  return result.data;
}
export function selectSkills(
  catalog: DiscoveryCatalog,
  options: { query?: string; sector?: string; sort?: string },
) {
  const query = (options.query ?? '').toLowerCase().normalize('NFKD').trim();
  const terms = query.split(/\s+/).filter(Boolean);
  const sectors = new Map(
    catalog.sectors.map((sector) => [sector.slug, sector]),
  );
  return catalog.skills
    .filter((skill) => {
      if (options.sector && skill.sector !== options.sector) return false;
      const sector = sectors.get(skill.sector);
      const text =
        `${skill.title} ${skill.description} ${skill.tags.join(' ')} ${sector?.title ?? ''} ${sector?.aliases.join(' ') ?? ''} ${skill.body}`
          .toLowerCase()
          .normalize('NFKD');
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) =>
      options.sort === 'sector'
        ? a.sector.localeCompare(b.sector) || a.title.localeCompare(b.title)
        : options.sort === 'za'
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title),
    );
}
export const sourceUrl = (path: string) =>
  `https://github.com/sarangp3010/open-skill-kit/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`;
