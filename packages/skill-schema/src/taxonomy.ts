import type { Sector } from './index';

/** Stable folder/URL identities remain intact; aliases only consolidate browsing. */
export function canonicalSector(sectors: readonly Sector[], slug: string) {
  return sectors.find((sector) => sector.slug === slug)?.aliasOf ?? slug;
}
export function broadSectors(sectors: readonly Sector[]) {
  return sectors.filter((sector) => !sector.parent && !sector.aliasOf);
}
export function matchesSector(
  sectors: readonly Sector[],
  source: string,
  selected: string,
) {
  if (!selected) return true;
  const canonicalSource = canonicalSector(sectors, source);
  const canonicalSelected = canonicalSector(sectors, selected);
  return (
    canonicalSource === canonicalSelected ||
    sectors.find((sector) => sector.slug === canonicalSource)?.parent ===
      canonicalSelected
  );
}
