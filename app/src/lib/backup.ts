/* =========================================================================
 * SAO LƯU / KHÔI PHỤC tiến độ ra file JSON.
 * File sao lưu của bản cũ (v0.4) vẫn khôi phục được (tự chuyển đổi).
 * ========================================================================= */
import { migrate } from "./storage";
import { S, replaceState, save } from "./state.svelte";
import type { State } from "./types";
import { daysBetween, todayStr } from "./util";

export function exportBackup(): void {
  S.lastBackup = todayStr(); save();
  const blob = new Blob([JSON.stringify(S)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `mitxue-saoluu-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
}

/** Kiểm tra nội dung file có phải sao lưu Mít Xué không, rồi chuyển về State v3. */
export function parseBackup(text: string): State | null {
  try {
    const o = JSON.parse(text);
    if (!o || typeof o !== "object" || typeof o.xp !== "number" || typeof o.srs !== "object") return null;
    return migrate(o);
  } catch { return null; }
}

export async function importBackup(file: File): Promise<boolean> {
  const st = parseBackup(await file.text());
  if (!st) return false;
  replaceState(st);
  return true;
}

/** Số ngày từ lần sao lưu gần nhất (Infinity nếu chưa từng). */
export const daysSinceBackup = () => (S.lastBackup ? daysBetween(S.lastBackup, todayStr()) : Infinity);
