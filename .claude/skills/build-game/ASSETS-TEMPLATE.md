# <Game name>: art to make

For an image generation AI, or whoever is driving one. To make an asset, send "Send with every asset" followed by that asset's block, and attach the reference images it names. Nothing else in this repo is needed.

Status: <the art in the game now is stand-in | which assets are final>

## Send with every asset

**Style.** <The "In one paragraph" prompt from `asset-gen/STYLE.md`, copied word for word.>

**Style reference.** `asset-gen/style-reference.png`: every asset should look like it came from this sheet.

**The game.** <Two or three sentences for someone who has never seen it: who plays it, what's on screen and what the student does. Then the spec's Art description of the world.>

**Palette for this game.** <Only the hexes this game uses, each with its job. Name any that carry meaning, such as a colour for each part of a wave.>

**Rules for every file.**

- One SVG, with its viewBox at the size given, no external references, filters or blur.
- It starts with a comment giving its name, size and anchor: `<!-- tower.svg | 44 x 48 | anchor: middle (22,24) -->`.
- Transparent background, unless the asset says otherwise.
- No text, numbers or letters in the art. The game draws them on top.

## The screen

Screenshots from the game, with stand-in art: use them for where things go and how big they are, not for how they should look.

| Image | What it shows |
| --- | --- |
| `games/<slug>/art-reference/<name>.png` | <the journey's start, a moment between tasks, the ending; any screen with art not in these> |

The stage is <width × height>. From back to front:

1. <Layer: which assets, where in stage pixels, what moves.>
2. <...>

<What sits around the stage (number pad, buttons, caption), so the art doesn't try to fill that space. How the picture changes over a play.>

## Splash and share image

Every game needs both: the try site's test fails without them.

### `splash`

- **File:** `art/splash.svg`, 1376 × 768, no transparency: it fills the whole frame.
- **Where it goes:** the game's card on students' home screen, behind its start screen and, as `share.png`, in link previews.
- **Attach:** `asset-gen/splash-share-reference.png` for the layout. The screenshots above for the world.
- **Text:** a white rounded plaque at the top centre holds the title "<title string>" (Fredoka, weight 700, `#2b2350`), with a coral tag above it saying "<TOPIC>". Both are live SVG text, the one exception to "no text in the art".
- **Prompt:** <The game's world and what's at stake in one picture, using the game's own pieces. No characters, unless the founder asked for them.>

### `share`

- **File:** `art/share.png`, 1376 × 768.
- **Don't generate this one.** It's `art/splash.svg` rendered to PNG in headless Chrome, with Fredoka available so the title doesn't fall back. Render it again whenever the splash changes.

## Game art

Each set of files that must match goes in one block. Make its first file, then make the rest from it.

### `<slot-id>`

- **File:** `art/<file>.svg`, <width × height>, anchor <point and what it means>.
- **Where it goes:** <where on screen, how big it's shown, and how many at once>.
- **Around it:** <what's behind it, what's in front of it, what it touches, with the pixel points that must line up (feet on the wall's top at y=20, muzzle at x=42.5).>
- **Moves:** <how the game moves, scales, tiles or recolours it. "Doesn't move" if so.>
- **Keep clear:** <space the game draws text or other art into, or "nothing".>
- **Matching files:** <each file with what differs, such as colour or state: the same frame, the same pose. "None" if none.>
- **Prompt:** <What it is, in plain words: shape, what makes it charming, the direction it faces.>

## Don't generate

The game draws these in code, or they come from elsewhere.

| Slot | Why |
| --- | --- |
| `<slot-id>` | <The game recolours or animates its shape; the shell supplies it (the avatar); etc.> |
