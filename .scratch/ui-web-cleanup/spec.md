# UI library and marketing site cleanup

Status: ready-for-agent

Technical improvements to `packages/ui` and `apps/web`, focused on code quality, DRY and YAGNI. All items approved. No visual or behavioural changes are intended.

## UI library (`packages/ui`)

- [x] **01. `cx()` helper.** Replace the `[a, b].filter(Boolean).join(" ")` pattern in `badge`, `button`, `card`, `theme-icon`, `marketing/image-slot` and `marketing/decor` with a shared `src/cx.ts`.
- [x] **02. One `Tone` type.** Add `src/tone.ts` exporting `Tone = Audience | "brand"` and a `tones` array. Replace `ButtonTone` (currently imported from `button.tsx` by about 10 non-button components), `Audience | "brand"` in `Pillar`, the hand-written union in `apps/web/content/contact.ts`, and the local `tones` list in `apps/web/app/design/page.tsx`.
- [x] **03. Shared form plumbing.** Move `FormResult`/`FormAction` into `marketing/form-action.ts`, together with a shared `useFormAction` hook and a `<FormSuccess>` component. Use them in `EmailCapture` and `PilotSignupForm`, which currently repeat the `useActionState` setup and success message. Update the type imports in `apps/web/app/actions.ts` and `apps/web/app/design/actions.ts`.
- [x] **04. Shared input `classNames`.** Export the `classNames` object once and use it in both `select.tsx` and `text-input.tsx`.
- [x] **05. Remove unused code (YAGNI).**
  - Delete `group.tsx`, which nothing uses.
  - Remove props that nothing passes:
    - `Anchor`: `c`, `fw`, `underline`, `aria-current`
    - `Text`: `fw`, `ta`, `component`, `heading`
    - `Title`: `ta`
    - `Select`/`TextInput`: `value`, `onChange`, `description`, `disabled`, plus `error` on `Select` (all forms are uncontrolled)
    - `Button`: `onClick`
    - `Drawer`: `position`
    - `Table`, `Container`, `ImageSlot`: `className`
  - Remove the `generate:component` script, which points to a turbo generator that doesn't exist.
  - Remove `@types/node` from `packages/ui` if nothing in it needs Node types.
  - Before removing each prop, re-check usages, including props written on multi-line JSX.
- [x] **06. One `Space` type.** Replace the copies in `stack.tsx` and `simple-grid.tsx`.
- [x] **07. Shared small types.**
  - `ImageSlotImage` (`{ alt; src?; placeholderLabel? }`), exported from `image-slot`, used by `Hero` and `Pillar`.
  - `LinkItem` (`{ label; href }`), used by `HeroAction`, `PricingTier.cta`, the `SiteHeader` CTA and `SiteFooter` links.
  - `PromiseItem`, exported from `promise-band` and used by `content/shared.ts` and `content/students.tsx`.
- [x] **08. Merge the two verdict renderers in `ComparisonTable`.** Replace `kindlingVerdict` and `typicalVerdict` with one `Verdict` that takes a `kind` prop.
- [x] **09. `Section` renders its own heading.** Add a `heading?: SectionHeadingProps` prop that renders `SectionHeading` and sets `aria-labelledby` from `heading.id`, so the id is written once instead of twice. Keep `SectionHeading` exported. Migrate `RoleChooser`.
- [x] **10. Small tidy-ups.**
  - `theme.ts`: drop the `px` alias for `rem` and the unnecessary cast in `pxScale`, and map breakpoints with the same helper.
  - `Title`: move the inline display-size style into a CSS module class.
  - `Pillar`: stop setting `data-tone` twice (`Card` already sets it).

## Marketing site (`apps/web`)

- [x] **11. `components/pilot-cta.tsx`.** Wraps `CtaBand` + `PilotSignupForm` with `pilotCta`/`pilotForm`, and takes `action`, so the design page can pass `demoSubmit`. Use it on the home, educators and design pages.
- [x] **12. Shorten the comparison table usage.** Group `rowsLabel`/`typicalLabel` into one spreadable `comparison.labels` object, replacing the four hand-passed pairs.
- [x] **13. Reuse the promise items on the students page.** Derive its three items from `promiseItems` instead of redefining them.
- [x] **14. Header copy into content.** Move "Skip to content", "Open menu" and "Main" from `components/header.tsx` into `content/site.ts`.
- [x] **15. `actions.ts` dedupe.** Move the repeated "Please enter a valid email address." check into a single helper.
- [x] **16. Migrate pages** to items 09, 11 and 12.

## Considered and not doing

- **Generating the five `[data-tone]` blocks in `global.css` from tokens.** It would be less repetition, but it adds build machinery for very little gain.
- **Extracting repeated CSS** (heading font at weight 800, card surfaces) with `composes:`. It touches about 20 classes and risks visual changes without a visual check.
- **Setting the tone once per page instead of on every `Section`.** Buttons and badges set their own `data-tone`, so this would change behaviour.

## Verification

- `pnpm check-types`, `pnpm lint` and `pnpm test` pass.
- `pnpm build --filter web` succeeds.
- Spot-check `/` and `/design` in the browser to confirm nothing changed visually.

Note: `node_modules` was installed on macOS, so its native binaries (biome, the Node toolchain) fail in the Linux sandbox. Running the checks here needs a `pnpm install` inside the sandbox, or the checks can be run on the host.

## Comments
