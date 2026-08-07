'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useRouter } from 'next/navigation';
import LatexRenderer from '@/components/ui/LatexRenderer';
import LatexToolbar from '@/components/ui/LatexToolbar';
import { BLOOM_LEVELS } from '@/types';
import {
  ArrowLeft, Plus, Trash2, Image, Upload, Bot,
  Save, FileUp, CheckCircle, Loader2, Send, Eye, Clock, Paperclip,
  Library, BookmarkPlus, X, PenLine,
} from 'lucide-react';
import ImageUploadButton, {
  ImagePreviewList, uploadImageFile, extractPastedImageFile, extractDroppedImageFile,
} from '@/components/ui/ImageUploadButton';
import {
  FILL_BLANK_MARKER, countFillBlanks, encodeFillBlankCorrectAnswer, parseFillBlankCorrectAnswer,
} from '@/lib/fill-blank';
import FillBlankEditor from '@/components/ui/FillBlankEditor';
import MatchingEditor, { type MatchingPairInput } from '@/components/ui/MatchingEditor';
import { parseMatchingPairs } from '@/lib/matching';

interface QuestionForm {
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[];
  correctAnswer: string;
  explanation: string;
  explanationImages: string[];
  videoUrl: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN_ENDED' | 'TRUE_FALSE' | 'MULTI_SELECT' | 'FILL_BLANK' | 'MATCHING';
  points: number;
  topic: string;
  bloomLevel: string;
  difficulty: number | null;
  blankAnswers: string[]; // FILL_BLANK uchun — matndagi har bir "___" o'rniga mos, vergul bilan ajratilgan qabul qilinadigan javoblar
  matchingPairs: MatchingPairInput[]; // MATCHING uchun — chap/o'ng ustun juftliklari
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

// FILL_BLANK: matndagi "___" soniga mos ravishda blankAnswers ro'yxatini
// hisoblaydi (mapping/render vaqtida uzunlik mos kelishi uchun).
function fillBlankCorrectAnswer(q: QuestionForm): string {
  const blankCount = countFillBlanks(q.text);
  const perBlank = Array.from({ length: blankCount }, (_, i) =>
    (q.blankAnswers[i] || '').split(',').map((s) => s.trim()).filter(Boolean)
  );
  return encodeFillBlankCorrectAnswer(perBlank);
}

// MATCHING: juftliklarni Question.options (Json) kutayotgan {left, right}
// shakliga o'giradi — bo'sh (matnsiz) juftliklar chetlab o'tiladi.
function matchingOptions(q: QuestionForm): { left: string[]; right: string[] } {
  const filled = q.matchingPairs.filter((p) => p.left.trim() && p.right.trim());
  return {
    left: filled.map((p) => p.left.trim()),
    right: filled.map((p) => p.right.trim()),
  };
}

// Bitta savolni API kutayotgan formatga o'giradi — qoralamani serverga
// avtosaqlash va aniq "Saqlash"/"Nashr qilish" tugmalari bir xil mapping'dan
// foydalanadi, shu sababli ikkalasi sinxronsizlanmaydi.
function mapQuestionForApi(q: QuestionForm) {
  const isFillBlank = q.type === 'FILL_BLANK';
  const isMatching = q.type === 'MATCHING';
  return {
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

// Savol yaroqli hisoblanishi uchun: matn bo'lishi, va turiga qarab yoki
// to'g'ri javob (correctAnswer), yoki FILL_BLANK uchun har bir bo'shliqqa
// kamida bitta qabul qilinadigan javob, yoki MATCHING uchun kamida 2 ta
// to'liq (chap+o'ng) juftlik to'ldirilgan bo'lishi kerak.
function isQuestionValid(q: QuestionForm): boolean {
  if (!q.text) return false;
  if (q.type === 'FILL_BLANK') {
    const blankCount = countFillBlanks(q.text);
    if (blankCount === 0) return false;
    for (let i = 0; i < blankCount; i++) {
      if (!(q.blankAnswers[i] || '').trim()) return false;
    }
    return true;
  }
  if (q.type === 'MATCHING') {
    const filled = q.matchingPairs.filter((p) => p.left.trim() && p.right.trim());
    return filled.length >= 2;
  }
  return !!q.correctAnswer;
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
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [draftTestId, setDraftTestId] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draftSaveInFlightRef = useRef(false);
  const questionTextRef = useRef<HTMLTextAreaElement | null>(null);
  const explanationRef = useRef<HTMLTextAreaElement | null>(null);
  const [dropUploading, setDropUploading] = useState<'question' | 'explanation' | null>(null);
  const [aiFileLoading, setAiFileLoading] = useState(false);
  const aiImageInputRef = useRef<HTMLInputElement | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement | null>(null);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [savingToBank, setSavingToBank] = useState(false);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

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
      const isFillBlank = q.type === 'FILL_BLANK';
      const isMatching = q.type === 'MATCHING';
      const res = await fetch('/api/teacher/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: testInfo.subjectId,
          text: q.text,
          images: q.images,
          options: isMatching ? matchingOptions(q) : (q.type === 'OPEN_ENDED' || isFillBlank) ? [] : q.options.filter((o) => o.text),
          correctAnswer: isFillBlank ? fillBlankCorrectAnswer(q) : isMatching ? '' : q.correctAnswer,
          type: q.type,
          explanation: q.explanation || null,
          explanationImages: q.explanationImages,
          topic: q.topic || null,
          bloomLevel: q.bloomLevel || null,
          difficulty: q.difficulty || null,
        }),
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

  // Savol matni / yechim maydonlariga rasmni sudrab tashlash yoki
  // clipboard'dan (Ctrl+V) joylash orqali yuklash
  const handleImageDropOrPaste = async (
    file: File,
    target: 'question' | 'explanation'
  ) => {
    setDropUploading(target);
    try {
      const endpoint = target === 'question' ? 'questionImage' : 'solutionImage';
      const url = await uploadImageFile(file, endpoint);
      setQuestions((prev) => {
        const updated = [...prev];
        const key = target === 'question' ? 'images' : 'explanationImages';
        updated[activeQuestion] = {
          ...updated[activeQuestion],
          [key]: [...updated[activeQuestion][key], url],
        };
        return updated;
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Rasm yuklashda xatolik');
    }
    setDropUploading(null);
  };

  // Qoralamani serverga jim tarzda saqlaydi — birinchi marta test yaratadi
  // (POST), keyingi chaqiruvlar o'sha bitta qatorni yangilaydi (PUT), shu
  // sababli har 30 soniyada yangi-yangi test yaratilmaydi. Faqat sarlavha va
  // fan tanlangandan keyin ishga tushadi; savollar tugallanmagan bo'lsa ham
  // saqlanadi — bu shunchaki qoralama, nashr qilish uchun emas.
  const saveDraftToServer = async (currentTestInfo: typeof testInfo, currentQuestions: QuestionForm[], currentDraftId: string | null) => {
    if (!currentTestInfo.titleUz || !currentTestInfo.subjectId) return;
    if (draftSaveInFlightRef.current) return; // Bir vaqtda ikkita saqlash — dublikat test yaratilishining oldini oladi
    draftSaveInFlightRef.current = true;
    try {
      const { categoryType, accessType, ...testData } = currentTestInfo;
      const isFree = accessType === 'free';
      const price = accessType === 'paid' ? currentTestInfo.price : 0;
      const questionsPayload = currentQuestions.map(mapQuestionForApi);

      if (!currentDraftId) {
        const res = await fetch('/api/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...testData, isFree, price, accessType, questions: questionsPayload }),
        });
        const data = await res.json();
        if (res.ok && data.test?.id) setDraftTestId(data.test.id);
      } else {
        await fetch(`/api/tests/${currentDraftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...testData, isFree, price, accessType }),
        });
        await fetch(`/api/teacher/tests/${currentDraftId}/questions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: questionsPayload }),
        });
      }
    } catch {
      // Jim tarzda ishlaydi — server bilan bog'lanish vaqtincha uzilsa ham
      // localStorage'dagi nusxa saqlanib qoladi, keyingi avtosaqlash urinishida davom etadi.
    } finally {
      draftSaveInFlightRef.current = false;
    }
  };

  // Auto-save to localStorage (va fon rejimida serverga) — oxirgi tahrirdan 30 soniya o'tgach
  useEffect(() => {
    const saveDraft = () => {
      const data = { testInfo, questions, draftTestId, timestamp: Date.now() };
      localStorage.setItem('teacher_test_draft', JSON.stringify(data));
      setLastSaved(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }));
      saveDraftToServer(testInfo, questions, draftTestId);
    };

    autoSaveTimerRef.current = setInterval(saveDraft, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [testInfo, questions, draftTestId]);

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
            if (parsed.draftTestId) setDraftTestId(parsed.draftTestId);
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

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length >= 5) return;
    const label = String.fromCharCode(65 + q.options.length);
    const updated = [...questions];
    updated[qIndex] = { ...q, options: [...q.options, { label, text: '', image: null }] };
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length <= 4) return;
    const updated = [...questions];
    updated[qIndex] = { ...q, options: q.options.filter((_, i) => i !== optIndex) };
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
    setActiveQuestion(questions.length);
  };

  // Savol turini almashtirish — TRUE_FALSE uchun variantlarni 2 taga
  // qat'iylashtiradi, boshqa turlarga qaytishda esa bo'sh 4 variant tiklaydi.
  const switchQuestionType = (qIndex: number, newType: QuestionForm['type']) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = updated[qIndex];
      let options = q.options;
      let correctAnswer = q.correctAnswer;

      if (newType === 'TRUE_FALSE') {
        options = [
          { label: 'A', text: "To'g'ri", image: null },
          { label: 'B', text: "Noto'g'ri", image: null },
        ];
        correctAnswer = '';
      } else if (q.type === 'TRUE_FALSE' && newType !== 'OPEN_ENDED') {
        options = [
          { label: 'A', text: '', image: null },
          { label: 'B', text: '', image: null },
          { label: 'C', text: '', image: null },
          { label: 'D', text: '', image: null },
        ];
        correctAnswer = '';
      } else if (newType === 'OPEN_ENDED' || newType === 'FILL_BLANK' || newType === 'MATCHING') {
        correctAnswer = '';
      } else if (newType === 'MULTIPLE_CHOICE' && correctAnswer.includes(',')) {
        correctAnswer = correctAnswer.split(',')[0] || '';
      }

      const blankAnswers = newType === 'FILL_BLANK' ? [''] : q.blankAnswers;
      const matchingPairs = newType === 'MATCHING' ? [{ left: '', right: '' }, { left: '', right: '' }] : q.matchingPairs;

      updated[qIndex] = { ...q, type: newType, options, correctAnswer, blankAnswers, matchingPairs };
      return updated;
    });
  };

  // "Bo'shliq qo'shish" tugmasi — savol matni ichiga kursor turgan joyga
  // "___" belgisini qo'yadi (LatexToolbar bilan bir xil insert-at-cursor naqsh).
  const insertBlankMarker = (qIndex: number) => {
    const el = questionTextRef.current;
    const text = questions[qIndex]?.text || '';
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);

    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], text: `${before}${FILL_BLANK_MARKER}${after}` };
      return updated;
    });

    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = before.length + FILL_BLANK_MARKER.length;
      el.setSelectionRange(caret, caret);
    });
  };

  // MULTIPLE_CHOICE/TRUE_FALSE: bitta javobni belgilaydi.
  // MULTI_SELECT: belgilarni to'plamga qo'shadi/olib tashlaydi (vergul bilan ajratilgan saqlanadi).
  const toggleCorrectAnswer = (qIndex: number, label: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = updated[qIndex];
      if (q.type === 'MULTI_SELECT') {
        const set = new Set((q.correctAnswer || '').split(',').filter(Boolean));
        if (set.has(label)) set.delete(label); else set.add(label);
        updated[qIndex] = { ...q, correctAnswer: Array.from(set).sort().join(',') };
      } else {
        updated[qIndex] = { ...q, correctAnswer: label };
      }
      return updated;
    });
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

    setSaving(true);
    try {
      // Exclude categoryType and accessType from the request body - only used client-side
      const { categoryType, accessType, ...testData } = testInfo;

      // Map accessType to isFree and price
      const isFree = accessType === 'free';
      const price = accessType === 'paid' ? testInfo.price : 0;
      const questionsPayload = validQuestions.map(mapQuestionForApi);

      // Avtosaqlash bu testni allaqachon serverda yaratgan bo'lishi mumkin —
      // shunday bo'lsa qayta POST qilib dublikat yaratish o'rniga o'sha
      // qatorni yangilaymiz.
      let testId = draftTestId;

      if (!testId) {
        const res = await fetch('/api/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...testData, isFree, price, accessType, questions: questionsPayload }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Xatolik yuz berdi");
          setSaving(false);
          return;
        }
        testId = data.test.id;
        setDraftTestId(testId);
      } else {
        const res = await fetch(`/api/tests/${testId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...testData, isFree, price, accessType }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Xatolik yuz berdi");
          setSaving(false);
          return;
        }
        const qRes = await fetch(`/api/teacher/tests/${testId}/questions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: questionsPayload }),
        });
        if (!qRes.ok) {
          const qData = await qRes.json();
          alert(qData.error || "Savollarni saqlashda xatolik");
          setSaving(false);
          return;
        }
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
      alert(publish ? "Test yaratildi va nashr qilindi! ✅" : "Test saqlandi (qoralama)!");
      router.push('/teacher');
    } catch (error) {
      alert("Server xatolik. Qayta urinib ko'ring.");
    }
    setSaving(false);
  };

  // AI IMPORT — matn, rasm yoki fayl (PDF/DOCX/TXT) qaysi biri bo'lishidan
  // qat'i nazar, bitta umumiy oqim orqali /api/ai/import ga yuboriladi
  const runAiImport = async (payload: Record<string, unknown>) => {
    setAiResult(null);
    try {
      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setAiResult(data);

      if (data.questions?.length > 0) {
        const imported: QuestionForm[] = data.questions.map((q: any) => ({
          text: q.text || '',
          images: q.images || [],
          options: q.type === 'OPEN_ENDED' ? [] : (q.options || [
            { label: 'A', text: '', image: null },
            { label: 'B', text: '', image: null },
            { label: 'C', text: '', image: null },
            { label: 'D', text: '', image: null },
          ]),
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          explanationImages: [],
          videoUrl: '',
          type: q.type === 'OPEN_ENDED' ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
          points: 1,
          topic: '',
          bloomLevel: '',
          difficulty: null,
          blankAnswers: [''],
          matchingPairs: [{ left: '', right: '' }, { left: '', right: '' }],
        }));
        setQuestions(imported);
        setActiveQuestion(0);
        setCurrentStep('questions');
      }
    } catch (error) {
      alert("AI xatolik. Qayta urinib ko'ring.");
    }
  };

  const handleAiImport = async () => {
    if (!aiText.trim()) {
      alert("Matn kiriting!");
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

  // AI orqali bo'sh variantlarga distraktor va mavzu/Bloom darajasi taklif qilish.
  // Faqat bo'sh maydonlarni to'ldiradi — o'qituvchi allaqachon yozgan narsani bosib o'tmaydi.
  const handleAiSuggest = async () => {
    const q = questions[activeQuestion];
    if (!q.text || !q.correctAnswer) return;
    setAiSuggestLoading(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: q.text,
          correctAnswer: q.correctAnswer,
          type: q.type,
          existingOptionTexts: q.options.filter((o) => o.text).map((o) => o.text),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Xatolik yuz berdi');
        return;
      }
      setQuestions((prev) => {
        const updated = [...prev];
        const current = updated[activeQuestion];
        let options = current.options;
        if ((current.type === 'MULTIPLE_CHOICE' || current.type === 'MULTI_SELECT') && data.distractors?.length) {
          let di = 0;
          options = current.options.map((o) => {
            if (!o.text && di < data.distractors.length) return { ...o, text: data.distractors[di++] };
            return o;
          });
        }
        updated[activeQuestion] = {
          ...current,
          options,
          topic: current.topic || data.topic || current.topic,
          bloomLevel: current.bloomLevel || data.bloomLevel || current.bloomLevel,
          difficulty: current.difficulty ?? data.difficulty ?? current.difficulty,
        };
        return updated;
      });
    } catch {
      alert("AI xatolik. Qayta urinib ko'ring.");
    }
    setAiSuggestLoading(false);
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
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => setActiveQuestion(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all ${
                  i === activeQuestion ? 'bg-primary-100 text-primary-700 font-medium' : 'hover:bg-gray-50 text-text-secondary'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {i + 1}-savol
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
            ))}
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

            {/* Question text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">
                  Savol matni * <span className="text-xs text-text-secondary">(LaTeX: $formula$)</span>
                </label>
                <ImageUploadButton
                  endpoint="questionImage"
                  label="Rasm qo'shish"
                  onUpload={(url) => {
                    const updated = [...questions];
                    updated[activeQuestion] = {
                      ...updated[activeQuestion],
                      images: [...updated[activeQuestion].images, url],
                    };
                    setQuestions(updated);
                  }}
                />
              </div>
              <LatexToolbar
                targetRef={questionTextRef}
                value={questions[activeQuestion]?.text || ''}
                onChange={(text) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], text };
                  setQuestions(updated);
                }}
                className="mb-1.5"
              />
              <textarea
                ref={questionTextRef}
                value={questions[activeQuestion]?.text || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], text: e.target.value };
                  setQuestions(updated);
                }}
                onPaste={(e) => {
                  const file = extractPastedImageFile(e);
                  if (file) {
                    e.preventDefault();
                    handleImageDropOrPaste(file, 'question');
                  }
                }}
                onDrop={(e) => {
                  const file = extractDroppedImageFile(e);
                  if (file) {
                    e.preventDefault();
                    handleImageDropOrPaste(file, 'question');
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                placeholder="Savolni kiriting... (rasmni shu yerga sudrab tashlashingiz yoki joylashingiz mumkin)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none font-mono text-sm"
              />
              {dropUploading === 'question' && (
                <p className="text-xs text-primary-600 mt-1 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Rasm yuklanmoqda...
                </p>
              )}
              {/* Question images preview */}
              <ImagePreviewList
                images={questions[activeQuestion]?.images || []}
                onRemove={(index) => {
                  const updated = [...questions];
                  updated[activeQuestion] = {
                    ...updated[activeQuestion],
                    images: updated[activeQuestion].images.filter((_, i) => i !== index),
                  };
                  setQuestions(updated);
                }}
              />
              {questions[activeQuestion]?.text && (
                <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-600 mb-1 font-medium">Ko&apos;rinishi:</p>
                  <LatexRenderer content={questions[activeQuestion].text} className="text-sm text-text-primary" />
                </div>
              )}
            </div>

            {/* Options */}
            <div>
              {/* Question type toggle */}
              <div className="mb-4">
                <label className="text-sm font-medium text-text-primary block mb-2">Savol turi</label>
                <div className="inline-flex flex-wrap rounded-xl border border-border overflow-hidden">
                  {([
                    { key: 'MULTIPLE_CHOICE' as const, label: 'Variantli' },
                    { key: 'MULTI_SELECT' as const, label: "Ko'p tanlovli" },
                    { key: 'TRUE_FALSE' as const, label: "To'g'ri/Noto'g'ri" },
                    { key: 'OPEN_ENDED' as const, label: 'Ochiq' },
                    { key: 'FILL_BLANK' as const, label: "Bo'shliqni to'ldirish" },
                    { key: 'MATCHING' as const, label: 'Moslashtirish' },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => switchQuestionType(activeQuestion, opt.key)}
                      className={`px-4 py-2 text-sm font-medium transition-all ${
                        questions[activeQuestion]?.type === opt.key
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-text-secondary hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {questions[activeQuestion]?.type === 'OPEN_ENDED' && "Ochiq savol — foydalanuvchi javobni qo'lda kiritadi (masalan: son, formula natijasi)"}
                  {questions[activeQuestion]?.type === 'MULTIPLE_CHOICE' && 'Variantli savol — foydalanuvchi bitta to\'g\'ri variantni tanlaydi'}
                  {questions[activeQuestion]?.type === 'MULTI_SELECT' && "Ko'p tanlovli savol — foydalanuvchi bir nechta to'g'ri variantni belgilashi mumkin"}
                  {questions[activeQuestion]?.type === 'TRUE_FALSE' && "To'g'ri/Noto'g'ri savol — ikkita variantdan biri tanlanadi"}
                  {questions[activeQuestion]?.type === 'FILL_BLANK' && "Bo'shliqni to'ldirish — savol matni ichiga uchta pastki chiziqcha (___) qo'yiladi, talaba shu joyga javob yozadi"}
                  {questions[activeQuestion]?.type === 'MATCHING' && "Moslashtirish — talaba chap ustundagi har bir elementga mos o'ng ustun elementini tanlaydi"}
                </p>
              </div>

              {/* FILL_BLANK: per-blank accepted answers */}
              {questions[activeQuestion]?.type === 'FILL_BLANK' ? (
                <FillBlankEditor
                  question={questions[activeQuestion]}
                  onInsertBlank={() => insertBlankMarker(activeQuestion)}
                  onBlankAnswersChange={(blankAnswers) => {
                    const updated = [...questions];
                    updated[activeQuestion] = { ...updated[activeQuestion], blankAnswers };
                    setQuestions(updated);
                  }}
                />
              ) : questions[activeQuestion]?.type === 'MATCHING' ? (
                <MatchingEditor
                  pairs={questions[activeQuestion].matchingPairs}
                  onChange={(matchingPairs) => {
                    const updated = [...questions];
                    updated[activeQuestion] = { ...updated[activeQuestion], matchingPairs };
                    setQuestions(updated);
                  }}
                />
              ) : questions[activeQuestion]?.type === 'OPEN_ENDED' ? (
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-2">
                    To&apos;g&apos;ri javob (matn) *
                  </label>
                  <input
                    type="text"
                    value={questions[activeQuestion]?.correctAnswer || ''}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[activeQuestion] = { ...updated[activeQuestion], correctAnswer: e.target.value };
                      setQuestions(updated);
                    }}
                    placeholder="Javobni kiriting (masalan: 42, 3.14)"
                    className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
                  />
                  <p className="text-xs text-text-secondary mt-2">
                    Javobni talaba yozishi kerak bo&apos;lgan shaklda kiriting. Katta-kichik harf farq qilmaydi, lekin formatga e&apos;tibor bering (masalan: 3.14, emas 3,14).
                  </p>
                </div>
              ) : (
              /* MULTIPLE_CHOICE / TRUE_FALSE / MULTI_SELECT: options */
              <div>
              <label className="text-sm font-medium text-text-primary block mb-3">Javob variantlari *</label>
              <div className="space-y-3">
                {questions[activeQuestion]?.options.map((opt, optIndex) => {
                  const isMulti = questions[activeQuestion]?.type === 'MULTI_SELECT';
                  const isChecked = isMulti
                    ? (questions[activeQuestion]?.correctAnswer || '').split(',').includes(opt.label)
                    : questions[activeQuestion]?.correctAnswer === opt.label;
                  return (
                  <div key={optIndex} className="space-y-1">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleCorrectAnswer(activeQuestion, opt.label)}
                        className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border-2 text-xs font-bold mt-2 transition-all ${isMulti ? 'rounded-md' : 'rounded-full'} ${
                          isChecked
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-border text-text-secondary hover:border-primary-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                        <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[activeQuestion].options[optIndex].text = e.target.value;
                              setQuestions(updated);
                            }}
                            placeholder={`${opt.label} variantini kiriting`}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm"
                          />
                          {questions[activeQuestion]?.type !== 'TRUE_FALSE' && (
                            <ImageUploadButton
                              endpoint="optionImage"
                              label="Rasm"
                              onUpload={(url) => {
                                const updated = [...questions];
                                updated[activeQuestion].options[optIndex].image = url;
                                setQuestions(updated);
                              }}
                            />
                          )}
                          {optIndex === 4 && (
                            <button onClick={() => removeOption(activeQuestion, optIndex)} className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        {/* LaTeX preview for option */}
                        {opt.text && opt.text.includes('$') && (
                          <div className="ml-1 px-2 py-1 rounded bg-blue-50 text-xs">
                            <LatexRenderer content={opt.text} className="text-text-primary" />
                          </div>
                        )}
                        {/* Option image preview */}
                        {opt.image && (
                          <div className="relative inline-block ml-1">
                            <img
                              src={opt.image}
                              alt={`${opt.label} rasmi`}
                              className="h-12 w-auto object-contain rounded-lg border border-border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...questions];
                                updated[activeQuestion].options[optIndex].image = null;
                                setQuestions(updated);
                              }}
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px]"
                            >
                              &times;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
                {questions[activeQuestion]?.type !== 'TRUE_FALSE' && questions[activeQuestion]?.options.length < 5 && (
                  <button onClick={() => addOption(activeQuestion)} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-11">
                    <Plus size={12} /> E variantini qo&apos;shish
                  </button>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-2 ml-11">
                {questions[activeQuestion]?.type === 'MULTI_SELECT'
                  ? "Yashil kvadrat = to'g'ri javob. Bir nechtasini belgilashingiz mumkin."
                  : "Yashil doira = to'g'ri javob. Belgilash uchun harf tugmasini bosing."}
              </p>
              </div>
              )}
            </div>

            {/* Topic tag, Bloom level & difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-border">
              <div className="sm:col-span-3 flex items-center justify-between">
                <p className="text-xs font-medium text-text-secondary">Mavzu, daraja va variantlarni AI to&apos;ldirsin</p>
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={aiSuggestLoading || !questions[activeQuestion]?.text || !questions[activeQuestion]?.correctAnswer}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {aiSuggestLoading ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                  AI bilan to&apos;ldirish
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Mavzu tegi (ixtiyoriy)</label>
                <input
                  type="text"
                  value={questions[activeQuestion]?.topic || ''}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[activeQuestion] = { ...updated[activeQuestion], topic: e.target.value };
                    setQuestions(updated);
                  }}
                  placeholder="Masalan: Kvadrat tenglama"
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Bloom darajasi (ixtiyoriy)</label>
                <select
                  value={questions[activeQuestion]?.bloomLevel || ''}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[activeQuestion] = { ...updated[activeQuestion], bloomLevel: e.target.value };
                    setQuestions(updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
                >
                  <option value="">Tanlanmagan</option>
                  {BLOOM_LEVELS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Qiyinlik darajasi (ixtiyoriy)</label>
                <select
                  value={questions[activeQuestion]?.difficulty ?? ''}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[activeQuestion] = { ...updated[activeQuestion], difficulty: e.target.value ? Number(e.target.value) : null };
                    setQuestions(updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
                >
                  <option value="">Tanlanmagan</option>
                  <option value="1">1 — Juda oson</option>
                  <option value="2">2 — Oson</option>
                  <option value="3">3 — O&apos;rta</option>
                  <option value="4">4 — Qiyin</option>
                  <option value="5">5 — Juda qiyin</option>
                </select>
              </div>
              <p className="text-xs text-text-secondary sm:col-span-3">
                Bu teglar savol darajasidagi tahlil, shaxsiylashtirilgan tavsiyalar va DTM Online&apos;dagi qiyinlik balanslash uchun ishlatiladi.
              </p>
            </div>

            {/* Explanation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">Yozma yechim (ixtiyoriy)</label>
                <ImageUploadButton
                  endpoint="solutionImage"
                  label="Yechim rasmi"
                  onUpload={(url) => {
                    const updated = [...questions];
                    updated[activeQuestion] = {
                      ...updated[activeQuestion],
                      explanationImages: [...updated[activeQuestion].explanationImages, url],
                    };
                    setQuestions(updated);
                  }}
                />
              </div>
              <LatexToolbar
                targetRef={explanationRef}
                value={questions[activeQuestion]?.explanation || ''}
                onChange={(explanation) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], explanation };
                  setQuestions(updated);
                }}
                className="mb-1.5"
              />
              <textarea
                ref={explanationRef}
                value={questions[activeQuestion]?.explanation || ''}
                onChange={(e) => {
                  const updated = [...questions];
                  updated[activeQuestion] = { ...updated[activeQuestion], explanation: e.target.value };
                  setQuestions(updated);
                }}
                onPaste={(e) => {
                  const file = extractPastedImageFile(e);
                  if (file) {
                    e.preventDefault();
                    handleImageDropOrPaste(file, 'explanation');
                  }
                }}
                onDrop={(e) => {
                  const file = extractDroppedImageFile(e);
                  if (file) {
                    e.preventDefault();
                    handleImageDropOrPaste(file, 'explanation');
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                placeholder="Yechimni kiriting... (rasmni shu yerga sudrab tashlashingiz yoki joylashingiz mumkin)"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all resize-none text-sm"
              />
              {dropUploading === 'explanation' && (
                <p className="text-xs text-primary-600 mt-1 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Rasm yuklanmoqda...
                </p>
              )}
              {/* Explanation images preview */}
              <ImagePreviewList
                images={questions[activeQuestion]?.explanationImages || []}
                onRemove={(index) => {
                  const updated = [...questions];
                  updated[activeQuestion] = {
                    ...updated[activeQuestion],
                    explanationImages: updated[activeQuestion].explanationImages.filter((_, i) => i !== index),
                  };
                  setQuestions(updated);
                }}
              />
            </div>

            {/* Video */}
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
          </div>
        </motion.div>
      )}

      {/* STEP: AI IMPORT */}
      {currentStep === 'ai-import' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-6">
          <div className="text-center mb-4">
            <Bot size={32} className="text-primary-600 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-text-primary">AI bilan import qilish</h2>
            <p className="text-sm text-text-secondary">Test matnini kiriting — AI savollarni avtomatik ajratib beradi</p>
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

            {/* Questions preview */}
            <div className="space-y-4">
              {questions.filter(q => q.text).map((q, i) => (
                <div key={i} className="p-4 rounded-xl border border-border">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm text-text-primary mb-3">
                        <LatexRenderer content={q.text} />
                      </div>
                      {q.type === 'FILL_BLANK' ? (
                        <div className="p-3 rounded-lg bg-gray-50 border border-border space-y-1">
                          <p className="text-xs text-text-secondary mb-1">Bo&apos;shliqlar:</p>
                          {q.blankAnswers.filter(Boolean).map((b, bi) => (
                            <p key={bi} className="text-sm font-medium text-green-700">{bi + 1}. {b}</p>
                          ))}
                        </div>
                      ) : q.type === 'MATCHING' ? (
                        <div className="p-3 rounded-lg bg-gray-50 border border-border space-y-1">
                          <p className="text-xs text-text-secondary mb-1">Juftliklar:</p>
                          {q.matchingPairs.filter((p) => p.left && p.right).map((p, pi) => (
                            <p key={pi} className="text-sm font-medium text-green-700">{p.left} &harr; {p.right}</p>
                          ))}
                        </div>
                      ) : q.type === 'OPEN_ENDED' ? (
                        <div className="p-3 rounded-lg bg-gray-50 border border-border">
                          <p className="text-xs text-text-secondary mb-1">Javob:</p>
                          <p className="text-sm font-medium text-green-700">{q.correctAnswer}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {q.options.filter(o => o.text).map((opt) => {
                            const isCorrectOpt = q.type === 'MULTI_SELECT'
                              ? q.correctAnswer.split(',').includes(opt.label)
                              : opt.label === q.correctAnswer;
                            return (
                            <div
                              key={opt.label}
                              className={`flex items-start gap-2 p-2.5 rounded-lg text-sm ${
                                isCorrectOpt
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-gray-50 border border-gray-100'
                              }`}
                            >
                              <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 ${q.type === 'MULTI_SELECT' ? 'rounded-md' : 'rounded-full'} ${
                                isCorrectOpt
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {opt.label}
                              </span>
                              <span className="flex-1 pt-0.5">
                                <LatexRenderer content={opt.text} />
                              </span>
                            </div>
                            );
                          })}
                        </div>
                      )}
                      {q.explanation && (
                        <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-xs text-blue-600 font-medium mb-1">Yechim:</p>
                          <div className="text-xs text-text-primary">
                            <LatexRenderer content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {questions.filter(q => q.text).length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                <p>Hali savollar kiritilmagan. &quot;Savollar&quot; tabiga o&apos;ting.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

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
