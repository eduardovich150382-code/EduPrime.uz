import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').filter(Boolean);
const PAYMENT_CARD = process.env.PAYMENT_CARD_NUMBER || '9860 XXXX XXXX XXXX';
const PAYMENT_CARD_OWNER = 'Asrorov Xushbaxt';

const PRICES: Record<string, number> = {
  '1_month': 29000,
  '6_months': 150000,
  '1_year': 270000,
};

const DURATION_LABELS: Record<string, string> = {
  '1_month': '1 oy',
  '6_months': '6 oy',
  '1_year': '1 yil',
};

// Telegram API helper
async function sendMessage(chatId: number | string, text: string, options: any = {}) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...options,
    }),
  });
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

// Handle /start command
async function handleStart(chatId: number, userId: number, username: string, firstName: string, param: string) {
  if (param === 'login' || param === 'buy') {
    try {
      // Generate auth token
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

      const authUrl = `${APP_URL}/auth/telegram-callback?telegramId=${userId}&username=${username}&firstName=${encodeURIComponent(firstName)}&token=${token}`;

      await sendMessage(chatId,
        `Salom, ${firstName}! 👋\n\n` +
        `EduPrime.uz ga kirish uchun quyidagi tugmani bosing:`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '🌐 Saytga kirish', url: authUrl }
            ]]
          }
        }
      );
    } catch (error) {
      console.error('Start login error:', error);
      await sendMessage(chatId, '❌ Xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
    return;
  }

  // Default /start
  await sendMessage(chatId,
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
    `/help — Yordam`
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

  const authUrl = `${APP_URL}/auth/telegram-callback?telegramId=${userId}&username=${username}&firstName=${encodeURIComponent(firstName)}&token=${token}`;

  await sendMessage(chatId,
    `🔐 Kirish havolasi tayyor!\n\nQuyidagi tugmani bosib saytga kiring:`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🌐 EduPrime.uz ga kirish', url: authUrl }
        ]]
      }
    }
  );
}

// Handle /premium
async function handlePremium(chatId: number) {
  await sendMessage(chatId,
    `💎 *Premium tarif*\n\n` +
    `✅ DTM testlari — cheksiz\n` +
    `✅ Maktab testlari — cheksiz\n` +
    `✅ Milliy sertifikat testlari\n` +
    `✅ Video va yozma yechimlar\n` +
    `✅ Reklama yo'q\n\n` +
    `Muddatni tanlang:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '1 oy — 29,000 so\'m', callback_data: 'pay_premium_1month' }],
          [{ text: '6 oy — 150,000 so\'m (tejash 17%)', callback_data: 'pay_premium_6months' }],
          [{ text: '1 yil — 270,000 so\'m (tejash 22%)', callback_data: 'pay_premium_1year' }],
        ]
      }
    }
  );
}

// Handle /ustoz
async function handleUstoz(chatId: number) {
  await sendMessage(chatId,
    `👨‍🏫 *Ustoz tarif*\n\n` +
    `✅ Attestatsiya testlari (tanlangan fanlar)\n` +
    `✅ SAT testlari — cheksiz\n` +
    `✅ GRE Physics — cheksiz\n` +
    `✅ Milliy sertifikat testlari\n` +
    `✅ Video va yozma yechimlar\n\n` +
    `Muddatni tanlang:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '1 oy — 29,000 so\'m', callback_data: 'pay_teacher_1month' }],
          [{ text: '6 oy — 150,000 so\'m (tejash 17%)', callback_data: 'pay_teacher_6months' }],
          [{ text: '1 yil — 270,000 so\'m (tejash 22%)', callback_data: 'pay_teacher_1year' }],
        ]
      }
    }
  );
}

// Handle /help
async function handleHelp(chatId: number) {
  await sendMessage(chatId,
    `🤖 *EduPrime Bot — Yordam*\n\n` +
    `Buyruqlar:\n` +
    `/start — Botni boshlash\n` +
    `/login — Saytga kirish havolasi\n` +
    `/premium — Premium tarif sotib olish\n` +
    `/ustoz — Ustoz tarifi sotib olish\n` +
    `/stats — Statistikani ko'rish\n` +
    `/help — Shu yordam\n\n` +
    `❓ Savollar uchun: @eduprime_support`
  );
}

// Handle callback queries (payment buttons, admin confirm/reject)
async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const username = callbackQuery.from.username || '';
  const data = callbackQuery.data || '';

  await answerCallbackQuery(callbackQuery.id);

  // Payment selection
  if (data.startsWith('pay_')) {
    const parts = data.replace('pay_', '').split('_');
    const plan = parts[0]; // premium or teacher
    const durationKey = parts[1]; // 1month, 6months, 1year

    const durationMap: Record<string, string> = {
      '1month': '1_month',
      '6months': '6_months',
      '1year': '1_year',
    };
    const duration = durationMap[durationKey] || '1_month';
    const amount = PRICES[duration];
    const planName = plan === 'premium' ? '💎 Premium' : '👨‍🏫 Ustoz';

    // Save pending payment in DB
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
      `📋 *To'lov ma'lumotlari:*\n\n` +
      `Tarif: ${planName}\n` +
      `Muddat: ${DURATION_LABELS[duration]}\n` +
      `Summa: *${amount.toLocaleString()} so'm*\n\n` +
      `💳 Karta raqami:\n` +
      `\`${PAYMENT_CARD}\`\n` +
      `👤 Karta egasi: *${PAYMENT_CARD_OWNER}*\n\n` +
      `📎 To'lov qilganingizdan keyin *chek screenshot*ini shu yerga yuboring.\n\n` +
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

      // Notify user
      await sendMessage(parseInt(targetUserId),
        `🎉 *Tabriklaymiz!*\n\n` +
        `Sizning ${payment.plan === 'premium' ? 'Premium' : 'Ustoz'} tarifingiz aktivlashtirildi!\n` +
        `Muddat: ${DURATION_LABELS[payment.duration]}\n\n` +
        `🌐 Saytga kiring va barcha testlardan foydalaning!`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '🌐 Saytga kirish', url: APP_URL }
            ]]
          }
        }
      );

      // Clean up
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
        `❌ Sizning to'lovingiz rad etildi.\n\n` +
        `Sabab: Chek tasdiqlash imkoni bo'lmadi.\n` +
        `Iltimos, qayta to'lov qiling yoki admin bilan bog'laning.`
      );

      await db.systemSetting.delete({ where: { key: `pending_payment_${targetUserId}` } });
      await sendMessage(chatId, `❌ @${payment.username} to'lovi rad etildi.`);
    }
  }
}

// Handle photo (payment receipt)
async function handlePhoto(message: any) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const username = message.from.username || '';

  // Check if user has pending payment
  const paymentData = await db.systemSetting.findUnique({
    where: { key: `pending_payment_${userId}` },
  });

  if (!paymentData) {
    await sendMessage(chatId, 'ℹ️ Avval tarif tanlang:\n/premium yoki /ustoz');
    return;
  }

  const payment = JSON.parse(paymentData.value);
  const planName = payment.plan === 'premium' ? '💎 Premium' : '👨‍🏫 Ustoz';

  // Forward to admins
  for (const adminId of ADMIN_IDS) {
    try {
      await forwardMessage(parseInt(adminId), chatId, message.message_id);

      await sendMessage(parseInt(adminId),
        `📋 *Yangi to'lov cheki*\n\n` +
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

  await sendMessage(chatId,
    `✅ Chekingiz qabul qilindi!\n\n` +
    `Admin tekshirmoqda. 24 soat ichida natija bildiriladi.\n` +
    `Sabr qiling... ⏳`
  );
}

// ===================== WEBHOOK HANDLER =====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle text messages (commands)
    if (body.message?.text) {
      const msg = body.message;
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || '';
      const firstName = msg.from.first_name || '';
      const text = msg.text;

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
        await handleHelp(chatId);
      } else if (text === '/stats') {
        await sendMessage(chatId, `📊 *Statistikangiz*\n\nSaytda ko'rish uchun:`, {
          reply_markup: {
            inline_keyboard: [[{ text: '📊 Dashboard', url: `${APP_URL}/dashboard` }]]
          }
        });
      }
    }

    // Handle photos (payment receipts)
    if (body.message?.photo) {
      await handlePhoto(body.message);
    }

    // Handle callback queries
    if (body.callback_query) {
      await handleCallbackQuery(body.callback_query);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

// GET — for setting up webhook
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
