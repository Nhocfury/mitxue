import { beforeEach, describe, expect, it } from "vitest";
import { addNew, CHUNK_SIZE, newGate, nextAction, nextUnit, pyHidden, stepsOf, unitOpen, unitProg, vocabChunks } from "../../src/lib/curriculum";
import { LEVELS, unitCount, wordsOf } from "../../src/lib/data";
import { S, replaceState } from "../../src/lib/state.svelte";
import { blankState } from "../../src/lib/storage";

beforeEach(() => replaceState(blankState()));

describe("lộ trình", () => {
  it("chỉ bài 1 HSK 1 mở lúc đầu", () => {
    expect(unitOpen(1, 1)).toBe(true);
    expect(unitOpen(1, 2)).toBe(false);
    expect(unitOpen(2, 1)).toBe(false);
  });
  it("qua bài 1 thì mở bài 2; qua thi tổng thì mở cấp sau", () => {
    unitProg(1, 1).done = true;
    expect(unitOpen(1, 2)).toBe(true);
    S.levels[1] = { best: 85, passed: true };
    expect(unitOpen(2, 1)).toBe(true);
  });
  it("bài tiếp theo → thi tổng khi xong hết bài", () => {
    expect(nextUnit()).toEqual({ lv: 1, u: 1 });
    for (let u = 1; u <= unitCount(1); u++) unitProg(1, u).done = true;
    expect(nextUnit()).toEqual({ lv: 1, u: "test" });
  });
  it("người mới: việc đầu tiên là học phát âm", () => {
    expect(nextAction().route).toEqual({ name: "pron", tab: "learn" });
    S.pron.lessonDone = true;
    expect(nextAction().route).toEqual({ name: "lesson", lv: 1, u: 1 });
    expect(nextAction().sub).toContain("Từ mới phần 1/");
  });
  it("mọi bài: chia phần ≤ 8 từ, không sót từ nào", () => {
    for (const lv of LEVELS) for (let u = 1; u <= unitCount(lv); u++) {
      const ch = vocabChunks(lv, u);
      expect(ch.every(c => c.length > 0 && c.length <= CHUNK_SIZE)).toBe(true);
      expect(ch.flat().map(w => w.key)).toEqual(wordsOf(lv, u).map(w => w.key));
    }
  });
  it("chặn từ mới khi đủ chỉ tiêu ngày", () => {
    expect(newGate()).toBeNull();
    addNew(S.settings.newPerDay);
    expect(newGate()?.kind).toBe("new");
  });
  it("pinyin mờ từ HSK 2 ở chế độ tự động", () => {
    expect(pyHidden(1)).toBe(false); expect(pyHidden(2)).toBe(true);
    S.settings.pyMode = "show"; expect(pyHidden(3)).toBe(false);
  });
});

describe("số bước theo từng bài", () => {
  it("bài có giáo trình 6 bước, bài chỉ có từ vựng 4 bước (HSK 3 mới soạn bài 1–10)", () => {
    expect(stepsOf(1, 1)).toHaveLength(6);
    expect(stepsOf(3, 1)).toHaveLength(6);
    expect(stepsOf(3, 10)).toHaveLength(6);
    expect(stepsOf(3, 11)).toHaveLength(4);
    expect(stepsOf(4, 1)).toHaveLength(4);
  });
});
