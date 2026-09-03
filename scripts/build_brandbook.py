from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "Dukenim_Brandbook_2026.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = landscape(A4)
INK = HexColor("#101713")
EMERALD = HexColor("#071B17")
GREEN = HexColor("#B08A50")
MINT = HexColor("#E8DFD0")
IVORY = HexColor("#F4F0E8")
WHITE = HexColor("#FFFDF8")
MUTED = HexColor("#65716A")
LINE = HexColor("#D8DDD8")
MASTER = ImageReader(str(ROOT / "public" / "brand" / "dukenim-flat-master.png"))
MASTER_REV = ImageReader(str(ROOT / "public" / "brand" / "dukenim-flat-master-reversed.png"))
SYMBOL = ImageReader(str(ROOT / "public" / "brand" / "dukenim-flat-symbol.png"))
SYMBOL_REV = ImageReader(str(ROOT / "public" / "brand" / "dukenim-flat-symbol-reversed.png"))
MASTER_GOLD = ImageReader(str(ROOT / "public" / "brand" / "dukenim-flat-master-gold.png"))

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("ArialBold", r"C:\Windows\Fonts\arialbd.ttf"))


def text(c, value, x, y, size, color=INK, font="Arial", align="left"):
    c.setFont(font, size)
    c.setFillColor(color)
    if align == "center": c.drawCentredString(x, y, value)
    elif align == "right": c.drawRightString(x, y, value)
    else: c.drawString(x, y, value)


def paragraph(c, lines, x, y, size=13, leading=20, color=MUTED, font="Arial"):
    for i, line in enumerate(lines): text(c, line, x, y-i*leading, size, color, font)


def page_no(c, n, dark=False):
    col = Color(1,1,1,.5) if dark else MUTED
    text(c, "DUKENIM / BRAND SYSTEM 2026", 42, 24, 8, col, "ArialBold")
    text(c, f"{n:02d}", W-42, 24, 8, col, "ArialBold", "right")


def d_symbol(c, x, y, size, dark=False, threshold=True):
    c.drawImage(SYMBOL_REV if dark else SYMBOL, x, y, width=size*.92, height=size, mask="auto", preserveAspectRatio=True, anchor="sw")


def logo(c, x, y, height, dark=False):
    ratio = 1125 / 213
    c.drawImage(MASTER_REV if dark else MASTER, x, y, width=height*ratio, height=height, mask="auto", preserveAspectRatio=True, anchor="sw")


def logo_gold(c, x, y, height):
    ratio = 1125 / 213
    c.drawImage(MASTER_GOLD, x, y, width=height*ratio, height=height, mask="auto", preserveAspectRatio=True, anchor="sw")


def title_block(c, eyebrow, title, intro, dark=False):
    fg = WHITE if dark else INK; sub = Color(1,1,1,.62) if dark else MUTED
    text(c, eyebrow.upper(), 54, H-62, 9, GREEN if not dark else HexColor("#D1B987"), "ArialBold")
    text(c, title, 54, H-116, 31, fg, "ArialBold")
    paragraph(c, intro, 54, H-148, 11, 17, sub)


def swatch(c, x, y, color, name, code, dark_text=False):
    c.setFillColor(color); c.roundRect(x,y,142,108,8,fill=1,stroke=0)
    tc = INK if dark_text else WHITE
    text(c,name,x+14,y+28,12,tc,"ArialBold"); text(c,code,x+14,y+13,9,tc,"Arial")


c = canvas.Canvas(str(OUT), pagesize=(W,H), pageCompression=1)
c.setTitle("Dukenim Brandbook 2026")
c.setAuthor("Dukenim")

# 01 Cover
c.setFillColor(IVORY); c.rect(0,0,W,H,fill=1,stroke=0)
c.setFillColor(MINT); c.circle(W*.78,H*.52,190,fill=1,stroke=0)
c.setFillColor(GREEN); c.circle(W*.78,H*.52,112,fill=1,stroke=0)
c.setFillColor(EMERALD); c.circle(W*.78,H*.52,72,fill=1,stroke=0)
logo(c,58,H*.44,95)
text(c,"BRAND BOOK",60,91,13,GREEN,"ArialBold")
text(c,"Айдентика и правила использования",60,61,16,MUTED)
page_no(c,1); c.showPage()

# 02 Essence
c.setFillColor(EMERALD); c.rect(0,0,W,H,fill=1,stroke=0)
title_block(c,"01 / Основа бренда","Вход в цифровую торговлю",["Dukenim объединяет сайт, приложение и CRM в одной понятной системе.","Знак D одновременно читается как имя бренда, дверь и начало пути бизнеса."],True)
text(c,"ПОНЯТНО",58,218,13,HexColor("#D1B987"),"ArialBold"); paragraph(c,["Сложное управление", "становится простым."],58,188,15,22,WHITE,"ArialBold")
text(c,"СИСТЕМНО",308,218,13,HexColor("#D1B987"),"ArialBold"); paragraph(c,["Все каналы работают", "как единое целое."],308,188,15,22,WHITE,"ArialBold")
text(c,"СВОЁ",558,218,13,HexColor("#D1B987"),"ArialBold"); paragraph(c,["Современный продукт", "с характером Казахстана."],558,188,15,22,WHITE,"ArialBold")
page_no(c,2,True); c.showPage()

# 03 Logo
c.setFillColor(IVORY); c.rect(0,0,W,H,fill=1,stroke=0)
title_block(c,"02 / Логотип","Основной знак",["Основная горизонтальная версия используется в большинстве коммуникаций.","Золотой порог и точка всегда имеют одинаковый цвет."])
logo(c,100,205,128)
c.setStrokeColor(LINE); c.line(54,168,W-54,168)
d_symbol(c,72,62,72); text(c,"Знак",160,102,14,INK,"ArialBold"); text(c,"Иконки и компактные форматы",160,80,10,MUTED)
logo(c,405,71,42)
text(c,"Словесный знак",668,102,14,INK,"ArialBold"); text(c,"Когда символ уже присутствует",668,80,10,MUTED)
page_no(c,3); c.showPage()

# 04 Construction
c.setFillColor(WHITE); c.rect(0,0,W,H,fill=1,stroke=0)
title_block(c,"03 / Построение","Охранное поле",["Минимальное свободное пространство вокруг логотипа равно ширине дверного проёма X.","В охранном поле не размещаются текст, фотографии, рамки или другие знаки."])
c.setStrokeColor(GREEN); c.setLineWidth(1); c.setDash(4,4)
c.rect(115,150,610,190,fill=0,stroke=1); logo(c,175,198,92)
c.setDash(); c.setStrokeColor(GREEN); c.line(115,130,175,130); c.line(115,125,115,135); c.line(175,125,175,135)
text(c,"X",145,112,12,GREEN,"ArialBold","center")
text(c,"Минимальная ширина",92,76,10,MUTED); text(c,"Digital: 120 px",92,55,14,INK,"ArialBold")
text(c,"Компактный знак",330,76,10,MUTED); text(c,"Digital: 24 px",330,55,14,INK,"ArialBold")
text(c,"Печать",565,76,10,MUTED); text(c,"Логотип: 32 мм",565,55,14,INK,"ArialBold")
page_no(c,4); c.showPage()

# 05 Color
c.setFillColor(IVORY); c.rect(0,0,W,H,fill=1,stroke=0)
title_block(c,"04 / Цвет","Фирменная палитра",["Чёрный нефрит задаёт надёжность, глубину и технологичность.","Состаренное золото обозначает качество, движение и ценность."])
swatch(c,54,210,EMERALD,"Black Jade","#071B17")
swatch(c,214,210,GREEN,"Aged Gold","#B08A50")
swatch(c,374,210,IVORY,"Pale Stone","#F4F0E8",True)
swatch(c,534,210,INK,"Graphite","#101713")
swatch(c,694,210,MINT,"Warm Sand","#E8DFD0",True)
text(c,"Рекомендуемое соотношение",54,166,11,MUTED,"ArialBold")
for x,wid,col,label in [(54,350,EMERALD,"55%"),(404,178,IVORY,"25%"),(582,118,GREEN,"15%"),(700,82,MINT,"5%")]:
    c.setFillColor(col); c.rect(x,112,wid,34,fill=1,stroke=0); text(c,label,x+wid/2,90,9,MUTED,"ArialBold","center")
page_no(c,5); c.showPage()

# 06 Type
c.setFillColor(WHITE); c.rect(0,0,W,H,fill=1,stroke=0)
title_block(c,"05 / Типографика","Manrope",["Основной шрифт бренда - Manrope. Он современный, открытый и хорошо читается", "в интерфейсах, рекламе и документах. Arial используется только как системная замена."])
text(c,"Aa",55,205,106,EMERALD,"ArialBold")
text(c,"Заголовки / ExtraBold",260,280,12,GREEN,"ArialBold"); text(c,"Цифровой бизнес",260,236,35,INK,"ArialBold")
text(c,"Основной текст / Regular",260,184,12,GREEN,"ArialBold"); text(c,"Управляйте магазином, заказами и клиентами",260,151,19,MUTED)
text(c,"Кнопки / Bold",260,104,12,GREEN,"ArialBold"); c.setFillColor(EMERALD); c.roundRect(260,48,220,43,8,fill=1,stroke=0); text(c,"Начать бесплатно",370,63,13,WHITE,"ArialBold","center")
page_no(c,6); c.showPage()

# 07 Versions
c.setFillColor(IVORY); c.rect(0,0,W,H,fill=1,stroke=0)
title_block(c,"06 / Версии","Золотая фирменная версия",["Золотой порог и точка - постоянные акценты во всех полноцветных версиях.","Используйте фон, который обеспечивает максимальную читаемость знака."])
c.setFillColor(WHITE); c.roundRect(54,176,350,180,10,fill=1,stroke=0); logo(c,82,238,48)
c.setFillColor(EMERALD); c.roundRect(434,176,350,180,10,fill=1,stroke=0); logo(c,462,238,48,True)
text(c,"Светлый фон",54,148,11,MUTED,"ArialBold"); text(c,"Тёмный фон",434,148,11,MUTED,"ArialBold")
c.setFillColor(GREEN); c.roundRect(54,55,230,62,8,fill=1,stroke=0); logo(c,72,70,32,True)
c.setFillColor(EMERALD); c.roundRect(304,55,230,62,8,fill=1,stroke=0); logo_gold(c,323,70,32)
c.setFillColor(WHITE); c.roundRect(554,55,230,62,8,fill=1,stroke=0); d_symbol(c,573,70,32)
page_no(c,7); c.showPage()

# 08 Digital
c.setFillColor(EMERALD); c.rect(0,0,W,H,fill=1,stroke=0)
title_block(c,"07 / Digital","Иконка и аватар",["В малых размерах используется только знак D без словесной части.","Порог должен оставаться различимым, но не доминировать."],True)
for i,(x,s,label) in enumerate([(80,132,"APP ICON"),(300,92,"SOCIAL"),(490,62,"FAVICON"),(650,38,"16 PX TEST")]):
    c.setFillColor(WHITE); c.roundRect(x,150,s,s,s*.2,fill=1,stroke=0); d_symbol(c,x+s*.18,150+s*.18,s*.64)
    text(c,label,x+s/2,125,9,HexColor("#D1B987"),"ArialBold","center")
text(c,"Нельзя добавлять внутрь знака мелкие детали или текст.",80,72,13,WHITE,"ArialBold")
page_no(c,8,True); c.showPage()

# 09 Misuse
c.setFillColor(WHITE); c.rect(0,0,W,H,fill=1,stroke=0)
title_block(c,"08 / Ограничения","Так делать нельзя",["Последовательность важнее декоративности. Логотип всегда сохраняет форму,", "пропорции, цветовую логику и безопасное пространство."])
items=[("Не растягивать",False),("Не менять цвета",True),("Не убирать точку",False),("Не добавлять эффекты",False),("Не ставить на шумный фон",False),("Не поворачивать",False)]
for i,(label,alt) in enumerate(items):
    col=i%3; row=i//3; x=54+col*260; y=195-row*122
    c.setFillColor(IVORY); c.roundRect(x,y,230,90,8,fill=1,stroke=0)
    if i==1:
        c.setFillColor(HexColor("#7653A6")); c.circle(x+46,y+45,23,fill=1,stroke=0)
    elif i==2:
        text(c,"dukenim",x+24,y+32,25,EMERALD,"ArialBold")
    else:
        d_symbol(c,x+22,y+20,50)
    c.setStrokeColor(HexColor("#C54A42")); c.setLineWidth(2); c.line(x+195,y+62,x+211,y+78); c.line(x+211,y+62,x+195,y+78)
    text(c,label,x,y-20,10,MUTED,"ArialBold")
page_no(c,9); c.showPage()

# 10 Closing
c.setFillColor(IVORY); c.rect(0,0,W,H,fill=1,stroke=0)
d_symbol(c,58,H-195,112)
text(c,"Одна дверь.",215,H-108,33,INK,"ArialBold")
text(c,"Вся система бизнеса.",215,H-150,33,GREEN,"ArialBold")
c.setStrokeColor(LINE); c.line(58,255,W-58,255)
paragraph(c,["Основной мастер: dukenim-flat-master.png","Инвертированный мастер: dukenim-flat-master-reversed.png","Золотой мастер: dukenim-flat-master-gold.png","Компактный знак: dukenim-flat-symbol.png"],58,218,11,21,MUTED)
text(c,"Версия 1.0 / Август 2026",58,90,11,INK,"ArialBold")
text(c,"dukenim.kz",58,65,17,GREEN,"ArialBold")
page_no(c,10); c.showPage()

c.save()
print(OUT)
