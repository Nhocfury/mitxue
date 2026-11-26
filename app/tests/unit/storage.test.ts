import { describe, expect, it } from "vitest";
import { blankState, migrate } from "../../src/lib/storage";
import { parseBackup } from "../../src/lib/backup";

const v2 = {
  xp: 182, created: "2026-11-20", settings: { newPerDay: 15, goalMin: 45 }, migr4: true,
  units: { "1:1": { steps: { vocab: true }, best: 15, done: false, vc: 3 } },
  srs: {
    "1:你": { due: 1800000000000, iv: 7, ef: 2.5, reps: 3, lapses: 1, added: "2026-11-20" },
    "1:好": { due: 1700000000000, iv: 0, ef: 2.3, reps: 0, lapses: 0, added: "2026-11-21" },
  },
  pron: { lessonDone: true },
};

describe("chuyển dữ liệu cũ", () => {
  it("dữ liệu rỗng → trạng thái trắng", () => {
    expect(migrate(null, "2026-11-26")).toEqual(blankState("2026-11-26"));
  });
  it("v2 (SM-2) → v3 (FSRS), giữ ngày đến hạn và tiến độ", () => {
    const s = migrate(v2, "2026-11-26");
    expect(s.ver).toBe(3);
    expect(s.xp).toBe(182);
    expect(s.settings.newPerDay).toBe(10);
    expect(s.settings.goalMin).toBe(45);
    expect(s.settings.pyMode).toBe("auto");
    expect(s.units["1:1"].vc).toBe(3);
    expect(s.pron.q).toEqual({});
    const a = s.srs["1:你"];
    expect(a.due).toBe(1800000000000);
    expect(a.state).toBe(2);
    expect(a.scheduled).toBe(7);
    expect(a.stability).toBe(7);
    expect(a.lapses).toBe(1);
    const b = s.srs["1:好"];
    expect(b.state).toBe(0);
    expect(b.due).toBe(1700000000000);
    expect("migr4" in s).toBe(false);
  });
  it("chuyển hai lần không đổi gì thêm", () => {
    const once = migrate(v2, "2026-11-26");
    expect(migrate(JSON.parse(JSON.stringify(once)), "2026-11-26")).toEqual(once);
  });
  it("đọc file sao lưu", () => {
    expect(parseBackup(JSON.stringify(v2))?.xp).toBe(182);
    expect(parseBackup("{\"hello\":1}")).toBeNull();
    expect(parseBackup("không phải json")).toBeNull();
  });
});
