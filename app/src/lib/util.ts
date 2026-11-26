/* Tiện ích nhỏ dùng khắp nơi. Không phụ thuộc gì khác. */

export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export function shuffle<T>(a: readonly T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function distinctBy<T>(arr: readonly T[], f: (x: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return arr.filter(x => { const k = f(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Ngày theo giờ máy, dạng YYYY-MM-DD. */
export const todayStr = (d = new Date()): string =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

/** Số ngày giữa hai chuỗi ngày YYYY-MM-DD. */
export const daysBetween = (a: string, b: string): number =>
  Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 864e5);

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export const isHan = (s: string) => /[一-鿿]/.test(s);

export const short = (g: string, n = 46) => (g.length > n ? g.slice(0, n - 2) + "…" : g);

/** 4 giờ sáng ngày mai: mốc ôn lần đầu cho từ vừa học. */
export function tomorrow4am(now = new Date()): number {
  const t = new Date(now); t.setDate(t.getDate() + 1); t.setHours(4, 0, 0, 0); return t.getTime();
}
