import { db } from './db';
import { logger } from './logger';
import { ensureReferralCode } from './referral-code';
import { botReferralLink, miniAppUrl } from './telegram-bot-links';
import uzMessages from '@/messages/uz.json';
import ruMessages from '@/messages/ru.json';

// Botning "ilova" qismi: salomlashish, pastki menyu va undagi bo'limlar.
// Pastki (reply) klaviatura tugmalari ATAYLAB oddiy matn: Telegram ular
// orqali ochilgan Mini App'ga foydalanuvchi ma'lumotini (initData) bermaydi,
// demak avtomatik kirish ishlamasdi. Shuning uchun bot javob qaytaradi, sayt
// esa xabar ichidagi va menyu tugmasidagi web_app tugmalari bilan ochiladi.

const m = uzMessages.telegramBot;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

type InlineButton = { text: string; url?: string; web_app?: { url: string }; callback_data?: string };
type ReplyMarkup =
  | { inline_keyboard: InlineButton[][] }
  | { keyboard: { text: string }[][]; resize_keyboard: boolean; is_persistent: boolean; input_field_placeholder?: string };

export interface BotTransport {
  send(chatId: number | string, text: string, options?: { reply_markup?: ReplyMarkup; disable_web_page_preview?: boolean }): Promise<unknown>;
}

export type MenuAction = 'tests' | 'attestation' | 'results' | 'rating' | 'referral' | 'subscribe' | 'help';

const ACTION_BY_TEXT: Record<string, MenuAction> = {
  [m.buttons.tests]: 'tests',
  [m.buttons.attestation]: 'attestation',
  [m.buttons.results]: 'results',
  [m.buttons.rating]: 'rating',
  [m.buttons.referral]: 'referral',
  [m.buttons.subscribe]: 'subscribe',
  [m.buttons.help]: 'help',
  '/testlar': 'tests',
  '/attestatsiya': 'attestation',
  '/natijalar': 'results',
  '/stats': 'results',
  '/reyting': 'rating',
  '/taklif': 'referral',
  '/help': 'help',
  '/yordam': 'help',
};

/** Menyu tugmasi yoki buyruq matni — qaysi bo'lim. Boshqa matn — `null`. */
export function menuActionFor(text: string): MenuAction | null {
  // Guruhdagi "/natijalar@EduPrimeuzbot" ko'rinishi ham qabul qilinsin.
  const normalized = text.trim().replace(/@\w+$/, '');
  return ACTION_BY_TEXT[normalized] ?? null;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** `{nom}` o'rniga qiymat qo'yadi; qiymatlar HTML uchun xavfsizlantiriladi. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? escapeHtml(String(values[key])) : match));
}

// Belgi bo'yicha (UTF-16 birligi emas) qisqartirish — emoji yarmidan kesilsa
// Telegram butun xabarni rad etadi.
function truncate(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : value;
}

function webApp(text: string, path: string): InlineButton {
  return { text, web_app: { url: miniAppUrl(APP_URL, path) } };
}

export function mainKeyboard(): ReplyMarkup {
  const b = m.buttons;
  return {
    keyboard: [
      [{ text: b.tests }, { text: b.attestation }],
      [{ text: b.results }, { text: b.rating }],
      [{ text: b.referral }],
      [{ text: b.subscribe }, { text: b.help }],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: m.keyboardPlaceholder,
  };
}

export async function sendWelcome(
  chatId: number,
  user: { firstName: string; adminText?: string; referred?: boolean },
  transport: BotTransport,
) {
  const intro = user.referred ? `${m.referredWelcome}\n\n` : '';
  await transport.send(chatId, intro + fill(m.welcome, { name: user.firstName || m.friend }) + (user.adminText ?? ''), {
    reply_markup: {
      inline_keyboard: [
        [webApp(m.buttons.openPlatform, '/attestation')],
        [webApp(m.buttons.tests, '/tests'), webApp(m.buttons.pricing, '/pricing')],
      ],
    },
  });
  // Reply klaviatura alohida xabar bilan o'rnatiladi: bitta xabarda inline
  // va pastki klaviaturani birga yuborib bo'lmaydi.
  await transport.send(chatId, m.menuHint, { reply_markup: mainKeyboard() });
}

export async function handleMenuAction(
  action: MenuAction,
  ctx: { chatId: number; telegramId: number; username: string; firstName: string; adminText?: string },
  transport: BotTransport,
  onSubscribe: () => Promise<void>,
) {
  switch (action) {
    case 'tests':
      await transport.send(ctx.chatId, m.testsText, { reply_markup: { inline_keyboard: [[webApp(m.buttons.openTests, '/tests')]] } });
      return;
    case 'attestation':
      await transport.send(ctx.chatId, m.attestationText, {
        reply_markup: { inline_keyboard: [[webApp(m.buttons.openAttestation, '/attestation')], [webApp(m.buttons.pricing, '/pricing')]] },
      });
      return;
    case 'results':
      await sendResults(ctx.chatId, String(ctx.telegramId), transport);
      return;
    case 'rating':
      await sendRating(ctx.chatId, String(ctx.telegramId), transport);
      return;
    case 'referral':
      await sendReferral(ctx, transport);
      return;
    case 'subscribe':
      await onSubscribe();
      return;
    case 'help':
      await transport.send(ctx.chatId, m.helpText + (ctx.adminText ?? ''), {
        reply_markup: { inline_keyboard: [[webApp(m.buttons.openPlatform, '/attestation')]] },
      });
      return;
  }
}

// Sanani Toshkent vaqti bilan (UTC bilan emas) — kechki natija "ertaga" bo'lib qolmasin.
function shortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit' }).replace('/', '.');
}

function resultIcon(percentage: number): string {
  if (percentage >= 85) return '🟢';
  if (percentage >= 60) return '🟡';
  return '🔴';
}

async function sendResults(chatId: number, telegramId: string, transport: BotTransport) {
  const user = await db.user.findUnique({ where: { telegramId }, select: { id: true } });
  const [results, totals] = user
    ? await Promise.all([
        db.testResult.findMany({
          where: { userId: user.id },
          orderBy: { completedAt: 'desc' },
          take: 5,
          select: { id: true, score: true, maxScore: true, percentage: true, completedAt: true, test: { select: { titleUz: true } }, session: { select: { title: true } } },
        }),
        db.testResult.aggregate({ where: { userId: user.id }, _count: { id: true }, _avg: { percentage: true } }),
      ])
    : [[], null];

  if (results.length === 0 || !totals) {
    await transport.send(chatId, m.resultsEmpty, { reply_markup: { inline_keyboard: [[webApp(m.buttons.startFirstTest, '/attestation')]] } });
    return;
  }

  const lines = results.map((r) => fill(m.resultsLine, {
    icon: resultIcon(r.percentage),
    title: truncate(r.test?.titleUz ?? r.session?.title ?? m.practiceTitle, 60),
    score: r.score,
    max: r.maxScore,
    percent: Math.round(r.percentage),
    date: shortDate(r.completedAt),
  }));
  const header = fill(m.resultsHeader, { count: totals._count.id, avg: Math.round(totals._avg.percentage ?? 0) });
  await transport.send(chatId, `${header}\n${lines.join('\n')}`, {
    reply_markup: {
      inline_keyboard: [
        [webApp(m.buttons.latestResult, `/results/${results[0].id}`)],
        [webApp(m.buttons.allResults, '/dashboard')],
      ],
    },
  });
}

const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.'];

async function sendRating(chatId: number, telegramId: string, transport: BotTransport) {
  // Saytdagi /rating bilan bir xil mezon: jami to'plangan ball.
  const top = await db.testResult.groupBy({ by: ['userId'], _sum: { score: true }, orderBy: { _sum: { score: 'desc' } }, take: 5 });
  const markup: ReplyMarkup = { inline_keyboard: [[webApp(m.buttons.fullRating, '/rating')]] };
  if (top.length === 0) {
    await transport.send(chatId, `${m.ratingHeader}\n${m.ratingEmpty}`, { reply_markup: markup });
    return;
  }

  const users = await db.user.findMany({ where: { id: { in: top.map((row) => row.userId) } }, select: { id: true, name: true } });
  const names = new Map(users.map((u) => [u.id, u.name]));
  const lines = top.map((row, index) => fill(m.ratingLine, {
    medal: MEDALS[index],
    name: truncate(names.get(row.userId) || m.anonymous, 30),
    score: row._sum.score ?? 0,
  }));

  let you = m.ratingYouNone;
  const me = await db.user.findUnique({ where: { telegramId }, select: { id: true } });
  if (me) {
    const mine = await db.testResult.aggregate({ where: { userId: me.id }, _sum: { score: true } });
    const myScore = mine._sum.score ?? 0;
    if (myScore > 0) {
      const ahead = await db.testResult.groupBy({ by: ['userId'], _sum: { score: true }, having: { score: { _sum: { gt: myScore } } } });
      you = fill(m.ratingYou, { rank: ahead.length + 1, score: myScore });
    }
  }

  await transport.send(chatId, `${m.ratingHeader}\n${lines.join('\n')}\n${you}`, { reply_markup: markup });
}

async function sendReferral(ctx: { chatId: number; telegramId: number; username: string; firstName: string }, transport: BotTransport) {
  const telegramId = String(ctx.telegramId);
  let user = await db.user.findUnique({ where: { telegramId }, select: { id: true, name: true, referralCode: true } });
  if (!user) {
    user = await db.user.create({
      data: { telegramId, telegramUsername: ctx.username || undefined, name: ctx.firstName || ctx.username || 'Telegram User', role: 'USER' },
      select: { id: true, name: true, referralCode: true },
    });
  }
  const code = await ensureReferralCode(user);
  const count = await db.referral.count({ where: { referrerId: user.id } });
  const link = botReferralLink(code);
  const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(m.referralShareText)}`;
  await transport.send(ctx.chatId, fill(m.referralText, { link, count }), {
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[{ text: m.buttons.share, url: share }], [webApp(m.buttons.referralPage, '/dashboard/referral')]] },
  });
}

type CommandList = { command: string; description: string }[];

function commandList(messages: typeof uzMessages.telegramBot.commands): CommandList {
  return [
    { command: 'start', description: messages.start },
    { command: 'testlar', description: messages.tests },
    { command: 'natijalar', description: messages.results },
    { command: 'reyting', description: messages.rating },
    { command: 'taklif', description: messages.referral },
    { command: 'obuna', description: messages.subscribe },
    { command: 'login', description: messages.login },
    { command: 'help', description: messages.help },
  ];
}

/**
 * Botning doimiy ko'rinishi: chap pastdagi "Platformani ochish" menyu
 * tugmasi va buyruqlar ro'yxati. Takror chaqirish xavfsiz — Telegram
 * qiymatni shunchaki qayta yozadi. Webhook o'rnatilganda (GET) chaqiriladi.
 */
export async function setupBotMenu(botToken: string, appUrl: string): Promise<Record<string, unknown>> {
  const call = async (method: string, body: unknown) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      return await response.json();
    } catch (error) {
      logger.error(`Telegram ${method} error:`, { error });
      return { ok: false };
    }
  };
  return {
    menuButton: await call('setChatMenuButton', {
      menu_button: { type: 'web_app', text: m.menuButton, web_app: { url: miniAppUrl(appUrl, '/attestation') } },
    }),
    commands: await call('setMyCommands', { commands: commandList(uzMessages.telegramBot.commands) }),
    commandsRu: await call('setMyCommands', { commands: commandList(ruMessages.telegramBot.commands), language_code: 'ru' }),
    shortDescription: await call('setMyShortDescription', { short_description: m.shortDescription }),
    // Bo'sh chatda "Start" ustida ko'rinadigan matn — yangi foydalanuvchining birinchi taassuroti.
    description: await call('setMyDescription', { description: m.description }),
  };
}
