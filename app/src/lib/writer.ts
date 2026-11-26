/* Khung tập viết chữ Hán (thư viện hanzi-writer, dữ liệu nét có sẵn trong máy: window.STROKES). */
import HanziWriter from "hanzi-writer";

export type Writer = HanziWriter;

export function createWriter(el: HTMLElement, ch: string, opt: Record<string, unknown> = {}): Writer | null {
  el.innerHTML = "";
  const data = window.STROKES[ch];
  if (!data) { el.innerHTML = `<div class="muted" style="padding:20px">Chưa có dữ liệu nét cho chữ này</div>`; return null; }
  const size = (opt.size as number) || 200;
  const dark = document.documentElement.dataset.theme === "dark";
  return HanziWriter.create(el, ch, {
    width: size, height: size, padding: 8, showOutline: true, strokeAnimationSpeed: 1, delayBetweenStrokes: 250,
    strokeColor: dark ? "#f6e9ea" : "#2a1a1c", radicalColor: "#c8102e", outlineColor: dark ? "#3d2a2e" : "#eedfdc",
    drawingColor: "#c8102e", highlightColor: "#e9a90a",
    charDataLoader: (_c: string, done: (d: never) => void) => done(data as never),
    ...opt,
  });
}
