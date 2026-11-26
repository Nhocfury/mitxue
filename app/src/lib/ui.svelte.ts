/* =========================================================================
 * GIAO DIỆN DÙNG CHUNG: lời Mít, thông báo nhỏ (toast), hộp thoại (modal),
 * pháo giấy. Mọi màn hình gọi qua đây, không tự đụng DOM toàn cục.
 * ========================================================================= */
import type { Component } from "svelte";

export type Mood = "normal" | "happy" | "sad" | "smirk";

export const ui = $state({
  mit: { html: "Chào em :3", mood: "normal" as Mood },
  toast: { msg: "", show: false },
  modal: null as null | { comp: Component<any>; props: Record<string, unknown> },
  /** Bảng chúc mừng giữa màn hình (lên cấp, mở rương…). Chỉ để nhìn, không chặn bấm. */
  cele: null as null | { icon: string; title: string; sub: string; n: number },
  /** Màn chào: tạo tài khoản / đăng nhập (máy mới chưa đăng nhập). */
  welcome: false,
  /** Đã tải bản app mới, chờ em tải lại trang. */
  update: false,
});

/** Mít nói. `html` chỉ chứa chuỗi do app tự viết (có thể có <b>), không bao giờ là dữ liệu người dùng. */
export function say(html: string, mood: Mood = "normal"): void { ui.mit = { html, mood }; }

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string): void {
  ui.toast = { msg, show: true };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (ui.toast.show = false), 2200);
}

export function openModal<P extends Record<string, unknown>>(comp: Component<P>, props: P): void {
  ui.modal = { comp: comp as Component<any>, props };
}
export function closeModal(): void { ui.modal = null; }

let celeTimer: ReturnType<typeof setTimeout> | undefined;
/** Chúc mừng: pháo giấy + bảng lớn giữa màn hình, tự tắt sau ~2,8 giây. */
export function celebrate(icon: string, title: string, sub = ""): void {
  confetti();
  ui.cele = { icon, title, sub, n: (ui.cele?.n ?? 0) + 1 };
  clearTimeout(celeTimer);
  celeTimer = setTimeout(() => (ui.cele = null), 2800);
}

export function confetti(): void {
  if (typeof document === "undefined") return;
  const colors = ["#c8102e", "#e9a90a", "#ff6b6b", "#ffd43b"];
  for (let i = 0; i < 40; i++) {
    const d = document.createElement("div");
    d.className = "confetti";
    d.style.left = Math.random() * 100 + "vw";
    d.style.background = colors[i % 4];
    d.style.animationDelay = Math.random() * 0.5 + "s";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2300);
  }
}

export const OK_LINES = ["Chuẩn luôn! 👏", "Đúng rồi nè.", "Ngon! Giữ phong độ nha.", "Chính xác. Chị bắt đầu nể rồi đó :3", "Đúng! Vậy mới là em chị chứ."];
export const BAD_LINES = ["Sai xíu thôi, xem lại nha.", "Hông sao, sai mới nhớ lâu.", "Trật rồi :)) Đọc kỹ đáp án nè.", "Gần đúng á, tập trung chút nữa."];
