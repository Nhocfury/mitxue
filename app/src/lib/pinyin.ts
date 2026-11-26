/* =========================================================================
 * PINYIN: tách âm tiết, lấy thanh điệu, đánh dấu thanh.
 * Quy ước âm tiết "trần" (không dấu): ü viết là "uu" (vd "luu", "nuue"),
 * giống tên file audio trong public/audio/s/<âm><thanh>.mp3.
 * ========================================================================= */

/** Bảng âm tiết hợp lệ: "ma" → [1,2,3,4,5] (thanh có audio). Nạp từ public/data/pinyin.js. */
export const SYL: Record<string, number[]> = {};
for (const p of (window.SYL_RAW || "").split(" ")) {
  if (!p) continue;
  const [s, t] = p.split(":");
  SYL[s] = t.split("").map(Number);
}
const SYLSET = new Set(Object.keys(SYL).map(s => s.replace(/uu/g, "v")));

const TONE_RE: Record<number, RegExp> = { 1: /[āēīōūǖ]/, 2: /[áéíóúǘ]/, 3: /[ǎěǐǒǔǚ]/, 4: /[àèìòùǜ]/ };
/** Thanh của một âm tiết có dấu (5 = thanh nhẹ). */
export function toneOfSyl(s: string): number {
  for (const t of [1, 2, 3, 4]) if (TONE_RE[t].test(s)) return t;
  return 5;
}

const NORM: Record<string, string> = {
  ā: "a", á: "a", ǎ: "a", à: "a", ē: "e", é: "e", ě: "e", è: "e", ī: "i", í: "i", ǐ: "i", ì: "i",
  ō: "o", ó: "o", ǒ: "o", ò: "o", ū: "u", ú: "u", ǔ: "u", ù: "u", ǖ: "v", ǘ: "v", ǚ: "v", ǜ: "v", ü: "v",
};
const isPyLetter = (c: string) => /[a-zA-Z]/.test(c) || NORM[c.toLowerCase()] !== undefined;
export const hasPyLetter = (s: string) => /[a-zA-Zü]/i.test(s) || /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(s);

/**
 * Tách chuỗi pinyin liền ("xuésheng", "Nǐ hǎo!") thành mảng âm tiết + dấu câu/khoảng trắng.
 * Tham lam: thử đoạn dài nhất (6 → 1 chữ) có trong bảng âm tiết. Hỗ trợ đuôi "r" (nàr).
 */
export function splitSyl(py: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < py.length) {
    if (!isPyLetter(py[i])) {
      let j = i; while (j < py.length && !isPyLetter(py[j])) j++;
      out.push(py.slice(i, j)); i = j; continue;
    }
    let found = 0;
    for (let L = 6; L >= 1; L--) {
      const seg = py.slice(i, i + L);
      if (seg.length < L || ![...seg].every(isPyLetter)) continue;
      const base = [...seg.toLowerCase()].map(c => NORM[c] || c).join("");
      if (SYLSET.has(base)) { found = L; break; }
    }
    if (!found) {
      let j = i; while (j < py.length && isPyLetter(py[j])) j++;
      out.push(py.slice(i, j)); i = j; continue;
    }
    let syl = py.slice(i, i + found); i += found;
    if (py[i] === "r" && !(i + 1 < py.length && /[aeiouāáǎàēéěèīíǐìōóǒòūúǔù]/i.test(py[i + 1]))) { syl += "r"; i++; }
    out.push(syl);
  }
  return out;
}

const PLAIN: Record<string, string> = {
  ā: "a1", á: "a2", ǎ: "a3", à: "a4", ē: "e1", é: "e2", ě: "e3", è: "e4", ī: "i1", í: "i2", ǐ: "i3", ì: "i4",
  ō: "o1", ó: "o2", ǒ: "o3", ò: "o4", ū: "u1", ú: "u2", ǔ: "u3", ù: "u4", ǖ: "uu1", ǘ: "uu2", ǚ: "uu3", ǜ: "uu4",
};
/** "lǜ" → ["luu", 4]; "ma" → ["ma", 5]. Bỏ đuôi r nhi hóa nếu không phải âm tiết thật. */
export function plainSyl(s: string): [string, number] {
  let t = 5, out = "";
  for (const ch of s.toLowerCase()) {
    if (PLAIN[ch]) { out += PLAIN[ch].replace(/\d/, ""); t = +PLAIN[ch].slice(-1); }
    else if (ch === "ü") out += "uu";
    else if (/[a-z]/.test(ch)) out += ch;
  }
  if (out.length > 2 && out.endsWith("r") && !SYL[out]) out = out.slice(0, -1);
  return [out, t];
}

const MARKS: Record<string, string> = { a: "āáǎà", o: "ōóǒò", e: "ēéěè", i: "īíǐì", u: "ūúǔù", ü: "ǖǘǚǜ" };
/** Âm tiết trần ("hao", "luu") → chữ hiển thị có dấu thanh ("hǎo", "lǜ"). Sau j/q/x/y thì ü viết là u. */
export function markSyl(b: string, t: number): string {
  let s = b.replace(/uu/g, "ü");
  if (/^[jqxy]ü/.test(s)) s = s.replace("ü", "u");
  if (!(t >= 1 && t <= 4)) return s;
  let i: number;
  if (s.includes("a")) i = s.indexOf("a");
  else if (s.includes("o")) i = s.indexOf("o");
  else if (s.includes("e")) i = s.indexOf("e");
  else if (s.includes("iu")) i = s.indexOf("iu") + 1;
  else if (s.includes("ui")) i = s.indexOf("ui") + 1;
  else { i = -1; for (let k = s.length - 1; k >= 0; k--) if ("iuü".includes(s[k])) { i = k; break; } }
  if (i < 0) return s;
  return s.slice(0, i) + MARKS[s[i]][t - 1] + s.slice(i + 1);
}

/** Âm tiết trần ("luu") → dạng đọc ("lü") không dấu. */
export const plainShow = (b: string) => b.replace(/uu/g, "ü");

/** Các thanh 1..4 có audio cho âm tiết. */
export const tones14 = (s: string) => (SYL[s] || []).filter(t => t >= 1 && t <= 4);

/** Bỏ dấu để tìm kiếm: "Nǐ hǎo" → "nihao", ü → v. */
export const noTone = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ü/g, "v").replace(/[\s'-]/g, "").toLowerCase();

/** Đổi ngẫu nhiên thanh của một âm tiết (làm đáp án nhiễu cho câu hỏi pinyin). */
const TONE_SETS = [["ā", "á", "ǎ", "à"], ["ē", "é", "ě", "è"], ["ī", "í", "ǐ", "ì"], ["ō", "ó", "ǒ", "ò"], ["ū", "ú", "ǔ", "ù"], ["ǖ", "ǘ", "ǚ", "ǜ"]];
export function retone(py: string, rnd = Math.random): string | null {
  const syls = splitSyl(py);
  const idx = syls.map((s, i) => [s, i] as const).filter(([s]) => /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(s));
  if (!idx.length) return null;
  const [s, i] = idx[Math.floor(rnd() * idx.length)];
  for (const set of TONE_SETS) for (let k = 0; k < 4; k++) if (s.includes(set[k])) {
    let nk: number; do { nk = Math.floor(rnd() * 4); } while (nk === k);
    syls[i] = s.replace(set[k], set[nk]); return syls.join("");
  }
  return null;
}
