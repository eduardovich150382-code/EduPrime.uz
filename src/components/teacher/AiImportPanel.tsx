'use client';

import { useRef, useState } from 'react';
import { Bot, Loader2, Image, Paperclip } from 'lucide-react';
import type { AIImportedQuestion, AIImportResult } from '@/types';

interface AiImportPanelProps {
  /** AI muvaffaqiyatli savol qaytarganda chaqiriladi — natijani qayerga qo'yishni (Test qoralamasi yoki Savollar bazasi qoralamasi) chaqiruvchi hal qiladi. */
  onImported: (questions: AIImportedQuestion[]) => void;
  title?: string;
  subtitle?: string;
}

/**
 * Matn/rasm/fayl (PDF, DOCX, TXT) orqali AI (Gemini) yordamida savol import
 * qilish paneli — test yaratish va Savollar bazasi sahifalari o'rtasida
 * qayta ishlatiladi. `/api/ai/import` bitta umumiy endpointdan foydalanadi
 * (mavzu/Bloom/qiyinlik darajasini ham avtomatik qaytaradi).
 */
export default function AiImportPanel({
  onImported,
  title = 'AI bilan import qilish',
  subtitle = 'Test matnini kiriting — AI savollarni avtomatik ajratib beradi',
}: AiImportPanelProps) {
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFileLoading, setAiFileLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIImportResult | null>(null);
  const aiImageInputRef = useRef<HTMLInputElement | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement | null>(null);

  const runAiImport = async (payload: Record<string, unknown>) => {
    setAiResult(null);
    try {
      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: AIImportResult = await res.json();
      setAiResult(data);
      if (data.questions?.length > 0) onImported(data.questions);
    } catch {
      alert("AI xatolik. Qayta urinib ko'ring.");
    }
  };

  const handleAiImport = async () => {
    if (!aiText.trim()) {
      alert('Matn kiriting!');
      return;
    }
    setAiLoading(true);
    await runAiImport({ type: 'text', content: aiText });
    setAiLoading(false);
  };

  const handleAiImageImport = async (file: File) => {
    setAiLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
        reader.readAsDataURL(file);
      });
      await runAiImport({ type: 'image', content: base64, mimeType: file.type });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Rasmni yuklashda xatolik');
    }
    setAiLoading(false);
  };

  const handleAiFileImport = async (file: File) => {
    setAiFileLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload?endpoint=aiImportFile', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        alert(uploadData.error || 'Faylni yuklashda xatolik');
        setAiFileLoading(false);
        return;
      }
      setAiLoading(true);
      await runAiImport({ type: 'file', fileUrl: uploadData.url, fileName: file.name });
    } catch {
      alert('Faylni yuklashda xatolik');
    }
    setAiFileLoading(false);
    setAiLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <Bot size={32} className="text-primary-600 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        <p className="text-sm text-text-secondary">{subtitle}</p>
      </div>

      <textarea
        value={aiText}
        onChange={(e) => setAiText(e.target.value)}
        placeholder={`Test matnini shu yerga kiriting yoki paste qiling...\n\nMasalan:\n1. 2+2=?\nA) 3\nB) 4\nC) 5\nD) 6\nJavob: B\n\n2. Uchburchak ichki burchaklari yig'indisi?\nA) 90°\nB) 180°\nC) 270°\nD) 360°\nJavob: B`}
        rows={12}
        className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          💡 AI (Gemini Flash) bepul. Formulalarni LaTeX ga o&apos;giradi.
        </p>
        <button
          onClick={handleAiImport}
          disabled={aiLoading || !aiText.trim()}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
          {aiLoading ? 'Tahlil qilinmoqda...' : 'AI bilan import'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-secondary flex-shrink-0">yoki rasm/fayl yuklang</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          ref={aiImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAiImageImport(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => aiImageInputRef.current?.click()}
          disabled={aiLoading || aiFileLoading}
          className="btn-secondary flex items-center gap-2 !py-2.5 !px-4 text-sm disabled:opacity-50"
        >
          {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
          Rasmdan import (skan/skrinshot)
        </button>

        <input
          ref={aiFileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAiFileImport(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => aiFileInputRef.current?.click()}
          disabled={aiLoading || aiFileLoading}
          className="btn-secondary flex items-center gap-2 !py-2.5 !px-4 text-sm disabled:opacity-50"
        >
          {aiFileLoading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          Fayldan import (PDF, DOCX, TXT)
        </button>
      </div>

      {aiResult && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200">
          <p className="text-sm text-green-700 font-medium">
            ✅ {aiResult.totalFound || aiResult.questions?.length || 0} ta savol topildi va import qilindi!
          </p>
          {aiResult.warnings?.length > 0 && (
            <p className="text-xs text-yellow-700 mt-1">
              ⚠️ {aiResult.warnings.join(', ')}
            </p>
          )}
          <p className="text-xs text-green-600 mt-2">
            &quot;Savollar&quot; tabiga o&apos;tib tekshiring va tasdiqlang.
          </p>
        </div>
      )}
    </div>
  );
}
