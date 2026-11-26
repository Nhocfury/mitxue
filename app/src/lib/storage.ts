/* =========================================================================
 * LƯU TRỮ TIẾN ĐỘ
 * - Lưu trong localStorage của trình duyệt, khóa "mitxue_v3".
 * - Tự chuyển dữ liệu từ bản cũ (v0.1 → "mitxue_v1", v0.2–0.4 → "mitxue_v2").
 *   Khóa cũ giữ nguyên, không xóa, để lỡ có gì còn quay lại được.
 * - Vì sao không dùng IndexedDB: dữ liệu 1 người chỉ vài trăm KB, localStorage
 *   đọc/ghi đồng bộ, chạy chắc trên file://. Khi làm đồng bộ (Firebase) chỉ cần
 *   thay 2 hàm loadRaw/persist ở file này.
 * ========================================================================= */
import type { SrsCard, State } from "./types";
import { todayStr } from "./util";

export const KEY = "mitxue_v3";
export const OLD_KEYS = ["mitxue_v2", "mitxue_v1"];
export const VERSION = 3 as const;

export function blankState(today = todayStr()): State {
  return {
    ver: VERSION, created: today, xp: 0, days: {}, items: {},
    tones: { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] },
    bestCombo: 0, correct: 0, speakBest: 0, speakCount: 0, fiveDone: 0,
    lastSeen: null, theme: null,
    settings: { newPerDay: 10, reviewMax: 150, goalMin: 60, showPy: true, rate: 1, pyMode: "auto", unlockAll: false },
    pron: { lessonDone: false, q: {} },
    units: {}, levels: {}, srs: {}, chars: {}, newToday: { d: "", n: 0 }, stories: {},
  };
}

/** Thẻ kiểu SM-2 (bản ≤ 0.4) → thẻ FSRS. Giữ nguyên ngày đến hạn để lịch ôn không bị xáo. */
export function migrateCard(c: Record<string, unknown>, today: string): SrsCard {
  if (typeof c.stability === "number") return c as unknown as SrsCard; // đã là FSRS
  const iv = Number(c.iv) || 0, reps = Number(c.reps) || 0, lapses = Number(c.lapses) || 0;
  const ef = Number(c.ef) || 2.5, due = Number(c.due) || Date.now();
  const learned = iv >= 1;
  return {
    due,
    stability: learned ? Math.max(1, iv) : 0,
    // ef 1.3 (khó) … 3.0 (dễ) → difficulty 9 … 3
    difficulty: learned ? Math.min(10, Math.max(1, 9 - ((ef - 1.3) / 1.7) * 6)) : 0,
    elapsed: 0,
    scheduled: learned ? iv : 0,
    reps, lapses,
    state: learned ? 2 : reps > 0 || lapses > 0 ? 3 : 0,
    lastReview: learned ? due - iv * 864e5 : null,
    added: typeof c.added === "string" ? c.added : today,
  };
}

/** Nhận bất kỳ dữ liệu cũ/mới (kể cả file sao lưu) → State v3 hợp lệ. */
export function migrate(raw: unknown, today = todayStr()): State {
  const b = blankState(today);
  if (!raw || typeof raw !== "object") return b;
  const r = raw as Record<string, unknown>;
  const s = { ...b, ...r } as State & Record<string, unknown>;
  s.settings = { ...b.settings, ...((r.settings as object) || {}) };
  if (r.ver !== VERSION && s.settings.newPerDay === 15) s.settings.newPerDay = 10; // mặc định cũ quá cao
  if (!["auto", "show", "hide"].includes(s.settings.pyMode)) s.settings.pyMode = "auto";
  s.settings.unlockAll = !!s.settings.unlockAll;
  s.pron = { ...b.pron, ...((r.pron as object) || {}) };
  s.pron.q = s.pron.q || {};
  s.tones = { ...b.tones, ...((r.tones as object) || {}) };
  for (const k of ["days", "items", "units", "levels", "chars", "stories"] as const) s[k] = (r[k] as never) || {};
  s.newToday = (r.newToday as State["newToday"]) || { d: "", n: 0 };
  const srs: Record<string, SrsCard> = {};
  for (const [k, c] of Object.entries((r.srs as Record<string, Record<string, unknown>>) || {})) srs[k] = migrateCard(c, today);
  s.srs = srs;
  delete s.migr4; delete s.time;
  s.ver = VERSION;
  return s;
}

/** Đọc dữ liệu thô: khóa mới trước, không có thì lấy khóa cũ. */
export function loadRaw(store: Storage | undefined = globalThis.localStorage): unknown {
  if (!store) return null;
  for (const k of [KEY, ...OLD_KEYS]) {
    try { const v = store.getItem(k); if (v) return JSON.parse(v); } catch { /* bỏ qua dữ liệu hỏng */ }
  }
  return null;
}

export function persist(s: State, store: Storage | undefined = globalThis.localStorage): boolean {
  try { store?.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}
