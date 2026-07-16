'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import LatexRenderer from '@/components/ui/LatexRenderer';
import SecureYouTubePlayer from '@/components/ui/SecureYouTubePlayer';
import PremiumCTA from '@/components/ui/PremiumCTA';
import {
  CheckCircle, XCircle, SkipForward, Clock, Trophy,
  Video, FileText, ArrowLeft, Share2, RotateCcw,
  Loader2, AlertCircle, Play,
  X, Copy, ExternalLink,
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
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  const [showVideo, setShowVideo] = useState<Record<string, boolean>>({});
  const [showGeneralVideo, setShowGeneralVideo] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

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
  const handleShare = () => {
    setShowShareModal(true);
  };

  const getShareUrl = () => {
    if (!result) return '';
    return `${window.location.origin}/share/${result.id}`;
  };

  const getShareText = () => {
    if (!result) return '';
    const scoreEmoji = result.percentage >= 80 ? '🏆' : result.percentage >= 60 ? '✅' : '📚';
    return `${scoreEmoji} Men "${result.test.titleUz}" testidan ${result.percentage}% natija oldim!\n\nSiz ham o'zingizni sinab ko'ring va o'rganing!\n\nEduPrime.uz - bilimingizni sinash va oshirish platformasi`;
  };

  const shareToTelegram = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(getShareText());
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank');
    setShowShareModal(false);
  };

  const shareToFacebook = () => {
    const url = getShareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    setShowShareModal(false);
  };

  const shareToInstagram = () => {
    // Instagram doesn't have direct share API - copy link
    copyToClipboard(getShareUrl());
    window.open('https://www.instagram.com/', '_blank');
    setShowShareModal(false);
  };

  const copyShareLink = () => {
    const url = getShareUrl();
    const fullText = `${getShareText()}\n\n${url}`;
    copyToClipboard(fullText);
    setShowShareModal(false);
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-text-primary">Natijani ulashish</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-text-secondary" />
              </button>
            </div>

            {/* Share preview */}
            <div className="p-4 rounded-xl bg-primary-50 border border-primary-200 mb-6">
              <p className="text-sm text-text-primary">
                {result.percentage >= 80 ? '🏆' : result.percentage >= 60 ? '✅' : '📚'} Men &ldquo;{result.test.titleUz}&rdquo; testidan <strong>{result.percentage}%</strong> natija oldim!
              </p>
              <p className="text-sm text-text-secondary mt-2">
                Siz ham o&apos;zingizni sinab ko&apos;ring va o&apos;rganing!
              </p>
            </div>

            {/* Social buttons */}
            <div className="space-y-3">
              <button
                onClick={shareToTelegram}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0088cc] text-white font-medium hover:bg-[#0077b5] transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram orqali ulashish
              </button>

              <button
                onClick={shareToInstagram}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-medium hover:opacity-90 transition-opacity"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
                Instagram orqali ulashish
              </button>

              <button
                onClick={shareToFacebook}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1877f2] text-white font-medium hover:bg-[#166fe5] transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook orqali ulashish
              </button>

              <button
                onClick={copyShareLink}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 text-text-primary font-medium hover:bg-gray-200 transition-colors"
              >
                <Copy size={22} className="text-text-secondary" />
                Havolani nusxalash
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Premium CTA */}
      <PremiumCTA variant="full" />

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
                {/* Question header */}
                <div className="flex items-center gap-4 p-4">
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
                  </div>
                </div>

                {/* Always visible content */}
                <div className="border-t border-inherit px-4 pb-4">
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

                  {/* All options - always visible */}
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

                  {/* Written solution content - only after clicking */}
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

                  {/* Video solution content - only after clicking */}
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
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
