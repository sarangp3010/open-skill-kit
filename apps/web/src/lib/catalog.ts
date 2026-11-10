import {
  discoveryCatalogSchema,
  type DiscoveryCatalog,
  type DiscoverySkill,
  matchesSector,
  canonicalSector,
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
  options: {
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
  },
) {
  const query = (options.query ?? '').toLowerCase().normalize('NFKD').trim();
  const terms = query.split(/\s+/).filter(Boolean);
  const sectors = new Map(
    catalog.sectors.map((sector) => [sector.slug, sector]),
  );
  return catalog.skills
    .filter((skill) => {
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
      if (
        options.capability &&
        !skill.capabilities.includes(options.capability)
      )
        return false;
      if (options.difficulty && skill.difficulty !== options.difficulty)
        return false;
      if (options.status && skill.status !== options.status) return false;
      if (
        options.minQuality &&
        (skill.quality?.score ?? -1) < options.minQuality
      )
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
      const sector = sectors.get(skill.sector);
      const canonical = sectors.get(
        canonicalSector(catalog.sectors, skill.sector),
      );
      const parent = sectors.get(canonical?.parent ?? '');
      const text =
        `${skill.title} ${skill.description} ${skill.tags.join(' ')} ${sector?.title ?? ''} ${sector?.aliases.join(' ') ?? ''} ${canonical?.title ?? ''} ${parent?.title ?? ''} ${parent?.aliases.join(' ') ?? ''} ${skill.body}`
          .toLowerCase()
          .normalize('NFKD');
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => {
      const title =
        a.title.localeCompare(b.title, 'en') || a.id.localeCompare(b.id, 'en');
      if (options.sort === 'quality')
        return (b.quality?.score ?? -1) - (a.quality?.score ?? -1) || title;
      if (options.sort === 'testing')
        return (
          (b.compatibility ?? []).filter(
            (row) =>
              row.testing === 'recorded-pass' &&
              (!options.platform || row.platform === options.platform),
          ).length -
            (a.compatibility ?? []).filter(
              (row) =>
                row.testing === 'recorded-pass' &&
                (!options.platform || row.platform === options.platform),
            ).length || title
        );
      if (options.sort === 'sector')
        return a.sector.localeCompare(b.sector, 'en') || title;
      return options.sort === 'za' ? -title : title;
    });
}
export const sourceUrl = (path: string) =>
  `https://github.com/sarangp3010/open-skill-kit/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`;
