import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import {
  buildCatalog,
  readSkillFiles,
} from '../packages/catalog-indexer/src/index';

export async function buildNpmPackage(
  repositoryRoot: string,
  outDir: string,
  skillsRoot = join(repositoryRoot, 'skills'),
) {
  const { catalog } = await buildCatalog(skillsRoot);
  // The output must be a dedicated build directory, never a repository/source directory.
  const target = resolve(outDir);
  if (
    target === resolve(repositoryRoot) ||
    basename(target) !== 'npm' ||
    basename(dirname(target)) !== 'dist'
  )
    throw new Error('npm output must be a dedicated directory under dist');
  await rm(target, { recursive: true, force: true });
  await mkdir(join(target, 'bin'), { recursive: true });
  await mkdir(join(target, 'data'), { recursive: true });
  const rootManifest = JSON.parse(
    await readFile(join(repositoryRoot, 'package.json'), 'utf8'),
  ) as { version: string; engines: { node: string } };
  const bundle = await build({
    entryPoints: [join(repositoryRoot, 'packages/cli/src/cli.ts')],
    outfile: join(target, 'bin/open-skill-kit.js'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    metafile: true,
    banner: {
      js: '#!/usr/bin/env node\nimport { createRequire as __createRequire } from "node:module";\nconst require = __createRequire(import.meta.url);',
    },
    legalComments: 'eof',
  });
  const dependencyNotices = new Map<string, string>();
  for (const input of Object.keys(bundle.metafile.inputs)) {
    if (!input.includes('node_modules/')) continue;
    let directory = dirname(resolve(input));
    while (dirname(directory) !== directory) {
      let dependency: { name?: string; version?: string } | undefined;
      try {
        dependency = JSON.parse(
          await readFile(join(directory, 'package.json'), 'utf8'),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (dependency?.name) {
        const key = `${dependency.name}@${dependency.version}`;
        if (!dependencyNotices.has(key)) {
          const licenses = (await readdir(directory))
            .filter((name) =>
              /^(licen[cs]e|copying|notice)([.-]|$)/i.test(name),
            )
            .sort();
          if (!licenses.length)
            throw new Error(`Missing bundled dependency license: ${key}`);
          const notices = await Promise.all(
            licenses.map((name) => readFile(join(directory, name), 'utf8')),
          );
          dependencyNotices.set(key, `${key}\n${notices.join('\n')}`);
        }
        break;
      }
      directory = dirname(directory);
    }
  }
  await writeFile(
    join(target, 'THIRD_PARTY_NOTICES.txt'),
    [...dependencyNotices]
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([, notice]) => notice)
      .join('\n\n---\n\n'),
  );
  await chmod(join(target, 'bin/open-skill-kit.js'), 0o755);
  await writeFile(
    join(target, 'data/catalog.json'),
    JSON.stringify(catalog, null, 2) + '\n',
  );
  for (const entry of catalog.skills) {
    const files = await readSkillFiles(join(skillsRoot, entry.metadata.id));
    for (const [path, content] of Object.entries(files)) {
      const destination = join(target, 'data/skills', entry.metadata.id, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }
  }
  const manifest = {
    name: 'open-skill-kit',
    version: rootManifest.version,
    description:
      'Browse and copy portable, human-reviewed SKILL.md packages from an open-source library.',
    type: 'module',
    license: 'MIT',
    engines: rootManifest.engines,
    bin: { 'open-skill-kit': './bin/open-skill-kit.js' },
    files: [
      'bin/',
      'data/',
      'README.md',
      'LICENSE',
      'release-check.js',
      'THIRD_PARTY_NOTICES.txt',
    ],
    repository: {
      type: 'git',
      url: 'git+https://github.com/sarangp3010/open-skill-kit.git',
    },
    homepage: 'https://github.com/sarangp3010/open-skill-kit#readme',
    bugs: { url: 'https://github.com/sarangp3010/open-skill-kit/issues' },
    keywords: ['agent-skills', 'skills', 'ai', 'markdown', 'cli'],
    publishConfig: {
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    },
    scripts: { prepublishOnly: 'node release-check.js' },
  };
  await writeFile(
    join(target, 'package.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  await writeFile(
    join(target, 'release-check.js'),
    `import { readFileSync } from 'node:fs';\nconst catalog = JSON.parse(readFileSync(new URL('./data/catalog.json', import.meta.url), 'utf8'));\nif (!catalog.skills.length || catalog.skills.some((entry) => entry.metadata.status !== 'published')) {\n  console.error('Release blocked: at least one reviewed, published skill is required.');\n  process.exitCode = 1;\n}\n`,
  );
  await copyFile(join(repositoryRoot, 'LICENSE'), join(target, 'LICENSE'));
  await copyFile(
    join(repositoryRoot, 'packages/cli/README.md'),
    join(target, 'README.md'),
  );
  return { directory: target, published: catalog.skills.length };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await buildNpmPackage(resolve('.'), resolve('dist/npm'));
  console.log(
    `Built npm package in ${result.directory}; ${result.published} published skills. No package was published.`,
  );
}
