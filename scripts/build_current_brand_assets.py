from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
MOBILE = ROOT / "apps" / "mobile" / "assets" / "images"

INK = (17, 24, 32, 255)
WHITE = (255, 255, 255, 255)
# The owner chose a white doorway threshold and white icon background. Keep
# the approved D silhouette and restrict the change to that threshold only.
THRESHOLD = WHITE
ICON_BACKGROUND = WHITE

# The approved 196x213 alpha silhouette is the geometry source. The accent is
# deliberately restricted to the flat threshold directly inside the doorway.
SOURCE = Image.open(BRAND / "dukenim-approved-symbol.png").convert("RGBA")


def current_symbol(body: tuple[int, int, int, int]) -> Image.Image:
    alpha = SOURCE.getchannel("A")
    image = Image.new("RGBA", SOURCE.size, body)
    image.putalpha(alpha)

    threshold_mask = Image.new("L", SOURCE.size, 0)
    ImageDraw.Draw(threshold_mask).rectangle((55, 186, 125, 212), fill=255)
    threshold_mask = ImageChops.multiply(threshold_mask, alpha)
    accent = Image.new("RGBA", SOURCE.size, THRESHOLD)
    image.paste(accent, (0, 0), threshold_mask)
    return image


def transparent_mark(symbol: Image.Image, size: int, box: tuple[int, int, int, int]) -> Image.Image:
    left, top, width, height = box
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mark = symbol.resize((width, height), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, (left, top))
    return canvas


def square_icon(symbol: Image.Image, size: int, mark_height: int | None = None) -> Image.Image:
    height = mark_height or round(size * 0.535)
    width = round(height * symbol.width / symbol.height)
    canvas = Image.new("RGBA", (size, size), ICON_BACKGROUND)
    mark = symbol.resize((width, height), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, ((size - width) // 2, (size - height) // 2))
    return canvas


primary = current_symbol(INK)
reversed_symbol = current_symbol(WHITE)

primary.save(BRAND / "dukenim-symbol-current.png")
reversed_symbol.save(BRAND / "dukenim-symbol-current-reversed.png")
primary.save(MOBILE / "logo-mark-compact.png")

transparent_mark(primary, 1024, (153, 122, 718, 780)).save(MOBILE / "logo-mark.png")
square_icon(primary, 1024, 548).save(MOBILE / "icon-1024.png")
square_icon(primary, 512).save(ROOT / "public" / "icon-512.png")
square_icon(primary, 192).save(ROOT / "public" / "icon-192.png")
square_icon(primary, 512).save(ROOT / "src" / "app" / "apple-icon.png")

print("Generated current Dukenim web and mobile assets from the approved silhouette.")
