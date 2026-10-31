---
paths:
  - "**/*.tsx"
  - "**/*.css"
---

# UI

Mantine powers the UI, but only behind `packages/ui` (`@repo/ui`).

- NEVER import from `@mantine/*` outside `packages/ui`. Import components from `@repo/ui/<component>`.
- Each `@repo/ui` component is a thin wrapper exposing only the Mantine props we use. If a needed prop is missing, add it to the wrapper.
- Need a component? Search Mantine first via the `mantine` MCP (`search_docs`, `list_items`, `get_item_props`). If a match exists, add a wrapper in `packages/ui/src/`. Only build custom when Mantine has no equivalent.
- Larger compositions (page sections, site header/footer, forms) live in `packages/ui/src/marketing/` and are imported as `@repo/ui/marketing/<name>`. They are built from `@repo/ui` primitives, not from Mantine directly.
- Components never contain copy: all user-facing text comes in as props, so pages can be translated later.

# Design tokens

`@repo/tokens` (`packages/tokens`) is the single source of truth for colour, type, spacing, radius, shadow and motion. It has no dependencies so anything (including a PlayCanvas game) can use it; `@repo/tokens/color` has `hexToRgb01` for `pc.Color`.

- Never hard-code colours or sizes in components. In TS use `@repo/tokens`; in CSS modules use the `--k-*` variables the theme publishes (see `cssVariablesResolver` in `packages/ui/src/theme.ts`).
- Audience colours come from `data-tone="brand|educator|parent"` on an ancestor, which sets `--tone-fill`, `--tone-edge`, `--tone-soft`, `--tone-text` and friends.
- The product's name is `brandName` from `@repo/tokens`, never typed out, and the logo is `Wordmark` from `@repo/ui/marketing/wordmark`. Both are placeholders until the name is chosen; `docs/RENAME.md` lists everything a rename touches.
- The sparkle's gold (`--k-sparkle`) is for shapes only, never text. In the teacher app it appears only in the logo, since amber there means a misconception.
- The 3D press effect (`press.module.css`) is only for buttons and clickable cards. Static cards stay flat.
- WCAG 2.2 AA: `packages/tokens/src/contrast.test.ts` checks every text/surface pair. Add new pairs there when you add tokens. Respect `prefers-reduced-motion` for any movement.
- Light mode only for now.
- Media queries use the custom media generated from `tokens.breakpoint`: `@media (--k-md-down)` / `(--k-md-up)` (xs–xl). Never write breakpoint values in CSS. `pnpm generate` (run automatically by turbo before dev/build) writes them for PostCSS.

Preview everything at `/design` in `apps/web` (hidden from nav and search).
