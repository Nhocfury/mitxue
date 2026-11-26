import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/**
 * App phải chạy được khi bấm đôi index.html (giao thức file://).
 * Trình duyệt chặn <script type="module"> trên file://, nên:
 *  - build ra MỘT file JS dạng IIFE (không chia nhỏ, không import động)
 *  - plugin dưới đây đổi thẻ script module thành script thường (defer).
 */
function classicScript(): Plugin {
  return {
    name: "mitxue-classic-script",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
        .replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href=');
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [svelte(), classicScript()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "app",
    modulePreload: false,
    cssCodeSplit: false,   // gom toàn bộ CSS vào 1 file app/app.css
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "app/app.js",
        assetFileNames: "app/app[extname]",
      },
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
  },
});
