/** Browser-safe conventions verified against official documentation on 2026-11-10. */
export const platforms = [
  {
    id: 'codex',
    title: 'OpenAI Codex',
    directory: '.agents/skills',
    docs: 'https://learn.chatgpt.com/docs/build-skills',
    note: 'Codex discovers .agents/skills in the working directory and repository ancestors.',
  },
  {
    id: 'claude-code',
    title: 'Claude Code',
    directory: '.claude/skills',
    docs: 'https://code.claude.com/docs/en/skills',
    note: 'Personal skills apply to local sessions; cloud sessions have separate discovery rules.',
  },
  {
    id: 'cursor',
    title: 'Cursor',
    directory: '.cursor/skills',
    docs: 'https://cursor.com/help/customization/skills',
    note: 'Local personal skills require separate opt-in syncing for Cloud Agents.',
  },
  {
    id: 'gemini-cli',
    title: 'Gemini CLI',
    directory: '.gemini/skills',
    docs: 'https://geminicli.com/docs/cli/skills/',
    note: 'Gemini may request consent when activating a skill. Shared .agents/skills aliases take precedence.',
  },
] as const;
export type PlatformId = (typeof platforms)[number]['id'];
export type InstallScope = 'project' | 'global';
export function getPlatform(id: string) {
  const adapter = platforms.find((item) => item.id === id);
  if (!adapter)
    throw new Error(
      `Unsupported platform: ${id}. Supported: ${platforms.map((item) => item.id).join(', ')}`,
    );
  return adapter;
}
export function getScope(scope: string): InstallScope {
  if (scope !== 'project' && scope !== 'global')
    throw new Error(`Unsupported scope: ${scope}. Use project or global.`);
  return scope;
}
export function assertSkillId(id: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
    throw new Error(`Invalid skill ID: ${id}. Expected sector/skill.`);
  return id;
}
export function assertPlatformSkill(platform: string, slug: string) {
  getPlatform(platform);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error(`Invalid skill name: ${slug}`);
  if (
    platform === 'claude-code' &&
    ['synced', 'anthropic-skills'].includes(slug)
  )
    throw new Error(`Reserved Claude Code skill name: ${slug}`);
}
export function getInstallInstructions(
  skill: { id: string; status: string },
  platform: string,
  scope: InstallScope,
) {
  const adapter = getPlatform(platform);
  getScope(scope);
  const id = assertSkillId(skill.id);
  const slug = id.split('/')[1];
  assertPlatformSkill(platform, slug);
  // Use the local checkout CLI: the npm release is not published and drafts
  // intentionally do not ship in the publication-only bundle.
  const command = `pnpm cli install ${id} --platform ${adapter.id} --scope ${scope} --source ./skills${scope === 'project' ? ' --project-dir ../your-project' : ''}${skill.status !== 'published' ? ' --allow-draft' : ''}`;
  return {
    adapter,
    directory: `${scope === 'global' ? '~/' : '<project>/'}${adapter.directory}/${slug}`,
    command,
    preview: `${command} --dry-run`,
  };
}
