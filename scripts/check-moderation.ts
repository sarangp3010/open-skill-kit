import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  generateCatalog,
  publicationDigest,
  readPublicationRegistry,
} from '../packages/catalog-indexer/src/index';
import {
  maintainersSchema,
  type PublicationRegistry,
} from '../packages/skill-schema/src/index';
/** Missing initial base roster must never trust a contributor's candidate roster. */
export function trustedMaintainers(baseRoster: string | undefined) {
  return baseRoster === undefined
    ? ['sarangp3010']
    : maintainersSchema.parse(JSON.parse(baseRoster)).maintainers;
}
const repository = 'sarangp3010/open-skill-kit';
export interface GithubReview {
  id: number;
  state: string;
  commit_id: string;
  user: { login: string } | null;
}
export function hasApproval(
  reviews: GithubReview[],
  reviewer: string,
  head: string,
  author: string,
) {
  if (reviewer.toLowerCase() === author.toLowerCase()) return false;
  const latest = reviews
    .filter(
      (review) =>
        review.user?.login.toLowerCase() === reviewer.toLowerCase() &&
        ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state),
    )
    .sort((a, b) => b.id - a.id)[0];
  return latest?.state === 'APPROVED' && latest.commit_id === head;
}
export function validateDecisionChanges(
  previous: PublicationRegistry,
  current: PublicationRegistry,
  pullRequest: number,
) {
  for (const old of previous.decisions)
    if (!current.decisions.some((record) => record.skillId === old.skillId))
      throw new Error(
        `${old.skillId}: retain a withdrawal decision instead of deleting review history`,
      );
  for (const record of current.decisions) {
    const old = previous.decisions.find(
      (item) => item.skillId === record.skillId,
    );
    if (
      JSON.stringify(old) !== JSON.stringify(record) &&
      record.pullRequest !== pullRequest
    )
      throw new Error(
        `${record.skillId}: changed decisions must reference this PR, not an unrelated historical approval`,
      );
  }
}
export async function localModeration(root: string) {
  const registry = await readPublicationRegistry(root);
  const catalog = (await generateCatalog(resolve(root, 'skills'))).catalog;
  const maintainers = JSON.parse(
    await readFile(resolve(root, 'catalog/maintainers.json'), 'utf8'),
  ).maintainers as string[];
  if (
    !Array.isArray(maintainers) ||
    !maintainers.length ||
    maintainers.some(
      (name) => typeof name !== 'string' || !/^[a-z0-9-]{1,39}$/i.test(name),
    )
  )
    throw new Error('Invalid authorized maintainer registry');
  for (const record of registry.decisions) {
    if (!maintainers.includes(record.reviewer))
      throw new Error(
        `${record.skillId}: reviewer is not an authorized maintainer`,
      );
    if (record.decision === 'approved') {
      const skill = catalog.skills.find((skill) => skill.id === record.skillId);
      if (
        !skill ||
        skill.status !== 'published' ||
        publicationDigest(skill.files) !== record.packageDigest
      )
        throw new Error(
          `${record.skillId}: approval is missing, stale or not promoted; re-review the exact package`,
        );
    }
  }
  for (const skill of catalog.skills) {
    if (skill.files['submission.json'])
      throw new Error(
        `${skill.id}: staging submission.json must be removed during promotion`,
      );
    if (
      skill.status === 'published' &&
      !registry.decisions.some(
        (record) =>
          record.skillId === skill.id && record.decision === 'approved',
      )
    )
      throw new Error(
        `${skill.id}: authored published status has no maintainer approval`,
      );
  }
  return registry;
}
interface GithubPullRequest {
  head: { sha: string };
  base: { ref: string; repo: { full_name: string } };
  user: { login: string };
  merged: boolean;
  merged_by: { login: string } | null;
}
export async function githubModeration(
  registry: PublicationRegistry,
  maintainers: string[],
  currentPr: number | undefined,
  get: (path: string) => Promise<unknown>,
) {
  const cache = new Map<
    number,
    GithubPullRequest & { reviews: GithubReview[] }
  >();
  for (const record of registry.decisions) {
    if (!maintainers.includes(record.reviewer))
      throw new Error(
        `${record.skillId}: reviewer not authorized by trusted base`,
      );
    let pr = cache.get(record.pullRequest);
    if (!pr) {
      const response = (await get(
        `/repos/${repository}/pulls/${record.pullRequest}`,
      )) as GithubPullRequest;
      const reviews: GithubReview[] = [];
      for (let page = 1; page <= 10; page++) {
        const batch = (await get(
          `/repos/${repository}/pulls/${record.pullRequest}/reviews?per_page=100&page=${page}`,
        )) as GithubReview[];
        if (!Array.isArray(batch))
          throw new Error('Invalid GitHub review response');
        reviews.push(...batch);
        if (batch.length < 100) break;
        if (page === 10) throw new Error('Review pagination limit exceeded');
      }
      pr = { ...response, reviews };
      cache.set(record.pullRequest, pr);
    }
    if (
      pr.base?.repo?.full_name !== repository ||
      pr.base.ref !== 'main' ||
      (!pr.merged && record.pullRequest !== currentPr)
    )
      throw new Error(
        `${record.skillId}: approval requires a merged repository PR to main`,
      );
    if (
      pr.merged &&
      (!pr.merged_by || !maintainers.includes(pr.merged_by.login))
    )
      throw new Error(
        `${record.skillId}: merge must be performed by an authorized maintainer`,
      );
    if (!hasApproval(pr.reviews, record.reviewer, pr.head.sha, pr.user.login))
      throw new Error(
        `${record.skillId}: missing current-head approval by ${record.reviewer}; request a maintainer review and rerun CI`,
      );
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  try {
    if (process.argv[2] === '--digest') {
      const catalog = (await generateCatalog(resolve(root, 'skills'))).catalog;
      const skill = catalog.skills.find(
        (skill) => skill.id === process.argv[3],
      );
      if (!skill || process.argv.length !== 4)
        throw new Error(
          'Use pnpm moderation:check --digest <existing-sector/slug>',
        );
      console.log(
        JSON.stringify(
          { id: skill.id, publicationDigest: publicationDigest(skill.files) },
          null,
          2,
        ),
      );
      process.exit(0);
    }
    const registry = await localModeration(root);
    if (process.env.GITHUB_ACTIONS === 'true') {
      const event = JSON.parse(
        await readFile(process.env.GITHUB_EVENT_PATH!, 'utf8'),
      );
      let maintainers = JSON.parse(
        await readFile(resolve(root, 'catalog/maintainers.json'), 'utf8'),
      ).maintainers as string[];
      if (event.pull_request) {
        const base = event.pull_request.base.sha;
        if (!/^[a-f0-9]{40}$/.test(base))
          throw new Error('Invalid base commit');
        let baseRoster: string | undefined;
        try {
          baseRoster = execFileSync(
            'git',
            ['show', `${base}:catalog/maintainers.json`],
            {
              cwd: root,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe'],
            },
          );
        } catch {
          /* Initial rollout uses the existing repository owner. */
        }
        maintainers = trustedMaintainers(baseRoster);
        let previous: PublicationRegistry = { schemaVersion: 1, decisions: [] };
        try {
          previous = JSON.parse(
            execFileSync(
              'git',
              ['show', `${base}:catalog/publication-reviews.json`],
              {
                cwd: root,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
              },
            ),
          );
        } catch {
          /* No approvals before initial rollout. */
        }
        validateDecisionChanges(previous, registry, event.pull_request.number);
        const changed = execFileSync(
          'git',
          [
            'diff',
            '--name-status',
            '--no-renames',
            base,
            'HEAD',
            '--',
            'skills',
          ],
          { cwd: root, encoding: 'utf8' },
        );
        for (const line of changed.split('\n')) {
          const [status, path] = line.split('\t');
          if (status === 'A' && path?.endsWith('/SKILL.md')) {
            const id = path.slice(7, -9);
            if (
              !registry.decisions.some(
                (record) =>
                  record.skillId === id &&
                  record.decision === 'approved' &&
                  record.pullRequest === event.pull_request.number,
              )
            )
              throw new Error(
                `${id}: new source packages require approval; submit proposals under submissions/ instead`,
              );
          }
        }
      }
      await githubModeration(
        registry,
        maintainers,
        event.pull_request?.number,
        async (path) => {
          const response = await fetch(`https://api.github.com${path}`, {
            headers: {
              Accept: 'application/vnd.github+json',
              ...(process.env.GH_TOKEN
                ? { Authorization: `Bearer ${process.env.GH_TOKEN}` }
                : {}),
            },
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok)
            throw new Error(
              `GitHub read-only review check failed: HTTP ${response.status}`,
            );
          return response.json();
        },
      );
    }
    console.log(
      `Moderation checks pass: ${registry.decisions.length} recorded decisions. Local ledger checks do not impersonate GitHub approval or merge.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
