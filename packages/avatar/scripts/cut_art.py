# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy", "pillow", "scipy"]
# ///
"""Cut the avatar art boards (new-art/) into one PNG per item.

Writes art/items/<slot>/ and src/generated/. Run from packages/avatar (`pnpm cut-art`) after a board
or a fit changes:

    uv run scripts/cut_art.py

Each sprite on a board becomes an item, numbered in reading order (`hair-01`, `top-07`). Stored looks
refer to item IDs, so a redrawn board must keep every sprite where it was and only add new ones at
the end of a slot.

See art/README.md.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
BOARDS = ROOT / "new-art"
ITEMS = ROOT / "art" / "items"
GENERATED = ROOT / "src" / "generated"
SKIN_BOARD = BOARDS / "Chibi Character Skin Tone Grid.png"
HAIR_BOARD = BOARDS / "Chibi Avatar Hairstyle Selection Board.png"
WARDROBE_BOARD = BOARDS / "Chibi Avatar Wardrobe Collection.png"
HAT_BOARDS = [BOARDS / "hats-1.jpeg", BOARDS / "hat-2.jpeg"]

# The wardrobe board's reading order: how many of its sprites each slot holds.
WARDROBE = {"top": 16, "bottom": 16, "shoes": 8}

# Darkness (765 minus the RGB sum) above which a pixel is part of a sprite.
SPRITE = 40

# Where a slot's items go on the body, in the body's own pixels: the item's
# centre is `x` from the body's centre, its top is `y` from the body's top (or,
# with `bottom`, its bottom is that far down instead). `width` is its width, or
# `sx` scales the board's pixels, and `sy` scales them down the page (the same
# as across if left out). Clothes on the board are laid flat, so they're
# squeezed to the body's stance. Hair is fitted to the head by `fit_hair`.
CAP = {"x": -20, "bottom": 62, "width": 212, "sy": 0.8}
BEANIE = {"x": 0, "bottom": 70, "width": 186, "sy": 0.72}
BUCKET = {"x": 0, "bottom": 66, "width": 222, "sy": 0.8}
BERET = {"x": 0, "bottom": 48, "width": 200}
TOP = {"x": 0, "y": 193, "sx": 0.86, "sy": 0.86}
LONG_SLEEVES = {**TOP, "sx": 1.05, "sy": 0.85}
TROUSERS = {"x": 0, "y": 306, "width": 170, "sy": 0.75}
SHORT = {"x": 0, "y": 306, "width": 150, "sy": 0.8}
# The picture of a pair, for the wardrobe. Worn, each shoe has its own box.
SHOES = {"x": 0, "bottom": 479, "width": 190}
SHOE_WIDTH = 86
SHOE_CENTRE = 56
SHOE_BOTTOM = 479
FITS: dict[str, dict] = {
    **{f"hat-{n:02d}": CAP for n in range(1, 5)},
    **{f"hat-{n:02d}": BEANIE for n in range(5, 9)},
    **{f"hat-{n:02d}": BUCKET for n in range(9, 13)},
    **{f"hat-{n:02d}": BERET for n in [13, 14, 15, 16, 29, 30, 31, 32]},
    "hat-17": {"x": 0, "bottom": 54, "width": 222},  # pirate
    "hat-18": {"x": 0, "bottom": 60, "width": 226, "sy": 0.72},  # wizard
    "hat-19": {"x": 0, "bottom": 56, "width": 196, "sy": 0.72},  # viking
    "hat-20": {"x": 0, "bottom": 56, "width": 238, "sy": 0.8},  # cowboy
    "hat-21": {"x": 0, "y": -40, "width": 204},  # bear ears
    "hat-22": {"x": 0, "bottom": 40, "width": 172, "sy": 0.62},  # chef
    "hat-23": {"x": 0, "bottom": 26, "width": 96, "sy": 0.52},  # party
    "hat-24": {"x": 0, "bottom": 24, "width": 150, "sy": 0.6},  # crown
    # The astronaut's helmet goes round the whole head, so hair stays inside it.
    "hat-25": {"x": 0, "y": -35, "width": 280, "hidesHair": True},
    "hat-26": {"x": 0, "bottom": 52, "width": 248, "sy": 0.85},  # sombrero
    "hat-27": {"x": 0, "bottom": 28, "width": 128, "sy": 0.55},  # wind-up
    "hat-28": {"x": 0, "bottom": 44, "width": 188, "sy": 0.75},  # top hat
    "top": TOP,
    "shoes": SHOES,
    **{f"top-{n:02d}": LONG_SLEEVES for n in (4, 5, 6, 7, 12, 13, 14, 15)},
    **{f"bottom-{n:02d}": TROUSERS for n in (1, 2, 3, 5, 6, 7)},
    **{f"bottom-{n:02d}": SHORT for n in (4, 8, 9, 10, 12, 13, 14, 15, 16)},
    # Overalls: their bib goes over the top, so they're drawn after it.
    "bottom-11": {"x": 0, "y": 205, "sx": 0.8, "sy": 1.08, "over": True},
}
# Hair: how far above the body's top its crown sits, and how far past the head
# it has to reach on each side, down to `HAIR_COVERS` below the top.
HAIR_LIFT = 28
HAIR_MARGIN = 2
HAIR_COVERS = 62
HAIR_MAX_SCALE = 1.3
# On the eyes' row, a hair's opening must be this wide, up to this scale.
EYE_ROW = 118
EYE_OPENING = 118
OPENING_MAX_SCALE = 1.6
# Every hair is this much bigger than it has to be to cover the head.
HAIR_FULLNESS = 1.15
# Single hairs the fitting gets wrong: `crown` overrides where the head's top
# sits on the sprite, and x, y and scale adjust it after fitting.
HAIR_NUDGES: dict[str, dict] = {
    "hair-28": {"crown": 34},
}

# Hats drawn from a little below, showing their inside, which would really be
# behind the head. Each is a point inside that opening, as fractions of the
# sprite's width and height, and how close in colour the opening is: it and
# everything under it comes off, leaving the front rim as the hat's bottom edge.
OPENINGS = {
    "hat-07": (0.5, 0.93, 28),
    "hat-08": (0.5, 0.93, 28),
    "hat-17": (0.5, 0.88, 7),
    "hat-22": (0.5, 0.9, 28),
    "hat-23": (0.5, 0.94, 28),
    "hat-24": (0.5, 0.86, 28),
    "hat-27": (0.5, 0.93, 7),
}
# The astronaut's visor, which becomes glass so the face shows through.
VISOR = {"hat-25": (0.5, 0.55)}

# Where the face was drawn on the body, relative to its top-left corner: an
# ellipse holding the brows, eyes and mouth, and the nose, which stays.
FACE_AREA = {"cx": 125, "cy": 112, "rx": 82, "ry": 70}
NOSE = (112, 128, 138, 146)


def to_rows(boxes: list[tuple[int, int, int, int]], gap: int = 45) -> list[tuple[int, int, int, int]]:
    """Boxes in reading order, a row being boxes with centres close together."""
    rows: list[list[tuple[int, int, int, int]]] = []
    for box in sorted(boxes, key=lambda b: (b[1] + b[3]) / 2):
        cy = (box[1] + box[3]) / 2
        if rows and cy - np.mean([(b[1] + b[3]) / 2 for b in rows[-1]]) < gap:
            rows[-1].append(box)
        else:
            rows.append([box])
    return [b for row in rows for b in sorted(row, key=lambda b: b[0])]


def find_sprites(mask: np.ndarray, pairs_below: int | None = None) -> list[tuple[int, int, int, int]]:
    """Each sprite's box, in reading order. Below `pairs_below`, sprites are
    pairs of shoes, whose two shoes may not touch."""
    labels, _ = ndimage.label(mask, structure=np.ones((3, 3)))
    boxes = []
    for i, s in enumerate(ndimage.find_objects(labels), 1):
        if int((labels[s] == i).sum()) >= 600:
            boxes.append((s[1].start, s[0].start, s[1].stop, s[0].stop))
    if pairs_below is not None:
        boxes = [b for b in boxes if b[1] < pairs_below] + merged_pairs([b for b in boxes if b[1] >= pairs_below])
    return to_rows(boxes)


def merged_pairs(boxes: list[tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
    merged: list[tuple[int, int, int, int]] = []
    for b in sorted(boxes):
        if merged and b[0] - merged[-1][2] < 12:
            m = merged[-1]
            merged[-1] = (m[0], min(m[1], b[1]), b[2], max(m[3], b[3]))
        else:
            merged.append(b)
    return merged


def cut(rgb: np.ndarray, box: tuple[int, int, int, int], *, holes_are_background: bool) -> np.ndarray:
    """The sprite in `box` as RGBA floats, on a transparent background."""
    pad = 3
    x0, y0, x1, y1 = box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad
    x0, y0 = max(x0, 0), max(y0, 0)
    c = rgb[y0:y1, x0:x1]
    d = 765 - c.sum(2)
    solid = d > SPRITE
    # Only this sprite's own pieces, not a neighbour poking into the box.
    labels, n = ndimage.label(ndimage.binary_dilation(solid, iterations=1))
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    keep = np.zeros_like(solid)
    for i, size in enumerate(sizes, 1):
        piece = labels == i
        ys, xs = np.where(piece)
        at_edge = ys.min() == 0 or xs.min() == 0 or ys.max() == piece.shape[0] - 1 or xs.max() == piece.shape[1] - 1
        if size == sizes.max() or not at_edge:
            keep |= piece
    # Background is the light area reachable from the crop's border, so a white
    # garment's outlined inside stays. A hair's enclosed light areas are holes:
    # none of its colours are this light.
    light, count = ndimage.label(~solid)
    border = set(np.unique(np.r_[light[0], light[-1], light[:, 0], light[:, -1]])) - {0}
    if holes_are_background:
        areas = ndimage.sum(np.ones_like(light), light, range(1, count + 1))
        border |= {i for i, area in enumerate(areas, 1) if area > 12}
    bg = np.isin(light, list(border))
    # Fade the board's pale halo out, and keep the outline's soft edge.
    near_bg = ndimage.binary_dilation(bg, iterations=2)
    alpha = np.where(near_bg & (d < 300), np.clip((d - 45) / 200, 0, 1), 1.0)
    alpha[bg] = 0
    alpha[~ndimage.binary_fill_holes(keep)] = 0
    # Take out the white the edge pixels were mixed with.
    a = np.maximum(alpha, 1e-3)[..., None]
    colour = np.clip((c - (1 - a) * 255) / a, 0, 255)
    return trim(np.dstack([colour, alpha * 255]))


def trim(sprite: np.ndarray) -> np.ndarray:
    ys, xs = np.where(sprite[..., 3] > 8)
    return sprite[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def without_baked_skin(sprite: np.ndarray) -> np.ndarray:
    """Hair drawn over a head leaves bits of its skin showing. Takes them out,
    so the student's own ear shows through."""
    r, g, b = sprite[..., 0], sprite[..., 1], sprite[..., 2]
    # Blonde is too close to skin to tell apart, and shows no skin on the board.
    if np.median(r[sprite[..., 3] > 128]) > 180:
        return sprite
    skin = (r > 205) & (g > 150) & (b > 125) & (r - b < 85) & (r > g) & (g > b) & (sprite[..., 3] > 128)
    labels, n = ndimage.label(skin)
    out = sprite.copy()
    for i, area in enumerate(ndimage.sum(np.ones_like(labels), labels, range(1, n + 1)), 1):
        if 6 <= area <= 500:
            piece = ndimage.binary_dilation(labels == i, iterations=1) & (sprite[..., 0] > 150)
            out[..., 3][piece] = 0
    return out


def flood(sprite: np.ndarray, fx: float, fy: float, tolerance: float) -> np.ndarray:
    """The pixels joined to the point at (fx, fy) and close to its colour."""
    h, w = sprite.shape[:2]
    seed = sprite[int(fy * h), int(fx * w), :3]
    close = (np.abs(sprite[..., :3] - seed).max(-1) < tolerance) & (sprite[..., 3] > 128)
    labels, _ = ndimage.label(close)
    return labels == labels[int(fy * h), int(fx * w)]


def open_bottom(sprite: np.ndarray, fx: float, fy: float, tolerance: float) -> np.ndarray:
    """Takes off a hat's inside and everything below it."""
    opening = flood(sprite, fx, fy, tolerance)
    out = sprite.copy()
    for x in np.where(opening.any(0))[0]:
        out[np.where(opening[:, x])[0].min() :, x, 3] = 0
    return trim(out)


def glass_visor(sprite: np.ndarray, fx: float, fy: float) -> np.ndarray:
    """Makes a visor see-through, with a faint blue tint and a clean rim, and
    takes off the face drawn on it."""
    found = flood(sprite, fx, fy, 60)
    ys, xs = np.where(found)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    rx, ry = (xs.max() - xs.min()) / 2 + 3, (ys.max() - ys.min()) / 2 + 3
    yy, xx = np.mgrid[: sprite.shape[0], : sprite.shape[1]]
    # A rounded shape, as the visor's drawn: a superellipse.
    shape = np.abs((xx - cx) / rx) ** 2.6 + np.abs((yy - cy) / ry) ** 2.6
    out = sprite.copy()
    out[shape <= 1] = (190, 215, 235, 38)
    out[(shape > 0.94) & (shape <= 1.04)] = (80, 96, 118, 255)
    return out


def blank_face(body: np.ndarray) -> np.ndarray:
    """Takes the drawn brows, eyes and mouth off a body, filling them from the
    skin around them, so a renderer draws each expression's own."""
    h, w = body.shape[:2]
    ys, xs = np.mgrid[:h, :w]
    area = ((xs - FACE_AREA["cx"]) / FACE_AREA["rx"]) ** 2 + ((ys - FACE_AREA["cy"]) / FACE_AREA["ry"]) ** 2 <= 1
    nose = (xs >= NOSE[0]) & (xs < NOSE[2]) & (ys >= NOSE[1]) & (ys < NOSE[3])
    rgb = body[..., :3]
    skin = np.median(rgb[area], axis=0)
    features = area & ~nose & (np.abs(rgb - skin).max(-1) > 14)
    hole = ndimage.binary_dilation(features, iterations=3) & area
    known = (~hole & (body[..., 3] > 200)).astype(float)
    out = body.copy()
    for i in range(3):
        smooth = ndimage.gaussian_filter(rgb[..., i] * known, 8) / np.maximum(ndimage.gaussian_filter(known, 8), 1e-3)
        out[..., i] = np.where(hole, smooth, rgb[..., i])
    return out


def save(sprite: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(sprite, 0, 255).round().astype(np.uint8), "RGBA").save(path, optimize=True)


def split_pair(pair: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """A pair of shoes as its left and right shoes, parted at the emptiest
    column near the middle."""
    solid = pair[..., 3] > 128
    w = pair.shape[1]
    split = min(range(int(w * 0.4), int(w * 0.6)), key=lambda x: int(solid[:, x].sum()))
    return trim(pair[:, :split]), trim(pair[:, split:])


def shoe_box(piece_id: str, side: int, shoe: np.ndarray) -> dict:
    """Where a shoe goes: over its foot, in its own shape."""
    scale = SHOE_WIDTH / shoe.shape[1]
    w, h = SHOE_WIDTH, shoe.shape[0] * scale
    return {
        "id": piece_id,
        "x": round(side * SHOE_CENTRE - w / 2, 1),
        "y": round(SHOE_BOTTOM - h, 1),
        "width": round(w, 1),
        "height": round(h, 1),
    }


def fit_of(item_id: str, slot: str) -> dict:
    return FITS.get(item_id) or FITS[slot]


def box_of(item_id: str, slot: str, width: int, height: int) -> dict:
    fit = fit_of(item_id, slot)
    sx = fit["width"] / width if "width" in fit else fit["sx"]
    w, h = width * sx, height * fit.get("sy", sx)
    y = fit["bottom"] - h if "bottom" in fit else fit["y"]
    entry = {
        "id": item_id,
        "x": round(fit["x"] - w / 2, 1),
        "y": round(y, 1),
        "width": round(w, 1),
        "height": round(h, 1),
    }
    for flag in ("over", "hidesHair"):
        if fit.get(flag):
            entry[flag] = True
    return entry


def head_span(body: np.ndarray) -> list[tuple[int, int]]:
    """For each row of the body's top, how far the head reaches either side of
    its centre."""
    solid = body[..., 3] > 128
    centre = body.shape[1] // 2
    spans = []
    for row in solid[:HAIR_COVERS]:
        xs = np.where(row)[0]
        spans.append((centre - int(xs.min()), int(xs.max()) - centre) if xs.size else (0, 0))
    return spans


def opening_at_eyes(solid: np.ndarray, crown: int, cx: float, scale: float) -> float:
    """How wide the hair leaves the eyes' row, in the body's pixels, either
    side of the centre taken as twice the narrower side."""
    y = crown + round((EYE_ROW + HAIR_LIFT) / scale)
    if y >= solid.shape[0]:
        return float("inf")
    hair = np.where(solid[y])[0]
    if hair.size == 0:
        return float("inf")
    left, right = hair[hair < cx], hair[hair >= cx]
    sides = []
    if left.size:
        sides.append(cx - left.max())
    if right.size:
        sides.append(right.min() - cx)
    return 2 * float(min(sides)) * scale if sides else float("inf")


def hair_centre(solid: np.ndarray, extents: list, crown: int) -> float:
    """Where the head's centre goes on a hair: the middle of the opening for
    the face, if it has one. Strands and ponytails pull the sprite's own middle
    off to one side. A hair with no opening is a fringe: its cap's middle."""
    h, w = solid.shape
    probe = extents[min(crown + 30, h - 1)]
    fallback = (probe[0] + probe[1]) / 2
    middles = []
    for y in range(crown + 40, h):
        row = solid[y]
        x = int(fallback)
        if row[x]:
            continue
        left, right = x, x
        while left > 0 and not row[left - 1]:
            left -= 1
        while right < w - 1 and not row[right + 1]:
            right += 1
        # Hair on both sides, so this row really is the opening.
        if left > 0 and right < w - 1:
            middles.append((left + right) / 2)
    return float(np.median(middles)) if len(middles) >= 12 else fallback


def fit_hair(item_id: str, sprite: np.ndarray, head: list[tuple[int, int]]) -> dict:
    """Scales and places a hair so it covers the top of the head. The crown is
    where the hair gets wide, below any bun, and its centre is the crown's."""
    solid = sprite[..., 3] > 128
    h, w = solid.shape
    extents = [(np.where(r)[0].min(), np.where(r)[0].max()) if r.any() else (w, -1) for r in solid]
    widest = max(b - a for a, b in extents[: h // 2])
    nudge = HAIR_NUDGES.get(item_id, {})
    crown = nudge.get("crown", next(y for y, (a, b) in enumerate(extents) if b - a >= 0.62 * widest))
    cx = hair_centre(solid, extents, crown)
    scale = 1.0
    while scale < HAIR_MAX_SCALE:
        reach = True
        for y, (left, right) in enumerate(head):
            row = crown + round((y + HAIR_LIFT) / scale)
            if row >= h:
                reach = False
                break
            a, b = extents[row]
            if (cx - a) * scale < left + HAIR_MARGIN or (b - cx) * scale < right + HAIR_MARGIN:
                # Wispy rows may fall short: only the upper head has to be covered.
                if y < HAIR_COVERS * 0.8:
                    reach = False
                    break
        if reach:
            break
        scale += 0.01
    scale *= HAIR_FULLNESS * nudge.get("scale", 1)
    while scale < OPENING_MAX_SCALE and opening_at_eyes(solid, crown, cx, scale) < EYE_OPENING:
        scale += 0.01
    return {
        "id": item_id,
        "x": round(nudge.get("x", 0) - cx * scale, 1),
        "y": round(nudge.get("y", 0) - HAIR_LIFT - crown * scale, 1),
        "width": round(w * scale, 1),
        "height": round(h * scale, 1),
    }


def main() -> None:
    catalogue: dict[str, list[dict]] = {}
    shoe_pieces: dict[str, list[dict]] = {}

    # Bodies have a transparent background already.
    board = np.asarray(Image.open(SKIN_BOARD).convert("RGBA")).astype(float)
    bodies = find_sprites(board[..., 3] > 128)
    frame_w = max(b[2] - b[0] for b in bodies)
    frame_h = max(b[3] - b[1] for b in bodies)
    catalogue["body"] = []
    for n, (x0, y0, x1, y1) in enumerate(bodies, 1):
        canvas = np.zeros((frame_h, frame_w, 4))
        crop = board[y0:y1, x0:x1].copy()
        crop[..., :3] *= crop[..., 3:4] > 0
        canvas[: y1 - y0, : x1 - x0] = crop
        item_id = f"skin-{n:02d}"
        save(blank_face(canvas), ITEMS / "body" / f"{item_id}.png")
        catalogue["body"].append(
            {"id": item_id, "x": -frame_w / 2, "y": 0, "width": frame_w, "height": frame_h}
        )

    def cut_board(path: Path, *, holes_are_background: bool, pairs_below: int | None = None) -> list[np.ndarray]:
        rgb = np.asarray(Image.open(path).convert("RGB")).astype(float)
        boxes = find_sprites((765 - rgb.sum(2)) > SPRITE, pairs_below)
        return [cut(rgb, b, holes_are_background=holes_are_background) for b in boxes]

    head = head_span(np.asarray(Image.open(ITEMS / "body" / "skin-01.png")).astype(float))

    def write_slot(slot: str, sprites: list[np.ndarray]) -> None:
        out = ITEMS / slot
        out.mkdir(parents=True, exist_ok=True)
        for old in out.glob("*.png"):
            old.unlink()
        catalogue[slot] = []
        for n, sprite in enumerate(sprites, 1):
            item_id = f"{slot}-{n:02d}"
            save(sprite, out / f"{item_id}.png")
            catalogue[slot].append(
                fit_hair(item_id, sprite, head)
                if slot == "hair"
                else box_of(item_id, slot, sprite.shape[1], sprite.shape[0])
            )

    write_slot("hair", [trim(without_baked_skin(s)) for s in cut_board(HAIR_BOARD, holes_are_background=True)])

    wardrobe = cut_board(WARDROBE_BOARD, holes_are_background=False, pairs_below=840)
    assert len(wardrobe) == sum(WARDROBE.values()), len(wardrobe)
    start = 0
    for slot, count in WARDROBE.items():
        sprites = wardrobe[start : start + count]
        write_slot(slot, sprites)
        if slot == "shoes":
            for n, sprite in enumerate(sprites, 1):
                item_id = f"shoes-{n:02d}"
                left, right = split_pair(sprite)
                save(left, ITEMS / "shoes" / f"{item_id}-left.png")
                save(right, ITEMS / "shoes" / f"{item_id}-right.png")
                shoe_pieces[item_id] = [
                    shoe_box(f"{item_id}-left", -1, left),
                    shoe_box(f"{item_id}-right", 1, right),
                ]
        start += count

    hats = [sprite for board_path in HAT_BOARDS for sprite in cut_board(board_path, holes_are_background=False)]
    for n, sprite in enumerate(hats, 1):
        item_id = f"hat-{n:02d}"
        if item_id in OPENINGS:
            hats[n - 1] = open_bottom(sprite, *OPENINGS[item_id])
        if item_id in VISOR:
            hats[n - 1] = glass_visor(sprite, *VISOR[item_id])
    write_slot("hat", hats)

    for slot, entries in catalogue.items():
        print(f"{slot}: {len(entries)} items")

    order = ["body", "hair", "hat", "top", "bottom", "shoes"]
    header = "// Generated by scripts/cut_art.py from the art boards. Don't edit.\n\n"
    data = [
        "/** Each slot's items, and where each is drawn: x from the body's centre, y from its top. */",
        "export const avatarItems = {",
    ]
    for slot in order:
        data.append(f"  {slot}: [")
        for e in catalogue[slot]:
            over = "".join(f", {flag}: true" for flag in ("over", "hidesHair") if e.get(flag))
            data.append(
                f'    {{ id: "{e["id"]}", x: {json.dumps(e["x"])}, y: {json.dumps(e["y"])}, '
                f'width: {json.dumps(e["width"])}, height: {json.dumps(e["height"])}{over} }},'
            )
        data.append("  ],")
    data.append("} as const;")
    data += ["", "/** Each pair of shoes as its two shoes, each with its own box. */", "export const avatarShoePieces = {"]
    for item_id, boxes in shoe_pieces.items():
        data.append(f'  "{item_id}": [')
        for e in boxes:
            data.append(f'    {{ id: "{e["id"]}", x: {json.dumps(e["x"])}, y: {json.dumps(e["y"])}, width: {json.dumps(e["width"])}, height: {json.dumps(e["height"])} }},')
        data.append("  ],")
    data.append("} as const;")
    # URLs live apart from the data, so the API can validate looks without
    # resolving art.
    urls = ["/** Each item's PNG, resolved by the bundler. */", "export const avatarItemUrls: Record<string, string> = {"]
    for slot in order:
        for e in catalogue[slot]:
            urls.append(f'  "{e["id"]}": new URL("../../art/items/{slot}/{e["id"]}.png", import.meta.url).href,')
            for piece in shoe_pieces.get(e["id"], []):
                urls.append(f'  "{piece["id"]}": new URL("../../art/items/{slot}/{piece["id"]}.png", import.meta.url).href,')
    urls.append("};")
    GENERATED.mkdir(parents=True, exist_ok=True)
    for old in GENERATED.glob("*.ts"):
        old.unlink()
    (GENERATED / "items.ts").write_text(header + "\n".join(data) + "\n")
    (GENERATED / "item-urls.ts").write_text(header + "\n".join(urls) + "\n")


if __name__ == "__main__":
    main()
