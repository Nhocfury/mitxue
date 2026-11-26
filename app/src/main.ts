/* Điểm khởi động app. */
import { mount } from "svelte";
import App from "./App.svelte";
import "./styles/app.css";
import { startRouter } from "./lib/router.svelte";
import { startTimeTracking } from "./lib/progress";
import { applyTheme, greet } from "./lib/startup";
import { exposeDebug, isTestMode } from "./lib/debug";
import { startBedtimeWatch } from "./lib/motivation";
import { needWelcome, startSync } from "./lib/sync.svelte";
import { ui } from "./lib/ui.svelte";

applyTheme();
startRouter();
startTimeTracking();
greet();
if (!isTestMode()) startBedtimeWatch();   // test tự động chạy lúc nào cũng được, không nhắc ngủ
exposeDebug();
if (!isTestMode()) { startSync(); if (needWelcome()) ui.welcome = true; }
mount(App, { target: document.getElementById("app")! });

// Bản trên mạng: đăng ký service worker (cài như app, học offline). Bản file:// bỏ qua.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  const hadController = !!navigator.serviceWorker.controller;
  const openedAt = Date.now();
  // Có bản mới (service worker mới vừa nắm quyền): vừa mở app (< 15 giây) thì tự tải lại cho đồng bộ;
  // đang học dở thì chỉ báo, em tự bấm khi tiện (không làm mất bài đang làm).
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return;                              // lần cài đầu tiên: không cần tải lại
    if (Date.now() - openedAt < 15_000) location.reload();
    else ui.update = true;
  });
  navigator.serviceWorker.register("./sw.js").then(r => r.update()).catch(() => { /* không sao: app vẫn chạy bình thường */ });
}
