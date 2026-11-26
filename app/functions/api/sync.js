/* =========================================================================
 * API ĐỒNG BỘ (Cloudflare Pages Functions) — /api/sync
 * Lưu 1 bản tiến độ cho mỗi "mã đồng bộ" trong Workers KV (binding: SYNC).
 *  - Mã gửi qua header X-Sync-Key, dạng MX-XXXXX-XXXXX-XXXXX-XXXXX (100 bit ngẫu nhiên).
 *    Server chỉ lưu SHA-256 của mã → ai xem được KV cũng không biết mã.
 *  - GET  → { rev, state | null }
 *  - PUT  { baseRev, state } → ghi nếu baseRev == rev hiện tại (rev+1), lệch thì 409 + bản hiện tại
 *    (app gộp rồi gửi lại). Việc GỘP làm ở app (src/lib/merge.ts), server chỉ giữ bản mới nhất.
 *  - CORS mở (*): bản mở bằng file:// trên máy tính cũng đồng bộ được. Không dùng cookie.
 * Giới hạn KV miễn phí: 1.000 lượt ghi/ngày → app chỉ ghi khi có thay đổi, tối đa vài chục lần/ngày.
 * ========================================================================= */
const CODE = /^MX(-[A-Z2-7]{5}){4}$/;
const MAX_BYTES = 4 * 1024 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Sync-Key",
  "Access-Control-Max-Age": "86400",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

async function keyOf(code) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mitxue:" + code));
  return "s:" + [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (!env.SYNC) return json({ error: "Chưa gắn KV 'SYNC' cho dự án Pages" }, 500);
  const code = (request.headers.get("X-Sync-Key") || "").trim().toUpperCase();
  if (!CODE.test(code)) return json({ error: "Mã đồng bộ không hợp lệ" }, 400);
  const key = await keyOf(code);
  const cur = (await env.SYNC.get(key, "json")) || { rev: 0, state: null };

  if (request.method === "GET") return json({ rev: cur.rev, state: cur.state, at: cur.at || null });

  if (request.method === "PUT") {
    const text = await request.text();
    if (text.length > MAX_BYTES) return json({ error: "Dữ liệu quá lớn" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: "JSON hỏng" }, 400); }
    if (!body || typeof body.baseRev !== "number" || !body.state || body.state.ver !== 3) return json({ error: "Thiếu baseRev/state" }, 400);
    if (body.baseRev !== cur.rev) return json({ conflict: true, rev: cur.rev, state: cur.state }, 409);
    const next = { rev: cur.rev + 1, state: body.state, at: new Date().toISOString() };
    await env.SYNC.put(key, JSON.stringify(next));
    return json({ rev: next.rev, at: next.at });
  }
  return json({ error: "Phương thức không hỗ trợ" }, 405);
}
