import { readdir, readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// Repository documentation only. Skill links are parsed as Markdown by skill-validator.
let broken = 0;
const directories = ['.', 'docs', 'skills', 'packages/cli', 'templates'];
async function appendChildren(root: string) {
  for (const entry of await readdir(root, { withFileTypes: true }))
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      const path = resolve(root, entry.name);
      directories.push(path);
      await appendChildren(path);
    }
}
await appendChildren('docs');
await appendChildren('reviews');
directories.push('reviews');
for (const directory of directories) {
  for (const file of await readdir(directory)) {
    if (
      !file.endsWith('.md') ||
      file === 'UNIVERSAL_AI_SKILLS_CODEX_MASTER_PLAN.md'
    )
      continue;
    const path = resolve(directory, file);
    const content = await readFile(path, 'utf8');
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      try {
        await access(resolve(dirname(path), decodeURIComponent(target)));
      } catch {
        console.error(
          `Broken documentation link: ${directory}/${file}: ${target}`,
        );
        broken++;
      }
    }
  }
}
if (broken) process.exitCode = 1;
else
  console.log(
    'Repository documentation file links pass (external URLs and anchors are not fetched).',
  );
