# Scaffold development

The current step establishes the workspace and frontend toolchain; it does not implement the marketplace or generate skill packages.

## Commands

After installing the pinned pnpm version and a supported Node version:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Vite prints its local address (normally http://127.0.0.1:5173). The starter displays Open Skill Kit and a working Button interaction. React Fast Refresh is configured. The app has no catalog fetch or generation prerequisite.

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @osh/web preview
```

`pnpm build` emits only the starter app to `apps/web/dist`. Root typecheck covers library/scripts/tests with `tsconfig.json` and runs the app's separate browser and Vite/Node checks. `pnpm test` remains the existing library/CLI suite; no marketplace tests are claimed.

## Tailwind and shadcn/ui

Tailwind's Vite plugin processes `src/style.css`, which imports Tailwind CSS 4 and maps semantic CSS tokens through `@theme inline`. No Tailwind v3 configuration file is required. Light and dark token sets are defined; a theme controller is deferred.

`components.json` uses the new-york style, TypeScript, CSS variables and the `@/*` aliases. `src/components/ui/button.tsx` is the local source primitive built around the shadcn/ui pattern of Radix Slot, class-variance-authority and `cn`. `src/lib/utils.ts` combines clsx with tailwind-merge. No runtime shadcn service is used. Future components should be added from the app directory using the shadcn registry configuration, then reviewed with the project's lint/type checks.

Configuration follows the official [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite) and [Tailwind Vite setup](https://tailwindcss.com/docs/installation/using-vite). Marketplace dependencies declared by earlier work are preserved; their presence does not mean their features are implemented.

## Boundaries

The current `skills/`, `packages/`, `scripts/` and `catalog/` files are preserved. Commands such as `skills:validate`, `skills:index`, `build:marketplace`, `build:npm` and `pack:npm` are explicit content/distribution operations and are not called by starter dev/build. Completing earlier draft validation issues, native platform guides, exports, search, routes and editorial review is deferred to the corresponding implementation steps.

See [ADR 0001](adr/0001-monorepo-boundaries.md) and the [implementation checklist](IMPLEMENTATION_STATUS.md).
