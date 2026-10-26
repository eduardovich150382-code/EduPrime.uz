// Ajratilgan variantda to'liq rangli tugma, qolganlarida kontur — ko'z birinchi
// tavsiya etilgan variantga tushsin. Alohida modul: server kartasidagi mehmon
// havolasi ham shu uslubni oladi ('use client' faylidan konstanta kelmaydi).
export const BUY_BUTTON_STYLES = {
  solid: 'bg-primary-600 text-white hover:bg-primary-700',
  outline: 'border-2 border-primary-600 bg-white text-primary-700 hover:bg-primary-50',
} as const;

export type BuyButtonVariant = keyof typeof BUY_BUTTON_STYLES;
