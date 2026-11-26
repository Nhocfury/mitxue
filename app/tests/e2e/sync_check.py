"""
Test đồng bộ 2 máy trên GIẢ LẬP Cloudflare (wrangler pages dev, KV trong bộ nhớ).
Kịch bản:
 1. Máy tính (A) học → tạo mã → dữ liệu lên mạng.
 2. Điện thoại (B) mở link ?sync=MÃ (như quét QR) → tự nối, nhận tiến độ của A.
 3. Cả hai học OFFLINE cùng lúc (mỗi máy +XP, thẻ ôn khác nhau) → đồng bộ lần lượt → cả hai giống nhau, XP cộng đủ.
 4. Bản mở bằng file:// gọi được API (CORS).
 5. Mã sai → báo lỗi, không hỏng tiến độ.
Chạy: python3 tests/e2e/sync_check.py   (tự bật/tắt wrangler; cần đã npm run build)
"""
import asyncio, json, os, signal, subprocess, sys, time, urllib.request
from pathlib import Path
from playwright.async_api import async_playwright

APP = Path(__file__).resolve().parents[2]
PORT = 8799
BASE = f"http://127.0.0.1:{PORT}/"
FAILS = []
def check(c, m):
    print(("  ✔ " if c else "  ✘ ") + m)
    if not c: FAILS.append(m)

def start_server():
    p = subprocess.Popen(["npx", "wrangler", "pages", "dev", "dist", "--kv", "SYNC", "--port", str(PORT), "--ip", "127.0.0.1"],
                         cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    for _ in range(60):
        try: urllib.request.urlopen(BASE + "api/sync"); break
        except urllib.error.HTTPError: break          # 400 = server đã chạy
        except Exception: time.sleep(0.5)
    return p

async def device(b):
    ctx = await b.new_context(); pg = await ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    return ctx, pg, errs

async def state(pg): return await pg.evaluate("()=>JSON.parse(JSON.stringify(mitxue.S))")
async def learn(pg, xp, card):
    await pg.evaluate("""([xp,card])=>{const S=mitxue.S; const d=S.dev;
        S.xpBy={...S.xpBy,[d]:(S.xpBy[d]||0)+xp}; S.xp+=xp;
        S.srs[card]={due:Date.now()+864e5,stability:1,difficulty:5,elapsed:0,scheduled:1,reps:1,lapses:0,state:2,lastReview:Date.now(),added:'2026-11-27'};
        mitxue.save();}""", [xp, card])
async def sync_now(pg):
    return await pg.evaluate("()=>import('/').catch(()=>0)") if False else await pg.evaluate("()=>window.mitxue.syncNow()")

async def main():
    srv = start_server()
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            A, pa, ea = await device(b); B, pb, eb = await device(b)
            # 1) máy tính
            await pa.goto(BASE); await pa.wait_for_timeout(500)
            await learn(pa, 100, "你")
            await pa.click("#settingsBtn"); await pa.click("#syncCreate")
            await pa.wait_for_selector("[data-sync-status='ok']", timeout=10000)
            if not await pa.locator("#syncCode").count(): await pa.click("text=Xem mã / QR")
            code = (await pa.inner_text("#syncCode")).strip()
            check(code.startswith("MX-") and len(code) == 26, f"tạo mã {code}")
            check(await pa.locator(".qr svg").count() == 1, "có mã QR")
            # 2) điện thoại mở link như quét QR
            await pb.goto(BASE + "?sync=" + code); await pb.wait_for_timeout(2500)
            sb = await state(pb)
            check("你" in sb["srs"] and sb["xp"] == 100, f"điện thoại nhận tiến độ máy tính (xp={sb['xp']})")
            check("sync=" not in pb.url, "mã đã được xóa khỏi thanh địa chỉ")
            # 3) học offline cùng lúc rồi đồng bộ
            await learn(pa, 30, "好"); await learn(pb, 12, "学")
            ok1 = await sync_now(pb); ok2 = await sync_now(pa); ok3 = await sync_now(pb)
            sa, sb = await state(pa), await state(pb)
            check(ok1 and ok2 and ok3, "3 lượt đồng bộ thành công")
            check(sa["xp"] == 142 and sb["xp"] == 142, f"XP cộng đủ 100+30+12 = 142 (máy tính {sa['xp']}, điện thoại {sb['xp']})")
            check(set(sa["srs"]) == set(sb["srs"]) == {"你", "好", "学"}, "thẻ ôn 2 máy như nhau: 你 好 学")
            check(sa["dev"] != sb["dev"], "mỗi máy giữ mã máy riêng")
            # 4) bản file:// gọi API
            F = await (await b.new_context()).new_page()
            await F.goto((APP / "dist" / "index.html").as_uri()); await F.wait_for_timeout(300)
            r = await F.evaluate(f"""async()=>{{const r=await fetch('{BASE}api/sync',{{headers:{{'X-Sync-Key':'{code}'}}}}); const j=await r.json(); return [r.status, j.rev]}}""")
            check(r[0] == 200 and r[1] >= 1, f"file:// gọi được API đồng bộ (CORS) {r}")
            # 5) mã sai
            C, pc, ec = await device(b)
            await pc.goto(BASE); await pc.wait_for_timeout(300); await pc.click("#settingsBtn"); await pc.fill("#syncInput", "MX-123"); await pc.click("#syncJoin"); await pc.wait_for_timeout(400)
            check(await pc.evaluate("()=>mitxue.S.xp") == 0, "mã sai: không đụng tới tiến độ")
            await pa.goto(BASE); await pa.wait_for_timeout(500); await pa.click("#settingsBtn"); await pa.click("text=Xem mã / QR"); await pa.wait_for_timeout(300)
            await pa.screenshot(path=str(APP / "tests" / "e2e" / "shots" / "sync_settings.png"), full_page=True)
            check(not (ea or eb or ec), "không lỗi JS " + str((ea + eb + ec)[:2]))
            await b.close()
    finally:
        os.killpg(srv.pid, signal.SIGTERM)
    print("TẤT CẢ ĐẠT" if not FAILS else f"HỎNG {len(FAILS)}"); sys.exit(1 if FAILS else 0)

asyncio.run(main())
