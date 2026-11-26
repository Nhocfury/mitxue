/* =========================================================================
 * KIỂU DỮ LIỆU CHUNG
 * Dữ liệu nội dung (từ, bài, chữ…) do content/build_data.py sinh ra trong
 * public/data/data.js (gán vào window.DATA). Tiến độ người học là `State`.
 * ========================================================================= */

/** Một từ vựng HSK. `key` = "cấp:từ gốc" (duy nhất), `c` = chữ sạch (bỏ số 1/2 trong đề cương). */
export interface Word {
  w: string; c: string; py: string; vi: string; en: string; sy?: string[];
  lv: number; u: number; a?: boolean; hv?: string;
  key: string;
}

/** Một câu: chữ Hán, nghĩa, pinyin, tách từ `t`, từ trọng tâm `k` (để đục lỗ), người nói `sp` (hội thoại). */
/** sy: pinyin từng chữ Hán ("r" = 儿 hóa), dùng cho bộ chấm phát âm; câu có chữ Latin/số thì không có. */
export interface Sentence { zh: string; vi: string; py: string; t: string[]; k: string[]; sp?: string; sy?: string[] }

export interface Grammar { title: string; formula: string; explain: string; note: string; ex: Sentence[] }

export interface Lesson {
  lv: number; u: number; title: string; topic: string; goals: string[]; tip: string;
  dialogue: Sentence[]; grammar: Grammar[];
}

export interface CharInfo {
  hv?: string; rad?: string; radvi?: string; dec?: string; en?: string; ety?: string;
  lv?: number; hw?: boolean; st?: number;
}

export interface Story {
  id: number; lv: number; after: number; title: string;
  lines: Sentence[]; qs: { q: string; o: string[]; a: number }[];
}

export interface RawData {
  words: Omit<Word, "key">[];
  lessons: Lesson[];
  chars: Record<string, CharInfo>;
  extra: Record<string, { py: string; vi: string }>;
  audio: Record<string, string>;
  stories: Story[];
  levelUnits: Record<string, number>;
}

/* ---------------------------- Tiến độ (lưu máy) --------------------------- */

/** Thẻ ôn tập theo thuật toán FSRS (lưu dạng số để JSON gọn). */
export interface SrsCard {
  due: number;          // thời điểm đến hạn (ms)
  stability: number;    // độ bền trí nhớ (ngày)
  difficulty: number;   // độ khó 1..10
  elapsed: number;      // số ngày từ lần ôn trước
  scheduled: number;    // khoảng cách đã xếp (ngày)
  reps: number;
  lapses: number;       // số lần quên
  state: number;        // 0 mới · 1 đang học · 2 ôn · 3 học lại (theo ts-fsrs State)
  lastReview: number | null;
  added: string;        // ngày học từ này (YYYY-MM-DD)
}

export interface UnitProgress {
  steps: Record<string, boolean>;
  best: number;
  done: boolean;
  vc?: number;                     // số phần từ mới đã qua
  sets?: Record<string, number>;   // điểm cao nhất từng bộ luyện tập
}

export interface Settings {
  newPerDay: number; reviewMax: number; goalMin: number;
  showPy: boolean; rate: number; pyMode: "auto" | "show" | "hide"; unlockAll: boolean;
  sfx: boolean;           // tiếng hiệu ứng khi trả lời đúng/sai
}

/** Nhật ký 1 ngày. sec: giây học · q/ok: số câu trả lời/đúng · xp: XP trong ngày · steps: số bước bài học xong
 *  · chest: đã mở rương nhiệm vụ · bed: đã nhắc đi ngủ (các trường mới đều tùy chọn để dữ liệu cũ vẫn hợp lệ). */
export interface DayLog { sec: number; q: number; ok: number; xp?: number; steps?: number; chest?: boolean; bed?: boolean }

export interface State {
  ver: 3;
  created: string;
  xp: number;
  days: Record<string, DayLog>;
  items: Record<string, { c: number; w: number }>;     // thống kê bài nghe phát âm
  tones: Record<string, [number, number]>;             // đúng/tổng theo thanh 1..4
  bestCombo: number; correct: number;
  speakBest: number; speakCount: number; fiveDone: number;
  lastSeen: string | null;
  theme: "light" | "dark" | null;
  settings: Settings;
  pron: { lessonDone: boolean; q: Record<string, number>; opened?: boolean; chartSeen?: boolean };
  units: Record<string, UnitProgress>;
  levels: Record<string, { best: number; passed?: boolean }>;
  srs: Record<string, SrsCard>;
  chars: Record<string, number>;                         // 1 = đã tập, 2 = viết thuộc
  newToday: { d: string; n: number };
  gateOff?: string;
  lastUnit?: { lv: number; u: number };
  stories: Record<string, number>;
  lastBackup?: string;
}

declare global {
  interface Window {
    DATA: RawData;
    STROKES: Record<string, unknown>;
    SYL_RAW: string;
    /** Do content/build_audio.py sinh: câu → file trong audio/c/, từ ngoài HSK → file trong audio/x/ */
    AUDIO_X?: { sent: Record<string, string>; extra: Record<string, string> };
  }
}
