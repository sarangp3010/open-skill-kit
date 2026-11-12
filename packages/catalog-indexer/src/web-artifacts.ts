import { createHash } from 'node:crypto';
import {
  catalogIndexSchema,
  catalogSearchSchema,
  discoveryCatalogSchema,
  normalizeSearchText,
  skillDetailSchema,
  type DiscoveryCatalog,
  type DiscoverySkill,
  type IndexSkill,
} from '@uas/skill-schema';

/** Initial browse payload budget, in bytes of the serialized index. */
export const INDEX_BUDGET_BYTES = 150_000;
export const WEB_DATA_DIRECTORY = 'data';

function serialize(value: unknown) {
  return JSON.stringify(value) + '\n';
}

function indexSkill(skill: DiscoverySkill): IndexSkill {
  return {
    id: skill.id,
    slug: skill.slug,
    sector: skill.sector,
    name: skill.name,
    title: skill.title,
    description: skill.description,
    tags: skill.tags,
    difficulty: skill.difficulty,
    capabilities: skill.capabilities,
    riskLevel: skill.riskLevel,
    status: skill.status,
    version: skill.version,
    license: skill.license,
    author: skill.author,
    lastVerified: skill.lastVerified,
    testedPlatforms: skill.testedPlatforms,
    ...(skill.evaluations ? { evaluations: skill.evaluations } : {}),
    ...(skill.attribution ? { attribution: skill.attribution } : {}),
    ...(skill.quality
      ? {
          quality: {
            score: skill.quality.score,
            blocked: skill.quality.blocked,
          },
        }
      : {}),
    ...(skill.validation
      ? { validation: { status: skill.validation.status } }
      : {}),
    ...(skill.compatibility
      ? {
          compatibility: skill.compatibility.map((row) => ({
            platform: row.platform,
            installation: row.installation,
            testing: row.testing,
          })),
        }
      : {}),
  };
}

export const skillDetailPath = (skill: { sector: string; slug: string }) =>
  `${WEB_DATA_DIRECTORY}/skills/${skill.sector}/${skill.slug}.json`;

/**
 * Derives deterministic browser artifacts from the canonical catalog bytes.
 * Returns paths relative to the web public directory, sorted for stable output.
 */
export function webArtifacts(
  serializedCatalog: string,
  indexBudget = INDEX_BUDGET_BYTES,
) {
  const catalog: DiscoveryCatalog = discoveryCatalogSchema.parse(
    JSON.parse(serializedCatalog),
  );
  const catalogDigest = createHash('sha256')
    .update(serializedCatalog)
    .digest('hex');
  const ordered = [...catalog.skills].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const index = serialize(
    catalogIndexSchema.parse({
      schemaVersion: 1,
      catalogDigest,
      sectors: catalog.sectors,
      skills: catalog.skills.map(indexSkill),
    }),
  );
  const indexBytes = Buffer.byteLength(index);
  if (indexBytes > indexBudget)
    throw new Error(
      `${WEB_DATA_DIRECTORY}/index.json is ${indexBytes} bytes; the initial catalog budget is ${indexBudget} bytes`,
    );
  const search = serialize(
    catalogSearchSchema.parse({
      schemaVersion: 1,
      catalogDigest,
      entries: Object.fromEntries(
        ordered.map((skill) => [skill.id, normalizeSearchText(skill.body)]),
      ),
    }),
  );
  const artifacts: [string, string][] = [
    [`${WEB_DATA_DIRECTORY}/index.json`, index],
    [`${WEB_DATA_DIRECTORY}/search.json`, search],
    ...ordered.map(
      (skill) =>
        [
          skillDetailPath(skill),
          serialize(
            skillDetailSchema.parse({
              schemaVersion: 1,
              catalogDigest,
              skill,
            }),
          ),
        ] as [string, string],
    ),
  ];
  return {
    catalogDigest,
    artifacts: artifacts.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  };
}
