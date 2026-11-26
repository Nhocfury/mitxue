/* =========================================================================
 * LỘ TRÌNH & LUẬT MỞ KHÓA
 *  Giai đoạn 0 (phát âm) → HSK 1 → … → HSK 5.
 *  - Bài u mở khi bài u-1 đạt kiểm tra ≥ 80%.
 *  - Cấp n mở khi đạt thi tổng cấp n-1 ≥ 80%.
 *  - Mỗi bài gồm các bước (STEPS). Bài có giáo án đủ (HSK 1–2) có 6 bước,
 *    bài chỉ có từ vựng (HSK 3–5) có 4 bước.
 *  - Từ mới chia phần ~8 từ; mỗi ngày tối đa settings.newPerDay từ mới.
 * ========================================================================= */
import { lessonOf, LEVELS, STORIES, unitCount, unitTitle, wordsOf } from "./data";
import type { Route } from "./router.svelte";
import { dueCount, dueKeys } from "./srs";
import { S } from "./state.svelte";
import type { Story, UnitProgress } from "./types";
import { todayStr } from "./util";

export const PASS_UNIT = 80;
export const PASS_LEVEL = 80;
export const PASS_CHUNK = 70;
export const PASS_SET = 70;
export const CHUNK_SIZE = 8;
export const REVIEW_GATE = 50;       // quá 50 thẻ chờ ôn thì chặn từ mới
const UNIT_HOURS = 3;
const PRON_HOURS = 10;

export type StepKey = "vocab" | "chars" | "grammar" | "dialogue" | "practice" | "test";
export const STEP_NAMES: Record<StepKey, string> = {
  vocab: "Từ mới", chars: "Chữ Hán", grammar: "Ngữ pháp", dialogue: "Hội thoại", practice: "Luyện tập", test: "Kiểm tra",
};
const FULL: StepKey[] = ["vocab", "chars", "grammar", "dialogue", "practice", "test"];
const LITE: StepKey[] = ["vocab", "chars", "practice", "test"];
/** Bài có giáo trình (hội thoại + ngữ pháp) thì 6 bước, bài chỉ có từ vựng thì 4 bước. Tính theo TỪNG BÀI
 *  vì một cấp có thể mới soạn giáo trình cho vài bài đầu (vd HSK 3: bài 1–10). */
export const stepsOf = (lv: number, u: number): StepKey[] => (lessonOf(lv, u) ? FULL : LITE);

const uKey = (lv: number, u: number) => `${lv}:${u}`;
/** Tiến độ một bài (tạo mới nếu chưa có). */
export function unitProg(lv: number, u: number): UnitProgress {
  const k = uKey(lv, u);
  if (!S.units[k]) S.units[k] = { steps: {}, best: 0, done: false };
  return S.units[k];
}
export const peekUnit = (lv: number, u: number): UnitProgress | undefined => S.units[uKey(lv, u)];
export const unitDone = (lv: number, u: number) => !!peekUnit(lv, u)?.done;
export const levelPassed = (lv: number) => !!S.levels[lv]?.passed;
export const levelOpen = (lv: number) => lv === 1 || levelPassed(lv - 1) || S.settings.unlockAll;
export const unitOpen = (lv: number, u: number) =>
  levelOpen(lv) && (u === 1 || unitDone(lv, u - 1) || S.settings.unlockAll);
export function allUnitsDone(lv: number): boolean {
  for (let u = 1; u <= unitCount(lv); u++) if (!unitDone(lv, u)) return false;
  return true;
}
export const unitsDoneIn = (lv: number) => { let n = 0; for (let u = 1; u <= unitCount(lv); u++) if (unitDone(lv, u)) n++; return n; };

/** Bài tiếp theo cần học, hoặc thi tổng của cấp, hoặc null nếu xong hết. */
export function nextUnit(): { lv: number; u: number | "test" } | null {
  for (const lv of LEVELS) {
    if (levelPassed(lv)) continue;
    for (let u = 1; u <= unitCount(lv); u++) if (!unitDone(lv, u)) return { lv, u };
    return { lv, u: "test" };
  }
  return null;
}

/** Bước đầu tiên chưa xong của bài. */
export const firstOpenStep = (lv: number, u: number): StepKey =>
  stepsOf(lv, u).find(k => !peekUnit(lv, u)?.steps[k]) ?? "vocab";

/* ---------------- từ mới theo phần ---------------- */
export function vocabChunks(lv: number, u: number) {
  const ws = wordsOf(lv, u);
  const N = Math.max(1, Math.ceil(ws.length / CHUNK_SIZE));
  const size = Math.ceil(ws.length / N);
  return Array.from({ length: N }, (_, i) => ws.slice(i * size, (i + 1) * size)).filter(c => c.length);
}
export const newToday = () => (S.newToday.d === todayStr() ? S.newToday.n : 0);
export function addNew(n: number): void {
  if (S.newToday.d !== todayStr()) S.newToday = { d: todayStr(), n: 0 };
  S.newToday.n += n;
}
/** Có nên chặn học từ mới không? Trả về lý do (HTML ngắn) hoặc null. */
export function newGate(): { kind: "new" | "due"; html: string } | null {
  if (S.gateOff === todayStr()) return null;
  if (newToday() >= S.settings.newPerDay)
    return { kind: "new", html: `Hôm nay em đã học <b>${newToday()} từ mới</b>, đủ mức ${S.settings.newPerDay} từ/ngày rồi. Học thêm nữa thì mấy ngày tới thẻ ôn sẽ dồn rất nhiều. Làm tiếp ngữ pháp, hội thoại hoặc ôn tập nha, mai học từ mới tiếp.` };
  const due = dueKeys().length;
  if (due >= REVIEW_GATE) return { kind: "due", html: `Đang có <b>${due} thẻ</b> chờ ôn. Ôn bớt xuống dưới ${REVIEW_GATE} rồi hãy học từ mới, không thì quên nhanh lắm.` };
  return null;
}

export function curStepName(lv: number, u: number): string {
  const st = peekUnit(lv, u);
  const k = stepsOf(lv, u).find(x => !st?.steps[x]);
  if (!k) return STEP_NAMES.test;
  if (k === "vocab") { const N = vocabChunks(lv, u).length; const vc = st?.vc ?? 0; if (vc < N) return `${STEP_NAMES.vocab} phần ${vc + 1}/${N}`; }
  return STEP_NAMES[k];
}

/* ---------------- "việc tiếp theo" ở màn Hôm nay ---------------- */
export interface NextAction { label: string; sub: string; route: Route }
export function nextAction(): NextAction {
  const due = dueCount(), nx = nextUnit();
  if (!S.pron.lessonDone && !S.lastUnit)
    return { label: "Học phát âm (bài đầu tiên)", sub: "Giai đoạn 0 · làm quen pinyin và 4 thanh điệu", route: { name: "pron", tab: "learn" } };
  if (due >= 10) return { label: `Ôn ${Math.min(due, 20)} từ đến hạn`, sub: "Ôn trước, rồi học bài mới", route: { name: "review", five: false } };
  if (nx) return nx.u === "test"
    ? { label: `Thi tổng HSK ${nx.lv}`, sub: `40 câu · cần đạt ${PASS_LEVEL}%`, route: { name: "levelTest", lv: nx.lv } }
    : { label: `Học tiếp: HSK ${nx.lv} · Bài ${nx.u}`, sub: unitTitle(nx.lv, nx.u) + " · " + curStepName(nx.lv, nx.u), route: { name: "lesson", lv: nx.lv, u: nx.u } };
  return { label: "Em đã xong cả lộ trình!", sub: "Ôn lại cho chắc nha", route: { name: "review", five: false } };
}

/** Ước tính ngày xong lộ trình theo số phút học mỗi ngày. */
export function estimatedFinish(today = new Date()): Date {
  let h = 0;
  for (const lv of LEVELS) for (let u = 1; u <= unitCount(lv); u++) if (!unitDone(lv, u)) h += UNIT_HOURS;
  if (!S.pron.lessonDone) h += PRON_HOURS;
  const days = Math.ceil((h * 1.25) / (S.settings.goalMin / 60));
  const d = new Date(today); d.setDate(d.getDate() + days); return d;
}

/* ---------------- truyện đọc thêm ---------------- */
export const storyOpen = (st: Story) => unitDone(st.lv, st.after) || levelPassed(st.lv) || S.settings.unlockAll;
export const freshStories = () => STORIES.filter(x => storyOpen(x) && !S.stories[x.id]);

/** Pinyin trong câu có bị làm mờ không (từ HSK 2 trở lên ở chế độ tự động). */
export function pyHidden(lv: number): boolean {
  const m = S.settings.pyMode;
  return m === "hide" || (m === "auto" && lv >= 2);
}
