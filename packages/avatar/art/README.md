# Avatar art

`sheet.png` is a building sheet: placeholder art to build the avatar with until an illustrator draws the real parts. `scripts/slice_sheet.py` (`pnpm slice-sheet`, needs `uv`) cuts it into `shapes/` and writes the catalogue in `src/generated/`.

## Shapes and items

- A **shape** is one drawing: a beanie, a tee, a hairstyle, the body.
- An **item** is what a student picks or earns: a shape plus a colour **ramp** (shadow, base, highlight). `beanie` in sky blue and `beanie` in ember are two items sharing one shape.
- Some shapes are **fixed colour** art (stripes, camo, two-tone shoes), and their items have no ramp.

Looks store item IDs. Item IDs never change meaning, so art can be redrawn freely underneath them.

## Layers

Every PNG of a shape covers the same box, aligned and trimmed alike.

| File | What it holds | How it's drawn |
|---|---|---|
| `<shape>.fill.png` | Greyscale shading. Grey 0.12 takes the ramp's shadow, 0.5 its base and 0.88 its highlight (`rampStops`). Alpha is the silhouette. | Each grey is looked up in the item's ramp (`rampLookup`) |
| `<shape>.face.png` | Body only: mouth and cheeks, as colour to multiply, with alpha for strength. | Multiply, over the tinted fill |
| `<shape>.ink.png` | Outline, eyes and drawn details in ink `#1F1F1F`, with alpha. Never tinted. | Normal, on top |
| `<shape>.colour.png` | Fixed colour art, instead of the three above. | Normal |

## Replacing art

Better art replaces a shape's files in place, at any resolution:

1. Draw the shape in the same pose and proportions, so it fits the same body-frame box (its `width` × `height` in `src/generated/shapes.ts`). Renderers draw every layer at that box's size, so a 4× PNG simply looks sharper.
2. For a tintable shape, deliver the fill as greys around the stops above, plus the ink, and the face for the body. Mid-grey (128) is the colour a student picked.
3. If the new art's proportions differ, change the shape's box and, if needed, the slot's fit in `src/parts.ts`.

Once real art replaces the sheet, the generated catalogue should become hand-maintained data, and this script retired.
