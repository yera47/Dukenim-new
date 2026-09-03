from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
source = root / "public" / "brand-concepts" / "dukenim-combo-a-green-final.png"
out_dir = root / "public" / "brand"
im = Image.open(source).convert("RGBA")

# The approved render uses a warm, almost-white studio background. Build alpha
# from distance to that background without redrawing any logo geometry.
bg = Image.new("RGBA", im.size, im.getpixel((8, 8)))
diff = ImageChops.difference(im, bg).convert("L")
alpha = diff.point(lambda p: 0 if p < 8 else min(255, (p - 8) * 10))
im.putalpha(alpha)
bbox = alpha.getbbox()
if not bbox:
    raise RuntimeError("Approved logo could not be extracted")

lockup = im.crop(bbox)

def recolor(asset, reversed_mode=False):
    result = asset.copy()
    pixels = result.load()
    for yy in range(result.height):
        for xx in range(result.width):
            r, g, b, a = pixels[xx, yy]
            if not a:
                continue
            is_accent = g > 80 and (g-r) > 25 and (g-b) > 10
            if is_accent:
                pixels[xx, yy] = (176, 138, 80, a)  # aged gold #B08A50
            else:
                pixels[xx, yy] = ((255, 253, 248, a) if reversed_mode else (7, 27, 23, a))
    return result

lockup = recolor(lockup)
lockup.save(out_dir / "dukenim-approved-master.png")

# The symbol is separated from the wordmark by a wide transparent gap.
symbol_width = round(lockup.width * 0.18)
symbol = lockup.crop((0, 0, symbol_width, lockup.height))
symbol_bbox = symbol.getchannel("A").getbbox()
symbol = symbol.crop(symbol_bbox)
symbol.save(out_dir / "dukenim-approved-symbol.png")

raw_lockup = im.crop(bbox)
raw_symbol = raw_lockup.crop((0, 0, symbol_width, raw_lockup.height)).crop(symbol_bbox)
recolor(raw_lockup, True).save(out_dir / "dukenim-approved-master-reversed.png")
recolor(raw_symbol, True).save(out_dir / "dukenim-approved-symbol-reversed.png")

print(lockup.size, symbol.size)
