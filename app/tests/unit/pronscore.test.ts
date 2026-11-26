import { describe, expect, it } from "vitest";
import { base, buildTarget, scorePron, setTone, splitSyl, toneOf } from "../../src/lib/pronscore";
import fixtures from "./fixtures/pron.json";

describe("tiện ích pinyin", () => {
  it("tách phụ âm đầu / vần, thanh", () => {
    expect(splitSyl("xué")).toEqual(["x", "ué"]);
    expect(splitSyl("zhōng")).toEqual(["zh", "ōng"]);
    expect(splitSyl("wǒ")).toEqual(["w", "ǒ"]);
    expect(splitSyl("èr")).toEqual(["", "èr"]);
    expect(splitSyl("nǚ")).toEqual(["n", "ǚ"]);
    expect(toneOf("ǎo")).toBe(3); expect(toneOf("e")).toBe(5);
    expect(base("iàn")).toBe("ian"); expect(base("ǚ")).toBe("ü");
  });
  it("đặt dấu thanh đúng chỗ", () => {
    expect(setTone("ao", 3)).toBe("ǎo"); expect(setTone("iu", 2)).toBe("iú"); expect(setTone("ui", 4)).toBe("uì");
    expect(setTone("ou", 1)).toBe("ōu"); expect(setTone("ue", 2)).toBe("ué"); expect(setTone("ü", 3)).toBe("ǚ");
  });
});

describe("luật chấp nhận", () => {
  it("3-3 biến điệu, 不, 一, thanh nhẹ, 儿 hóa", () => {
    const t = buildTarget([..."你好"], ["nǐ", "hǎo"]);
    expect(t[0]!.acc.has("í")).toBe(true);
    const u = buildTarget([..."不是一个"], ["bú", "shì", "yí", "gè"]);
    expect(u[0]!.acc.has("ù")).toBe(true); expect(u[2]!.acc.has("ī")).toBe(true); expect(u[3]!.acc.has("e")).toBe(true);
    expect(buildTarget([..."哪儿"], ["nǎ", "r"])[1]).toBeNull();
  });
  it("đọc đúng hết → 100; sai thanh, sai âm, thiếu → đánh dấu đúng loại", () => {
    const ch = [..."我是学生"], sy = ["wǒ", "shì", "xué", "shēng"];
    expect(scorePron(ch, sy, ["w", "ǒ", "sh", "ì", "x", "ué", "sh", "ēng"]).score).toBe(100);
    const r = scorePron(ch, sy, ["w", "ǒ", "sh", "ì", "x", "uě", "sh", "ēn"]);
    expect(r.syl.map(s => s.status)).toEqual(["ok", "ok", "tone", "sound"]);
    expect(r.syl[2].heard).toBe("xuě");
    expect(scorePron(ch, sy, ["w", "ǒ", "x", "ué", "sh", "ēng"]).syl[1].status).toBe("missed");
  });
});

describe("khớp bản Python tham chiếu (560 mẫu từ bộ đánh giá)", () => {
  it("cùng token nghe được → cùng kết quả từng âm tiết", () => {
    const bad: string[] = [];
    for (const f of fixtures as { chars: string[]; sy: string[]; heard: string[]; expect: string[] }[]) {
      const got = scorePron(f.chars, f.sy, f.heard).syl.map(s => s.status);
      if (JSON.stringify(got) !== JSON.stringify(f.expect)) bad.push(`${f.chars.join("")}: ${got} ≠ ${f.expect}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
