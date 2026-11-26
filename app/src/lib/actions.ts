/* Hành động dùng ở nhiều màn. */
import { go } from "./router.svelte";
import { learnedCount } from "./srs";
import { S, save } from "./state.svelte";
import { say } from "./ui.svelte";

/** Chế độ 5 phút: 10 thẻ ôn; chưa có từ thì luyện nghe thanh điệu. */
export function fiveMinute(): void {
  S.fiveDone++; save();
  if (!learnedCount()) { go("#/pron/listen"); say("Chưa có từ để ôn nên mình luyện nghe thanh điệu nha. Làm 10 câu là xong 5 phút :))", "smirk"); return; }
  go("#/review/five"); say("Ok, 10 thẻ thôi. Chị bấm giờ đó :))", "smirk");
}
