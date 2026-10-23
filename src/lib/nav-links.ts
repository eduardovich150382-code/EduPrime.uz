// Header, BottomNav va /tests banneri shundan oladi — manzil bitta joyda.
export const ATTESTATION_HREF = '/attestation';

/** Locale'siz yo'l (`@/i18n/routing` dagi usePathname) attestatsiya bo'limidami. */
export function isAttestationPath(pathname: string): boolean {
  return pathname === ATTESTATION_HREF || pathname.startsWith(`${ATTESTATION_HREF}/`);
}
