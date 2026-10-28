# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy", "pillow", "scipy"]
# ///
"""Turn the avatar sheet (art/sheet.png) into tintable shapes and items.

Writes art/shapes/<slot>/ and src/generated/. Run from packages/avatar (`pnpm slice-sheet`) after
the sheet changes:

    uv run scripts/slice_sheet.py

Every sprite on the sheet becomes an item, numbered in reading order
(`hair-01`, `top-07`). Sprites that are the same drawing in different colours
share one shape, and each item is that shape plus a colour ramp sampled from
its sprite. Multi-colour sprites (stripes, camo, two-tone shoes) stay fixed
colour art. Stored looks refer to item IDs, so a redrawn sheet must keep every
sprite where it was and only add new ones at the end of a slot.

See art/README.md for the layers, and how to replace them with better art.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "art" / "sheet.png"
SHAPES = ROOT / "art" / "shapes"
GENERATED = ROOT / "src" / "generated"

# Each slot's area of the sheet, as x0, y0, x1, y1, below its heading.
REGIONS = {
    "body": (30, 80, 700, 645),
    "hair": (710, 66, 1510, 624),
    "hat": (710, 667, 1510, 842),
    "top": (30, 704, 700, 807),
    "bottom": (30, 843, 700, 992),
    "shoes": (710, 880, 1510, 994),
}
# Sprites with more than one colour, which a single ramp can't tint.
FIXED = {
    "hat": {3, 4, 5, 6, 31, 33, 41},
    "top": {2, 14, 18, 22},
    "bottom": {12, 13},
    # Nearly every shoe has a sole in a second colour.
    "shoes": set(range(1, 45)),
}
# The body every skin tone tints: the bodies are one drawing.
BODY_SHAPE = 8
# Skin tones offered, picked evenly by lightness from the sheet's 32.
SKIN_TONES = 12

# Darkness (765 minus the RGB sum) above which a pixel is part of a sprite.
SPRITE = 45
PAD = 3
# The ink colour (`ink.default` in @repo/tokens).
INK = (0x1F, 0x1F, 0x1F)
# Grey levels the ramp's shadow, base and highlight sit at.
STOPS = (0.12, 0.5, 0.88)


def lum(a: np.ndarray) -> np.ndarray:
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


# ---------------------------------------------------------------- slicing


def find_sprites(dark: np.ndarray) -> dict[str, list[tuple[int, int, int, int]]]:
    """Each slot's sprite boxes, in reading order."""
    found = {}
    for slot, (x0, y0, x1, y1) in REGIONS.items():
        mask = dark[y0:y1, x0:x1] > SPRITE
        # Tops sit too close together to grow them before labelling.
        if slot != "top":
            mask = ndimage.binary_dilation(mask, iterations=2)
        labels, _ = ndimage.label(mask)
        boxes = []
        for i, s in enumerate(ndimage.find_objects(labels), 1):
            size = int((labels[s] == i).sum())
            boxes.append([s[1].start + x0, s[0].start + y0, s[1].stop + x0, s[0].stop + y0, size])
        big = [b for b in boxes if b[4] >= 400]
        # Stray strands and hat strings join the sprite they're nearest to.
        for b in (b for b in boxes if b[4] < 400):
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2

            def gap(t):
                return max(t[0] - cx, 0, cx - t[2]) + max(t[1] - cy, 0, cy - t[3])

            t = min(big, key=gap)
            if gap(t) < 15:
                t[:4] = min(t[0], b[0]), min(t[1], b[1]), max(t[2], b[2]), max(t[3], b[3])
        big.sort(key=lambda b: (b[1] + b[3]) / 2)
        rows: list[list[list[int]]] = []
        for b in big:
            cy = (b[1] + b[3]) / 2
            if rows and cy - (rows[-1][-1][1] + rows[-1][-1][3]) / 2 < 25:
                rows[-1].append(b)
            else:
                rows.append([b])
        found[slot] = [tuple(b[:4]) for row in rows for b in sorted(row, key=lambda b: b[0])]

    # The sheet files two sprites under the wrong heading: the shoes' 17th is
    # shorts, and the bottoms' third row is shorts then 13 shoes.
    bottom, shoes = found["bottom"], found["shoes"]
    found["bottom"] = bottom[:18] + [shoes[16]]
    found["shoes"] = shoes[:16] + bottom[18:] + shoes[17:]
    return found


def cut(rgb: np.ndarray, dark: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
    """The sprite in `box` as trimmed RGBA floats, on a transparent background."""
    x0, y0, x1, y1 = box[0] - PAD, box[1] - PAD, box[2] + PAD, box[3] + PAD
    d, c = dark[y0:y1, x0:x1], rgb[y0:y1, x0:x1]
    # Keep the sprite's own pieces, not neighbours poking into the box.
    solid = ndimage.binary_dilation(d > SPRITE, iterations=2)
    labels, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, labels, range(1, n + 1))
    keep = np.zeros_like(solid)
    for i, size in enumerate(sizes, 1):
        piece = labels == i
        ys, xs = np.where(piece)
        at_edge = ys.min() == 0 or xs.min() == 0 or ys.max() == piece.shape[0] - 1 or xs.max() == piece.shape[1] - 1
        if size == sizes.max() or not at_edge:
            keep |= piece
    keep = ndimage.binary_fill_holes(keep)
    # Background is the light area reachable from the crop's border, so a
    # white garment's outlined inside stays opaque.
    light, _ = ndimage.label(d <= SPRITE)
    border = set(np.unique(np.r_[light[0], light[-1], light[:, 0], light[:, -1]])) - {0}
    bg = np.isin(light, list(border))
    # Fade the sheet's pale halo out entirely, and the outline's soft edge in.
    alpha = np.where(bg, np.clip((d - 120) / 150, 0, 1), 1.0)
    alpha[~keep] = 0
    # Un-blend the white the edge pixels were mixed with.
    a = np.maximum(alpha, 1e-3)[..., None]
    colour = np.clip((c - (1 - a) * 255) / a, 0, 255)
    sprite = np.dstack([colour, alpha * 255])
    ys, xs = np.where(alpha > 0)
    return sprite[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


# ---------------------------------------------------------------- shapes


def interior(a: np.ndarray) -> np.ndarray:
    """Opaque pixels clear of the outline."""
    return ndimage.binary_erosion(a[..., 3] > 200, iterations=3)


def ink_alpha(a: np.ndarray) -> np.ndarray:
    """How much of each pixel is ink: outline, eyes and drawn details."""
    y = lum(a)
    inside = interior(a) & (y > 40)
    floor = max(INK[0] + 25, 0.6 * np.median(y[inside])) if inside.any() else 110
    fill = np.where((a[..., 3] > 200) & (y > floor), y, 0)
    # Un-blend each pixel between ink and the nearby fill's lightness, so the
    # outline keeps its soft edge while faint shading stays in the fill.
    near = ndimage.grey_dilation(fill, size=7)
    near = np.where(near > 0, near, 200)
    share = np.clip((near - y) / np.maximum(near - INK[0], 1), 0, 1)
    share = np.where(share < 0.3, 0, np.clip((share - 0.3) / 0.5, 0, 1))
    if inside.any() and np.median(y[inside]) < 90:
        # Too dark to tell drawn details from shading: only the outline is
        # ink, and inner strands stay in the fill as shadow.
        share *= ~ndimage.binary_erosion(a[..., 3] > 128, iterations=3)
    return share * (a[..., 3] / 255)


def ramp(a: np.ndarray) -> list[str]:
    """The sprite's shadow, base and highlight colours."""
    m = interior(a) & (lum(a) > 40)
    px = a[m][:, :3]
    y = lum(px)
    order = np.argsort(y)
    out = []
    for q in STOPS:
        i = order[int(q * (len(order) - 1))]
        band = np.abs(y - y[i]) < 6
        out.append("#%02X%02X%02X" % tuple(np.median(px[band], 0).round().astype(int)))
    return out


def tint_layers(a: np.ndarray, face: bool) -> dict[str, np.ndarray]:
    """The grey fill, ink and (for the body) face layers of a tintable sprite."""
    ink = ink_alpha(a)
    y = lum(a)
    m = (a[..., 3] > 0) & (ink < 0.05)
    # The fill's grey encodes each pixel's rank among the sprite's
    # lightnesses, so the STOPS land on its own shadow, base and highlight.
    values = np.sort(y[m])
    rank = np.where(m, np.searchsorted(values, y) / max(len(values) - 1, 1), 0.5)
    # Soften the sheet's mottled texture, which blotches once it's stretched
    # over a new colour.
    grey = np.clip(ndimage.gaussian_filter(rank, 1.0) * 255, 0, 255)
    layers = {
        "fill": np.dstack([grey, grey, grey, a[..., 3]]),
        "ink": np.dstack([np.full_like(grey, INK[0]), np.full_like(grey, INK[1]), np.full_like(grey, INK[2]), ink * 255]),
    }
    if face:
        # Mouth and cheeks: how much each face pixel darkens or warms the skin
        # around it, drawn with multiply so it suits every tone.
        rgb, solid = a[..., :3], m.astype(float)
        weight = np.maximum(ndimage.gaussian_filter(solid, 4), 1e-3)
        local = np.stack([ndimage.gaussian_filter(rgb[..., i] * solid, 4) / weight for i in range(3)], -1)
        ratio = np.clip(rgb / np.maximum(local, 1), 0, 1)
        h, w = m.shape
        area = np.zeros(m.shape, bool)
        area[int(h * 0.25) : int(h * 0.43), int(w * 0.17) : int(w * 0.83)] = True
        strength = np.clip((1 - ratio.min(-1) - 0.04) / 0.08, 0, 1) * area * m
        layers["face"] = np.dstack([ratio * 255 * (strength[..., None] > 0), strength * 255])
    return layers


def blank_face(layers: dict[str, np.ndarray]) -> dict:
    """Takes the drawn eyes and mouth off the body's layers, keeping its
    cheeks, so renderers draw each expression's own. Returns where they were:
    each eye's centre, the eye height and the mouth's centre."""
    ink, face, fill = layers["ink"], layers["face"], layers["fill"]
    h, w = ink.shape[:2]
    inner = ndimage.binary_erosion(fill[..., 3] > 200, iterations=4)
    band = np.zeros((h, w), bool)
    band[int(h * 0.22) : int(h * 0.40), int(w * 0.2) : int(w * 0.8)] = True
    eyes = (ink[..., 3] > 25) & band & inner
    labels, n = ndimage.label(eyes)
    found = sorted(ndimage.center_of_mass(eyes, labels, range(1, n + 1)), key=lambda c: c[1])
    eye_rows = np.where(eyes.any(1))[0]
    # The mouth is the face layer's middle; the cheeks are either side.
    middle = np.zeros((h, w), bool)
    middle[int(h * 0.31) : int(h * 0.40), int(w * 0.38) : int(w * 0.62)] = True
    mouth = middle & (face[..., 3] > 0)
    my, mx = ndimage.center_of_mass(mouth)
    # The fill shades the mouth too: fill it from the skin around it.
    hole = ndimage.binary_dilation(eyes | mouth, iterations=2) & inner
    keep = (~hole & (fill[..., 3] > 0)).astype(float)
    grey = fill[..., 0]
    smooth = ndimage.gaussian_filter(grey * keep, 3) / np.maximum(ndimage.gaussian_filter(keep, 3), 1e-3)
    fill[..., :3] = np.where(hole[..., None], smooth[..., None], fill[..., :3])
    ink[..., 3] = np.where(ndimage.binary_dilation(eyes, iterations=1) & inner, 0, ink[..., 3])
    face[..., 3] = np.where(middle, 0, face[..., 3])
    return {
        "eyes": [[round(float(x), 1), round(float(y), 1)] for y, x in found],
        "eyeHeight": int(eye_rows.max() - eye_rows.min() + 1),
        "mouth": [round(float(mx), 1), round(float(my), 1)],
    }


def centred(mask: np.ndarray, h: int, w: int) -> np.ndarray:
    out = np.zeros((h, w), mask.dtype)
    y0, x0 = (h - mask.shape[0]) // 2, (w - mask.shape[1]) // 2
    out[y0 : y0 + mask.shape[0], x0 : x0 + mask.shape[1]] = mask
    return out


def details(a: np.ndarray) -> np.ndarray:
    """Inner line work: pixels darker than the fill around them."""
    y = lum(a)
    return ndimage.binary_erosion(a[..., 3] > 128, iterations=3) & (y < ndimage.median_filter(y, size=7) - 25)


def same_drawing(a: np.ndarray, b: np.ndarray) -> bool:
    """Whether two sprites are one drawing in different colours."""
    if abs(a.shape[0] - b.shape[0]) > 4 or abs(a.shape[1] - b.shape[1]) > 4:
        return False
    h, w = max(a.shape[0], b.shape[0]), max(a.shape[1], b.shape[1])
    sa, sb = centred(a[..., 3] > 128, h, w), centred(b[..., 3] > 128, h, w)
    if (sa & sb).sum() / (sa | sb).sum() <= 0.88:
        return False
    da, db = centred(details(a), h, w), centred(details(b), h, w)
    if da.sum() + db.sum() < 15:
        return True
    ga, gb = ndimage.binary_dilation(da, iterations=2), ndimage.binary_dilation(db, iterations=2)
    return min((da & gb).sum() / max(da.sum(), 1), (db & ga).sum() / max(db.sum(), 1)) > 0.6


def group(sprites: list[np.ndarray], tintable: list[int]) -> list[list[int]]:
    """Tintable sprites grouped into shared drawings."""
    groups: list[list[int]] = []
    for i in tintable:
        for g in groups:
            if all(same_drawing(sprites[j], sprites[i]) for j in g):
                g.append(i)
                break
        else:
            groups.append([i])
    return groups


def save(arr: np.ndarray, path: Path) -> None:
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(path, optimize=True)


def lightness(hex_colour: str) -> float:
    return float(lum(np.array([int(hex_colour[k : k + 2], 16) for k in (1, 3, 5)], float)))


# ---------------------------------------------------------------- output


def main() -> None:
    rgb = np.asarray(Image.open(SHEET).convert("RGB")).astype(float)
    dark = 765 - rgb.sum(2)
    shapes: dict[str, list[dict]] = {}
    items: dict[str, list[dict]] = {}
    body_face: dict = {}
    for slot, boxes in find_sprites(dark).items():
        sprites = [cut(rgb, dark, box) for box in boxes]
        out = SHAPES / slot
        out.mkdir(parents=True, exist_ok=True)
        for old in out.glob("*.png"):
            old.unlink()
        shapes[slot], items[slot] = [], []

        def add_shape(shape_id: str, sprite: np.ndarray, layers: dict[str, np.ndarray]) -> None:
            for name, layer in layers.items():
                save(layer, out / f"{shape_id}.{name}.png")
            shapes[slot].append({"id": shape_id, "width": sprite.shape[1], "height": sprite.shape[0], "layers": list(layers)})

        if slot == "body":
            base = sprites[BODY_SHAPE - 1]
            layers = tint_layers(base, face=True)
            body_face.update(blank_face(layers))
            add_shape("body", base, layers)
            tones = sorted((ramp(s) for s in sprites), key=lambda r: -lightness(r[1]))
            for n, i in enumerate(np.linspace(0, len(tones) - 1, SKIN_TONES).round().astype(int), 1):
                items[slot].append({"id": f"skin-{n:02d}", "shape": "body", "ramp": tones[i]})
            print(f"body: 1 shape, {SKIN_TONES} skin tones")
            continue

        fixed = FIXED.get(slot, set())
        groups = group(sprites, [i for i in range(len(sprites)) if i + 1 not in fixed])
        shape_of: dict[int, str] = {}
        for n, g in enumerate(groups, 1):
            shape_id = f"{slot}-shape-{n:02d}"
            # Tint from the member nearest a mid lightness, where ink and fill
            # separate best.
            rep = min(g, key=lambda i: abs(np.median(lum(sprites[i])[interior(sprites[i])]) - 150))
            add_shape(shape_id, sprites[rep], tint_layers(sprites[rep], face=False))
            for i in g:
                shape_of[i] = shape_id
        for i, sprite in enumerate(sprites):
            item_id = f"{slot}-{i + 1:02d}"
            if i in shape_of:
                items[slot].append({"id": item_id, "shape": shape_of[i], "ramp": ramp(sprite)})
            else:
                add_shape(item_id, sprite, {"colour": sprite})
                items[slot].append({"id": item_id, "shape": item_id, "ramp": None})
        print(f"{slot}: {len(sprites)} items, {len(groups)} tinted shapes, {len(sprites) - len(shape_of)} fixed")

    header = "// Generated by scripts/slice_sheet.py from art/sheet.png. Don't edit.\n\n"
    data = [
        "/** Each slot's drawings, with their size in body-frame units. */",
        "export const sheetShapes = {",
    ]
    for slot, list_ in shapes.items():
        data.append(f"  {slot}: [")
        data += [f'    {{ id: "{s["id"]}", width: {s["width"]}, height: {s["height"]}, layers: {json.dumps(s["layers"])} }},' for s in list_]
        data.append("  ],")
    data += ["} as const;", "", "/** Each slot's items: a shape, and the ramp that tints it (null for fixed art). */", "export const sheetItems = {"]
    for slot, list_ in items.items():
        data.append(f"  {slot}: [")
        data += [f'    {{ id: "{i["id"]}", shape: "{i["shape"]}", ramp: {json.dumps(i["ramp"])} }},' for i in list_]
        data.append("  ],")
    data.append("} as const;")
    data += [
        "",
        "/**",
        " * Where the body's face goes, in body-frame units: each eye's centre, the",
        " * eyes' height and the mouth's centre. The body is drawn without eyes or a",
        " * mouth, so each expression draws its own.",
        " */",
        f"export const sheetFace = {{ eyes: {json.dumps(body_face['eyes'])}, eyeHeight: {body_face['eyeHeight']}, mouth: {json.dumps(body_face['mouth'])} }} as const;",
    ]
    # URLs live apart from the data, so the API can validate looks without
    # resolving art.
    urls = [
        "/** Each shape's layer PNGs, resolved by the bundler. */",
        "export const sheetShapeUrls: Record<string, Record<string, string>> = {",
    ]
    for slot, list_ in shapes.items():
        for s in list_:
            urls.append(f'  "{s["id"]}": {{')
            urls += [f'    {layer}: new URL("../../art/shapes/{slot}/{s["id"]}.{layer}.png", import.meta.url).href,' for layer in s["layers"]]
            urls.append("  },")
    urls.append("};")
    GENERATED.mkdir(parents=True, exist_ok=True)
    for old in GENERATED.glob("*.ts"):
        old.unlink()
    (GENERATED / "shapes.ts").write_text(header + "\n".join(data) + "\n")
    (GENERATED / "shape-urls.ts").write_text(header + "\n".join(urls) + "\n")


if __name__ == "__main__":
    main()
