# Company site

The one-page site for Sparling Education, the company behind the product. It sits beside the product's own marketing site (`apps/web`) and features the product as the company's first.

```bash
pnpm dev --filter company   # http://localhost:3005
```

- Copy lives in `content/site.ts`. The product's name is `brandName` from `@repo/tokens`, never typed, and its logo is `Wordmark` from `@repo/ui/marketing/wordmark`.
- The company has its own identity, kept apart from the product's tokens on purpose: a printed prospectus in ink, paper and brass, set in one serif. Its graphics are line engravings in the same ink and brass (`components/`), and its motion is quiet: the hero assembles on load, the product's hop line draws when scrolled to, and later sections rise in. Reduced motion turns all of it off. Colours are in `identity.ts`, checked for contrast by `identity.test.ts`. The favicon, `app/icon.svg`, repeats the monogram with those colours written in.
- The product screenshot in `public/screens/` is copied from `packages/marketing/screens/play/`. Copy it again when the game changes.
- `NEXT_PUBLIC_PRODUCT_SITE_URL` points the product and privacy links at the product site. It defaults to `http://localhost:3000`.
- Fonts (Literata, and Plus Jakarta Sans for the product's wordmark) are bundled from Fontsource, so visitors' browsers never contact Google.
- The site is static, collects nothing and has no analytics. Its privacy link goes to the product site's privacy page.
