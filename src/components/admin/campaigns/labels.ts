import type { CampaignPhase } from '@/lib/campaign/phase';
import type { CampaignTextKey, CampaignVariable } from '@/lib/campaign/texts';

// Aksiya admin panelining o'zbekcha yorliqlari. Admin UI matnlari qattiq
// yoziladi (Sozlamalar sahifasi kabi) — `messages` ga faqat menyu kaliti.

export const PHASE_LABELS: Record<CampaignPhase, { label: string; className: string }> = {
  DRAFT: { label: 'Qoralama', className: 'bg-amber-100 text-amber-800' },
  UPCOMING: { label: 'Boshlanmagan', className: 'bg-blue-100 text-blue-800' },
  ACTIVE: { label: 'Faol', className: 'bg-green-100 text-green-800' },
  PAUSED: { label: 'Pauzada', className: 'bg-gray-200 text-gray-800' },
  FINISHING: { label: 'Tugadi — yakunlanmagan', className: 'bg-orange-100 text-orange-800' },
  FINISHED: { label: 'Yakunlandi', className: 'bg-gray-100 text-gray-600' },
};

export const TEXT_LABELS: Record<CampaignTextKey, { name: string; when: string }> = {
  join_welcome: { name: 'Qatnashish xabari', when: "Ishtirokchi aksiyaga qo'shilganda (shaxsiy havola bilan)" },
  share_post: { name: 'Ulashiladigan post', when: "Qatnashish xabaridan keyin; ishtirokchi uni forward qiladi (A4 da rasmli post bo'lsa, o'sha chiqadi)" },
  rules: { name: 'Qoidalar', when: '"📋 Qoidalar" tugmasi' },
  already_member: { name: 'Allaqachon obunachi', when: "Kanalga a'zo odam taklif havolasini bosganda" },
  referral_prompt: { name: 'Taklif qilinganga xabar', when: "Obuna bo'lmagan odam taklif havolasini bosganda" },
  not_subscribed_alert: { name: `"Obuna bo'lmagansiz" ogohlantirishi`, when: `"Obuna bo'ldim" bosilgan, lekin obuna yo'q (≤ 200 belgi, HTML'siz)` },
  invite_new: { name: 'Yangi obunachiga taklif', when: 'Obuna tasdiqlangach' },
  point_added: { name: '+1 ball', when: 'Har yangi referalda ishtirokchiga' },
  my_result: { name: 'Mening natijam', when: '"📊 Mening natijam" tugmasi' },
  daily_result: { name: 'Kunlik natija', when: 'Har kuni ~20:00 da' },
  last_day: { name: 'Oxirgi kun eslatmasi', when: "Tugashga 24 soatdan kam qolganda (kunlik xabar o'rniga)" },
  not_active: { name: 'Aksiya faol emas', when: "Aksiya yo'q yoki tugagan" },
  winner: { name: "G'olib xabari", when: 'Yakunlashda, promokod bilan (A5)' },
  no_prize: { name: 'Mukofotsiz ishtirokchi', when: 'Yakunlashda (A5)' },
};

export const VARIABLE_HINTS: Record<CampaignVariable, string> = {
  ism: 'ishtirokchining ismi',
  havola: 'shaxsiy taklif havolasi',
  ball: "to'plangan ball (faol referallar)",
  orin: "reytingdagi o'rni",
  foiz: 'hozirgi chegirma',
  keyingi_pogona: 'keyingi chegirma foizi',
  qolgan: 'keyingi chegirmagacha kerakli odam soni',
  promokod: "g'olib promokodi (A5)",
  muddat: 'promokod amal qilish muddati',
  tugash_vaqti: 'aksiya tugash vaqti',
  kanal: 'aksiya kanali',
  kurs_nomi: 'kurs nomi (Sozlamalar)',
  kurs_narxi: "kurs narxi (yashirin bo'lsa qator o'chadi)",
  chegirmali_narx: 'chegirmadan keyingi narx',
  kurs_admin: "kurs bo'yicha admin",
  kurs_havola: 'kurs haqida havola',
  top10: "reytingning birinchi o'ntaligi",
};

/** "15-noyabr, 00:00" — Toshkent vaqtida, brauzer zonasidan qat'i nazar. */
export function formatLocal(local: string): string {
  const [date, time] = local.split('T');
  const [, month, day] = date.split('-').map(Number);
  const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  return `${day}-${months[month - 1]}, ${time}`;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; data: Record<string, unknown> };

/** Admin aksiya API'si: xato javobning qo'shimcha maydonlari (textErrors, problems) ham qaytadi. */
export async function campaignApi<T>(url: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const data: unknown = await res.json().catch(() => ({}));
    const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    if (res.ok) return { ok: true, data: record as T };
    return { ok: false, status: res.status, error: typeof record.error === 'string' ? record.error : 'Server xatosi', data: record };
  } catch {
    return { ok: false, status: 0, error: "Server bilan aloqa o'rnatilmadi", data: {} };
  }
}
