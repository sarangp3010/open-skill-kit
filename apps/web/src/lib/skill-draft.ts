import {
  safePathSchema,
  slugSchema,
  submissionRequestSchema,
  type DiscoveryCatalog,
} from '@uas/skill-schema';
import { validateSkill, LIMITS } from '@uas/skill-validator';
export interface BrowserDraft {
  schemaVersion: 1;
  id: string;
  operation: 'new' | 'update';
  basePackageDigest?: string;
  files: Record<string, string>;
}
export function safeDraft(input: unknown): BrowserDraft {
  if (!input || typeof input !== 'object')
    throw new Error('Expected a draft JSON object');
  const draft = input as BrowserDraft;
  if (
    draft.schemaVersion !== 1 ||
    typeof draft.id !== 'string' ||
    draft.id.split('/').length !== 2 ||
    !draft.id.split('/').every((part) => slugSchema.safeParse(part).success)
  )
    throw new Error('Draft identity must be canonical-sector/skill-name');
  submissionRequestSchema.parse({
    schemaVersion: 1,
    operation: draft.operation,
    ...(draft.operation === 'update'
      ? { basePackageDigest: draft.basePackageDigest }
      : {}),
  });
  if (
    !draft.files ||
    typeof draft.files !== 'object' ||
    Array.isArray(draft.files)
  )
    throw new Error('Expected a text file map');
  const paths = Object.keys(draft.files);
  let size = 0;
  if (paths.length > LIMITS.files) throw new Error('Too many draft files');
  for (const path of paths) {
    if (
      !safePathSchema.safeParse(path).success ||
      !/\.(md|json|txt|csv)$/i.test(path) ||
      path === 'submission.json'
    )
      throw new Error(`Unsafe or reserved draft file: ${path}`);
    const content = draft.files[path];
    if (typeof content !== 'string' || content.includes('\0'))
      throw new Error(`Expected UTF-8 text: ${path}`);
    const bytes = new TextEncoder().encode(content).length;
    size += bytes;
    if (bytes > LIMITS.fileBytes || size > LIMITS.packageBytes)
      throw new Error('Draft exceeds package text limits');
  }
  return {
    schemaVersion: 1,
    id: draft.id,
    operation: draft.operation,
    ...(draft.operation === 'update'
      ? { basePackageDigest: draft.basePackageDigest }
      : {}),
    files: Object.fromEntries(paths.map((path) => [path, draft.files[path]])),
  };
}
export function checkDraft(draft: BrowserDraft, catalog: DiscoveryCatalog) {
  const checked = validateSkill(draft.files, draft.id);
  const errors = [...checked.errors];
  if (
    !catalog.sectors.some(
      (sector) => sector.slug === draft.id.split('/')[0] && !sector.aliasOf,
    )
  )
    errors.push('Choose a canonical sector or specialty');
  try {
    const metadata = JSON.parse(draft.files['metadata.json'] ?? '{}');
    if (
      metadata.status !== 'draft' ||
      metadata.testedPlatforms?.length ||
      metadata.lastVerified
    )
      errors.push(
        'Browser proposals must be drafts without authored platform-verification claims',
      );
  } catch {
    /* Validator already reports metadata errors. */
  }
  if (
    draft.operation === 'new' &&
    catalog.skills.some(
      (skill) => skill.id === draft.id || skill.slug === draft.id.split('/')[1],
    )
  )
    errors.push(
      'Duplicate identifier or slug: choose a different task, or edit the existing skill as an update',
    );
  if (
    draft.operation === 'update' &&
    !catalog.skills.some((skill) => skill.id === draft.id)
  )
    errors.push('An update must target an existing source skill');
  return { ...checked, valid: checked.valid && errors.length === 0, errors };
}
export function proposalSkill(draft: BrowserDraft, catalog: DiscoveryCatalog) {
  const result = checkDraft(draft, catalog);
  if (!result.valid || !result.skill)
    throw new Error('Fix validation errors before exporting a skill package');
  const request = submissionRequestSchema.parse({
    schemaVersion: 1,
    operation: draft.operation,
    ...(draft.operation === 'update'
      ? { basePackageDigest: draft.basePackageDigest }
      : {}),
  });
  return {
    ...result.skill,
    files: {
      ...result.skill.files,
      'submission.json': JSON.stringify(request, null, 2) + '\n',
    },
  };
}
export async function browserPackageDigest(files: Record<string, string>) {
  const content = JSON.stringify(
    Object.keys(files)
      .sort()
      .map((path) => [path, files[path]]),
  );
  if (!globalThis.crypto?.subtle)
    throw new Error('Update digest checks require HTTPS or localhost.');
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(content),
  );
  return [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
export function downloadDraft(draft: BrowserDraft) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(draft, null, 2) + '\n'], {
      type: 'application/json',
    }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${draft.id.split('/')[1]}-draft.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
