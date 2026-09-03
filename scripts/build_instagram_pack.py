from pathlib import Path
from PIL import Image, ImageFont
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "instagram"
BRAND = ROOT / "public" / "brand"
OUT.mkdir(parents=True, exist_ok=True)
BRAND.mkdir(parents=True, exist_ok=True)

INK = (23, 26, 24, 255)
PAPER = (244, 244, 241, 255)
WHITE = (255, 255, 255, 255)
FOREST = (24, 60, 50, 255)
SOURCE = ROOT / "public" / "brand-concepts" / "dukenim-logo-a-no-handle.png"

def exact_alpha(crop_box):
    """Extract the approved black artwork from its warm-white presentation board."""
    crop = Image.open(SOURCE).convert("RGB").crop(crop_box)
    lum = crop.convert("L")
    # The source board is approximately 248; retain antialiased edge coverage.
    alpha = lum.point(lambda v: max(0, min(255, round((248 - v) * 255 / 225))))
    # Remove the board's soft shadow while preserving the artwork's antialiased edge.
    alpha = alpha.point(
        lambda a: 0 if a < 100 else (255 if a > 220 else round((a - 100) * 255 / 120))
    )
    bbox = alpha.getbbox()
    alpha = alpha.crop(bbox)
    return alpha

def colored_art(alpha, color):
    art = Image.new("RGBA", alpha.size, color)
    art.putalpha(alpha)
    return art

def place(canvas, art, target_box):
    x, y, w, h = target_box
    scale = min(w / art.width, h / art.height)
    size = (round(art.width * scale), round(art.height * scale))
    resized = art.resize(size, Image.Resampling.LANCZOS)
    px = round(x + (w - size[0]) / 2)
    py = round(y + (h - size[1]) / 2)
    canvas.alpha_composite(resized, (px, py))

# Exact crops measured from the approved 1536 x 1024 presentation board.
symbol_alpha = exact_alpha((382, 105, 605, 360))
lockup_alpha = exact_alpha((382, 105, 1175, 360))

symbol_black = colored_art(symbol_alpha, INK)
symbol_white = colored_art(symbol_alpha, WHITE)
lockup_black = colored_art(lockup_alpha, INK)
lockup_white = colored_art(lockup_alpha, WHITE)

symbol_black.save(BRAND / "dukenim-symbol-approved-black.png", optimize=True)
symbol_white.save(BRAND / "dukenim-symbol-approved-white.png", optimize=True)
lockup_black.save(BRAND / "dukenim-lockup-approved-black.png", optimize=True)
lockup_white.save(BRAND / "dukenim-lockup-approved-white.png", optimize=True)

# Large transparent delivery files, preserving the approved proportions.
for name, art in [
    ("dukenim-symbol-black-transparent.png", symbol_black),
    ("dukenim-symbol-white-transparent.png", symbol_white),
    ("dukenim-lockup-black-transparent.png", lockup_black),
    ("dukenim-lockup-white-transparent.png", lockup_white),
]:
    canvas = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
    place(canvas, art, (174, 174, 1700, 1700))
    canvas.save(OUT / name, optimize=True)

# Instagram profile image: exact symbol, safe inside a circular crop.
im = Image.new("RGBA", (1080, 1080), INK)
place(im, symbol_white, (270, 270, 540, 540))
im.convert("RGB").save(OUT / "instagram-profile-1080.jpg", quality=95, subsampling=0)

# Square identity post using the exact approved horizontal lockup.
im = Image.new("RGBA", (1080, 1080), PAPER)
place(im, lockup_black, (120, 365, 840, 350))
im.convert("RGB").save(OUT / "instagram-logo-post-1080.jpg", quality=95, subsampling=0)

# Story cover: exact symbol plus a simple brand caption outside the mark.
im = Image.new("RGBA", (1080, 1920), FOREST)
place(im, symbol_white, (235, 470, 610, 650))
d = __import__("PIL.ImageDraw", fromlist=["ImageDraw"]).Draw(im)
brand_font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 120)
tag_font = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 44)
d.text((540, 1210), "Dukenim", font=brand_font, fill=WHITE, anchor="mm")
d.text((540, 1310), "Открыто для торговли", font=tag_font, fill=WHITE, anchor="mm")
im.convert("RGB").save(OUT / "instagram-story-1080x1920.jpg", quality=95, subsampling=0)

Image.open(SOURCE).save(OUT / "dukenim-approved-logo-board.png", optimize=True)

(OUT / "README.txt").write_text(
    "DUKENIM / INSTAGRAM PACK\n\n"
    "Все логотипы извлечены напрямую из утверждённого макета без перерисовки.\n"
    "instagram-profile-1080.jpg - фото профиля.\n"
    "instagram-logo-post-1080.jpg - квадратная публикация.\n"
    "instagram-story-1080x1920.jpg - сторис.\n"
    "*-transparent.png - прозрачные знаки и горизонтальные логотипы.\n",
    encoding="utf-8",
)

zip_path = ROOT / "output" / "dukenim-instagram-pack.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for path in sorted(OUT.iterdir()):
        z.write(path, f"dukenim-instagram/{path.name}")
print(zip_path)
