from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

root = Path(__file__).resolve().parents[1]
pdf = root / "tmp" / "dukenim-social-mark-stone.pdf"
pdf.parent.mkdir(parents=True, exist_ok=True)

s = 1080
c = canvas.Canvas(str(pdf), pagesize=(s, s), pageCompression=1)
c.setFillColor(HexColor("#F4F0E8")); c.rect(0, 0, s, s, fill=1, stroke=0)
c.saveState(); c.translate(0, s); c.scale(1, -1)

# Exact vector construction of the approved D-door silhouette.
p = c.beginPath(); p.moveTo(286,252); p.lineTo(470,252)
p.curveTo(676,252,794,365,794,540); p.curveTo(794,715,676,828,470,828)
p.lineTo(286,828); p.close()
p.moveTo(402,348); p.lineTo(520,381); p.curveTo(564,394,584,421,584,469)
p.lineTo(584,628); p.curveTo(584,687,552,727,493,727); p.lineTo(402,727); p.close()
c.setFillColor(HexColor("#071B17")); c.drawPath(p, fill=1, stroke=0, fillMode=0)
q = c.beginPath(); q.moveTo(397,727); q.lineTo(493,727); q.lineTo(550,828); q.lineTo(340,828); q.close()
c.setFillColor(HexColor("#B08A50")); c.drawPath(q, fill=1, stroke=0)
c.restoreState()
c.save()
print(pdf)
