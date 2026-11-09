import { parseDocument, isAlias, isMap, isSeq, LineCounter } from 'yaml';
import { frontmatterSchema } from '@uas/skill-schema';

export const MAX_SKILL_BYTES = 256 * 1024;
export class SkillParseError extends Error {
  constructor(
    message: string,
    public line = 1,
    public column = 1,
  ) {
    super(message);
    this.name = 'SkillParseError';
  }
}
/** Parses data only; aliases, anchors, explicit tags and duplicate keys are rejected. */
export function parseSkill(source: string) {
  if (new TextEncoder().encode(source).length > MAX_SKILL_BYTES)
    throw new SkillParseError('SKILL.md exceeds 256 KiB');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(
    source.replace(/^\uFEFF/, ''),
  );
  if (!match)
    throw new SkillParseError(
      'Expected opening and closing YAML frontmatter delimiters',
    );
  const lineCounter = new LineCounter();
  const doc = parseDocument(match[1], {
    schema: 'failsafe',
    uniqueKeys: true,
    strict: true,
    lineCounter,
  });
  const problem = [...doc.errors, ...doc.warnings][0];
  if (problem) {
    const position = lineCounter.linePos(problem.pos[0]);
    throw new SkillParseError(
      `Invalid YAML: ${problem.message.split('\n')[0]}`,
      position.line + 1,
      position.col,
    );
  }
  function check(node: unknown, depth = 0): void {
    if (depth > 20) throw new SkillParseError('YAML nesting exceeds limit');
    if (!node || typeof node !== 'object') return;
    if (
      isAlias(node) ||
      ('anchor' in node && node.anchor) ||
      ('tag' in node && node.tag)
    )
      throw new SkillParseError(
        'YAML aliases, anchors and explicit tags are unsupported',
        2,
      );
    if (isMap(node))
      for (const pair of node.items) {
        check(pair.key, depth + 1);
        check(pair.value, depth + 1);
      }
    if (isSeq(node)) for (const child of node.items) check(child, depth + 1);
  }
  check(doc.contents);
  const result = frontmatterSchema.safeParse(doc.toJS({ maxAliasCount: 0 }));
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = String(issue.path[0] ?? 'frontmatter');
    const lines = match[1].split(/\r?\n/);
    const index = lines.findIndex((line) => line.startsWith(`${field}:`));
    throw new SkillParseError(
      `${field}: ${issue.message}`,
      index < 0 ? 2 : index + 2,
    );
  }
  const body = match[2].trim();
  if (!body)
    throw new SkillParseError(
      'Skill instructions must not be empty',
      match[1].split('\n').length + 3,
    );
  return { frontmatter: result.data, body };
}
