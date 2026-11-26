/* =========================================================================
 * TÀI KHOẢN = TÊN + MẬT KHẨU (cho nhóm nhỏ ~10 người, không cần máy chủ đăng nhập)
 * Từ tên + mật khẩu, app tự tính ra "mã đồng bộ" bằng PBKDF2-SHA256 (200.000 vòng):
 *   cùng tên + cùng mật khẩu ở bất kỳ máy nào → cùng mã → cùng tiến độ.
 * Máy chủ (functions/api/sync.js) không đổi gì, không biết tên hay mật khẩu của ai.
 * Đổi mật khẩu = sang mã khác (tiến độ chuyển theo nhờ gộp lúc đăng nhập lại).
 * Quên mật khẩu: tiến độ trên các máy đã đăng nhập vẫn còn; tạo tài khoản mới từ máy đó.
 * ========================================================================= */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const ITER = 200_000;

/** Chuẩn hóa tên: bỏ khoảng trắng thừa, chữ thường, dạng Unicode NFC ("  Long " = "long"). */
export const normName = (name: string): string => name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

export function checkInput(name: string, password: string): string {
  if (normName(name).length < 2) return "Tên cần ít nhất 2 ký tự.";
  if (password.length < 6) return "Mật khẩu cần ít nhất 6 ký tự.";
  return "";
}

/** Tên + mật khẩu → mã đồng bộ dạng MX-XXXXX-XXXXX-XXXXX-XXXXX (100 bit). */
export async function accountKey(name: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode("mitxue-account|" + normName(name)), iterations: ITER }, base, 104));
  let v = 0n;
  for (const b of bits.slice(0, 13)) v = (v << 8n) | BigInt(b);
  v >>= 4n;                                                     // 104 bit → giữ 100 bit
  let s = "";
  for (let i = 0; i < 20; i++) { s = B32[Number(v & 31n)] + s; v >>= 5n; }
  return "MX-" + s.match(/.{5}/g)!.join("-");
}
