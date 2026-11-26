import { describe, expect, it } from "vitest";
import { hasLesson, sentsUpTo, unitCount } from "../../src/lib/data";
import { levelTestQs, practiceSets, qOrder, orderable, unitTestQs, type ChoiceQ, type Question, type Rich } from "../../src/lib/questions";

const text = (r: Rich) => r.map(s => ("v" in s ? s.v : s.k === "syl" ? s.b + s.t : "")).join("");
function checkChoice(q: ChoiceQ) {
  expect(q.opts.filter(o => o.ok).length).toBe(1);
  expect(q.opts.length).toBeGreaterThanOrEqual(2);
  const t = q.opts.map(o => text(o.rich));
  expect(new Set(t).size).toBe(t.length); // không trùng đáp án
}
const choices = (qs: Question[]) => qs.filter((q): q is ChoiceQ => q.type === "choice");

describe("câu hỏi", () => {
  it("kiểm tra cuối bài: 20 câu, có câu nói, mỗi câu đúng 1 đáp án (mọi bài HSK 1–3)", () => {
    for (const lv of [1, 2, 3]) for (let u = 1; u <= unitCount(lv); u++) {
      const qs = unitTestQs(lv, u);
      expect(qs.length).toBe(20);
      expect(qs.filter(q => q.type === "speak").length).toBe(1);
      choices(qs).forEach(checkChoice);
    }
  });
  it("đáp án nhiễu dạng câu chỉ lấy từ câu đã học", () => {
    for (const lv of [1, 2]) for (let u = 1; u <= unitCount(lv); u++) {
      const ok = new Set(sentsUpTo(lv, u).flatMap(s => [s.zh, s.vi]));
      for (let r = 0; r < 5; r++) for (const q of choices(unitTestQs(lv, u)))
        if (q.prompt.startsWith("Nghe câu") || q.prompt.startsWith("Câu tiếng Trung"))
          for (const o of q.opts) expect(ok.has(text(o.rich))).toBe(true);
    }
  });
  it("bộ luyện tập không rỗng", () => {
    for (const lv of [1, 2]) for (let u = 1; u <= unitCount(lv); u++)
      for (const s of practiceSets(lv, u)) { const qs = s.make(); if (s.name !== "Viết chữ") expect(qs.length).toBeGreaterThan(0); choices(qs).forEach(checkChoice); }
  });
  it("thi tổng HSK 1, 2: 40 câu", () => {
    for (const lv of [1, 2]) { expect(hasLesson(lv)).toBe(true); const qs = levelTestQs(lv); expect(qs.length).toBe(40); choices(qs).forEach(checkChoice); }
  });
  it("câu sắp xếp ghép lại đúng câu gốc", () => {
    for (const s of sentsUpTo(2, 11).filter(orderable)) {
      const q = qOrder(s);
      expect(q.toks.join("") + q.end).toBe(s.zh);
    }
  });
});
