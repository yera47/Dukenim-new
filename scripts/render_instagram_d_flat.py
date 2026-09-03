from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "brand"
SIZE = 4096
SS = 4
JADE = "#071B17"
STONE = "#FFFDF8"
GOLD = "#B08A50"
SCALE = 7.3
TX, TY = 1332.6, 1270.55


def cubic(a, b, c, d, count=160):
    points = []
    for i in range(1, count + 1):
        t = i / count
        u = 1 - t
        points.append((
            u**3*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t**3*d[0],
            u**3*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t**3*d[1],
        ))
    return points


def p(x, y):
    return TX + x * SCALE, TY + y * SCALE


def hi(points):
    return [(round(x * SS), round(y * SS)) for x, y in points]


canvas = Image.new("RGB", (SIZE * SS, SIZE * SS), JADE)
draw = ImageDraw.Draw(canvas)

outer = [p(0, 0), p(104, 0)]
outer += cubic(p(104, 0), p(155, 0), p(196, 40.5), p(196, 91.5))
outer += [p(196, 154.5)]
outer += cubic(p(196, 154.5), p(196, 187), p(170.5, 213), p(140.5, 213))
outer += [p(0, 213)]
draw.polygon(hi(outer), fill=STONE)

opening = [p(55, 72), p(110.5, 84.5)]
opening += cubic(p(110.5, 84.5), p(120.8, 86.9), p(126, 94.6), p(126, 105.5))
opening += [p(126, 194), p(55, 194)]
draw.polygon(hi(opening), fill=JADE)

# Updated brandbook threshold: low, flat and fully inside the D silhouette.
draw.polygon(hi([p(55, 194), p(126, 194), p(140, 213), p(20, 213)]), fill=GOLD)

canvas = canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
OUT.mkdir(parents=True, exist_ok=True)
canvas.save(OUT / "dukenim-instagram-d-flat-4096.png", quality=100)
canvas.resize((1080, 1080), Image.Resampling.LANCZOS).save(
    OUT / "dukenim-instagram-d-flat-1080.png", quality=100
)
canvas.resize((180, 180), Image.Resampling.LANCZOS).save(
    OUT / "dukenim-instagram-d-flat-preview-180.png", quality=100
)
print(OUT / "dukenim-instagram-d-flat-4096.png")
