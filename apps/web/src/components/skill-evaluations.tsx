import type { DiscoverySkill, IndexSkill } from '@/lib/catalog';
import { sourceUrl } from '@/lib/catalog';

export function EvaluationSummary({ skill }: { skill: IndexSkill }) {
  const reports = skill.evaluations ?? [];
  if (!reports.length) return null;
  const current = reports.filter(
    (report) => report.verification === 'reproduced',
  );
  const agent = current.filter(
    (report) =>
      report.mode === 'agent' && report.completedCases === report.totalCases,
  );
  const fixture = current.filter((report) => report.mode === 'fixture');
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      {agent.length
        ? `Completed agent evaluation reports: ${agent.length}.`
        : 'No completed agent evaluation evidence.'}
      {fixture.length > 0 &&
        ` Fixture replay reports: ${fixture.length} (not agent performance).`}
    </p>
  );
}

export function EvaluationDetails({ skill }: { skill: DiscoverySkill }) {
  return (
    <section
      aria-labelledby="evaluation-title"
      className="mt-8 border-t border-border pt-6"
    >
      <h3 id="evaluation-title" className="font-semibold">
        Evaluation evidence
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Assertion scores measure the captured task outputs separately from
        structural quality. Reproduced means the report checks and package
        digest match; it is not an independent attestation of a model or
        platform.
      </p>
      {!skill.evaluations?.length && (
        <p className="mt-3 text-sm text-muted-foreground">
          No evaluation reports recorded for this package.
        </p>
      )}
      {skill.evaluations?.map((report) => (
        <article
          key={report.reportPath}
          className="mt-4 min-w-0 rounded-xl border border-border p-4 text-sm leading-6"
        >
          <h4 className="font-semibold">{report.suiteId}</h4>
          <p>
            {report.mode === 'fixture'
              ? 'Offline fixture replay · not agent performance'
              : `Agent evaluation · ${report.platform}`}
          </p>
          <p>
            Evidence check: {report.verification}. Completed comparisons:{' '}
            {report.completedCases}/{report.totalCases}.
          </p>
          {report.verification === 'reproduced' &&
          report.baselineScore !== null &&
          report.assistedScore !== null ? (
            <p>
              Baseline assertions: {report.baselineScore}/100. Skill-assisted
              assertions: {report.assistedScore}/100. Difference: {report.delta}{' '}
              points.
            </p>
          ) : (
            <p>
              Comparison unscored. Inspect the report errors or evidence issues.
            </p>
          )}
          {report.mode === 'agent' && (
            <p>
              Requested model: {report.modelRequested ?? 'not recorded'}. This
              is not confirmation of the served model.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Completed: {report.completedAt}
          </p>
          {report.issues.length > 0 && (
            <ul className="mt-2 list-inside list-disc">
              {report.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
              Inspect report provenance
            </summary>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              SHA-256: {report.reportDigest}
            </p>
            <a
              className="text-link break-all"
              target="_blank"
              rel="noreferrer"
              href={sourceUrl(report.reportPath)}
            >
              Source report: {report.reportPath}
            </a>
          </details>
        </article>
      ))}
    </section>
  );
}
