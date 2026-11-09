import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { runCli } from './index';

try {
  const manifest = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  await runCli(process.argv.slice(2), {
    dataRoot: fileURLToPath(new URL('../data/', import.meta.url)),
    cwd: process.cwd(),
    version: manifest.version,
    log: (message) => console.log(message),
  });
} catch (error) {
  console.error(
    `open-skill-kit: ${error instanceof Error ? error.message : 'Command failed'}`,
  );
  process.exitCode = 1;
}
