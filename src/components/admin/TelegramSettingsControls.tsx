'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';

// Admin → Sozlamalar → "Telegram kanal va kurs" guruhining maxsus boshqaruvlari.
// Sahifa fayli 400 satrdan oshmasligi uchun alohida (CLAUDE.md).

/** Boolean sozlama: bazada 'true'/'false' satri bo'lib saqlanadi. */
export function ToggleField({ checked, onChange, label }: { checked: boolean; onChange: (value: string) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(checked ? 'false' : 'true')}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
    >
      <span className="text-text-secondary">{checked ? 'Yoqilgan' : "O'chirilgan"}</span>
      <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

type CheckResult =
  | { ok: true; title: string; memberCount: number | null; isAdmin: boolean; canPost: boolean; canEdit: boolean }
  | { ok: false; error?: string };

/**
 * Forma ichidagi (hali saqlanmagan) kanalni tekshiradi: bot adminmi va post
 * huquqi bormi. Faqat ogohlantiradi — saqlash bundan qat'i nazar ishlaydi.
 */
export function ChannelCheckButton({ channel }: { channel: string }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const check = async () => {
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/settings/check-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      setResult((await res.json()) as CheckResult);
    } catch {
      setResult({ ok: false, error: "Server bilan aloqa o'rnatilmadi" });
    }
    setChecking(false);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={check}
        disabled={checking || !channel.trim()}
        className="btn-ghost min-h-11 w-full sm:w-auto flex items-center justify-center gap-2 border border-border rounded-xl py-2.5! text-sm disabled:opacity-50"
      >
        {checking ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
        Botni tekshirish
      </button>
      {result && <CheckMessage result={result} />}
    </div>
  );
}

function CheckMessage({ result }: { result: CheckResult }) {
  if (!result.ok) {
    return <Line tone="error" text={result.error || "Tekshirib bo'lmadi"} />;
  }
  if (!result.isAdmin) {
    return <Line tone="warn" text="Bot kanalda admin emas — obuna tekshiruvi ishlamaydi" />;
  }
  const members = result.memberCount === null ? '' : `, ${result.memberCount.toLocaleString('ru-RU')} obunachi`;
  return (
    <div className="space-y-1">
      <Line tone="ok" text={`Bot admin: ${result.title}${members}`} />
      {(!result.canPost || !result.canEdit) && (
        <Line tone="warn" text="Post yozish/tahrirlash huquqi yo'q — aksiya postlari chiqmaydi" />
      )}
    </div>
  );
}

function Line({ tone, text }: { tone: 'ok' | 'warn' | 'error'; text: string }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : XCircle;
  const color = tone === 'ok' ? 'text-green-700' : tone === 'warn' ? 'text-amber-700' : 'text-red-600';
  return (
    <p className={`flex items-start gap-1.5 text-xs wrap-break-word ${color}`}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <span className="min-w-0">{text}</span>
    </p>
  );
}
