"""Kiểm bố cục (v1.8): điện thoại có thanh tab dưới đáy, không màn nào tràn ngang,
máy tính có cột điều hướng trái, bài luyện mở chế độ tập trung và thoát được bằng ✕."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright
URL = (Path(__file__).resolve().parents[2] / "dist" / "index.html").as_uri()
ROUTES = ["#/home", "#/road", "#/lesson/1/1", "#/review", "#/dict", "#/stats", "#/pron/learn", "#/pron/chart", "#/story/1"]
fails = []
def check(ok, msg):
    print(("  ✔ " if ok else "  ✘ ") + msg)
    if not ok: fails.append(msg)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errs = []
        # ---- điện thoại ----
        ctx = await b.new_context(viewport={"width": 360, "height": 740})
        await ctx.add_init_script("localStorage.setItem('mitxue_welcomed','1')")
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(400)
        over = []
        for r in ROUTES:
            await pg.goto(URL + r); await pg.wait_for_timeout(350)
            w = await pg.evaluate("document.documentElement.scrollWidth")
            if w > 361: over.append(f"{r}={w}")
        check(not over, f"360px: không màn nào tràn ngang {over}")
        nav = await pg.locator("#nav").bounding_box()
        check(nav and nav["y"] + nav["height"] >= 739 and nav["height"] < 90, "thanh tab nằm sát đáy màn hình")
        small = await pg.evaluate("""() => [...document.querySelectorAll('#nav button, header.top button')]
            .filter(b => { const r = b.getBoundingClientRect(); return r.width < 40 || r.height < 40 }).length""")
        check(small == 0, f"nút điều hướng ≥ 40px ({small} nút nhỏ hơn)")
        await pg.click("#nav [data-tab=dict]"); await pg.wait_for_timeout(250)
        check(pg.url.endswith("#/dict") and await pg.locator("#nav [data-tab=dict].on").count() == 1, "bấm tab Từ điển: chuyển màn, tab sáng")
        # chế độ tập trung
        await pg.goto(URL + "#/lesson/1/1/vocab"); await pg.wait_for_timeout(300)
        await pg.click("#vQuiz"); await pg.wait_for_timeout(300)
        box = await pg.locator(".quiz.focus").bounding_box()
        check(box and box["height"] >= 739 and box["y"] <= 0, "luyện nhanh mở toàn màn hình")
        check(await pg.evaluate("document.documentElement.classList.contains('focusing')"), "khóa cuộn trang nền khi đang làm bài")
        await pg.locator(".quiz .opt").first.click(); await pg.wait_for_timeout(200)
        nb = await pg.locator("#qNext").bounding_box()
        check(nb and nb["y"] > 740 * 0.75, "nút Câu tiếp nằm ở đáy (vùng ngón cái)")
        await pg.click("#qNext"); await pg.wait_for_timeout(150)
        await pg.click("#qClose"); await pg.wait_for_timeout(150)
        check(await pg.locator(".quiz.focus").count() == 1, "bấm ✕ lần 1 giữa bài: hỏi lại, chưa thoát")
        await pg.click("#qClose"); await pg.wait_for_timeout(200)
        check(await pg.locator(".quiz.focus").count() == 0 and not await pg.evaluate("document.documentElement.classList.contains('focusing')"), "bấm ✕ lần 2: thoát, trang cuộn lại được")
        await ctx.close()
        # ---- máy tính ----
        ctx = await b.new_context(viewport={"width": 1366, "height": 768})
        await ctx.add_init_script("localStorage.setItem('mitxue_welcomed','1')")
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL + "#/home"); await pg.wait_for_timeout(400)
        nav = await pg.locator("#nav").bounding_box(); main = await pg.locator("#main").bounding_box()
        check(nav and nav["x"] == 0 and nav["height"] >= 760 and nav["width"] < 260, "máy tính: cột điều hướng bên trái")
        check(main and main["x"] >= nav["width"] and main["width"] <= 870, "nội dung nằm bên phải cột, rộng vừa đọc")
        check(not errs, f"không lỗi JS {errs}")
        await b.close()
    print("TẤT CẢ ĐẠT" if not fails else f"HỎNG {len(fails)}")
    sys.exit(1 if fails else 0)

asyncio.run(main())
