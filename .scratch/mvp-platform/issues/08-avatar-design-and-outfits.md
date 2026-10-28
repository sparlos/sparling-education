# 08: Avatar design and outfits

**What to build:** The first time a student arrives, they design their avatar before anything else. Afterwards, the locker's wardrobe lets them change into any outfit piece they own, and every game shows the new look.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] A first-time student is taken to avatar design before the locker, and can't skip it
- [ ] The avatar look is stored on the student and returned by the session, validated with the avatar package's look parser
- [ ] The wardrobe shows only owned outfit pieces. Every student starts with a base set
- [ ] Locker state goes through a new locker port, with a fake, a real adapter and a contract suite run against both
- [ ] Touch targets and voice follow the design rules for Grades 3–5
- [ ] Integration and rendered-app tests cover first-time design, changing outfits, and the look reaching a game

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
