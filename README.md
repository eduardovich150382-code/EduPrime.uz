# 🎓 EduPrime.uz — Test Platformasi

O'zbekistondagi eng zamonaviy test platformasi — DTM, maktab, attestatsiya, SAT, GRE va Milliy sertifikat testlari.

## 🚀 Texnologiyalar

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS 4 + Framer Motion
- **Backend:** Next.js API Routes + Prisma ORM
- **Database:** PostgreSQL (Neon.tech - bepul)
- **Auth:** NextAuth.js (Telegram Bot + Google OAuth)
- **Bot:** Telegram Bot (@EduPrimeuzbot)
- **AI:** Google Gemini Flash (bepul tier)
- **Media:** Cloudinary (rasmlar uchun)
- **i18n:** next-intl (O'zbek, Rus, Ingliz)
- **LaTeX:** KaTeX (formulalar uchun)

## 📋 Test Turlari

| # | Turi | Format |
|---|------|--------|
| 1 | DTM | 5 fan, 30 savol, 3.5 soat |
| 2 | Maktab | Fanlar bo'yicha |
| 3 | Attestatsiya | 50 savol, 2 ball |
| 4 | SAT | Math + Reading |
| 5 | GRE Physics | 70 savol |
| 6 | Milliy Sertifikat | 35 test + 20 open = 55 |

## 💰 Tariflar

| Tarif | Narx | Imkoniyatlar |
|-------|------|-------------|
| Bepul | 0 | Cheklangan DTM + Maktab testlari |
| Premium | 29,000/oy | DTM + Maktab + Sertifikat — cheksiz |
| Ustoz | 29,000/oy | Attestatsiya + SAT + GRE + Sertifikat |

## 🛠️ O'rnatish

```bash
# Dependencies o'rnatish
npm install

# .env faylini sozlash
cp .env.example .env
# .env ichidagi qiymatlarni to'ldiring

# Prisma generate
npm run db:generate

# Database push
npm run db:push

# Development
npm run dev
```

## 🤖 Telegram Bot

```bash
cd bot
npm install
npm run dev
```

## 📁 Loyiha Strukturasi

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/login/         # Auth sahifalari
│   │   ├── (main)/dashboard/     # Foydalanuvchi panel
│   │   ├── (main)/tests/         # Testlar
│   │   ├── (main)/results/       # Natijalar
│   │   ├── (teacher)/teacher/    # Ustoz panel
│   │   └── (admin)/admin/        # Admin panel
│   └── api/                      # API routes
├── components/
│   ├── landing/                  # Landing sahifa komponentlari
│   ├── layout/                   # Header, Footer, Sidebar
│   ├── test/                     # Test komponentlari
│   └── ui/                       # UI komponentlar
├── i18n/                         # Internationalization
├── lib/                          # Utilities, DB, Auth
├── messages/                     # UZ, RU, EN tarjimalar
└── types/                        # TypeScript types
bot/                              # Telegram Bot
prisma/                           # Database schema
```

## 🎨 Dizayn

- **Rang sxemasi:** Oq-binafsha (Light tema)
- **Primary:** #7C3AED
- **Background:** #FAFAFA
- **Font:** Inter

## 👥 Rollar

- **Admin** — To'liq boshqaruv
- **Ustoz** — O'z fani bo'yicha test CRUD
- **Foydalanuvchi** — Testlar yechish

## 📱 Deploy

- **Frontend:** Vercel (bepul)
- **Backend:** Railway/Render (bepul tier)
- **Database:** Neon.tech (bepul)
- **Bot:** Railway (bepul tier)
