import { beforeEach, describe, expect, it } from "vitest";
import { lvOf, streak } from "../../src/lib/progress";
import { S, replaceState } from "../../src/lib/state.svelte";
import { blankState } from "../../src/lib/storage";

beforeEach(() => replaceState(blankState("2026-11-01")));
describe("XP và streak", () => {
  it("cấp độ", () => {
    expect(lvOf(0)).toEqual({ lv: 1, into: 0, need: 100 });
    expect(lvOf(100).lv).toBe(2);
    expect(lvOf(220).lv).toBe(3);
  });
  it("streak: mỗi tuần được nghỉ 1 ngày", () => {
    for (const d of ["2026-11-23", "2026-11-24", "2026-11-26"]) S.days[d] = { sec: 0, q: 5, ok: 5 }; // T2,T3,(T4 nghỉ),T5
    expect(streak(new Date("2026-11-26T12:00:00"))).toBe(3);
    delete S.days["2026-11-24"]; // nghỉ 2 ngày trong 1 tuần → đứt
    expect(streak(new Date("2026-11-26T12:00:00"))).toBe(1);
  });
});
