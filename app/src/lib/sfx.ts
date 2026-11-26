/* =========================================================================
 * TIẾNG HIỆU ỨNG (sound effects): tự tổng hợp bằng Web Audio, không cần file.
 * Tắt được trong Cài đặt (S.settings.sfx). Nhỏ hơn hẳn audio tiếng Trung để không lấn át.
 * ========================================================================= */
import { S } from "./state.svelte";

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined" || !S.settings.sfx) return null;
  try { ctx ??= new AudioContext(); if (ctx.state === "suspended") void ctx.resume(); return ctx; } catch { return null; }
}

/** Một nốt: tần số (Hz), lúc bắt đầu (giây, tính từ bây giờ), dài (giây), dạng sóng, âm lượng 0..1. */
function tone(c: AudioContext, f: number, at: number, dur: number, type: OscillatorType = "sine", vol = 0.12): void {
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  /** Đúng: hai nốt đi lên. Combo cao thì nốt cao dần. */
  ok(combo = 0): void { const c = ac(); if (!c) return; const k = Math.min(combo, 8) * 30; tone(c, 660 + k, 0, 0.12); tone(c, 990 + k, 0.08, 0.18); },
  bad(): void { const c = ac(); if (!c) return; tone(c, 220, 0, 0.22, "triangle", 0.1); tone(c, 175, 0.1, 0.25, "triangle", 0.08); },
  /** Hết bài: đạt thì hợp âm đi lên, chưa đạt thì 2 nốt nhẹ. */
  done(pass: boolean): void {
    const c = ac(); if (!c) return;
    if (pass) [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.1, 0.3));
    else { tone(c, 392, 0, 0.25); tone(c, 330, 0.15, 0.35); }
  },
  /** Mở rương / lên cấp: chuỗi nốt lấp lánh. */
  reward(): void { const c = ac(); if (!c) return; [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(c, f, i * 0.07, 0.25, "triangle", 0.09)); },
};
