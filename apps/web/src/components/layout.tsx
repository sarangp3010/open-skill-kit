import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Boxes, Github, Menu, X, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';
import type { CatalogIndex } from '@/lib/catalog';
import { PageMetadata } from './page-metadata';
export type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: CatalogIndex };
const links = [
  { to: '/published', label: 'Published' },
  { to: '/skills', label: 'Explore skills' },
  { to: '/sectors', label: 'Sectors' },
  { to: '/docs', label: 'Documentation' },
  { to: '/contribute', label: 'Contribute' },
];
export function Layout({
  state,
  retry,
}: {
  state: CatalogState;
  retry: () => void;
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    document.getElementById('main')?.focus();
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  return (
    <div className="flex min-h-svh flex-col">
      {state.status === 'ready' && <PageMetadata catalog={state.catalog} />}
      <a
        href="#main"
        className="sr-only z-[100] rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="container-shell flex h-[76px] items-center justify-between gap-3">
          <Link
            to="/"
            aria-label="Open Skill Kit home"
            className="flex shrink-0 items-center gap-2.5 rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Boxes size={21} aria-hidden="true" />
            </span>
            <span className="hidden text-base font-bold tracking-tight min-[400px]:inline sm:text-lg">
              Open Skill Kit<span className="text-primary">.</span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-sm text-sm transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <a
                href="https://github.com/sarangp3010/open-skill-kit"
                target="_blank"
                rel="noreferrer"
              >
                <Github size={16} aria-hidden="true" />
                GitHub
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </Button>
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-[min(88vw,360px)] border-l border-border bg-background p-6 shadow-xl">
                  <Dialog.Title className="text-lg font-semibold">
                    Open Skill Kit
                  </Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                    Find a workflow for your next task.
                  </Dialog.Description>
                  <Dialog.Close asChild>
                    <Button
                      variant="ghost"
                      className="absolute top-4 right-4"
                      aria-label="Close navigation"
                    >
                      <X size={20} />
                    </Button>
                  </Dialog.Close>
                  <nav
                    aria-label="Mobile navigation"
                    className="mt-10 flex flex-col gap-2"
                  >
                    {links.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setOpen(false)}
                        className="rounded-xl px-4 py-3 text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {label}
                      </NavLink>
                    ))}
                  </nav>
                  <a
                    className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground"
                    href="https://github.com/sarangp3010/open-skill-kit"
                  >
                    <Github size={16} aria-hidden="true" />
                    View the source
                  </a>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {state.status === 'loading' ? (
          <div className="container-shell py-20">
            <p role="status" className="mb-8 text-muted-foreground">
              Loading the skill library…
            </p>
            <div
              aria-hidden="true"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
                />
              ))}
            </div>
          </div>
        ) : state.status === 'error' ? (
          <div className="container-shell py-24">
            <div
              role="alert"
              className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8"
            >
              <h1 className="text-2xl font-semibold">
                The library couldn’t load
              </h1>
              <p className="my-4 text-muted-foreground">{state.message}</p>
              <Button onClick={retry}>
                <RefreshCw size={16} aria-hidden="true" />
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <Outlet context={state.catalog} />
        )}
      </main>
      <footer className="mt-12 border-t border-border bg-card/50">
        <div className="container-shell flex flex-col justify-between gap-6 py-9 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold">
              Small files. Useful workflows.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open source under MIT. Built for people, shared by people.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-5 text-xs text-muted-foreground"
          >
            <Link to="/about">About</Link>
            <Link to="/contribute">Contribute</Link>
            <Link to="/docs">How to use</Link>
            <a href="https://github.com/sarangp3010/open-skill-kit/blob/main/LICENSE">
              MIT license
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
