import type { DiscoverySkill } from '@/lib/catalog';
import { sourceUrl } from '@/lib/catalog';
export function ContributorAttribution({ skill }: { skill: DiscoverySkill }) {
  const attribution = skill.attribution;
  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      aria-label="Contributor attribution"
    >
      <h2 className="text-sm font-semibold">Contributor attribution</h2>
      <p className="mt-2 break-words text-xs leading-6 text-muted-foreground">
        Declared author: {skill.author ?? 'Not supplied'}. A declaration alone
        does not verify identity.
      </p>
      {attribution?.status === 'current' ? (
        <>
          <p className="mt-3 text-sm">
            Attribution review recorded for{' '}
            <a
              className="text-link"
              href={`https://github.com/${encodeURIComponent(attribution.record.githubUsername)}`}
              target="_blank"
              rel="noreferrer"
            >
              {attribution.record.displayName}
            </a>
            .
          </p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Reviewed by {attribution.record.reviewedBy} on{' '}
            {attribution.record.reviewedAt}. This maintainer record is not a
            professional qualification or skill-effectiveness endorsement.
          </p>
          <a
            className="text-link mt-2 text-xs"
            href={attribution.record.reviewUrl}
            target="_blank"
            rel="noreferrer"
          >
            Attribution review pull request
          </a>
          <a
            className="text-link mt-2 text-xs"
            href={sourceUrl(attribution.record.evidencePath)}
            target="_blank"
            rel="noreferrer"
          >
            Read attribution review evidence
          </a>
        </>
      ) : (
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          {attribution?.status === 'stale'
            ? 'The package changed; its attribution record needs re-review.'
            : 'No maintainer-reviewed attribution recorded.'}
        </p>
      )}
    </section>
  );
}
