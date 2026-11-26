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

let lastUtterance: SpeechSynthesisUtterance | null = null; // giữ tham chiếu, tránh Chrome/Edge thu dọn giữa chừng
/**
 * Đọc bằng giọng tiếng Trung của trình duyệt. Trả về true nếu đọc được.
 * Chống 2 lỗi của Edge/Chrome: (1) gọi speak() ngay sau cancel() bị nuốt mất → chờ 80 ms;
 * (2) giọng "Online" im lặng khi mạng chập chờn → quá 2,5 giây chưa bắt đầu đọc thì bỏ, trả false.
 */
function speakTTS(text: string, my: number): Promise<boolean> {
  const v = zhVoice;
  if (!v || typeof speechSynthesis === "undefined") return Promise.resolve(false);
  return new Promise(res => {
    let started = false, done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; res(ok); } };
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v; u.lang = v.lang; u.rate = 0.85 * S.settings.rate;
    u.onstart = () => { started = true; };
    u.onend = () => finish(true);
    u.onerror = () => finish(started);
    lastUtterance = u;
    setTimeout(() => {
      if (my !== token) return finish(true);          // đã bấm phát cái khác
      speechSynthesis.resume(); speechSynthesis.speak(u);
    }, 80);
    setTimeout(() => { if (!started && !done) { speechSynthesis.cancel(); finish(false); } }, 2500);
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
  if (await speakTTS(c, my)) return true;
  if (my === token) return playSylSeq(pinyinOfToken(c), my);
}

/** Đọc một câu. */
export async function playSentence(s: Pick<Sentence, "zh" | "t">): Promise<unknown> {
  stopAudio(); touch(); const my = token;
  if (await speakTTS(s.zh, my)) return true;      // đọc bằng giọng máy được thì xong
  for (const t of s.t) {                             // không thì ghép audio từng từ
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
