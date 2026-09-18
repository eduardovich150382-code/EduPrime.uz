# -*- coding: utf-8 -*-
"""
EduPrime — PDF'dan savol bloklari va rasmlarni ajratgich  (v14)

Uchta kitob turi uchun uchta REJIM. Har rejim o'z turida eng ishonchli
usulni ishlatadi; ular bir-biriga aralashmaydi.

  "rasm"  — rasmlar PDF ichiga joylashtirilgan (o'zbekcha Innova).
            Nashriyot bergan aniq chegaralar ishlatiladi. Eng ishonchli.
  "latex" — LaTeX bilan terilgan kitob (inglizcha Halliday).
            Chizma glifi va chiziqlardan yasalgan; siyoh usuli, abzas
            matni o'chiriladi, belgilar tegilmaydi.
  "skan"  — matn qatlami yo'q, bet bitta rasm (turkcha 3D Yayinlari).
            OCR + siyoh usuli, HAMMA so'z o'chiriladi.
  "qol"   — YARIM AVTOMATIK. Har bet ekranda ochiladi, siz sichqoncha bilan
            rasmlarni o'zingiz belgilaysiz. Matn (OCR yoki PDF qatlami),
            manifest va ZIP — avtomatik. Skan kitoblarda chizma to'liq
            chiqmasa shu rejim ishlatiladi.
  "avto"  — har bet uchun o'zi tanlaydi va qaysi rejimni tanlaganini yozadi.

O'rnatish:
    pip install pymupdf pillow opencv-python
    OCR kerak bo'lsa:  pip install pytesseract   + Tesseract dasturi
"""

import io, json, zipfile
from pathlib import Path

import fitz
import cv2
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None   # katta o'lchamli skan betlar uchun

# ══════════════ HAR SAFAR O'ZGARTIRILADIGAN QISM ══════════════

PDF_FAYL   = "dokumen.pub_3d-ayt-fizik-soru-bankas-g-2489770.pdf"
SAHIFALAR  = (28, 32)     # (boshi, oxiri) — ikkalasi ham kiradi | None = hammasi
ASL_TIL    = "tr"         # uz | ru | en | tr
CHIQISH    = "tr2"           # natija nomi. Bo'sh bo'lsa PDF nomidan olinadi.
                          # Mavjud natija ustiga YOZILMAYDI — _2, _3 qo'shiladi.
REJIM      = "qol"       # avto | rasm | latex | skan | qol

OCR_TIL    = "tur"        # skan rejimi uchun: tur | eng | rus | uzb
TESSERACT_YOLI = r"C:\Program Files\Tesseract-OCR\tesseract.exe"     # Windows: r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Sahifa akslari.
#   SAHIFA_AKSI  — umuman yasalsinmi. Skan kitobda KERAK: aynan shu fayllarni
#                  chatga biriktirib savollarni matnga aylantirasiz. Matn
#                  qatlami bor kitobda (Innova, Halliday) kerak emas — False
#                  qo'ysangiz bu qadam butunlay tushib qoladi.
#   SAHIFA_ZIPGA — ZIP ichiga ham qo'shilsinmi. Sayt ularga QARAMAYDI: ular
#                  faqat eski avtomatik yo'lda (Gemini'ga ko'rsatish uchun)
#                  kerak edi, u esa endi bayroq ortida. Shuning uchun standart
#                  False — fayllar `chiqish/.../sahifalar/` da qolaveradi,
#                  lekin yuklanmaydi. ZIP hajmi shundan bir necha barobar
#                  kichrayadi (har bet ~200 KB).
SAHIFA_AKSI  = True
SAHIFA_ZIPGA = False

# ══════════════════════════════════════════════════════════════

SAHIFA_DPI   = 150        # sahifa aksi (AI formulani shundan o'qiydi)
SAHIFA_FORMAT   = "png"   # "png" (import sahifasi shuni kutadi) yoki "jpg"
SAHIFA_MAX_PX   = 1600    # uzun tomon; AI shundan ortig'ini baribir ishlatmaydi
SAHIFA_SIFAT    = 80      # JPEG sifati
SAHIFA_RANGLAR  = 192     # PNG palitrasi
CHIZMA_DPI   = 200        # kesib olingan chizma sifati
ANIQLASH_DPI = 100        # siyoh tahlili

# "rasm" rejimi
RASM_MIN_PT      = 40
RASM_MAX_ULUSH   = 0.95

# "latex" va "skan" rejimlari
SIYOH_MIN_PT     = 28
SIYOH_MAX_ULUSH  = 0.60
BIRLASHTIRISH_PT = 9.0
HOSHIYA_PT       = 9
PAST_HOSHIYA_PT  = 9   # pastdan qo'shimcha (variant harfi: A, B, C…)
# OCR faqat IKKI narsa uchun kerak: savol boshini topish ("1.", "2.") va
# sonlarni solishtirish tekshiruvi. To'liq aniq matn talab qilinmaydi —
# saytga siz chatdagi tarjimani qo'yasiz. Shuning uchun 300 emas, 200 DPI.
OCR_DPI          = 200
OCR_ISHONCH      = 25
# --psm 6: Tesseract'ning O'Z sahifa tahlili o'chiriladi. Undan faqat so'zlar
# va koordinatalar olinadi, qator va bloklarni `_qatorlarga` o'zi yasaydi —
# ya'ni o'sha tahlilga ketayotgan vaqt bekorga sarflanardi.
OCR_SOZLAMA      = "--oem 1 --psm 6"

# Rasm hajmi
# "png" MAJBURIY: sayt manifestdagi har fayl `.png` bilan tugashini talab
# qiladi (manifest-validate.ts NOT_PNG). WebP ZIP tekshiruvidan o'tmaydi.
RASM_FORMAT      = "png"
MAX_RASM_ENI_PX  = 1200    # kengroq rasm shu enga kichraytiriladi
PNG_RANGLAR      = 128     # PNG palitrasi: chizma uchun yetarli
WEBP_SIFAT       = 88

# "qol" rejimi
KESISH_DPI       = 110     # bet ekranda shu o'lchamda ko'rsatiladi


MAX_MEGAPIKSEL = 40   # bir marta ochiladigan eng katta rasm


# ─────────────────────────── yordamchilar ───────────────────────────

def xavfsiz_dpi(sahifa, dpi):
    """Juda katta betlarda DPI ni kamaytiradi (xotira va 'bomb' ogohlantirishi)."""
    en = sahifa.rect.width / 72.0
    boyi = sahifa.rect.height / 72.0
    mp = en * boyi * dpi * dpi / 1_000_000
    if mp <= MAX_MEGAPIKSEL:
        return dpi
    return max(72, int(dpi * (MAX_MEGAPIKSEL / mp) ** 0.5))

def _bbox(r):
    return {"x": round(r.x0, 2), "y": round(r.y0, 2),
            "w": round(r.x1 - r.x0, 2), "h": round(r.y1 - r.y0, 2)}


def _kesishuv(a, b):
    x0, y0 = max(a.x0, b.x0), max(a.y0, b.y0)
    x1, y1 = min(a.x1, b.x1), min(a.y1, b.y1)
    return 0.0 if x1 <= x0 or y1 <= y0 else (x1 - x0) * (y1 - y0)


def sahifa_aksini_saqla(sahifa, yol):
    """Bet aksi: uzun tomoni cheklanadi va siqiladi.

    Bu fayl faqat AI formulani KO'RISHI uchun kerak. Gemini kabi modellar
    rasmni baribir ~1600 pikselgacha kichraytiradi, shuning uchun bundan
    kattasini saqlash — bulut xotirasini bekorga to'ldirish.
    """
    pix = sahifa.get_pixmap(dpi=xavfsiz_dpi(sahifa, SAHIFA_DPI))
    im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    if max(im.size) > SAHIFA_MAX_PX:
        k = SAHIFA_MAX_PX / max(im.size)
        im = im.resize((max(1, round(im.width * k)),
                        max(1, round(im.height * k))), Image.LANCZOS)
    if SAHIFA_FORMAT == "png":
        # palitraga o'tkazish: 533 KB → ~200 KB, ko'z bilan farqi yo'q
        im.quantize(colors=SAHIFA_RANGLAR, method=Image.MEDIANCUT).save(
            yol, "PNG", optimize=True)
    else:
        im.save(yol, "JPEG", quality=SAHIFA_SIFAT, optimize=True, progressive=True)


def kesimni_saqla(sahifa, rect, yol):
    """Sohani kesib, kichraytirib, siqib saqlaydi."""
    pix = sahifa.get_pixmap(clip=rect, dpi=xavfsiz_dpi(sahifa, CHIZMA_DPI))
    im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    if im.width > MAX_RASM_ENI_PX:
        yangi_boy = max(1, round(im.height * MAX_RASM_ENI_PX / im.width))
        im = im.resize((MAX_RASM_ENI_PX, yangi_boy), Image.LANCZOS)
    if RASM_FORMAT == "webp":
        im.save(yol, "WEBP", quality=WEBP_SIFAT, method=6)
    else:
        im.quantize(colors=PNG_RANGLAR, method=Image.MEDIANCUT).save(
            yol, "PNG", optimize=True)


def qolda_belgilash(sahifa, raqam):
    """
    Betni oynada ko'rsatadi, foydalanuvchi sichqoncha bilan ramka chizadi.

    Tkinter ishlatiladi — u Python bilan birga keladi, alohida o'rnatish
    kerak emas. (OpenCV ning oyna qismi Windows'da ko'pincha yo'q:
    `opencv-python-headless` o'rnatilgan bo'lsa oyna ochilmaydi.)

    Boshqaruv:  sichqoncha - ramka | Z - oxirgisini bekor | ENTER - tugatdim
                ESC - bu betni tashlab ket | Q - butunlay to'xtat
    """
    import tkinter as tk
    from PIL import ImageTk

    dpi = xavfsiz_dpi(sahifa, KESISH_DPI)
    pt_masshtab = dpi / 72.0
    pix = sahifa.get_pixmap(dpi=dpi)
    asl = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")

    oyna = tk.Tk()
    oyna.title(f"{raqam}-bet  |  ramka chizing  |  Z-bekor  ENTER-tugatdim  "
               f"ESC-o'tkazib yubor  Q-to'xtat")
    ekran_en = oyna.winfo_screenwidth() - 80
    ekran_boy = oyna.winfo_screenheight() - 180
    k = min(ekran_en / asl.width, ekran_boy / asl.height, 1.0)
    korsatish = asl.resize((max(1, int(asl.width * k)),
                            max(1, int(asl.height * k))), Image.LANCZOS)
    tk_rasm = ImageTk.PhotoImage(korsatish)

    holat = tk.StringVar(value="0 ta ramka")
    tk.Label(oyna, textvariable=holat, font=("Segoe UI", 11)).pack(pady=4)
    kanvas = tk.Canvas(oyna, width=korsatish.width, height=korsatish.height,
                       cursor="cross", highlightthickness=0)
    kanvas.pack()
    kanvas.create_image(0, 0, anchor="nw", image=tk_rasm)

    ramkalar, chizilgan = [], []
    vaqtinchalik = {"id": None, "x": 0, "y": 0}
    javob = {"holat": "tugadi"}

    def yangila():
        holat.set(f"{len(ramkalar)} ta ramka")

    def bosildi(hodisa):
        vaqtinchalik["x"], vaqtinchalik["y"] = hodisa.x, hodisa.y
        vaqtinchalik["id"] = kanvas.create_rectangle(
            hodisa.x, hodisa.y, hodisa.x, hodisa.y, outline="#e11", width=2)

    def surildi(hodisa):
        if vaqtinchalik["id"] is not None:
            kanvas.coords(vaqtinchalik["id"], vaqtinchalik["x"],
                          vaqtinchalik["y"], hodisa.x, hodisa.y)

    def qoyib_yuborildi(hodisa):
        if vaqtinchalik["id"] is None:
            return
        x0, y0 = min(vaqtinchalik["x"], hodisa.x), min(vaqtinchalik["y"], hodisa.y)
        x1, y1 = max(vaqtinchalik["x"], hodisa.x), max(vaqtinchalik["y"], hodisa.y)
        if x1 - x0 < 6 or y1 - y0 < 6:
            kanvas.delete(vaqtinchalik["id"])
        else:
            kanvas.coords(vaqtinchalik["id"], x0, y0, x1, y1)
            chizilgan.append(vaqtinchalik["id"])
            ramkalar.append((x0 / k, y0 / k, x1 / k, y1 / k))
            yangila()
        vaqtinchalik["id"] = None

    def bekor(_=None):
        if ramkalar:
            ramkalar.pop()
            kanvas.delete(chizilgan.pop())
            yangila()

    def tugat(_=None):
        javob["holat"] = "tugadi"; oyna.destroy()

    def otkaz(_=None):
        ramkalar.clear(); javob["holat"] = "otkazildi"; oyna.destroy()

    def toxtat(_=None):
        ramkalar.clear(); javob["holat"] = "toxtatildi"; oyna.destroy()

    kanvas.bind("<ButtonPress-1>", bosildi)
    kanvas.bind("<B1-Motion>", surildi)
    kanvas.bind("<ButtonRelease-1>", qoyib_yuborildi)
    oyna.bind("<Return>", tugat)
    oyna.bind("<Escape>", otkaz)
    oyna.bind("z", bekor); oyna.bind("Z", bekor)
    oyna.bind("q", toxtat); oyna.bind("Q", toxtat)
    oyna.protocol("WM_DELETE_WINDOW", toxtat)

    tk.Frame(oyna, height=6).pack()
    tk.Button(oyna, text="Tugatdim (Enter)", command=tugat,
              font=("Segoe UI", 10)).pack(pady=6)

    oyna.focus_force()
    oyna.mainloop()

    if javob["holat"] == "toxtatildi":
        raise KeyboardInterrupt("Foydalanuvchi to'xtatdi")

    return [fitz.Rect(x0 / pt_masshtab, y0 / pt_masshtab,
                      x1 / pt_masshtab, y1 / pt_masshtab)
            for (x0, y0, x1, y1) in ramkalar]


def matn_bloklari(sahifa):
    natija = []
    for b in sahifa.get_text("blocks", sort=True):
        x0, y0, x1, y1, matn, _, tur = b[:7]
        if tur != 0:
            continue
        matn = (matn or "").strip()
        if matn:
            natija.append({"rect": fitz.Rect(x0, y0, x1, y1), "text": matn})
    return natija


def matn_sozlari(sahifa):
    return [fitz.Rect(w[0], w[1], w[2], w[3]) for w in sahifa.get_text("words")]


# ─────────────────────────── rejimni tanlash ───────────────────────────

def rejimni_aniqla(sahifa):
    """Bet uchun rejim: skan | rasm | latex."""
    if not sahifa.get_text("words"):
        return "skan"
    yuza = sahifa.rect.width * sahifa.rect.height
    for img in sahifa.get_images(full=True):
        try:
            rects = sahifa.get_image_rects(img[0])
        except Exception:
            continue
        for r in rects:
            # haqiqiy rasm: yetarlicha katta, lekin butun bet emas
            if (r.width >= RASM_MIN_PT and r.height >= RASM_MIN_PT
                    and yuza and (r.width * r.height) / yuza <= RASM_MAX_ULUSH):
                return "rasm"
    return "latex"


# ─────────────────────────── "rasm" rejimi ───────────────────────────

def rasm_rejimi(hujjat, sahifa, papka, sanoq):
    """Joylashtirilgan rasm obyektlarini o'z chegaralari bilan oladi."""
    yuza = sahifa.rect.width * sahifa.rect.height
    natija = []
    for img in sahifa.get_images(full=True):
        xref = img[0]
        try:
            rects = sahifa.get_image_rects(xref)
        except Exception:
            continue
        for r in rects:
            if r.width < RASM_MIN_PT or r.height < RASM_MIN_PT:
                continue
            if yuza and (r.width * r.height) / yuza > RASM_MAX_ULUSH:
                continue
            nom = f"rasm_{xref}.png"
            yol = papka / nom
            if not yol.exists():
                try:
                    xom = hujjat.extract_image(xref)
                    im = Image.open(io.BytesIO(xom["image"]))
                    if im.mode not in ("RGB", "RGBA", "L"):
                        im = im.convert("RGB")
                    im.save(yol, "PNG")
                except Exception as xato:
                    print(f"    ! rasm {xref} saqlanmadi: {xato}")
                    continue
            natija.append({"file": f"rasmlar/{nom}", "bbox": _bbox(r)})
    return natija


# ─────────────────────── "latex" va "skan" rejimlari ───────────────────────

def siyoh_sohalari(sahifa, matnlar, sozlar, hamma_sozni_ochir):
    """Chizmani sahifa aksidan topadi: matn o'chiriladi, qolgan siyoh — chizma."""
    masshtab = ANIQLASH_DPI / 72.0
    pix = sahifa.get_pixmap(dpi=ANIQLASH_DPI, colorspace=fitz.csGRAY)
    rasm = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
    siyoh = (rasm < 245).astype(np.uint8)
    h, w = siyoh.shape

    def ochir(r):
        x0 = max(0, int(r.x0 * masshtab)); y0 = max(0, int(r.y0 * masshtab))
        x1 = min(w, int(r.x1 * masshtab)); y1 = min(h, int(r.y1 * masshtab))
        if x1 > x0 and y1 > y0:
            siyoh[y0:y1, x0:x1] = 0

    abzaslar = [m["rect"] for m in matnlar
                if len([k for k in m["text"].split() if len(k) >= 2]) >= 4]

    # matn ostidagi rangli fon (highlight)
    if abzaslar:
        for dd in sahifa.get_drawings():
            dr, fill = dd.get("rect"), dd.get("fill")
            if dr is None or fill is None:
                continue
            dr = fitz.Rect(dr)
            for ar in abzaslar:
                ay = ar.width * ar.height
                if ay and _kesishuv(dr, ar) / ay > 0.5:
                    ochir(dr)
                    break

    for ar in abzaslar:
        ochir(fitz.Rect(ar) + (-2, -3, 2, 3))

    tanlangan = sozlar if hamma_sozni_ochir else [
        s for s in sozlar
        if any(_kesishuv(s, a) > 0.5 * s.width * s.height for a in abzaslar)]
    for sr in tanlangan:
        tik = max(1.0, sr.height * 0.5)
        ochir(fitz.Rect(sr) + (-1, -tik, 1, tik))

    if not siyoh.any():
        return []

    yadro = max(3, int(BIRLASHTIRISH_PT * masshtab) | 1)
    komponentlar = cv2.connectedComponentsWithStats(
        cv2.dilate(siyoh, np.ones((yadro, yadro), np.uint8)), 8)
    soni, _, statlar, _ = komponentlar

    en_pt, boyi_pt = sahifa.rect.width, sahifa.rect.height
    yuza_pt = en_pt * boyi_pt
    eng_kichik = SIYOH_MIN_PT * (1.6 if hamma_sozni_ochir else 1.0)
    yarim = yadro // 2
    xom = []
    for k in range(1, soni):
        x, y, cw, ch, maydon = statlar[k]
        r = fitz.Rect((x + yarim) / masshtab, (y + yarim) / masshtab,
                      (x + cw - yarim) / masshtab, (y + ch - yarim) / masshtab)
        if r.width < eng_kichik or r.height < eng_kichik:
            continue
        if r.width > 0.85 * en_pt and r.height < 8:
            continue
        if r.height > 0.85 * boyi_pt and r.width < 8:
            continue
        if yuza_pt and (r.width * r.height) / yuza_pt > SIYOH_MAX_ULUSH:
            continue
        if maydon < yadro * yadro:
            continue
        if r.height < 26 and r.width > 4 * r.height:
            continue
        xom.append(r)

    natija = []
    for r in xom:
        r = (fitz.Rect(r) + (-HOSHIYA_PT, -HOSHIYA_PT,
                             HOSHIYA_PT, PAST_HOSHIYA_PT)) & sahifa.rect
        for mavjud in natija:
            if mavjud.intersects(r):
                mavjud |= r
                break
        else:
            natija.append(fitz.Rect(r))
    return natija


def _ustun_chegarasi(sozlar, en_pt, boyi_pt):
    """Ikki ustunli betda ustunlar orasidagi bo'sh koridor markazini topadi."""
    tana = [r for r in sozlar if 0.06 * boyi_pt < (r.y0 + r.y1) / 2 < 0.94 * boyi_pt]
    if len(tana) < 30:
        return None
    qadam = 2.0
    kataklar = int(en_pt / qadam) + 1
    qoplama = [0] * kataklar
    for r in tana:
        a, b = int(r.x0 / qadam), min(kataklar - 1, int(r.x1 / qadam))
        for i in range(a, b + 1):
            qoplama[i] += 1

    eng_yaxshi, joriy = None, None
    for i, v in enumerate(qoplama):
        if v == 0:
            joriy = i if joriy is None else joriy
        else:
            if joriy is not None:
                eng_yaxshi = _nomzod(eng_yaxshi, joriy, i - 1, qadam, en_pt)
                joriy = None
    if joriy is not None:
        eng_yaxshi = _nomzod(eng_yaxshi, joriy, kataklar - 1, qadam, en_pt)
    return eng_yaxshi


def _nomzod(eng_yaxshi, a, b, qadam, en_pt):
    x0, x1 = a * qadam, (b + 1) * qadam
    markaz = (x0 + x1) / 2
    if x1 - x0 < 0.012 * en_pt:              # juda tor — so'zlar orasi
        return eng_yaxshi
    if not (0.35 * en_pt < markaz < 0.65 * en_pt):
        return eng_yaxshi
    if eng_yaxshi is None or (x1 - x0) > eng_yaxshi[1] - eng_yaxshi[0]:
        return (x0, x1)
    return eng_yaxshi


def _qatorlarga(sozlar):
    """So'zlarni qatorlarga, qatorlarni bloklarga guruhlaydi."""
    if not sozlar:
        return []
    balandliklar = sorted(r.height for r, _ in sozlar)
    med = balandliklar[len(balandliklar) // 2] or 10.0

    qatorlar = []
    for r, matn in sorted(sozlar, key=lambda p: (p[0].y0, p[0].x0)):
        markaz = (r.y0 + r.y1) / 2
        for q in qatorlar:
            if abs(markaz - q["markaz"]) < 0.6 * med:
                q["sozlar"].append((r, matn))
                q["rect"] |= r
                q["markaz"] = (q["rect"].y0 + q["rect"].y1) / 2
                break
        else:
            qatorlar.append({"rect": fitz.Rect(r), "markaz": markaz,
                             "sozlar": [(r, matn)]})

    qatorlar.sort(key=lambda q: q["rect"].y0)
    bloklar = []
    for q in qatorlar:
        matn = " ".join(m for _, m in sorted(q["sozlar"], key=lambda p: p[0].x0))
        if bloklar:
            oxirgi = bloklar[-1]
            oraliq = q["rect"].y0 - oxirgi["rect"].y1
            kesishuv = min(oxirgi["rect"].x1, q["rect"].x1) - max(oxirgi["rect"].x0, q["rect"].x0)
            if oraliq < 0.9 * med and kesishuv > 0:
                oxirgi["rect"] |= q["rect"]
                oxirgi["text"] += "\n" + matn
                continue
        bloklar.append({"rect": fitz.Rect(q["rect"]), "text": matn})
    return bloklar


def ocr_matni(sahifa):
    """
    Skan betdan OCR orqali bloklar va so'zlar.

    MUHIM: Tesseract ning o'z abzas guruhlashiga ISHONMAYMIZ. Ikki ustunli
    betda u chap va o'ng ustun qatorlarini bitta ulkan blokka qo'shib
    yuboradi — matn aralashib ketadi va savollarga bo'lish buziladi.
    Shuning uchun undan faqat SO'ZLAR va ularning joylashuvi olinadi,
    qator va bloklar geometriya bo'yicha o'zimiz yasaymiz.
    """
    import pytesseract
    if TESSERACT_YOLI:
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_YOLI

    dpi = xavfsiz_dpi(sahifa, OCR_DPI)
    masshtab = dpi / 72.0
    # Kulrang: Tesseract baribir ichida kulrangga o'tkazadi, uch kanalni
    # yasab keyin tashlashning ma'nosi yo'q.
    pix = sahifa.get_pixmap(dpi=dpi, colorspace=fitz.csGRAY)
    im = Image.open(io.BytesIO(pix.tobytes("png")))
    d = pytesseract.image_to_data(im, lang=OCR_TIL, config=OCR_SOZLAMA,
                                  output_type=pytesseract.Output.DICT)

    sozlar = []
    for i, matn in enumerate(d["text"]):
        matn = (matn or "").strip()
        if not matn:
            continue
        try:
            ishonch = float(d["conf"][i])
        except (TypeError, ValueError):
            ishonch = -1
        if ishonch < OCR_ISHONCH:
            continue
        r = fitz.Rect(d["left"][i] / masshtab, d["top"][i] / masshtab,
                      (d["left"][i] + d["width"][i]) / masshtab,
                      (d["top"][i] + d["height"][i]) / masshtab)
        sozlar.append((r, matn))

    if not sozlar:
        return [], []

    en_pt, boyi_pt = sahifa.rect.width, sahifa.rect.height
    koridor = _ustun_chegarasi([r for r, _ in sozlar], en_pt, boyi_pt)

    if koridor is None:
        matnlar = _qatorlarga(sozlar)
    else:
        chegara = (koridor[0] + koridor[1]) / 2
        keng = [p for p in sozlar if p[0].x0 < chegara < p[0].x1]   # ustunlarni kesuvchi
        chap = [p for p in sozlar if p[0].x1 <= chegara]
        ong = [p for p in sozlar if p[0].x0 >= chegara]
        # kesuvchi so'zlar (sarlavha, kalit qatori) alohida bloklar bo'ladi
        matnlar = _qatorlarga(keng) + _qatorlarga(chap) + _qatorlarga(ong)

    return ([{"rect": b["rect"], "text": b["text"]} for b in matnlar],
            [r for r, _ in sozlar])


# ─────────────────────────── asosiy oqim ───────────────────────────

def main():
    yol = Path(PDF_FAYL)
    if not yol.exists():
        print(f"XATO: '{PDF_FAYL}' topilmadi. Fayl shu papkada turibdimi?")
        return

    hujjat = fitz.open(yol)
    if SAHIFALAR is None:
        raqamlar = range(hujjat.page_count)
    else:
        boshi, oxiri = SAHIFALAR
        raqamlar = range(boshi - 1, min(oxiri, hujjat.page_count))

    asos = (CHIQISH.strip() or yol.stem)
    if SAHIFALAR is None:
        asos = f"{asos}_hammasi"
    elif isinstance(SAHIFALAR, int):
        asos = f"{asos}_{SAHIFALAR}"
    else:
        asos = f"{asos}_{SAHIFALAR[0]}-{SAHIFALAR[1]}"

    # mavjud natijani O'CHIRMAYMIZ — yangi nom tanlanadi
    ildiz = Path("chiqish")
    nom, n = asos, 1
    while (ildiz / nom).exists() or (ildiz / f"{nom}.zip").exists():
        n += 1
        nom = f"{asos}_{n}"
    chiqish = ildiz / nom
    (chiqish / "rasmlar").mkdir(parents=True)
    if SAHIFA_AKSI:
        (chiqish / "sahifalar").mkdir(parents=True)

    print(f"'{yol.name}' — rejim: {REJIM}\n")
    sahifalar, jami_rasm, jami_blok, sanoq = [], 0, 0, [0]

    for i in raqamlar:
        sahifa = hujjat[i]
        raqam = i + 1
        rejim = rejimni_aniqla(sahifa) if REJIM == "avto" else REJIM
        # "qol" hech qachon avtomatik tanlanmaydi — faqat qo'lda qo'yiladi

        matnlar = matn_bloklari(sahifa)
        sozlar = matn_sozlari(sahifa)
        ocr_belgisi = ""

        if rejim == "qol" and not sozlar:
            try:
                matnlar, sozlar = ocr_matni(sahifa)
                ocr_belgisi = " [OCR]"
            except ImportError:
                print("  ! pytesseract yo'q — `pip install pytesseract`")
            except Exception as xato:
                print(f"  ! OCR bajarilmadi: {xato}")

        if rejim == "skan":
            if sozlar:
                print(f"  {raqam}-bet: DIQQAT — 'skan' rejimi tanlangan, "
                      f"lekin betda matn qatlami bor.")
            else:
                try:
                    matnlar, sozlar = ocr_matni(sahifa)
                    ocr_belgisi = " [OCR]"
                except ImportError:
                    print("  ! pytesseract yo'q — `pip install pytesseract`")
                except Exception as xato:
                    print(f"  ! OCR bajarilmadi: {xato}")

        sahifa_fayl = f"sahifa_{raqam}.{SAHIFA_FORMAT}"
        if SAHIFA_AKSI:
            sahifa_aksini_saqla(sahifa, chiqish / "sahifalar" / sahifa_fayl)

        if rejim == "qol":
            rasmlar = []
            for r in qolda_belgilash(sahifa, raqam):
                sanoq[0] += 1
                nom = f"rasm_{raqam}_{sanoq[0]}.{RASM_FORMAT}"
                kesimni_saqla(sahifa, r, chiqish / "rasmlar" / nom)
                rasmlar.append({"file": f"rasmlar/{nom}", "bbox": _bbox(r)})
        elif rejim == "rasm":
            rasmlar = rasm_rejimi(hujjat, sahifa, chiqish / "rasmlar", sanoq)
        elif not sozlar:
            rasmlar = []
            print(f"  {raqam}-bet: matn ham, OCR ham yo'q — chizma izlanmadi.")
        else:
            rasmlar = []
            for r in siyoh_sohalari(sahifa, matnlar, sozlar,
                                    hamma_sozni_ochir=(rejim == "skan")):
                sanoq[0] += 1
                nom = f"rasm_{raqam}_{sanoq[0]}.{RASM_FORMAT}"
                kesimni_saqla(sahifa, r, chiqish / "rasmlar" / nom)
                rasmlar.append({"file": f"rasmlar/{nom}", "bbox": _bbox(r)})

        rasmlar.sort(key=lambda r: (r["bbox"]["y"], r["bbox"]["x"]))
        for j, r in enumerate(rasmlar):
            r["order"] = j

        sahifa_yozuvi = {
            "page": raqam,
            "width": round(sahifa.rect.width, 2),
            "height": round(sahifa.rect.height, 2),
            "mode": rejim,
            "blocks": [{"order": k, "bbox": _bbox(m["rect"]), "text": m["text"]}
                       for k, m in enumerate(matnlar)],
            "images": rasmlar,
        }
        # `pageImage` faqat fayl ZIP ichida bo'lsa yoziladi: sayt manifestdagi
        # har yo'l arxivda mavjudligini tekshiradi va topmasa ZIP ni rad etadi.
        if SAHIFA_AKSI and SAHIFA_ZIPGA:
            sahifa_yozuvi["pageImage"] = f"sahifalar/{sahifa_fayl}"
        sahifalar.append(sahifa_yozuvi)
        jami_blok += len(matnlar); jami_rasm += len(rasmlar)
        nishon = f" ({rejim})" if REJIM == "avto" else ""
        print(f"  {raqam}-bet{nishon}{ocr_belgisi}: "
              f"{len(matnlar)} matn bloki, {len(rasmlar)} rasm")

    manifest = {
        "version": 1,
        # Skan hujjatda sayt `kind` ga qarab zaxira rejim tanlaydi (pageModes).
        # Har bet uchun `mode` baribir yozilgani uchun bu faqat aniqlik.
        "kind": "scanned" if REJIM == "skan" else "auto",
        "sourceFile": yol.name,
        "sourceLang": ASL_TIL,
        "pageCount": len(sahifalar),
        "pages": sahifalar,
    }
    (chiqish / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # ZIP o'zimiz yig'iladi (avval `shutil.make_archive` butun papkani olardi):
    # sahifa akslari kerak bo'lsa tashqarida qoldiriladi. PNG allaqachon
    # siqilgan, shuning uchun eng yengil siqish darajasi.
    zip_yoli = ildiz / f"{nom}.zip"
    tashlandi = 0
    with zipfile.ZipFile(zip_yoli, "w", zipfile.ZIP_DEFLATED, compresslevel=1) as arxiv:
        for fayl in sorted(chiqish.rglob("*")):
            if not fayl.is_file():
                continue
            nisbiy = fayl.relative_to(chiqish)
            if not SAHIFA_ZIPGA and nisbiy.parts[0] == "sahifalar":
                tashlandi += 1
                continue
            arxiv.write(fayl, nisbiy.as_posix())

    print(f"\nTayyor: {jami_blok} matn bloki, {jami_rasm} rasm")
    print(f"ZIP: {zip_yoli}  ({zip_yoli.stat().st_size / 1_048_576:.1f} MB)")
    if tashlandi:
        print(f"Sahifa aksi ({tashlandi} ta) ZIP'ga qo'shilmadi — ular "
              f"'{chiqish / 'sahifalar'}' papkasida, chatga biriktirish uchun.")
    print("Shu ZIP faylni EduPrime import sahifasiga tashlang.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nTo'xtatildi. Shu paytgacha kesilgan rasmlar 'chiqish' "
              "papkasida qoldi, lekin ZIP yasalmadi.")
