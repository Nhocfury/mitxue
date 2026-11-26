"""Kiểm âm thanh câu ví dụ trong hộp chi tiết từ, 3 trường hợp giọng đọc của trình duyệt."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright
URL = (Path(__file__).resolve().parents[2] / "dist" / "index.html").as_uri()

# Giả lập speechSynthesis: mode = "none" (không có giọng), "silent" (có giọng nhưng không đọc), "ok" (đọc được)
FAKE = """mode => {
  window.__played = []; window.__spoken = [];
  const A = window.Audio; window.Audio = function (src) { const a = new A(); window.__played.push(src); a.play = () => Promise.resolve(setTimeout(() => a.onended && a.onended(), 30)); return a; };
  const voices = mode === "none" ? [] : [{ name: "Microsoft Xiaoxiao Online (Natural)", lang: "zh-CN" }];
  const ss = { getVoices: () => voices, cancel() {}, resume() {}, onvoiceschanged: null,
    speak(u) { window.__spoken.push(u.text); if (mode === "ok") { setTimeout(() => u.onstart && u.onstart(), 10); setTimeout(() => u.onend && u.onend(), 60); } } };
  Object.defineProperty(window, "speechSynthesis", { value: ss, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
}"""
async def run(mode):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.add_init_script(f"({FAKE})({mode!r})")
        await pg.goto(URL + "#/dict"); await pg.wait_for_timeout(300)
        await pg.fill("#dq", "你们"); await pg.wait_for_timeout(200)
        await pg.locator(".dictrow").first.click(); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__played = []; window.__spoken = []")
        await pg.locator("#modalBox .ex .iconbtn").first.click()
        await pg.wait_for_timeout(3500)
        r = await pg.evaluate("({ played: window.__played, spoken: window.__spoken })")
        await b.close(); return r
async def main():
    fails = 0
    # Có file đọc nguyên câu (audio/c/) thì mọi trường hợp đều phát đúng 1 file đó, không dùng giọng máy, không ghép từ.
    for mode in ["none", "silent", "ok"]:
        r = await run(mode)
        ok = len(r["played"]) == 1 and r["played"][0].startswith("audio/c/") and not r["spoken"]
        print(("✔" if ok else "✘"), mode, "→", r); fails += not ok
    sys.exit(1 if fails else 0)
asyncio.run(main())
