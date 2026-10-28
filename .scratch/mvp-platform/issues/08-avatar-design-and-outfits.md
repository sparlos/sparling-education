# 08: Avatar design and outfits

**What to build:** The first time a student arrives, they design their avatar before anything else. Afterwards, the locker's wardrobe lets them change into any outfit piece they own, and every game shows the new look.

**Blocked by:** 07

**Status:** done

- [x] A first-time student is taken to avatar design before the locker, and can't skip it
- [x] The avatar look is stored on the student and returned by the session, validated with the avatar package's look parser
- [x] The wardrobe shows only owned outfit pieces. Every student starts with a base set
- [x] Locker state goes through a new locker port, with a fake, a real adapter and a contract suite run against both
- [x] Touch targets and voice follow the design rules for Grades 3–5
- [x] Integration and rendered-app tests cover first-time design, changing outfits, and the look reaching a game

## Comments

**2026-10-28, agent:** Asset prep for this ticket is done in the working tree, uncommitted. The founder approved tinting: one grey drawing per shape, coloured in code. The sheet is placeholder art, so swapping in higher-res art later must stay easy.

- **Art:** `packages/avatar/art/sheet.png` is an AI-drawn building sheet. `pnpm slice-sheet` (in `packages/avatar`, needs `uv`) runs `scripts/slice_sheet.py`, which writes `art/shapes/<slot>/` and `src/generated/` (don't edit those by hand). `art/README.md` describes the layers and how to replace them with better art.
- **Model:** a **shape** is one drawing; an **item** is a shape plus a colour **ramp** (shadow, base, highlight), or `null` for fixed colour art. Looks and rewards store **item IDs** (`hair-04`, `top-07`, `skin-03`), never shape IDs. Slots are `body` (items are 12 skin tones on one body shape), `hair` (62), `hat` (42, the only optional slot), `top` (24), `bottom` (19) and `shoes` (44, all fixed: nearly every shoe has a second colour in its sole).
- **`@repo/avatar/parts`:** data only, so the API can use it.
  - Catalogue: `items` and `shapes` maps, and `isItem(slot, id)` for validating a look.
  - Placement: `optionalSlots`, `layerOrder` (body, bottom, shoes, top, hair, hat), and `fits`, where each slot sits in body-frame units, x from the body's centre and y from its top.
  - Colour: `rampLookup(ramp)` (grey level to RGB), and `paletteRamps` (Kindling palette colours for rewards beyond the sheet's own).
- **`@repo/avatar/art`:** `layerUrls(shapeId)` gives a shape's layer PNG URLs. It's browser only.
- **Drawing an item:** look up each pixel of the `fill` layer's grey (red channel) in `rampLookup(item.ramp)`, keeping the fill's alpha. Then draw `face` (body only) with multiply, then `ink` normally on top. A fixed item draws its `colour` layer. Draw every layer at the shape's `width` × `height` in body-frame units, scaled by the slot's `fit.scale`, not at the PNG's pixel size. That's what lets higher-res art drop in. Shoes draw twice, `fit.pair` either side of the centre line, with the left one mirrored. The prototype tinted on a canvas, and it's fast enough to compose a whole avatar once per look and cache it.
- **Prototype:** https://claude.ai/artifact/7wH2qUTMz164CzmkFo7XTC shows the tinting live, compared with the sheet's originals.
- **Not done, for this ticket:**
  - The stored look (`AvatarLook`, `parseLook`, `lookFromSeed` and `defaultLook` in `src/index.ts`), the API's `Look` schema (`apps/api/src/schemas.ts`) and the head-only `Portrait` still use the old placeholder (body colour, eyes, headwear). They need moving to item IDs per slot and a full-body drawing, with expressions.
  - The starting base set of owned items is still to be chosen.
- **Watch out for:**
  - **Bundle size.** Vite inlines most layer PNGs as base64. A test build importing `@repo/avatar/art` had a 552 kB (393 kB gzipped) main chunk. Set `build.assetsInlineLimit` in `apps/play` so avatar art stays as files, or load the wardrobe lazily.
  - **Skin tones.** The founder should review the 12; `skin-08` and `skin-09` are near-identical.
  - **Contrast.** The ink-contrast test covers `paletteRamps` only. The darkest skin tones and some dark sheet colours are under 3:1 against the outline.
  - **Fit.** Some long fringes cover the eyes, and the bun sits high. These need per-shape nudges.


**2026-10-28, agent:** Done in the working tree, uncommitted.

- **Look:** `AvatarLook` is now an item ID per slot (`body`, `hair`, `hat` or null, `top`, `bottom`, `shoes`). `parseLook` checks each against the catalogue; `canWear(look, owned)` checks outfit pieces are owned; `lookFromSeed` picks from all skins and hair plus the base set. The old placeholder (`bodies`, `eyes`, `headwear`) is gone.
- **Who owns what:** skin tones and hair are everyone's, never rewards (`selfSlots`). Tops, bottoms, shoes and hats are **outfit pieces** (`outfitSlots`), worn only if owned. **The base set** (`baseSet` in `@repo/avatar/parts`, my pick, for the founder to review): six plain tees (`top-01/03/04/06/08/12`), four bottoms (`bottom-01/03/08/11`), four shoes (`shoes-01/05/10/15`) and two beanies (`hat-01/07`). Owned items aren't stored yet: owned is the base set until ticket 14 adds grants, so there's no owned-items table.
- **Drawing:** `Portrait` (same export, `@repo/avatar/portrait`) now draws the full figure in a square, as SVG: each fill layer is tinted by an `feComponentTransfer` table filter (`rampTables`, 51 entries so the stops land exactly), the face multiplied, the ink on top. No canvas, so it renders at once and jsdom tests can read `data-slot`/`data-item`. `ItemPicture` draws one item for the wardrobe. Placement is `placeLook` and `frame` in the new `src/layout.ts`.
- **Expressions:** the slicer now blanks the body's eyes and mouth (keeping the cheeks) and writes where they were (`sheetFace`, exposed as `face`). Each expression draws its own eyes, brows and mouth there. `pnpm slice-sheet` reproduces the committed art exactly.
- **Schema/API:** migration `student_look` adds `Account.look` (JSON, null until designed). `GET /session` returns `look: Look | null`. New `GET /locker` → `{ owned }` and `PUT /locker/look` (400 `not-owned` for an unowned piece). The OpenAPI `Look` is an enum per slot.
- **Play shell:** new `LockerPort` (`current`, `wear`, `NotOwned`) with a stand-in (`standInGrant` adds owned pieces), a real adapter and `lockerPortContract`, run against both. `Student.look` is nullable; `DressedStudent` is a student with a look. A student with no look designs it first, before the locker, a grade pick or a game (`boot` returns `design`; afterwards the game opens as linked); there's no way out but the tick. The locker's avatar links to `/play/wardrobe`, which has a back button. Every slot button says its name; the instruction is spoken and has hear-again. Choices are `PictureButton`s (new in `@repo/ui`): 88 px choices, 72 px slot buttons, 64 px tick. The stand-in sign-in screen has an "Already has an avatar" box, off by default.
- **Bundle:** `apps/play/vite.config.ts` keeps avatar art as files (`assetsInlineLimit`). Main chunk 105.9 KB gzipped (was 91.7), from the catalogue and wardrobe.
- **Tests:** API 79 (new `locker.test.ts`), play 248 (locker contract on stand-ins and real adapters; rendered-app tests for first-time design, wardrobe, owned-only, rewards shown, save failure, and the changed look reaching a game), teach 31, avatar 17. Type checks pass across the repo. Biome is clean apart from the old `checkbox-group.tsx` complaint. `pnpm tour fraction-hop` is clean, with the full-body avatar as the hopper. Headless-Chrome shots of the designer, wardrobe and locker at 1366 and 360 px: no target under 48 px, no horizontal scroll.
- **The founder needs to:** run `pnpm voice` for 12 new shell lines (`design-avatar`, `wardrobe`, `change-clothes`, `slot-*`, `no-hat`, `avatar-done`, `saving-avatar`), listen and commit; `pnpm check-voice` fails until then. Apply the migration (`pnpm dev`). Review the base set and the skin tones. No `pnpm install` needed.
- **Watch out for:** existing students have no look, so they'll design one on their next visit. At small sizes (a 64 px game portrait) the full figure's face is tiny. `top-08`'s shape has stray red specks by the sleeves (sheet art). The fringe and bun fit notes above still stand.
