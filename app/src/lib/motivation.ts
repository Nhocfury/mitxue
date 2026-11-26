/* =========================================================================
 * ĐỘNG LỰC HỌC: nhiệm vụ ngày + rương thưởng, dải 7 ngày, sao của bài, nhắc giờ ngủ.
 * Mọi số liệu lấy từ nhật ký ngày (S.days) nên không cần lưu thêm gì ngoài 2 cờ
 * day().chest (đã mở rương) và day().bed (đã nhắc ngủ).
 * ========================================================================= */
import { addXP } from "./progress";
import { sfx } from "./sfx";
import { S, day, save } from "./state.svelte";
import { celebrate, say, toast, ui } from "./ui.svelte";
import { todayStr } from "./util";
import { who } from "./who";

/* ---------------- nhiệm vụ ngày ---------------- */
export interface Quest { id: string; icon: string; label: string; cur: number; need: number; done: boolean }
export const OK_GOAL = 20;          // số câu đúng mỗi ngày
export const CHEST_XP = 50;

export function quests(): Quest[] {
  const d = S.days[todayStr()] ?? { sec: 0, q: 0, ok: 0 };
  const goal = S.settings.goalMin;
  return [
    { id: "learn", icon: "📘", label: "Học xong 1 bước của bài mới", cur: Math.min(d.steps ?? 0, 1), need: 1 },
    { id: "ok", icon: "🎯", label: `Trả lời đúng ${OK_GOAL} câu`, cur: Math.min(d.ok, OK_GOAL), need: OK_GOAL },
    { id: "time", icon: "⏱️", label: `Học đủ ${goal} phút`, cur: Math.min(Math.floor(d.sec / 60), goal), need: goal },
  ].map(q => ({ ...q, done: q.cur >= q.need }));
}
export const chestOpened = () => !!S.days[todayStr()]?.chest;
export const chestReady = () => !chestOpened() && quests().every(q => q.done);

export function openChest(): boolean {
  if (!chestReady()) return false;
  day().chest = true; save();
  addXP(CHEST_XP); sfx.reward();
  celebrate("🎁", `+${CHEST_XP} XP`, "Xong hết nhiệm vụ hôm nay rồi. Giỏi!");
  return true;
}

/* ---------------- dải 7 ngày gần nhất ---------------- */
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export interface DayDot { ds: string; wd: string; studied: boolean; goal: boolean; today: boolean }
export function lastDays(n = 7, now = new Date()): DayDot[] {
  const out: DayDot[] = []; const t = todayStr(now);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const ds = todayStr(d), x = S.days[ds];
    out.push({ ds, wd: WD[d.getDay()], studied: !!x && (x.q > 0 || x.sec >= 120), goal: !!x && x.sec >= S.settings.goalMin * 60, today: ds === t });
  }
  return out;
}

/* ---------------- sao của bài (theo điểm kiểm tra cao nhất) ---------------- */
/** 0 sao: chưa qua · 1 sao: qua · 2 sao: ≥ 90% · 3 sao: 100%. */
export function starsOf(best: number, pass = 80): number {
  if (!best || best < pass) return 0;
  return best >= 100 ? 3 : best >= 90 ? 2 : 1;
}

/* ---------------- nhắc giờ ngủ (mỗi người tự đặt giờ, mặc định 23:00; null = không nhắc) ---------------- */
export const bedHour = (): number | null => S.settings.bedHour;
/** Khung "giờ ngủ": từ bedHour tới 5 giờ sáng. Đặt sau nửa đêm (0–4 giờ) thì chỉ tính từ giờ đó tới 5 giờ. */
export function isBedtime(now = new Date(), bh: number | null = bedHour()): boolean {
  if (bh === null) return false;
  const h = now.getHours();
  return bh >= 5 ? h >= bh || h < 5 : h >= bh && h < 5;
}

/** Đến giờ ngủ thì Mít nhắc 1 lần mỗi đêm. Chỉ nhắc, không khóa app: quyết định vẫn là của em. */
export function checkBedtime(now = new Date()): boolean {
  if (ui.welcome || !isBedtime(now)) return false;      // đang ở màn chào (chưa chọn giờ ngủ) thì chưa nhắc
  // sau nửa đêm vẫn tính là "đêm hôm trước" để không nhắc 2 lần
  const d = new Date(now); if (now.getHours() < 5) d.setDate(d.getDate() - 1);
  const log = day(todayStr(d));
  if (log.bed) return false;
  log.bed = true; save();
  say(`${now.getHours() >= (bedHour() ?? 24) ? `${bedHour()} giờ` : "Quá nửa đêm"} rồi đó ${who()}. Giờ ngủ em tự đặt: <b>tắt màn hình đi ngủ</b>. Mai học tiếp, chị giữ chỗ cho :3`, "smirk");
  toast("🌙 Tới giờ đi ngủ rồi nha");
  return true;
}
export function startBedtimeWatch(): void {
  checkBedtime();
  setInterval(() => checkBedtime(), 60_000);
}
