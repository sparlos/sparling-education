# Renaming the product

The product's name is a stand-in, "Placeholder", until the real one is chosen. Code that renders the name reads `brandName` from `@repo/tokens`, so most of a rename is one edit. This is everything else, in order.

Internal names (cookies, storage keys, the database, test URLs, comments, the glossary and skills) never carry the brand, so none of them change.

## 1. The name itself

- [ ] `brandName` in `packages/tokens/src/index.ts`.
- [ ] `brandByline` in the same file, if "by Sparling Education" changes.

That updates every page title, every line of site and app copy, the logo's live text in the site header, footer and teacher app, the play shell's and teacher app's browser tab titles (`index.html`, through the `brand-name` plugin in each `vite.config.ts`), the API's OpenAPI title, and the videos' captions and logo scenes.

## 2. Read the copy with the new name in it

The sentences were written around "Placeholder". Search for `brandName` (about 80 places) and read each one aloud with the real name, looking for:

- [ ] "a" or "an" in front of it.
- [ ] Possessives, e.g. `{brandName}'s games` on the home page.
- [ ] A name that's plural, or that reads oddly as the subject ("Every Placeholder game…", "Why Placeholder").

## 3. Logo files and favicons

- [ ] `pnpm --filter @repo/brand logos`. It rewrites `packages/brand/assets/` (the logos, gem marks, app tiles and PNG icons), the site's `apps/web/app/{favicon.ico,icon.svg,apple-icon.png}`, and `public/{favicon.ico,icon.svg,apple-touch-icon.png}` in `apps/teach` and `apps/play`.
- [ ] Look at the full logo with the new name. A much longer or shorter name may want a different gap or byline size, in `packages/brand/scripts/logos.ts` and `packages/ui/src/marketing/wordmark.module.css`.
- [ ] If the look changes too: the gem and sparkle are in `packages/tokens/src/mark.ts`, the colours in `packages/tokens/src/index.ts`.

## 4. Spoken lines (on the founder's Mac)

The name is spoken in the play shell and in the videos, and recordings don't follow the constant.

- [ ] If the voice says the name wrong, add a respelling to `pronunciations` in `packages/voice/voices/narrator/voice.json`. It fixes the games and the videos alike.
- [ ] `pnpm voice`, then listen and commit. This covers the play shell's "This screen is too small for …" line (`apps/play/src/ui/shell-strings.ts`). `pnpm check-voice` fails until it's done.

## 5. Videos (on the founder's Mac)

- [ ] `pnpm --filter @repo/marketing voice teacher-grading`, then `pnpm --filter @repo/marketing make teacher-grading`. Two lines say the name. The make step also writes the educators page's copy and poster to `apps/web/public/videos/`.
- [ ] The same for `teacher-teaser`, which says the name three times.
- [ ] Re-upload any video posted elsewhere. If the educators hero has moved to Mux or YouTube, update `video.src` in `apps/web/content/educators.tsx`.

## 6. Generated code

- [ ] `pnpm generate`. It refreshes `apps/api/openapi.json` and the API client, whose headers carry the API's title.

## 7. Outside the repo

- [ ] The Google OAuth consent screen's app name and logo (Google Cloud console → APIs & Services → OAuth consent screen). Students and teachers see it at sign-in.
- [ ] The domain, and the contact address (`contactEmail` in `apps/web/content/site.ts` is still `hello@example.com`). The company site's product and privacy links read `NEXT_PUBLIC_PRODUCT_SITE_URL` (see `apps/company/README.md`), and its link to the try site is `tryGamesUrl` in `apps/company/content/site.ts`.
- [ ] Social accounts, the video host, and anything else published under the old name.

## 8. Docs and agent notes

- [ ] The Brand section of `docs/DESIGN.md` and the brand line in `.claude/rules/ui.md` both say the name is a placeholder.
- [ ] Delete this file's "stand-in" framing, or the whole file once nothing is left to do.

## Left alone on purpose

- `packages/db/prisma/migrations/00000000000000_init/migration.sql` still says "Kindling" in a comment. Migrations already applied are never edited.
- `.scratch/` issues are a record of past work and keep the names they were written with.
