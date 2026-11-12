import { randomBytes } from 'crypto';

// Shaxsiy taklif kodi: t.me/EduPrimeuzbot?start=c_<kod>. 62^8 ≈ 2·10^14 —
// taxmin qilib boshqaning havolasini topib bo'lmaydi. `Math.random` emas,
// kriptografik manba: kod ishtirokchining ballariga kalit.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 8;
// 256 ni 62 ga bo'lganda qoldiq qoladi: 248 dan katta baytlar tashlanadi,
// aks holda dastlabki harflar boshqalaridan tez-tez chiqardi.
const UNBIASED_LIMIT = 256 - (256 % ALPHABET.length);

export function generateRefCode(): string {
  let code = '';
  while (code.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH * 2)) {
      if (byte >= UNBIASED_LIMIT) continue;
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }
  return code;
}

const START_PATTERN = /^c_([A-Za-z0-9]{8})$/;

/** `/start c_<kod>` parametri → kod; boshqa parametr — `null`. */
export function parseCampaignStart(param: string): string | null {
  return START_PATTERN.exec(param)?.[1] ?? null;
}

export function campaignStartParameter(code: string): string {
  return `c_${code}`;
}

/** `/start aksiya` (kanal posti tugmasi) va `/aksiya` — qatnashish oqimi. Gate'dan keyin ham shu parametr saqlanadi. */
export const CAMPAIGN_JOIN_PARAM = 'aksiya';
