from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
source = root / "public" / "brand" / "dukenim-approved-symbol.png"
output = root / "output" / "brand" / "dukenim-instagram-avatar-1080.png"
output.parent.mkdir(parents=True, exist_ok=True)

size = 1080
canvas = Image.new("RGB", (size, size), "#F4F0E8")
draw = ImageDraw.Draw(canvas)

# The inner disc protects the mark from Instagram's circular crop.
draw.ellipse((90, 90, 990, 990), fill="#071B17")

symbol = Image.open(source).convert("RGBA")
# Convert the dark body to warm ivory while preserving the approved green threshold.
pixels = symbol.load()
for y in range(symbol.height):
    for x in range(symbol.width):
        r, g, b, a = pixels[x, y]
        if a and not (r > 110 and g > 85 and b < 100):
            pixels[x, y] = (255, 253, 248, a)

target_h = 400
target_w = round(symbol.width * target_h / symbol.height)
symbol = symbol.resize((target_w, target_h), Image.Resampling.LANCZOS)
canvas.paste(symbol, ((size-target_w)//2, (size-target_h)//2), symbol)
canvas.save(output, quality=100)
print(output)
