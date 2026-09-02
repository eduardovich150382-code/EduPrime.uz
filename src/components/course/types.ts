// `/courses/[id]/learn` sahifasi va uning yordamchi komponentlari (CourseCurriculum,
// PdfViewer'ni chaqiruvchi joylar) o'rtasida ulashiladigan turlar — API javob shakli
// bilan aynan mos kelishi shart (bu sessiyada backend o'zgarmaydi).

export interface LessonBlockItem {
  id: string;
  type: 'FILE' | 'QUIZ' | 'VIDEO_SOLUTION';
  labelUz: string | null;
  fileUrl: string | null;
  videoUrl: string | null;
  test: { id: string; titleUz: string; questionCount: number; duration: number } | null;
}

export interface LessonItem {
  id: string;
  titleUz: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF';
  durationMinutes: number | null;
  videoUrl: string | null;
  content: string | null;
  test: { id: string; titleUz: string; questionCount: number; duration: number } | null;
  fileUrl: string | null;
  minPassPercent: number | null;
  locked: boolean;
  completed: boolean;
  bestScorePercent: number | null;
  lastPositionSeconds: number;
  blocks: LessonBlockItem[];
}

export interface SectionItem {
  id: string;
  titleUz: string;
  lessons: LessonItem[];
}
