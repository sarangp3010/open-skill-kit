import { execFileSync } from 'node:child_process';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve, relative, isAbsolute, win32 } from 'node:path';
import { sameFilesystemPath } from '../packages/catalog-indexer/src/path-identity';
import { fileURLToPath } from 'node:url';
import { generateFoundingReview } from './founding-review';
import { localModeration } from './check-moderation';
import { evidenceDigest } from '../packages/catalog-indexer/src/maintainer-review';
import { directoryPath } from '../packages/skill-installer/src/filesystem';
import type { provenanceInventory } from './audit-provenance';
export const preservedPacketDirectory = 'docs/owner-decision';
export const packetDirectory = 'docs/owner-decision/current';
export const preservedEvidencePath = `${preservedPacketDirectory}/dependency-evidence.json`;
const preservedEvidenceSha256 =
  '8e7f450b499fef3ca2c1e8cd9fc1cb2df4341dbe24f86ce3288388e1edea2280';
const historicalNoticeKeys = new Set([
  'keyv@4.5.4',
  'react-remove-scroll-bar@2.3.8',
  'stackback@0.0.2',
]);
const repositoryLink = (path: string) =>
  relative(packetDirectory, path).replaceAll('\\', '/');
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
type Inventory = Awaited<ReturnType<typeof provenanceInventory>>;
export interface FileReference {
  path: string;
  sha256: string;
}
interface BundleObservation {
  root: string;
  manifest: FileReference;
  dependencies: { name: string; version: string; manifestSha256: string }[];
  buildCommit: null;
}
const guidance: Record<string, { purpose: string; question: string }> = {
  '@esbuild/darwin-arm64': {
    purpose: 'Native esbuild build executable',
    question:
      'Confirm which upstream MIT notice and release cover this exact native artifact. If redistributing the binary, retain its applicable notices; an installed binary is not proof it was shipped or executed.',
  },
  '@humanfs/types': {
    purpose: 'ESLint filesystem type definitions',
    question:
      'Locate the applicable Apache-2.0 license and any NOTICE in the exact upstream release; confirm whether package-level inheritance covers these type declarations.',
  },
  '@rollup/rollup-darwin-arm64': {
    purpose: 'Native Rollup/Vite build binding',
    question:
      'Identify the notice and release linkage for this exact native binding, including any native components; confirm requirements before binary redistribution.',
  },
  '@tailwindcss/oxide-wasm32-wasi': {
    purpose: 'Optional WASM/native Tailwind build tooling',
    question:
      'Confirm the exact WASM/native artifact notices and any component obligations. Locked/installed presence does not establish execution; inspect the artifact before redistributing tooling.',
  },
  esrecurse: {
    purpose: 'ESLint AST traversal tooling',
    question:
      'Inspect embedded source copyright/BSD-2-Clause text and the exact upstream release. Does the embedded text supply the complete notice, and would it survive any intended redistribution?',
  },
  imurmurhash: {
    purpose: 'Development lint/hash tooling',
    question:
      'Locate complete MIT copyright/permission text for this exact release, including embedded or upstream material; confirm retention if redistributing it.',
  },
  keyv: {
    purpose: 'Retained local JS inventory record; active use unproven',
    question:
      'This exact 4.5.4 record is absent from the current lockfile; current keyv entries use a different version. Reproduce a frozen install before claiming active use, and inspect applicable notices if retaining/redistributing this local copy.',
  },
  'natural-compare': {
    purpose: 'ESLint comparison tooling',
    question:
      'Locate the exact release copyright and complete MIT notice in source/upstream materials. A license label alone does not supply that evidence.',
  },
  'react-remove-scroll-bar': {
    purpose: 'Browser modal/scroll runtime',
    question:
      'Obtain exact 2.3.8 source/notice provenance or a reviewed replacement. The retained notice is from a 2.3.7 commit; matching MIT declarations do not establish exact-release provenance. Do not accept the exception automatically.',
  },
  saxes: {
    purpose: 'jsdom/test XML parsing',
    question:
      'Inspect the exact release source for complete ISC copyright/permission text and verify notice retention if redistributing testing tools.',
  },
  stackback: {
    purpose: 'Retained local JS inventory record; active use unproven',
    question:
      'The exact 0.0.2 record is absent from the current lockfile. Reproduce current installation and establish whether this copy is needed; locate full MIT notice evidence before any redistribution.',
  },
};
const nativeNames = new Set([
  '@esbuild/darwin-arm64',
  '@rollup/rollup-darwin-arm64',
  '@tailwindcss/oxide-wasm32-wasi',
]);
export function dependencyClass(
  name: string,
  version: string,
  bundles: BundleObservation[],
  locked: boolean,
) {
  const distributed = bundles
    .filter((bundle) =>
      bundle.dependencies.some(
        (record) => record.name === name && record.version === version,
      ),
    )
    .map((bundle) => bundle.root);
  if (distributed.length)
    return { role: 'distributed-runtime', distributedIn: distributed };
  if (!bundles.length)
    return { role: 'distribution-unobserved', distributedIn: [] };
  return {
    role: !locked
      ? 'unreferenced-local-record'
      : nativeNames.has(name)
        ? 'native-build-tooling'
        : 'development-only-js-or-types',
    distributedIn: [],
  };
}
async function ref(root: string, path: string): Promise<FileReference> {
  return { path, sha256: evidenceDigest(await readFile(join(root, path))) };
}
export async function noticeEvidence(root: string, inventory: Inventory) {
  await directoryPath(join(root, preservedPacketDirectory), false);
  const info = await lstat(join(root, preservedEvidencePath));
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
    throw new Error('Unsafe preserved historical notice evidence');
  const preservedBytes = await readFile(
    join(root, preservedEvidencePath),
    'utf8',
  );
  if (evidenceDigest(preservedBytes) !== preservedEvidenceSha256)
    throw new Error(
      'Preserved historical notice evidence changed; retain the original bytes',
    );
  const preserved = JSON.parse(preservedBytes) as {
    triage: (Inventory['dependencies'][number] & {
      key: string;
      recordedException: Inventory['unresolvedDependencyNotices'][number]['recordedException'];
    })[];
  };
  const expectedActive = preserved.triage
    .filter((item) => !historicalNoticeKeys.has(item.key))
    .map((item) => item.key)
    .sort();
  const actualActive = inventory.unresolvedDependencyNotices
    .map((item) => `${item.name}@${item.version}`)
    .sort();
  if (JSON.stringify(expectedActive) !== JSON.stringify(actualActive))
    throw new Error(
      'Active notice scope changed; review triage before preparing a packet',
    );
  if (
    inventory.dependencies.some((item) =>
      historicalNoticeKeys.has(`${item.name}@${item.version}`),
    )
  )
    throw new Error(
      'Historical-only versions must not be restored to the active inventory',
    );
  const historicalEvidenceReference = await ref(root, preservedEvidencePath);
  return { preserved, actualActive, historicalEvidenceReference };
}
export async function sourceSnapshot(root: string, supplied?: string[]) {
  const paths =
    supplied ??
    execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { cwd: root, encoding: 'utf8' },
    )
      .split('\0')
      .filter(Boolean);
  const files: FileReference[] = [];
  for (const path of [...new Set(paths)].sort()) {
    if (path.startsWith(packetDirectory + '/')) continue;
    if (
      isAbsolute(path) ||
      win32.isAbsolute(path) ||
      path.includes('\\') ||
      path.includes(':')
    )
      throw new Error(
        'Source snapshot escapes repository or uses a nonportable path',
      );
    const absolute = resolve(root, path),
      within = relative(resolve(root), absolute);
    if (
      within === '..' ||
      within.startsWith('../') ||
      within.startsWith('..\\') ||
      absolute === resolve(root)
    )
      throw new Error('Source snapshot escapes repository');
    try {
      const info = await lstat(absolute);
      if (
        !info.isFile() ||
        info.isSymbolicLink() ||
        !sameFilesystemPath(await realpath(absolute), absolute)
      )
        throw new Error(`Unsupported snapshot entry: ${path}`);
      files.push(await ref(root, path));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return { files, sha256: evidenceDigest(json(files)) };
}
export async function collectOwnerDecisionData(
  root: string,
  options: {
    sourcePaths?: string[];
    head?: string | null;
    artifactRoots?: string[];
  } = {},
) {
  const reports = await generateFoundingReview(root, true);
  const registry = await localModeration(root);
  const shortlist = reports
    .filter((report) => report.launchRecommendation.rank !== null)
    .sort(
      (a, b) => a.launchRecommendation.rank! - b.launchRecommendation.rank!,
    );
  if (shortlist.length !== 12)
    throw new Error(
      'Expected the current 12-skill founding shortlist; review scope changes manually',
    );
  const inventoryPath = 'docs/launch/PROVENANCE_INVENTORY.json';
  const inventory = JSON.parse(
    await readFile(join(root, inventoryPath), 'utf8'),
  ) as Inventory;
  const lock = await readFile(join(root, 'pnpm-lock.yaml'), 'utf8');
  if (evidenceDigest(lock) !== inventory.lockfileSha256)
    throw new Error(
      'Provenance lockfile evidence is stale; review/regenerate the inventory',
    );
  const { preserved, actualActive, historicalEvidenceReference } =
    await noticeEvidence(root, inventory);
  const bundles: BundleObservation[] = [],
    artifacts: FileReference[] = [];
  for (const directory of options.artifactRoots ?? [
    'dist/npm',
    'apps/web/dist',
  ]) {
    await directoryPath(join(root, directory), false);
    const path = `${directory}/DEPENDENCY_MANIFEST.json`;
    let raw: string;
    try {
      raw = await readFile(join(root, path), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    const value = JSON.parse(raw);
    if (value.schemaVersion !== 1 || !Array.isArray(value.dependencies))
      throw new Error(`Invalid observed dependency manifest: ${path}`);
    for (const record of value.dependencies)
      if (
        !inventory.dependencies.some(
          (item) =>
            item.name === record.name &&
            item.version === record.version &&
            item.manifestSha256 === record.manifestSha256,
        )
      )
        throw new Error(
          `Bundle evidence differs from the recorded inventory: ${record.name}@${record.version}`,
        );
    bundles.push({
      root: directory,
      manifest: await ref(root, path),
      dependencies: value.dependencies.map(
        (record: {
          name: string;
          version: string;
          manifestSha256: string;
        }) => ({
          name: record.name,
          version: record.version,
          manifestSha256: record.manifestSha256,
        }),
      ),
      buildCommit: null,
    });
    async function walk(directoryPath: string, prefix: string) {
      for (const name of (await readdir(directoryPath)).sort()) {
        const disk = join(directoryPath, name),
          info = await lstat(disk),
          path = prefix + '/' + name;
        if (info.isSymbolicLink())
          throw new Error(`Artifact link cannot be decision evidence: ${path}`);
        if (info.isDirectory()) await walk(disk, path);
        else if (info.isFile()) artifacts.push(await ref(root, path));
        else throw new Error(`Unsupported artifact: ${path}`);
      }
    }
    await walk(join(root, directory), directory);
  }
  const rootVersion = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'),
  ).version as string;
  const tarball = `dist/open-skill-kit-${rootVersion}.tgz`;
  try {
    const info = await lstat(join(root, tarball));
    if (!info.isFile() || info.isSymbolicLink())
      throw new Error('Unsafe observed tarball');
    artifacts.push(await ref(root, tarball));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const inventoryReference = await ref(root, inventoryPath);
  const triage = preserved.triage.map((original, index) => {
    const historicalOnly = historicalNoticeKeys.has(original.key);
    const item = historicalOnly
      ? original
      : inventory.unresolvedDependencyNotices.find(
          (item) => `${item.name}@${item.version}` === original.key,
        );
    if (!item) throw new Error(`Missing notice evidence: ${original.key}`);
    const advice = guidance[item.name];
    if (!advice)
      throw new Error(`No reviewed triage guidance for ${item.name}`);
    const record = historicalOnly
      ? original
      : inventory.dependencies.find(
          (dependency) =>
            dependency.name === item.name &&
            dependency.version === item.version,
        );
    if (!record)
      throw new Error(`Missing exact notice record: ${original.key}`);
    if (record.manifestSha256 !== original.manifestSha256)
      throw new Error(
        `Notice manifest changed; review exact release: ${original.key}`,
      );
    const key = `${item.name}@${item.version}`;
    const lockHeadings = lock
      .split('\n')
      .flatMap((line, i) =>
        line.startsWith('  ') &&
        !line.startsWith('    ') &&
        (line.trimStart().startsWith(key + ':') ||
          line.trimStart().startsWith("'" + key + "':") ||
          line.trimStart().startsWith("'" + key + '('))
          ? [{ line: i + 1, text: line }]
          : [],
      );
    if (historicalOnly && lockHeadings.length)
      throw new Error(
        `Historical-only notice unexpectedly appears in the current lockfile: ${key}`,
      );
    return {
      evidenceId: `D${index + 1}`,
      ...record,
      key,
      evidenceStatus: historicalOnly
        ? ('historical-only' as const)
        : ('active-inventory' as const),
      evidenceSource: historicalOnly
        ? historicalEvidenceReference
        : inventoryReference,
      ...(historicalOnly
        ? { role: 'historical-only', distributedIn: [] as string[] }
        : dependencyClass(
            item.name,
            item.version,
            bundles,
            lockHeadings.length > 0,
          )),
      purpose: advice.purpose,
      lockHeadings,
      recordedException: item.recordedException,
      question: historicalOnly
        ? `Historical evidence only from the preserved 2799067 packet; not a current installed or distributed dependency claim. ${advice.question}`
        : advice.question,
      disposition: null,
      reviewer: null,
      reviewedAt: null,
    };
  });
  const skills = await Promise.all(
    shortlist.map(async (report) => {
      const instructionPath = `skills/${report.skillId}/SKILL.md`,
        instructions = await readFile(join(root, instructionPath), 'utf8');
      const reportPath = `reviews/founding/reports/${report.skillId}.json`;
      return {
        report,
        instructions,
        instructionPath,
        reportReference: await ref(root, reportPath),
      };
    }),
  );
  return {
    skills,
    triage,
    bundles,
    artifacts,
    inventoryReference: inventoryReference,
    historicalEvidenceReference,
    noticeScope: {
      active: actualActive.length,
      historical: triage.filter(
        (item) => item.evidenceStatus === 'historical-only',
      ).length,
    },
    inventoryPlatform: inventory.dependencyInventoryPlatform,
    source: await sourceSnapshot(root, options.sourcePaths),
    head:
      options.head === undefined
        ? execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: root,
            encoding: 'utf8',
          }).trim()
        : options.head,
    version: rootVersion,
    counts: {
      source: reports.length,
      drafts: reports.filter((report) => report.sourceStatus === 'draft')
        .length,
      approved: registry.decisions.filter(
        (record) => record.decision === 'approved',
      ).length,
    },
    maintainers: JSON.parse(
      await readFile(join(root, 'catalog/maintainers.json'), 'utf8'),
    ).maintainers as string[],
  };
}
export type OwnerDecisionData = Awaited<
  ReturnType<typeof collectOwnerDecisionData>
>;
const decisionFields =
  '**Owner decision (choose exactly one):** [ ] Approve · [ ] Reject · [ ] Defer — **unselected**.\n\nReviewer: __________ · actual review date: __________ · rationale / evidence / conditions: __________';
export function instructionDisplay(text: string) {
  return (
    '<pre><code>' +
    text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('[', '&#91;')
      .replaceAll(']', '&#93;') +
    '</code></pre>'
  );
}
export function renderSkillDecisions(data: OwnerDecisionData) {
  return `# Owner decisions: 12 founding candidates\n\nUnsigned worksheet. All fields below are blank; no maintainer approval is recorded. Read each complete instruction set and every linked package/evidence file before choosing. Risks are preliminary content triage, not independent safety review.\n\nAn explicit content decision applies only to the displayed package hash. Filling this worksheet cannot publish or create a maintainer record. Any package edit, including metadata promotion, invalidates this worksheet for the new bytes. Final publication still requires a real authorized maintainer's exact-content record and genuine current-head GitHub review/merge through the [existing workflow](${repositoryLink('docs/founding-skills-review.md')}). Never reuse a draft hash for promoted contents.\n\n${data.skills.map(({ report, instructions, instructionPath, reportReference }) => `## ${report.launchRecommendation.rank}. ${report.title}\n\n**Purpose:** ${report.usefulness.proposedTask}\n\n**Package:** \`${report.skillId}\` · ${report.sourceStatus} · declared risk **${report.safety.declaredRisk}**.\n\n**Exact package SHA-256:** \`${report.packageDigest}\`\n\n**Risk assessment:** ${report.safety.concerns}\n\n**Outstanding action:** ${report.completeness.nextReview}\n\n**Evidence limits:** ${report.evaluation.fixtureDefinitions.length} authored suite(s); ${report.evaluation.completedArtifacts.length} stored artifact(s)${report.evaluation.completedArtifacts.length ? ` (${report.evaluation.completedArtifacts.map((artifact) => artifact.mode + '/' + artifact.verification).join(', ')})` : ''}. Authored examples/behavior cases are expectations; fixture replays do not show agent effectiveness. No completed platform behavior tests or independent rights/security/domain certification is supplied.\n\n[Full risk/quality/evidence report](${repositoryLink(reportReference.path)}) · report SHA-256: \`${reportReference.sha256}\`.\n\n${decisionFields}\n\n<details>\n<summary>Complete instructions — ${report.title} (unapproved source)</summary>\n\n${instructionDisplay(instructions)}\n\n</details>\n\n[Canonical SKILL.md](${repositoryLink(instructionPath)}). Also inspect every supporting file: ${report.sourceFiles.map((file) => `[${file.path.split('/').slice(3).join('/')}](${repositoryLink(file.path)})`).join(' · ')}. The unsigned manifest binds all file hashes.\n`).join('\n')}`;
}
export function renderDependencyTriage(data: OwnerDecisionData) {
  return `# Dependency notice triage — unresolved, no disposition selected\n\nScope: **${data.triage.length}** retained cases: **${data.noticeScope.active} active inventory cases** and **${data.noticeScope.historical} historical-only cases**. The eleven-case original review scope is preserved without restoring obsolete versions to the active inventory. Recorded inventory platform: \`${data.inventoryPlatform}\`; [inventory](${repositoryLink(data.inventoryReference.path)}) SHA-256 \`${data.inventoryReference.sha256}\`. Declared license strings are not independent rights evidence; an absent standalone file is not proof that no grant exists.\n\nDistribution classification uses observed bundle dependency manifests, not only package.json devDependencies labels. ${data.bundles.length ? data.bundles.map((bundle) => `\`${bundle.root}\`: ${bundle.dependencies.length} records; manifest SHA-256 \`${bundle.manifest.sha256}\``).join('; ') : 'No output manifests observed: distribution remains unverified.'}. These local outputs have **no attested build commit**; final artifacts must be rebuilt/reviewed. Absence from these outputs is not proof of absence from a different build. The [machine-readable evidence snapshot](dependency-evidence.json) retains full records and exact lockfile headings.\n\n| Case | Declared license | Distribution / role | Recorded manifest SHA-256 (current or historical) | Unresolved question |\n| --- | --- | --- | --- | --- |\n${data.triage.map((item) => `| ${item.evidenceId}: \`${item.key}\` | ${typeof item.license === 'string' ? item.license : JSON.stringify(item.license)} | ${item.evidenceStatus}; ${item.role}; ${item.distributedIn.join(', ') || 'not observed in distributed outputs'}; ${item.purpose} | \`${item.manifestSha256}\` | ${item.question} |`).join('\n')}\n\n## Decisions still needed\n\nThe runtime case affects browser redistribution. The development/native cases concern tooling redistribution and source/inherited notices; do not call them unlicensed merely because notices[] is empty. keyv@4.5.4 and stackback@0.0.2 have no matching current inventory or lockfile entries. They are historical-only records from [the preserved evidence](${repositoryLink(preservedEvidencePath)}), SHA-256 \`${data.historicalEvidenceReference.sha256}\`, not current installation/distribution evidence. Reproduce a frozen install before attributing current use; do not silently delete local evidence. For native/WASM cases, installed/locked presence does not establish execution.\n\nFor each case: disposition __________; actual reviewer/date __________; exact upstream/embedded notice evidence and release linkage __________; required packaging action __________. None is prefilled or accepted.\n\n## react-remove-scroll-bar exception\n\n${data.triage
    .filter((item) => item.name === 'react-remove-scroll-bar')
    .map(
      (item) =>
        `The recorded exception states: ${item.recordedException?.note}\n\nRetained source: ${item.recordedException?.source}\n\nRetained notice SHA-256: \`${item.recordedException?.sha256}\`; [override](${repositoryLink('third-party/license-overrides.json')}) and [notice](${repositoryLink(`third-party/${item.recordedException?.file}`)}). Confirm exact 2.3.8 notice provenance or review a replacement; do not convert a 2.3.7 source label into exact-release verification.`,
    )
    .join('\n')}\n`;
}
export function unsignedReleaseManifest(data: OwnerDecisionData) {
  return {
    schemaVersion: 1,
    kind: 'unsigned-owner-decision-package',
    notAnApprovalRecord: true,
    headObserved: data.head,
    candidateVersionObserved: data.version,
    sourceSnapshot: data.source,
    observedArtifacts: {
      buildCommit: null,
      associationWithFinalRelease: 'unproven-rebuild-and-review-required',
      files: data.artifacts,
    },
    inputs: {
      inventory: data.inventoryReference,
      historicalNoticeEvidence: data.historicalEvidenceReference,
      bundleManifests: data.bundles.map((bundle) => bundle.manifest),
    },
    currentCounts: data.counts,
    authorizedMaintainersSnapshot: data.maintainers,
    skills: data.skills.map(
      ({ report, reportReference, instructionPath, instructions }) => ({
        skillId: report.skillId,
        packageDigest: report.packageDigest,
        sourceStatus: report.sourceStatus,
        reportReference,
        instructionPath,
        instructions,
        files: report.sourceFiles,
        ownerDecision: null,
        reviewer: null,
        reviewedAt: null,
        rationale: null,
      }),
    ),
    noticeDispositions: data.triage.map((item) => ({
      key: item.key,
      manifestSha256: item.manifestSha256,
      evidenceStatus: item.evidenceStatus,
      evidenceSource: item.evidenceSource,
      disposition: null,
      reviewer: null,
      evidence: null,
    })),
    remoteConfiguration: {
      visibility: null,
      plan: null,
      requiredChecks: null,
      reviewRules: null,
      pagesEnvironment: null,
      confidentialReporting: null,
      hostedCrossPlatformResults: null,
    },
    authorization: {
      state: 'unsigned',
      authorizedBy: null,
      authorizedAt: null,
      signature: null,
      actions: {
        commit: null,
        push: null,
        publishNpm: null,
        deployPages: null,
        modifyGitHubSettings: null,
        changeVisibility: null,
      },
    },
  };
}
export function renderReleaseAuthorization() {
  return `# Release authorization worksheet — unsigned and not authorized\n\nNo item is selected, no reviewer is named and no signature/date is supplied. The [manifest](release-manifest.unsigned.json) is a source/artifact observation plus blank planning fields; it is not accepted by the skill approval schema or publication ledger and has no importer.\n\n## Before an actual authorization\n\n- [ ] Confirm rights/provenance for source, all candidate packages and any adapted material. Resolve or explicitly bound each notice case with authentic evidence; no silent exception acceptance.\n- [ ] Complete approve/reject/defer choices for each exact candidate hash after reading all files, concerns and evidence limitations. Use an actual authorized maintainer; obtain domain review where needed.\n- [ ] Finish candidate edits/promotion first, regenerate hashes/reports and obtain renewed exact-content review. Final approval requires the existing real review record, genuine current-head GitHub approval and authorized merge. Editing this worksheet cannot supply those.\n- [ ] Verify main protection, required checks, trusted reviewer permissions, fork token/secret restrictions and an operational confidential reporting route. Record actual settings and who checked them, not assumed values.\n- [ ] Observe successful Ubuntu validate/audit and public-only Windows/macOS portability runs for the exact final commit; skipped jobs are not passes or native evidence.\n- [ ] Confirm repository visibility/plan and available free controls. Private/free limitations must remain blockers; never buy a feature or expose drafts automatically.\n- [ ] Rebuild/revalidate the final reviewed candidate; inspect license notices, published catalog, every ZIP/npm file and actual tarball/web hashes. Observed artifacts in this packet are not tied to an attested build commit.\n- [ ] Choose final version and verify npm account/package ownership, release notes and any rollback/removal plan. Empty approved distribution remains blocked.\n- [ ] Explicitly consider that a public repository/site exposes the source draft library even when /published is empty. A publication status does not provide confidentiality.\n\n## Separate explicit actions — none granted\n\n| Action | Exact commit/source/artifact hash and scope | Authorized maintainer | Actual date | Decision / signature |\n| --- | --- | --- | --- | --- |\n| Commit local changes | __________ | __________ | __________ | __________ |\n| Push reviewed commit (may trigger CI; no deployment workflow exists) | __________ | __________ | __________ | __________ |\n| Publish npm package | __________ | __________ | __________ | __________ |\n| Deploy Pages artifact | __________ | __________ | __________ | __________ |\n| Modify GitHub settings | __________ | __________ | __________ | __________ |\n| Change repository visibility | __________ | __________ | __________ | __________ |\n\nAn actual owner must authorize each intended action separately after review. Do not infer permission from green checks, a skill-content decision or a different action. The current workflows validate only: main/develop pushes and manual CI dispatch do not deploy or publish. A future deployment implementation, settings change and execution would need separate explicit authorization. Rebuilds or edits can change hashes and invalidate earlier authorization.\n\nUse [the GitHub walkthrough](${repositoryLink('docs/launch/GITHUB_SETTINGS.md')}) and [the formal skill review procedure](${repositoryLink('docs/founding-skills-review.md')}). Regeneration refuses to overwrite changed owner paperwork; archive it deliberately before making a fresh packet. No command in this package signs or authorizes anything.\n`;
}
export function decisionPackageFiles(data: OwnerDecisionData) {
  const manifest = unsignedReleaseManifest(data);
  return new Map([
    [
      'README.md',
      `# Open Skill Kit — owner decision package\n\n**Unsigned; no approvals or release actions are granted.** Observed baseline: \`${data.head ?? 'unrecorded'}\`; ${data.counts.drafts}/${data.counts.source} source drafts, ${data.counts.approved} publication approvals.\n\n1. [Read all 12 skill instructions, risks and blank approve/reject/defer fields](SKILL_DECISIONS.md).\n2. [Triage all 11 notice cases](DEPENDENCY_TRIAGE.md), using [exact evidence](dependency-evidence.json).\n3. Follow the [GitHub configuration walkthrough](${repositoryLink('docs/launch/GITHUB_SETTINGS.md')}); retain the merged CI evidence and distinguish it from an owner attestation or approval. No new hosted run was performed for this packet.\n4. Complete the [release authorization checklist](RELEASE_AUTHORIZATION.md) and review [the unsigned manifest](release-manifest.unsigned.json), without treating it as a signed record.\n\nEvery decision must be a real authorized maintainer action bound to the exact current package hash. Any edit, including promotion metadata, requires renewed review. A filled worksheet alone cannot publish, authenticate a person or substitute for genuine GitHub approval/merge. No results of real agents, independent rights/domain/security review, or hosted checks are invented.\n\nReproduce locally: \`pnpm owner:prepare\`; verify read-only: \`pnpm owner:check\`. See [the local validation receipt](VALIDATION.md) for actual checks; it grants no permission. Freshness includes tracked/untracked source outside current/, the preserved original packet and rebuilt artifact bytes. The original parent worksheets remain byte-for-byte unchanged; this refreshed packet is separate. HEAD is an observation of the baseline, not a claim that uncommitted source or artifacts were built from that commit. Generation never overwrites a changed existing worksheet or creates a maintainer decision. Preserve completed paperwork and use the formal review process.\n`,
    ],
    ['SKILL_DECISIONS.md', renderSkillDecisions(data)],
    ['DEPENDENCY_TRIAGE.md', renderDependencyTriage(data)],
    ['RELEASE_AUTHORIZATION.md', renderReleaseAuthorization()],
    [
      'dependency-evidence.json',
      json({
        schemaVersion: 1,
        kind: 'local-observations-not-approval',
        inventory: data.inventoryReference,
        inventoryPlatform: data.inventoryPlatform,
        historicalNoticeEvidence: data.historicalEvidenceReference,
        noticeScope: data.noticeScope,
        observedBundles: data.bundles,
        triage: data.triage,
      }),
    ],
    ['release-manifest.unsigned.json', json(manifest)],
  ]);
}
export async function writeDecisionFiles(
  root: string,
  files: Map<string, string>,
  check = false,
) {
  const allowed = new Set([
    'README.md',
    'SKILL_DECISIONS.md',
    'DEPENDENCY_TRIAGE.md',
    'RELEASE_AUTHORIZATION.md',
    'dependency-evidence.json',
    'release-manifest.unsigned.json',
  ]);
  await directoryPath(join(root, packetDirectory), !check);
  // Preflight every file before writing anything; never overwrite owner edits.
  for (const [name, content] of files) {
    if (!allowed.has(name)) throw new Error('Unsupported decision output');
    const path = join(root, packetDirectory, name);
    try {
      const info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
        throw new Error(`Unsafe owner paperwork: ${name}`);
      if ((await readFile(path, 'utf8')) !== content)
        throw new Error(
          `${name}: changed owner paperwork or stale inputs; archive/review it explicitly before preparing a new unsigned packet`,
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (check)
        throw new Error(`${name}: missing owner decision package`, {
          cause: error,
        });
    }
  }
  if (!check)
    for (const [name, content] of files) {
      const path = join(root, packetDirectory, name);
      await mkdir(dirname(path), { recursive: true });
      try {
        await writeFile(path, content, { flag: 'wx' });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
    }
}
export function checkedBaselineHead(root: string, value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value))
    throw new Error('Invalid owner packet baseline commit');
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', value, 'HEAD'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(
      'Owner packet baseline is not an ancestor of this checkout',
      { cause: error },
    );
  }
  return value;
}
export async function checkDecisionPackage(root: string) {
  const manifest = JSON.parse(
    await readFile(
      join(root, packetDirectory, 'release-manifest.unsigned.json'),
      'utf8',
    ),
  );
  const head = checkedBaselineHead(root, manifest.headObserved);
  const data = await collectOwnerDecisionData(root, { head });
  await writeDecisionFiles(root, decisionPackageFiles(data), true);
  return data;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length && args[0] !== '--check'))
      throw new Error('Usage: owner-decision-package.ts [--check]');
    const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
    if (args[0] === '--check') await checkDecisionPackage(root);
    else
      await writeDecisionFiles(
        root,
        decisionPackageFiles(await collectOwnerDecisionData(root)),
      );
    console.log(
      'Unsigned owner decision package current. No approvals, signatures, release actions or remote changes created.',
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
