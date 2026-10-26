# Testlar bo'limi — UI qoidalari

Testlar bo'limini qayta dizayn qilish sessiyalari shu qoidalarga tayanadi.

## Ranglar
- Asosiy rang: mavjud primary palitra (primary-600 #7c3aed). Asosiy CTA tugma — to'liq (solid) primary-600, oq matn, gradient EMAS.
- Ikkinchi darajali tugma: border primary-200, fon primary-50, matn primary-800.
- Fon #fafafa, kartalar oq, chegara #e5e7eb, shrift Inter (mavjud).
- Kartalarda gradient fon, chap chegarali "accent" (border-l-*) va emoji ishlatilmaydi.
  Istisno: /pricing dagi "Hammasi" paketining pastdagi langar kartasi — u ataylab boshqa kartalardan ajralib turadi.
- Maqsad (TestType) belgilari — kichik pill, matn/fon:
  ATTESTATION  #92400e / #fef3c7  — "Attestatsiya"
  CERTIFICATE  #1e40af / #dbeafe  — "Milliy sertifikat"
  DTM          #9f1239 / #ffe4e6  — "Abituriyent (DTM)"
  SCHOOL       #115e59 / #ccfbf1  — "Maktab darsi"
  PRESIDENT_SCHOOL #86198f / #fae8ff — "Prezident maktabi"
  SAT          #334155 / #e2e8f0  — "SAT"
  GRE          #3f6212 / #ecfccb  — "GRE"
  Kartalar yonma-yon turadi: to'yingan fon tuslari bir-biridan ≥ 30° farq qilsin (SAT kulrangi bundan mustasno).
- Attestatsiya banneri: fon #2e1065, sarlavha oq, ikkinchi matn #ddd6fe, CTA fon #fbbf24 matn #451a03.
- Natija holatlari: to'g'ri — fon #dcfce7, matn #166534, chegara #86efac; xato — to'liq #e11d48, oq matn; javob berilmagan — oq fon, uzuq chiziqli chegara #9ca3af. Rang yolg'iz emas — ikonka (Check / X / Minus) ham bo'ladi.

## Shakl
- Kartalar: rounded-2xl (≈18px), border, p-5, yengil soya (shadow-sm), gap-4 oralig'i.
- Tegish maydoni ≥ 44px. Mobil-birinchi: 390px kenglikda gorizontal aylanish yo'q; chiplar qatori o'z konteynerida overflow-x-auto bilan suriladi.
- Bo'shliqlar 4/8 karrali (Tailwind shkalasi).

## Matn qoidalari (foydalanuvchiga ko'rinadigan)
- Kitob nomi, muallif ismi, "1-to'plam", "11-sinf", "1-bob" kabi manba yozuvlari test kartalarida ko'rsatilmaydi.
- Test kartasida qiyinlik darajasi va rasmli savollar foizi ko'rsatilmaydi (testlar aralash darajada).
- "Jamlanma" so'zi ishlatilmaydi — "Test" deyiladi.
- Bo'lim nomi: "Atom va yadro fizikasi" (eski "Atom fizikasi" emas).
