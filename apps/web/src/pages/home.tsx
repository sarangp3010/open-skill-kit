import { broadSectors, matchesSector } from '@uas/skill-schema';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  Terminal,
  FileText,
  FolderOpen,
  Download,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, Input } from '@/components/ui/card';
import { SkillCard } from '@/components/skill-card';
import { useLibrary } from '@/lib/use-library';
export function HomePage() {
  const catalog = useLibrary();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const populated = broadSectors(catalog.sectors).filter((sector) =>
    catalog.skills.some((skill) =>
      matchesSector(catalog.sectors, skill.sector, sector.slug),
    ),
  );
  const sample = [...catalog.skills].sort((a, b) =>
    a.title.localeCompare(b.title),
  )[0];
  return (
    <>
      <section className="hero-grid border-b border-border">
        <div className="container-shell grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <div>
            <Badge className="mb-7 gap-2 bg-card text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Open source, open possibilities
              <ArrowUpRight size={12} aria-hidden="true" />
            </Badge>
            <h1 className="max-w-3xl text-4xl leading-[1.12] font-semibold tracking-[-0.045em] sm:text-6xl xl:text-[68px]">
              Better work starts
              <br className="hidden sm:block" /> with the{' '}
              <span className="text-primary">right skill.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Discover practical AI workflows for the things you do. Read the
              instructions, make them your own, and take them to your favorite
              assistant.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                navigate(
                  `/skills${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`,
                );
              }}
              className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-input bg-card p-2 shadow-lg shadow-primary/5"
            >
              <label htmlFor="hero-search" className="sr-only">
                Search for a skill
              </label>
              <Search
                className="ml-2 shrink-0 text-muted-foreground"
                size={20}
                aria-hidden="true"
              />
              <Input
                id="hero-search"
                className="h-11 min-w-0 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                placeholder="What would you like help with?"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button type="submit" className="h-11 rounded-xl px-4 sm:px-6">
                Explore
                <ArrowRight
                  size={16}
                  className="hidden sm:block"
                  aria-hidden="true"
                />
              </Button>
            </form>
            <Link to="/contribute" className="text-link mt-5 text-sm">
              Submit a skill <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-primary" aria-hidden="true" />
                No account needed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-primary" aria-hidden="true" />
                Portable Markdown
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-primary" aria-hidden="true" />
                Free to explore
              </span>
            </div>
          </div>
          <div className="relative mx-auto min-w-0 w-full max-w-lg">
            <div className="absolute -inset-4 -z-10 rounded-full bg-primary/8 blur-3xl" />
            <div className="overflow-hidden rounded-2xl border border-border bg-code text-code-foreground shadow-2xl shadow-primary/10">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-rose-400/70" />
                  <span className="size-2.5 rounded-full bg-amber-300/70" />
                  <span className="size-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {sample ? `${sample.slug}/SKILL.md` : 'SKILL.md'}
                </span>
                <FileText
                  size={14}
                  className="text-slate-400"
                  aria-hidden="true"
                />
              </div>
              <pre
                tabIndex={0}
                aria-label="Skill file preview"
                className="overflow-x-auto p-6 font-mono text-xs leading-7 sm:text-sm"
              >
                <code>
                  <span className="text-slate-500">---{'\n'}</span>
                  <span className="text-violet-300">name: </span>
                  {sample?.name ?? 'your-next-workflow'}
                  {'\n'}
                  <span className="text-violet-300">description: </span>
                  {sample
                    ? sample.description.slice(0, 40) + '…'
                    : 'Your task and when to use it'}
                  {'\n'}
                  <span className="text-slate-500">---{'\n\n'}</span>
                  <span className="text-emerald-300">
                    # {sample?.title ?? 'A skill for your next task'}
                  </span>
                  {'\n\n'}
                  <span className="text-slate-400">
                    {sample
                      ? sample.body
                          .split('\n')
                          .filter((line) => /^\d+\. /.test(line))
                          .slice(0, 3)
                          .map((line) =>
                            line.length > 58 ? line.slice(0, 55) + '…' : line,
                          )
                          .join('\n')
                      : 'Your instructions live here.'}
                  </span>
                </code>
              </pre>
              <div className="flex items-center gap-2 border-t border-white/10 px-6 py-3 text-xs text-slate-400">
                <Terminal size={14} aria-hidden="true" />A text file you can
                inspect. A workflow you can reuse.
              </div>
            </div>
            <div className="relative -mt-4 ml-auto flex w-fit items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-lg">
              <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                <Check size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold">
                  Your workflow, your tools
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Inspect first. Adapt freely.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="container-shell py-12">
        <div className="flex flex-col justify-between gap-5 border-b border-border pb-10 sm:flex-row sm:items-center">
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            A growing library of focused workflows, built in the open.
          </p>
          <div className="flex gap-8 sm:gap-14">
            {[
              { value: catalog.skills.length, label: 'Skill drafts' },
              { value: populated.length, label: 'Active sectors' },
              { value: 'MIT', label: 'Open-source license' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-2xl font-semibold tracking-tight">
                  {item.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container-shell pb-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Find your starting point</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              A skill for your next task
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Explore original starter drafts. Human review and platform testing
              are still pending.
            </p>
          </div>
          <Link className="text-link" to="/skills">
            Browse all skills
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...catalog.skills]
            .sort((a, b) => a.title.localeCompare(b.title))
            .slice(0, 6)
            .map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                sector={
                  catalog.sectors.find((sector) => sector.slug === skill.sector)
                    ?.title ?? skill.sector
                }
              />
            ))}
        </div>
        {!catalog.skills.length && (
          <p className="rounded-xl border border-dashed p-8 text-muted-foreground">
            The library is waiting for its first skill.{' '}
            <Link className="text-primary underline" to="/contribute">
              Help shape it.
            </Link>
          </p>
        )}
      </section>
      <section className="border-y border-border bg-muted/45">
        <div className="container-shell py-14">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Built for more than one kind of work</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Explore by sector
              </h2>
            </div>
            <Link className="text-link" to="/sectors">
              View all
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {populated.slice(0, 8).map((sector) => (
              <Link
                key={sector.slug}
                to={`/sectors/${sector.slug}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
              >
                <FolderOpen
                  size={19}
                  className="shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {sector.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {
                    catalog.skills.filter((skill) =>
                      matchesSector(catalog.sectors, skill.sector, sector.slug),
                    ).length
                  }
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container-shell py-16">
        <p className="eyebrow">No complicated setup</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          From discovery to doing.
        </h2>
        <div className="mt-9 grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: Search,
              title: 'Find your workflow',
              text: 'Search for a task or explore the sectors you work in.',
            },
            {
              icon: FileText,
              title: 'Read before you use',
              text: 'Inspect the instructions, examples, source and boundaries.',
            },
            {
              icon: Download,
              title: 'Make it yours',
              text: 'Download a portable package or copy the instructions to adapt.',
            },
          ].map((step, i) => (
            <div key={step.title}>
              <span className="mb-4 inline-flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono text-xs">0{i + 1}</span>
                <step.icon
                  size={20}
                  className="text-primary"
                  aria-hidden="true"
                />
              </span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="container-shell pb-12">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-primary px-7 py-9 text-primary-foreground sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Good workflows are worth sharing.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/85">
              Have a useful skill? Help build a thoughtful, practical library
              for everyone.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="shrink-0 border-white/30 bg-white text-slate-900 hover:bg-white/90"
          >
            <Link to="/contribute">
              Contribute a skill
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
