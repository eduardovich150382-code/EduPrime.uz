import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').filter(Boolean);
const PAYMENT_CARD = process.env.PAYMENT_CARD_NUMBER || '9860 XXXX XXXX XXXX';
const PAYMENT_CARD_OWNER = 'Asrorov Xushbaxt';
const CHANNEL_USERNAME = '@EduPrimeuz';
const CHANNEL_LINK = 'https://t.me/EduPrimeuz';

const DEFAULT_PRICES: Record<string, Record<string, number>> = {
  premium: { '1_month': 29000, '3_months': 79000, '6_months': 150000, '1_year': 270000 },
  teacher: { '1_month': 49000, '3_months': 129000, '6_months': 240000, '1_year': 430000 },
};

const DURATION_LABELS: Record<string, string> = {
  '1_month': '1 oy',
  '3_months': '3 oy',
  '6_months': '6 oy',
  '1_year': '1 yil',
};

// Fetch dynamic settings from DB
async function getSettings() {
  try {
    const settings = await db.systemSetting.findMany({
      where: { key: { in: [
        'premium_price_1_month', 'premium_price_3_months', 'premium_price_6_months', 'premium_price_1_year',
        'teacher_price_1_month', 'teacher_price_3_months', 'teacher_price_6_months', 'teacher_price_1_year',
        'payment_card_number', 'payment_card_owner',
      ] } },
    });
    const s: Record<string, string> = {};
    for (const st of settings) s[st.key] = st.value;
    return {
      prices: {
        premium: {
          '1_month': parseInt(s.premium_price_1_month) || DEFAULT_PRICES.premium['1_month'],
          '3_months': parseInt(s.premium_price_3_months) || DEFAULT_PRICES.premium['3_months'],
          '6_months': parseInt(s.premium_price_6_months) || DEFAULT_PRICES.premium['6_months'],
          '1_year': parseInt(s.premium_price_1_year) || DEFAULT_PRICES.premium['1_year'],
        },
        teacher: {
          '1_month': parseInt(s.teacher_price_1_month) || DEFAULT_PRICES.teacher['1_month'],
          '3_months': parseInt(s.teacher_price_3_months) || DEFAULT_PRICES.teacher['3_months'],
          '6_months': parseInt(s.teacher_price_6_months) || DEFAULT_PRICES.teacher['6_months'],
          '1_year': parseInt(s.teacher_price_1_year) || DEFAULT_PRICES.teacher['1_year'],
        },
      },
      cardNumber: s.payment_card_number || PAYMENT_CARD,
      cardOwner: s.payment_card_owner || PAYMENT_CARD_OWNER,
    };
  } catch {
    return { prices: DEFAULT_PRICES, cardNumber: PAYMENT_CARD, cardOwner: PAYMENT_CARD_OWNER };
  }
}

function calcSavings(monthly: number, total: number, months: number): string {
  const full = monthly * months;
  if (full <= 0) return '';
  const pct = Math.round(((full - total) / full) * 100);
  return pct > 0 ? ` (tejash ${pct}%)` : '';
}

// Get Telegram file URL (for photos and documents)
async function getFileUrl(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    });
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
    }
  } catch (error) {
    console.error('getFileUrl error:', error);
  }
  return null;
}

// Telegram API helper
async function sendMessage(chatId: number | string, text: string, options: any = {}) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options,
    }),
  });
  return res.json();
}

async function forwardMessage(chatId: number | string, fromChatId: number | string, messageId: number) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    }),
  });
}

async function answerCallbackQuery(callbackQueryId: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

function isAdmin(userId: number | string): boolean {
  return ADMIN_IDS.includes(userId.toString());
}

// IMPORTANT: Bot must be an administrator in the @EduPrimeuz channel for getChatMember to work
async function checkChannelSubscription(userId: number): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHANNEL_USERNAME,
          user_id: userId,
        }),
      }
    );
    const data = await res.json();
    console.log(`[Subscription Check] userId=${userId}, response:`, JSON.stringify(data));
    if (data.ok && data.result) {
      const status = data.result.status;
      return (
        status === 'member' ||
        status === 'administrator' ||
        status === 'creator' ||
        status === 'restricted'
      );
    }
    console.warn(`[Subscription Check] Failed for userId=${userId}:`, data.description || 'unknown error');
    return false;
  } catch (error) {
    console.error(`[Subscription Check] Exception for userId=${userId}:`, error);
    return false;
  }
}

// Send subscription prompt to user
async function sendSubscriptionPrompt(chatId: number) {
  await sendMessage(chatId,
    `📢 <b>Kanalga obuna bo'ling!</b>\n\n` +
    `Botdan foydalanish uchun avval <b>@EduPrimeuz</b> kanaliga obuna bo'lishingiz kerak.\n\n` +
    `✅ Obuna bo'lgandan keyin "Obuna bo'ldim" tugmasini bosing.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📢 Kanalga obuna bo'lish", url: CHANNEL_LINK }],
          [{ text: "✅ Obuna bo'ldim — Tasdiqlash", callback_data: 'check_subscription' }],
        ]
      }
    }
  );
}

// Handle /start command
async function handleStart(chatId: number, userId: number, username: string, firstName: string, param: string) {
  // Handle plan-specific buy params: buy_premium_1month, buy_teacher_6months, etc.
  if (param.startsWith('buy_')) {
    const parts = param.replace('buy_', '').split('_');
    const plan = parts[0]; // premium or teacher
    const durationKey = parts.slice(1).join(''); // 1month, 3months, 6months, 1year

    const durationMap: Record<string, string> = {
      '1month': '1_month',
      '3months': '3_months',
      '6months': '6_months',
      '1year': '1_year',
    };
    const duration = durationMap[durationKey] || '1_month';

    // Fetch dynamic prices and card info from admin settings
    const { prices, cardNumber, cardOwner } = await getSettings();
    const planPrices = plan === 'teacher' ? prices.teacher : prices.premium;
    const amount = planPrices[duration] || planPrices['1_month'];
    const planName = plan === 'premium' ? '💎 Premium' : '👨‍🏫 Ustoz';

    // Check if user exists in DB, if not register them
    let dbUser = await db.user.findFirst({
      where: { telegramId: userId.toString() },
    });

    if (!dbUser) {
      // Register user first
      dbUser = await db.user.create({
        data: {
          telegramId: userId.toString(),
          telegramUsername: username || undefined,
          name: firstName || username || 'Telegram User',
          role: 'USER',
        },
      });

      // Send welcome message first
      await sendMessage(chatId,
        `🎓 <b>EduPrime.uz</b>ga xush kelibsiz, ${firstName}! 👋\n\n` +
        `Siz muvaffaqiyatli ro'yxatdan o'tdingiz. Endi to'lov ma'lumotlarini ko'rishingiz mumkin.`
      );
    }

    // Store pending payment
    await db.systemSetting.upsert({
      where: { key: `pending_payment_${userId}` },
      update: {
        value: JSON.stringify({ userId, username, plan, duration, amount, timestamp: Date.now() }),
      },
      create: {
        key: `pending_payment_${userId}`,
        value: JSON.stringify({ userId, username, plan, duration, amount, timestamp: Date.now() }),
      },
    });

    // Show payment details
    await sendMessage(chatId,
      `📋 <b>To'lov ma'lumotlari:</b>\n\n` +
      `Tarif: ${planName}\n` +
      `Muddat: ${DURATION_LABELS[duration]}\n` +
      `Summa: <b>${amount.toLocaleString()} so'm</b>\n\n` +
      `💳 Karta raqami:\n` +
      `<code>${cardNumber}</code>\n` +
      `👤 Karta egasi: <b>${cardOwner}</b>\n\n` +
      `📎 To'lov qilganingizdan keyin <b>chek screenshot yoki PDF</b>ini shu yerga yuboring.\n\n` +
      `⏱ Chek yuborilgandan keyin 24 soat ichida admin tasdiqlaydi.`
    );
    return;
  }

  if (param === 'login' || param === 'buy') {
    try {
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');

      await db.systemSetting.upsert({
        where: { key: `telegram_auth_${userId}` },
        update: {
          value: JSON.stringify({ token, username, firstName, createdAt: Date.now() }),
        },
        create: {
          key: `telegram_auth_${userId}`,
          value: JSON.stringify({ token, username, firstName, createdAt: Date.now() }),
        },
      });

      const authUrl = `${APP_URL}/api/auth/telegram-callback?telegramId=${userId}&username=${username}&firstName=${encodeURIComponent(firstName)}&token=${token}`;

      await sendMessage(chatId,
        `Salom, ${firstName}! 👋\n\n` +
        `Pastdagi ✅ <b>Saytga kirish</b> tugmasini bosing — avtomatik kirasiz.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Saytga kirish', url: authUrl }],
              [{ text: '📚 Testlar', url: `${APP_URL}/tests` }, { text: '📊 Dashboard', url: `${APP_URL}/dashboard` }],
            ]
          }
        }
      );
    } catch (error) {
      console.error('Start login error:', error);
      await sendMessage(chatId, '❌ Xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
    return;
  }

  // Default /start — show welcome with website button
  const adminText = isAdmin(userId) ? '\n\n🔐 <b>Admin buyruqlar:</b>\n/admin — Admin panel\n/broadcast — Barchaga xabar\n/users — Foydalanuvchilar soni' : '';

  await sendMessage(chatId,
    `🎓 <b>EduPrime.uz</b> — Test Platformasi\n\n` +
    `Salom, ${firstName}! Xush kelibsiz! 👋\n\n` +
    `📚 Bu bot orqali:\n` +
    `• Saytga kirish\n` +
    `• Premium/Ustoz tarif sotib olish\n` +
    `• Yangiliklar olish\n\n` +
    `<b>Buyruqlar:</b>\n` +
    `/login — Saytga kirish\n` +
    `/premium — Premium sotib olish\n` +
    `/ustoz — Ustoz tarifi\n` +
    `/help — Yordam` +
    adminText,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 Saytga kirish', url: APP_URL }],
          [{ text: '📚 Testlar', url: `${APP_URL}/tests` }, { text: '💰 Tariflar', url: `${APP_URL}/pricing` }],
        ]
      }
    }
  );
}

// Handle /login
async function handleLogin(chatId: number, userId: number, username: string, firstName: string) {
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  await db.systemSetting.upsert({
    where: { key: `telegram_auth_${userId}` },
    update: {
      value: JSON.stringify({ token, username, firstName, createdAt: Date.now() }),
    },
    create: {
      key: `telegram_auth_${userId}`,
      value: JSON.stringify({ token, username, firstName, createdAt: Date.now() }),
    },
  });

  const authUrl = `${APP_URL}/api/auth/telegram-callback?telegramId=${userId}&username=${username}&firstName=${encodeURIComponent(firstName)}&token=${token}`;

  await sendMessage(chatId,
    `🔐 Kirish havolasi tayyor!\n\nPastdagi tugmani bosib saytga kiring:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Saytga kirish', url: authUrl }],
          [{ text: '📚 Testlar', url: `${APP_URL}/tests` }, { text: '📊 Dashboard', url: `${APP_URL}/dashboard` }],
        ]
      }
    }
  );
}

// Handle /premium
async function handlePremium(chatId: number) {
  const { prices } = await getSettings();
  const p = prices.premium;
  await sendMessage(chatId,
    `💎 <b>Premium tarif</b>\n\n` +
    `✅ DTM testlari — cheksiz\n` +
    `✅ Maktab testlari — cheksiz\n` +
    `✅ Milliy sertifikat testlari\n` +
    `✅ Video va yozma yechimlar\n` +
    `✅ Reklama yo'q\n\n` +
    `Muddatni tanlang:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: `1 oy — ${p['1_month'].toLocaleString()} so'm`, callback_data: 'pay_premium_1month' }],
          [{ text: `3 oy — ${p['3_months'].toLocaleString()} so'm${calcSavings(p['1_month'], p['3_months'], 3)}`, callback_data: 'pay_premium_3months' }],
          [{ text: `6 oy — ${p['6_months'].toLocaleString()} so'm${calcSavings(p['1_month'], p['6_months'], 6)}`, callback_data: 'pay_premium_6months' }],
          [{ text: `1 yil — ${p['1_year'].toLocaleString()} so'm${calcSavings(p['1_month'], p['1_year'], 12)}`, callback_data: 'pay_premium_1year' }],
        ]
      }
    }
  );
}

// Handle /ustoz
async function handleUstoz(chatId: number) {
  const { prices } = await getSettings();
  const p = prices.teacher;
  await sendMessage(chatId,
    `👨‍🏫 <b>Ustoz tarif</b>\n\n` +
    `✅ Attestatsiya testlari (tanlangan fanlar)\n` +
    `✅ SAT testlari — cheksiz\n` +
    `✅ GRE Physics — cheksiz\n` +
    `✅ Milliy sertifikat testlari\n` +
    `✅ Video va yozma yechimlar\n\n` +
    `Muddatni tanlang:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: `1 oy — ${p['1_month'].toLocaleString()} so'm`, callback_data: 'pay_teacher_1month' }],
          [{ text: `3 oy — ${p['3_months'].toLocaleString()} so'm${calcSavings(p['1_month'], p['3_months'], 3)}`, callback_data: 'pay_teacher_3months' }],
          [{ text: `6 oy — ${p['6_months'].toLocaleString()} so'm${calcSavings(p['1_month'], p['6_months'], 6)}`, callback_data: 'pay_teacher_6months' }],
          [{ text: `1 yil — ${p['1_year'].toLocaleString()} so'm${calcSavings(p['1_month'], p['1_year'], 12)}`, callback_data: 'pay_teacher_1year' }],
        ]
      }
    }
  );
}

// Handle /help
async function handleHelp(chatId: number, userId: number) {
  const adminText = isAdmin(userId)
    ? '\n\n🔐 <b>Admin buyruqlar:</b>\n/admin — Admin panel\n/broadcast [xabar] — Barchaga xabar\n/users — Foydalanuvchilar soni'
    : '';

  await sendMessage(chatId,
    `🤖 <b>EduPrime Bot — Yordam</b>\n\n` +
    `<b>Asosiy buyruqlar:</b>\n` +
    `/start — Botni boshlash\n` +
    `/login — Saytga kirish havolasi\n` +
    `/premium — Premium tarif sotib olish\n` +
    `/ustoz — Ustoz tarifi sotib olish\n` +
    `/stats — Statistikani ko'rish\n` +
    `/help — Shu yordam` +
    adminText +
    `\n\n❓ Savollar uchun: @EduPrimeuz_Admin`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 Saytga kirish', url: APP_URL }],
        ]
      }
    }
  );
}

// Handle /admin
async function handleAdmin(chatId: number, userId: number) {
  if (!isAdmin(userId)) {
    await sendMessage(chatId, '❌ Bu buyruq faqat adminlar uchun.');
    return;
  }

  const userCount = await db.user.count();
  const pendingPayments = await db.systemSetting.findMany({
    where: { key: { startsWith: 'pending_payment_' } },
  });

  await sendMessage(chatId,
    `🔐 <b>Admin Panel</b>\n\n` +
    `👥 Foydalanuvchilar: <b>${userCount}</b>\n` +
    `💰 Kutilayotgan to'lovlar: <b>${pendingPayments.length}</b>\n\n` +
    `<b>Admin buyruqlar:</b>\n` +
    `/users — Foydalanuvchilar ro'yxati\n` +
    `/broadcast [xabar] — Barchaga xabar yuborish\n\n` +
    `Saytdagi admin panelga o'tish:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚙️ Admin Panel (sayt)', url: `${APP_URL}/admin` }],
          [{ text: '👥 Foydalanuvchilar', url: `${APP_URL}/admin/users` }, { text: '💰 To\'lovlar', url: `${APP_URL}/admin/payments` }],
        ]
      }
    }
  );
}

// Handle /users
async function handleUsers(chatId: number, userId: number) {
  if (!isAdmin(userId)) {
    await sendMessage(chatId, '❌ Bu buyruq faqat adminlar uchun.');
    return;
  }

  const totalUsers = await db.user.count();
  const recentUsers = await db.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { name: true, email: true, telegramUsername: true, createdAt: true },
  });

  let userList = recentUsers.map((u, i) =>
    `${i + 1}. ${u.name || 'Nomsiz'} ${u.telegramUsername ? `(@${u.telegramUsername})` : u.email || ''}`
  ).join('\n');

  await sendMessage(chatId,
    `👥 <b>Foydalanuvchilar</b>\n\n` +
    `Jami: <b>${totalUsers}</b> ta\n\n` +
    `<b>Oxirgi 5 ta:</b>\n${userList}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👥 Barchasini ko\'rish (sayt)', url: `${APP_URL}/admin/users` }],
        ]
      }
    }
  );
}

// Handle /broadcast
async function handleBroadcast(chatId: number, userId: number, messageText: string) {
  if (!isAdmin(userId)) {
    await sendMessage(chatId, '❌ Bu buyruq faqat adminlar uchun.');
    return;
  }

  if (!messageText.trim()) {
    await sendMessage(chatId, '⚠️ Xabar matnini kiriting:\n/broadcast Salom, yangi testlar qo\'shildi!');
    return;
  }

  // Get all users with telegram IDs
  const users = await db.user.findMany({
    where: { telegramId: { not: null } },
    select: { telegramId: true },
  });

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    if (user.telegramId) {
      try {
        await sendMessage(parseInt(user.telegramId),
          `📢 <b>EduPrime.uz yangiligi</b>\n\n${messageText}`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: '🌐 Saytga o\'tish', url: APP_URL }]]
            }
          }
        );
        sent++;
      } catch {
        failed++;
      }
    }
  }

  await sendMessage(chatId, `📢 Xabar yuborildi!\n\n✅ Yuborildi: ${sent}\n❌ Xatolik: ${failed}`);
}

// Handle callback queries
async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const username = callbackQuery.from.username || '';
  const firstName = callbackQuery.from.first_name || '';
  const data = callbackQuery.data || '';

  await answerCallbackQuery(callbackQuery.id);

  // Handle subscription check callback
  if (data === 'check_subscription') {
    const isSubscribed = await checkChannelSubscription(userId);
    if (isSubscribed) {
      await sendMessage(chatId,
        `✅ <b>Obuna tasdiqlandi!</b>\n\nRahmat! Endi botdan to'liq foydalanishingiz mumkin. 🎉`
      );
      // Send start/welcome message
      const adminText = isAdmin(userId) ? '\n\n🔐 <b>Admin buyruqlar:</b>\n/admin — Admin panel\n/broadcast — Barchaga xabar\n/users — Foydalanuvchilar soni' : '';
      await sendMessage(chatId,
        `🎓 <b>EduPrime.uz</b> — Test Platformasi\n\n` +
        `Salom, ${firstName}! Xush kelibsiz! 👋\n\n` +
        `📚 Bu bot orqali:\n` +
        `• Saytga kirish\n` +
        `• Premium/Ustoz tarif sotib olish\n` +
        `• Yangiliklar olish\n\n` +
        `<b>Buyruqlar:</b>\n` +
        `/login — Saytga kirish\n` +
        `/premium — Premium sotib olish\n` +
        `/ustoz — Ustoz tarifi\n` +
        `/help — Yordam` +
        adminText,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌐 Saytga kirish', url: APP_URL }],
              [{ text: '📚 Testlar', url: `${APP_URL}/tests` }, { text: '💰 Tariflar', url: `${APP_URL}/pricing` }],
            ]
          }
        }
      );
    } else {
      await sendMessage(chatId,
        `❌ <b>Obuna topilmadi!</b>\n\n` +
        `Iltimos, avval <b>@EduPrimeuz</b> kanaliga obuna bo'ling, keyin qayta tekshiring.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 Kanalga obuna bo'lish", url: CHANNEL_LINK }],
              [{ text: "✅ Obuna bo'ldim — Tasdiqlash", callback_data: 'check_subscription' }],
            ]
          }
        }
      );
    }
    return;
  }

  // Payment selection
  if (data.startsWith('pay_')) {
    const parts = data.replace('pay_', '').split('_');
    const plan = parts[0]; // premium or teacher
    const durationKey = parts.slice(1).join(''); // 1month, 3months, 6months, 1year

    const durationMap: Record<string, string> = {
      '1month': '1_month',
      '3months': '3_months',
      '6months': '6_months',
      '1year': '1_year',
    };
    const duration = durationMap[durationKey] || '1_month';

    // Fetch dynamic prices and card info from admin settings
    const { prices, cardNumber, cardOwner } = await getSettings();
    const planPrices = plan === 'teacher' ? prices.teacher : prices.premium;
    const amount = planPrices[duration] || planPrices['1_month'];
    const planName = plan === 'premium' ? '💎 Premium' : '👨‍🏫 Ustoz';

    await db.systemSetting.upsert({
      where: { key: `pending_payment_${userId}` },
      update: {
        value: JSON.stringify({ userId, username, plan, duration, amount, timestamp: Date.now() }),
      },
      create: {
        key: `pending_payment_${userId}`,
        value: JSON.stringify({ userId, username, plan, duration, amount, timestamp: Date.now() }),
      },
    });

    await sendMessage(chatId,
      `📋 <b>To'lov ma'lumotlari:</b>\n\n` +
      `Tarif: ${planName}\n` +
      `Muddat: ${DURATION_LABELS[duration]}\n` +
      `Summa: <b>${amount.toLocaleString()} so'm</b>\n\n` +
      `💳 Karta raqami:\n` +
      `<code>${cardNumber}</code>\n` +
      `👤 Karta egasi: <b>${cardOwner}</b>\n\n` +
      `📎 To'lov qilganingizdan keyin <b>chek screenshot yoki PDF</b>ini shu yerga yuboring.\n\n` +
      `⏱ Chek yuborilgandan keyin 24 soat ichida admin tasdiqlaydi.`
    );
  }

  // Admin confirms payment
  if (data.startsWith('confirm_')) {
    const targetUserId = data.replace('confirm_', '');
    const paymentData = await db.systemSetting.findUnique({
      where: { key: `pending_payment_${targetUserId}` },
    });

    if (paymentData) {
      const payment = JSON.parse(paymentData.value);

      // Find the user by telegramId to get their DB userId
      const targetUser = await db.user.findFirst({
        where: { telegramId: targetUserId },
        select: { id: true },
      });

      if (targetUser) {
        // Map plan string to SubscriptionPlan enum
        const planEnum = payment.plan === 'premium' ? 'PREMIUM' : 'TEACHER_PLAN';

        // Map duration string to SubscriptionDuration enum
        const durationMap: Record<string, string> = {
          '1_month': 'ONE_MONTH',
          '3_months': 'THREE_MONTHS',
          '6_months': 'SIX_MONTHS',
          '1_year': 'ONE_YEAR',
        };
        const durationEnum = durationMap[payment.duration] || 'ONE_MONTH';

        // Calculate end date based on duration
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (payment.duration === '1_month') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (payment.duration === '3_months') {
          endDate.setMonth(endDate.getMonth() + 3);
        } else if (payment.duration === '6_months') {
          endDate.setMonth(endDate.getMonth() + 6);
        } else if (payment.duration === '1_year') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }

        // Create Payment record
        const paymentRecord = await db.payment.create({
          data: {
            userId: targetUser.id,
            plan: planEnum as any,
            duration: durationEnum as any,
            amount: payment.amount,
            status: 'CONFIRMED',
            confirmedAt: new Date(),
          },
        });

        // Create Subscription record
        await db.subscription.create({
          data: {
            userId: targetUser.id,
            plan: planEnum as any,
            duration: durationEnum as any,
            startDate,
            endDate,
            isActive: true,
            paymentId: paymentRecord.id,
          },
        });
      }

      await sendMessage(parseInt(targetUserId),
        `🎉 <b>Tabriklaymiz!</b>\n\n` +
        `Sizning ${payment.plan === 'premium' ? 'Premium' : 'Ustoz'} tarifingiz aktivlashtirildi!\n` +
        `Muddat: ${DURATION_LABELS[payment.duration]}\n\n` +
        `🌐 Saytga kiring va barcha testlardan foydalaning!`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '🌐 Saytga kirish', url: APP_URL }]]
          }
        }
      );

      await db.systemSetting.delete({ where: { key: `pending_payment_${targetUserId}` } });
      await sendMessage(chatId, `✅ @${payment.username} uchun tarif aktivlashtirildi.`);
    }
  }

  // Admin rejects payment
  if (data.startsWith('reject_')) {
    const targetUserId = data.replace('reject_', '');
    const paymentData = await db.systemSetting.findUnique({
      where: { key: `pending_payment_${targetUserId}` },
    });

    if (paymentData) {
      const payment = JSON.parse(paymentData.value);

      await sendMessage(parseInt(targetUserId),
        `❌ Sizning to'lovingiz rad etildi.\n\nSabab: Chek tasdiqlash imkoni bo'lmadi.\nIltimos, qayta to'lov qiling yoki admin bilan bog'laning.`
      );

      await db.systemSetting.delete({ where: { key: `pending_payment_${targetUserId}` } });
      await sendMessage(chatId, `❌ @${payment.username} to'lovi rad etildi.`);
    }
  }
}

// Handle photo (payment receipt — image)
async function handlePhoto(message: any) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const username = message.from.username || '';

  const paymentData = await db.systemSetting.findUnique({
    where: { key: `pending_payment_${userId}` },
  });

  if (!paymentData) {
    await sendMessage(chatId, 'ℹ️ Avval tarif tanlang:\n/premium yoki /ustoz');
    return;
  }

  const payment = JSON.parse(paymentData.value);
  const planName = payment.plan === 'premium' ? '💎 Premium' : '👨‍🏫 Ustoz';

  // Get photo file URL (largest size)
  const photos = message.photo;
  const largestPhoto = photos[photos.length - 1];
  const receiptPhotoUrl = await getFileUrl(largestPhoto.file_id);

  // Save receipt to Payment table in DB
  await saveReceiptToDB(userId, payment, receiptPhotoUrl);

  // Notify admins
  await notifyAdminsAboutReceipt(chatId, userId, username, planName, payment, message.message_id);

  await sendMessage(chatId,
    `✅ Chekingiz qabul qilindi!\n\nAdmin tekshirmoqda. 24 soat ichida natija bildiriladi.\nSabr qiling... ⏳`
  );
}

// Handle document (PDF receipt)
async function handleDocument(message: any) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const username = message.from.username || '';
  const doc = message.document;

  // Only accept PDF and image files
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (doc.mime_type && !allowedMimes.includes(doc.mime_type)) {
    await sendMessage(chatId, '⚠️ Faqat rasm (JPG, PNG) yoki PDF fayl yuboring.');
    return;
  }

  const paymentData = await db.systemSetting.findUnique({
    where: { key: `pending_payment_${userId}` },
  });

  if (!paymentData) {
    await sendMessage(chatId, 'ℹ️ Avval tarif tanlang:\n/premium yoki /ustoz');
    return;
  }

  const payment = JSON.parse(paymentData.value);
  const planName = payment.plan === 'premium' ? '💎 Premium' : '👨‍🏫 Ustoz';

  // Get document file URL
  const receiptFileUrl = await getFileUrl(doc.file_id);

  // Save receipt to Payment table in DB
  await saveReceiptToDB(userId, payment, receiptFileUrl);

  // Notify admins
  await notifyAdminsAboutReceipt(chatId, userId, username, planName, payment, message.message_id);

  await sendMessage(chatId,
    `✅ Chekingiz (${doc.file_name || 'fayl'}) qabul qilindi!\n\nAdmin tekshirmoqda. 24 soat ichida natija bildiriladi.\nSabr qiling... ⏳`
  );
}

// Save receipt file URL to Payment record in DB
async function saveReceiptToDB(userId: number, payment: any, receiptUrl: string | null) {
  try {
    const dbUser = await db.user.findFirst({ where: { telegramId: userId.toString() } });
    if (!dbUser) return;

    const planEnum = payment.plan === 'premium' ? 'PREMIUM' : 'TEACHER_PLAN';
    const durationMap: Record<string, string> = {
      '1_month': 'ONE_MONTH', '3_months': 'THREE_MONTHS',
      '6_months': 'SIX_MONTHS', '1_year': 'ONE_YEAR',
    };
    const durationEnum = durationMap[payment.duration] || 'ONE_MONTH';

    // Check if there's already a pending payment for this user
    const existingPayment = await db.payment.findFirst({
      where: { userId: dbUser.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPayment) {
      await db.payment.update({
        where: { id: existingPayment.id },
        data: { receiptPhoto: receiptUrl, amount: payment.amount },
      });
    } else {
      await db.payment.create({
        data: {
          userId: dbUser.id,
          plan: planEnum as any,
          duration: durationEnum as any,
          amount: payment.amount,
          status: 'PENDING',
          receiptPhoto: receiptUrl,
        },
      });
    }
  } catch (error) {
    console.error('Failed to save receipt to DB:', error);
  }
}

// Notify all admins about new receipt
async function notifyAdminsAboutReceipt(
  chatId: number, userId: number, username: string,
  planName: string, payment: any, messageId: number
) {
  for (const adminId of ADMIN_IDS) {
    try {
      await forwardMessage(parseInt(adminId), chatId, messageId);

      await sendMessage(parseInt(adminId),
        `📋 <b>Yangi to'lov cheki</b>\n\n` +
        `👤 Foydalanuvchi: @${username} (${userId})\n` +
        `📦 Tarif: ${planName}\n` +
        `⏱ Muddat: ${DURATION_LABELS[payment.duration]}\n` +
        `💰 Summa: ${payment.amount.toLocaleString()} so'm\n\n` +
        `Tasdiqlaysizmi?`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Tasdiqlash', callback_data: `confirm_${userId}` },
              { text: '❌ Rad etish', callback_data: `reject_${userId}` },
            ]]
          }
        }
      );
    } catch (error) {
      console.error(`Failed to notify admin ${adminId}:`, error);
    }
  }
}

// ===================== WEBHOOK HANDLER =====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.message?.text) {
      const msg = body.message;
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || '';
      const firstName = msg.from.first_name || '';
      const text = msg.text;

      // Admin commands are never blocked
      const isAdminCommand = text === '/admin' || text === '/users' || text.startsWith('/broadcast ');

      // Check subscription for non-admin users and non-admin commands
      if (!isAdminCommand && !isAdmin(userId)) {
        const isSubscribed = await checkChannelSubscription(userId);
        if (!isSubscribed) {
          await sendSubscriptionPrompt(chatId);
          return NextResponse.json({ ok: true });
        }
      }

      if (text.startsWith('/start')) {
        const param = text.replace('/start', '').trim();
        await handleStart(chatId, userId, username, firstName, param);
      } else if (text === '/login') {
        await handleLogin(chatId, userId, username, firstName);
      } else if (text === '/premium') {
        await handlePremium(chatId);
      } else if (text === '/ustoz') {
        await handleUstoz(chatId);
      } else if (text === '/help') {
        await handleHelp(chatId, userId);
      } else if (text === '/stats') {
        await sendMessage(chatId, `📊 <b>Statistikangiz</b>\n\nSaytda ko'rish uchun:`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Dashboard', url: `${APP_URL}/dashboard` }],
              [{ text: '🏆 Reyting', url: `${APP_URL}/rating` }],
            ]
          }
        });
      } else if (text === '/admin') {
        await handleAdmin(chatId, userId);
      } else if (text === '/users') {
        await handleUsers(chatId, userId);
      } else if (text.startsWith('/broadcast ')) {
        const broadcastMsg = text.replace('/broadcast ', '').trim();
        await handleBroadcast(chatId, userId, broadcastMsg);
      }
    }

    if (body.message?.photo) {
      const msg = body.message;
      const userId = msg.from.id;
      const chatId = msg.chat.id;

      // Check subscription before processing photos
      if (!isAdmin(userId)) {
        const isSubscribed = await checkChannelSubscription(userId);
        if (!isSubscribed) {
          await sendSubscriptionPrompt(chatId);
          return NextResponse.json({ ok: true });
        }
      }

      await handlePhoto(body.message);
    }

    // Handle document (PDF receipts)
    if (body.message?.document && !body.message?.photo) {
      const msg = body.message;
      const userId = msg.from.id;
      const chatId = msg.chat.id;

      if (!isAdmin(userId)) {
        const isSubscribed = await checkChannelSubscription(userId);
        if (!isSubscribed) {
          await sendSubscriptionPrompt(chatId);
          return NextResponse.json({ ok: true });
        }
      }

      await handleDocument(body.message);
    }

    if (body.callback_query) {
      await handleCallbackQuery(body.callback_query);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  const webhookUrl = `${APP_URL}/api/telegram/webhook`;

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
  );
  const data = await response.json();

  return NextResponse.json({
    message: 'Webhook setup',
    webhookUrl,
    telegramResponse: data,
  });
}
