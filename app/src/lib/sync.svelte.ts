/* =========================================================================
 * ĐỒNG BỘ TIẾN ĐỘ GIỮA CÁC MÁY (qua API /api/sync trên Cloudflare)
 * - "Mã đồng bộ" ngẫu nhiên (MX-XXXXX-…) là chìa khóa duy nhất: máy nào nhập cùng mã thì chung tiến độ.
 * - Mỗi lần đồng bộ: tải bản trên mạng → GỘP với máy này (lib/merge.ts) → nếu có gì mới thì ghi lại.
 *   Hai máy ghi cùng lúc: server trả 409, app gộp lại rồi gửi lại (tối đa 3 lần).
 * - Tự đồng bộ: lúc mở app, sau khi lưu (gom lại, tối đa 2 phút/lần), và khi chuyển sang tab/app khác.
 *   Giới hạn để không vượt 1.000 lượt ghi/ngày của KV miễn phí: học liền 5 tiếng ≈ 150 lượt.
 * Mã lưu riêng ở localStorage "mitxue_sync" (không nằm trong file sao lưu).
 * ========================================================================= */
import { SITE_URL } from "./config";
import { mergeState, sameProgress } from "./merge";
import { S, replaceState, setOnSaved } from "./state.svelte";
import { migrate } from "./storage";
import type { State } from "./types";

const CFG_KEY = "mitxue_sync";
export const sync = $state({
  code: "", rev: 0, lastAt: 0,
  status: "off" as "off" | "idle" | "busy" | "ok" | "error",
  msg: "",
});

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/** Mã mới: 20 ký tự base32 = 100 bit ngẫu nhiên, chia 4 nhóm cho dễ đọc. */
export function newCode(): string {
  const a = new Uint8Array(20); crypto.getRandomValues(a);
  const s = [...a].map(x => B32[x & 31]).join("");
  return "MX-" + s.match(/.{5}/g)!.join("-");
}
/** Chuẩn hóa mã người dùng gõ/dán: bỏ khoảng trắng, chữ hoa, tự thêm gạch. Sai định dạng → "". */
export function normalizeCode(input: string): string {
  const s = input.toUpperCase().replace(/[^A-Z2-7]/g, "").replace(/^MX/, "");
  return s.length === 20 ? "MX-" + s.match(/.{5}/g)!.join("-") : "";
}

export const apiUrl = (): string => {
  const base = typeof location !== "undefined" && location.protocol.startsWith("http") ? location.origin : SITE_URL;
  return base ? base.replace(/\/$/, "") + "/api/sync" : "";
};
/** Link mở app trên máy khác kèm sẵn mã (dùng cho mã QR). */
export const shareLink = (code = sync.code): string => {
  const base = typeof location !== "undefined" && location.protocol.startsWith("http") ? location.origin + location.pathname : SITE_URL + "/";
  return base ? `${base}?sync=${encodeURIComponent(code)}` : "";
};

function saveCfg() {
  try { localStorage.setItem(CFG_KEY, JSON.stringify({ code: sync.code, rev: sync.rev, lastAt: sync.lastAt })); } catch { /* bỏ qua */ }
}
function loadCfg() {
  try { Object.assign(sync, JSON.parse(localStorage.getItem(CFG_KEY) || "{}")); } catch { /* bỏ qua */ }
  sync.status = sync.code ? "idle" : "off";
}

type Remote = { rev: number; state: State | null };
async function call(method: "GET" | "PUT", body?: unknown): Promise<{ status: number; data: Remote & { error?: string } }> {
  const url = apiUrl();
  if (!url) throw new Error("App chưa được đưa lên mạng (chưa có địa chỉ đồng bộ).");
  const r = await fetch(url, {
    method, headers: { "X-Sync-Key": sync.code, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined, cache: "no-store",
  });
  return { status: r.status, data: await r.json().catch(() => ({ rev: 0, state: null, error: "Phản hồi lạ" })) };
}

let running: Promise<boolean> | null = null;
let applying = false;
/** Đồng bộ ngay. Trả true nếu xong. Gọi chồng nhau thì dùng chung 1 lượt. */
export function syncNow(): Promise<boolean> {
  if (!sync.code) return Promise.resolve(false);
  running ??= (async () => {
    sync.status = "busy"; sync.msg = "";
    try {
      let { status, data } = await call("GET");
      if (status !== 200) throw new Error(data.error || `Lỗi máy chủ (${status})`);
      for (let attempt = 0; attempt < 3; attempt++) {
        const local = $state.snapshot(S) as State;
        const remote = data.state ? migrate(data.state) : null;
        const merged = remote ? mergeState(local, remote) : local;
        if (!sameProgress(merged, local)) { applying = true; replaceState(merged); applying = false; }
        if (remote && sameProgress(merged, remote)) { sync.rev = data.rev; break; }   // trên mạng đã đủ, khỏi ghi
        const put = await call("PUT", { baseRev: data.rev, state: merged });
        if (put.status === 200) { sync.rev = put.data.rev; break; }
        if (put.status === 409) { data = put.data; continue; }                     // máy khác vừa ghi: gộp lại
        throw new Error(put.data.error || `Lỗi máy chủ (${put.status})`);
      }
      sync.lastAt = Date.now(); sync.status = "ok"; saveCfg();
      return true;
    } catch (e) {
      sync.status = "error";
      sync.msg = (e as Error)?.message?.includes("fetch") ? "Không kết nối được mạng. Tiến độ vẫn lưu trên máy, lúc có mạng sẽ tự đồng bộ." : String((e as Error)?.message ?? e);
      return false;
    } finally { applying = false; running = null; }
  })();
  return running;
}

/** Bật đồng bộ với mã (mới tạo hoặc mã từ máy khác). Lần đầu: gộp tiến độ 2 bên. */
export async function connect(code: string): Promise<boolean> {
  sync.code = code; sync.rev = 0; saveCfg();
  return syncNow();
}
export function disconnect(): void {
  sync.code = ""; sync.rev = 0; sync.lastAt = 0; sync.status = "off"; sync.msg = "";
  try { localStorage.removeItem(CFG_KEY); } catch { /* bỏ qua */ }
}

let timer = 0;
/** Gọi 1 lần lúc mở app. */
export function startSync(): void {
  loadCfg();
  // mở từ link/QR có ?sync=MÃ → tự kết nối, rồi xóa mã khỏi thanh địa chỉ
  try {
    const u = new URL(location.href), c = normalizeCode(u.searchParams.get("sync") || "");
    if (c) { u.searchParams.delete("sync"); history.replaceState(null, "", u.pathname + u.search + u.hash); void connect(c); }
  } catch { /* file:// cũ */ }
  // app lưu khoảng 15 giây/lần lúc đang học → gom: lượt đồng bộ kế tiếp cách lượt trước ít nhất 2 phút
  setOnSaved(() => {
    if (!sync.code || applying || timer) return;
    const wait = Math.max(5_000, 120_000 - (Date.now() - sync.lastAt));
    timer = window.setTimeout(() => { timer = 0; void syncNow(); }, wait);
  });
  if (sync.code) setTimeout(() => void syncNow(), 800);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && sync.code) void syncNow(); });
}
