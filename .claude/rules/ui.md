---
paths:
  - "**/*.tsx"
---

# UI

Mantine powers the UI, but only behind `packages/ui` (`@repo/ui`).

- NEVER import from `@mantine/*` outside `packages/ui`. Import components from `@repo/ui/<component>`.
- Each `@repo/ui` component is a thin wrapper exposing only the Mantine props we use. If a needed prop is missing, add it to the wrapper.
- Need a component? Search Mantine first via the `mantine` MCP (`search_docs`, `list_items`, `get_item_props`). If a match exists, add a wrapper in `packages/ui/src/`. Only build custom when Mantine has no equivalent.
