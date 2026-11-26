/* =========================================================================
 * GỘP TIẾN ĐỘ GIỮA NHIỀU MÁY (đồng bộ)
 * Nguyên tắc: gộp là phép "hợp" an toàn: giao hoán (A+B = B+A), lũy đẳng (A+A = A),
 * không bao giờ làm MẤT tiến độ. Hai máy học offline cùng lúc rồi gộp vẫn đủ.
 *   - Thẻ ôn (FSRS): giữ thẻ đã ôn nhiều lần hơn (reps + lapses); hòa thì lần ôn gần nhất.
 *   - Bài / cấp / chữ / truyện: "đã xong" ở đâu cũng tính xong; điểm lấy cao nhất.
 *   - XP: mỗi máy đếm phần của mình (xpBy[máy]); tổng = cộng các máy → không mất XP.
 *   - Thống kê ngày (phút, số câu): lấy lớn nhất mỗi ngày (học 2 máy cùng ngày thì đếm thiếu, chấp nhận).
 *   - Cài đặt + giao diện: bản sửa gần nhất (settingsAt).
 * Trường chỉ của máy này (dev = mã máy) giữ nguyên của máy đang gộp.
 * ========================================================================= */
import type { DayLog, SrsCard, State, UnitProgress } from "./types";

const max = (a = 0, b = 0) => Math.max(a, b);
const maxStr = <T extends string | null | undefined>(a: T, b: T): T => ((a ?? "") >= (b ?? "") ? a : b);

/** Gộp 2 bảng theo khóa bằng hàm f (khóa chỉ có ở 1 bên thì giữ nguyên). Khóa sắp xếp để kết quả ổn định. */
function mergeMap<V>(a: Record<string, V> = {}, b: Record<string, V> = {}, f: (x: V, y: V) => V): Record<string, V> {
  const out: Record<string, V> = {};
  for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    out[k] = k in a && k in b ? f(a[k], b[k]) : k in a ? a[k] : b[k];
  }
  return out;
}

/** Thẻ "đi xa hơn": ôn nhiều hơn; hòa → lần ôn gần hơn; vẫn hòa → so cả nội dung để kết quả không phụ thuộc thứ tự. */
export function pickCard(x: SrsCard, y: SrsCard): SrsCard {
  const nx = x.reps + x.lapses, ny = y.reps + y.lapses;
  if (nx !== ny) return nx > ny ? x : y;
  const lx = x.lastReview ?? 0, ly = y.lastReview ?? 0;
  if (lx !== ly) return lx > ly ? x : y;
  return JSON.stringify(x) >= JSON.stringify(y) ? x : y;
}

const mergeUnit = (x: UnitProgress, y: UnitProgress): UnitProgress => {
  const u: UnitProgress = { steps: mergeMap(x.steps, y.steps, (p, q) => p || q), best: max(x.best, y.best), done: x.done || y.done };
  if (x.vc !== undefined || y.vc !== undefined) u.vc = max(x.vc, y.vc);
  if (x.sets || y.sets) u.sets = mergeMap(x.sets, y.sets, max);
  return u;
};

const mergeDay = (x: DayLog, y: DayLog): DayLog => {
  const d: DayLog = { sec: max(x.sec, y.sec), q: max(x.q, y.q), ok: max(x.ok, y.ok) };
  if (x.xp !== undefined || y.xp !== undefined) d.xp = max(x.xp, y.xp);
  if (x.steps !== undefined || y.steps !== undefined) d.steps = max(x.steps, y.steps);
  if (x.chest || y.chest) d.chest = true;
  if (x.bed || y.bed) d.bed = true;
  return d;
};

/** Bảng XP theo máy. Bản cũ chưa có xpBy: coi toàn bộ XP là của máy đó. */
export function xpTable(s: State): Record<string, number> {
  return s.xpBy && Object.keys(s.xpBy).length ? s.xpBy : { [s.dev ?? "?"]: s.xp };
}

/** Gộp tiến độ máy này (local) với bản trên mạng (remote). Không sửa 2 đầu vào. */
export function mergeState(local: State, remote: State): State {
  const a = local, b = remote;
  const newerSettings = (b.settingsAt ?? 0) > (a.settingsAt ?? 0) ? b : a;
  const xpBy = mergeMap(xpTable(a), xpTable(b), max);
  const u1 = a.lastUnit, u2 = b.lastUnit;
  const lastUnit = !u1 ? u2 : !u2 ? u1 : u1.lv * 1000 + u1.u >= u2.lv * 1000 + u2.u ? u1 : u2;
  const nt = a.newToday.d === b.newToday.d ? { d: a.newToday.d, n: max(a.newToday.n, b.newToday.n) } : a.newToday.d > b.newToday.d ? a.newToday : b.newToday;
  const out: State = {
    ...a,
    ver: 3,
    created: a.created <= b.created ? a.created : b.created,
    xpBy,
    xp: Object.values(xpBy).reduce((s, v) => s + v, 0),
    days: mergeMap(a.days, b.days, mergeDay),
    items: mergeMap(a.items, b.items, (x, y) => ({ c: max(x.c, y.c), w: max(x.w, y.w) })),
    tones: mergeMap(a.tones, b.tones, (x, y) => [max(x[0], y[0]), max(x[1], y[1])] as [number, number]),
    bestCombo: max(a.bestCombo, b.bestCombo), correct: max(a.correct, b.correct),
    speakBest: max(a.speakBest, b.speakBest), speakCount: max(a.speakCount, b.speakCount), fiveDone: max(a.fiveDone, b.fiveDone),
    lastSeen: maxStr(a.lastSeen, b.lastSeen),
    settings: { ...newerSettings.settings }, theme: newerSettings.theme, settingsAt: max(a.settingsAt, b.settingsAt) || undefined,
    pron: {
      lessonDone: a.pron.lessonDone || b.pron.lessonDone,
      q: mergeMap(a.pron.q, b.pron.q, max),
      ...(a.pron.opened || b.pron.opened ? { opened: true } : {}),
      ...(a.pron.chartSeen || b.pron.chartSeen ? { chartSeen: true } : {}),
    },
    units: mergeMap(a.units, b.units, mergeUnit),
    levels: mergeMap(a.levels, b.levels, (x, y) => ({ best: max(x.best, y.best), ...(x.passed || y.passed ? { passed: true } : {}) })),
    srs: mergeMap(a.srs, b.srs, pickCard),
    chars: mergeMap(a.chars, b.chars, max),
    newToday: { ...nt },
    stories: mergeMap(a.stories, b.stories, max),
    dev: a.dev,
  };
  const gate = maxStr(a.gateOff, b.gateOff); if (gate) out.gateOff = gate; else delete out.gateOff;
  if (lastUnit) out.lastUnit = { ...lastUnit }; else delete out.lastUnit;
  const lb = maxStr(a.lastBackup, b.lastBackup); if (lb) out.lastBackup = lb; else delete out.lastBackup;
  if (!out.settingsAt) delete out.settingsAt;
  return out;
}

/** Hai bản tiến độ có khác nhau về nội dung không (bỏ qua mã máy). Dùng để tránh ghi lên mạng khi không có gì mới. */
export function sameProgress(x: State, y: State): boolean {
  const strip = (s: State) => JSON.stringify({ ...s, dev: undefined });
  return strip(x) === strip(y);
}
