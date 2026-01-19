# Copilot instructions

## Project overview
- Astro 5 static site for KotaServer (Minecraft community) with a single page in `src/pages/index.astro` using `src/layouts/Layout.astro`.
- Assets are imported as ESM from `src/assets/` (e.g., `logo.svg`, `hero.svg`) and used via `asset.src` in `.astro` templates.
- Global styles and HTML shell live in `Layout.astro`; page-level styles are scoped in each page.

## Key files & patterns
- `src/layouts/Layout.astro`: imports `destyle.css`, defines global font, base typography, meta tags, and `<slot />` for pages.
- `src/pages/index.astro`: Japanese copy, hero layout, and scoped CSS with responsive media queries; uses a `<Layout>` wrapper and asset imports.
- `public/`: static assets served as-is (e.g., `/favicon.svg`).

## Developer workflows (pnpm)
- `pnpm dev` (or `pnpm start`): start Astro dev server.
- `pnpm build`: runs `astro check` then builds to `dist/`.
- `pnpm preview`: preview the production build.
- Runtime/tooling versions are pinned in `mise.toml` (Node 20, pnpm latest).

## Conventions to follow
- Use `.astro` pages under `src/pages/` for routes; keep layout-level concerns in `Layout.astro` and page-specific styling in page files.
- Keep copy in Japanese unless explicitly asked otherwise.
- Use `class` and BEM-like simple naming (e.g., `hero-text`, `join-button`) and responsive tweaks via `@media` blocks.
- Import CSS reset once in `Layout.astro` (`destyle.css`), avoid re-importing in pages.

## Config notes
- `astro.config.mjs` sets `server.host = "0.0.0.0"` for LAN access in dev.
- TypeScript config extends `astro/tsconfigs/strict` in `tsconfig.json`.
