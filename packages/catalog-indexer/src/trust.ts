import { createHash } from 'node:crypto';
import { platforms, assertPlatformSkill } from '@uas/platform-adapters';
import {
  catalogSourceMetadataSchema,
  platformResultsSchema,
  type Compatibility,
  type DiscoverySkill,
} from '@uas/skill-schema';

/** Bind evidence to every package file except the self-referential results document. */
export function packageDigest(files: Record<string, string>) {
  const content = Object.keys(files)
    .filter((path) => path !== 'tests/platform-results.json')
    .sort()
    .map((path) => [path, files[path]]);
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}
export function assessCompatibility(skill: DiscoverySkill): Compatibility {
  const metadata = catalogSourceMetadataSchema.parse(
    JSON.parse(skill.files['metadata.json'] ?? '{}'),
  );
  const results = skill.files['tests/platform-results.json']
    ? platformResultsSchema.parse(
        JSON.parse(skill.files['tests/platform-results.json']),
      ).runs
    : [];
  if (results.some((run) => !skill.files[run.evidencePath]?.trim()))
    throw new Error('Missing or empty completed test evidence artifact');
  const digest = packageDigest(skill.files);
  return platforms.map((platform) => {
    let installation: 'documented' | 'unsupported' = 'documented';
    let reason =
      'Portable SKILL.md package; installation directory is documented. Assistant behavior is not inferred.';
    try {
      assertPlatformSkill(platform.id, skill.slug);
    } catch (error) {
      installation = 'unsupported';
      reason =
        error instanceof Error ? error.message : 'Unsupported skill name';
    }
    const runs = results
      .filter((run) => run.platform === platform.id)
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() -
            new Date(a.completedAt).getTime() ||
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
      );
    // A newer stale/failed record must not be hidden by an older passing record.
    const latest = runs[0];
    const testing = !latest
      ? 'not-recorded'
      : latest.packageDigest !== digest
        ? 'stale'
        : latest.outcome === 'passed'
          ? 'recorded-pass'
          : 'recorded-fail';
    return {
      platform: platform.id,
      installation,
      reason,
      declaredCompatible:
        metadata.compatiblePlatforms?.includes(platform.id) ?? false,
      declaredTested: skill.testedPlatforms.includes(platform.id),
      testing,
      runs,
    };
  });
}
