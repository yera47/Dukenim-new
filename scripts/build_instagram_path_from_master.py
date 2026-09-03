from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parents[1]
master_path = root / "public" / "brand" / "dukenim-approved-symbol-reversed.png"
output = root / "output" / "brand" / "dukenim-instagram-master-path-4096.png"

size = 4096
render_scale = 4
bg = "#071B17"
gold = "#B08A50"
canvas = Image.new("RGB", (size * render_scale, size * render_scale), bg)
draw = ImageDraw.Draw(canvas)

# Use the exact approved symbol from the brandbook. No redraw, no deformation.
master = Image.open(master_path).convert("RGBA")
target_h = 1450
target_w = round(master.width * target_h / master.height)
target_w_hi = target_w * render_scale
target_h_hi = target_h * render_scale

# The approved source is a small raster. Upscale its colour and alpha separately,
# then apply a tiny high-resolution blur to remove extraction stair-steps without
# changing the silhouette.
colour = Image.new("RGBA", master.size, (255, 253, 248, 255))
colour_pixels = colour.load()
source_pixels = master.load()
for yy in range(master.height):
    for xx in range(master.width):
        r, g, b, a = source_pixels[xx, yy]
        if a and r > 130 and 75 < g < 190 and b < 140:
            colour_pixels[xx, yy] = (176, 138, 80, 255)
# Smooth the tiny source mask before enlargement; this removes pixel-sized cuts
# visible at 4K while retaining the approved D proportions and curvature.
alpha = master.getchannel("A").filter(ImageFilter.GaussianBlur(radius=0.72))
alpha = alpha.resize((target_w_hi, target_h_hi), Image.Resampling.LANCZOS)
alpha = alpha.filter(ImageFilter.GaussianBlur(radius=1.15))
colour = colour.resize((target_w_hi, target_h_hi), Image.Resampling.LANCZOS)
colour.putalpha(alpha)
left = ((size - target_w) // 2) * render_scale
top = 650 * render_scale
canvas.paste(colour, (left, top), colour)

# Continue the approved threshold downward as three separated perspective steps.
# The first stair is exactly as wide as the approved gold threshold. Each next
# stair expands symmetrically from the same centre, with a compact total height.
center = size * render_scale // 2
threshold_w = 790
steps = [
    (650 + target_h + 70, threshold_w, 900, 115),
    (650 + target_h + 245, 940, 1080, 130),
    (650 + target_h + 440, 1130, 1310, 145),
]
for y, near_w, far_w, h in steps:
    y *= render_scale
    near_w *= render_scale
    far_w *= render_scale
    h *= render_scale
    draw.polygon([
        (center-near_w//2, y), (center+near_w//2, y),
        (center+far_w//2, y+h), (center-far_w//2, y+h),
    ], fill=gold)

canvas = canvas.resize((size, size), Image.Resampling.LANCZOS)
canvas.save(output, quality=100)
print(output)
