# Renaming the product, or changing its logo

The product is **Kestrel**. Code that renders the name reads `brandName` from `@repo/tokens`, so most of a rename is one edit. This page lists everything else, in order, as learned from the move from the stand-in "Placeholder" to Kestrel in November 2026.

Internal names (cookies, storage keys, the database, test URLs, comments, the glossary and skills) never carry the brand, so none of them change.

## Still open from the Kestrel rename

- [ ] The domain, and the contact address (`contactEmail` in `apps/web/content/site.ts` is still `hello@example.com`). The company site's product and privacy links read `NEXT_PUBLIC_PRODUCT_SITE_URL` (see `apps/company/README.md`), and its link to the try site is `tryGamesUrl` in `apps/company/content/site.ts`.
- [ ] The Google OAuth consent screen's app name and logo (Google Cloud console → APIs & Services → OAuth consent screen). Students and teachers see it at sign-in. Upload `packages/brand/assets/tile-dark-128.png`.
- [ ] Social accounts, the video host, and anything else published under the old name.

## Where the brand lives

- **The name and byline:** `brandName` and `brandByline` in `packages/tokens/src/index.ts`.
- **The mark** (the kestrel's wings over an open book): `packages/tokens/src/mark.ts`, copied from the designer's artwork. It also holds the logo's layout (`logoLayout`) and the left wing the backdrops use.
- **The logo's colours:** `color.logo` in `packages/tokens/src/index.ts`. The book is the brand violet, the name is the ink, and the gold is the designer's.
- **The logo's typeface:** Poppins (ExtraBold name, Medium byline), turned into outlines by `packages/brand/scripts/logos.ts`. The app text stays Plus Jakarta Sans.
- **The backdrops' big wings:** `Wing` in `packages/ui/src/marketing/decor.tsx`, placed in `sky.tsx`, `hero.tsx` and `ambient.tsx`.

## 1. The name itself

- [ ] `brandName` in `packages/tokens/src/index.ts`.
- [ ] `brandByline` in the same file, if "by Sparling Education" changes.

That updates every page title, every line of site and app copy, the play shell's and teacher app's browser tab titles (`index.html`, through the `brand-name` plugin in each `vite.config.ts`), the API's OpenAPI title, and the videos' captions.

## 2. Read the copy with the new name in it

Search for `brandName` (about 80 places) and read each one aloud with the new name, looking for:

- [ ] "a" or "an" in front of it.
- [ ] Possessives, e.g. `{brandName}'s games` on the home page.
- [ ] A name that's plural, or that reads oddly as the subject ("Every Kestrel game…", "Why Kestrel").

## 3. Logo files and favicons

- [ ] `pnpm --filter @repo/brand logos`. It writes the name's outlines to `packages/tokens/src/wordmark.ts` (the apps and videos draw the logo from these), rewrites `packages/brand/assets/` (horizontal and stacked logos in light, dark, white and ink, the marks, app tiles and PNG icons), the site's `apps/web/app/{favicon.ico,icon.svg,apple-icon.png}`, and `public/{favicon.ico,icon.svg,apple-touch-icon.png}` in `apps/teach` and `apps/play`.
- [ ] Look at the logos with the new name. A much longer or shorter name may want different proportions in `logoLayout` in `packages/tokens/src/mark.ts`.
- [ ] If the mark changes too: replace its shapes in `packages/tokens/src/mark.ts`, keeping `markParts`, `leftWing` and their boxes, and check the favicon at 16 px (`markSmallStroke` thickens it for small sizes).

## 4. Spoken lines (on the founder's Mac)

The name is spoken in the play shell and in the videos, and recordings don't follow the constant.

- [ ] If the voice says the name wrong, add a respelling to `pronunciations` in `packages/voice/voices/narrator/voice.json`. It fixes the games and the videos alike.
- [ ] `pnpm voice`, then listen and commit. This covers the play shell's "This screen is too small for …" line (`apps/play/src/ui/shell-strings.ts`). `pnpm check-voice` fails until it's done.

## 5. Videos (on the founder's Mac)

- [ ] `pnpm --filter @repo/marketing voice teacher-grading`, then `pnpm --filter @repo/marketing make teacher-grading`. Two lines say the name. The make step also writes the educators page's copy and poster to `apps/web/public/videos/`.
- [ ] The same for `teacher-teaser`, which says the name three times and shows the logo.
- [ ] Re-upload any video posted elsewhere. If the educators hero has moved to Mux or YouTube, update `video.src` in `apps/web/content/educators.tsx`.

The API's OpenAPI document and client, whose headers carry the name, regenerate on every dev and build run, so they need nothing.

## 6. Docs and agent notes

- [ ] The Brand section of `docs/DESIGN.md` and the brand lines in `.claude/rules/ui.md`.

## Left alone on purpose

- `packages/db/prisma/migrations/00000000000000_init/migration.sql` still says "Kindling" in a comment. Migrations already applied are never edited.
- `.scratch/` issues are a record of past work and keep the names they were written with.
