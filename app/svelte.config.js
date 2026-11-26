import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Mỗi màn hình được tạo lại khi đổi địa chỉ ({#key router.n} trong App.svelte),
    // nên đọc giá trị prop lúc khởi tạo là CỐ Ý. Tắt cảnh báo này cho đỡ nhiễu.
    warningFilter: (w) => w.code !== "state_referenced_locally",
  },
};
