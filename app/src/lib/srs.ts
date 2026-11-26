/* =========================================================================
 * ÔN TẬP NGẮT QUÃNG bằng thuật toán FSRS (thư viện ts-fsrs, cùng họ với Anki).
 *
 * Luồng của một từ:
 *  1. Học xong phần từ mới → intro(): tạo thẻ "mới", hẹn ôn 4h sáng mai.
 *  2. Mỗi lần ôn đúng → FSRS tính lần sau (vd 3 → 14 → 40 ngày…).
 *  3. Ôn sai → FSRS ghi nhận quên, app hẹn hỏi lại sau 10 phút trong ngày.
 *  4. Làm đúng một từ CHƯA đến hạn (trong bài tập) thì không đổi lịch.
 * ========================================================================= */
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from "ts-fsrs";
import { W } from "./data";
import { S } from "./state.svelte";
import type { SrsCard } from "./types";
import { todayStr, tomorrow4am } from "./util";

export const RELEARN_MIN = 10;      // ôn sai: hỏi lại sau 10 phút
export const MATURE_DAYS = 21;      // khoảng ôn ≥ 21 ngày = "thuộc lâu"

const scheduler = fsrs(generatorParameters({
  request_retention: 0.9,   // mục tiêu: lúc ôn còn nhớ 90%
  maximum_interval: 3650,
  enable_fuzz: true,        // xê dịch ±vài % để thẻ không dồn cùng ngày
  enable_short_term: false, // khoảng tính theo ngày; học lại trong ngày do app tự hẹn 10 phút
}));

const toCard = (c: SrsCard): Card => ({
  due: new Date(c.due), stability: c.stability, difficulty: c.difficulty,
  elapsed_days: c.elapsed, scheduled_days: c.scheduled, learning_steps: 0,
  reps: c.reps, lapses: c.lapses, state: c.state,
  last_review: c.lastReview ? new Date(c.lastReview) : undefined,
} as Card);

const fromCard = (k: Card, added: string): SrsCard => ({
  due: k.due.getTime(), stability: k.stability, difficulty: k.difficulty,
  elapsed: k.elapsed_days, scheduled: k.scheduled_days, reps: k.reps, lapses: k.lapses,
  state: k.state, lastReview: k.last_review ? k.last_review.getTime() : null, added,
});

/** Đưa từ vào lịch ôn (không làm gì nếu đã có). */
export function intro(key: string, now = new Date()): void {
  if (S.srs[key]) return;
  const c = fromCard(createEmptyCard(now), todayStr(now));
  c.due = tomorrow4am(now);
  S.srs[key] = c;
}

/** Ghi nhận một lần trả lời về từ `key`. */
export function answer(key: string, ok: boolean, now = new Date()): void {
  if (!W[key]) return;
  if (!S.srs[key]) { if (ok) return; intro(key, now); }
  const cur = S.srs[key];
  if (ok && cur.due > now.getTime() + 60_000) return; // chưa tới hạn mà đúng: giữ lịch
  const next = scheduler.next(toCard(cur), now, ok ? Rating.Good : Rating.Again).card;
  const c = fromCard(next, cur.added);
  if (!ok) c.due = now.getTime() + RELEARN_MIN * 60_000;
  S.srs[key] = c;
}

export function dueKeys(now = Date.now()): string[] {
  return Object.entries(S.srs).filter(([k, c]) => c.due <= now && W[k]).sort((a, b) => a[1].due - b[1].due).map(([k]) => k);
}
/** Số thẻ đến hạn, tối đa theo cài đặt "số thẻ ôn tối đa mỗi ngày". */
export const dueCount = (now = Date.now()) => Math.min(dueKeys(now).length, S.settings.reviewMax);
export const learnedCount = () => Object.keys(S.srs).length;
export const matureCount = () => Object.values(S.srs).filter(c => c.scheduled >= MATURE_DAYS).length;
/** Từ hay quên nhất. */
export const weakWords = (n = 12) =>
  Object.entries(S.srs).filter(([k, c]) => c.lapses > 0 && W[k]).sort((a, b) => b[1].lapses - a[1].lapses).slice(0, n);
