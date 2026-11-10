import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useNavigationType,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import { platforms } from '@uas/platform-adapters';
import { useLibrary } from '@/lib/use-library';
import { selectSkills } from '@/lib/catalog';
import { SkillCard } from '@/components/skill-card';
import { CatalogSearchInput } from '@/components/catalog-search-input';
import { Select, Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
export function CatalogPage() {
  const catalog = useLibrary();
  const [params, setParams] = useSearchParams();
  const { sector: sectorRoute } = useParams();
  const navigate = useNavigate();
  const query = params.get('q') ?? '';
  const location = useLocation();
  const navigationType = useNavigationType();
  const inputRef = useRef<HTMLInputElement>(null);
  // History state identifies our own URL writes even when router transitions
  // arrive late. POP must always restore the destination's shareable query.
  const restoreSearch =
    navigationType === 'POP' || location.state?.catalogSearchUpdate !== true;
  const latestParams = useRef(params);
  useLayoutEffect(() => {
    if (restoreSearch) latestParams.current = params;
  }, [params, restoreSearch]);
  useLayoutEffect(() => {
    const restore = () => {
      latestParams.current = new URLSearchParams(window.location.search);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const selected = sectorRoute ?? params.get('sector') ?? '';
  const sort = params.get('sort') ?? 'az';
  const capability = params.get('capability') ?? '';
  const difficulty = params.get('difficulty') ?? '';
  const status = params.get('status') ?? '';
  const quality = params.get('quality') ?? '';
  const platform = params.get('platform') ?? '';
  const testing = params.get('testing') ?? '';
  const validation = params.get('validation') ?? '';
  const populated = catalog.sectors.filter((sector) =>
    catalog.skills.some((skill) => skill.sector === sector.slug),
  );
  const sector = catalog.sectors.find((item) => item.slug === selected);
  const capabilities = [
    ...new Set(catalog.skills.flatMap((skill) => skill.capabilities)),
  ].sort();
  const skills = useMemo(
    () =>
      selectSkills(catalog, {
        query,
        sector: selected,
        sort,
        capability,
        difficulty,
        status,
        minQuality: Number(quality) || 0,
        platform,
        testing,
        validation,
      }),
    [
      catalog,
      query,
      selected,
      sort,
      capability,
      difficulty,
      status,
      quality,
      platform,
      testing,
      validation,
    ],
  );
  function update(key: string, value: string) {
    // Compose with the latest requested URL, even before the router commits it.
    const next = new URLSearchParams(latestParams.current);
    if (key !== 'q') {
      const latestQuery = inputRef.current?.value ?? query;
      if (latestQuery) next.set('q', latestQuery);
      else next.delete('q');
    }
    if (value) next.set(key, value);
    else next.delete(key);
    latestParams.current = next;
    if (sectorRoute && key === 'sector')
      navigate(`/skills${next.size ? `?${next}` : ''}`);
    else
      setParams(next, {
        replace: key === 'q',
        state: { catalogSearchUpdate: true },
      });
  }
  if (sectorRoute && !sector)
    return (
      <div className="container-shell py-20">
        <h1 className="text-3xl font-semibold">Sector not found</h1>
        <Link className="text-link mt-5" to="/sectors">
          Explore available sectors
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  return (
    <div className="container-shell py-12 sm:py-16">
      <div className="mb-10">
        <p className="eyebrow">The open workflow library</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {sectorRoute ? sector?.title : 'Find your next skill.'}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {sectorRoute
            ? sector?.description
            : 'Practical instructions for your AI assistant. Explore by task, inspect the examples, and make a workflow your own.'}
        </p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[210px_1fr] lg:gap-10">
        <aside aria-label="Sector filters" className="hidden lg:block">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <SlidersHorizontal size={15} aria-hidden="true" />
            Sectors
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              aria-pressed={!selected}
              className={`sector-button ${!selected ? 'sector-active' : ''}`}
              onClick={() => update('sector', '')}
            >
              All skills<span>{catalog.skills.length}</span>
            </button>
            {populated.map((item) => (
              <button
                type="button"
                aria-pressed={selected === item.slug}
                key={item.slug}
                onClick={() => update('sector', item.slug)}
                className={`sector-button ${selected === item.slug ? 'sector-active' : ''}`}
              >
                <span className="text-left">{item.title}</span>
                <span>
                  {
                    catalog.skills.filter((skill) => skill.sector === item.slug)
                      .length
                  }
                </span>
              </button>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-border bg-muted/50 p-4">
            <FolderOpen size={21} className="text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold">Missing a workflow?</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              The best libraries grow through shared experience.
            </p>
            <Link to="/contribute" className="text-link mt-3 text-xs">
              Contribute a skill
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </aside>
        <section aria-label="Skill results" className="min-w-0">
          <div className="relative">
            <Search
              className="absolute top-4 left-4 text-muted-foreground"
              size={19}
              aria-hidden="true"
            />
            <label htmlFor="catalog-search" className="sr-only">
              Search skills
            </label>
            <CatalogSearchInput
              navigationKey={location.key}
              restoreFromUrl={restoreSearch}
              initialValue={query}
              inputRef={inputRef}
              onQueryChange={(value) => update('q', value)}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:flex lg:items-end">
            <div className="col-span-2 min-w-0 lg:hidden">
              <label
                htmlFor="mobile-sector"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Sector
              </label>
              <Select
                id="mobile-sector"
                value={selected}
                onChange={(event) => update('sector', event.target.value)}
                className="w-full"
              >
                <option value="">All sectors</option>
                {populated.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor="capability"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Capability
              </label>
              <Select
                className="w-full"
                id="capability"
                value={capability}
                onChange={(event) => update('capability', event.target.value)}
              >
                <option value="">All capabilities</option>
                {capabilities.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('-', ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 lg:ml-auto">
              <label
                htmlFor="sort"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Sort by
              </label>
              <Select
                className="w-full"
                id="sort"
                value={sort}
                onChange={(event) => update('sort', event.target.value)}
              >
                <option value="az">Name: A–Z</option>
                <option value="za">Name: Z–A</option>
                <option value="sector">Sector</option>
                <option value="quality">Quality score</option>
                <option value="testing">Recorded passing tests</option>
              </Select>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              {
                key: 'difficulty',
                label: 'Difficulty',
                value: difficulty,
                options: [
                  ['', 'All difficulties'],
                  ['beginner', 'Beginner'],
                  ['intermediate', 'Intermediate'],
                  ['advanced', 'Advanced'],
                ],
              },
              {
                key: 'status',
                label: 'Editorial status',
                value: status,
                options: [
                  ['', 'All editorial states'],
                  ['draft', 'Draft'],
                  ['community', 'Community'],
                  ['reviewed', 'Reviewed'],
                  ['published', 'Published'],
                ],
              },
              {
                key: 'quality',
                label: 'Minimum quality score',
                value: quality,
                options: [
                  ['', 'Any structural score'],
                  ['80', 'At least 80/100'],
                  ['90', 'At least 90/100'],
                  ['100', '100/100'],
                ],
              },
              {
                key: 'platform',
                label: 'Installation platform',
                value: platform,
                options: [
                  ['', 'All platforms'],
                  ...platforms.map((item) => [item.id, item.title]),
                ],
              },
              {
                key: 'testing',
                label: 'Test evidence',
                value: testing,
                options: [
                  ['', 'Any test evidence'],
                  ['not-recorded', 'No completed test evidence'],
                  ['recorded-pass', 'Recorded pass'],
                  ['recorded-fail', 'Recorded failure'],
                  ['stale', 'Stale evidence'],
                ],
              },
              {
                key: 'validation',
                label: 'Validation status',
                value: validation,
                options: [
                  ['', 'Any validation status'],
                  ['passed', 'Structure passed'],
                  ['failed', 'Structure failed'],
                  ['not-assessed', 'Not assessed (legacy)'],
                ],
              },
            ].map((filter) => (
              <div key={filter.key} className="min-w-0">
                <label
                  htmlFor={`filter-${filter.key}`}
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  {filter.label}
                </label>
                <Select
                  id={`filter-${filter.key}`}
                  value={filter.value}
                  className="w-full"
                  onChange={(event) => update(filter.key, event.target.value)}
                >
                  {filter.options.map(([value, title]) => (
                    <option key={value} value={value}>
                      {title}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          <div className="my-6 flex flex-wrap items-center justify-between gap-3">
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              <strong className="font-semibold text-foreground">
                {skills.length}
              </strong>{' '}
              {skills.length === 1 ? 'skill' : 'skills'}
              {query && <> matching “{query}”</>}
            </p>
            <div className="flex items-center gap-2">
              {sector && <Badge>{sector.title}</Badge>}
              {(query ||
                selected ||
                capability ||
                difficulty ||
                status ||
                quality ||
                platform ||
                testing ||
                validation) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/skills')}
                >
                  <X size={13} aria-hidden="true" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          {skills.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  sector={
                    catalog.sectors.find((item) => item.slug === skill.sector)
                      ?.title ?? skill.sector
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Search size={25} aria-hidden="true" />
              </span>
              <h2 className="mt-6 text-xl font-semibold">No skills found</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                Try a shorter phrase, use a different keyword, or explore
                another sector.
              </p>
              <Button className="mt-6" onClick={() => navigate('/skills')}>
                Reset search
              </Button>
            </div>
          )}
          <p className="mt-8 text-xs leading-6 text-muted-foreground">
            Drafts are shared for inspection and feedback. Structural validation
            is not human review or a guarantee of assistant compatibility.
          </p>
        </section>
      </div>
    </div>
  );
}
