from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
SS = 4
W, H = 196, 213
JADE = (7, 27, 23, 255)
STONE = (255, 253, 248, 255)
GOLD = (176, 138, 80, 255)


def cubic(a, b, c, d, count=120):
    points = []
    for i in range(1, count + 1):
        t = i / count
        u = 1 - t
        points.append((
            u**3*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t**3*d[0],
            u**3*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t**3*d[1],
        ))
    return points


def hi(points):
    return [(round(x * SS), round(y * SS)) for x, y in points]


def symbol(body):
    image = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    outer = [(0, 0), (104, 0)]
    outer += cubic((104, 0), (155, 0), (196, 40.5), (196, 91.5))
    outer += [(196, 154.5)]
    outer += cubic((196, 154.5), (196, 187), (170.5, 213), (140.5, 213))
    outer += [(0, 213)]
    draw.polygon(hi(outer), fill=body)

    # The opening continues lower so the threshold becomes flatter.
    opening = [(55, 72), (110.5, 84.5)]
    opening += cubic((110.5, 84.5), (120.8, 86.9), (126, 94.6), (126, 105.5))
    opening += [(126, 194), (55, 194)]
    draw.polygon(hi(opening), fill=(0, 0, 0, 0))

    # Low architectural threshold contained completely inside the D silhouette.
    draw.polygon(hi([(55, 194), (126, 194), (140, 213), (20, 213)]), fill=GOLD)
    return image.resize((W, H), Image.Resampling.LANCZOS)


primary_symbol = symbol(JADE)
reversed_symbol = symbol(STONE)
primary_symbol.save(BRAND / "dukenim-flat-symbol.png")
reversed_symbol.save(BRAND / "dukenim-flat-symbol-reversed.png")

gold_symbol = Image.new("RGBA", primary_symbol.size, GOLD)
gold_symbol.putalpha(primary_symbol.getchannel("A"))
gold_symbol.save(BRAND / "dukenim-flat-symbol-gold.png")

for source_name, output_name, new_symbol in [
    ("dukenim-approved-master.png", "dukenim-flat-master.png", primary_symbol),
    ("dukenim-approved-master-reversed.png", "dukenim-flat-master-reversed.png", reversed_symbol),
]:
    master = Image.open(BRAND / source_name).convert("RGBA")
    master.paste((0, 0, 0, 0), (0, 0, W, H))
    master.alpha_composite(new_symbol, (0, 0))
    master.save(BRAND / output_name)

gold_master_source = Image.open(BRAND / "dukenim-flat-master.png").convert("RGBA")
gold_master = Image.new("RGBA", gold_master_source.size, GOLD)
gold_master.putalpha(gold_master_source.getchannel("A"))
gold_master.save(BRAND / "dukenim-flat-master-gold.png")

print(BRAND / "dukenim-flat-master.png")
