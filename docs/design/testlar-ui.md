# Testlar bo'limi — UI qoidalari

Testlar bo'limini qayta dizayn qilish sessiyalari shu qoidalarga tayanadi.

## Ranglar
- Asosiy rang: mavjud primary palitra (primary-600 #7c3aed). Asosiy CTA tugma — to'liq (solid) primary-600, oq matn, gradient EMAS.
- Ikkinchi darajali tugma: border primary-200, fon primary-50, matn primary-800.
- Fon #fafafa, kartalar oq, chegara #e5e7eb, shrift Inter (mavjud).
- Kartalarda gradient fon, chap chegarali "accent" (border-l-*) va emoji ishlatilmaydi.
- Maqsad (TestType) belgilari — kichik pill, matn/fon:
  ATTESTATION  #92400e / #fef3c7  — "Attestatsiya"
  CERTIFICATE  #1e40af / #dbeafe  — "Milliy sertifikat"
  DTM          #9a3412 / #ffedd5  — "Abituriyent (DTM)"
  SCHOOL       #115e59 / #ccfbf1  — "Maktab darsi"
  PRESIDENT_SCHOOL #3730a3 / #e0e7ff — "Prezident maktabi"
  SAT          #334155 / #e2e8f0  — "SAT"
  GRE          #155e75 / #cffafe  — "GRE"
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
