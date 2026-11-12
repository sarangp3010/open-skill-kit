import { assertReleaseLicenseEvidence } from './release-license-gate';
import {
  thirdPartyNotices,
  type DependencyNoticeRecord,
} from './third-party-notices';
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import {
  buildCatalog,
  readSkillFiles,
  readPublicationRegistry,
  isApprovedPackage,
  publicationDigest,
} from '../packages/catalog-indexer/src/index';

export async function buildNpmPackage(
  repositoryRoot: string,
  outDir: string,
  skillsRoot = join(repositoryRoot, 'skills'),
  options: { release?: boolean } = {},
) {
  const { catalog } = await buildCatalog(skillsRoot);
  const registry = await readPublicationRegistry(dirname(resolve(skillsRoot)));
  const allowed = [];
  for (const entry of catalog.skills) {
    const files = await readSkillFiles(join(skillsRoot, entry.metadata.id));
    if (
      isApprovedPackage(
        entry.metadata.id,
        files,
        entry.metadata.status,
        registry,
      )
    )
      allowed.push(entry);
  }
  catalog.skills = allowed;
  // The output must be a dedicated build directory, never a repository/source directory.
  const target = resolve(outDir);
  if (
    target === resolve(repositoryRoot) ||
    basename(target) !== 'npm' ||
    basename(dirname(target)) !== 'dist'
  )
    throw new Error('npm output must be a dedicated directory under dist');
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
    write: false,
    banner: {
      js: '#!/usr/bin/env node\nimport { createRequire as __createRequire } from "node:module";\nconst require = __createRequire(import.meta.url);',
    },
    legalComments: 'eof',
  });
  const dependencies: DependencyNoticeRecord[] = [];
  const locations = new Map<string, string>();
  const notices = await thirdPartyNotices(
    Object.keys(bundle.metafile.inputs),
    join(repositoryRoot, 'third-party'),
    (record, directory) => {
      dependencies.push(record);
      locations.set(`${record.name}@${record.version}`, directory);
    },
  );
  if (options.release) {
    // Check licensing independently, before the skill-count guard and any output writes.
    await assertReleaseLicenseEvidence(repositoryRoot, dependencies, locations);
    if (!catalog.skills.length)
      throw new Error(
        'Release blocked: at least one reviewed, published skill is required',
      );
  }
  await rm(target, { recursive: true, force: true });
  await mkdir(join(target, 'bin'), { recursive: true });
  await mkdir(join(target, 'data'), { recursive: true });
  await writeFile(
    join(target, 'bin/open-skill-kit.js'),
    bundle.outputFiles[0].contents,
  );
  await writeFile(join(target, 'THIRD_PARTY_NOTICES.txt'), notices);
  await writeFile(
    join(target, 'DEPENDENCY_MANIFEST.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        dependencies: dependencies.sort((a, b) =>
          (a.name + '@' + a.version).localeCompare(
            b.name + '@' + b.version,
            'en',
          ),
        ),
      },
      null,
      2,
    ) + '\n',
  );
  await chmod(join(target, 'bin/open-skill-kit.js'), 0o755);
  const serializedCatalog = JSON.stringify(catalog, null, 2) + '\n';
  const packageHashes: Record<string, string> = {};
  await writeFile(join(target, 'data/catalog.json'), serializedCatalog);
  for (const entry of catalog.skills) {
    const files = await readSkillFiles(join(skillsRoot, entry.metadata.id));
    packageHashes[entry.metadata.id] = registry.decisions.find(
      (record) => record.skillId === entry.metadata.id,
    )!.packageDigest;
    if (publicationDigest(files) !== packageHashes[entry.metadata.id])
      throw new Error(
        'Package changed during build; renew review before copying: ' +
          entry.metadata.id,
      );
    for (const [path, content] of Object.entries(files)) {
      const destination = join(target, 'data/skills', entry.metadata.id, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }
  }
  const manifest = {
    name: 'open-skill-kit',
    private: !options.release,
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
      'DEPENDENCY_MANIFEST.json',
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
  const licenseIntegrity: Record<string, string> = {};
  licenseIntegrity.LICENSE = createHash('sha256')
    .update(await readFile(join(repositoryRoot, 'LICENSE')))
    .digest('hex');
  for (const file of ['DEPENDENCY_MANIFEST.json', 'THIRD_PARTY_NOTICES.txt'])
    licenseIntegrity[file] = createHash('sha256')
      .update(await readFile(join(target, file)))
      .digest('hex');
  await writeFile(
    join(target, 'release-check.js'),
    `import { readFileSync,readdirSync,lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const hash = value => createHash('sha256').update(value).digest('hex');
const raw=readFileSync(new URL('./data/catalog.json',import.meta.url));
const expectedCatalogHash=${JSON.stringify(createHash('sha256').update(serializedCatalog).digest('hex'))};
const expectedPackages=${JSON.stringify(packageHashes)};
try {
 if(!${JSON.stringify(Boolean(options.release))})throw new Error('Development artifact is private; an explicit licensed release build is required');
 const expectedLicenses=${JSON.stringify(licenseIntegrity)};
 for(const [file,digest] of Object.entries(expectedLicenses))if(hash(readFileSync(new URL('./'+file,import.meta.url)))!==digest)throw new Error('Release license evidence changed: '+file);
 if(hash(raw)!==expectedCatalogHash)throw new Error('Catalog changed since approved build');
 const catalog=JSON.parse(raw);
 if(!catalog.skills.length || catalog.skills.some(entry=>entry.metadata.status!=='published')) throw new Error('at least one reviewed, published skill is required');
 const dataRoot=fileURLToPath(new URL('./data/',import.meta.url));
 if(JSON.stringify(readdirSync(dataRoot).sort())!==JSON.stringify(['catalog.json','skills']))throw new Error('Unexpected data files');
 const actualIds=[];const skillRoot=join(dataRoot,'skills');
 for(const sector of readdirSync(skillRoot))for(const slug of readdirSync(join(skillRoot,sector)))actualIds.push(sector+'/'+slug);
 if(JSON.stringify(actualIds.sort())!==JSON.stringify(Object.keys(expectedPackages).sort()))throw new Error('Unapproved package directory');
 for(const entry of catalog.skills) {
  const directory=new URL('./data/skills/'+entry.metadata.id+'/',import.meta.url),files={};
  function walk(path,prefix='') {
   const info=lstatSync(path);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('Unsafe package directory');
   for(const name of readdirSync(path).sort()) {const file=join(path,name),stat=lstatSync(file),relative=prefix+name;
    if(stat.isSymbolicLink())throw new Error('Unsafe package link');
    if(stat.isDirectory())walk(file,relative+'/');else {if(!stat.isFile())throw new Error('Unsafe package file');files[relative]=readFileSync(file,'utf8');}
   }
  }
  walk(fileURLToPath(directory));
  const digest=hash(JSON.stringify(Object.keys(files).sort().map(path=>[path,files[path]])));
  if(digest!==expectedPackages[entry.metadata.id])throw new Error('Package changed since approved build: '+entry.metadata.id);
 }
} catch(error) {console.error('Release blocked: '+error.message);process.exitCode=1;}
`,
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
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && args[0] !== '--release'))
    throw new Error('Usage: build-npm.ts [--release]');
  const result = await buildNpmPackage(
    resolve('.'),
    resolve('dist/npm'),
    undefined,
    { release: args[0] === '--release' },
  );
  console.log(
    `Built npm package in ${result.directory}; ${result.published} published skills. No package was published.`,
  );
}
