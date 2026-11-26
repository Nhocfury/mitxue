/* Nạp dữ liệu thật (public/data/*.js) vào môi trường test Node, giả lập localStorage. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const g = globalThis as unknown as Record<string, unknown>;
g.window = globalThis;
const mem = new Map<string, string>();
g.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};
for (const f of ["data.js", "pinyin.js"]) {
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(__dirname, "../../public/data", f), "utf8"))();
}
g.STROKES = new Proxy({}, { get: (_t, k) => (typeof k === "string" && /[一-鿿]/.test(k) ? {} : undefined) });
