'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Crown, Lock, X } from 'lucide-react';

export interface QuotaUpsellItem {
  icon: ReactNode;
  text: string;
}

interface QuotaUpsellDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: ReactNode;
  items: QuotaUpsellItem[];
  primaryHref: string;
  primaryLabel: string;
  secondaryLabel: string;
  /** Standart holatda `onClose` bilan bir xil — faqat matn boshqacha bo'lgan joyларда (masalan "Ertaga yana N ta bepul") boshqa xatti-harakat kerak bo'lsa uzatiladi. */
  onSecondaryClick?: () => void;
}

/**
 * Kunlik bepul kvota tugaganda chiqadigan umumiy taklif oynasi — natijalar
 * sahifasidagi yechim kvotasi va /build'dagi konstruktor test kvotasi
 * ikkalasi ham shu komponentni ishlatadi (S17 uslubi davom ettirilgan, endi
 * bitta joyda). Devor emas, taklif: nimadan mahrum bo'layotgani, bugun nima
 * olingani, kunlik narx va bepul muqobil — hammasi bitta modal ichida. Rang
 * atayin qizil EMAS — bu qulf, nosozlik emas.
 */
export default function QuotaUpsellDialog({
  open,
  onClose,
  title,
  body,
  items,
  primaryHref,
  primaryLabel,
  secondaryLabel,
  onSecondaryClick,
}: QuotaUpsellDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Lock size={18} className="text-white" />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-11 min-w-11 flex items-center justify-center"
          >
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-4">{body}</p>

        {items.length > 0 && (
          <div className="space-y-2 mb-5 text-sm">
            {items.map((item, i) => (
              <p key={i} className="flex items-center gap-2 text-text-secondary">
                {item.icon}
                {item.text}
              </p>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onSecondaryClick ?? onClose} className="flex-1 btn-secondary !py-2.5 min-h-11">
            {secondaryLabel}
          </button>
          <Link
            href={primaryHref}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold min-h-11"
          >
            <Crown size={16} />
            {primaryLabel}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
