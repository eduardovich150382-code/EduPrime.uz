import type { SectionItem } from '@/components/course/types';

export interface LearnCourse {
  id: string;
  titleUz: string;
  subject: { nameUz: string; icon: string | null };
  teacherName: string | null;
  sections: SectionItem[];
  totalLessons: number;
  completedLessons: number;
  isCompleted: boolean;
  enrollmentId: string | null;
  /** O'qituvchi/admin kursga yozilmasdan "talaba ko'zi bilan" ko'rayotgan bo'lsa true — hech narsa qulflanmaydi va progress yozilmaydi. */
  isPreview: boolean;
}
