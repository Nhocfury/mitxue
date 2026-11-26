/* =========================================================================
 * ÂM THANH
 * - Từ: file thu sẵn public/audio/w/<mã>.mp3 (bảng tra trong DATA.audio).
 * - Âm tiết: public/audio/s/<âm trần><thanh>.mp3 (vd ma3.mp3, luu4.mp3).
 * - Câu: ưu tiên giọng tiếng Trung của trình duyệt (Edge có giọng "Natural"
 *   miễn phí khi có mạng); không có thì ghép audio từng từ.
 * Mỗi lần phát mới sẽ dừng cái đang phát (biến `token`), nên bấm liên tục
 * không bị chồng tiếng.
 * ========================================================================= */
import { AUDIO, pinyinOfToken } from "./data";
import { SYL, plainSyl, splitSyl, hasPyLetter } from "./pinyin";
import { touch } from "./progress";
import { S } from "./state.svelte";
import type { Sentence } from "./types";
import { isHan, sleep } from "./util";

let current: HTMLAudioElement | null = null;
let token = 0;

export function stopAudio(): void {
  token++;
  if (current) { current.pause(); current = null; }
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

function playFile(src: string, rate = 1): Promise<boolean> {
  return new Promise(res => {
    const a = new Audio(src); a.playbackRate = rate; current = a;
    a.onended = () => res(true); a.onerror = () => res(false);
    a.play().catch(() => res(false));
  });
}

export const wordAudioSrc = (c: string): string | null => (AUDIO[c] ? "audio/w/" + AUDIO[c] : null);
export const sylAudioSrc = (b: string, t: number) => `audio/s/${b}${t}.mp3`;

export function playSyl(b: string, t: number): Promise<boolean> { stopAudio(); touch(); return playFile(sylAudioSrc(b, t)); }

/* ---------- giọng đọc của trình duyệt ---------- */
let zhVoice: SpeechSynthesisVoice | null = null;
function findVoice(): void {
  if (typeof speechSynthesis === "undefined") return;
  const v = speechSynthesis.getVoices();
  const zh = v.filter(x => /zh[-_]CN/i.test(x.lang));
  zhVoice = zh.find(x => /Natural|Online/i.test(x.name) && /Xiaoxiao|Xiaoyi|Yunxi/i.test(x.name))
    || zh.find(x => /Natural|Online/i.test(x.name)) || zh[0] || v.find(x => /^zh/i.test(x.lang)) || null;
}
if (typeof speechSynthesis !== "undefined") { findVoice(); speechSynthesis.onvoiceschanged = findVoice; }
export const voiceName = () => zhVoice?.name ?? null;

function speakTTS(text: string): Promise<boolean> | null {
  if (!zhVoice) return null;
  const v = zhVoice;
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v; u.lang = v.lang; u.rate = 0.85 * S.settings.rate;
    u.onend = () => res(true); u.onerror = () => res(false);
    speechSynthesis.speak(u);
  });
}

async function playSylSeq(py: string, my: number): Promise<void> {
  for (const s of splitSyl(py)) {
    if (my !== token) return;
    if (!hasPyLetter(s)) continue;
    let [b, t] = plainSyl(s);
    if (!SYL[b]) continue;
    if (!SYL[b].includes(t)) t = SYL[b].includes(5) ? 5 : SYL[b][0];
    await playFile(sylAudioSrc(b, t));
  }
}

/** Đọc một từ: file thu sẵn → giọng máy → ghép âm tiết. */
export async function playWord(c: string): Promise<unknown> {
  stopAudio(); touch(); const my = token;
  const src = wordAudioSrc(c);
  if (src) return playFile(src, S.settings.rate);
  return speakTTS(c) ?? playSylSeq(pinyinOfToken(c), my);
}

/** Đọc một câu. */
export async function playSentence(s: Pick<Sentence, "zh" | "t">): Promise<unknown> {
  stopAudio(); touch(); const my = token;
  const tts = speakTTS(s.zh); if (tts) return tts;
  for (const t of s.t) {
    if (my !== token) return;
    if (!isHan(t)) { await sleep(220); continue; }
    const src = wordAudioSrc(t);
    if (src) await playFile(src, Math.max(1, S.settings.rate * 1.15));
    else { const py = pinyinOfToken(t); if (py) await playSylSeq(py, my); }
  }
}

/** Phát lần lượt (nghe cả bài/cả phần). Bấm phát cái khác là dừng chuỗi. */
export async function playAll<T>(items: T[], play: (x: T) => Promise<unknown>, gapMs = 450): Promise<void> {
  stopAudio(); const my = token;
  for (const x of items) {
    if (my !== token) return;
    await play(x);
    token = my;               // play() tự tăng token; lấy lại để chuỗi chạy tiếp
    await sleep(gapMs);
  }
}
