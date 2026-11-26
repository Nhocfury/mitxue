"""
Test bộ chấm phát âm với MICRO GIẢ: Chromium phát file wav thay cho micro
(--use-file-for-fake-audio-capture). Đi đúng luồng thật: mở hội thoại → bấm 🎙️ → nạp bộ máy
(wasm + mô hình) → ghi âm → tự dừng khi im lặng → nhận dạng → tô màu từng chữ.
  fixtures/pron_ok.wav   : "你会说汉语吗？" đọc đúng      → phải đạt 100%
  fixtures/pron_tone.wav : đọc 汉 thành hán (sai thanh) → chữ 汉 phải bị đánh dấu "sai thanh"
"""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
URL = (ROOT / "dist" / "index.html").as_uri()
FIX = Path(__file__).parent / "fixtures"
FAILS = []
def check(c, m):
    print(("  ✔ " if c else "  ✘ ") + m)
    if not c: FAILS.append(m)

async def run(wav: str):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
                                          f"--use-file-for-fake-audio-capture={FIX / wav}%noloop", "--autoplay-policy=no-user-gesture-required"])
        ctx = await b.new_context(); await ctx.grant_permissions(["microphone"])
        await ctx.add_init_script("localStorage.setItem('mitxue_welcomed','1')")   # bỏ màn chào tài khoản
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{localStorage.setItem('mitxue_welcomed','1'); mitxue.S.settings.unlockAll=true; mitxue.save();}")
        await pg.goto(URL + "#/lesson/1/2/dialogue"); await pg.wait_for_timeout(500)
        t = time.time()
        await pg.locator("[data-speak='2']").click()
        await pg.locator("[data-pron-rec]").click()
        await pg.wait_for_selector("[data-pron-score], [data-pron-msg]", timeout=30000)
        sec = time.time() - t
        res = await pg.evaluate("""()=>{const r=document.querySelector('[data-pron-score]');
            return r ? {score:+r.dataset.pronScore, syl:[...r.querySelectorAll('.syl')].map(e=>[e.querySelector('.hz').textContent,e.className.split(' ').find(c=>['ok','tone','sound','missed','skip'].includes(c)),(e.querySelector('.heard')||{}).textContent||''])}
                     : {msg:document.querySelector('[data-pron-msg]').textContent}}""")
        await pg.screenshot(path=str(Path(__file__).parent / "shots" / f"pron_{wav[:-4]}.png"), full_page=False)
        await b.close()
        return res, sec, errs

async def main():
    r, sec, errs = await run("pron_ok.wav")
    print("đọc đúng:", r, f"{sec:.1f}s")
    check("score" in r and r["score"] == 100, "đọc đúng → 100%")
    check(not errs, "không lỗi JS")
    r, sec, errs = await run("pron_tone.wav")
    print("sai thanh:", r, f"{sec:.1f}s")
    check("syl" in r and r["syl"][3][0] == "汉" and r["syl"][3][1] == "tone", "汉 đọc hán → đánh dấu sai thanh")
    check("syl" in r and all(s[1] == "ok" for k, s in enumerate(r["syl"]) if k != 3), "các chữ khác vẫn đúng")
    check(sec < 15, f"cả lượt (nạp bộ máy + ghi + chấm) dưới 15 giây ({sec:.1f}s)")
    print("TẤT CẢ ĐẠT" if not FAILS else f"HỎNG {len(FAILS)}"); sys.exit(1 if FAILS else 0)

asyncio.run(main())
