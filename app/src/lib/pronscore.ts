/* =========================================================================
 * CHẤM PHÁT ÂM TỪNG ÂM TIẾT
 * Đầu vào: chữ Hán + pinyin từng chữ (data: "sy") + token mô hình nghe được (vd ["x","ué","sh","ēng"]).
 * Mô hình (KWS 3.3M của k2-fsa) nhận ra phụ âm đầu + vần CÓ DẤU THANH, nên đọc sai thanh = ra token khác.
 * Cách chấm: căn chuỗi token nghe được với chuỗi token đích bằng quy hoạch động (giống so khớp chuỗi),
 * rồi xét từng âm tiết: ok / tone (đúng âm, sai thanh) / sound (sai phụ âm hoặc vần) / missed (thiếu).
 * Bản tham chiếu Python + số liệu đánh giá: content/asr_lab/kws2.py, docs/PRON-ASR.md.
 * ========================================================================= */

export type SylStatus = "ok" | "tone" | "sound" | "missed" | "skip";
export interface SylResult { ch: string; sy: string; status: SylStatus; heard: string }
export interface PronResult { syl: SylResult[]; score: number; scored: number; okCount: number }

const INITS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"];
const MARKS: Record<string, string> = { a: "āáǎà", o: "ōóǒò", e: "ēéěè", i: "īíǐì", u: "ūúǔù", "ü": "ǖǘǚǜ" };
const PLAIN: Record<string, string> = {};
for (const [v, m] of Object.entries(MARKS)) for (const c of m) PLAIN[c] = v;

/** Bỏ dấu thanh: "uè" → "ue" (giữ ü). */
export const base = (f: string): string => [...f].map(c => PLAIN[c] ?? c).join("");
/** Thanh của vần: 1–4, không dấu = 5 (thanh nhẹ). */
export function toneOf(f: string): number {
  for (const c of f) { const v = PLAIN[c]; if (v) return MARKS[v].indexOf(c) + 1; }
  return 5;
}
/** Đặt dấu thanh cho vần không dấu theo quy tắc pinyin: a/e trước, "ou" → o, "iu" → u, "ui" → i. */
export function setTone(b: string, t: number): string {
  if (t === 5) return b;
  let v: string;
  if (b.includes("a")) v = "a";
  else if (b.includes("e")) v = "e";
  else if (b.includes("ou")) v = "o";
  else if (b.includes("iu")) v = "u";
  else if (b.includes("ui")) v = "i";
  else if (b.includes("o")) v = "o";
  else v = [...b].filter(c => MARKS[c]).pop() ?? "";
  if (!v) return b;
  const k = "iuü".includes(v) ? b.lastIndexOf(v) : b.indexOf(v);
  return b.slice(0, k) + MARKS[v][t - 1] + b.slice(k + 1);
}
/** Tách âm tiết có dấu thành [phụ âm đầu, vần]. y/w được tính là phụ âm đầu (đúng như token của mô hình). */
export function splitSyl(sy: string): [string, string] {
  const s = sy.toLowerCase();
  for (const i of INITS) if (s.startsWith(i) && s.length > i.length) return [i, s.slice(i.length)];
  return ["", s];
}

/** Chữ hay đọc nhẹ: đọc thanh nào cũng chấp nhận. */
const LIGHT = new Set([..."个们子么的了吗呢吧着过得地啊呀"]);

interface Target { ch: string; sy: string; i: string; f: string; t: number; acc: Set<string> }

/** Âm tiết đích + các cách đọc chấp nhận được (thanh gốc, biến điệu, thanh nhẹ). */
export function buildTarget(chars: string[], sys: string[]): (Target | null)[] {
  const out: (Target | null)[] = chars.map((ch, k) => {
    const sy = sys[k] ?? "";
    if (!sy || sy === "r") return null;                       // 儿 hóa (diǎnr): không chấm riêng chữ 儿
    const [i, f] = splitSyl(sy);
    return { ch, sy, i, f, t: toneOf(f), acc: new Set<string>() };
  });
  const syl = out.filter((x): x is Target => !!x);
  syl.forEach((o, k) => {
    const nxt = syl[k + 1];
    // dữ liệu hiển thị 一/不 theo biến điệu (yí, bú) nên thanh gốc cũng được chấp nhận
    const acc = new Set<number>([o.t]);
    if (o.ch === "一") [1, 2, 4].forEach(t => acc.add(t));
    if (o.ch === "不") [2, 4].forEach(t => acc.add(t));
    if (nxt && o.t === 3 && nxt.t === 3) acc.add(2);           // 3-3 → 2-3 (你好 = ní hǎo)
    if (o.t === 5 || LIGHT.has(o.ch)) [1, 2, 3, 4, 5].forEach(t => acc.add(t));
    const b = base(o.f);
    o.acc = new Set([...acc].map(t => setTone(b, t)));
  });
  return out;
}

/** Căn token nghe được với âm tiết đích, chấm từng âm tiết. */
export function scorePron(chars: string[], sys: string[], heard: string[]): PronResult {
  const tgt = buildTarget(chars, sys);
  const seq: string[] = [], own: number[] = [], accs: Set<string>[] = [];
  tgt.forEach((o, k) => {
    if (!o) return;
    if (o.i) { seq.push(o.i); own.push(k); accs.push(new Set([o.i])); }
    seq.push(o.f); own.push(k); accs.push(o.acc);
  });
  const n = seq.length, m = heard.length;
  const cost = (j: number, b: string) => (accs[j].has(b) ? 0 : base(seq[j]) === base(b) ? 0.6 : 1);
  const D: number[][] = Array.from({ length: n + 1 }, (_, x) => Array.from({ length: m + 1 }, (_, y) => (x === 0 ? y : y === 0 ? x : 0)));
  for (let x = 1; x <= n; x++)
    for (let y = 1; y <= m; y++)
      D[x][y] = Math.min(D[x - 1][y] + 1, D[x][y - 1] + 1, D[x - 1][y - 1] + cost(x - 1, heard[y - 1]));
  // lần ngược: cùng thứ tự ưu tiên với bản Python (khớp chéo → bỏ đích → bỏ token)
  const got: (string | null)[] = Array(n).fill(null);
  let x = n, y = m;
  while (x > 0 && y > 0) {
    if (D[x][y] === D[x - 1][y - 1] + cost(x - 1, heard[y - 1])) { got[x - 1] = heard[y - 1]; x--; y--; }
    else if (D[x][y] === D[x - 1][y] + 1) x--;
    else y--;
  }
  const syl: SylResult[] = tgt.map((o, k) => {
    if (!o) return { ch: chars[k], sy: sys[k] ?? "", status: "skip", heard: "" };
    const js = own.map((ow, j) => (ow === k ? j : -1)).filter(j => j >= 0);
    const heardStr = js.map(j => got[j] ?? "").join("");
    if (js.every(j => got[j] === null)) return { ch: o.ch, sy: o.sy, status: "missed", heard: "" };
    const badSeg = js.some(j => got[j] === null || base(got[j]!) !== base(seq[j]));
    const badTone = js.some(j => got[j] !== null && !accs[j].has(got[j]!));
    return { ch: o.ch, sy: o.sy, status: badSeg ? "sound" : badTone ? "tone" : "ok", heard: heardStr };
  });
  const scoredList = syl.filter(s => s.status !== "skip");
  const okCount = scoredList.filter(s => s.status === "ok").length;
  return { syl, scored: scoredList.length, okCount, score: scoredList.length ? Math.round((okCount / scoredList.length) * 100) : 0 };
}

/** Lấy chữ Hán (bỏ dấu câu) để ghép với "sy". */
export const hanChars = (zh: string): string[] => [...zh].filter(c => /[一-鿿]/.test(c));
