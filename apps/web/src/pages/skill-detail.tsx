import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Download,
  Check,
  FileText,
  Shield,
  PackageOpen,
  AlertCircle,
} from 'lucide-react';
import { useLibrary } from '@/lib/use-library';
import { sourceUrl, type DiscoverySkill } from '@/lib/catalog';
import { Button } from '@/components/ui/button';
import { Badge, Select } from '@/components/ui/card';
import { MarkdownViewer } from '@/components/markdown-viewer';
function SkillActions({ skill }: { skill: DiscoverySkill }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(skill.files['SKILL.md']);
      setMessage('SKILL.md copied.');
    } catch {
      setMessage(
        'Clipboard unavailable. Open the source file to copy it manually.',
      );
    }
  }
  async function download() {
    setBusy(true);
    try {
      const { saveSkillZip } = await import('@/lib/download');
      saveSkillZip(skill);
      setMessage('ZIP download started.');
    } catch {
      setMessage(
        'Download failed validation. Please inspect the source package.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        onClick={download}
        disabled={busy}
        className="h-12 w-full rounded-xl"
      >
        <Download size={17} aria-hidden="true" />
        {busy ? 'Preparing ZIP…' : 'Download ZIP'}
      </Button>
      <Button variant="outline" className="mt-3 h-11 w-full" onClick={copy}>
        <Copy size={16} aria-hidden="true" />
        Copy SKILL.md
      </Button>
      <p
        role="status"
        className="mt-3 min-h-5 text-xs leading-5 text-muted-foreground"
      >
        {message}
      </p>
    </>
  );
}
function Preview({ skill }: { skill: DiscoverySkill }) {
  const [file, setFile] = useState('SKILL.md');
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText size={16} className="text-primary" aria-hidden="true" />
          <h2>Package preview</h2>
        </div>
        <div className="min-w-0">
          <label htmlFor="preview-file" className="sr-only">
            Preview file
          </label>
          <Select
            id="preview-file"
            className="h-9 max-w-[min(70vw,300px)] font-mono text-xs"
            value={file}
            onChange={(event) => setFile(event.target.value)}
          >
            {Object.keys(skill.files)
              .sort((a, b) =>
                a === 'SKILL.md'
                  ? -1
                  : b === 'SKILL.md'
                    ? 1
                    : a.localeCompare(b),
              )
              .map((path) => (
                <option key={path} value={path}>
                  {path}
                </option>
              ))}
          </Select>
        </div>
      </div>
      <div className="p-5 sm:p-8">
        {file.endsWith('.md') ? (
          <MarkdownViewer
            source={file === 'SKILL.md' ? skill.body : skill.files[file]}
            files={skill.files}
            onFile={setFile}
          />
        ) : (
          <pre
            tabIndex={0}
            aria-label="Package file content"
            className="overflow-x-auto rounded-xl bg-muted p-5 text-xs leading-6"
          >
            <code>{skill.files[file]}</code>
          </pre>
        )}
      </div>
    </section>
  );
}
export function SkillDetailPage() {
  const catalog = useLibrary();
  const { sector, slug } = useParams();
  const skill = catalog.skills.find(
    (item) => item.slug === slug && item.sector === sector,
  );
  if (!skill)
    return (
      <div className="container-shell py-20">
        <h1 className="text-3xl font-semibold">Skill not found</h1>
        <p className="mt-4 text-muted-foreground">
          This package may have moved or is not in the generated library.
        </p>
        <Link className="text-link mt-6" to="/skills">
          <ArrowLeft size={16} />
          Browse the library
        </Link>
      </div>
    );
  const sectorName =
    catalog.sectors.find((item) => item.slug === skill.sector)?.title ??
    skill.sector;
  return (
    <div className="container-shell py-10 sm:py-14">
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      >
        <Link to="/skills" className="hover:text-primary">
          Skills
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/sectors/${skill.sector}`} className="hover:text-primary">
          {sectorName}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{skill.title}</span>
      </nav>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge className="bg-primary/8 text-primary">{sectorName}</Badge>
            <Badge>
              {skill.status === 'draft'
                ? 'Draft · review pending'
                : skill.status}
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {skill.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            {skill.description}
          </p>
          <div className="mt-5 mb-8 flex flex-wrap gap-2">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <Preview key={skill.id} skill={skill} />
          <section aria-labelledby="examples-title" className="mt-10">
            <h2
              id="examples-title"
              className="text-xl font-semibold tracking-tight"
            >
              See it in practice
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Illustrative input and output, not executed model evaluations.
            </p>
            <div className="mt-5 space-y-4">
              {skill.examples.map((path) => (
                <article
                  key={path}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <h3 className="mb-3 font-mono text-xs font-medium text-primary">
                    {path}
                  </h3>
                  <MarkdownViewer
                    source={skill.files[path]}
                    files={skill.files}
                  />
                </article>
              ))}
            </div>
            {!skill.examples.length && (
              <p className="mt-4 text-sm text-muted-foreground">
                No examples were supplied with this draft.
              </p>
            )}
          </section>
        </div>
        <aside
          aria-label="Skill package information"
          className="space-y-5 lg:sticky lg:top-25"
        >
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <PackageOpen
                className="text-primary"
                size={20}
                aria-hidden="true"
              />
              <h2 className="font-semibold">Make it your own</h2>
            </div>
            <p className="mb-5 text-sm leading-6 text-muted-foreground">
              A portable folder of instructions and examples. Inspect its
              boundaries before use.
            </p>
            <SkillActions key={skill.id} skill={skill} />
            <dl className="mt-4 space-y-3 border-t border-border pt-5 text-xs">
              {[
                ['Version', skill.version ?? 'Not declared'],
                ['License', skill.license ?? 'Not declared'],
                ['Files', String(Object.keys(skill.files).length)],
                ['Difficulty', skill.difficulty ?? 'Not specified'],
                ['Last verified', skill.lastVerified ?? 'Not verified'],
              ].map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <a
              href={sourceUrl(skill.sourcePath)}
              target="_blank"
              rel="noreferrer"
              className="text-link mt-6 text-xs"
            >
              View source on GitHub
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </section>
          <section className="rounded-2xl border border-border bg-muted/50 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="text-primary" size={17} aria-hidden="true" />
              Compatibility & trust
            </h2>
            <ul className="mt-4 space-y-3 text-xs leading-5 text-muted-foreground">
              <li className="flex gap-2">
                <Check
                  size={14}
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                Readable Markdown, usable without this website.
              </li>
              <li className="flex gap-2">
                <Check
                  size={14}
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {skill.capabilities.length
                  ? skill.capabilities.join(', ')
                  : 'No capabilities declared'}
                .
              </li>
              <li className="flex gap-2">
                <AlertCircle
                  size={14}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                {skill.testedPlatforms.length
                  ? `Declared platform tests: ${skill.testedPlatforms.join(', ')}.`
                  : 'No platform compatibility testing has been recorded.'}
              </li>
            </ul>
            <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              Native installation depends on your assistant. Copy instructions
              manually or follow its current official guide. Downloading never
              executes this skill.
            </p>
          </section>
          <section className="px-1">
            <h2 className="text-xs font-semibold">Provenance</h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {skill.provenance ?? 'Source provenance has not been supplied.'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
