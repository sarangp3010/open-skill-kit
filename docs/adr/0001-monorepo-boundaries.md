# ADR 0001: Independent skills and React workspaces

Date: 2026-11-09. Status: adopted for the current scaffold.

## Context

The approved specification places portable skills and the web application in one monorepo. The user currently authorizes only the workspace and React toolchain foundation. Earlier work left content packages, a CLI, draft skills and a partial marketplace generator in the tree. These must be preserved without making the starter depend on unfinished content.

## Decision

Use pnpm workspaces for `apps/*` and `packages/*`. `skills/` contains plain portable packages and is not itself a JavaScript workspace. Reading a skill must not require the web app.

Keep browser source in `apps/web/src` with app-local Vite, TypeScript and shadcn/ui configuration. Shared TypeScript compiler rules live in `tsconfig.base.json`; root library/tests/scripts, browser source and Vite configuration have distinct include lists and ambient types. Vite and TypeScript resolve `@/*` consistently within the app.

Use React, Vite, Tailwind CSS 4 and local shadcn/ui primitives. Root `dev` delegates to the app; root `build` builds the starter app only. The app does not import Node-only indexer/CLI packages or run content generation. Existing content and npm build commands remain available as explicit separate operations.

Retain the partial catalog/ZIP pipeline and draft packages unchanged. Their integration and validation belong to future content and marketplace steps. Later React components must consume validated generated data rather than hardcoded catalog entries. Review/publication state remains separate from schema validity.

## Consequences

A contributor can start and build the app without valid authored content, generated catalog assets, API keys, backend services or an npm release. Root typecheck still checks existing shared source and the app. Starter build success does not certify skill validation, catalog freshness, marketplace behavior or compatibility.

The website can later be statically hosted from `apps/web/dist`; no deployment is configured or performed in this scaffold step. New React pages and automatic catalog generation require a subsequent approved implementation batch.
