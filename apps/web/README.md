# Kindling marketing site

Next.js site for Kindling: `/` (teacher-first home), `/educators`, `/parents`, `/students`, `/privacy`, `/contact`, plus a hidden `/design` page that previews every token and component.

```bash
pnpm dev --filter web   # http://localhost:3000
```

- Run through turbo (`pnpm dev`), which first runs `@repo/tokens`'s `generate` step. CSS breakpoints (`@media (--k-md-down)`) come from the generated custom media file, wired up in `postcss.config.mjs`.
- Copy lives in `content/`, one file per page; components come from `@repo/ui` and `@repo/ui/marketing/*`.
- Signup forms post to server actions in `app/actions.ts`, which only log for now. Wire them to a real destination before launch.
- `content/site.ts` has a placeholder `contactEmail`.
- The students page must never collect information: no forms there.
- Comparison copy (`content/shared.ts`) compares against unnamed "typical learning games". Keep claims factual and never name competitors.
