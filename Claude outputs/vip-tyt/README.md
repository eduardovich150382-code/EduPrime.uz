# VIP TYT — Modda va uning xossalari

Manba: `Kitoblar/781893204-Tyt-Vi-p-Fi-zi-k-Soru-Bankasi-2024.pdf`, «MADDE VE ÖZELLİKLERİ», PDF 18–34-betlar. Bobdagi **8 to'plam, 65 savol** to'liq o'zbekchalashtirilgan: 01–07 to'plamlar 8 tadan, 08 to'plam 9 ta savol.

## Platformaga kiritish

- `vip-tyt-madde-barcha.json` — barcha 65 savolni bir marta import qilish uchun.
- `vip-tyt-madde-test-01.json` … `vip-tyt-madde-test-08.json` — alohida testlar sifatida import qilish uchun. **Umumiy fayl va alohida fayllarni birga import qilmang**, ular bir xil savollarning ikki taqdimoti.
- `rasmlar-vip-tyt-madde.zip` — 74 ta asl rasm kesmasi hamda 11 ta mustaqil SVG yechim chizmasi. ZIP ichidagi yo'llar `savol-rasm/vip-tyt-madde/` bilan boshlanadi.
- Rasmlar repozitoriyning `public/savol-rasm/vip-tyt-madde/` papkasiga ham joylangan. Deploydan keyin JSONdagi `/savol-rasm/vip-tyt-madde/...` yo'llari ishlaydi. Alohida yuklash talab qilinmaydi. Faqat boshqa domenda import qilinsa, o'sha domenga rasmlar ham ko'chiriladi yoki yo'llar yangilanadi.
- `tuzatishlar.md` — asl nusxadagi xato va noaniqliklar, qilingan tuzatishlar.
- `savol-manbalari.json`, `rasm-manbalari.json` — savol/bet mosligi va rasm kesilgan koordinatalar. Bu fayllar savol importi uchun emas.
- `tekshirish-hisoboti.json`, `rasmlar-tekshiruvi.json` — tekshiruv natijalari; bular ham savol importi uchun emas.

## Format

`text`, `options`, `answer`, `correctAnswer`, `explanation`, `topic`, `difficulty`, zarur joylarda `images` va `explanationImages`. Oddiy variantlar satr, rasmli variantlar `{label, text, image}` shaklida; ikkalasini ham mavjud import qabul qiladi. Har bir yechimda **Berilgan**, **Topish kerak**, **Yechilishi**, **Javob** sarlavhalari alohida abzasdan boshlanadi. Formulalar KaTeX uchun `$...$` ichida.

`source` va `id` qo'shimcha ma'lumotlari manbani qayta tekshirishga xizmat qiladi; import parseri ularni savol matniga qo'shmaydi. Asl kalitdan farqlar tuzatishlar qaydida tushuntirilgan.

## Rasmlar sifati

Asl PDF ichidagi 1828 × 2381 pikselli sahifa tasvirlaridan kesilgan. Kesmalarning piksel o'lchami kichraytirilmagan; turkcha yozuvlar dasturiy ravishda o'zbekchalashtirilgan. WebP **lossless** rejimida saqlangan; yechim chizmalari ixcham SVG. Rasm generatoridan foydalanilmagan. Yechim rasmlari tashqi shrift yoki boshqa rasmga bog'lanmagan.

## Tekshirish

- Mavjud `parsePastedQuestions` orqali 65/65 savol; import xatolari va ogohlantirishlari yo'q.
- Alohida 8 JSON umumiy fayldagi mos savollarga aynan teng.
- Barcha formulalar KaTeX'ning xatoda to'xtaydigan rejimida tekshirilgan.
- Savol, variant va yechimlardagi barcha 85 rasm yo'li mavjud; ZIP bilan mos.
- Sahifalar, javoblar, rasmlar va hisoblar qo'lda solishtirilgan; manbadagi tuzatishlar alohida qayd etilgan.
- TypeScript va production build muvaffaqiyatli; lint 0 xato, mavjud 370 ogohlantirish.
- Vitest: 1439 test o'tgan, 4 test o'tkazib yuborilgan (105 fayl: 104 o'tgan, 1 o'tkazilgan).

Migratsiya yo'q. Platformaga savollar yoki test ma'lumotlari bazadan yozib qo'yilmagan — importni loyiha egasi bajaradi.
