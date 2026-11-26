/* =========================================================================
 * ĐIỀU HƯỚNG theo địa chỉ sau dấu # (vd index.html#/lesson/1/3/vocab).
 * Bấm F5 vẫn ở nguyên màn đang học; nút Back của trình duyệt dùng được.
 *
 *   #/home                    Hôm nay
 *   #/road                    Lộ trình
 *   #/lesson/<cấp>/<bài>[/<bước>]
 *   #/level-test/<cấp>        Thi tổng
 *   #/review[/five]           Ôn tập (five = chế độ 5 phút)
 *   #/dict  #/stats
 *   #/pron[/learn|chart|listen|speak]
 *   #/story/<id>
 * ========================================================================= */
import { stopAudio } from "./audio";

export type Route =
  | { name: "home" } | { name: "road" } | { name: "dict" } | { name: "stats" }
  | { name: "review"; five: boolean }
  | { name: "lesson"; lv: number; u: number; step?: string }
  | { name: "levelTest"; lv: number }
  | { name: "pron"; tab: "learn" | "chart" | "listen" | "speak" }
  | { name: "story"; id: number };

export function parse(hash: string): Route {
  const p = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const n = (i: number) => Number(p[i]);
  switch (p[0]) {
    case "road": return { name: "road" };
    case "dict": return { name: "dict" };
    case "stats": return { name: "stats" };
    case "review": return { name: "review", five: p[1] === "five" };
    case "lesson": if (n(1) && n(2)) return { name: "lesson", lv: n(1), u: n(2), step: p[3] }; break;
    case "level-test": if (n(1)) return { name: "levelTest", lv: n(1) }; break;
    case "pron": return { name: "pron", tab: (["learn", "chart", "listen", "speak"].includes(p[1]) ? p[1] : "learn") as "learn" };
    case "story": if (!Number.isNaN(n(1))) return { name: "story", id: n(1) }; break;
  }
  return { name: "home" };
}

export function href(r: Route): string {
  switch (r.name) {
    case "lesson": return `#/lesson/${r.lv}/${r.u}${r.step ? "/" + r.step : ""}`;
    case "levelTest": return `#/level-test/${r.lv}`;
    case "review": return r.five ? "#/review/five" : "#/review";
    case "pron": return `#/pron/${r.tab}`;
    case "story": return `#/story/${r.id}`;
    default: return `#/${r.name}`;
  }
}

export const router = $state({ route: parse(typeof location !== "undefined" ? location.hash : ""), n: 0 });

/** Chuyển màn. Gọi lại cùng địa chỉ thì vẫn vẽ lại (n tăng). */
export function go(r: Route | string): void {
  const h = typeof r === "string" ? r : href(r);
  stopAudio();
  if (location.hash === h) { router.route = parse(h); router.n++; }
  else location.hash = h;
  scrollTo({ top: 0 });
}

export function startRouter(): void {
  addEventListener("hashchange", () => { stopAudio(); router.route = parse(location.hash); router.n++; });
}

/** Tab nào ở thanh điều hướng đang sáng. */
export function navTab(r: Route): string {
  if (r.name === "lesson" || r.name === "levelTest" || r.name === "pron" || r.name === "story") return "road";
  return r.name;
}
