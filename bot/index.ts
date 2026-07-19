/**
 * EduPrime Telegram Bot (@EduPrimeuzbot)
 * 
 * Funksiyalar:
 * 1. Foydalanuvchi ro'yxatdan o'tish (auth token generatsiya)
 * 2. Tarif tanlash va to'lov cheki qabul qilish
 * 3. Admin tasdiqlash (to'lovlarni tekshirish)
 * 4. Bildirishnomalar yuborish
 */

import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').filter(Boolean);
const PAYMENT_CARD = process.env.PAYMENT_CARD_NUMBER || '9860 XXXX XXXX XXXX';
const PAYMENT_CARD_OWNER = 'Asrorov Xushbaxt';
const CHANNEL_USERNAME = '@EduPrimeuz';
const CHANNEL_LINK = 'https://t.me/EduPrimeuz';

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===================== SUBSCRIPTION CHECK =====================

async function checkChannelSubscription(userId: number): Promise<boolean> {
  try {
    const member = await bot.getChatMember(CHANNEL_USERNAME, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

async function sendSubscriptionPrompt(chatId: number): Promise<void> {
  await bot.sendMessage(chatId,
    `📢 *EduPrime.uz rasmiy kanaliga obuna bo'ling!*\n\n` +
    `Botdan foydalanish uchun avval rasmiy kanalimizga obuna bo'lishingiz kerak.\n\n` +
    `👇 Quyidagi tugmani bosib kanalga obuna bo'ling, so'ng "Obuna bo'ldim" tugmasini bosing:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Kanalga obuna bo\'lish', url: CHANNEL_LINK }],
          [{ text: '✅ Obuna bo\'ldim — Tasdiqlash', callback_data: 'check_subscription' }],
        ]
      }
    }
  );
}

// ===================== STATE =====================
// Payment state is now persisted via API — no more in-memory Map
// pendingPayments Map removed — using /api/telegram/payments instead

const API_HEADERS = {
  'Content-Type': 'application/json',
  'x-bot-secret': BOT_TOKEN,
};

// ===================== PRICING =====================
const PRICES: Record<string, Record<string, number>> = {
  premium: {
    '1_month': 29000,
    '3_months': 79000,
    '6_months': 150000,
    '1_year': 270000,
  },
  teacher: {
    '1_month': 49000,
    '3_months': 129000,
    '6_months': 240000,
    '1_year': 430000,
  },
};

const DURATION_LABELS: Record<string, string> = {
  '1_month': '1 oy',
  '3_months': '3 oy',
  '6_months': '6 oy',
  '1_year': '1 yil',
};

// ===================== COMMANDS =====================

// /start — Ro'yxatdan o'tish
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  const username = msg.from!.username || '';
  const firstName = msg.from!.first_name || '';
  const param = match?.[1]?.trim();

  // Check channel subscription first
  const isSubscribed = await checkChannelSubscription(userId);
  if (!isSubscribed) {
    await sendSubscriptionPrompt(chatId);
    return;
  }

  // Handle buy_test_TESTID — pullik test sotib olish
  if (param && param.startsWith('buy_test_')) {
    const testId = param.replace('buy_test_', '');
    try {
      // Fetch test info from API
      const response = await fetch(`${APP_URL}/api/tests/${testId}`, {
        headers: API_HEADERS,
      });
      const data = await response.json();

      if (data.test) {
        const test = data.test;
        const price = test.price || 0;

        // Create payment record via API
        await fetch(`${APP_URL}/api/telegram/payments`, {
          method: 'POST',
          headers: API_HEADERS,
          body: JSON.stringify({
            telegramId: userId,
            plan: 'premium', // Using premium as placeholder for individual test
            duration: '1_month',
            amount: price,
            testId: testId, // Store test ID for individual purchase
          }),
        });

        await bot.sendMessage(chatId,
          `🛒 *Test sotib olish*\n\n` +
          `📝 Test: *${test.titleUz}*\n` +
          `💰 Narx: *${price.toLocaleString()} so'm*\n\n` +
          `💳 Karta raqami:\n` +
          `\`${PAYMENT_CARD}\`\n` +
          `👤 Karta egasi: *${PAYMENT_CARD_OWNER}*\n\n` +
          `📎 To'lov qilganingizdan keyin *chek screenshot*ini shu yerga yuboring.\n\n` +
          `⏱ Admin 24 soat ichida tasdiqlaydi va test sizga ochiladi.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await bot.sendMessage(chatId, '❌ Test topilmadi. Iltimos, qayta urinib ko\'ring.');
      }
    } catch (error) {
      await bot.sendMessage(chatId, '❌ Xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
    return;
  }

  if (param === 'login') {
    // Generate auth token and send login link
    try {
      const response = await fetch(`${APP_URL}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: userId.toString(),
          username,
          firstName,
          botSecret: BOT_TOKEN,
        }),
      });

      const data = await response.json();

      if (data.authUrl) {
        await bot.sendMessage(chatId, 
          `Salom, ${firstName}! 👋\n\n` +
          `EduPrime.uz ga kirish uchun quyidagi havolani bosing:\n\n` +
          `🔗 Kirish: ${data.authUrl}\n\n` +
          `⏱ Havola 5 daqiqa amal qiladi.`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '🌐 Saytga kirish', url: data.authUrl }
              ]]
            }
          }
        );
      }
    } catch (error) {
      await bot.sendMessage(chatId, '❌ Xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
    return;
  }

  // Default /start message
  await bot.sendMessage(chatId,
    `🎓 *EduPrime.uz* — Test Platformasi\n\n` +
    `Salom, ${firstName}! Xush kelibsiz!\n\n` +
    `📚 Bu bot orqali:\n` +
    `• Saytga kirish (ro'yxatdan o'tish)\n` +
    `• Premium/Ustoz tarif sotib olish\n` +
    `• Yangiliklar olish\n\n` +
    `Buyruqlar:\n` +
    `/login — Saytga kirish\n` +
    `/premium — Premium sotib olish\n` +
    `/ustoz — Ustoz tarifi sotib olish\n` +
    `/stats — Mening statistikam\n` +
    `/help — Yordam`,
    { parse_mode: 'Markdown' }
  );
});

// /login — Saytga kirish
bot.onText(/\/login/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  const username = msg.from!.username || '';
  const firstName = msg.from!.first_name || '';

  // Check channel subscription first
  const isSubscribed = await checkChannelSubscription(userId);
  if (!isSubscribed) {
    await sendSubscriptionPrompt(chatId);
    return;
  }

  try {
    const response = await fetch(`${APP_URL}/api/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: userId.toString(),
        username,
        firstName,
        botSecret: BOT_TOKEN,
      }),
    });

    const data = await response.json();

    if (data.authUrl) {
      await bot.sendMessage(chatId,
        `🔐 Kirish havolasi tayyor!\n\n` +
        `Quyidagi tugmani bosib saytga kiring:`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '🌐 EduPrime.uz ga kirish', url: data.authUrl }
            ]]
          }
        }
      );
    }
  } catch {
    await bot.sendMessage(chatId, '❌ Xatolik. Qayta urinib ko\'ring.');
  }
});

// /premium — Premium tarif
bot.onText(/\/premium/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  // Check channel subscription first
  const isSubscribed = await checkChannelSubscription(userId);
  if (!isSubscribed) {
    await sendSubscriptionPrompt(chatId);
    return;
  }

  await bot.sendMessage(chatId,
    `💎 *Premium tarif*\n\n` +
    `✅ DTM testlari — cheksiz\n` +
    `✅ Maktab testlari — cheksiz\n` +
    `✅ Milliy sertifikat testlari\n` +
    `✅ Video va yozma yechimlar\n` +
    `✅ Reklama yo'q\n\n` +
    `Muddatni tanlang:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '1 oy — 29,000 so\'m', callback_data: 'pay_premium_1_month' }],
          [{ text: '3 oy — 79,000 so\'m (tejash 9%)', callback_data: 'pay_premium_3_months' }],
          [{ text: '6 oy — 150,000 so\'m (tejash 14%)', callback_data: 'pay_premium_6_months' }],
          [{ text: '1 yil — 270,000 so\'m (tejash 22%)', callback_data: 'pay_premium_1_year' }],
        ]
      }
    }
  );
});

// /ustoz — Ustoz tarif
bot.onText(/\/ustoz/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  // Check channel subscription first
  const isSubscribed = await checkChannelSubscription(userId);
  if (!isSubscribed) {
    await sendSubscriptionPrompt(chatId);
    return;
  }

  await bot.sendMessage(chatId,
    `👨‍🏫 *Ustoz tarif*\n\n` +
    `✅ Attestatsiya testlari (tanlangan fanlar)\n` +
    `✅ SAT testlari — cheksiz\n` +
    `✅ GRE Physics — cheksiz\n` +
    `✅ Milliy sertifikat testlari\n` +
    `✅ Video va yozma yechimlar\n\n` +
    `Muddatni tanlang:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '1 oy — 49,000 so\'m', callback_data: 'pay_teacher_1_month' }],
          [{ text: '3 oy — 129,000 so\'m (tejash 12%)', callback_data: 'pay_teacher_3_months' }],
          [{ text: '6 oy — 240,000 so\'m (tejash 18%)', callback_data: 'pay_teacher_6_months' }],
          [{ text: '1 yil — 430,000 so\'m (tejash 27%)', callback_data: 'pay_teacher_1_year' }],
        ]
      }
    }
  );
});

// Callback query handler — Payment selection
bot.on('callback_query', async (query) => {
  const chatId = query.message!.chat.id;
  const userId = query.from.id;
  const username = query.from.username || '';
  const data = query.data || '';

  await bot.answerCallbackQuery(query.id);

  // Handle subscription check
  if (data === 'check_subscription') {
    const isSubscribed = await checkChannelSubscription(query.from.id);
    if (isSubscribed) {
      const firstName = query.from.first_name || '';
      await bot.sendMessage(chatId,
        `🎉 *Tabriklaymiz!* Siz kanalga obuna bo'ldingiz.\n\n` +
        `Bot funksiyalaridan foydalanishingiz mumkin.`,
        { parse_mode: 'Markdown' }
      );

      // Send the normal /start welcome message
      await bot.sendMessage(chatId,
        `🎓 *EduPrime.uz* — Test Platformasi\n\n` +
        `Salom, ${firstName}! Xush kelibsiz!\n\n` +
        `📚 Bu bot orqali:\n` +
        `• Saytga kirish (ro'yxatdan o'tish)\n` +
        `• Premium/Ustoz tarif sotib olish\n` +
        `• Yangiliklar olish\n\n` +
        `Buyruqlar:\n` +
        `/login — Saytga kirish\n` +
        `/premium — Premium sotib olish\n` +
        `/ustoz — Ustoz tarifi sotib olish\n` +
        `/stats — Mening statistikam\n` +
        `/help — Yordam`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await bot.sendMessage(chatId,
        `❌ Siz hali kanalga obuna bo'magansiz.\n\n` +
        `Iltimos, avval kanalga obuna bo'ling!`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📢 Kanalga obuna bo\'lish', url: CHANNEL_LINK }],
              [{ text: '✅ Obuna bo\'ldim — Tasdiqlash', callback_data: 'check_subscription' }],
            ]
          }
        }
      );
    }
    return;
  }

  if (data.startsWith('pay_')) {
    const parts = data.replace('pay_', '').split('_');
    const plan = parts[0] as 'premium' | 'teacher';
    const duration = parts.slice(1).join('_');
    const planPrices = PRICES[plan] || PRICES['premium'];
    const amount = planPrices[duration] || planPrices['1_month'];

    // Save payment request to database via API
    try {
      await fetch(`${APP_URL}/api/telegram/payments`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          telegramId: userId,
          plan,
          duration,
          amount,
        }),
      });
    } catch (error) {
      console.error('Failed to save payment to DB:', error);
    }

    const planName = plan === 'premium' ? '💎 Premium' : '👨‍🏫 Ustoz';

    await bot.sendMessage(chatId,
      `📋 *To'lov ma'lumotlari:*\n\n` +
      `Tarif: ${planName}\n` +
      `Muddat: ${DURATION_LABELS[duration]}\n` +
      `Summa: *${amount.toLocaleString()} so'm*\n\n` +
      `💳 Karta raqami:\n` +
      `\`${PAYMENT_CARD}\`\n` +
      `👤 Karta egasi: *${PAYMENT_CARD_OWNER}*\n\n` +
      `📎 To'lov qilganingizdan keyin *chek screenshot*ini shu yerga yuboring.\n\n` +
      `⏱ Chek yuborilgandan keyin 24 soat ichida admin tasdiqlaydi.`,
      { parse_mode: 'Markdown' }
    );
  }

  // Admin confirms payment
  if (data.startsWith('confirm_')) {
    const targetUserId = parseInt(data.replace('confirm_', ''));

    try {
      const res = await fetch(`${APP_URL}/api/telegram/payments`, {
        method: 'PATCH',
        headers: API_HEADERS,
        body: JSON.stringify({
          telegramId: targetUserId,
          action: 'confirm',
          adminTelegramId: userId,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        // Notify user
        await bot.sendMessage(targetUserId,
          `🎉 *Tabriklaymiz!*\n\n` +
          `Sizning tarifingiz aktivlashtirildi!\n\n` +
          `🌐 Saytga kiring va barcha testlardan foydalaning!`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '🌐 Saytga kirish', url: APP_URL }
              ]]
            }
          }
        );
        await bot.sendMessage(chatId, `✅ Foydalanuvchi uchun tarif aktivlashtirildi.`);
      } else {
        await bot.sendMessage(chatId, `❌ Xatolik: ${result.error || 'Noma\'lum xatolik'}`);
      }
    } catch (error) {
      console.error('Confirm payment error:', error);
      await bot.sendMessage(chatId, '❌ Server xatolik. Qayta urinib ko\'ring.');
    }
  }

  // Admin rejects payment
  if (data.startsWith('reject_')) {
    const targetUserId = parseInt(data.replace('reject_', ''));

    try {
      const res = await fetch(`${APP_URL}/api/telegram/payments`, {
        method: 'PATCH',
        headers: API_HEADERS,
        body: JSON.stringify({
          telegramId: targetUserId,
          action: 'reject',
          adminTelegramId: userId,
        }),
      });

      if (res.ok) {
        await bot.sendMessage(targetUserId,
          `❌ Sizning to'lovingiz rad etildi.\n\n` +
          `Sabab: Chek tasdiqlash imkoni bo'lmadi.\n` +
          `Iltimos, qayta to'lov qiling yoki admin bilan bog'laning.`
        );
        await bot.sendMessage(chatId, `❌ To'lov rad etildi.`);
      } else {
        const result = await res.json();
        await bot.sendMessage(chatId, `❌ Xatolik: ${result.error || 'Noma\'lum xatolik'}`);
      }
    } catch (error) {
      console.error('Reject payment error:', error);
      await bot.sendMessage(chatId, '❌ Server xatolik. Qayta urinib ko\'ring.');
    }
  }
});

// Photo handler — Receipt upload
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  const username = msg.from!.username || '';

  // Check channel subscription first
  const isSubscribed = await checkChannelSubscription(userId);
  if (!isSubscribed) {
    await sendSubscriptionPrompt(chatId);
    return;
  }

  // Check if user has a pending payment via API
  let payment: any = null;
  try {
    const res = await fetch(`${APP_URL}/api/telegram/payments?telegramId=${userId}`, {
      headers: API_HEADERS,
    });
    const data = await res.json();
    payment = data.payment;
  } catch (error) {
    console.error('Failed to check pending payment:', error);
  }

  if (!payment) {
    await bot.sendMessage(chatId, 
      'ℹ️ Avval tarif tanlang:\n/premium yoki /ustoz'
    );
    return;
  }

  const planName = payment.plan === 'PREMIUM' ? '💎 Premium' : '👨‍🏫 Ustoz';
  const durationLabel = DURATION_LABELS[
    payment.duration === 'ONE_MONTH' ? '1_month' :
    payment.duration === 'THREE_MONTHS' ? '3_months' :
    payment.duration === 'SIX_MONTHS' ? '6_months' : '1_year'
  ];

  // Forward to admins
  for (const adminId of ADMIN_IDS) {
    try {
      // Forward the photo
      await bot.forwardMessage(parseInt(adminId), chatId, msg.message_id);

      // Send confirmation buttons
      await bot.sendMessage(parseInt(adminId),
        `📋 *Yangi to'lov cheki*\n\n` +
        `👤 Foydalanuvchi: @${username} (${userId})\n` +
        `📦 Tarif: ${planName}\n` +
        `⏱ Muddat: ${durationLabel}\n` +
        `💰 Summa: ${payment.amount.toLocaleString()} so'm\n\n` +
        `Tasdiqlaysizmi?`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Tasdiqlash', callback_data: `confirm_${userId}` },
                { text: '❌ Rad etish', callback_data: `reject_${userId}` },
              ]
            ]
          }
        }
      );
    } catch (error) {
      console.error(`Failed to notify admin ${adminId}:`, error);
    }
  }

  await bot.sendMessage(chatId,
    `✅ Chekingiz qabul qilindi!\n\n` +
    `Admin tekshirmoqda. 24 soat ichida natija bildiriladi.\n` +
    `Sabr qiling... ⏳`
  );
});

// /stats — User stats
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  // Check channel subscription first
  const isSubscribed = await checkChannelSubscription(userId);
  if (!isSubscribed) {
    await sendSubscriptionPrompt(chatId);
    return;
  }

  await bot.sendMessage(chatId,
    `📊 *Sizning statistikangiz*\n\n` +
    `Saytda ko'rish uchun:\n`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '📊 Statistika', url: `${APP_URL}/dashboard` }
        ]]
      }
    }
  );
});

// /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  // Check channel subscription first
  const isSubscribed = await checkChannelSubscription(userId);
  if (!isSubscribed) {
    await sendSubscriptionPrompt(chatId);
    return;
  }

  await bot.sendMessage(chatId,
    `🤖 *EduPrime Bot — Yordam*\n\n` +
    `Buyruqlar:\n` +
    `/start — Botni boshlash\n` +
    `/login — Saytga kirish havolasi\n` +
    `/premium — Premium tarif sotib olish\n` +
    `/ustoz — Ustoz tarifi sotib olish\n` +
    `/stats — Statistikani ko'rish\n` +
    `/help — Shu yordam\n\n` +
    `❓ Savollar uchun: @EduPrimeuz_Admin`,
    { parse_mode: 'Markdown' }
  );
});

// Admin broadcast command
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id.toString();

  if (!ADMIN_IDS.includes(userId)) {
    await bot.sendMessage(chatId, '❌ Bu buyruq faqat adminlar uchun.');
    return;
  }

  const message = match?.[1] || '';
  // In production, get all users from database and send broadcast
  await bot.sendMessage(chatId, `📢 Xabar yuborildi: "${message}"\n(production'da barcha foydalanuvchilarga yuboriladi)`);
});

console.log('🤖 EduPrime Bot ishga tushdi! (@EduPrimeuzbot)');

export default bot;
