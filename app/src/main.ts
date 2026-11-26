/* Điểm khởi động app. */
import { mount } from "svelte";
import App from "./App.svelte";
import "./styles/app.css";
import { startRouter } from "./lib/router.svelte";
import { startTimeTracking } from "./lib/progress";
import { applyTheme, greet } from "./lib/startup";
import { exposeDebug } from "./lib/debug";

applyTheme();
startRouter();
startTimeTracking();
greet();
exposeDebug();
mount(App, { target: document.getElementById("app")! });
