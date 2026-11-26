import { describe, expect, it } from "vitest";
import { markSyl, noTone, plainSyl, retone, splitSyl, toneOfSyl } from "../../src/lib/pinyin";

describe("pinyin", () => {
  it("tách âm tiết", () => {
    expect(splitSyl("xuésheng")).toEqual(["xué", "sheng"]);
    expect(splitSyl("Nǐ hǎo!")).toEqual(["Nǐ", " ", "hǎo", "!"]);
    expect(splitSyl("nǚháir")).toEqual(["nǚ", "háir"]);
    expect(splitSyl("Zhōngguórén")).toEqual(["Zhōng", "guó", "rén"]);
  });
  it("đánh dấu thanh đúng vị trí", () => {
    const cases: [string, number, string][] = [["hao", 3, "hǎo"], ["liu", 2, "liú"], ["gui", 4, "guì"], ["luu", 4, "lǜ"],
      ["ju", 1, "jū"], ["xue", 2, "xué"], ["yuan", 2, "yuán"], ["duo", 1, "duō"], ["zhong", 1, "zhōng"], ["ma", 5, "ma"]];
    for (const [b, t, r] of cases) expect(markSyl(b, t)).toBe(r);
  });
  it("bỏ dấu ↔ có dấu", () => {
    expect(plainSyl("lǜ")).toEqual(["luu", 4]);
    expect(plainSyl("ma")).toEqual(["ma", 5]);
    expect(toneOfSyl("mǎ")).toBe(3);
    expect(toneOfSyl("de")).toBe(5);
    expect(noTone("Nǐ hǎo")).toBe("nihao");
  });
  it("retone đổi đúng một thanh", () => {
    for (let i = 0; i < 50; i++) {
      const r = retone("xuésheng")!;
      expect(r).not.toBe("xuésheng");
      expect(noTone(r)).toBe("xuesheng");
    }
  });
});
