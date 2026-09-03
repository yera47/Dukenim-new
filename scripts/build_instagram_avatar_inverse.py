from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
source = root / "public" / "brand" / "dukenim-approved-symbol.png"
output = root / "output" / "brand" / "dukenim-instagram-avatar-inverse-1080.png"
output.parent.mkdir(parents=True, exist_ok=True)

size = 1080
canvas = Image.new("RGB", (size, size), "#F4F0E8")
ImageDraw.Draw(canvas).ellipse((90, 90, 990, 990), fill="#B08A50")

# Approved primary symbol already uses black jade for D and aged gold for the threshold.
symbol = Image.open(source).convert("RGBA")
target_h = 400
target_w = round(symbol.width * target_h / symbol.height)
symbol = symbol.resize((target_w, target_h), Image.Resampling.LANCZOS)
canvas.paste(symbol, ((size-target_w)//2, (size-target_h)//2), symbol)
canvas.save(output, quality=100)
print(output)
