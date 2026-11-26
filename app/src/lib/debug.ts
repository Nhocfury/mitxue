/* =========================================================================
 * GỠ LỖI & TEST
 * - Mở Console (F12) gõ `mitxue.S` để xem tiến độ, `mitxue.go("#/road")`…
 * - localStorage "mitxue_test" = "1" thì đáp án đúng được đánh dấu data-ok
 *   trong HTML (chỉ để test tự động bấm đúng; người học không bật cái này).
 * ========================================================================= */
import { go } from "./router.svelte";
import { S, save } from "./state.svelte";
import * as srs from "./srs";
import { sync, syncNow } from "./sync.svelte";

export const isTestMode = () => { try { return localStorage.getItem("mitxue_test") === "1"; } catch { return false; } };

export function exposeDebug(): void {
  (window as unknown as Record<string, unknown>).mitxue = { S, save, go, srs, syncNow, sync, version: "1.7.0" };
}
