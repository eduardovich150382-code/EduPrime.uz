import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import ResultQuestionMap from '../ResultQuestionMap';
import ResultRetakeFooter from '../ResultRetakeFooter';
import PracticeResult, { type PracticeReview, type PracticeReviewQuestion } from '../PracticeResult';
import ExamWorkspace from '../ExamWorkspace';
import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

function render(child: React.ReactNode, locale = 'uz') {
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={locale === 'ru' ? ru : locale === 'en' ? en : uz} timeZone="Asia/Tashkent">{child}</NextIntlClientProvider>);
}

const section = (key: string) => [`section:${key}`];
// renderToStaticMarkup apostrofni qochiradi.
const esc = (text: string) => text.replace(/'/g, '&#x27;');

describe("ResultQuestionMap — mashqdagi qism to'plam", () => {
  // Natija sahifasida: 1-4 fizika, 5-6 kasb, 7-8 pedagogika. Mashqqa 2, 4, 5, 6, 8 tushgan.
  const questions = [
    { id: 'a', tags: section('fizika') }, { id: 'b', tags: section('fizika') },
    { id: 'c', tags: section('kasb-standarti') }, { id: 'd', tags: section('kasb-standarti') },
    { id: 'e', tags: section('pedagogika') },
  ];
  const numbers: Record<string, number> = { a: 2, b: 4, c: 5, d: 6, e: 8 };
  const answers = [{ questionId: 'a', answer: 'A', isCorrect: true }, { questionId: 'b', answer: 'B', isCorrect: false }];

  it("kataklarda asl raqamlar; uzluksiz bo'lmagan bo'limda son, uzluksizda oraliq", () => {
    const html = render(<ResultQuestionMap questions={questions} answers={answers} categoryType="ATTESTATION" numberOf={(id) => numbers[id]} onSelect={() => {}} />);
    // Fizika: 2 va 4 — uzluksiz emas → "(2 ta)" ko'rinishi; kasb: 5–6 → oraliq.
    expect(html).toContain(uz.exam.sectionCount.replace('{name}', uz.questionSections.fizika).replace('{count}', '2'));
    expect(html).toContain(uz.exam.sectionRange.replace('{name}', uz.questionSections['kasb-standarti']).replace('{from}', '5').replace('{to}', '6'));
    expect(html).toContain(uz.exam.sectionRange.replace('{name}', uz.questionSections.pedagogika).replace('{from}', '8').replace('{to}', '8'));
    for (const n of [2, 4, 5, 6, 8]) expect(html).toMatch(new RegExp(`>${n}<svg`));
    expect(html).not.toMatch(/>1<svg/);
    // Bo'lim bali qism to'plam bo'yicha: fizika 1/2.
    expect(html).toContain(uz.exam.sectionScore.replace('{score}', '1').replace('{max}', '2'));
  });

  it('numberOf berilmasa — avvalgidek tartib raqami', () => {
    const html = render(<ResultQuestionMap questions={questions} answers={answers} categoryType={null} onSelect={() => {}} />);
    for (const n of [1, 2, 3, 4, 5]) expect(html).toMatch(new RegExp(`>${n}<svg`));
  });
});

describe('ResultRetakeFooter', () => {
  const props = { retakeHref: '/tests/t1/solve', backHref: '/tests', backLabel: 'Ortga', history: null, currentId: 'r1', returnTo: null };

  it.each(['uz', 'ru', 'en'])('%s: mashq tugmasi ikkinchi darajali, soni bilan, ≥44px', (locale) => {
    const html = render(<ResultRetakeFooter {...props} practiceHref="/tests/t1/solve?practice=r1" practiceCount={3} />, locale);
    const messages = locale === 'ru' ? ru : locale === 'en' ? en : uz;
    expect(html).toContain(messages.results.retakeWrongOnly.replace('{count}', '3'));
    expect(html).toContain('href="' + (locale === 'uz' ? '' : `/${locale}`) + '/tests/t1/solve?practice=r1"');
    const practiceLink = html.match(/<a class="([^"]*)" href="[^"]*practice=r1"/)![1];
    expect(practiceLink).toContain('border-primary-200');
    expect(practiceLink).toContain('bg-primary-50');
    expect(practiceLink).toContain('text-primary-800');
    expect(practiceLink).toContain('min-h-11');
  });

  it('mashq havolasi berilmasa — tugma yo\'q, joylashuv avvalgidek', () => {
    const html = render(<ResultRetakeFooter {...props} />);
    expect(html).not.toContain('practice=');
    expect(html).toContain('sm:shrink-0');
  });
});

function reviewQuestion(id: string, number: number): PracticeReviewQuestion {
  return {
    id, number, text: `Savol ${id}`, images: [], points: 1, tags: [], type: 'MULTIPLE_CHOICE', correctAnswer: 'A',
    options: [{ label: 'A', text: 'to\'g\'ri', image: null }, { label: 'B', text: 'xato', image: null }],
    explanation: null, explanationImages: [], videoUrl: null, distractorWhy: null,
  };
}

describe('PracticeResult', () => {
  const review: PracticeReview = {
    correct: 1, total: 3, categoryType: 'ATTESTATION',
    questions: [reviewQuestion('x', 7), reviewQuestion('y', 2), reviewQuestion('z', 12)],
    answers: [
      { questionId: 'x', answer: 'A', isCorrect: true },
      { questionId: 'y', answer: 'B', isCorrect: false },
      { questionId: 'z', answer: '', isCorrect: false },
    ],
  };

  it("N tadan K tasi, qolgan xatolar soni, natijaga qaytish; ball/100 va toifa yo'q", () => {
    const html = render(<PracticeResult review={review} order={['z', 'x', 'y']} backHref="/results/r1" onRetry={() => {}} />);
    expect(html).toContain(esc(uz.exam.practice.summary.replace('{total}', '3').replace('{correct}', '1')));
    expect(html).toContain(uz.exam.practice.retryRemaining.replace('{count}', '2'));
    expect(html).toContain('href="/results/r1"');
    expect(html).not.toContain('/100');
    expect(html).not.toContain(uz.exam.legendCorrect.replace('{count}', '0'));
    // Tahlil mashqdagi tartibda, asl raqamlar bilan.
    const at = (n: number) => html.indexOf(`text-text-primary">${n}. <span`);
    expect(at(12)).toBeGreaterThan(-1);
    expect(at(12)).toBeLessThan(at(7));
    expect(at(7)).toBeLessThan(at(2));
  });

  it("hammasi to'g'ri — qayta yechish tugmasi yo'q", () => {
    const allRight = { ...review, correct: 3, answers: review.answers.map((a) => ({ ...a, answer: 'A', isCorrect: true })) };
    const html = render(<PracticeResult review={allRight} order={['x', 'y', 'z']} backHref="/results/r1" onRetry={() => {}} />);
    expect(html).not.toContain(uz.exam.practice.retryRemaining.split(' (')[0]);
  });
});

describe('ExamWorkspace — mashq rejimi', () => {
  const question = { id: 'q1', text: 'Savol', images: [], type: 'MULTIPLE_CHOICE', options: [{ label: 'A', text: '1', image: null }] };
  const props = {
    title: 'Test', questions: [question], current: 0, answers: {}, flagged: new Set<number>(), totalSeconds: 600,
    paused: false, submitting: false, autoNext: true, onAutoNext: () => {}, onAnswer: () => {}, onNavigate: () => {},
    onFlag: () => {}, onPause: () => {}, onResume: () => {}, onFinish: () => {}, showFinish: false, onShowFinish: () => {}, physics: false,
  };

  it("untimed: belgi bor; taymer, pauza va 'saqlandi' yo'q", () => {
    const html = render(<ExamWorkspace {...props} totalSeconds={0} untimed badge="Xatolar ustida mashq · 1 savol" />);
    expect(html).toContain('Xatolar ustida mashq · 1 savol');
    expect(html).not.toContain(uz.exam.pause);
    expect(html).not.toContain(uz.exam.saved);
    expect(html).not.toContain(uz.exam.practiceMode);
  });

  it('odatiy rejim avvalgidek: rejim yorlig\'i, pauza, saqlandi', () => {
    const html = render(<ExamWorkspace {...props} />);
    expect(html).toContain(uz.exam.practiceMode);
    expect(html).toContain(uz.exam.pause);
    expect(html).toContain(uz.exam.saved);
  });
});
