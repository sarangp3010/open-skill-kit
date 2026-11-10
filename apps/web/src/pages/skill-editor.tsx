import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLibrary } from '@/lib/use-library';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/card';
import { MarkdownViewer } from '@/components/markdown-viewer';
import {
  browserPackageDigest,
  checkDraft,
  downloadDraft,
  proposalSkill,
  safeDraft,
  type BrowserDraft,
} from '@/lib/skill-draft';
const templateModules = import.meta.glob('../../../../templates/skill/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const templateFiles = Object.fromEntries(
  Object.entries(templateModules).map(([path, content]) => [
    path.split('/templates/skill/')[1],
    content,
  ]),
);
function initialDraft(): BrowserDraft {
  return {
    schemaVersion: 1,
    id: 'collaboration-records/example-skill',
    operation: 'new',
    files: { ...templateFiles },
  };
}
export function SkillEditorPage() {
  const catalog = useLibrary();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<BrowserDraft>(initialDraft);
  const [sector, setSector] = useState('collaboration-records'),
    [slug, setSlug] = useState('example-skill');
  const [file, setFile] = useState('SKILL.md'),
    [newFile, setNewFile] = useState('references/notes.md');
  const [message, setMessage] = useState(
    'Drafts exist only in this browser tab. Export JSON to keep unfinished work.',
  );
  const [showValidation, setShowValidation] = useState(false),
    [review, setReview] = useState(false);
  const [baseLoaded, setBaseLoaded] = useState(false);
  const result = checkDraft(draft, catalog);
  const original = catalog.skills.find(
    (skill) => skill.id === params.get('skill'),
  );
  function change(next: BrowserDraft) {
    try {
      setDraft(safeDraft(next));
      setReview(false);
      setMessage('Edited locally. Nothing has been submitted or published.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Invalid draft');
    }
  }
  function applyIdentity() {
    try {
      const id = `${sector}/${slug}`,
        metadata = JSON.parse(draft.files['metadata.json']);
      const cases = JSON.parse(draft.files['tests/cases.json']);
      change({
        ...draft,
        id,
        operation:
          draft.operation === 'update' && id === draft.id ? 'update' : 'new',
        files: {
          ...draft.files,
          'SKILL.md': draft.files['SKILL.md'].replace(
            /^name:.*$/m,
            `name: ${slug}`,
          ),
          'metadata.json':
            JSON.stringify(
              {
                ...metadata,
                id,
                sector,
                slug,
                status: 'draft',
                testedPlatforms: [],
                lastVerified: null,
              },
              null,
              2,
            ) + '\n',
          'tests/cases.json':
            JSON.stringify({ ...cases, skillId: id }, null, 2) + '\n',
        },
      });
    } catch {
      setMessage(
        'Fix metadata.json and tests/cases.json before changing identity.',
      );
    }
  }
  async function loadOriginal() {
    if (!original) return;
    const metadata = JSON.parse(original.files['metadata.json'] ?? '{}');
    const files: Record<string, string> = {
      ...original.files,
      'metadata.json':
        JSON.stringify(
          {
            ...metadata,
            status: 'draft',
            testedPlatforms: [],
            lastVerified: null,
          },
          null,
          2,
        ) + '\n',
    };
    delete files['tests/platform-results.json'];
    change({
      schemaVersion: 1,
      id: original.id,
      operation: 'update',
      basePackageDigest: await browserPackageDigest(original.files),
      files,
    });
    setSector(original.sector);
    setSlug(original.slug);
    setBaseLoaded(true);
  }
  async function exportPackage() {
    try {
      const { saveSkillZip } = await import('@/lib/download');
      saveSkillZip(proposalSkill(draft, catalog));
      setMessage(
        'Proposal ZIP exported. Extract it under submissions/' +
          draft.id.split('/')[0] +
          '/ in your fork; it is not published.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed');
    }
  }
  return (
    <div className="container-shell py-12">
      <h1 className="text-3xl font-semibold">Create a skill proposal</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
        Create, edit, validate and preview freely. This editor never writes to
        the catalog or GitHub. Submit Skill opens a pull-request guide; only
        authorized maintainers can approve and merge a publication.
      </p>
      {original && !baseLoaded && (
        <Button
          className="mt-4"
          onClick={() =>
            void loadOriginal().catch((error) =>
              setMessage(
                error instanceof Error
                  ? error.message
                  : 'Could not load update base',
              ),
            )
          }
        >
          Load {original.title} as an update proposal
        </Button>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="draft-sector">Canonical collection</label>
          <Select
            id="draft-sector"
            className="mt-2 w-full"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
          >
            {catalog.sectors
              .filter((item) => !item.aliasOf)
              .map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.title}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <label htmlFor="draft-slug">Skill name</label>
          <Input
            id="draft-slug"
            className="mt-2"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </div>
        <Button className="self-end" onClick={applyIdentity}>
          Apply identity
        </Button>
      </div>
      <p className="mt-4 break-all text-sm">
        Proposal: {draft.operation} · {draft.id} · publication unavailable in
        browser
      </p>
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        <section className="min-w-0" aria-label="Package editor">
          <label htmlFor="draft-file">Package file</label>
          <Select
            id="draft-file"
            className="mt-2 w-full"
            value={file}
            onChange={(event) => setFile(event.target.value)}
          >
            {Object.keys(draft.files)
              .sort()
              .map((path) => (
                <option key={path}>{path}</option>
              ))}
          </Select>
          <label htmlFor="draft-content" className="mt-4 block">
            File contents
          </label>
          <textarea
            id="draft-content"
            spellCheck={false}
            className="mt-2 h-96 w-full rounded-xl border border-input bg-card p-3 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring"
            value={draft.files[file] ?? ''}
            onChange={(event) =>
              change({
                ...draft,
                files: { ...draft.files, [file]: event.target.value },
              })
            }
          />
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="new-draft-file">New supporting file path</label>
              <Input
                id="new-draft-file"
                value={newFile}
                onChange={(event) => setNewFile(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (Object.hasOwn(draft.files, newFile)) {
                  setMessage('That file already exists.');
                  return;
                }
                try {
                  const next = safeDraft({
                    ...draft,
                    files: { ...draft.files, [newFile]: '' },
                  });
                  change(next);
                  setFile(newFile);
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : 'Invalid path',
                  );
                }
              }}
            >
              Add file
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const files = { ...draft.files };
                delete files[file];
                change({ ...draft, files });
                setFile(Object.keys(files)[0] ?? 'SKILL.md');
              }}
            >
              Remove selected file
            </Button>
          </div>
        </section>
        <section
          className="min-w-0 rounded-xl border border-border p-5"
          aria-label="Draft preview"
        >
          <h2 className="mb-4 text-xl font-semibold">
            Preview · not published
          </h2>
          {file.endsWith('.md') ? (
            <MarkdownViewer
              source={draft.files[file] ?? ''}
              files={draft.files}
              onFile={setFile}
            />
          ) : (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">
              {draft.files[file]}
            </pre>
          )}
        </section>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            setShowValidation(true);
            setMessage(
              result.valid
                ? 'Deterministic validation passed. No agent or professional review occurred.'
                : 'Fix the listed validation errors.',
            );
          }}
        >
          Validate proposal
        </Button>
        <Button variant="outline" onClick={() => downloadDraft(draft)}>
          Save draft JSON
        </Button>
        <label className="cursor-pointer rounded-md border border-input px-4 py-2 text-sm">
          Import draft JSON
          <input
            className="mt-1 block max-w-full text-xs"
            type="file"
            accept="application/json,.json"
            aria-label="Import draft JSON"
            onChange={async (event) => {
              const picked = event.target.files?.[0];
              if (!picked) return;
              try {
                if (picked.size > 1048576)
                  throw new Error('Draft JSON exceeds 1 MiB');
                const next = safeDraft(
                  JSON.parse(
                    new TextDecoder('utf-8', { fatal: true }).decode(
                      await picked.arrayBuffer(),
                    ),
                  ),
                );
                change(next);
                setSector(next.id.split('/')[0]);
                setSlug(next.id.split('/')[1]);
                setFile(Object.keys(next.files)[0] ?? 'SKILL.md');
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : 'Invalid import',
                );
              }
              event.target.value = '';
            }}
          />
        </label>
        <Button
          variant="outline"
          disabled={!result.valid}
          onClick={() => void exportPackage()}
        >
          Export proposal ZIP
        </Button>
        <Button
          disabled={!result.valid}
          onClick={() => {
            setReview(true);
            setShowValidation(true);
          }}
        >
          Submit Skill for review
        </Button>
      </div>
      <p role="status" className="mt-4 text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      {showValidation && (
        <section
          aria-label="Proposal validation"
          className="mt-5 rounded-xl border border-border p-5"
        >
          <h2 className="font-semibold">
            {result.valid ? 'Validation passed' : 'Validation needs attention'}
          </h2>
          <p className="mt-2 text-sm">
            Structural quality {result.quality.score}/100 · advisory, not
            measured effectiveness.
          </p>
          <ul className="mt-3 list-inside list-disc text-sm">
            {result.errors.map((error, index) => (
              <li className="break-words" key={index}>
                {error}
              </li>
            ))}
            {result.quality.checks
              .filter((check) => check.status !== 'pass')
              .map((check) => (
                <li key={check.id}>
                  {check.id}: {check.message}
                </li>
              ))}
          </ul>
        </section>
      )}
      {review && (
        <section
          aria-label="Submission review guide"
          className="mt-6 rounded-xl border border-border p-5"
        >
          <h2 className="text-xl font-semibold">
            Ready for a pull request · not submitted or published
          </h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm">
            <li>
              Export the ZIP and extract the complete folder into submissions/
              {draft.id.split('/')[0]}/ in your fork.
            </li>
            <li>
              Run pnpm contributions:check, pnpm moderation:check and pnpm
              validate:all.
            </li>
            <li>
              Open a draft pull request with the package, examples and relevant
              offline fixtures. Wait for maintainer review; changes may be
              requested or rejected.
            </li>
            <li>
              Only an authorized maintainer can record approval and merge a
              promotion. Status flags, scores and exported files cannot publish
              a skill.
            </li>
          </ol>
          <a
            className="text-link mt-5"
            href="https://github.com/sarangp3010/open-skill-kit/compare"
            target="_blank"
            rel="noreferrer"
          >
            Open GitHub pull request page
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            GitHub login/repository access is required there. No content is
            uploaded by this editor.
          </p>
        </section>
      )}
      <Link className="text-link mt-8" to="/contribute">
        Read the contributor and moderation guide
      </Link>
    </div>
  );
}
