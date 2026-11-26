"""
Test đồng bộ 2 máy trên GIẢ LẬP Cloudflare (wrangler pages dev, KV trong bộ nhớ).
Kịch bản:
 1. Máy tính (A) mở lần đầu → màn chào → tạo tài khoản tên + mật khẩu (+ mục tiêu, giờ ngủ).
 2. Điện thoại (B) đăng nhập (sai mật khẩu bị báo; đúng thì nhận tiến độ). Người khác tạo trùng bị chặn. Máy 3 vào bằng QR.
 3. Cả hai học OFFLINE cùng lúc (mỗi máy +XP, thẻ ôn khác nhau) → đồng bộ lần lượt → cả hai giống nhau, XP cộng đủ.
 4. Bản mở bằng file:// gọi được API (CORS).
 5. Bỏ qua màn chào → lần sau không hiện lại.
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
    p = subprocess.Popen(["npx", "wrangler", "pages", "dev", "dist", "--kv", "SYNC", "--port", str(PORT), "--ip", "127.0.0.1", "--persist-to", __import__("tempfile").mkdtemp(prefix="mitxue-kv-")],
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
            # 1) máy tính: lần đầu mở → màn chào → tạo tài khoản
            await pa.goto(BASE); await pa.wait_for_timeout(500)
            check(await pa.locator("#wName").count() == 1, "máy mới: hiện màn chào tạo tài khoản")
            await learn(pa, 100, "你")
            await pa.fill("#wName", "Lan Anh"); await pa.fill("#wPw", "hoctiengtrung"); await pa.fill("#wPw2", "hoctiengtrung")
            await pa.select_option("#wGoal", "30"); await pa.select_option("#wBed", "22")
            await pa.click("#wGo")
            try: await pa.wait_for_selector("#wName", state="detached", timeout=20000)
            except Exception: print("    lỗi màn chào:", await pa.locator("#wErr").all_inner_texts(), await pa.evaluate("()=>JSON.stringify(mitxue.sync)")); raise
            sa = await state(pa)
            check(sa["settings"]["name"] == "Lan Anh" and sa["settings"]["bedHour"] == 22 and sa["settings"]["goalMin"] == 30, "lưu tên, giờ ngủ, mục tiêu")
            check("Lan Anh" in await pa.inner_text("body"), "Mít gọi đúng tên")
            # 2a) điện thoại: đăng nhập sai mật khẩu → báo lỗi, không đụng tiến độ
            await pb.goto(BASE); await pb.wait_for_timeout(500)
            await pb.click("#wLogin"); await pb.fill("#wName", "lan anh"); await pb.fill("#wPw", "saimatkhau"); await pb.click("#wGo")
            await pb.wait_for_selector("#wErr", timeout=15000)
            check("Không thấy" in await pb.inner_text("#wErr"), "sai mật khẩu: báo không thấy tài khoản")
            # 2b) đúng mật khẩu (tên gõ chữ thường vẫn được)
            await pb.fill("#wPw", "hoctiengtrung"); await pb.click("#wGo")
            await pb.wait_for_selector("#wName", state="detached", timeout=15000); await pb.wait_for_timeout(500)
            sb = await state(pb)
            check("你" in sb["srs"] and sb["xp"] == 100 and sb["settings"]["name"] == "Lan Anh", f"điện thoại đăng nhập → nhận tiến độ + tên (xp={sb['xp']})")
            # 2c) người khác tạo trùng tên + mật khẩu → bị chặn
            D, pd, ed = await device(b)
            await pd.goto(BASE); await pd.wait_for_timeout(400)
            await pd.fill("#wName", "Lan Anh"); await pd.fill("#wPw", "hoctiengtrung"); await pd.fill("#wPw2", "hoctiengtrung"); await pd.click("#wGo")
            await pd.wait_for_selector("#wErr", timeout=15000)
            check("đã có tiến độ" in await pd.inner_text("#wErr"), "tạo trùng tài khoản: bị chặn, gợi ý đăng nhập")
            # 2d) thêm máy nhanh bằng QR (link ?sync=)
            code = await pa.evaluate("()=>mitxue.sync.code")
            E2, pe, ee = await device(b)
            await pe.goto(BASE + "?sync=" + code); await pe.wait_for_timeout(2500)
            check((await state(pe))["xp"] == 100 and await pe.locator("#wName").count() == 0, "máy thứ 3 vào bằng QR: có tiến độ, không hiện màn chào")
            check("sync=" not in pe.url, "mã đã được xóa khỏi thanh địa chỉ")
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
            # 5) bỏ qua màn chào: học trên máy này, không hiện lại
            C, pc, ec = await device(b)
            await pc.goto(BASE); await pc.wait_for_timeout(400); await pc.click("#wSkip"); await pc.reload(); await pc.wait_for_timeout(500)
            check(await pc.locator("#wName").count() == 0, "bỏ qua màn chào: lần sau không hiện lại")
            await pa.goto(BASE); await pa.wait_for_timeout(500); await pa.click("#settingsBtn"); await pa.click("text=QR thêm máy nhanh"); await pa.wait_for_timeout(300)
            await pa.screenshot(path=str(APP / "tests" / "e2e" / "shots" / "sync_settings.png"), full_page=True)
            check(not (ea or eb or ec or ed or ee), "không lỗi JS " + str((ea + eb + ec + ed + ee)[:2]))
            await b.close()
    finally:
        os.killpg(srv.pid, signal.SIGTERM)
    print("TẤT CẢ ĐẠT" if not FAILS else f"HỎNG {len(FAILS)}"); sys.exit(1 if FAILS else 0)

asyncio.run(main())
