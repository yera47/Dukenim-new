from pathlib import Path
from math import cos, pi, sin

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "brand"
SIZE = 4096
SS = 4
JADE = "#071B17"
STONE = "#FFFDF8"
GOLD = "#B08A50"


def cubic(a, b, c, d, count=160):
    points = []
    for i in range(1, count + 1):
        t = i / count
        u = 1 - t
        points.append((
            u**3 * a[0] + 3 * u**2 * t * b[0] + 3 * u * t**2 * c[0] + t**3 * d[0],
            u**3 * a[1] + 3 * u**2 * t * b[1] + 3 * u * t**2 * c[1] + t**3 * d[1],
        ))
    return points


def hi(points):
    return [(round(x * SS), round(y * SS)) for x, y in points]


canvas = Image.new("RGB", (SIZE * SS, SIZE * SS), JADE)
draw = ImageDraw.Draw(canvas)
scale = 7.3
# The D itself is geometrically centred in the square; the road continues below.
tx, ty = 1332.6, 1270.55


def p(x, y):
    return tx + x * scale, ty + y * scale


# Approved D rebuilt as continuous vector-like curves, without raster scaling.
outer = [p(0, 0), p(104, 0)]
outer += cubic(p(104, 0), p(155, 0), p(196, 40.5), p(196, 91.5))
outer += [p(196, 154.5)]
outer += cubic(p(196, 154.5), p(196, 187), p(170.5, 213), p(140.5, 213))
outer += [p(0, 213)]
draw.polygon(hi(outer), fill=STONE)

opening = [p(55, 72), p(110.5, 84.5)]
opening += cubic(p(110.5, 84.5), p(120.8, 86.9), p(126, 94.6), p(126, 105.5))
opening += [p(126, 181), p(55, 181)]
draw.polygon(hi(opening), fill=JADE)

threshold = [p(55, 181), p(126, 181), p(150, 213), p(29, 213)]
draw.polygon(hi(threshold), fill=GOLD)

# Standalone approved D, before any road elements are added.
letter_only = canvas.copy()

# Perspective remains centred on the threshold's own optical axis.
stairs = [
    [(1544.5, 2900), (2427.5, 2900), (2466, 2985), (1506, 2985)],
    [(1476, 3095), (2496, 3095), (2551, 3195), (1421, 3195)],
    [(1391, 3305), (2581, 3305), (2646, 3420), (1326, 3420)],
]
for stair in stairs:
    draw.polygon(hi(stair), fill=GOLD)

# Experimental five-step composition: the fourth step remains architectural,
# while the fifth becomes a 20%-circumference gilded continuation on the
# Instagram circle edge. The approved three-step master remains untouched.
variant = canvas.copy()
variant_draw = ImageDraw.Draw(variant)
fourth_step = [(1267.5, 3505), (2704.5, 3505), (2767.5, 3605), (1204.5, 3605)]
variant_draw.polygon(hi(fourth_step), fill=GOLD)

circle_center = (2048, 2048)
circle_radius = 1900
arc_points = []
for i in range(241):
    angle = (126 - 72 * i / 240) * pi / 180
    arc_points.append((
        circle_center[0] + circle_radius * cos(angle),
        circle_center[1] + circle_radius * sin(angle),
    ))
arc_hi = hi(arc_points)
arc_width = 58 * SS
variant_draw.line(arc_hi, fill=GOLD, width=arc_width, joint="curve")
cap_radius = arc_width // 2
for x, y in (arc_hi[0], arc_hi[-1]):
    variant_draw.ellipse(
        (x - cap_radius, y - cap_radius, x + cap_radius, y + cap_radius),
        fill=GOLD,
    )

OUT.mkdir(parents=True, exist_ok=True)
letter_only = letter_only.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
letter_only.save(OUT / "dukenim-instagram-d-only-4096.png", quality=100)
letter_only.resize((1080, 1080), Image.Resampling.LANCZOS).save(
    OUT / "dukenim-instagram-d-only-1080.png", quality=100
)

png_4k = OUT / "dukenim-instagram-doorway-final-4096.png"
canvas = canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
canvas.save(png_4k, quality=100)

variant = variant.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
variant.save(OUT / "dukenim-instagram-doorway-five-step-4096.png", quality=100)
variant.resize((1080, 1080), Image.Resampling.LANCZOS).save(
    OUT / "dukenim-instagram-doorway-five-step-1080.png", quality=100
)
variant.resize((180, 180), Image.Resampling.LANCZOS).save(
    OUT / "dukenim-instagram-doorway-five-step-preview-180.png", quality=100
)

for dimension, filename in [
    (1080, "dukenim-instagram-doorway-final-1080.png"),
    (180, "dukenim-instagram-doorway-preview-180.png"),
    (64, "dukenim-instagram-doorway-preview-64.png"),
]:
    canvas.resize((dimension, dimension), Image.Resampling.LANCZOS).save(
        OUT / filename, quality=100
    )

print(png_4k)
