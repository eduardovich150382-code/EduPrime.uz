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
interface PaymentRequest {
  userId: number;
  username: string;
  plan: 'premium' | 'teacher';
  duration: '1_month' | '6_months' | '1_year';
  amount: number;
  subjects?: string[];
  timestamp: number;
}

const pendingPayments = new Map<number, PaymentRequest>();

// ===================== PRICING =====================
const PRICES = {
  '1_month': 29000,
  '6_months': 150000,
  '1_year': 270000,
};

const DURATION_LABELS: Record<string, string> = {
  '1_month': '1 oy',
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
          [{ text: '6 oy — 150,000 so\'m (tejash 17%)', callback_data: 'pay_premium_6_months' }],
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
          [{ text: '1 oy — 29,000 so\'m', callback_data: 'pay_teacher_1_month' }],
          [{ text: '6 oy — 150,000 so\'m (tejash 17%)', callback_data: 'pay_teacher_6_months' }],
          [{ text: '1 yil — 270,000 so\'m (tejash 22%)', callback_data: 'pay_teacher_1_year' }],
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
      await bot.sendMessage(chatId,
        `🎉 *Tabriklaymiz!* Siz kanalga obuna bo'ldingiz.\n\n` +
        `Bot funksiyalaridan foydalanishingiz mumkin.\n\n` +
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
    const duration = parts.slice(1).join('_') as keyof typeof PRICES;
    const amount = PRICES[duration];

    // Save payment request
    pendingPayments.set(userId, {
      userId,
      username,
      plan,
      duration,
      amount,
      timestamp: Date.now(),
    });

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
    const payment = pendingPayments.get(targetUserId);

    if (payment) {
      // Notify user
      await bot.sendMessage(targetUserId,
        `🎉 *Tabriklaymiz!*\n\n` +
        `Sizning ${payment.plan === 'premium' ? 'Premium' : 'Ustoz'} tarifingiz aktivlashtirildi!\n` +
        `Muddat: ${DURATION_LABELS[payment.duration]}\n\n` +
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

      // TODO: Update database via API
      pendingPayments.delete(targetUserId);
      await bot.sendMessage(chatId, `✅ @${payment.username} uchun tarif aktivlashtirildi.`);
    }
  }

  // Admin rejects payment
  if (data.startsWith('reject_')) {
    const targetUserId = parseInt(data.replace('reject_', ''));
    const payment = pendingPayments.get(targetUserId);

    if (payment) {
      await bot.sendMessage(targetUserId,
        `❌ Sizning to'lovingiz rad etildi.\n\n` +
        `Sabab: Chek tasdiqlash imkoni bo'lmadi.\n` +
        `Iltimos, qayta to'lov qiling yoki admin bilan bog'laning.`
      );
      pendingPayments.delete(targetUserId);
      await bot.sendMessage(chatId, `❌ @${payment.username} to'lovi rad etildi.`);
    }
  }
});

// Photo handler — Receipt upload
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;
  const username = msg.from!.username || '';
  const payment = pendingPayments.get(userId);

  if (!payment) {
    await bot.sendMessage(chatId, 
      'ℹ️ Avval tarif tanlang:\n/premium yoki /ustoz'
    );
    return;
  }

  const planName = payment.plan === 'premium' ? '💎 Premium' : '👨‍🏫 Ustoz';

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
        `⏱ Muddat: ${DURATION_LABELS[payment.duration]}\n` +
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
