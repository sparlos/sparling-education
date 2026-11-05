# Avatar art

`scripts/cut_art.py` (`pnpm cut-art`, needs `uv`) cuts the boards in `new-art/` into one PNG per item in `items/`, and writes the catalogue in `src/generated/`. An item is what a student picks or earns: a skin tone, a hairstyle, a top. It's drawn as its picture, with no colouring in code.

Looks store item IDs. An ID is its place on the board, so a redrawn board must keep every sprite where it was and only add new ones at the end of a slot.

## Boards

| Board | Slots | Reading order |
|---|---|---|
| `Chibi Character Skin Tone Grid.png` | `body` | 8 bodies |
| `Chibi Avatar Hairstyle Selection Board.png` | `hair` | 40 hairstyles |
| `Chibi Avatar Wardrobe Collection.png` | `top`, `bottom`, `shoes` | 16, then 16, then 8 pairs |
| `hats-1.jpeg`, then `hat-2.jpeg` | `hat` | 16, then 16 |

Hats drawn showing their inside have it cut off (`OPENINGS` in the script), since it would really be behind the head. The astronaut's visor becomes glass (`VISOR`), so the face shows, and that helmet hides the hair.

## Fitting

`src/generated/items.ts` holds each picture's box as cut, set by `FITS`, `HAIR_NUDGES` and the shoe constants at the top of the script. Fit anything by hand with the tool at `/play/avatar-fit` (`pnpm --filter play dev`, on the Mac): drag and resize a picture on the avatar, and block out parts of it, such as a shoe's top so it sits under trousers. Saving writes `src/fits.ts`, `src/fit-masks.ts` and `masks/`. Commit them. They sit on top of the cut art, and re-running the script leaves them alone, though a mask assumes the picture keeps its size.

Worn, each shoe is its own picture and box (`shoes-05-left`, `shoes-05-right`); the wardrobe shows the pair.

## The face

The script takes the bodies' brows, eyes and mouth off, leaving the nose. `src/portrait.tsx` draws them for each expression (`src/faces.ts`), at the places in `face` in `src/parts.ts`.
