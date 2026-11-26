/* =========================================================================
 * TRẠNG THÁI DÙNG CHUNG (reactive)
 * `S` là tiến độ người học, là $state của Svelte nên sửa S.xp… thì giao diện
 * tự cập nhật. Sửa xong gọi save() để ghi xuống máy.
 * ========================================================================= */
import { blankState, loadRaw, migrate, persist } from "./storage";
import type { DayLog, State } from "./types";
import { todayStr } from "./util";

export const S: State = $state(migrate(loadRaw()));

let settingsSig = JSON.stringify([S.settings, S.theme]);
/** Ghi tiến độ xuống máy. Cài đặt/giao diện đổi thì ghi lại thời điểm (để đồng bộ lấy bản sửa mới nhất). */
export function save(): void {
  const sig = JSON.stringify([S.settings, S.theme]);
  if (sig !== settingsSig) { settingsSig = sig; S.settingsAt = Date.now(); }
  persist($state.snapshot(S) as State);
  onSaved?.();
}
/** Móc cho lib/sync: được gọi sau mỗi lần save (để hẹn đồng bộ). */
let onSaved: (() => void) | null = null;
export const setOnSaved = (f: () => void) => (onSaved = f);

/** Thay toàn bộ tiến độ (khôi phục sao lưu / xóa làm lại). */
export function replaceState(next: State): void {
  for (const k of Object.keys(S)) delete (S as unknown as Record<string, unknown>)[k];
  Object.assign(S, next);
  settingsSig = JSON.stringify([S.settings, S.theme]);
  save();
}
export const resetState = () => replaceState(blankState());

export function day(d = todayStr()): DayLog {
  if (!S.days[d]) S.days[d] = { sec: 0, q: 0, ok: 0 };
  return S.days[d];
}
export function markActive(): void { S.lastSeen = todayStr(); day(); }
