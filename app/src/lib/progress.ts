/* =========================================================================
 * XP · CẤP ĐỘ · CHUỖI NGÀY (streak) · ĐẾM THỜI GIAN HỌC
 * ========================================================================= */
import { S, day, markActive, save } from "./state.svelte";
import { celebrate, say } from "./ui.svelte";
import { sfx } from "./sfx";
import { todayStr } from "./util";

/** XP → cấp. Cấp 1 cần 100 XP, mỗi cấp sau cần thêm 20%. */
export function lvOf(xp: number): { lv: number; into: number; need: number } {
  let lv = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; lv++; need = Math.round(need * 1.2); }
  return { lv, into: xp - acc, need };
}

export function addXP(n: number): void {
  const before = lvOf(S.xp).lv;
  const dev = S.dev ?? "?";
  S.xpBy = { ...(S.xpBy ?? {}), [dev]: (S.xpBy?.[dev] ?? 0) + n };   // XP theo máy (đồng bộ cộng các máy lại)
  S.xp += n; markActive();
  const d = day(); d.xp = (d.xp ?? 0) + n; save();
  const after = lvOf(S.xp).lv;
  if (after > before) {
    sfx.reward(); celebrate("⭐", `Level ${after}`, "Lên cấp rồi!");
    say(`🎉 Lên <b>Level ${after}</b> rồi! Giỏi á, nhưng đừng tự mãn nha :))`, "happy");
  }
}

function weekKey(ds: string): string {
  const x = new Date(ds + "T00:00:00"); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return x.toDateString();
}
/** Số ngày học liên tiếp. Mỗi tuần (T2–CN) được nghỉ 1 ngày không mất chuỗi; hôm nay chưa học chưa tính là đứt. */
export function streak(today = new Date()): number {
  const studied = (d: string) => { const x = S.days[d]; return !!x && (x.q > 0 || x.sec >= 120); };
  const rest: Record<string, number> = {};
  let n = 0, first = true; const d = new Date(today);
  for (let i = 0; i < 1000; i++) {
    const ds = todayStr(d);
    if (studied(ds)) n++;
    else if (!first) { const wk = weekKey(ds); if (!rest[wk]) rest[wk] = 1; else break; }
    first = false; d.setDate(d.getDate() - 1);
    if (ds < S.created) break;
  }
  return n;
}

export const todayMinutes = () => Math.floor(day().sec / 60);

/* -------- Đếm thời gian: cứ 15 giây có thao tác (trong 60 giây gần nhất) thì cộng 15 giây -------- */
let lastAct = Date.now();
export const touch = () => { lastAct = Date.now(); };
export function startTimeTracking(): void {
  for (const e of ["click", "keydown", "mousemove"]) addEventListener(e, touch, { passive: true });
  setInterval(() => {
    if (document.visibilityState !== "visible" || Date.now() - lastAct >= 60_000) return;
    const before = todayMinutes();
    day().sec += 15; markActive(); save();
    if (before < S.settings.goalMin && todayMinutes() >= S.settings.goalMin) {
      celebrate("⏱️", `${S.settings.goalMin} phút`, "Đủ mục tiêu hôm nay!");
      say(`Đủ <b>${S.settings.goalMin} phút</b> hôm nay rồi! 👏 Học thêm thì tốt, mệt thì nghỉ, chị duyệt :3`, "happy");
    }
  }, 15_000);
}

/** Ghi một câu trả lời vào nhật ký ngày + XP. */
export function logAnswer(ok: boolean): void {
  const d = day(); d.q++; if (ok) { d.ok++; S.correct++; }
  addXP(ok ? 8 : 2);
}
