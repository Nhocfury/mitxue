/* =========================================================================
 * SERVICE WORKER: cho bản trên mạng (Cloudflare Pages) cài được như app và học được khi mất mạng.
 * (Bản mở bằng file:// trên máy tính không dùng file này.)
 *  - "Vỏ app" (index, app.js, css, dữ liệu): tải sẵn khi cài, theo phiên bản BUILD (đổi bản = tải lại).
 *  - Audio + bộ chấm phát âm: lưu dần khi em dùng tới (lần sau không cần mạng).
 *  - /api/ (đồng bộ): luôn đi mạng, không lưu.
 * __BUILD__ được vite.config.ts thay bằng mã phiên bản lúc build.
 * ========================================================================= */
const BUILD = "__BUILD__";
const SHELL = "mitxue-shell-" + BUILD;
const MEDIA = "mitxue-media-v1";          // audio: tên file theo nội dung câu/từ, giữ qua các phiên bản
const PRON = "mitxue-pron-" + BUILD;      // bộ chấm phát âm: đi theo phiên bản
const SHELL_FILES = ["./", "app/app.js", "app/app.css", "data/data.js", "data/pinyin.js", "data/strokes.js",
  "data/audio-index.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys())
      if ((k.startsWith("mitxue-shell-") && k !== SHELL) || (k.startsWith("mitxue-pron-") && k !== PRON)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function cacheFirst(req, name) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(name)).put(req, res.clone());
  return res;
}
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/api/")) return;
  if (e.request.mode === "navigate") {
    // trang chính: thử mạng trước (có bản mới thì lấy), mất mạng thì dùng bản đã lưu.
    // (Pages chuyển /index.html → / nên chỉ lưu "./"; trả về bản đã chuyển hướng cho điều hướng sẽ lỗi.)
    e.respondWith(fetch(e.request).catch(async () => (await caches.match("./")) || Response.error()));
    return;
  }
  const p = url.pathname;
  if (p.includes("/audio/")) e.respondWith(cacheFirst(e.request, MEDIA));
  else if (p.includes("/pron/")) e.respondWith(cacheFirst(e.request, PRON));
  else e.respondWith(cacheFirst(e.request, SHELL));
});
