// Statik (ISR) sahifa kim ochganini bilmaydi, sessiya esa /api/auth/session
// javobidan keyin ma'lum bo'ladi. Shu oraliqda kirgan foydalanuvchiga mehmon
// CTA'si miltillamasligi uchun shu qurilmada oxirgi marta kirilgani
// localStorage'da belgilanadi. Bu faqat ko'rinish uchun ishora: ruxsat va
// ma'lumot doim sessiya bo'yicha, server tomonda tekshiriladi.

export const AUTH_HINT_KEY = 'ep_authed';

/** `(public)/layout.tsx` dagi o'rama — CSS `globals.css` da shu atributlar bo'yicha. */
export const AUTH_SCOPE_ATTR = 'data-auth-scope';
export const AUTHED_ATTR = 'data-authed';

// Paint'dan oldin, o'rama ichidagi birinchi element sifatida bajariladi.
// CSP: hozir loyihada Content-Security-Policy yo'q. Kelajakda qo'shilsa,
// bu skript uchun hash ('sha256-…') yoki nonce kerak — matn statik, hash
// o'zgarmaydi.
export const AUTH_HINT_SCRIPT =
  `try{if(localStorage.getItem('${AUTH_HINT_KEY}')==='1')document.currentScript.parentElement.setAttribute('${AUTHED_ATTR}','')}catch(e){}`;

export function readAuthHint(): boolean {
  try {
    return localStorage.getItem(AUTH_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeAuthHint(authed: boolean): void {
  try {
    if (authed) localStorage.setItem(AUTH_HINT_KEY, '1');
    else localStorage.removeItem(AUTH_HINT_KEY);
  } catch { /* Storage yopiq — ishora shunchaki ishlamaydi, sahifa mehmon ko'rinishida. */ }
}
