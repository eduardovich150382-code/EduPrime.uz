'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { PauseCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import SecureYouTubePlayer, { type SecureYouTubePlayerHandle } from '@/components/ui/SecureYouTubePlayer';
import QuestionDisplay from '@/components/test/QuestionDisplay';
import LatexRenderer from '@/components/ui/LatexRenderer';
import type { Checkpoint } from '@/lib/video-checkpoints';

interface CheckpointQuestion {
  id: string;
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[] | { left: string[]; right: string[] };
  type: string;
}

interface CheckResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  explanationImages: string[];
  distractorWhy: string | null;
}

export interface CheckpointSource {
  kind: 'lesson' | 'block';
  id: string;
}

interface Props {
  videoUrl: string;
  title?: string;
  startPositionSeconds?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  checkpointSource: CheckpointSource;
  /** GET /api/courses/[id]/learn'dan — 0 bo'lsa sessiya umuman so'ralmaydi. */
  checkpointCount: number;
}

// Onprogress ~5000ms oraliqda chaqiriladi (SecureYouTubePlayer,
// progressReportRef) — bu qadam kattaligining tabiiy o'lchovi. Undan
// sezilarli katta sakrash (foydalanuvchi qo'lda +10/+30/+60 tugmasi yoki
// progress panelida oldinga surgani) — video-checkpoints spec talabi:
// "oldinga surib nuqtani o'tkazib yuborish mumkin bo'lsin". Aniq chegara
// yo'q (SecureYouTubePlayer'ning o'zi buni bermaydi — "pleyerga qarshi
// kurashmang"), shu sababli taxminiy, ammo ishlaydigan qiymat.
const SEEK_JUMP_THRESHOLD_SECONDS = 8;
// Orqaga sakrash chegarasi — kichik onProgress noaniqligidan (0.n soniya)
// noto'g'ri "orqaga surildi" deb hisoblanmasin.
const REWIND_THRESHOLD_SECONDS = 1.5;

/**
 * SecureYouTubePlayer'ni video nazorat nuqtalari (S23) bilan o'raydi.
 * SecureYouTubePlayer'ning ICHKI mantig'iga tegilmagan — faqat mavjud
 * `onProgress` (vaqtni kuzatish) va yangi qo'shilgan `pause`/`play` imperativ
 * metodlari orqali boshqariladi.
 *
 * Savol video KADRINING USTIGA emas, shu komponentning o'z konteyneriga
 * (video ostiga) chiqadi — mobilda YouTube pleyeri to'liq ekranga o'tsa,
 * uning ustiga hech narsa chiqarib bo'lmaydi (boshqa iframe konteksti).
 * Shu sababli checkpoint kelganda, agar brauzer to'liq ekran rejimida
 * bo'lsa, undan chiqiladi (video o'z joyiga, oddiy inline holatga qaytadi)
 * va savol konteyneri ko'rinish maydoniga suriladi.
 */
export default function VideoWithCheckpoints({
  videoUrl, title, startPositionSeconds, onProgress, onEnded, checkpointSource, checkpointCount,
}: Props) {
  const t = useTranslations('courseLearn');
  const playerRef = useRef<SecureYouTubePlayerHandle>(null);
  const questionRef = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<{
    sessionId: string;
    checkpoints: Checkpoint[];
    questions: Map<string, CheckpointQuestion>;
  } | null>(null);

  const [queue, setQueue] = useState<Checkpoint[]>([]);
  const [active, setActive] = useState<Checkpoint | null>(null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [checked, setChecked] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastTimeRef = useRef(startPositionSeconds || 0);
  const firedRef = useRef<Set<number>>(new Set());

  // SecureYouTubePlayer'ning progress-interval'i faqat MOUNT paytida (o'zining
  // `[videoId]` effekti orqali) bir marta o'rnatiladi — keyingi render'larda
  // yangi `onProgress` funksiya havolasi berilsa ham, interval doim BIRINCHI
  // yopishtirilgan funksiyani chaqirishda davom etadi (ichki mantiqqa
  // tegilmagan, shu xatti-harakat o'zgartirilmagan). `session` esa fetch
  // tugagach, MOUNT'dan KEYIN paydo bo'ladi — shu sababli pastdagi
  // `handleProgress`ning o'zi HECH QACHON qayta yaratilmaydi (bo'sh dependency
  // massivi), faqat ichida refdan HAR DOIM ENG SO'NGGI `session`ni o'qiydi.
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Sessiya video ko'rish boshlanganda bir marta so'raladi — nuqtalarning
  // o'zi (atSeconds) va savol matni shu javobdan keladi (GET /learn faqat
  // sonini biladi, qarang route.ts izohi).
  useEffect(() => {
    if (checkpointCount === 0) {
      setSession(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/video-checkpoints/${checkpointSource.kind}/${checkpointSource.id}/start`, { method: 'POST' });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.checkpoints) && Array.isArray(data.questions)) {
          setSession({
            sessionId: data.sessionId,
            checkpoints: data.checkpoints,
            questions: new Map(data.questions.map((q: CheckpointQuestion) => [q.id, q])),
          });
        }
      } catch {
        // Jim — checkpoint yuklanmasa video oddiy (nazoratsiz) ishlashda davom etadi
      }
    })();
    return () => { cancelled = true; };
  }, [checkpointSource.kind, checkpointSource.id, checkpointCount]);

  // Navbatdagi nuqtani ko'rsatish — bittasi javob berilib yopilgach keyingisi avtomatik ochiladi.
  useEffect(() => {
    if (!active && queue.length > 0) {
      setActive(queue[0]);
      setQueue((q) => q.slice(1));
      setDraftAnswer('');
      setChecked(null);
      setErrorMsg(null);
    }
  }, [active, queue]);

  useEffect(() => {
    if (active) questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [active]);

  const handleProgress = useCallback((currentTime: number, duration: number) => {
    onProgress?.(currentTime, duration);
    const prev = lastTimeRef.current;
    lastTimeRef.current = currentTime;
    const activeSession = sessionRef.current;
    if (!activeSession) return;

    if (currentTime < prev - REWIND_THRESHOLD_SECONDS) {
      // Orqaga surildi — o'tib ketilgan nuqtalar qayta faollashadi.
      for (const cp of activeSession.checkpoints) {
        if (cp.atSeconds > currentTime) firedRef.current.delete(cp.atSeconds);
      }
      return;
    }

    const crossed = activeSession.checkpoints.filter(
      (cp) => cp.atSeconds > prev && cp.atSeconds <= currentTime && !firedRef.current.has(cp.atSeconds)
    );
    if (crossed.length === 0) return;
    for (const cp of crossed) firedRef.current.add(cp.atSeconds);

    // Katta sakrash — foydalanuvchi ataylab oldinga surdi, savol chiqmaydi
    // (nuqtalar "ko'rilgan" deb belgilandi, video to'xtamaydi).
    if (currentTime - prev > SEEK_JUMP_THRESHOLD_SECONDS) return;

    const showable = crossed.filter((cp) => activeSession.questions.has(cp.itemId));
    if (showable.length === 0) return;

    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    playerRef.current?.pause();
    setQueue((q) => [...q, ...showable]);
    // `onProgress` — src/app/[locale]/(main)/courses/[id]/learn/page.tsx'dan
    // (progress saqlash) doim shu render bilan bir xil identifikatorda emas,
    // lekin bo'sh dependency ataylab: yuqoridagi izohga qarang — bu funksiya
    // SecureYouTubePlayer tomonidan MOUNT'da bir marta olinadi, shu sababli
    // qayta yaratilishning o'zi foyda bermaydi; barcha o'zgaruvchan holat
    // reflar orqali o'qiladi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAnswer = async () => {
    if (!session || !active || !draftAnswer.trim() || checking) return;
    const question = session.questions.get(active.itemId);
    if (!question) return;
    setChecking(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/video-checkpoints/${checkpointSource.kind}/${checkpointSource.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, questionId: question.id, answer: draftAnswer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('practiceError'));
      setChecked(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('practiceError'));
    }
    setChecking(false);
  };

  const continueAfterCheckpoint = () => {
    const hasMore = queue.length > 0;
    setActive(null);
    setChecked(null);
    setDraftAnswer('');
    if (!hasMore) playerRef.current?.play();
  };

  const question = active && session ? session.questions.get(active.itemId) : null;

  return (
    <div className="space-y-3">
      <SecureYouTubePlayer
        ref={playerRef}
        videoUrl={videoUrl}
        title={title}
        startPositionSeconds={startPositionSeconds}
        onProgress={handleProgress}
        onEnded={onEnded}
      />

      {question && (
        <div ref={questionRef} className="p-4 rounded-xl border border-primary-200 bg-primary-50/40 space-y-3">
          <p className="text-xs font-semibold text-primary-700 flex items-center gap-1.5">
            <PauseCircle size={14} /> {t('checkpointPausedNote')}
          </p>

          <QuestionDisplay
            questionNumber={1}
            totalQuestions={1}
            text={question.text}
            images={question.images}
            options={question.options}
            selectedAnswer={draftAnswer || null}
            onAnswer={setDraftAnswer}
            questionType={question.type}
            isReview={!!checked}
            correctAnswer={checked?.correctAnswer}
          />

          {checked && (
            <div className={`p-3 rounded-xl border flex items-start gap-2 ${checked.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {checked.isCorrect ? (
                <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <p className={checked.isCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                  {checked.isCorrect ? t('practiceCorrect') : t('practiceIncorrect')}
                </p>
                {(checked.explanation || checked.distractorWhy) && (
                  <div className="mt-1 text-text-secondary">
                    <LatexRenderer content={checked.explanation || checked.distractorWhy || ''} />
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="flex justify-end">
            {!checked ? (
              <button
                type="button"
                onClick={checkAnswer}
                disabled={!draftAnswer.trim() || checking}
                className="btn-primary min-h-[44px] px-5 text-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {checking && <Loader2 size={14} className="animate-spin" />} {t('practiceCheck')}
              </button>
            ) : (
              <button type="button" onClick={continueAfterCheckpoint} className="btn-primary min-h-[44px] px-5 text-sm">
                {t('checkpointContinue')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
