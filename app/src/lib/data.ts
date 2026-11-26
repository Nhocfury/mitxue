/* =========================================================================
 * DỮ LIỆU NỘI DUNG (chỉ đọc)
 * Đọc window.DATA do public/data/data.js nạp sẵn, dựng các chỉ mục tra nhanh.
 * Muốn sửa nội dung: sửa file trong content/ rồi chạy content/build_data.py.
 * ========================================================================= */
import type { Lesson, Sentence, Story, Word, CharInfo } from "./types";

const raw = window.DATA;

export const WORDS: Word[] = raw.words.map(w => ({ ...w, key: w.lv + ":" + w.w }));
export const LESSONS: Lesson[] = raw.lessons;
export const CHARS: Record<string, CharInfo> = raw.chars;
export const EXTRA = raw.extra;
export const AUDIO = raw.audio;
export const STORIES: Story[] = raw.stories;
export const LEVELS = [1, 2, 3, 4, 5] as const;
export const unitCount = (lv: number): number => raw.levelUnits[String(lv)] || 0;

/** Tra từ theo khóa "cấp:từ". */
export const W: Record<string, Word> = Object.fromEntries(WORDS.map(w => [w.key, w]));

/** Chữ sạch → từ ở cấp thấp nhất (dùng tra pinyin/nghĩa của một chữ). */
export const BY_C: Record<string, Word> = {};
for (const w of WORDS) if (!BY_C[w.c] || BY_C[w.c].lv > w.lv) BY_C[w.c] = w;

export const gloss = (w: Partial<Word> | undefined): string => (w ? w.vi || w.en || "" : "");

export const wordsOf = (lv: number, u: number) => WORDS.filter(w => w.lv === lv && w.u === u);
export const wordsOfLevel = (lv: number) => WORDS.filter(w => w.lv === lv);
/** Mọi từ đã gặp tính tới bài (lv, u). */
export const wordsUpTo = (lv: number, u: number) => WORDS.filter(w => w.lv < lv || (w.lv === lv && w.u <= u));

export const lessonOf = (lv: number, u: number): Lesson | undefined => LESSONS.find(L => L.lv === lv && L.u === u);
export const hasLesson = (lv: number) => LESSONS.some(L => L.lv === lv);

const sentsOf = (L: Lesson): Sentence[] => [...L.dialogue, ...L.grammar.flatMap(g => g.ex)];
export const unitSentences = (lv: number, u: number): Sentence[] => { const L = lessonOf(lv, u); return L ? sentsOf(L) : []; };
export const levelSentences = (lv: number): Sentence[] => LESSONS.filter(L => L.lv === lv).flatMap(sentsOf);
export const sentsUpTo = (lv: number, u: number): Sentence[] =>
  LESSONS.filter(L => L.lv < lv || (L.lv === lv && L.u <= u)).flatMap(sentsOf);
export const allSentences = (): Sentence[] => LESSONS.flatMap(sentsOf);

/** Chữ Hán xuất hiện lần đầu ở bài (lv, u). */
export function introducedChars(lv: number, u: number): string[] {
  const before = new Set<string>();
  WORDS.filter(w => w.lv < lv || (w.lv === lv && w.u < u)).forEach(w => [...w.c].forEach(c => before.add(c)));
  const out: string[] = [];
  wordsOf(lv, u).forEach(w => [...w.c].forEach(c => {
    if (/[一-鿿]/.test(c) && !before.has(c) && !out.includes(c)) out.push(c);
  }));
  return out;
}

export const hasStrokes = (c: string) => !!window.STROKES[c];

/** Pinyin của một token trong câu (từ HSK hoặc từ bổ sung). */
export function pinyinOfToken(t: string): string {
  const w = BY_C[t]; if (w) return w.py;
  return EXTRA[t] ? EXTRA[t].py : "";
}

export const unitTitle = (lv: number, u: number) => lessonOf(lv, u)?.title ?? `Từ vựng nhóm ${u}`;

export const LEVEL_INFO: Record<number, { cum: number; can: string; focus: string }> = {
  1: { cum: 300, can: "Giao tiếp đơn giản trong đời sống hằng ngày: chào hỏi, giới thiệu bản thân, gia đình, số đếm, giờ giấc, mua bán, ăn uống.", focus: "Phát âm chuẩn + 300 từ nền tảng + câu đơn" },
  2: { cum: 500, can: "Giao tiếp cơ bản về sinh hoạt, học tập, công việc; mô tả đơn giản, so sánh, kinh nghiệm.", focus: "Bổ ngữ kết quả, 是…的, 比 so sánh, 过 kinh nghiệm" },
  3: { cum: 1000, can: "Giao tiếp hiệu quả về đời sống, học tập, công việc; đọc đoạn văn ngắn khoảng 300 chữ. Bắt đầu có thi nói (HSK 3 Speaking).", focus: "Câu 把, câu bị động 被, bổ ngữ xu hướng, liên từ" },
  4: { cum: 2000, can: "Giao tiếp hoàn chỉnh, mạch lạc; viết đoạn văn ngắn; đọc hiểu bài báo đơn giản.", focus: "Câu phức, văn viết, từ đồng nghĩa dễ nhầm" },
  5: { cum: 3600, can: "Trình bày, thảo luận chủ đề quen thuộc trong công việc (mua hàng, đàm phán), đọc báo, xem phim có phụ đề.", focus: "Văn phong trang trọng, thành ngữ thông dụng, viết bài 100+ chữ" },
};
