import { broadSectors, matchesSector } from '@uas/skill-schema';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  FolderOpen,
  FileText,
  GitPullRequest,
  Shield,
} from 'lucide-react';
import { useLibrary } from '@/lib/use-library';
import { Button } from '@/components/ui/button';
import { InstallGuide } from '@/components/install-guide';
export function SectorsPage() {
  const catalog = useLibrary();
  const sectors = broadSectors(catalog.sectors);
  const count = (slug: string) =>
    catalog.skills.filter((skill) =>
      matchesSector(catalog.sectors, skill.sector, slug),
    ).length;

  return (
    <section className="container-shell py-16">
      <p className="eyebrow">Different work. Shared knowledge.</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Explore the sectors.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
        Browse broad sectors and their specialties. Available counts include
        draft packages; planned collections have no skill files yet.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sectors.map((sector) => (
          <article
            key={sector.slug}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <FolderOpen className="text-primary" size={25} aria-hidden="true" />
            <h2 className="mt-5 text-lg font-semibold">
              <Link className="text-link" to={`/sectors/${sector.slug}`}>
                {sector.title}
              </Link>
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {count(sector.slug)
                ? `Available · ${count(sector.slug)} skill packages`
                : 'Planned · no skills yet'}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {sector.description}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {catalog.sectors
                .filter((item) => item.parent === sector.slug && !item.aliasOf)
                .map((item) => (
                  <li key={item.slug}>
                    <Link className="text-link" to={`/sectors/${item.slug}`}>
                      {item.title}
                    </Link>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {count(item.slug)
                        ? `${count(item.slug)} available`
                        : 'Planned'}
                    </span>
                  </li>
                ))}
            </ul>
          </article>
        ))}
      </div>
      {!sectors.length && (
        <p className="mt-8 text-muted-foreground">
          No sectors have authored packages yet.
        </p>
      )}
    </section>
  );
}
export function DocsPage() {
  const catalog = useLibrary();
  const example = catalog.skills[0];
  return (
    <article className="container-shell max-w-3xl py-16">
      <p className="eyebrow">Start with a text file</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        A simple way to reuse a workflow.
      </h1>
      <div className="mt-9 space-y-8 text-sm leading-7 text-muted-foreground">
        <p>
          Browsing, local validation and downloads need no account. GitHub pull
          requests require a GitHub account and repository access. Current
          skills are drafts; installation directory support is separate from
          actual assistant testing.
        </p>
        {example && (
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              Install a catalog example: {example.title}
            </h2>
            <InstallGuide skill={example} />
          </section>
        )}
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            1. Find and inspect
          </h2>
          <p>
            Search by task, choose a sector, and open a skill. Read its
            instructions, examples, provenance and boundaries. Drafts have not
            completed human review. Validation checks format and file safety,
            not whether an assistant will behave correctly.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            2. Download or copy
          </h2>
          <p>
            Download the ZIP to get the complete folder, including SKILL.md,
            metadata and examples. Or use Copy SKILL.md to copy its original
            instructions. ZIPs are built locally in your browser from the
            validated catalog. No skill scripts are executed.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            3. Use it with care
          </h2>
          <p>
            For a generic chat assistant, paste the instructions and supply the
            required inputs. For native skills support, consult your assistant’s
            current official documentation for folder location and allowed
            features. We do not claim universal compatibility or verified native
            install paths.
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Shield size={19} className="text-primary" aria-hidden="true" />
            Your content stays yours
          </h2>
          <p className="mt-3">
            This site has no authentication, analytics, AI provider calls or
            backend. Search runs locally after loading the static catalog. A
            theme preference may be saved in your browser. Opening source or
            documentation links navigates to another website.
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            For contributors and developers
          </h2>
          <p>
            Each package lives in skills/sector/skill-name. Its minimal YAML
            frontmatter contains a name and description; catalog metadata
            belongs in metadata.json. Skills remain readable without this app.
          </p>
          <a
            href="https://github.com/sarangp3010/open-skill-kit/blob/main/docs/skill-authoring.md"
            className="text-link mt-4"
          >
            Read the authoring guide
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </section>
      </div>
    </article>
  );
}
export function ContributePage() {
  return (
    <section className="container-shell max-w-3xl py-16">
      <p className="eyebrow">Built in the open</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Share a workflow that helps.
      </h1>
      <p className="mt-5 text-lg leading-8 text-muted-foreground">
        Useful skills are specific, inspectable and honest about their limits.
        Contributions start with a GitHub pull request and a human review.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/create">Create and preview a skill</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/published">Published catalog</Link>
        </Button>
      </div>
      <ol className="mt-8 list-decimal space-y-4 pl-6 text-sm leading-7 text-muted-foreground">
        <li>
          Choose a canonical specialty and check for an existing workflow. Copy
          the complete repository template into skills/sector/skill-name, align
          its identity and replace the illustrative task.
        </li>
        <li>
          Write original instructions, two fictional example pairs, structured
          behavior cases, limitations and source/license provenance. Keep the
          package a draft; do not invent platform tests.
        </li>
        <li>
          Validate locally and regenerate the catalog. Fix diagnostics at the
          reported paths before submitting.
        </li>
        <li>
          Fork and open a draft GitHub pull request using the checklist.
          Maintainers review scope, provenance, safety and evidence; passing CI
          does not publish a skill.
        </li>
      </ol>
      <pre
        tabIndex={0}
        aria-label="Contribution validation commands"
        className="mt-6 overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-6"
      >
        <code>
          {
            'pnpm install --frozen-lockfile --ignore-scripts\npnpm contributions:check\npnpm skills:index\npnpm validate:all'
          }
        </code>
      </pre>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        No marketplace account is needed. GitHub submission needs a GitHub
        account and repository access; this page opens instructions and links,
        and never submits or publishes on your behalf.
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <a
          className="text-link"
          href="https://github.com/sarangp3010/open-skill-kit/tree/main/templates/skill"
        >
          Get the complete skill template
        </a>
        <a
          className="text-link"
          href="https://github.com/sarangp3010/open-skill-kit/compare"
        >
          Open a pull request on GitHub
        </a>
        <a
          className="text-link"
          href="https://github.com/sarangp3010/open-skill-kit/issues/new?template=skill_request.yml"
        >
          Propose a skill first
        </a>
      </div>
      <div className="my-10 grid gap-5 sm:grid-cols-2">
        {[
          {
            icon: FileText,
            title: 'Make it practical',
            body: 'Write original instructions, clear inputs and outputs, and two realistic example pairs. Add boundaries and source provenance.',
          },
          {
            icon: GitPullRequest,
            title: 'Make it reviewable',
            body: 'Keep new skills as drafts, run repository validation, and describe the change. Never claim tests or professional review that did not happen.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <item.icon className="text-primary" size={24} aria-hidden="true" />
            <h2 className="mt-4 font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {item.body}
            </p>
          </div>
        ))}
      </div>
      <Button asChild>
        <a
          href="https://github.com/sarangp3010/open-skill-kit/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noreferrer"
        >
          Read contribution guide
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </Button>
    </section>
  );
}
export function AboutPage() {
  return (
    <article className="container-shell max-w-3xl py-16">
      <p className="eyebrow">Open Skill Kit</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Practical knowledge, in portable files.
      </h1>
      <p className="mt-6 text-lg leading-8 text-muted-foreground">
        We are building an open-source library of focused instructions for
        AI-assisted work. The skill files are the source of truth. This website
        is a way to explore them.
      </p>
      <div className="mt-8 space-y-5 text-sm leading-7 text-muted-foreground">
        <p>
          Source code and original contributions are MIT licensed. Reuse and
          adapt a package after inspecting its license and provenance.
          Compatibility depends on the assistant and required capabilities, and
          high-stakes decisions need qualified professional review.
        </p>
        <p>
          There are no paid APIs, accounts or claims of invented popularity.
          Current starter skills are drafts. Passing deterministic checks does
          not establish model performance or professional correctness.
        </p>
      </div>
      <Link to="/skills" className="text-link mt-8">
        Explore the library
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}
export function NotFoundPage() {
  return (
    <section className="container-shell py-24 text-center">
      <p className="eyebrow">404 · A path less traveled</p>
      <h1 className="mt-4 text-4xl font-semibold">
        This page isn’t in the kit.
      </h1>
      <p className="mt-5 text-muted-foreground">
        Head back to the library to find a useful workflow.
      </p>
      <Button asChild className="mt-7">
        <Link to="/skills">
          Browse skills
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
