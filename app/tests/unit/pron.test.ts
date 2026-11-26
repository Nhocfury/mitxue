import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRON_COURSE, scoreTone, soundQ, template, toneQ } from "../../src/lib/pron";
import { AUDIO } from "../../src/lib/data";

const pub = (p: string) => resolve(__dirname, "../../public", p);
describe("phát âm", () => {
  it("câu nghe thanh/âm: có file audio, đúng 1 đáp án", () => {
    for (let i = 0; i < 200; i++) for (const q of [toneQ(), soundQ()]) {
      expect(existsSync(pub(`audio/s/${q.syl.s}${q.syl.t}.mp3`))).toBe(true);
      expect(q.opts.filter(o => o.ok).length).toBe(1);
    }
  });
  it("khóa phát âm đủ 4 bài, bài nào cũng có câu", () => {
    expect(PRON_COURSE.length).toBe(4);
    for (const b of PRON_COURSE) expect(b.make().length).toBeGreaterThanOrEqual(8);
  });
  it("chấm thanh: giọng đi lên = thanh 2, đi xuống = thanh 4", () => {
    const frames = (t: number) => template(t, 40).map(st => 200 * 2 ** (st / 12));
    for (const t of [1, 2, 3, 4]) {
      const r = scoreTone(frames(t), t)!;
      expect(r.heard).toBe(t);
      expect(r.score).toBeGreaterThanOrEqual(80);
    }
    expect(scoreTone(frames(4), 2)!.score).toBeLessThanOrEqual(40);
    expect(scoreTone([-1, -1, -1], 1)).toBeNull();
  });
  it("mọi từ có audio đều có file", () => {
    for (const f of Object.values(AUDIO)) expect(existsSync(pub("audio/w/" + f))).toBe(true);
  });
});
