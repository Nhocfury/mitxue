import { describe, expect, it } from "vitest";
import { accountKey, checkInput, normName } from "../../src/lib/account";
import { normalizeCode } from "../../src/lib/sync.svelte";

describe("tài khoản tên + mật khẩu", () => {
  it("cùng tên + mật khẩu → cùng mã (bất kể hoa thường, khoảng trắng ở tên)", async () => {
    const a = await accountKey("Long", "matkhau123"), b = await accountKey("  long ", "matkhau123");
    expect(a).toBe(b);
    expect(normalizeCode(a)).toBe(a);                 // đúng định dạng máy chủ nhận
  });
  it("khác mật khẩu hoặc khác tên → mã khác; mật khẩu phân biệt hoa thường", async () => {
    const a = await accountKey("Long", "matkhau123");
    expect(await accountKey("Long", "Matkhau123")).not.toBe(a);
    expect(await accountKey("Lan", "matkhau123")).not.toBe(a);
  });
  it("tên tiếng Việt có dấu: dạng Unicode khác nhau vẫn ra cùng mã", async () => {
    expect(normName("Bá Long")).toBe(normName("Bá Long".normalize("NFD")));
    expect(await accountKey("Bá Long", "123456")).toBe(await accountKey("Bá Long".normalize("NFD"), "123456"));
  });
  it("kiểm tra đầu vào", () => {
    expect(checkInput("L", "123456")).not.toBe("");
    expect(checkInput("Long", "12345")).not.toBe("");
    expect(checkInput("Long", "123456")).toBe("");
  });
});
