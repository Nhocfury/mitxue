"""
Test end-to-end: mở bản build (dist/index.html qua file://) bằng Chromium,
đóng vai người học đi qua mọi màn hình. Chạy:  npm run e2e   (cần: pip install playwright)

Chế độ test (localStorage "mitxue_test" = "1") đánh dấu đáp án đúng để bot bấm đúng.
Ảnh chụp màn hình lưu ở tests/e2e/shots/.
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
URL = (ROOT / "dist" / "index.html").as_uri()
SHOTS = Path(__file__).parent / "shots"; SHOTS.mkdir(exist_ok=True)
FAILS: list[str] = []

def check(cond, msg):
    print(("  ✔ " if cond else "  ✘ ") + msg)
    if not cond: FAILS.append(msg)

async def answer_quiz(pg, root="body", correct=True, maxq=45):
    """Trả lời hết bài quiz đang mở trong `root`. correct=True: bấm đáp án đúng (chế độ test)."""
    n = 0
    for _ in range(maxq):
        box = pg.locator(f"{root} .quiz").last
        if await box.locator(".qtitle").count() == 0: break
        if await box.locator(".opt").count():
            sel = ".opt[data-ok='1']" if correct else ".opt:not([data-ok])"
            await box.locator(sel).first.click()
        elif await box.locator("#oCheck").count():
            toks = box.locator("#tokArea .tok")
            k = await toks.count()
            order = sorted(range(k), key=lambda j: 0)  # mặc định
            if correct:
                idx = [int(await toks.nth(j).get_attribute("data-i")) for j in range(k)]
                order = sorted(range(k), key=lambda j: idx[j])
            for j in order: await toks.nth(j).click()
            await box.locator("#oCheck").click()
        elif await box.locator("[data-pron-rec]").count() and not await box.locator("#spRec").count():
            # máy chấm thật: micro giả của Chromium phát tiếng bíp → bộ chấm chạy hết luồng, chắc chắn chưa đạt
            await box.locator("[data-pron-rec]").click()
            await box.locator("#spOk, #spBad, #spSelf, #spRec, [data-pron-msg]").first.wait_for(timeout=30000)
            if await box.locator("#spRec").count(): continue          # rơi về tự chấm
            if not await box.locator("#spOk, #spBad, #spSelf").count():  # máy không nghe ra gì → tự chấm
                await box.locator("#spManual").click(); continue
            if correct: await box.locator("#spOk, #spSelf").first.click()
            else: await box.locator("#spBad, #spOk").first.click()
        elif await box.locator("#spRec").count():
            await box.locator("#spRec").click(); await pg.wait_for_timeout(3300)
            await box.locator("#spOk" if correct else "#spBad").click()
        elif await box.locator("#wSkip").count():
            await box.locator("#wSkip").click()
        else:
            break
        await pg.wait_for_timeout(60)
        await box.locator("#qNext").click(); n += 1
        await pg.wait_for_timeout(60)
    return n

async def state(pg): return await pg.evaluate("JSON.parse(JSON.stringify(mitxue.S))")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"])
        ctx = await b.new_context(viewport={"width": 1180, "height": 860}, accept_downloads=True)
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append("console: " + m.text))
        pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))

        print("1. Người mới mở app")
        await pg.goto(URL); await pg.evaluate("localStorage.setItem('mitxue_test','1')"); await pg.reload(); await pg.wait_for_timeout(400)
        check("Học phát âm" in await pg.inner_text(".bigbtn"), "nút lớn gợi ý học phát âm trước")
        await pg.screenshot(path=SHOTS / "01_home.png")

        print("2. Khóa phát âm: 4 bài")
        await pg.click(".bigbtn"); await pg.wait_for_timeout(300)
        check(pg.url.endswith("#/pron/learn"), "chuyển tới #/pron/learn")
        for i in range(4):
            await pg.click(f"[data-pc='{i}']"); await pg.wait_for_timeout(250)
            if i == 3: await pg.screenshot(path=SHOTS / "02_pron_pair.png")
            n = await answer_quiz(pg, "#pcQuiz")
            check(n >= 8, f"bài phát âm {i+1}: trả lời {n} câu")
            await pg.click("#qNextStep"); await pg.wait_for_timeout(150)
        s = await state(pg)
        check(s["pron"]["lessonDone"], "qua đủ 4 bài → xong Giai đoạn 0")
        await pg.goto(URL + "#/home"); await pg.wait_for_timeout(250)
        lbl = await pg.inner_text(".bigbtn")
        check("HSK 1 · Bài 1" in lbl and "phần 1/3" in lbl, f"nút lớn chuyển sang HSK 1 Bài 1 ({lbl.splitlines()[0]})")

        print("3. Bài 1: từ mới theo phần + chặn khi đủ 10 từ/ngày")
        await pg.click(".bigbtn"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS / "03_vocab.png")
        for part in range(3):
            if await pg.locator("#gateOff").count():
                check(part == 2, "phần 3 bị chặn vì đã học 16 từ hôm nay"); await pg.click("#gateOff")
            await pg.click("#vQuiz"); await pg.wait_for_timeout(150)
            await answer_quiz(pg, "#vqBox")
            await pg.click("#qNextStep"); await pg.wait_for_timeout(250)
        s = await state(pg)
        check(len(s["srs"]) == 22 and s["units"]["1:1"]["steps"].get("vocab"), "22 từ vào lịch ôn, xong bước Từ mới")
        check(pg.url.endswith("/chars"), "tự qua bước Chữ Hán")
        await pg.screenshot(path=SHOTS / "04_chars.png")
        await pg.click("text=Xong phần này, học tiếp →"); await pg.wait_for_timeout(300)
        check(pg.url.endswith("/grammar"), "qua Ngữ pháp")
        await pg.click("text=✏️ Kiểm tra nhanh >> nth=0"); await answer_quiz(pg, "#stepBody")
        await pg.click("text=Xong phần này, học tiếp →"); await pg.wait_for_timeout(300)
        check(pg.url.endswith("/dialogue"), "qua Hội thoại")
        await pg.screenshot(path=SHOTS / "05_dialogue.png")
        await pg.click("text=Xong phần này, học tiếp →"); await pg.wait_for_timeout(300)
        check(pg.url.endswith("/practice"), "qua Luyện tập")
        for i in [0, 1, 3, 4]:
            await pg.click(f"[data-set='{i}']"); await pg.wait_for_timeout(150)
            await answer_quiz(pg, "#pBody"); await pg.click("#qNextStep"); await pg.wait_for_timeout(150)
        await pg.click("[data-set='2']"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS / "06_write.png")
        await answer_quiz(pg, "#pBody")  # viết chữ: bot bấm "Bỏ qua" → chưa đạt bộ này
        s = await state(pg)
        check(not s["units"]["1:1"]["steps"].get("practice"), "chưa viết chữ thì chưa xong Luyện tập")
        await pg.evaluate("mitxue.S.units['1:1'].sets['Viết chữ']=90; mitxue.save()")

        print("4. Kiểm tra cuối bài")
        await pg.goto(URL + "#/lesson/1/1/test"); await pg.wait_for_timeout(250)
        await pg.click("#tStart"); await pg.wait_for_timeout(200)
        n = await answer_quiz(pg, "#tBody")
        check(n == 20, f"bài kiểm tra 20 câu (đã làm {n})")
        await pg.screenshot(path=SHOTS / "07_test_result.png")
        s = await state(pg)
        check(s["units"]["1:1"]["done"] and s["units"]["1:1"]["best"] >= 80, f"qua bài 1 ({s['units']['1:1']['best']}%)")
        await pg.goto(URL + "#/road"); await pg.wait_for_timeout(250)
        check(await pg.locator(".unit:not([disabled]) >> text=Bài 2").count() == 1, "Bài 2 đã mở trong lộ trình")
        await pg.screenshot(path=SHOTS / "08_road.png", full_page=True)

        print("5. Ôn tập (FSRS)")
        await pg.evaluate("for (const k of Object.keys(mitxue.S.srs).slice(0,5)) mitxue.S.srs[k].due = Date.now()-1000; mitxue.save()")
        await pg.goto(URL + "#/review"); await pg.wait_for_timeout(250)
        check((await pg.inner_text("#dueN")).strip() == "5", "5 thẻ đến hạn hiện trên thanh điều hướng")
        await pg.click("#rvStart"); await answer_quiz(pg, "#rvBody")
        s = await state(pg)
        import time
        future = [c for c in s["srs"].values() if c["reps"] >= 1]
        check(len(future) == 5 and all(c["due"] > time.time() * 1000 + 86400000 for c in future), "ôn đúng → hẹn lần sau ≥ 1 ngày")

        print("6. Các màn khác")
        await pg.goto(URL + "#/dict"); await pg.wait_for_timeout(200)
        await pg.fill("#dq", "yeye"); await pg.wait_for_timeout(200)
        check("爷爷" in await pg.inner_text("main"), "tra pinyin không dấu ra 爷爷")
        await pg.goto(URL + "#/stats"); await pg.wait_for_timeout(250); await pg.screenshot(path=SHOTS / "09_stats.png", full_page=True)
        await pg.goto(URL + "#/pron/chart"); await pg.wait_for_timeout(250); await pg.click(".syl >> nth=5"); await pg.wait_for_timeout(150)
        check(await pg.locator("#pop").count() == 1, "bảng pinyin mở chi tiết âm tiết")
        await pg.goto(URL + "#/pron/listen"); await pg.wait_for_timeout(250)
        for _ in range(3):
            await pg.locator(".opt").first.click(); await pg.click("#qNext")
        await pg.goto(URL + "#/pron/speak"); await pg.wait_for_timeout(250)
        await pg.click("text=🎙️ Thu âm (2 giây)"); await pg.wait_for_timeout(2600)
        await pg.screenshot(path=SHOTS / "10_speak.png")
        await pg.evaluate("mitxue.S.settings.unlockAll=true; mitxue.save()")
        await pg.goto(URL + "#/story/4"); await pg.wait_for_timeout(250)
        await pg.screenshot(path=SHOTS / "11_story.png", full_page=True)
        await pg.click("#stQ"); await answer_quiz(pg, "main")
        s = await state(pg); check(s["stories"].get("4"), "đọc truyện + trả lời đúng → đánh dấu đã đọc")
        await pg.goto(URL + "#/lesson/2/3/grammar"); await pg.wait_for_timeout(300)
        check(await pg.locator(".pyfade").count() > 0, "HSK 2: pinyin làm mờ")
        await pg.screenshot(path=SHOTS / "12_hsk2_grammar.png")
        await pg.goto(URL + "#/level-test/2"); await pg.wait_for_timeout(200); await pg.click("#ltStart")
        check("Câu 1/40" in await pg.inner_text(".qtitle"), "thi tổng HSK 2 có 40 câu")
        await pg.reload(); await pg.wait_for_timeout(300)
        check(pg.url.endswith("#/level-test/2") and await pg.locator("#ltStart").count() == 1, "F5 vẫn ở đúng màn")

        print("7. Cài đặt + sao lưu/khôi phục")
        await pg.goto(URL + "#/home"); await pg.wait_for_timeout(200)
        await pg.click("#settingsBtn"); await pg.fill("#stNew", "12"); await pg.click("#stSave"); await pg.wait_for_timeout(200)
        check((await state(pg))["settings"]["newPerDay"] == 12, "lưu cài đặt")
        await pg.click("#settingsBtn")
        async with pg.expect_download() as dl: await pg.click("text=Tải file sao lưu")
        f = await (await dl.value).path(); data = json.loads(open(f, encoding="utf-8").read())
        check(data["ver"] == 3 and len(data["srs"]) == 22, "file sao lưu đủ dữ liệu")
        await pg.evaluate("mitxue.S.xp = 1; mitxue.save()")
        await pg.set_input_files("#modalBox input[type=file]", f); await pg.wait_for_timeout(400)
        check((await state(pg))["xp"] == data["xp"], "khôi phục từ file")

        print("8. Chuyển dữ liệu từ bản cũ v0.4")
        ctx2 = await b.new_context(); pg2 = await ctx2.new_page()
        pg2.on("pageerror", lambda e: errs.append("pageerror(v2): " + str(e)))
        old = {"xp": 182, "created": "2026-11-20", "days": {}, "settings": {"newPerDay": 15}, "pron": {"lessonDone": True},
               "units": {"1:1": {"steps": {"vocab": True}, "best": 15, "done": False, "vc": 3}},
               "srs": {"1:你": {"due": 1800000000000, "iv": 7, "ef": 2.5, "reps": 3, "lapses": 1, "added": "2026-11-20"}}, "migr4": True}
        await pg2.goto(URL); await pg2.evaluate(f"localStorage.clear(); localStorage.setItem('mitxue_v2', {json.dumps(json.dumps(old))})"); await pg2.reload(); await pg2.wait_for_timeout(400)
        s2 = await pg2.evaluate("JSON.parse(JSON.stringify(mitxue.S))")
        check(s2["xp"] >= 182 and s2["srs"]["1:你"]["state"] == 2 and s2["srs"]["1:你"]["due"] == 1800000000000, "tiến độ v0.4 chuyển sang v1.0 đúng")
        check(await pg2.evaluate("!!localStorage.getItem('mitxue_v3') && !!localStorage.getItem('mitxue_v2')"), "lưu khóa mới, giữ khóa cũ")
        await ctx2.close()

        print("9. Giao diện tối + điện thoại")
        await pg.evaluate("document.documentElement.dataset.theme='dark'")
        await pg.goto(URL + "#/lesson/1/2/vocab"); await pg.wait_for_timeout(300); await pg.screenshot(path=SHOTS / "13_dark.png")
        await pg.set_viewport_size({"width": 390, "height": 844}); await pg.goto(URL + "#/home"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SHOTS / "14_mobile.png", full_page=True)

        check(not errs, "không có lỗi JavaScript" + ("" if not errs else ": " + " | ".join(errs[:5])))
        await b.close()
    print(f"\n{'TẤT CẢ ĐẠT' if not FAILS else str(len(FAILS)) + ' LỖI'}")
    sys.exit(1 if FAILS else 0)

asyncio.run(main())
