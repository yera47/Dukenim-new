from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
brand = root / "public" / "brand"
out = root / "output" / "brand"
out.mkdir(parents=True, exist_ok=True)
symbol = Image.open(brand / "dukenim-approved-symbol-reversed.png").convert("RGBA")

def icon(size, mark_ratio, filename, rounded=True):
    image = Image.new("RGB", (size,size), "#071B17")
    draw = ImageDraw.Draw(image)
    if rounded:
        mask = Image.new("L",(size,size),0)
        ImageDraw.Draw(mask).rounded_rectangle((0,0,size-1,size-1),radius=round(size*.22),fill=255)
        bg = Image.new("RGB",(size,size),"#071B17")
        outside = Image.new("RGB",(size,size),"#F4F0E8")
        outside.paste(bg,(0,0),mask)
        image = outside
    h=round(size*mark_ratio); w=round(symbol.width*h/symbol.height)
    mark=symbol.resize((w,h),Image.Resampling.LANCZOS)
    image.paste(mark,((size-w)//2,(size-h)//2),mark)
    image.save(out/filename,quality=100)

icon(1024,.48,"dukenim-app-icon-1024.png")
icon(512,.48,"dukenim-app-icon-512.png")
icon(192,.50,"dukenim-pwa-icon-192.png")
icon(64,.58,"dukenim-favicon-64.png",False)
icon(32,.64,"dukenim-favicon-32.png",False)
icon(16,.70,"dukenim-favicon-16.png",False)
print(out)
