import { ArrowUpRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from './ui/card';
import type { DiscoverySkill } from '@/lib/catalog';
export function SkillCard({
  skill,
  sector,
}: {
  skill: DiscoverySkill;
  sector: string;
}) {
  return (
    <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transform-none">
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/8 text-primary">
          <FileText size={21} aria-hidden="true" />
        </span>
        <Badge className="bg-muted text-muted-foreground">
          {skill.status === 'draft' ? 'Draft · preview' : skill.status}
        </Badge>
      </div>
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-primary uppercase">
        {sector}
      </p>
      <h3 className="text-lg font-semibold tracking-tight">
        <Link
          className="inline-flex items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          to={`/skills/${skill.sector}/${skill.slug}`}
        >
          {skill.title}
          <ArrowUpRight
            className="shrink-0 text-muted-foreground transition group-hover:text-primary"
            size={16}
            aria-hidden="true"
          />
        </Link>
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {skill.description.split(' Use when')[0]}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
        {skill.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">SKILL.md</span>
      </div>
    </article>
  );
}
