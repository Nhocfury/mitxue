import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EXTRA, EXTRA_AUDIO, LESSONS, SENT_AUDIO, STORIES, AUDIO } from "../../src/lib/data";

const pub = (p: string) => resolve(__dirname, "../../public", p);
describe("file âm thanh câu", () => {
  const sents = [...LESSONS.flatMap(L => [...L.dialogue, ...L.grammar.flatMap(g => g.ex)]), ...STORIES.flatMap(s => s.lines)];
  it("mọi câu trong bài học và truyện đều có file đọc nguyên câu", () => {
    const missing = sents.filter(s => !SENT_AUDIO[s.zh]).map(s => s.zh);
    expect(missing).toEqual([]);
    for (const f of Object.values(SENT_AUDIO)) expect(existsSync(pub("audio/c/" + f))).toBe(true);
  });
  it("mọi từ ngoài HSK đều có file đọc", () => {
    const missing = Object.keys(EXTRA).filter(w => !AUDIO[w] && !EXTRA_AUDIO[w]);
    expect(missing).toEqual([]);
    for (const f of Object.values(EXTRA_AUDIO)) expect(existsSync(pub("audio/x/" + f))).toBe(true);
  });
});
