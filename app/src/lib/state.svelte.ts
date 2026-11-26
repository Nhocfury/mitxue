/* =========================================================================
 * TRẠNG THÁI DÙNG CHUNG (reactive)
 * `S` là tiến độ người học, là $state của Svelte nên sửa S.xp… thì giao diện
 * tự cập nhật. Sửa xong gọi save() để ghi xuống máy.
 * ========================================================================= */
import { blankState, loadRaw, migrate, persist } from "./storage";
import type { DayLog, State } from "./types";
import { todayStr } from "./util";

export const S: State = $state(migrate(loadRaw()));

export function save(): void { persist($state.snapshot(S) as State); }

/** Thay toàn bộ tiến độ (khôi phục sao lưu / xóa làm lại). */
export function replaceState(next: State): void {
  for (const k of Object.keys(S)) delete (S as unknown as Record<string, unknown>)[k];
  Object.assign(S, next);
  save();
}
export const resetState = () => replaceState(blankState());

export function day(d = todayStr()): DayLog {
  if (!S.days[d]) S.days[d] = { sec: 0, q: 0, ok: 0 };
  return S.days[d];
}
export function markActive(): void { S.lastSeen = todayStr(); day(); }
