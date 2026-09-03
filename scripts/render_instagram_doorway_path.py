from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

root = Path(__file__).resolve().parents[1]
pdf = root / "tmp" / "dukenim-instagram-doorway-path.pdf"
pdf.parent.mkdir(parents=True, exist_ok=True)
s = 1080
c = canvas.Canvas(str(pdf), pagesize=(s,s), pageCompression=1)
c.setFillColor(HexColor("#071B17")); c.rect(0,0,s,s,fill=1,stroke=0)
c.saveState(); c.translate(0,s); c.scale(1,-1)

p=c.beginPath(); p.moveTo(350,210); p.lineTo(503,210)
p.curveTo(675,210,774,304,774,450); p.curveTo(774,596,675,690,503,690)
p.lineTo(350,690); p.close(); p.moveTo(447,290); p.lineTo(545,318)
p.curveTo(582,329,599,351,599,391); p.lineTo(599,524)
p.curveTo(599,573,572,606,523,606); p.lineTo(447,606); p.close()
c.setFillColor(HexColor("#FFFDF8")); c.drawPath(p,fill=1,stroke=0,fillMode=0)

c.setFillColor(HexColor("#B08A50"))
for pts in [[(443,606),(523,606),(571,690),(396,690)],[(389,724),(578,724),(641,812),(326,812)],[(312,852),(655,852),(747,970),(220,970)]]:
    q=c.beginPath(); q.moveTo(*pts[0]); [q.lineTo(*point) for point in pts[1:]]; q.close(); c.drawPath(q,fill=1,stroke=0)
c.restoreState(); c.save(); print(pdf)
