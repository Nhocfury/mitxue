import { describe, expect, it } from "vitest";
import { mergeState, pickCard, sameProgress } from "../../src/lib/merge";
import { blankState, migrate } from "../../src/lib/storage";
import type { SrsCard, State } from "../../src/lib/types";

const card = (reps: number, lastReview: number | null, due = 1): SrsCard =>
  ({ due, stability: reps, difficulty: 5, elapsed: 0, scheduled: 0, reps, lapses: 0, state: 2, lastReview, added: "2026-11-01" });

/** Máy giả lập: tiến độ riêng + mã máy riêng. */
function device(dev: string, f: (s: State) => void): State {
  const s = blankState("2026-11-01"); s.dev = dev; f(s); return s;
}
const pc = device("dPC", s => {
  s.xpBy = { dPC: 120 }; s.xp = 120;
  s.srs = { a: card(3, 100), b: card(1, 50) };
  s.units = { "1:1": { steps: { vocab: true, chars: true }, best: 70, done: false, vc: 2 } };
  s.days = { "2026-11-20": { sec: 1800, q: 40, ok: 30, xp: 60 } };
  s.levels = { 1: { best: 60 } }; s.chars = { 你: 1 }; s.stories = { s1: 1 };
  s.settings.goalMin = 30; s.settingsAt = 1000; s.lastSeen = "2026-11-20";
});
const phone = device("dPhone", s => {
  s.xpBy = { dPhone: 45 }; s.xp = 45;
  s.srs = { a: card(2, 90), c: card(1, 70) };
  s.units = { "1:1": { steps: { vocab: true, grammar: true }, best: 85, done: true, vc: 3 } };
  s.days = { "2026-11-20": { sec: 600, q: 50, ok: 45, xp: 20, chest: true }, "2026-11-21": { sec: 300, q: 10, ok: 9 } };
  s.levels = { 1: { best: 40, passed: true } }; s.chars = { 你: 2, 好: 1 };
  s.settings.goalMin = 45; s.settingsAt = 2000; s.lastSeen = "2026-11-21";
});

describe("gộp tiến độ 2 máy", () => {
  const m = mergeState(pc, phone);
  it("XP cộng theo máy, không mất", () => {
    expect(m.xpBy).toEqual({ dPC: 120, dPhone: 45 }); expect(m.xp).toBe(165);
  });
  it("thẻ ôn: giữ thẻ ôn nhiều hơn, thẻ chỉ có ở 1 máy vẫn còn", () => {
    expect(m.srs.a.reps).toBe(3); expect(Object.keys(m.srs).sort()).toEqual(["a", "b", "c"]);
  });
  it("bài học: bước xong ở đâu cũng tính, điểm cao nhất", () => {
    expect(m.units["1:1"]).toEqual({ steps: { chars: true, grammar: true, vocab: true }, best: 85, done: true, vc: 3 });
    expect(m.levels[1]).toEqual({ best: 60, passed: true });
    expect(m.chars).toEqual({ 你: 2, 好: 1 });
  });
  it("ngày: lấy lớn nhất từng chỉ số, rương đã mở giữ nguyên", () => {
    expect(m.days["2026-11-20"]).toEqual({ sec: 1800, q: 50, ok: 45, xp: 60, chest: true });
    expect(m.days["2026-11-21"].sec).toBe(300);
  });
  it("cài đặt: bản sửa sau cùng thắng; mã máy giữ của máy đang gộp", () => {
    expect(m.settings.goalMin).toBe(45); expect(m.dev).toBe("dPC"); expect(mergeState(phone, pc).dev).toBe("dPhone");
  });
});

describe("tính chất an toàn", () => {
  const strip = (s: State) => JSON.parse(JSON.stringify({ ...s, dev: undefined }));
  it("giao hoán: A+B = B+A (trừ mã máy)", () => {
    expect(strip(mergeState(pc, phone))).toEqual(strip(mergeState(phone, pc)));
  });
  it("lũy đẳng: gộp lại lần nữa không đổi gì", () => {
    const m = mergeState(pc, phone);
    expect(strip(mergeState(m, phone))).toEqual(strip(m));
    expect(strip(mergeState(m, m))).toEqual(strip(m));
    expect(sameProgress(mergeState(m, pc), m)).toBe(true);
  });
  it("kết hợp: (A+B)+C = A+(B+C)", () => {
    const tab = device("dTab", s => { s.xpBy = { dTab: 7 }; s.xp = 7; s.srs = { b: card(5, 999) }; s.days = { "2026-11-22": { sec: 60, q: 1, ok: 1 } }; });
    expect(strip(mergeState(mergeState(pc, phone), tab))).toEqual(strip(mergeState(pc, mergeState(phone, tab))));
  });
  it("học tiếp sau khi gộp rồi gộp lại: XP không bị nhân đôi", () => {
    let a = mergeState(pc, phone), b = mergeState(phone, pc);
    a.xpBy = { ...a.xpBy, dPC: a.xpBy!.dPC + 10 }; a.xp += 10;          // PC học thêm 10 XP
    b.xpBy = { ...b.xpBy, dPhone: b.xpBy!.dPhone + 5 }; b.xp += 5;      // điện thoại học thêm 5 XP
    a = mergeState(a, b); b = mergeState(b, a);
    expect(a.xp).toBe(180); expect(b.xp).toBe(180);
  });
  it("dữ liệu cũ (chưa có xpBy) gộp vẫn đúng", () => {
    const old = migrate({ ver: 3, xp: 50, srs: {} }, "2026-11-01");
    const m = mergeState(old, pc);
    expect(m.xp).toBe(170);
  });
  it("pickCard không phụ thuộc thứ tự khi hòa", () => {
    const x = card(2, 10, 5), y = card(2, 10, 7);
    expect(pickCard(x, y)).toEqual(pickCard(y, x));
  });
});
