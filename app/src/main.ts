/* Điểm khởi động app. */
import { mount } from "svelte";
import App from "./App.svelte";
import "./styles/app.css";
import { startRouter } from "./lib/router.svelte";
import { startTimeTracking } from "./lib/progress";
import { applyTheme, greet } from "./lib/startup";
import { exposeDebug, isTestMode } from "./lib/debug";
import { startBedtimeWatch } from "./lib/motivation";
import { startSync } from "./lib/sync.svelte";

applyTheme();
startRouter();
startTimeTracking();
greet();
if (!isTestMode()) startBedtimeWatch();   // test tự động chạy lúc nào cũng được, không nhắc ngủ
exposeDebug();
if (!isTestMode()) startSync();
mount(App, { target: document.getElementById("app")! });

// Bản trên mạng: đăng ký service worker (cài như app, học offline). Bản file:// bỏ qua.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1"))
  navigator.serviceWorker.register("./sw.js").catch(() => { /* không sao: app vẫn chạy bình thường */ });
