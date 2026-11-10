import { qualityReportSchema, type QualityReport } from '@uas/skill-schema';
import type { parseSkill, parseInstructionStructure } from '@uas/skill-parser';
import type { catalogSourceMetadataSchema } from '@uas/skill-schema';

export interface QualityFacts {
  valid: boolean;
  parsed?: ReturnType<typeof parseSkill>;
  structure?: ReturnType<typeof parseInstructionStructure>;
  metadata?: ReturnType<typeof catalogSourceMetadataSchema.parse>;
  examples?: string[];
  files: Record<string, string>;
  safetyChecked: boolean;
  referencesChecked: boolean;
  failures: Set<string>;
}
/** Advisory structural rubric, never editorial review or proof of model behavior. */
export function assessQuality(facts: QualityFacts): QualityReport {
  const { metadata: m, parsed, structure: s, files } = facts;
  const checks: QualityReport['checks'] = [];
  function check(
    id: string,
    category: QualityReport['checks'][number]['category'],
    weight: number,
    assessed: boolean,
    passed: boolean,
    message: string,
    paths: string[],
  ) {
    const status = !assessed
      ? 'not-evaluated'
      : passed
        ? 'pass'
        : facts.failures.has(category)
          ? 'fail'
          : 'warn';
    checks.push({
      id,
      category,
      weight,
      earned: status === 'pass' ? weight : 0,
      status,
      message,
      paths,
    });
  }
  const present = (value: unknown) =>
    typeof value === 'string' &&
    !!value.trim() &&
    !/\b(?:todo|tbd|your name|replace before submission)\b/i.test(value);
  check(
    'identity',
    'metadata',
    10,
    !!parsed,
    !!parsed && !facts.failures.has('metadata'),
    'Valid frontmatter identity and matching folder/metadata identity.',
    ['SKILL.md', 'metadata.json'],
  );
  check(
    'discovery-metadata',
    'metadata',
    10,
    !!m,
    !!m &&
      present(m.title ?? m.displayName) &&
      !!m.tags?.length &&
      present(m.difficulty),
    'Declare title/displayName, at least one tag and difficulty.',
    ['metadata.json'],
  );
  check(
    'provenance-metadata',
    'metadata',
    10,
    !!m,
    !!m && [m.author, m.license, m.version, m.provenance].every(present),
    'Declare non-placeholder author, license, version and source provenance.',
    ['metadata.json'],
  );
  check(
    'capability-metadata',
    'metadata',
    5,
    !!m,
    !!m?.riskLevel && !!m.capabilities?.length,
    'Declare risk level and at least one capability.',
    ['metadata.json'],
  );
  check(
    'activation',
    'instructions',
    5,
    !!parsed,
    !!parsed &&
      /\bwhen\b|\buse (?:for|to)\b/i.test(parsed.frontmatter.description) &&
      !!s?.sections.get('when to use')?.trim(),
    'Explain activation in the description and When to use section.',
    ['SKILL.md'],
  );
  check(
    'instruction-sections',
    'instructions',
    15,
    !!s,
    ['when to use', 'inputs', 'workflow', 'output', 'boundaries'].every(
      (heading) => !!s?.sections.get(heading)?.trim(),
    ),
    'Provide nonempty When to use, Inputs, Workflow, Output and Boundaries sections.',
    ['SKILL.md'],
  );
  check(
    'actionable-workflow',
    'instructions',
    10,
    !!s,
    (s?.orderedSteps ?? 0) >= 3,
    'Provide at least three top-level numbered workflow steps; fenced examples do not count.',
    ['SKILL.md'],
  );
  check(
    'structured-output',
    'instructions',
    5,
    !!s,
    !!s?.structuredOutput,
    'Describe the output using a list or fenced format inside Output.',
    ['SKILL.md'],
  );
  const examples = facts.examples ?? [];
  const inputs = examples.filter(
    (path) => /input/i.test(path) && !!files[path]?.trim(),
  );
  const outputs = examples.filter(
    (path) => /output/i.test(path) && !!files[path]?.trim(),
  );
  check(
    'example-pair',
    'examples',
    10,
    facts.examples !== undefined,
    !!inputs.length && !!outputs.length && !facts.failures.has('examples'),
    'Reference a nonempty input example and expected output example.',
    examples,
  );
  check(
    'example-variety',
    'examples',
    10,
    facts.examples !== undefined,
    inputs.length >= 2 &&
      outputs.length >= 2 &&
      new Set([...inputs, ...outputs].map((path) => files[path]?.trim()))
        .size >= 4,
    'Supply at least two distinct input and output examples; content accuracy needs review.',
    examples,
  );
  check(
    'file-references',
    'references',
    5,
    facts.referencesChecked,
    !facts.failures.has('references'),
    'All inspected Markdown and example references stay within the package and resolve, or use supported external schemes.',
    Object.keys(files).filter((path) => path.endsWith('.md')),
  );
  check(
    'package-safety',
    'safety',
    5,
    facts.safetyChecked,
    !facts.failures.has('safety'),
    'Pass existing path, type, size, collision, UTF-8-text and raw-HTML checks. No scripts execute.',
    Object.keys(files).sort(),
  );
  const rawScore = checks.reduce((sum, item) => sum + item.earned, 0);
  return qualityReportSchema.parse({
    rubricVersion: 1,
    score: facts.valid ? rawScore : 0,
    rawScore,
    blocked: !facts.valid,
    checks,
  });
}
