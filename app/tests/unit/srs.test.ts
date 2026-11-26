import { beforeEach, describe, expect, it } from "vitest";
import { answer, dueKeys, intro, RELEARN_MIN } from "../../src/lib/srs";
import { S } from "../../src/lib/state.svelte";

const NOW = new Date("2026-11-26T10:00:00");
const K = "1:你";
beforeEach(() => { for (const k of Object.keys(S.srs)) delete S.srs[k]; });

describe("FSRS", () => {
  it("từ mới hẹn ôn 4h sáng mai", () => {
    intro(K, NOW);
    expect(new Date(S.srs[K].due).toISOString()).toBe(new Date("2026-11-27T04:00:00").toISOString());
    expect(dueKeys(NOW.getTime())).toEqual([]);
  });
  it("làm đúng khi chưa đến hạn thì không đổi lịch", () => {
    intro(K, NOW); const before = { ...S.srs[K] };
    answer(K, true, NOW);
    expect(S.srs[K]).toEqual(before);
  });
  it("ôn đúng đúng hạn → giãn ra vài ngày, lần sau giãn xa hơn", () => {
    intro(K, NOW);
    const t1 = new Date(S.srs[K].due); answer(K, true, t1);
    const gap1 = (S.srs[K].due - t1.getTime()) / 864e5;
    expect(gap1).toBeGreaterThanOrEqual(1);
    const t2 = new Date(S.srs[K].due); answer(K, true, t2);
    const gap2 = (S.srs[K].due - t2.getTime()) / 864e5;
    expect(gap2).toBeGreaterThan(gap1);
    expect(S.srs[K].reps).toBe(2);
  });
  it("ôn sai → hỏi lại sau 10 phút; thẻ đã thuộc mà quên thì tính 1 lần quên", () => {
    intro(K, NOW); const t = new Date(S.srs[K].due);
    answer(K, false, t);                       // thẻ mới sai: chưa tính "quên"
    expect(S.srs[K].due).toBe(t.getTime() + RELEARN_MIN * 60_000);
    expect(S.srs[K].lapses).toBe(0);
    const t2 = new Date(S.srs[K].due); answer(K, true, t2);
    const t3 = new Date(S.srs[K].due); answer(K, false, t3);   // đã vào ôn rồi mới quên
    expect(S.srs[K].lapses).toBe(1);
    expect(S.srs[K].due).toBe(t3.getTime() + RELEARN_MIN * 60_000);
  });
  it("trả lời sai một từ chưa học → đưa vào lịch ôn", () => {
    answer("1:好", false, NOW);
    expect(S.srs["1:好"]).toBeTruthy();
  });
  it("đúng với từ chưa học thì bỏ qua; khóa lạ thì bỏ qua", () => {
    answer("1:好", true, NOW); answer("9:không có", false, NOW);
    expect(Object.keys(S.srs)).toEqual([]);
  });
});
