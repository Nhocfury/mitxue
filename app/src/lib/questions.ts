/* =========================================================================
 * SINH CÂU HỎI
 * Câu hỏi là DỮ LIỆU THUẦN (không chứa HTML), component <Quiz> lo hiển thị.
 * Nội dung hiển thị mô tả bằng mảng "Rich" gồm các mẩu:
 *   text (chữ thường) · hz (chữ Hán) · py (pinyin tô màu) · hv (Hán Việt)
 *   muted (chữ mờ) · blank (câu có ô trống) · syl (âm tiết có dấu thanh)
 * Thêm loại câu hỏi mới: viết hàm qXxx() trả về Question, rồi nếu cần giao
 * diện riêng thì thêm nhánh trong components/quiz/Quiz.svelte.
 * ========================================================================= */
import { playSentence, playWord } from "./audio";
import { CHARS, WORDS, gloss, hasStrokes, introducedChars, levelSentences, sentsUpTo, unitSentences, wordsOf, wordsOfLevel, wordsUpTo, W } from "./data";
import { retone } from "./pinyin";
import type { Sentence, Word } from "./types";
import { distinctBy, isHan, pick, short, shuffle } from "./util";

export type Seg =
  | { k: "text"; v: string; big?: boolean }
  | { k: "hz"; v: string; size?: number }
  | { k: "py"; v: string; size?: number }
  | { k: "hv"; v: string }
  | { k: "muted"; v: string }
  | { k: "blank"; s: Sentence; key: string }
  | { k: "syl"; b: string; t: number; size?: number; color?: boolean };
export type Rich = Seg[];

export interface ChoiceQ {
  type: "choice"; prompt: string;
  item?: string;                    // khóa từ để cập nhật lịch ôn
  main: Rich; play?: boolean;       // play = hiện nút ▶ lớn thay cho đề chữ
  audio?: () => unknown; autoplay?: boolean; afterAudio?: () => unknown;
  reveal?: Rich;
  opts: { rich: Rich; ok?: boolean }[];
  tone?: number;                    // câu nghe thanh: thanh đúng (để thống kê)
}
export interface OrderQ { type: "order"; prompt: string; vi: string; toks: string[]; end: string; s: Sentence }
export interface WriteQ { type: "write"; prompt: string; ch: string }
export interface SpeakQ { type: "speak"; prompt: string; w: Word }
export type Question = ChoiceQ | OrderQ | WriteQ | SpeakQ;

const T = (v: string): Seg => ({ k: "text", v });
const HZ = (v: string, size?: number): Seg => ({ k: "hz", v, size });
const PY = (v: string, size?: number): Seg => ({ k: "py", v, size });

function distractWords(w: Word, pool: Word[], n = 3, f: (x: Word) => string = gloss): Word[] {
  const cands = shuffle(pool.filter(x => x.key !== w.key && x.c !== w.c && f(x) && f(x) !== f(w)));
  return distinctBy(cands, f).slice(0, n);
}
function withAnswer(right: Rich, wrong: Rich[]) {
  return shuffle([{ rich: right, ok: true }, ...wrong.map(r => ({ rich: r }))]);
}

/* ------------------------------ về từ ------------------------------ */
export function qMeaning(w: Word, pool: Word[]): ChoiceQ {
  return {
    type: "choice", item: w.key, prompt: "Chữ này nghĩa là gì?", main: [HZ(w.c, 64)], audio: () => playWord(w.c),
    reveal: [PY(w.py), T(" · "), { k: "hv", v: w.hv || "" }],
    opts: withAnswer([T(short(gloss(w)))], distractWords(w, pool).map(d => [T(short(gloss(d)))])),
  };
}
export function qHanzi(w: Word, pool: Word[]): ChoiceQ {
  return {
    type: "choice", item: w.key, prompt: "Chọn chữ Hán đúng nghĩa", main: [{ k: "text", v: gloss(w), big: true }],
    reveal: [HZ(w.c, 28), T(" "), PY(w.py)], afterAudio: () => playWord(w.c),
    opts: withAnswer([HZ(w.c, 26)], distractWords(w, pool, 3, x => x.c).map(d => [HZ(d.c, 26)])),
  };
}
export function qListen(w: Word, pool: Word[]): ChoiceQ {
  return {
    type: "choice", item: w.key, prompt: "Nghe và chọn từ đúng", main: [], play: true, audio: () => playWord(w.c), autoplay: true,
    reveal: [PY(w.py), T(" · " + gloss(w))],
    opts: withAnswer([HZ(w.c, 26)], distractWords(w, pool, 3, x => x.c).map(d => [HZ(d.c, 26)])),
  };
}
export function qPinyin(w: Word, pool: Word[]): ChoiceQ {
  const fakes = new Set<string>();
  for (let k = 0; k < 20 && fakes.size < 3; k++) { const f = retone(w.py); if (f && f !== w.py) fakes.add(f); }
  for (const x of shuffle(pool.filter(x => x.c.length === w.c.length && x.py !== w.py)).slice(0, 5)) if (fakes.size < 3) fakes.add(x.py);
  return {
    type: "choice", item: w.key, prompt: "Chọn pinyin đúng (chú ý dấu thanh!)", main: [HZ(w.c, 64)],
    reveal: [T(gloss(w))], afterAudio: () => playWord(w.c),
    opts: withAnswer([PY(w.py, 20)], [...fakes].map(f => [PY(f, 20)])),
  };
}

/* ------------------------------ về câu ------------------------------ */
export function qFill(s: Sentence, key: string, pool: Word[]): ChoiceQ {
  const cand = shuffle(pool.filter(w => w.c !== key && !s.zh.includes(w.c) && Math.abs(w.c.length - key.length) <= 1));
  const ds = distinctBy(cand, w => w.c).slice(0, 3).map(w => w.c);
  return {
    type: "choice", prompt: "Điền từ thích hợp vào chỗ trống", main: [{ k: "blank", s, key }, { k: "muted", v: s.vi }],
    reveal: [HZ(s.zh, 20), T(" "), PY(s.py)], afterAudio: () => playSentence(s),
    opts: withAnswer([HZ(key, 22)], ds.map(d => [HZ(d, 22)])),
  };
}
export function qTrans(s: Sentence, sents: Sentence[]): ChoiceQ {
  const ds = distinctBy(shuffle(sents.filter(x => x.zh !== s.zh && x.vi !== s.vi)), x => x.zh).slice(0, 3);
  return {
    type: "choice", prompt: "Câu tiếng Trung nào đúng nghĩa?", main: [{ k: "text", v: s.vi, big: true }],
    reveal: [PY(s.py)], afterAudio: () => playSentence(s),
    opts: withAnswer([HZ(s.zh, 20)], ds.map(d => [HZ(d.zh, 20)])),
  };
}
export function qListenSent(s: Sentence, sents: Sentence[]): ChoiceQ {
  const ds = distinctBy(shuffle(sents.filter(x => x.vi !== s.vi)), x => x.vi).slice(0, 3);
  return {
    type: "choice", prompt: "Nghe câu và chọn nghĩa đúng", main: [], play: true, audio: () => playSentence(s), autoplay: true,
    reveal: [HZ(s.zh, 22), T(" "), PY(s.py)],
    opts: withAnswer([T(s.vi)], ds.map(d => [T(d.vi)])),
  };
}
/** Câu xếp được: 1 câu đơn, 3–9 từ, chỉ có dấu ，、 bên trong (không ngoặc kép, hai chấm…). */
export function orderable(s: Sentence): boolean {
  if (s.t.some(t => !isHan(t) && !/^[，、。？！]$/.test(t))) return false;
  const ends = s.t.filter(t => /[。？！]/.test(t)).length;
  const n = s.t.filter(isHan).length;
  return ends <= 1 && !/[。？！]/.test(s.t.slice(0, -1).join("")) && n >= 3 && n <= 9;
}
export function qOrder(s: Sentence): OrderQ {
  return {
    type: "order", prompt: "Sắp xếp thành câu đúng", vi: s.vi, s,
    toks: s.t.filter(t => isHan(t) || /[，、]/.test(t)),
    end: s.t.filter(t => /[。？！]/.test(t)).slice(-1)[0] || "",
  };
}
export const qWrite = (ch: string): WriteQ => ({ type: "write", ch, prompt: "Viết chữ theo đúng thứ tự nét" });
export const qSpeak = (w: Word): SpeakQ => ({ type: "speak", w, prompt: "Nghe mẫu, ghi âm giọng em rồi tự so sánh" });

/* ------------------------------ bộ đề ------------------------------ */
type WordGen = (w: Word, pool: Word[]) => ChoiceQ;
/** n câu hỏi xoay vòng các dạng `types` trên danh sách từ `ws`. */
export function wordQs(ws: Word[], pool: Word[], n: number, types: WordGen[]): ChoiceQ[] {
  if (!ws.length) return [];
  const list = shuffle(ws);
  return shuffle(Array.from({ length: n }, (_, i) => types[i % types.length](list[i % list.length], pool)));
}

export const writableChars = (lv: number, u: number) => introducedChars(lv, u).filter(hasStrokes);

export interface PracticeSet { name: string; desc: string; make: () => Question[] }
export function practiceSets(lv: number, u: number): PracticeSet[] {
  const ws = wordsOf(lv, u), pool = wordsUpTo(lv, u), sents = unitSentences(lv, u), allS = sentsUpTo(lv, u);
  const writeChars = writableChars(lv, u).sort((a, b) => (CHARS[b]?.hw ? 1 : 0) - (CHARS[a]?.hw ? 1 : 0)).slice(0, 8);
  const sets: PracticeSet[] = [
    { name: "Từ vựng", desc: "Nghĩa ↔ chữ ↔ pinyin", make: () => wordQs(ws, pool, 12, [qMeaning, qHanzi, qPinyin]) },
    { name: "Nghe", desc: "Nghe từ" + (sents.length ? " và câu" : ""), make: () => shuffle<Question>([...wordQs(ws, pool, 6, [qListen]), ...shuffle(sents).slice(0, 4).map(s => qListenSent(s, allS))]) },
    { name: "Viết chữ", desc: "Viết các chữ mới theo thứ tự nét", make: () => writeChars.map(qWrite) },
  ];
  if (sents.length) {
    sets.push({ name: "Ngữ pháp", desc: "Điền từ + sắp xếp câu", make: () => shuffle<Question>([
      ...shuffle(sents.filter(s => s.k.length)).slice(0, 6).map(s => qFill(s, pick(s.k), pool)),
      ...shuffle(sents.filter(orderable)).slice(0, 4).map(qOrder)]) });
    sets.push({ name: "Dịch câu", desc: "Việt → Trung", make: () => shuffle(sents).slice(0, 6).map(s => qTrans(s, allS)) });
  }
  return sets;
}

/** Kiểm tra cuối bài: 20 câu trộn, luôn có 1 câu nói và (nếu có chữ mới) 1 câu viết. */
export function unitTestQs(lv: number, u: number): Question[] {
  const ws = wordsOf(lv, u), pool = wordsUpTo(lv, u), sents = unitSentences(lv, u), allS = sentsUpTo(lv, u);
  let qs: Question[] = [];
  if (sents.length) {
    qs.push(...wordQs(ws, pool, 6, [qMeaning, qHanzi, qPinyin]), ...wordQs(ws, pool, 3, [qListen]));
    qs.push(...shuffle(sents).slice(0, 2).map(s => qListenSent(s, allS)));
    qs.push(...shuffle(sents.filter(s => s.k.length)).slice(0, 4).map(s => qFill(s, pick(s.k), pool)));
    qs.push(...shuffle(sents.filter(orderable)).slice(0, 3).map(qOrder));
    qs.push(...shuffle(sents).slice(0, 2).map(s => qTrans(s, allS)));
  } else qs = wordQs(ws, pool, 20, [qMeaning, qHanzi, qListen, qPinyin]);
  const wc = writableChars(lv, u);
  qs = shuffle(qs).slice(0, wc.length ? 18 : 19);
  if (wc.length) qs.push(qWrite(pick(wc)));
  qs.push(qSpeak(pick(ws)));
  return shuffle(qs);
}

/** Thi tổng cấp: 40 câu theo cấu trúc Nghe 15 · Đọc 15 · Viết 10 (cấp có giáo án). */
export function levelTestQs(lv: number): Question[] {
  const pool = wordsOfLevel(lv), all = WORDS.filter(w => w.lv <= lv), sents = levelSentences(lv);
  if (!sents.length) return wordQs(pool, all, 40, [qListen, qMeaning, qHanzi, qPinyin]);
  const listen = [...wordQs(pool, all, 7, [qListen]), ...shuffle(sents).slice(0, 8).map(s => qListenSent(s, sents))];
  const read = [...wordQs(pool, all, 5, [qMeaning]), ...shuffle(sents.filter(s => s.k.length)).slice(0, 5).map(s => qFill(s, pick(s.k), pool)),
    ...shuffle(sents).slice(0, 5).map(s => qTrans(s, sents))];
  const hw = Object.keys(CHARS).filter(c => CHARS[c].hw && CHARS[c].lv === lv && hasStrokes(c));
  const write = [...shuffle(sents.filter(orderable)).slice(0, 6).map(qOrder), ...shuffle(hw).slice(0, 4).map(qWrite)];
  return [...listen, ...read, ...write];
}

/** Câu hỏi ôn tập cho danh sách khóa từ. Thẻ còn non (≤1 lần ôn) không hỏi pinyin. */
export function reviewQs(keys: string[], repsOf: (k: string) => number): ChoiceQ[] {
  const maxLv = Math.max(1, ...keys.map(k => W[k].lv));
  const pool = WORDS.filter(w => w.lv <= maxLv);
  return keys.map(k => pick(repsOf(k) < 2 ? [qMeaning, qListen, qHanzi] : [qMeaning, qHanzi, qListen, qPinyin])(W[k], pool));
}
