'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import LatexRenderer from '@/components/ui/LatexRenderer';
import SecureYouTubePlayer from '@/components/ui/SecureYouTubePlayer';
import {
  CheckCircle, XCircle, SkipForward, Clock, Trophy,
  Video, FileText, ArrowLeft, Share2, RotateCcw,
  Loader2, AlertCircle, ChevronDown, ChevronUp, Play,
} from 'lucide-react';

interface QuestionOption {
  label: string;
  text: string;
  image: string | null;
}

interface QuestionData {
  id: string;
  text: string;
  images: string[];
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
  points: number;
  order: number;
}

interface ResultData {
  id: string;
  userId: string;
  testId: string;
  score: number;
  maxScore: number;
  percentage: number;
  answers: { questionId: string; answer: string; isCorrect: boolean; timeSpent?: number }[];
  timeSpent: number;
  completedAt: string;
  test: {
    id: string;
    titleUz: string;
    titleRu: string | null;
    titleEn: string | null;
    videoSolution: string | null;
    writtenSolution: string | null;
    duration: number;
    questionCount: number;
    questions: QuestionData[];
    subject: { nameUz: string; nameRu: string; nameEn: string };
  };
}

export default function ResultPage() {
  const params = useParams();
  const resultId = params.id as string;

  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  const [showVideo, setShowVideo] = useState<Record<string, boolean>>({});
  const [showGeneralVideo, setShowGeneralVideo] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Fetch result data
  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`/api/results/${resultId}`);
        const data = await res.json();
        if (res.ok && data.result) {
          setResult(data.result);
        } else {
          setError(data.error || 'Natija topilmadi');
        }
      } catch (err) {
        setError('Server bilan bog\'lanishda xatolik');
      }
      setLoading(false);
    }
    fetchResult();
  }, [resultId]);

  // Share function
  const handleShare = async () => {
    if (!result) return;

    const scoreEmoji = result.percentage >= 80 ? '🏆' : result.percentage >= 60 ? '✅' : '📚';
    const shareText = `${scoreEmoji} Men "${result.test.titleUz}" testida ${result.percentage}% natija oldim!\n\n✅ To'g'ri: ${result.answers.filter(a => a.isCorrect).length}/${result.test.questionCount}\n⏱ Vaqt: ${formatTime(result.timeSpent)}\n\nSen ham sinab ko'r 👇\n${window.location.origin}/tests/${result.testId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${result.test.titleUz} - Natija`,
          text: shareText,
          url: `${window.location.origin}/tests/${result.testId}`,
        });
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        await copyToClipboard(shareText);
      }
    } else {
      await copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleExplanation = (questionId: string) => {
    setShowExplanation(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const toggleVideo = (questionId: string) => {
    setShowVideo(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-text-secondary">Natija yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Xatolik</h2>
        <p className="text-text-secondary">{error || 'Natija topilmadi'}</p>
        <Link href="/tests" className="btn-primary mt-6 inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Testlarga qaytish
        </Link>
      </div>
    );
  }

  const correctCount = result.answers.filter(a => a.isCorrect).length;
  const incorrectCount = result.answers.filter(a => !a.isCorrect && a.answer).length;
  const skippedCount = result.answers.filter(a => !a.answer).length;
  const hours = Math.floor(result.timeSpent / 3600);
  const minutes = Math.floor((result.timeSpent % 3600) / 60);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/tests"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors"
      >
        <ArrowLeft size={16} />
        Testlarga qaytish
      </Link>

      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-elevated p-8 text-center"
      >
        <h1 className="text-xl font-bold text-text-primary mb-6">{result.test.titleUz}</h1>

        {/* Score circle */}
        <div className="relative inline-flex items-center justify-center w-40 h-40 mb-6">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80" cy="80" r="70"
              fill="none" stroke="#e5e7eb" strokeWidth="12"
            />
            <circle
              cx="80" cy="80" r="70"
              fill="none"
              stroke={result.percentage >= 80 ? '#22c55e' : result.percentage >= 60 ? '#eab308' : '#ef4444'}
              strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - result.percentage / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-3xl font-bold text-text-primary">{result.percentage}%</span>
            <p className="text-xs text-text-secondary">{result.score}/{result.maxScore}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-3 rounded-xl bg-green-50">
            <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
            <span className="text-lg font-bold text-green-700">{correctCount}</span>
            <p className="text-xs text-green-600">To&apos;g&apos;ri</p>
          </div>
          <div className="p-3 rounded-xl bg-red-50">
            <XCircle size={20} className="text-red-600 mx-auto mb-1" />
            <span className="text-lg font-bold text-red-700">{incorrectCount}</span>
            <p className="text-xs text-red-600">Noto&apos;g&apos;ri</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <SkipForward size={20} className="text-gray-600 mx-auto mb-1" />
            <span className="text-lg font-bold text-gray-700">{skippedCount}</span>
            <p className="text-xs text-gray-600">Javobsiz</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50">
            <Clock size={20} className="text-blue-600 mx-auto mb-1" />
            <span className="text-lg font-bold text-blue-700">
              {hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes} daq`}
            </span>
            <p className="text-xs text-blue-600">Vaqt</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link
            href={`/tests/${result.testId}/solve`}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Qayta yechish
          </Link>
          <button
            onClick={handleShare}
            className="btn-ghost flex items-center gap-2 relative"
          >
            <Share2 size={16} />
            {shareSuccess ? 'Nusxalandi!' : 'Ulashish'}
          </button>
        </div>
      </motion.div>

      {/* Questions review */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card p-6"
      >
        <h2 className="text-lg font-bold text-text-primary mb-4">Savollar tahlili</h2>

        {/* General video solution button */}
        {result.test.videoSolution && (
          <div className="mb-6">
            <button
              onClick={() => setShowGeneralVideo(!showGeneralVideo)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-primary-50 border-2 border-primary-200 hover:border-primary-400 hover:bg-primary-100 transition-all"
            >
              <Play size={20} className="text-primary-600" />
              <span className="font-semibold text-primary-700">Umumiy videoyechim</span>
            </button>
            {showGeneralVideo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4"
              >
                <SecureYouTubePlayer
                  videoUrl={result.test.videoSolution}
                  title={`${result.test.titleUz} - Videoyechim`}
                  onClose={() => setShowGeneralVideo(false)}
                />
              </motion.div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {result.test.questions.map((question, i) => {
            const answerRecord = result.answers.find(a => a.questionId === question.id);
            const userAnswer = answerRecord?.answer || '';
            const isCorrect = answerRecord?.isCorrect || false;
            const isSkipped = !userAnswer;
            const isExpanded = expandedQuestion === question.id;

            return (
              <div
                key={question.id}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  isCorrect
                    ? 'border-green-200 bg-green-50/30'
                    : isSkipped
                    ? 'border-gray-200 bg-gray-50/30'
                    : 'border-red-200 bg-red-50/30'
                }`}
              >
                {/* Question header - clickable */}
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCorrect ? 'bg-green-100 text-green-700' : isSkipped ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {isCorrect ? <CheckCircle size={16} /> : isSkipped ? <SkipForward size={14} /> : <XCircle size={16} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {i + 1}. <LatexRenderer content={question.text} />
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      {!isSkipped && (
                        <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                          Sizning javob: {userAnswer}
                        </span>
                      )}
                      {isSkipped && (
                        <span className="text-gray-500">Javob berilmagan</span>
                      )}
                      {!isCorrect && !isSkipped && (
                        <span className="text-green-600">
                          To&apos;g&apos;ri javob: {question.correctAnswer}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {question.explanation && (
                      <span className="p-1.5 rounded-lg bg-blue-50" title="Yozma yechim bor">
                        <FileText size={14} className="text-blue-600" />
                      </span>
                    )}
                    {question.videoUrl && (
                      <span className="p-1.5 rounded-lg bg-purple-50" title="Video yechim bor">
                        <Video size={14} className="text-purple-600" />
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-inherit px-4 pb-4"
                  >
                    {/* Question images */}
                    {question.images && question.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {question.images.map((img, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={img}
                            alt={`Savol rasmi ${imgIdx + 1}`}
                            className="max-h-48 w-auto object-contain rounded-lg border border-border"
                          />
                        ))}
                      </div>
                    )}

                    {/* All options */}
                    <div className="space-y-2 mt-4">
                      {(question.options as QuestionOption[]).map((option) => {
                        const isUserChoice = option.label === userAnswer;
                        const isCorrectOption = option.label === question.correctAnswer;
                        const isWrongChoice = isUserChoice && !isCorrectOption;

                        return (
                          <div
                            key={option.label}
                            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
                              isCorrectOption
                                ? 'border-green-400 bg-green-50'
                                : isWrongChoice
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-100 bg-white'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
                              isCorrectOption
                                ? 'border-green-500 bg-green-500 text-white'
                                : isWrongChoice
                                ? 'border-red-500 bg-red-500 text-white'
                                : 'border-gray-200 text-gray-500'
                            }`}>
                              {option.label}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <LatexRenderer content={option.text} className="text-sm text-text-primary" />
                              {option.image && (
                                <img
                                  src={option.image}
                                  alt={`Variant ${option.label}`}
                                  className="mt-2 max-h-32 w-auto object-contain rounded-lg border border-border"
                                />
                              )}
                            </div>
                            {isCorrectOption && (
                              <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-1" />
                            )}
                            {isWrongChoice && (
                              <XCircle size={16} className="text-red-600 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Solution buttons */}
                    <div className="flex items-center gap-3 mt-4">
                      {question.explanation && (
                        <button
                          onClick={() => toggleExplanation(question.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            showExplanation[question.id]
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          }`}
                        >
                          <FileText size={16} />
                          Yozma yechim
                        </button>
                      )}
                      {question.videoUrl && (
                        <button
                          onClick={() => toggleVideo(question.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            showVideo[question.id]
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          <Video size={16} />
                          Videoyechim
                        </button>
                      )}
                    </div>

                    {/* Written solution content */}
                    {showExplanation[question.id] && question.explanation && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200"
                      >
                        <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                          <FileText size={14} /> Yozma yechim
                        </h4>
                        <div className="text-sm text-text-primary leading-relaxed">
                          <LatexRenderer content={question.explanation} />
                        </div>
                        {question.explanationImages && question.explanationImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {question.explanationImages.map((img, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={img}
                                alt={`Yechim rasmi ${imgIdx + 1}`}
                                className="max-h-48 w-auto object-contain rounded-lg border border-blue-100"
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Video solution content */}
                    {showVideo[question.id] && question.videoUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4"
                      >
                        <SecureYouTubePlayer
                          videoUrl={question.videoUrl}
                          title={`${i + 1}-savol videoyechim`}
                          onClose={() => toggleVideo(question.id)}
                        />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
