import type {
  EvaluationScenario,
  EvaluationArm,
  EvaluationReport,
} from '@uas/skill-schema';

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
/** Stable, non-secret execution policy captured by a report. */
export function evaluationConfiguration(
  report: Pick<
    EvaluationReport,
    | 'runnerVersion'
    | 'mode'
    | 'platform'
    | 'engineVersion'
    | 'modelRequested'
    | 'image'
    | 'network'
    | 'credentialNames'
    | 'limits'
  >,
) {
  return {
    runnerVersion: report.runnerVersion,
    mode: report.mode,
    platform: report.platform,
    engineVersion: report.engineVersion,
    modelRequested: report.modelRequested,
    image: report.image,
    network: report.network,
    credentialNames: report.credentialNames,
    limits: report.limits,
  };
}
export function scoreEvaluation(
  scenario: EvaluationScenario,
  observation: { output: string; files: Record<string, string> },
) {
  const assertions = scenario.assertions.map((assertion) => {
    let passed = false;
    switch (assertion.type) {
      case 'text-contains':
        passed = observation.output.includes(assertion.value);
        break;
      case 'text-excludes':
        passed = !observation.output.includes(assertion.value);
        break;
      case 'text-equals':
        passed = observation.output === assertion.value;
        break;
      case 'file-exists':
        passed = Object.hasOwn(observation.files, assertion.path);
        break;
      case 'file-equals':
        passed = observation.files[assertion.path] === assertion.value;
        break;
      case 'file-contains':
        passed =
          observation.files[assertion.path]?.includes(assertion.value) ?? false;
        break;
      case 'json-field-equals': {
        try {
          let value: unknown = JSON.parse(observation.output);
          for (const key of assertion.path) {
            if (
              !value ||
              typeof value !== 'object' ||
              !Object.hasOwn(value, key)
            ) {
              value = undefined;
              break;
            }
            value = (value as Record<string, unknown>)[key];
          }
          passed = value === assertion.value;
        } catch {
          passed = false;
        }
        break;
      }
    }
    return {
      id: assertion.id,
      passed,
      weight: assertion.weight,
      earned: passed ? assertion.weight : 0,
      message: `${assertion.type}: ${passed ? 'passed' : 'failed'}`,
    };
  });
  const possible = assertions.reduce((sum, item) => sum + item.weight, 0);
  return {
    assertions,
    score:
      Math.round(
        (assertions.reduce((sum, item) => sum + item.earned, 0) / possible) *
          10000,
      ) / 100,
  };
}
export function extractAgentOutput(platform: string, stdout: string) {
  if (platform === 'codex') {
    const events = stdout
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
    if (
      events.some(
        (event) => event.type === 'turn.failed' || event.type === 'error',
      ) ||
      !events.some((event) => event.type === 'turn.completed')
    )
      throw new Error('Codex did not report a completed successful turn');
    const messages = events.filter(
      (event) =>
        event.type === 'item.completed' &&
        event.item?.type === 'agent_message' &&
        typeof event.item.text === 'string',
    );
    if (!messages.length)
      throw new Error('Codex final agent message is absent');
    return {
      output: messages.at(-1).item.text as string,
      modelReported:
        events.find((event) => typeof event.model === 'string')?.model ?? null,
    };
  }
  const result = JSON.parse(stdout);
  if (!result || typeof result !== 'object' || result.is_error || result.error)
    throw new Error('Agent reported an error or invalid result');
  const output = platform === 'gemini-cli' ? result.response : result.result;
  if (typeof output !== 'string')
    throw new Error('Agent final response is absent');
  return {
    output,
    modelReported: typeof result.model === 'string' ? result.model : null,
  };
}
export function evaluationSummary(cases: EvaluationReport['cases']) {
  const completedCases = cases.filter(
    (item) =>
      item.baseline.status === 'completed' &&
      item.assisted.status === 'completed',
  ).length;
  const complete = completedCases === cases.length;
  const average = (key: 'baseline' | 'assisted') =>
    Math.round(
      (cases.reduce((sum, item) => sum + (item[key].score ?? 0), 0) /
        cases.length) *
        100,
    ) / 100;
  const baselineScore = complete ? average('baseline') : null,
    assistedScore = complete ? average('assisted') : null;
  return {
    completedCases,
    totalCases: cases.length,
    baselineScore,
    assistedScore,
    delta:
      baselineScore === null || assistedScore === null
        ? null
        : Math.round((assistedScore - baselineScore) * 100) / 100,
  };
}
/** Recheck captured observations; this is not a signature or proof of a remote model's identity. */
export function reproduceEvaluation(report: EvaluationReport): string[] {
  const issues: string[] = [];
  if (report.cases.length !== report.suite.scenarios.length)
    issues.push('Scenario coverage differs from the suite');
  if ((report.mode === 'fixture') !== (report.platform === 'fixture'))
    issues.push('Fixture and real-agent platform labels conflict');
  if (
    report.mode === 'fixture' &&
    (report.modelRequested !== null ||
      report.image !== null ||
      report.engineVersion !== null ||
      report.network ||
      report.credentialNames.length)
  )
    issues.push(
      'Fixture execution cannot claim a real model, image, network or credentials',
    );
  if (
    report.mode === 'agent' &&
    report.cases.some(
      (item) =>
        item.baseline.status === 'completed' ||
        item.assisted.status === 'completed',
    ) &&
    (!report.image ||
      !/@sha256:[a-f0-9]{64}$/.test(report.image) ||
      !report.modelRequested ||
      !report.engineVersion)
  )
    issues.push('Real execution requires a pinned image and requested model');
  for (let index = 0; index < report.cases.length; index++) {
    const item = report.cases[index],
      scenario = report.suite.scenarios[index];
    if (!scenario || scenario.id !== item.id) {
      issues.push('Scenario order or identity mismatch');
      continue;
    }
    for (const variant of ['baseline', 'assisted'] as const) {
      const arm = item[variant];
      if (arm.status !== 'completed') {
        if (arm.score !== null || arm.assertions.length || !arm.error)
          issues.push(
            `${item.id}/${variant}: unsuccessful execution cannot claim scored assertions`,
          );
        continue;
      }
      if (arm.error || arm.exitCode !== 0)
        issues.push(
          `${item.id}/${variant}: completed status conflicts with process error`,
        );
      const bytes = (value: string) => new TextEncoder().encode(value).length;
      const outputBytes =
        bytes(arm.stdout) +
        bytes(arm.stderr) +
        Object.values(arm.files).reduce((sum, value) => sum + bytes(value), 0);
      if (outputBytes > report.limits.maxOutputBytes)
        issues.push(
          `${item.id}/${variant}: captured output exceeds configured limit`,
        );
      const observedPaths = new Set(
        scenario.assertions.flatMap((assertion) =>
          'path' in assertion && typeof assertion.path === 'string'
            ? [assertion.path]
            : [],
        ),
      );
      if (Object.keys(arm.files).some((path) => !observedPaths.has(path)))
        issues.push(`${item.id}/${variant}: unexpected file observation`);
      const scored = scoreEvaluation(scenario, arm);
      if (
        arm.score !== scored.score ||
        canonicalJson(arm.assertions) !== canonicalJson(scored.assertions)
      )
        issues.push(
          `${item.id}/${variant}: assertion results do not match observations`,
        );
      if (report.mode === 'fixture') {
        const fixture = scenario.fixtures?.[variant];
        if (
          !fixture ||
          arm.output !== fixture.output ||
          arm.stdout !== fixture.output ||
          arm.modelReported !== null ||
          arm.platformVersion !== null
        )
          issues.push(
            `${item.id}/${variant}: replay does not match declared fixture`,
          );
        const expected = { ...scenario.files, ...fixture?.files };
        for (const [path, content] of Object.entries(arm.files))
          if (expected[path] !== content)
            issues.push(
              `${item.id}/${variant}: file observation differs from fixture`,
            );
        for (const assertion of scenario.assertions)
          if (
            'path' in assertion &&
            typeof assertion.path === 'string' &&
            Object.hasOwn(expected, assertion.path) &&
            arm.files[assertion.path] !== expected[assertion.path]
          )
            issues.push(
              `${item.id}/${variant}: fixture file observation is missing`,
            );
      } else {
        try {
          const parsed = extractAgentOutput(report.platform, arm.stdout);
          if (
            parsed.output !== arm.output ||
            parsed.modelReported !== arm.modelReported
          )
            issues.push(
              `${item.id}/${variant}: final response differs from raw agent output`,
            );
        } catch (error) {
          issues.push(
            `${item.id}/${variant}: ${error instanceof Error ? error.message : 'Invalid agent output'}`,
          );
        }
      }
    }
    const delta =
      item.baseline.score === null || item.assisted.score === null
        ? null
        : Math.round((item.assisted.score - item.baseline.score) * 100) / 100;
    if (item.delta !== delta)
      issues.push(`${item.id}: comparison does not match arm scores`);
  }
  if (
    report.cases.length &&
    canonicalJson(report.summary) !==
      canonicalJson(evaluationSummary(report.cases))
  )
    issues.push('Aggregate comparison does not match case results');
  if (
    new Date(report.completedAt).getTime() <
    new Date(report.startedAt).getTime()
  )
    issues.push('Completion precedes start');
  return issues;
}
export type { EvaluationArm };
