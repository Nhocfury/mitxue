// Đóng gói bộ máy chấm phát âm → app/public/pron/{engine.js, wasm.js, model.js}.
// Chạy: npm run build:pron   (chỉ cần chạy lại khi đổi mô hình hoặc nâng @sherpaw/asr)
import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(APP, "public", "pron");
const MODEL_DIR = join(APP, "..", "content", ".sources", "models", "sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01");
const MODEL_FILES = {
  "encoder.onnx": "encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx",
  "decoder.onnx": "decoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx",
  "joiner.onnx": "joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx",
  "tokens.txt": "tokens.txt",
};
mkdirSync(OUT, { recursive: true });

await build({
  entryPoints: [join(APP, "pron-engine", "engine.js")], bundle: true, format: "iife", platform: "browser", minify: true,
  external: ["module", "fs", "path", "url", "crypto"], outfile: join(OUT, "engine.js"), logLevel: "warning",
  banner: { js: "/* Mít Xué: bộ máy chấm phát âm. sherpa-onnx (Apache-2.0) qua @sherpaw/asr (Apache-2.0). */" },
});

const wasm = readFileSync(join(APP, "node_modules", "@sherpaw", "asr", "dist", "prebuilt", "asr.wasm"));
writeFileSync(join(OUT, "wasm.js"), `window.MITPRON_WASM="${wasm.toString("base64")}";\n`);

if (existsSync(MODEL_DIR)) {
  const model = Object.fromEntries(Object.entries(MODEL_FILES).map(([k, f]) => [k, readFileSync(join(MODEL_DIR, f)).toString("base64")]));
  writeFileSync(join(OUT, "model.js"), `/* Mô hình: sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01 (k2-fsa/icefall, Apache-2.0; dữ liệu WenetSpeech: phi thương mại) */\nwindow.MITPRON_MODEL=${JSON.stringify(model)};\n`);
} else if (!existsSync(join(OUT, "model.js"))) {
  throw new Error("Không thấy mô hình ở " + MODEL_DIR + ". Tải: https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01.tar.bz2");
}
console.log("✔ pron/: engine.js, wasm.js, model.js");
