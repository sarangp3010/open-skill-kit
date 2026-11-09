# Open Skill Kit marketplace

Read-only React + TypeScript + Vite workspace with Tailwind CSS, local shadcn/ui primitives, safe Markdown previews and browser-local ZIP downloads. Skill data is always generated from the independent repository skill packages.

After installing dependencies at the repository root, run from this workspace:

```sh
pnpm dev
pnpm typecheck
pnpm build
pnpm preview
```

Dev/build run `pnpm generate` first to validate and copy the catalog. `src/lib/catalog.ts` validates fetched data and implements local search. Detail/Markdown and ZIP code are split into separate chunks. No authentication or paid API is configured.

See [marketplace guide](../../docs/marketplace.md), [catalog pipeline](../../docs/catalog-pipeline.md) and [implementation status](../../docs/IMPLEMENTATION_STATUS.md).
