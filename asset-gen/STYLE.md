# Art style guide: Fraction Hop, Crystal Machine, Cargo Line

Use this with `style-reference.png`. Every new asset should look like it came from the same sheet.

## In one paragraph (paste-ready prompt)

Flat vector "sticker" art for a kids' math game (grades 1–8). Every gameplay object has one uniform dark-indigo outline (#2b2350, about 3px at native size, round joins and caps). Fills are flat colour with at most one gentle top-to-bottom gradient, plus a single short white highlight stroke near the top-left. Shapes are chunky and rounded, with generous corner radii, slightly squat proportions and simple geometry. Add one or two small charming details, never clutter. Backdrops have no outlines: pastel, low-contrast, layered silhouettes, so the outlined gameplay pieces pop in front. Never use pure black, blurred drop shadows, glossy or 3D rendering, textures, or text baked into the art.

## Line

- Outline colour is always `#2b2350`. Never `#000`.
- Weight is about 3px at native size. Big boards and panels use 3.5–5px. Tiny icons (≤48px) use 2–2.5px. Interior detail lines are thinner (1.5–2.5px) and often at 50–60% opacity.
- `stroke-linejoin="round"` and `stroke-linecap="round"` everywhere.
- Backgrounds and far scenery have no outlines.

## Fill and shading

- Use flat base colours. At most one vertical linear gradient per shape, lighter at the top and slightly darker at the bottom (about 10–20% darker).
- Add one highlight: a short white or very light stroke along the top-left edge, at 60–90% opacity.
- Grounded objects get a contact shadow: a flat ellipse in `#2b2350` at 15–18% opacity. Shadows are never blurred.
- "3D" boards and buttons use an offset base: the same shape shifted 6–10px down in a darker tone (`#6c63a6` for UI, `#2b2350` for plaques), sitting behind the face.
- Faceted gems use an inner polygon at about 55% radius. Top-left facets are lighter and bottom-right facets darker, with a white catchlight dot.

## Shape language

- Corners are rounded: panels and boards use rx 14–22, small chips rx 5–10.
- Proportions are chunky and friendly, slightly squat. Wheels are big; heads are big.
- Use simple primitives (rects, circles, polygons, gentle quadratic curves) and avoid fussy paths.
- Add small delights sparingly: a star badge, rivets, a flower, a curl of grass, a sparkle.
- Sparkles are a four-point curved star in gold `#ffcc3d` with the indigo outline.

## Palette

| Role | Hex |
|---|---|
| Outline / text | `#2b2350` |
| UI face | `#fdfbff` |
| UI rim | `#8e86c4` |
| UI base / offset | `#6c63a6` |
| UI light / rivets | `#c8c2ef` |
| Page background | `#f5f3fc` |
| Accent purple | `#6c5ce0` / dashed focus ring `#7b61ff` |
| Gold (current, done, reward) | `#ffcc3d`, light `#ffe17a`, deep `#e8a92a` |
| Coral (warm accent) | `#ef6b4f` |
| Right | `#4cc38a` |
| Wrong | `#e5533f` (button red `#ef5a45`) |
| Grass | `#6fb85a`, highlight `#a6e584`, shade `#4f9a3f` |
| Water | `#7ec8f2` → `#4f9fd6`, white foam |
| Sky | `#cfe4f8` → `#e8f3fb` |
| Stone / sand | `#c2b296` / `#f1e6cc` |
| Wood | `#a8774a` |
| Crate | `#f3c766` / `#e8b24a` |
| Train blue | `#5a97e6` → `#3366b8` |
| Skin / blush / hair | `#f2c29b` / `#f2877e` / `#6b3f26` |

### Place-value colours and shapes (used across games)

| Place | Shape | Colour |
|---|---|---|
| 1s | square | blue `#4b9fe6` |
| 10s | triangle | violet `#9b6cf2` |
| 100s | pentagon | sage `#5f9f7f` |
| 1000s | hexagon | lavender `#8f7bc4` |
| 10 000s | heptagon | coral `#e2604c` |
| 100 000s | octagon | gold `#f2b632` |

Cargo Line crates follow the same colours on their straps: tens are a rod, hundreds a flat slab, thousands a container cube.

## Characters

- The head is about a third of total height. Eyes are dark ovals with a white catchlight, plus soft blush ovals and a simple smile arc.
- Clothing is flat colour with one stripe or a badge.
- Poses share one frame so they can swap: idle and hop use the same viewBox and feet line.
- Don't add characters to splash or marketing art unless asked.

## Backdrops

- Use 2–3 layered silhouette ridges in pastel tints, getting lighter and lower-contrast toward the back.
- A sun is a disc with a soft halo; clouds are puffy white circle clusters.
- The meadow is green hills with flowers. The forest is tiered pines in misty greens. The mine is grey snow-capped peaks with snowy terraces.
- The ground the gameplay sits on is drawn in code in a matching colour.

## UI pieces

- Boards and signs have a lavender rim, an offset base and a white face, with a soft shine bar at the top-left.
- State variants keep the identical frame: the wrong state has a red rim, pale red face and ✕ badge; right is green; current gets a dashed gold ring; done is gold with a star.
- Leave space for numbers and labels, which are live text in code. The font is rounded (Fredoka, then Lexend or Nunito) at weight 700, in `#2b2350`.

## Technical conventions (SVG)

- Each asset is one SVG with its viewBox at native pixel size.
- Each file starts with a comment giving its anchor points and slots (e.g. "wheels touch rail at y=146", "digit centred at (55,56)").
- Swappable states (closed/open, idle/hop, normal/wrong) share the exact same frame.
- Physics bodies are centred on their centroid. Tileable pieces have a stated period (e.g. 120px or 200px).
- No baked text, no external references, no filters or blur.
- Draw assets at the size they're shown in the game, so line weights stay consistent.
