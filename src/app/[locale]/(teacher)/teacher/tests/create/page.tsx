'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useRouter } from 'next/navigation';
import LatexRenderer from '@/components/ui/LatexRenderer';
import type { AIImportedQuestion, QuestionCoreFields } from '@/types';
import {
  ArrowLeft, Plus, Trash2, Bot,
  Save, FileUp, CheckCircle, Loader2, Send, Eye, Clock,
  Library, BookmarkPlus, X, ShieldAlert,
} from 'lucide-react';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import { parseFillBlankCorrectAnswer } from '@/lib/fill-blank';
import { parseMatchingPairs } from '@/lib/matching';
import { isQuestionValid, fillBlankCorrectAnswer, matchingOptions, mapQuestionForBank, applyServerQuestionIds } from '@/lib/question-form';
import { createSaveQueue } from '@/lib/save-queue';
import { dropDuplicateQuestions, findDuplicateQuestions, type DuplicateGroup } from '@/lib/duplicate-questions';
import QuestionEditorForm from '@/components/teacher/QuestionEditorForm';
import DuplicateQuestionsDialog from '@/components/teacher/DuplicateQuestionsDialog';
import ImportMergeDialog from '@/components/teacher/ImportMergeDialog';
import { toImportedCore } from '@/lib/import/imported-question';
import { incomingDuplicates, isPristineDraft, mergeImported, type ImportMergeMode } from '@/lib/import/merge-imported';
import AiImportPanel, { LOW_CONFIDENCE_THRESHOLD } from '@/components/teacher/AiImportPanel';
import ImportImageAttach from '@/components/teacher/ImportImageAttach';
import QuestionPreviewList from '@/components/teacher/QuestionPreviewList';

interface QuestionForm extends QuestionCoreFields {
  /**
   * Server bergan ID. Saqlash orasida o'zgarmasligi SHART: savol qaytadan
   * yaratilsa yangi ID oladi va `TestResult.answers` dagi `questionId`
   * bog'lanishi uziladi — nashr qilingan testda o'quvchilar natijalari buziladi.
   * Birinchi saqlashdan oldin `undefined`.
   */
  id?: string;
  videoUrl: string;
  points: number;
  /** Faqat AI import orqali kelgan savollarda bo'ladi — qo'lda qo'shilgan/bazadan tanlangan savollarda undefined (belgi ko'rsatilmaydi). */
  aiConfidence?: number;
}

interface SubjectItem {
  id: string;
  nameUz: string;
  icon: string | null;
  category: { nameUz: string; type: string };
}

const emptyQuestion: QuestionForm = {
  text: '',
  images: [],
  options: [
    { label: 'A', text: '', image: null },
    { label: 'B', text: '', image: null },
    { label: 'C', text: '', image: null },
    { label: 'D', text: '', image: null },
  ],
  correctAnswer: '',
  explanation: '',
  explanationImages: [],
  videoUrl: '',
  type: 'MULTIPLE_CHOICE',
  points: 1,
  topic: '',
  bloomLevel: '',
  difficulty: null,
  blankAnswers: [''],
  matchingPairs: [{ left: '', right: '' }, { left: '', right: '' }],
};

// Bitta savolni API kutayotgan formatga o'giradi — qoralamani serverga
// avtosaqlash va aniq "Saqlash"/"Nashr qilish" tugmalari bir xil mapping'dan
// foydalanadi, shu sababli ikkalasi sinxronsizlanmaydi.
function mapQuestionForApi(q: QuestionForm, index: number) {
  const isFillBlank = q.type === 'FILL_BLANK';
  const isMatching = q.type === 'MATCHING';
  return {
    // `id` va `order` — serverdagi update shoxi shu ikkisiga tayanadi. `id`
    // yuborilmasa savol o'chirilib qaytadan yaratiladi (ID lar uziladi).
    id: q.id,
    order: index,
    text: q.text,
    images: q.images,
    options: isMatching ? matchingOptions(q) : (q.type === 'OPEN_ENDED' || isFillBlank) ? [] : q.options.filter((o) => o.text),
    correctAnswer: isFillBlank ? fillBlankCorrectAnswer(q) : isMatching ? '' : q.correctAnswer,
    explanation: q.explanation || null,
    explanationImages: q.explanationImages,
    videoUrl: q.videoUrl || null,
    type: q.type,
    points: q.points || 1,
    topic: q.topic || null,
    bloomLevel: q.bloomLevel || null,
    difficulty: q.difficulty || null,
  };
}

export default function CreateTestPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [testInfo, setTestInfo] = useState({
    titleUz: '',
    categoryType: '',
    subjectId: '',
    duration: 60,
    isFree: false,
    price: 0,
    difficulty: 3,
    videoSolution: '',
    coverImage: '',
    accessType: 'free' as 'free' | 'premium' | 'teacher' | 'premium_teacher' | 'paid',
  });
  const [questions, setQuestions] = useState<QuestionForm[]>([{ ...emptyQuestion }]);
  const [currentStep, setCurrentStep] = useState<'info' | 'questions' | 'ai-import' | 'preview'>('info');
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [showOnlyLowConfidence, setShowOnlyLowConfidence] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [draftTestId, setDraftTestId] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Qo'lda saqlash va avtosaqlash BITTA navbatdan o'tadi — ustma-ust tushgan
  // ikki so'rov savollarni ikkilantirardi (31 → 62).
  const saveQueueRef = useRef(createSaveQueue());
  // `draftTestId` ni ref'da ham ushlaymiz: avtosaqlash `useEffect` closure'ida
  // eski (null) qiymatni ko'rib ikkinchi `POST /api/tests` yuborishi va
  // DUBLIKAT TEST yaratishi mumkin edi.
  const draftTestIdRef = useRef<string | null>(null);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [savingToBank, setSavingToBank] = useState(false);
  const [savingAllToBank, setSavingAllToBank] = useState(false);
  // Saqlashdan oldingi dublikat ogohlantirishi — ustoz javob berguncha saqlash kutib turadi
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [pendingPublish, setPendingPublish] = useState(false);
  // Import natijasi ustoz "qo'shish yoki almashtirish" ni tanlaguncha kutadi
  const [pendingImport, setPendingImport] = useState<QuestionForm[] | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  // `draftTestId` ni holat va ref'da BIRGA yangilaydi — ikkisi ajralib qolsa
  // avtosaqlash eski null'ni ko'rib ikkinchi test yaratadi.
  const applyDraftTestId = (id: string) => {
    draftTestIdRef.current = id;
    setDraftTestId(id);
  };

  // Server qaytargan savol ID larini holatga singdiradi. `sentOriginalIndexes`
  // kerak, chunki serverga faqat yaroqli (va dublikatsiz) savollar yuborilgan —
  // yuborilgan ro'yxat indeksi holat indeksiga teng emas.
  const absorbQuestionIds = (sentOriginalIndexes: number[], payload: unknown) => {
    const serverQuestions = (payload as { questions?: { id: string; order: number }[] } | null)?.questions;
    if (!Array.isArray(serverQuestions) || serverQuestions.length === 0) return;
    setQuestions((prev) => applyServerQuestionIds(prev, sentOriginalIndexes, serverQuestions));
  };

  // Savollar bazasidan tanlash uchun ro'yxatni yuklaydi (test fani bo'yicha filtrlaydi)
  const openBankPicker = async () => {
    setBankPickerOpen(true);
    setBankLoading(true);
    try {
      const params = new URLSearchParams();
      if (testInfo.subjectId) params.set('subjectId', testInfo.subjectId);
      const res = await fetch(`/api/teacher/question-bank?${params.toString()}`);
      const data = await res.json();
      setBankQuestions(data.questions || []);
    } catch {
      setBankQuestions([]);
    }
    setBankLoading(false);
  };

  const insertFromBank = (bq: any) => {
    const isFillBlank = bq.type === 'FILL_BLANK';
    const isMatching = bq.type === 'MATCHING';
    const bankPairs = isMatching ? parseMatchingPairs(bq.options) : null;
    const imported: QuestionForm = {
      text: bq.text || '',
      images: bq.images || [],
      options: (bq.type === 'OPEN_ENDED' || isFillBlank || isMatching) ? [...emptyQuestion.options] : (bq.options?.length ? bq.options : [...emptyQuestion.options]),
      correctAnswer: (isFillBlank || isMatching) ? '' : (bq.correctAnswer || ''),
      explanation: bq.explanation || '',
      explanationImages: [],
      videoUrl: '',
      type: bq.type || 'MULTIPLE_CHOICE',
      points: 1,
      topic: bq.topic || '',
      bloomLevel: bq.bloomLevel || '',
      difficulty: bq.difficulty || null,
      blankAnswers: isFillBlank
        ? parseFillBlankCorrectAnswer(bq.correctAnswer).map((accepted) => accepted.join(', '))
        : [''],
      matchingPairs: bankPairs && bankPairs.left.length >= 2
        ? bankPairs.left.map((left, i) => ({ left, right: bankPairs.right[i] }))
        : [{ left: '', right: '' }, { left: '', right: '' }],
    };
    setQuestions((prev) => {
      const isOnlyEmpty = prev.length === 1 && !prev[0].text;
      const next = isOnlyEmpty ? [imported] : [...prev, imported];
      setActiveQuestion(next.length - 1);
      return next;
    });
    setBankPickerOpen(false);
  };

  const saveActiveQuestionToBank = async () => {
    const q = questions[activeQuestion];
    if (!testInfo.subjectId) {
      alert("Avval 'Test ma'lumotlari' qadamida fanni tanlang!");
      return;
    }
    if (!isQuestionValid(q)) {
      alert("Savol matni va to'g'ri javob to'ldirilishi kerak!");
      return;
    }
    setSavingToBank(true);
    try {
      const res = await fetch('/api/teacher/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapQuestionForBank(q, testInfo.subjectId)),
      });
      if (res.ok) {
        alert('Savol bazaga saqlandi!');
      } else {
        const data = await res.json();
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch {
      alert('Server xatolik');
    }
    setSavingToBank(false);
  };

  // Kiritilgan barcha (yaroqli) savollarni bitta so'rovda Savollar bazasiga
  // yozadi — ko'p savol kiritilganda har birini alohida bosib chiqishning
  // o'rniga.
  const saveAllQuestionsToBank = async () => {
    if (!testInfo.subjectId) {
      alert("Avval 'Test ma'lumotlari' qadamida fanni tanlang!");
      return;
    }
    const validQuestions = questions.filter(isQuestionValid);
    if (validQuestions.length === 0) {
      alert("Bazaga saqlash uchun kamida bitta to'liq to'ldirilgan savol bo'lishi kerak!");
      return;
    }
    setSavingAllToBank(true);
    try {
      const res = await fetch('/api/teacher/question-bank/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: validQuestions.map((q) => mapQuestionForBank(q, testInfo.subjectId)),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const skippedNote = questions.length - validQuestions.length;
        alert(
          `${data.count} ta savol bazaga saqlandi!` +
            (skippedNote > 0 ? `\n${skippedNote} ta to'ldirilmagan savol o'tkazib yuborildi.` : '')
        );
      } else {
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch {
      alert('Server xatolik');
    }
    setSavingAllToBank(false);
  };

  // Qoralamani serverga jim tarzda saqlaydi — birinchi marta test yaratadi
  // (POST), keyingi chaqiruvlar o'sha bitta qatorni yangilaydi (PUT), shu
  // sababli har 30 soniyada yangi-yangi test yaratilmaydi. Faqat sarlavha va
  // fan tanlangandan keyin ishga tushadi; savollar tugallanmagan bo'lsa ham
  // saqlanadi — bu shunchaki qoralama, nashr qilish uchun emas.
  const saveDraftToServer = async (currentTestInfo: typeof testInfo, currentQuestions: QuestionForm[]) => {
    if (!currentTestInfo.titleUz || !currentTestInfo.subjectId) return;
    const queue = saveQueueRef.current;
    // Navbatda ish bo'lsa avtosaqlash o'zini o'tkazib yuboradi — 30 soniyadan
    // keyin qaytadan urinadi. Sahifa yopilayotganda ham yangi so'rov ketmaydi.
    if (queue.busy || queue.closed) return;
    try {
      await queue.enqueue(async () => {
        const { categoryType, accessType, ...testData } = currentTestInfo;
        const isFree = accessType === 'free';
        const price = accessType === 'paid' ? currentTestInfo.price : 0;
        const questionsPayload = currentQuestions.map(mapQuestionForApi);
        // Avtosaqlash hamma savolni yuboradi, shuning uchun moslik to'g'ridan-to'g'ri
        const sentOriginalIndexes = currentQuestions.map((_, i) => i);
        // Navbat kutgan vaqtda qo'lda saqlash testni yaratib qo'ygan bo'lishi
        // mumkin — shuning uchun ref'dan endi o'qiladi, closure'dan emas.
        const currentDraftId = draftTestIdRef.current;

        if (!currentDraftId) {
          const res = await fetch('/api/tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...testData, isFree, price, accessType, questions: questionsPayload }),
          });
          const data = await res.json();
          if (res.ok && data.test?.id) {
            applyDraftTestId(data.test.id);
            absorbQuestionIds(sentOriginalIndexes, data.test);
          }
        } else {
          await fetch(`/api/tests/${currentDraftId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...testData, isFree, price, accessType }),
          });
          const qRes = await fetch(`/api/teacher/tests/${currentDraftId}/questions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            // `source` — faqat server logi uchun: dublikat holati takrorlansa
            // qaysi ekranda tug'ilgani darrov ko'rinsin.
            body: JSON.stringify({ questions: questionsPayload, source: 'create' }),
          });
          if (qRes.ok) absorbQuestionIds(sentOriginalIndexes, await qRes.json());
        }
      });
    } catch {
      // Jim tarzda ishlaydi — server bilan bog'lanish vaqtincha uzilsa ham
      // localStorage'dagi nusxa saqlanib qoladi, keyingi avtosaqlash urinishida davom etadi.
    }
  };

  // Auto-save to localStorage (va fon rejimida serverga) — oxirgi tahrirdan 30 soniya o'tgach
  useEffect(() => {
    const saveDraft = () => {
      const data = { testInfo, questions, draftTestId, timestamp: Date.now() };
      localStorage.setItem('teacher_test_draft', JSON.stringify(data));
      setLastSaved(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }));
      saveDraftToServer(testInfo, questions);
    };

    autoSaveTimerRef.current = setInterval(saveDraft, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [testInfo, questions, draftTestId]);

  // Dialog ochiq turganda saqlash holatini kuzatadi. `busy` — navbat
  // obyektidagi oddiy getter, u o'zgarganda React qayta render qilmaydi.
  // 500 ms: ustoz tugmaning ochilishini sezadi, ortiqcha render bo'lmaydi.
  useEffect(() => {
    if (pendingImport === null) return;
    const tick = () => setSaveBusy(saveQueueRef.current.busy);
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [pendingImport]);

  // Unmount'da navbat yopiladi — sahifadan ketayotganda yangi saqlash
  // boshlanib, allaqachon saqlangan testni qaytadan yozmasin.
  useEffect(() => {
    const queue = saveQueueRef.current;
    return () => queue.close();
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('teacher_test_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore if less than 24 hours old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 86400000) {
          if (parsed.testInfo && !testInfo.titleUz) {
            setTestInfo(parsed.testInfo);
            if (parsed.draftTestId) applyDraftTestId(parsed.draftTestId);
          }
          if (parsed.questions && parsed.questions.length > 0 && questions.length === 1 && !questions[0].text) {
            setQuestions(parsed.questions);
          }
          setLastSaved('Avvalgi qoralama tiklandi');
        }
      } catch {}
    }
  }, []);

  // Fetch subjects
  useEffect(() => {
    fetch('/api/subjects')
      .then(r => r.json())
      .then(data => {
        if (data.subjects) setSubjects(data.subjects);
      })
      .catch(console.error);
  }, []);

  // Category type options
  const categoryTypeOptions = [
    { label: 'DTM', value: 'DTM' },
    { label: 'Maktab', value: 'SCHOOL' },
    { label: 'Attestatsiya', value: 'ATTESTATION' },
    { label: 'SAT', value: 'SAT' },
    { label: 'GRE', value: 'GRE' },
    { label: 'Milliy sertifikat', value: 'CERTIFICATE' },
    { label: 'Prezident maktabi', value: 'PRESIDENT_SCHOOL' },
  ];

  // Filter subjects by selected category type
  const filteredSubjects = testInfo.categoryType
    ? subjects.filter(s => s.category.type === testInfo.categoryType)
    : subjects;

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
    setActiveQuestion(questions.length);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
    if (activeQuestion >= questions.length - 1) setActiveQuestion(Math.max(0, questions.length - 2));
  };

  // SAVE TEST
  const handleSave = async (publish: boolean) => {
    if (!testInfo.categoryType) {
      alert("Kategoriya turini tanlash majburiy!");
      setCurrentStep('info');
      return;
    }
    if (!testInfo.titleUz || !testInfo.subjectId) {
      alert("Test nomi va fan tanlash majburiy!");
      setCurrentStep('info');
      return;
    }

    const validQuestions = questions.filter(isQuestionValid);
    if (validQuestions.length === 0) {
      alert("Kamida 1 ta savol kiritilishi kerak (matn + to'g'ri javob)!");
      setCurrentStep('questions');
      return;
    }

    // Bir xil matnli savollar bo'lsa saqlash to'xtaydi va qarorni ustoz qabul
    // qiladi. JIMGINA o'chirilmaydi: o'xshash savol ataylab yozilgan bo'lishi
    // mumkin, jimgina o'chirish esa uning mehnatini yo'qotardi.
    const duplicates = findDuplicateQuestions(validQuestions);
    if (duplicates.length > 0) {
      setDuplicateGroups(duplicates);
      setPendingPublish(publish);
      return;
    }

    await performSave(publish, validQuestions);
  };

  // Saqlashning o'zi — `handleSave` tekshiruvlaridan o'tgach, yoki dublikat
  // modalidagi tanlovdan keyin chaqiriladi.
  const performSave = async (publish: boolean, questionsToSave: QuestionForm[]) => {
    // `saving` navbatni KUTISH paytida ham yoqiladi — aks holda ustoz tugma
    // javob bermayapti deb ikkinchi marta bosardi.
    setSaving(true);
    // Serverga yuborilayotgan savollarning holatdagi asl indekslari. Ro'yxat
    // `questions` dan `.filter` bilan olingani uchun havolalar (references)
    // saqlanadi, shuning uchun `indexOf` ishonchli.
    const sentOriginalIndexes = questionsToSave.map((q) => questions.indexOf(q));
    try {
      // Ketayotgan avtosaqlash bo'lsa navbatda kutadi — ilgari ikkalasi
      // ustma-ust ketib savollarni ikkilantirardi.
      await saveQueueRef.current.enqueue(async () => {
        // Exclude categoryType and accessType from the request body - only used client-side
        const { categoryType, accessType, ...testData } = testInfo;

        // Map accessType to isFree and price
        const isFree = accessType === 'free';
        const price = accessType === 'paid' ? testInfo.price : 0;
        const questionsPayload = questionsToSave.map(mapQuestionForApi);

        // Avtosaqlash bu testni allaqachon serverda yaratgan bo'lishi mumkin —
        // shunday bo'lsa qayta POST qilib dublikat yaratish o'rniga o'sha
        // qatorni yangilaymiz. Ref'dan o'qiladi: navbat kutgan vaqtda
        // avtosaqlash testni yaratib qo'ygan bo'lishi mumkin.
        let testId = draftTestIdRef.current;

        if (!testId) {
          const res = await fetch('/api/tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...testData, isFree, price, accessType, questions: questionsPayload }),
          });
          const data = await res.json();
          if (!res.ok) {
            alert(data.error || "Xatolik yuz berdi");
            return;
          }
          testId = data.test.id as string;
          applyDraftTestId(testId);
          absorbQuestionIds(sentOriginalIndexes, data.test);
        } else {
          const res = await fetch(`/api/tests/${testId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...testData, isFree, price, accessType }),
          });
          if (!res.ok) {
            const data = await res.json();
            alert(data.error || "Xatolik yuz berdi");
            return;
          }
          const qRes = await fetch(`/api/teacher/tests/${testId}/questions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            // `source` — faqat server logi uchun: dublikat holati takrorlansa
            // qaysi ekranda tug'ilgani darrov ko'rinsin.
            body: JSON.stringify({ questions: questionsPayload, source: 'create' }),
          });
          if (!qRes.ok) {
            const qData = await qRes.json();
            alert(qData.error || "Savollarni saqlashda xatolik");
            return;
          }
          absorbQuestionIds(sentOriginalIndexes, await qRes.json());
        }

        // Publish if requested
        if (publish && testId) {
          await fetch(`/api/tests/${testId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPublished: true }),
          });
        }
        // Clear auto-saved draft
        localStorage.removeItem('teacher_test_draft');
        // Navbat sahifadan ketishdan OLDIN yopiladi — aks holda 30 soniyalik
        // avtosaqlash hali o'lmagan taymerdan ishga tushib, saqlangan testni
        // qaytadan yozishi mumkin.
        saveQueueRef.current.close();
        alert(publish ? "Test yaratildi va nashr qilindi! ✅" : "Test saqlandi (qoralama)!");
        router.push('/teacher');
      });
    } catch (error) {
      alert("Server xatolik. Qayta urinib ko'ring.");
    }
    setSaving(false);
  };

  // Dublikat modalidagi tanlovlar. Ro'yxat qaytadan filtrlanadi, chunki modal
  // ochiq turganda ustoz savollarni tahrirlagan bo'lishi mumkin.
  const closeDuplicateDialog = () => setDuplicateGroups([]);

  const saveWithoutDuplicates = () => {
    const validQuestions = questions.filter(isQuestionValid);
    closeDuplicateDialog();
    performSave(pendingPublish, dropDuplicateQuestions(validQuestions));
  };

  const saveKeepingDuplicates = () => {
    const validQuestions = questions.filter(isQuestionValid);
    closeDuplicateDialog();
    performSave(pendingPublish, validQuestions);
  };

  // AiImportPanel savol topganda chaqiradi (matn va JSON rejimlarining
  // IKKALASI ham shu yerdan o'tadi) — AIImportedQuestion[] ni QuestionForm[]
  // ga o'giradi va qoralamaga qanday qo'shishni so'raydi.
  const handleAiImported = (imported: AIImportedQuestion[]) => {
    const mapped: QuestionForm[] = imported.map((q) => ({
      ...toImportedCore(q),
      points: 1,
      videoUrl: '',
    }));
    // Qoralama hali ochilgan holida bo'lsa so'rashning ma'nosi yo'q.
    if (isPristineDraft(questions)) {
      applyImport(mapped, 'replace');
      return;
    }
    setPendingImport(mapped);
  };

  /**
   * Import natijasini qoralamaga qo'yadi.
   *
   * `append` da mavjud savollar AYNAN o'sha obyektlar bo'lib qoladi, shuning
   * uchun `id` lari saqlanadi va ketayotgan saqlashning javobi ham to'g'ri
   * indekslarga tushadi. `replace` da esa bu xavfli — shuning uchun saqlash
   * yo'ldaligida u tugma o'chirilgan bo'ladi (`saveBusy`).
   */
  const applyImport = (mapped: QuestionForm[], mode: ImportMergeMode) => {
    // Indeks updater'dan TASHQARIDA hisoblanadi: `setQuestions` updater'i sof
    // qolsin — React uni ikki marta chaqirishi mumkin (StrictMode, konkurrent
    // render), ichidagi `setActiveQuestion` esa ikki marta ishlardi.
    setActiveQuestion(mode === 'append' ? questions.length : 0);
    setQuestions((prev) => mergeImported(prev, mapped, mode));
    setCurrentStep('questions');
    setShowOnlyLowConfidence(false);
    setPendingImport(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href="/teacher" className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Yangi test yaratish</h1>
            <p className="text-sm text-text-secondary">Savollarni qo&apos;lda kiriting yoki AI bilan import qiling</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="btn-secondary flex items-center gap-2 !py-2 !px-4 text-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Qoralama
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Nashr qilish
          </button>
        </div>
      </motion.div>

      {/* Step tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'info' as const, label: "Test ma'lumotlari", icon: FileUp },
          { id: 'questions' as const, label: `Savollar (${questions.length})`, icon: Plus },
          { id: 'ai-import' as const, label: 'AI Import', icon: Bot },
          { id: 'preview' as const, label: "Ko'rib chiqish", icon: Eye },
        ].map((step) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentStep === step.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white border border-border text-text-secondary hover:border-primary-200'
            }`}
          >
            <step.icon size={16} />
            {step.label}
          </button>
        ))}
        {/* Auto-save indicator */}
        {lastSaved && (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary ml-auto self-center">
            <Clock size={12} />
            {lastSaved}
          </span>
        )}
      </div>

      {/* STEP: INFO */}
      {currentStep === 'info' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Test nomi *</label>
              <input
                type="text"
                value={testInfo.titleUz}
                onChange={(e) => setTestInfo({ ...testInfo, titleUz: e.target.value })}
                placeholder="Masalan: DTM Matematika #1"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Kategoriya turi *</label>
              <select
                value={testInfo.categoryType}
                onChange={(e) => setTestInfo({ ...testInfo, categoryType: e.target.value, subjectId: '' })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              >
                <option value="">Kategoriya turini tanlang...</option>
                {categoryTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Fan *</label>
              <select
                value={testInfo.subjectId}
                onChange={(e) => setTestInfo({ ...testInfo, subjectId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              >
                <option value="">Fan tanlang...</option>
                {filteredSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.nameUz} ({s.category.nameUz})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Davomiyligi (daqiqa)</label>
              <input
                type="text"
                inputMode="numeric"
                value={testInfo.duration === 0 ? '' : testInfo.duration.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') setTestInfo({ ...testInfo, duration: 0 });
                  else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num >= 0 && num <= 600) setTestInfo({ ...testInfo, duration: num });
                  }
                }}
                placeholder="60"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary block mb-2">Qiyinlik (1-5)</label>
              <input
                type="text"
                inputMode="numeric"
                value={testInfo.difficulty === 0 ? '' : testInfo.difficulty.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') setTestInfo({ ...testInfo, difficulty: 0 });
                  else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num >= 0 && num <= 5) setTestInfo({ ...testInfo, difficulty: num });
                  }
                }}
                placeholder="3"
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
          </div>

          {/* Access type / Tarif selector */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-3">Test kirish turi *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {([
                { key: 'free' as const, label: 'Bepul', desc: 'Hammaga ochiq', color: 'border-green-300 bg-green-50 text-green-700' },
                { key: 'premium' as const, label: 'Premium', desc: 'Premium tarifi', color: 'border-purple-300 bg-purple-50 text-purple-700' },
                { key: 'teacher' as const, label: 'Ustoz', desc: 'Ustoz tarifi', color: 'border-blue-300 bg-blue-50 text-blue-700' },
                { key: 'premium_teacher' as const, label: 'Premium + Ustoz', desc: 'Ikkala tarif', color: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
                { key: 'paid' as const, label: 'Narxli', desc: 'Alohida sotib olish', color: 'border-orange-300 bg-orange-50 text-orange-700' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    const isFree = opt.key === 'free';
                    setTestInfo({ ...testInfo, accessType: opt.key, isFree, price: isFree ? 0 : testInfo.price });
                  }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    testInfo.accessType === opt.key
                      ? `${opt.color} shadow-sm`
                      : 'border-gray-200 bg-white text-text-secondary hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs opacity-75 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            {testInfo.accessType === 'paid' && (
              <div className="flex items-center gap-2 mt-3">
                <label className="text-sm font-medium text-text-primary">Narx:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={testInfo.price === 0 ? '' : testInfo.price.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') setTestInfo({ ...testInfo, price: 0 });
                    else {
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 0) setTestInfo({ ...testInfo, price: num });
                    }
                  }}
                  placeholder="5000"
                  className="w-32 px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary-500/20 text-sm"
                />
                <span className="text-sm text-text-secondary">so&apos;m</span>
              </div>
            )}
          </div>
          <p className="text-xs text-text-secondary bg-blue-50 p-3 rounded-lg border border-blue-100">
            💡 <strong>Bepul</strong> — hammaga ochiq. <strong>Premium/Ustoz</strong> — faqat o&apos;sha tarif foydalanuvchilariga. <strong>Narxli</strong> — alohida sotib olish kerak (Telegram bot orqali).
          </p>

          {/* General video solution */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              Umumiy videoyechim URL (ixtiyoriy)
            </label>
            <input
              type="url"
              value={testInfo.videoSolution}
              onChange={(e) => setTestInfo({ ...testInfo, videoSolution: e.target.value })}
              placeholder="https://youtube.com/watch?v=... (barcha savollar uchun bitta umumiy video)"
              className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
            />
            <p className="text-xs text-text-secondary mt-1">
              Bu video test natijasi sahifasida &quot;Umumiy videoyechim&quot; sifatida ko&apos;rsatiladi
            </p>
          </div>

          {/* Cover image upload */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              Test bosh rasmi (ixtiyoriy)
            </label>
            <div className="flex items-center gap-4">
              <ImageUploadButton
                endpoint="questionImage"
                label="Bosh rasm yuklash"
                onUpload={(url) => setTestInfo({ ...testInfo, coverImage: url })}
              />
              {testInfo.coverImage && (
                <span className="text-xs text-green-600 font-medium">Rasm yuklandi</span>
              )}
            </div>
            {testInfo.coverImage && (
              <div className="mt-3 relative inline-block">
                <img
                  src={testInfo.coverImage}
                  alt="Test bosh rasmi"
                  className="h-32 w-auto object-cover rounded-xl border border-border"
                />
                <button
                  type="button"
                  onClick={() => setTestInfo({ ...testInfo, coverImage: '' })}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                >
                  &times;
                </button>
              </div>
            )}
            <p className="text-xs text-text-secondary mt-2">
              Agar rasm yuklanmasa, test chiroyli rang gradientida ko&apos;rsatiladi
            </p>
          </div>
        </motion.div>
      )}

      {/* STEP: QUESTIONS */}
      {currentStep === 'questions' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question list sidebar */}
          <div className="card p-4 space-y-2 h-fit">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-primary">Savollar</h3>
              <span className="text-xs text-text-secondary">{questions.length} ta</span>
            </div>
            {(() => {
              const lowConfidenceCount = questions.filter((q) => q.aiConfidence !== undefined && q.aiConfidence < LOW_CONFIDENCE_THRESHOLD).length;
              return lowConfidenceCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowOnlyLowConfidence((v) => !v)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 border transition-all ${
                    showOnlyLowConfidence ? 'bg-amber-100 border-amber-300 text-amber-800 font-medium' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <ShieldAlert size={12} />
                  {showOnlyLowConfidence ? `Hammasini ko'rsatish` : `Faqat tekshirish kerakligini ko'rsatish (${lowConfidenceCount})`}
                </button>
              ) : null;
            })()}
            {questions.map((q, i) => {
              const needsReview = q.aiConfidence !== undefined && q.aiConfidence < LOW_CONFIDENCE_THRESHOLD;
              if (showOnlyLowConfidence && !needsReview) return null;
              return (
              <button
                key={i}
                onClick={() => setActiveQuestion(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all ${
                  i === activeQuestion ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-50 text-text-secondary'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {i + 1}-savol
                  {needsReview && (
                    <span title="AI bu savolga unchalik ishonchli emas — tekshiring">
                      <ShieldAlert size={12} className="text-amber-600" />
                    </span>
                  )}
                  {q.type === 'OPEN_ENDED' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Ochiq</span>
                  )}
                  {q.type === 'MULTI_SELECT' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Ko&apos;p tanlovli</span>
                  )}
                  {q.type === 'TRUE_FALSE' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">T/N</span>
                  )}
                  {q.type === 'FILL_BLANK' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">Bo&apos;shliq</span>
                  )}
                  {q.type === 'MATCHING' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">Moslashtirish</span>
                  )}
                </span>
                {isQuestionValid(q) && <CheckCircle size={12} className="text-green-500" />}
              </button>
              );
            })}
            <button
              onClick={addQuestion}
              className="w-full px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 transition-colors border border-dashed border-primary-200"
            >
              <Plus size={14} /> Savol qo&apos;shish
            </button>
            <button
              onClick={openBankPicker}
              className="w-full px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-50 flex items-center gap-2 transition-colors border border-dashed border-border"
            >
              <Library size={14} /> Bazadan tanlash
            </button>
            <button
              onClick={saveAllQuestionsToBank}
              disabled={savingAllToBank}
              title="Kiritilgan barcha to'liq savollarni bitta bosishda bazaga saqlaydi"
              className="w-full px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 transition-colors border border-dashed border-primary-200 disabled:opacity-50"
            >
              {savingAllToBank ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />}
              Hammasini bazaga saqlash
            </button>
          </div>

          {/* Question editor */}
          <div className="lg:col-span-3 card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">{activeQuestion + 1}-savol</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                  Ball:
                  <input
                    type="text"
                    inputMode="numeric"
                    value={questions[activeQuestion]?.points ?? 1}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = val === '' ? 1 : parseInt(val);
                      if (val === '' || (!isNaN(num) && num >= 1 && num <= 100)) {
                        const updated = [...questions];
                        updated[activeQuestion] = { ...updated[activeQuestion], points: val === '' ? 1 : num };
                        setQuestions(updated);
                      }
                    }}
                    className="w-14 px-2 py-1 rounded-lg border border-border text-center text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
                  />
                </label>
                <button
                  onClick={saveActiveQuestionToBank}
                  disabled={savingToBank}
                  title="Bu savolni bazaga saqlash"
                  className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 disabled:opacity-50"
                >
                  {savingToBank ? <Loader2 size={16} className="animate-spin" /> : <BookmarkPlus size={16} />}
                </button>
                <button onClick={() => removeQuestion(activeQuestion)} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {questions[activeQuestion] && (
              <QuestionEditorForm
                question={questions[activeQuestion]}
                onChange={(updater) => {
                  setQuestions((prev) => {
                    const next = [...prev];
                    next[activeQuestion] = updater(next[activeQuestion]);
                    return next;
                  });
                }}
                footerSlot={
                  <div>
                    <label className="text-sm font-medium text-text-primary block mb-2">Video yechim URL (ixtiyoriy)</label>
                    <input
                      type="url"
                      value={questions[activeQuestion]?.videoUrl || ''}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[activeQuestion] = { ...updated[activeQuestion], videoUrl: e.target.value };
                        setQuestions(updated);
                      }}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
                    />
                  </div>
                }
              />
            )}
          </div>
        </motion.div>
      )}

      {/* STEP: AI IMPORT */}
      {currentStep === 'ai-import' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-6">
          <AiImportPanel onImported={handleAiImported} />
          <ImportImageAttach questions={questions} onChange={setQuestions} />
        </motion.div>
      )}

      {/* STEP: PREVIEW */}
      {currentStep === 'preview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">Test ko&apos;rinishi</h2>
              <span className="text-sm text-text-secondary">
                {questions.filter(isQuestionValid).length} ta savol
              </span>
            </div>

            {/* Test info preview */}
            <div className="p-4 rounded-xl bg-primary-50 border border-primary-100 mb-6">
              <h3 className="font-semibold text-text-primary text-lg">{testInfo.titleUz || 'Test nomi kiritilmagan'}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                <span>{testInfo.duration} daqiqa</span>
                <span>Qiyinlik: {testInfo.difficulty}/5</span>
                <span>{testInfo.isFree ? 'Bepul' : `${testInfo.price} so'm`}</span>
              </div>
            </div>

            <QuestionPreviewList
              questions={questions}
              emptyMessage={'Hali savollar kiritilmagan. "Savollar" tabiga o\'ting.'}
            />
          </div>
        </motion.div>
      )}

      <DuplicateQuestionsDialog
        open={duplicateGroups.length > 0}
        groups={duplicateGroups}
        extras={duplicateGroups.reduce((n, g) => n + g.indexes.length - 1, 0)}
        onDropDuplicates={saveWithoutDuplicates}
        onKeepAll={saveKeepingDuplicates}
        onCancel={closeDuplicateDialog}
      />

      <ImportMergeDialog
        open={pendingImport !== null}
        existingCount={questions.length}
        incomingCount={pendingImport?.length ?? 0}
        duplicateCount={incomingDuplicates(questions, pendingImport ?? []).count}
        replaceDisabled={saveBusy}
        onAppend={() => pendingImport && applyImport(pendingImport, 'append')}
        onReplace={() => pendingImport && applyImport(pendingImport, 'replace')}
        onCancel={() => setPendingImport(null)}
      />

      {/* Bank picker modal */}
      {bankPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setBankPickerOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Library size={18} className="text-primary-600" /> Savollar bazasidan tanlash
              </h3>
              <button onClick={() => setBankPickerOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {bankLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
              ) : bankQuestions.length === 0 ? (
                <div className="text-center py-10 text-sm text-text-secondary">
                  <p>Bazada {testInfo.subjectId ? 'shu fan bo\'yicha' : ''} savol topilmadi.</p>
                  <Link href="/teacher/question-bank" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
                    Savollar bazasiga o&apos;tish
                  </Link>
                </div>
              ) : (
                bankQuestions.map((bq) => (
                  <div key={bq.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border hover:border-primary-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      {bq.topic && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 mr-1.5">{bq.topic}</span>}
                      <div className="text-sm text-text-primary mt-1">
                        <LatexRenderer content={bq.text} />
                      </div>
                    </div>
                    <button
                      onClick={() => insertFromBank(bq)}
                      className="flex-shrink-0 p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                      title="Testga qo'shish"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
