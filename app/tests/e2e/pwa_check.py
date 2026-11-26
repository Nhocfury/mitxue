"""
Test bản trên mạng (giả lập Cloudflare Pages tại máy): service worker cài được, MẤT MẠNG vẫn mở app,
audio đã nghe thì nghe lại được offline, manifest hợp lệ. Chụp màn hình khung điện thoại.
"""
import asyncio, os, signal, subprocess, sys, time, urllib.request, json
from pathlib import Path
from playwright.async_api import async_playwright
APP = Path(__file__).resolve().parents[2]; PORT = 8798; BASE = f"http://127.0.0.1:{PORT}/"
SHOTS = Path(__file__).parent / "shots"; FAILS = []
def check(c, m):
    print(("  ✔ " if c else "  ✘ ") + m)
    if not c: FAILS.append(m)

async def main():
    srv = subprocess.Popen(["npx", "wrangler", "pages", "dev", "dist", "--kv", "SYNC", "--port", str(PORT), "--ip", "127.0.0.1", "--persist-to", __import__("tempfile").mkdtemp(prefix="mitxue-kv-")],
                           cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    for _ in range(60):
        try: urllib.request.urlopen(BASE); break
        except Exception: time.sleep(0.5)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(BASE); await pg.wait_for_timeout(500)
            ok = await pg.evaluate("async()=>{const r=await navigator.serviceWorker.ready; return !!r.active}")
            check(ok, "service worker đã chạy")
            man = await pg.evaluate("async()=>{const r=await fetch('manifest.webmanifest'); return r.json()}")
            check(man["display"] == "standalone" and len(man["icons"]) >= 2, "manifest: standalone + icon")
            hdr = await pg.evaluate("async()=>{const r=await fetch('sw.js'); return r.headers.get('cache-control')}")
            check(hdr == "no-cache", f"_headers áp dụng (sw.js: {hdr})")
            # nghe 1 từ để audio vào bộ đệm
            await pg.reload(); await pg.wait_for_timeout(800)          # lần 2: trang do SW điều khiển
            f = await pg.evaluate("()=>{const k=Object.keys(window.DATA.audio)[0]; return 'audio/w/'+window.DATA.audio[k]}")
            await pg.evaluate("async f=>{await fetch(f)}", f)
            await pg.screenshot(path=str(SHOTS / "phone_home.png"))
            await pg.goto(BASE + "#/road"); await pg.wait_for_timeout(500); await pg.screenshot(path=str(SHOTS / "phone_road.png"))
            await pg.goto(BASE + "#/lesson/1/1"); await pg.wait_for_timeout(500); await pg.screenshot(path=str(SHOTS / "phone_lesson.png"))
            # mất mạng
            await ctx.set_offline(True)
            await pg.goto(BASE); await pg.wait_for_timeout(800)
            check(await pg.locator("#app .card").count() > 0, "mất mạng: vẫn mở được app")
            st = await pg.evaluate("async f=>{try{const r=await fetch(f); return r.status}catch(e){return String(e)}}", f)
            check(st == 200, f"mất mạng: audio đã nghe vẫn phát được ({st})")
            wide = await pg.evaluate("()=>document.documentElement.scrollWidth <= window.innerWidth + 1")
            check(wide, "khung điện thoại: không bị tràn ngang")
            # cập nhật phiên bản: đổi BUILD trong sw.js như khi Cloudflare build bản mới → app tự nhận
            await ctx.set_offline(False)
            swp = APP / "dist" / "sw.js"; old = swp.read_text()
            import re as _re
            swp.write_text(_re.sub(r'const BUILD = "[^"]+"', 'const BUILD = "testupdate"', old))
            try:
                await pg.goto(BASE); await pg.wait_for_timeout(4000)
                keys = await pg.evaluate("async()=>caches.keys()")
                check("mitxue-shell-testupdate" in keys and not any(k.startswith("mitxue-shell-") and k != "mitxue-shell-testupdate" for k in keys),
                      f"bản mới: service worker mới nắm quyền, xóa vỏ app cũ ({keys})")
            finally:
                swp.write_text(old)
            check(not errs, "không lỗi JS " + str(errs[:2]))
            await b.close()
    finally:
        os.killpg(srv.pid, signal.SIGTERM)
    print("TẤT CẢ ĐẠT" if not FAILS else f"HỎNG {len(FAILS)}"); sys.exit(1 if FAILS else 0)
asyncio.run(main())
