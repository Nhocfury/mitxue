/* =========================================================================
 * BỘ MÁY NHẬN DẠNG PINYIN (chạy riêng, không nằm trong app.js)
 * - sherpa-onnx WebAssembly (gói @sherpaw/asr, Apache-2.0) + mô hình KWS 3.3M pinyin của k2-fsa.
 * - Mở bằng file:// nên KHÔNG fetch được: wasm và mô hình nằm sẵn trong 2 file .js dạng base64
 *   (pron/wasm.js → window.MITPRON_WASM, pron/model.js → window.MITPRON_MODEL).
 * - Đóng gói bằng scripts/build-pron.mjs → app/public/pron/engine.js
 * API: window.MitPronEngine.init() → Promise; .recognize(Float32Array 16 kHz) → { tokens, timestamps }
 * ========================================================================= */
import { createOnlineRecognizer } from "@sherpaw/asr";
import ModuleFactory from "../node_modules/@sherpaw/asr/dist/asr-B3QtWJoU.js";

const b64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
let rec = null;

async function init() {
  if (rec) return;
  if (!window.MITPRON_WASM || !window.MITPRON_MODEL) throw new Error("thiếu pron/wasm.js hoặc pron/model.js");
  const M = await ModuleFactory({ locateFile: f => f, wasmBinary: b64(window.MITPRON_WASM).buffer, print: () => {}, printErr: () => {} });
  for (const [name, data] of Object.entries(window.MITPRON_MODEL)) M.FS_createDataFile("/", name, b64(data), true, false, false);
  // giải phóng chuỗi base64 lớn sau khi nạp
  window.MITPRON_WASM = null; window.MITPRON_MODEL = null;
  rec = createOnlineRecognizer(M, {
    type: 0, decodingMethod: "greedy_search", enableEndpoint: 0,
    modelConfig: { transducer: { encoder: "/encoder.onnx", decoder: "/decoder.onnx", joiner: "/joiner.onnx" }, tokens: "/tokens.txt", modelingUnit: "", debug: 0, numThreads: 1 },
  });
}

function recognize(samples) {
  if (!rec) throw new Error("chưa init");
  const s = rec.createStream();
  s.acceptWaveform(16000, new Float32Array(4800));            // 0,3 s im lặng đầu
  s.acceptWaveform(16000, samples);
  s.acceptWaveform(16000, new Float32Array(16000));           // 1 s im lặng cuối để mô hình "nói hết"
  s.inputFinished();
  while (rec.isReady(s)) rec.decode(s);
  const r = rec.getResult(s); s.free();
  // thời điểm tính từ đầu audio của em (bỏ 0,3 s đệm)
  return { tokens: r.tokens || [], timestamps: (r.timestamps || []).map(t => Math.max(0, t - 0.3)) };
}

window.MitPronEngine = { init, recognize, version: "kws-zipformer-wenetspeech-3.3M/sherpaw-asr-0.3.0" };
