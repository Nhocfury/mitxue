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

describe("âm thanh đã chuẩn hóa (-16 LUFS)", () => {
  it("mọi file khớp dấu vân tay của build_audio.py (không bị chép đè bằng bản chưa chuẩn hóa)", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const man = JSON.parse(readFileSync(resolve(__dirname, "../../../content/audio_manifest.json"), "utf8")) as Record<string, Record<string, number>>;
    const bad: string[] = [];
    for (const [d, files] of Object.entries(man)) {
      const onDisk = readdirSync(pub("audio/" + d)).filter(f => f.endsWith(".mp3"));
      if (onDisk.length !== Object.keys(files).length) bad.push(`${d}: ${onDisk.length} file trên đĩa, manifest ${Object.keys(files).length}`);
      for (const f of onDisk) if (statSync(pub(`audio/${d}/${f}`)).size !== files[f]) bad.push(`${d}/${f}`);
    }
    expect(bad.slice(0, 5), "chạy lại: python3 content/build_audio.py").toEqual([]);
  });
});
