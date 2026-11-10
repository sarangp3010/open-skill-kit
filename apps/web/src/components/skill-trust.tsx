import { platforms } from '@uas/platform-adapters';
import type { DiscoverySkill } from '@/lib/catalog';
import { sourceUrl } from '@/lib/catalog';
import { EvaluationDetails, EvaluationSummary } from './skill-evaluations';

const testingLabels = {
  'not-recorded': 'No completed test evidence',
  'recorded-pass': 'Recorded pass',
  'recorded-fail': 'Recorded failure',
  stale: 'Stale test evidence',
} as const;
export function TrustSummary({ skill }: { skill: DiscoverySkill }) {
  const passed =
    skill.compatibility?.filter((row) => row.testing === 'recorded-pass')
      .length ?? 0;
  return (
    <div className="mt-4 space-y-1 text-xs leading-5 text-muted-foreground">
      <p className="font-medium text-foreground">
        {skill.quality
          ? `Quality ${skill.quality.score}/100 · structural`
          : 'Quality not assessed'}
      </p>
      <p>
        {skill.validation?.status === 'passed'
          ? 'Structure validation passed'
          : skill.validation?.status === 'failed'
            ? 'Structure validation failed'
            : 'Validation not assessed'}
      </p>
      <p>
        {!skill.compatibility
          ? 'Testing not assessed'
          : passed
            ? `Recorded passing tests: ${passed} platform${passed === 1 ? '' : 's'}`
            : 'No passing test evidence for this package'}
      </p>
      <p>
        Installation:{' '}
        {skill.compatibility
          ?.filter((row) => row.installation === 'documented')
          .map(
            (row) =>
              platforms.find((platform) => platform.id === row.platform)?.title,
          )
          .join(', ') || 'Not assessed'}
      </p>
      <EvaluationSummary skill={skill} />
    </div>
  );
}
export function TrustDetails({ skill }: { skill: DiscoverySkill }) {
  return (
    <section
      aria-labelledby="quality-title"
      className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-8"
    >
      <h2 id="quality-title" className="text-xl font-semibold">
        Quality, validation & compatibility
      </h2>
      <TrustSummary skill={skill} />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        A deterministic structural score is not editorial review, a safety
        certification or proof of assistant behavior. Test records are
        contributor-supplied evidence, not independent verification.
      </p>
      {skill.quality && (
        <details className="mt-5 rounded-xl border border-border p-4">
          <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">
            Explain quality score ({skill.quality.score}/100)
          </summary>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Rubric {skill.quality.rubricVersion}.{' '}
            {skill.quality.blocked &&
              `Validation failed; score is blocked at zero (raw points ${skill.quality.rawScore}).`}
          </p>
          <ul className="mt-4 space-y-4">
            {skill.quality.checks.map((check) => (
              <li key={check.id} className="text-sm leading-6">
                <strong>
                  {check.id}: {check.status} · {check.earned}/{check.weight}
                </strong>
                <p className="text-muted-foreground">{check.message}</p>
                {check.paths.length > 0 && (
                  <p className="break-all text-xs text-muted-foreground">
                    Files: {check.paths.join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      {skill.validation && (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Validation profile: {skill.validation.profile}.
          {skill.validation.warnings.length
            ? ` Warnings: ${skill.validation.warnings.join(' ')}`
            : ' No structural validation warnings.'}
        </p>
      )}
      <h3 className="mt-6 font-semibold">Platform details</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {skill.compatibility?.map((row) => (
          <article
            key={row.platform}
            className="min-w-0 rounded-xl bg-muted/50 p-4 text-xs leading-5"
          >
            <h4 className="text-sm font-semibold">
              {
                platforms.find((platform) => platform.id === row.platform)
                  ?.title
              }
            </h4>
            <p className="mt-2">Installation: {row.installation}.</p>
            <p className="mt-1 text-muted-foreground">{row.reason}</p>
            <p className="mt-2">
              Contributor compatibility declaration:{' '}
              {row.declaredCompatible ? 'present' : 'not supplied'}.
            </p>
            <p>Test evidence: {testingLabels[row.testing]}.</p>
            {row.declaredTested && (
              <p className="mt-1 text-muted-foreground">
                Legacy metadata declares testing; this does not supply completed
                test evidence.
              </p>
            )}
            {row.runs.map((run, index) => (
              <details
                key={`${run.platform}-${run.completedAt}-${index}`}
                className="mt-3"
              >
                <summary className="cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
                  Recorded {run.outcome} · {run.completedAt}
                </summary>
                <p className="mt-2 break-words">
                  Runner: {run.runner}; platform version: {run.platformVersion}.
                </p>
                <p className="break-all">
                  Tested package digest: {run.packageDigest}
                </p>
                <a
                  className="text-link mt-2 break-all"
                  target="_blank"
                  rel="noreferrer"
                  href={sourceUrl(`skills/${skill.id}/${run.evidencePath}`)}
                >
                  Source evidence: {run.evidencePath}
                </a>
                <pre
                  tabIndex={0}
                  aria-label={`${row.platform} test evidence`}
                  className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3"
                >
                  {skill.files[run.evidencePath]}
                </pre>
              </details>
            ))}
          </article>
        ))}
      </div>
      {!skill.compatibility && (
        <p className="mt-3 text-sm text-muted-foreground">
          Platform assessment is absent in this older catalog. Rebuild the
          catalog to assess it.
        </p>
      )}
      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        Declared capabilities: {skill.capabilities.join(', ') || 'not supplied'}
        . Declared test date: {skill.lastVerified ?? 'not supplied'}.
        Installation support does not establish runtime tool access or task
        correctness.
      </p>
      <EvaluationDetails skill={skill} />
    </section>
  );
}
