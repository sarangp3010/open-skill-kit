import { spawnSync } from 'node:child_process';

const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error('Run this check with pnpm validate:all.');
for (const command of [
  'lint',
  'format:check',
  'typecheck',
  'test',
  'portability:check',
  'licensing:check',
  'contributions:check',
  'moderation:check',
  'founding:check',
  'release:check',
  'evaluate:fixtures',
  'validate:skills',
  'check:links',
  'check:duplicates',
  'catalog:check',
  'build:marketplace',
  'build',
  'catalog:check-assets',
  'test:e2e',
  'pack:npm',
  'build:pages',
  'audit:dependencies',
  'licensing:artifacts',
]) {
  console.log(`\nValidating: pnpm ${command}`);
  const result = spawnSync(process.execPath, [pnpm, command], {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ...(command === 'build:pages'
        ? { VITE_BASE_PATH: '/open-skill-kit/' }
        : {}),
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  'All local checks passed. No commit, publication or deployment was performed.',
);
