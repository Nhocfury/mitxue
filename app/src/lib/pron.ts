/* =========================================================================
 * PHÁT ÂM: kiến thức (mẹo cho người Việt), câu hỏi nghe, khóa 4 bài kiểm tra,
 * và thuật toán chấm thanh điệu khi nói (đo cao độ giọng).
 * ========================================================================= */
import { playSyl, playWord } from "./audio";
import { WORDS, AUDIO, gloss } from "./data";
import { SYL, markSyl, plainSyl, splitSyl, tones14, hasPyLetter } from "./pinyin";
import type { ChoiceQ, Rich } from "./questions";
import { S } from "./state.svelte";
import { pick, shuffle } from "./util";

/** Âm tiết dùng trong phần phát âm (bỏ vài âm hiếm/lỗi trong bộ audio). */
const BAD = new Set(["diang", "shong", "muo", "luun"]);
export const PSYL: Record<string, number[]> = Object.fromEntries(Object.entries(SYL).filter(([k]) => !BAD.has(k)));

const INITS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"];
export const initialOf = (s: string) => INITS.find(i => s.startsWith(i)) ?? "";
export const INIT_ORDER = ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w"];
export const INIT_TIP: Record<string, string> = {
  "": "Âm tiết không có phụ âm đầu: đọc thẳng vần.",
  b: "Như 'p' KHÔNG bật hơi, gần chữ 'b' Việt nhưng nhẹ, không rung cổ.",
  p: "'p' BẬT HƠI mạnh. Để tờ giấy trước miệng, đọc phải thấy giấy bay.",
  m: "Như 'm' tiếng Việt.", f: "Như 'ph' tiếng Việt.",
  d: "'t' KHÔNG bật hơi, gần 'đ' Việt nhưng nhẹ hơn.",
  t: "Như 'th' Việt, bật hơi mạnh.", n: "Như 'n'.", l: "Như 'l'.",
  g: "Như 'c/k' Việt, KHÔNG bật hơi (không phải 'g' Việt).",
  k: "'k' BẬT HƠI mạnh, đừng đọc thành 'kh'.",
  h: "Gần 'kh' nhẹ, hơi xát ở cuống lưỡi.",
  j: "Gần 'ch' Việt: mặt lưỡi áp ngạc cứng, môi dẹt, KHÔNG bật hơi. jī ≈ 'chi' nhẹ.",
  q: "Như j nhưng BẬT HƠI mạnh. Người Việt hay nhầm với 'k' hay 'qu', đừng nha!",
  x: "Gần 'x' Việt nhưng mặt lưỡi dẹt, môi kéo như đang cười. xī ≈ 'xi'.",
  zh: "Uốn lưỡi, gần 'tr' Việt chuẩn, KHÔNG bật hơi.",
  ch: "Uốn lưỡi như zh nhưng BẬT HƠI mạnh.",
  sh: "Uốn lưỡi, gần 's' (nặng) Việt chuẩn.",
  r: "Uốn lưỡi như sh nhưng có rung, gần 'r' Việt nhẹ. Đừng đọc thành 'd' hay 'z'.",
  z: "Đầu lưỡi chạm chân răng, gần 'ch' + 'x' (dz), KHÔNG bật hơi, KHÔNG uốn lưỡi.",
  c: "Như z nhưng BẬT HƠI mạnh ('ts'). Không phải 'c' Việt!",
  s: "Như 'x' Việt.", y: "Đứng đầu thay cho i/ü: yi = i, yu = ü.", w: "Đứng đầu thay cho u: wu = u, wo = uo.",
};
export const HARD_INIT = ["j", "q", "x", "zh", "ch", "sh", "r", "z", "c"];
export const FINAL_TIP: [string, string][] = [
  ["ü (lü, nü, ju, qu, xu, yu)", "Môi tròn như đọc 'u' nhưng lưỡi đặt như 'i'. Đọc 'i' rồi chu môi lại, giữ lưỡi yên."],
  ["-i sau zh ch sh r z c s", "KHÔNG đọc là 'i'. zhi ≈ 'trư', chi ≈ 'trư' bật hơi, shi ≈ 'sư', ri ≈ 'rư', zi ≈ 'chư' đầu lưỡi, ci ≈ 'chư' bật hơi, si ≈ 'xư'."],
  ["e", "Không phải 'e' Việt. Gần 'ưa' đọc nhanh, hoặc 'ơ' sâu trong họng: hē ≈ 'hưa'."],
  ["en / eng", "en ≈ 'ân', eng ≈ 'âng'. ben ≈ 'bân', feng ≈ 'phâng'."],
  ["in / ing · an / ang", "in ≈ 'in', ing ≈ 'inh' (kéo về sau). an ≈ 'an', ang ≈ 'ang'. Cặp này người Việt rất hay lẫn."],
  ["ian / iang", "ian ≈ 'iên' (không phải 'ian'!), iang ≈ 'iang'. tiān ≈ 'thiên'."],
  ["ou / iu / ui", "ou ≈ 'âu', iu (= iou) ≈ 'iêu', ui (= uei) ≈ 'uây'. guì ≈ 'cuây'."],
  ["un / ong / er", "un (= uen) ≈ 'uân', ong ≈ 'ung', er ≈ 'ơ' rồi cong lưỡi lên."],
];
export const TONE_INFO = [
  { t: 1, name: "Thanh 1 · ngang cao", vi: "Giống thanh ngang Việt nhưng CAO và giữ đều, như đang hát nốt cao.", ex: "mā 妈 mẹ", chao: "55" },
  { t: 2, name: "Thanh 2 · đi lên", vi: "Giống dấu sắc, đi lên từ giữa lên cao, như hỏi lại 'Hả?'.", ex: "má 麻 cây gai", chao: "35" },
  { t: 3, name: "Thanh 3 · xuống rồi lên", vi: "Xuống thấp sát đáy rồi mới lên. Gần dấu hỏi nhưng trầm và chậm hơn.", ex: "mǎ 马 ngựa", chao: "214" },
  { t: 4, name: "Thanh 4 · rơi mạnh", vi: "Từ cao rơi thẳng xuống, dứt khoát như ra lệnh 'Đi!'. Gắt hơn dấu huyền.", ex: "mà 骂 mắng", chao: "51" },
  { t: 5, name: "Thanh nhẹ", vi: "Ngắn, nhẹ, không nhấn. Ví dụ ma trong 妈妈 māma.", ex: "ma 吗 (trợ từ hỏi)", chao: "·" },
];
/** Hình dạng thanh theo thang Chao (1 thấp … 5 cao), dùng vẽ và chấm. */
export const TONE_PTS: Record<number, [number, number][]> = { 1: [[0, 5], [1, 5]], 2: [[0, 3], [1, 5]], 3: [[0, 2], [0.45, 1], [1, 4]], 4: [[0, 5], [1, 1]] };

export function isHard(s: string): boolean {
  const i = initialOf(s), f = s.slice(i.length);
  return HARD_INIT.includes(i) || s.includes("uu") || /^(j|q|x|y)u/.test(s) || /^(zh|ch|sh|r|z|c|s)i$/.test(s) || /(^|[^iu])e(n|ng)?$/.test(f) || /ian$/.test(s);
}

/* ------------------------- câu hỏi nghe ------------------------- */
const COMMON = ["ma", "ba", "da", "ta", "ni", "hao", "wo", "shi", "bu", "de", "le", "zhong", "guo", "xue", "sheng", "lao", "mai", "shu", "chi", "he", "shui", "fan", "cha", "kan", "ting", "shuo", "du", "xie", "zi", "ren", "jia", "qu", "lai", "xiang", "yao", "you", "mei", "duo", "shao", "qian", "kuai", "man", "gao", "xing", "tian", "nian", "yue", "ri", "jin", "ming", "zuo", "zao", "wan", "shang", "xia", "hou", "li", "wai", "dong", "xi", "nan", "bei"].filter(s => PSYL[s]);
const CONF = [["zh", "z", "j"], ["ch", "c", "q"], ["sh", "s", "x"], ["l", "n", "r"]];
const CONF_F = [["an", "ang"], ["en", "eng"], ["in", "ing"], ["ian", "iang"], ["u", "uu"], ["uan", "uuan"], ["ou", "iu"]];
const PLAY: Rich = [];

export interface SylMeta { mode: "tone" | "sound"; s: string; t: number }
export type PronQ = ChoiceQ & { syl: SylMeta };
const sylOpt = (b: string, t: number, color: boolean, ok: boolean) => ({ rich: [{ k: "syl" as const, b, t, size: 24, color }], ok });

/** Đoán thanh. Ưu tiên (35%) âm em hay sai. */
export function toneQ(): PronQ {
  let s = "", t = 1;
  const weak = Object.entries(S.items).filter(([k, v]) => k.startsWith("tone:") && v.w > v.c * 0.5 && v.w > 0)
    .sort((a, b) => (b[1].w - b[1].c) - (a[1].w - a[1].c)).slice(0, 12);
  if (Math.random() < 0.35 && weak.length) {
    const k = pick(weak)[0].split(":")[1]; s = k.slice(0, -1); t = +k.slice(-1);
  }
  if (!PSYL[s]?.includes(t)) for (let k = 0; k < 20; k++) {
    s = pick(Math.random() < 0.6 ? COMMON : Object.keys(PSYL)); t = pick(tones14(s));
    if ([1, 2, 3, 4].every(x => PSYL[s].includes(x))) break;
  }
  return {
    type: "choice", prompt: "Nghe và chọn đúng thanh điệu", main: PLAY, play: true, audio: () => playSyl(s, t), autoplay: true,
    reveal: [{ k: "syl", b: s, t, size: 22, color: true }, { k: "muted", v: ` (thanh ${t})` }],
    opts: [1, 2, 3, 4].filter(x => PSYL[s].includes(x)).map(x => sylOpt(s, x, true, x === t)), tone: t, syl: { mode: "tone", s, t },
  };
}

/** Phân biệt âm dễ nhầm (zh/z/j, an/ang…). */
export function soundQ(): PronQ {
  for (let k = 0; k < 80; k++) {
    const t = 1 + Math.floor(Math.random() * 4);
    let s = "", opts: string[] = [];
    if (Math.random() < 0.55) {
      const g = pick(CONF), a = pick(g);
      const cands = Object.keys(PSYL).filter(x => initialOf(x) === a && PSYL[x].includes(t)); if (!cands.length) continue;
      s = pick(cands); const fin = s.slice(a.length);
      opts = g.map(i => {
        let f = fin;
        const jqx = (x: string) => x === "j" || x === "q" || x === "x";
        if (jqx(i) && !jqx(a) && (f === "i" || f === "")) return "";
        if (jqx(a) && !jqx(i)) f = f.replace(/^u/, "uu");
        return i + f;
      }).filter(x => x && PSYL[x]?.includes(t));
    } else {
      const g = pick(CONF_F);
      const cands = Object.keys(PSYL).filter(x => g.includes(x.slice(initialOf(x).length)) && PSYL[x].includes(t)); if (!cands.length) continue;
      s = pick(cands); const i = initialOf(s);
      opts = g.map(f => i + f).filter(x => PSYL[x]?.includes(t));
    }
    opts = [...new Set(opts)]; if (opts.length < 2) continue;
    const right = s;
    return {
      type: "choice", prompt: "Nghe và chọn đúng âm tiết", main: PLAY, play: true, audio: () => playSyl(right, t), autoplay: true,
      reveal: [{ k: "syl", b: right, t, size: 22 }, { k: "muted", v: " · " + INIT_TIP[initialOf(right)] }],
      opts: shuffle(opts).map(x => sylOpt(x, t, false, x === right)), syl: { mode: "sound", s: right, t },
    };
  }
  return toneQ();
}

/** Ghi thống kê nghe phát âm (để ưu tiên âm hay sai). */
export function recordSyl(m: SylMeta, ok: boolean): void {
  const key = `${m.mode}:${m.s}${m.t}`;
  const it = (S.items[key] ??= { c: 0, w: 0 });
  if (ok) it.c++; else it.w++;
  if (m.mode === "tone") { const tt = S.tones[m.t] ?? (S.tones[m.t] = [0, 0]); tt[1]++; if (ok) tt[0]++; }
}

/* ------------------- khóa phát âm: 4 bài kiểm tra ------------------- */
function ruleQs(): ChoiceQ[] {
  const Q = (q: string, opts: string[], why: string): ChoiceQ => ({
    type: "choice", prompt: "Quy tắc dấu thanh & biến điệu", main: [{ k: "text", v: q, big: true }], reveal: [{ k: "text", v: why }],
    opts: shuffle(opts.map((o, i) => ({ rich: [{ k: "text" as const, v: o }], ok: i === 0 }))),
  });
  return shuffle([
    Q("不是 thực tế đọc là?", ["bú shì", "bù shì", "bǔ shì"], "不 đứng trước thanh 4 thì đọc thanh 2: bú shì."),
    Q("你好 thực tế đọc là?", ["ní hǎo", "nǐ hǎo (đọc đủ cả hai thanh 3)", "nì hǎo"], "Hai thanh 3 liền nhau: thanh 3 đầu đọc thành thanh 2."),
    Q("一个 đọc là?", ["yí gè", "yī gè", "yì gè"], "一 trước thanh 4 đọc thanh 2: yí gè."),
    Q("一天 đọc là?", ["yì tiān", "yí tiān", "yī tiān"], "一 trước thanh 1, 2, 3 đọc thanh 4: yì tiān."),
    Q("Dấu thanh của hao (thanh 3) đặt ở đâu?", ["hǎo", "haǒ", "hǎǒ"], "Có a thì dấu luôn trên a."),
    Q("liu thanh 2 viết đúng là?", ["liú", "líu", "lìu"], "Gặp iu thì dấu đặt trên u (chữ sau)."),
    Q("Trong ju, qu, xu, yu, chữ u thật ra là âm gì?", ["ü (tròn môi, lưỡi như i)", "u như tiếng Việt", "o"], "Sau j, q, x, y thì u là ü, chỉ bỏ hai chấm khi viết."),
    Q("Thanh 3 trong lời nói thường đọc thế nào?", ["Chỉ xuống thấp (nửa dưới)", "Xuống rồi lên đầy đủ", "Ngang cao"], "Chỉ đọc đủ \"xuống rồi lên\" khi đứng riêng hoặc cuối câu."),
  ]);
}
function pairQs(n: number): ChoiceQ[] {
  const cands = WORDS.filter(w => w.lv === 1 && AUDIO[w.c] && w.c.length === 2 && !/[不一]/.test(w.c)).flatMap(w => {
    const syl = splitSyl(w.py).filter(hasPyLetter); if (syl.length !== 2) return [];
    const p = syl.map(plainSyl); if (p.some(([, t]) => t < 1 || t > 4)) return []; if (p[0][1] === 3 && p[1][1] === 3) return [];
    return [{ w, p }];
  });
  return shuffle(cands).slice(0, n).map(({ w, p }) => {
    const right = `${p[0][1]}${p[1][1]}`; const combos = new Set([right]);
    while (combos.size < 4) combos.add(`${1 + Math.floor(Math.random() * 4)}${1 + Math.floor(Math.random() * 4)}`);
    return {
      type: "choice" as const, prompt: "Cặp thanh: nghe từ và chọn pinyin đúng", main: PLAY, play: true, audio: () => playWord(w.c), autoplay: true,
      reveal: [{ k: "hz" as const, v: w.c, size: 26 }, { k: "py" as const, v: " " + w.py }, { k: "text" as const, v: " · " + gloss(w) }],
      opts: shuffle([...combos].map(c => ({ rich: [{ k: "py" as const, v: markSyl(p[0][0], +c[0]) + markSyl(p[1][0], +c[1]), size: 22 }], ok: c === right }))),
    };
  });
}
export const PASS_PRON = 80;
export const PRON_COURSE: { k: string; title: string; desc: string; make: () => ChoiceQ[] }[] = [
  { k: "tone", title: "Bài 1 · Nghe thanh điệu", desc: "Nghe một âm, chọn đúng thanh (10 câu)", make: () => Array.from({ length: 10 }, () => toneQ()) },
  { k: "hard", title: "Bài 2 · Âm khó với người Việt", desc: "Phân biệt zh/z/j, ch/c/q, sh/s/x, an/ang, in/ing… (10 câu)", make: () => Array.from({ length: 10 }, () => soundQ()) },
  { k: "rule", title: "Bài 3 · Dấu thanh & biến điệu", desc: "不, 一, hai thanh 3, vị trí dấu (8 câu)", make: ruleQs },
  { k: "pair", title: "Bài 4 · Cặp thanh", desc: "Nghe từ hai âm tiết thật, chọn pinyin đúng (10 câu)", make: () => pairQs(10) },
];
export const pronCourseDone = () => PRON_COURSE.every(x => (S.pron.q[x.k] || 0) >= PASS_PRON);

/* ------------------- chấm thanh điệu khi nói ------------------- */
/** Đường thanh chuẩn, N điểm, đơn vị ~nửa cung quanh 0. */
export function template(t: number, n = 24): number[] {
  const pts = TONE_PTS[t]; const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1); let k = 0;
    while (k < pts.length - 2 && x > pts[k + 1][0]) k++;
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    out.push((y0 + (y1 - y0) * ((x - x0) / (x1 - x0 || 1)) - 3) * 2.6);
  }
  return out;
}
/** Tần số cơ bản (Hz) của một khung âm bằng tự tương quan; -1 nếu im lặng/không rõ. */
export function autoCorr(buf: Float32Array, sr: number): number {
  let rms = 0; for (const v of buf) rms += v * v; rms = Math.sqrt(rms / buf.length); if (rms < 0.012) return -1;
  const n = buf.length, minL = Math.floor(sr / 450), maxL = Math.floor(sr / 70);
  const c = new Float32Array(maxL + 2);
  for (let l = minL; l <= maxL + 1; l++) { let s = 0; for (let i = 0; i < n - l; i++) s += buf[i] * buf[i + l]; c[l] = s; }
  let e0 = 0; for (let i = 0; i < n; i++) e0 += buf[i] * buf[i];
  let best = -1, bestC = 0;
  for (let l = minL + 1; l <= maxL; l++) if (c[l] > c[l - 1] && c[l] >= c[l + 1] && c[l] > bestC) { bestC = c[l]; best = l; }
  if (best < 0 || bestC / e0 < 0.3) return -1;
  const a = c[best - 1], b = c[best], d = c[best + 1];
  return sr / (best + (a - d) / (2 * (a - 2 * b + d) || 1));
}
const median = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

export interface ToneScore { score: number; heard: number; contour: number[] }
/** Chấm: so hình dạng đường cao độ với 4 thanh. Nghe ra thanh khác thì tối đa 40 điểm. null = không nghe rõ. */
export function scoreTone(frames: number[], target: number): ToneScore | null {
  const idx = frames.map((f, i) => (f > 0 ? i : -1)).filter(i => i >= 0);
  if (idx.length < 8) return null;
  let f = frames.slice(idx[0], idx[idx.length - 1] + 1);
  for (let i = 1; i < f.length; i++) if (f[i] <= 0) f[i] = f[i - 1];
  const med0 = median(f.filter(x => x > 0));
  f = f.map(x => { let y = x; while (y > med0 * 1.7) y /= 2; while (y < med0 / 1.7) y *= 2; return y; }); // sửa lỗi nhảy quãng tám
  const sm = f.map((_, i) => median(f.slice(Math.max(0, i - 2), i + 3)));
  const med = median(sm); const st = sm.map(x => 12 * Math.log2(x / med));
  const N = 24; const rs: number[] = [];
  for (let i = 0; i < N; i++) { const p = (i / (N - 1)) * (st.length - 1); const a = Math.floor(p), b = Math.min(st.length - 1, a + 1); rs.push(st[a] + (st[b] - st[a]) * (p - a)); }
  const mean = rs.reduce((x, y) => x + y, 0) / N; const user = rs.map(x => x - mean);
  const res = [1, 2, 3, 4].map(t => {
    const tp = template(t, N); const tm = tp.reduce((x, y) => x + y, 0) / N; const tc = tp.map(x => x - tm);
    let best = 1e9;
    for (let k = 0.5; k <= 1.6; k += 0.1) { let e = 0; for (let i = 0; i < N; i++) e += (user[i] - tc[i] * k) ** 2; best = Math.min(best, Math.sqrt(e / N)); }
    return { t, rmse: best };
  }).sort((a, b) => a.rmse - b.rmse);
  const mine = res.find(r => r.t === target)!;
  let score = Math.max(0, Math.min(100, Math.round(100 - mine.rmse * 13)));
  if (res[0].t !== target) score = Math.min(score, 40);
  return { score, heard: res[0].t, contour: user };
}
export const TONE_HINT: Record<number, string> = {
  1: "Giữ giọng CAO và ĐỀU từ đầu tới cuối, đừng để rơi xuống.",
  2: "Bắt đầu ở giữa rồi kéo LÊN rõ ràng như hỏi 'Hả?'.",
  3: "Xuống THẤP hẳn trước (hạ giọng sát đáy), rồi mới lên.",
  4: "Bắt đầu CAO rồi rơi xuống thật nhanh và dứt khoát.",
};
export const randomCommon = () => { const s = pick(COMMON); return { s, t: pick(tones14(s)) }; };
