import { beforeEach, describe, expect, it } from "vitest";
import { CHEST_XP, checkBedtime, chestReady, isBedtime, lastDays, openChest, quests, starsOf } from "../../src/lib/motivation";
import { S, replaceState } from "../../src/lib/state.svelte";
import { blankState } from "../../src/lib/storage";
import { todayStr } from "../../src/lib/util";

beforeEach(() => replaceState(blankState()));

describe("sao của bài", () => {
  it("chưa qua 0 sao, qua 1, ≥90 2, 100 3", () => {
    expect(starsOf(0)).toBe(0); expect(starsOf(79)).toBe(0); expect(starsOf(80)).toBe(1);
    expect(starsOf(90)).toBe(2); expect(starsOf(100)).toBe(3); expect(starsOf(60, 60)).toBe(1);
  });
});

describe("nhiệm vụ ngày + rương", () => {
  it("ngày mới chưa xong nhiệm vụ, chưa mở được rương", () => {
    expect(quests().every(q => !q.done)).toBe(true);
    expect(chestReady()).toBe(false); expect(openChest()).toBe(false);
  });
  it("xong 3 nhiệm vụ → mở rương +XP đúng 1 lần", () => {
    S.days[todayStr()] = { sec: S.settings.goalMin * 60, q: 25, ok: 20, steps: 1 };
    expect(quests().every(q => q.done)).toBe(true);
    const xp = S.xp;
    expect(openChest()).toBe(true);
    expect(S.xp - xp).toBe(CHEST_XP);
    expect(openChest()).toBe(false);
  });
});

describe("dải 7 ngày", () => {
  it("đánh dấu ngày có học và ngày đủ mục tiêu", () => {
    const now = new Date(2026, 10, 26, 10);
    S.days["2026-11-26"] = { sec: 60 * 60, q: 5, ok: 5 };
    S.days["2026-11-24"] = { sec: 200, q: 0, ok: 0 };
    const w = lastDays(7, now);
    expect(w).toHaveLength(7);
    expect(w[6]).toMatchObject({ ds: "2026-11-26", today: true, studied: true, goal: true, wd: "T5" });
    expect(w[4]).toMatchObject({ studied: true, goal: false });
    expect(w[5].studied).toBe(false);
  });
});

describe("nhắc giờ ngủ", () => {
  it("23:00–5:00 là giờ ngủ, nhắc 1 lần mỗi đêm (kể cả qua nửa đêm)", () => {
    expect(isBedtime(new Date(2026, 10, 26, 22, 59))).toBe(false);
    expect(checkBedtime(new Date(2026, 10, 26, 23, 5))).toBe(true);
    expect(checkBedtime(new Date(2026, 10, 26, 23, 40))).toBe(false);
    expect(checkBedtime(new Date(2026, 10, 27, 0, 30))).toBe(false);
    expect(checkBedtime(new Date(2026, 10, 27, 23, 1))).toBe(true);
    expect(isBedtime(new Date(2026, 10, 27, 5, 0))).toBe(false);
  });
});
