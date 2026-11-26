/* Việc lúc mở app: chọn giao diện sáng/tối, Mít chào theo số ngày vắng. */
import { dueCount } from "./srs";
import { S, markActive, save } from "./state.svelte";
import { say } from "./ui.svelte";
import { daysBetween, pick, todayStr } from "./util";

export function applyTheme(): void {
  const t = S.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = t;
}
export function toggleTheme(): void {
  S.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; save(); applyTheme();
}

export function greet(): void {
  const last = S.lastSeen, due = dueCount();
  if (!last) say("Chào Long! Chị là <b>Mít</b>. Lộ trình HSK 1 → 5 chị soạn sẵn rồi nè. Bắt đầu từ <b>Giai đoạn 0: Phát âm</b> và <b>HSK 1 · Bài 1</b> nha. Học đều mỗi ngày quan trọng hơn học dồn :3", "happy");
  else {
    const gap = daysBetween(last, todayStr());
    if (gap <= 0) say(due ? `Có <b>${due} thẻ</b> đang chờ ôn đó. Ôn trước rồi học bài mới nha.` : pick(["Quay lại rồi hả, tiếp tục nè!", "Học thêm chút nữa hông? Chị chờ nãy giờ á.", "Hôm nay chăm ghê ta :3"]), "happy");
    else if (gap === 1) say(`Hôm qua có học, nay tiếp nha. ${due ? `Có <b>${due} thẻ</b> cần ôn.` : ""} Streak đang chờ em đó 🔥`, "happy");
    else if (gap <= 3) say(`Ủa, mất tích <b>${gap} ngày</b> luôn? ARAM vui quá hả :)) Thôi, bấm <b>chế độ 5 phút</b> lấy lại phong độ đi.`, "smirk");
    else say(`<b>${gap} ngày</b> rồi đó Long. Chị hông giận đâu... chỉ hơi dỗi thôi :) ${due ? `Thẻ ôn dồn lại <b>${due}</b> cái rồi, làm từ từ 20 thẻ một lượt nha.` : ""}`, "sad");
  }
  markActive(); save();
}
