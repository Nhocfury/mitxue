import { createOnlineRecognizer } from "@sherpaw/asr";
import ModuleFactory from "./node_modules/@sherpaw/asr/dist/asr-B3QtWJoU.js";
const b64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
window.pronInit = async () => {
  const t0 = performance.now();
  const M = await ModuleFactory({ locateFile: f => f, wasmBinary: b64(window.SHERPA_WASM).buffer, print: () => {}, printErr: () => {} });
  const t1 = performance.now();
  for (const [k, v] of Object.entries(window.PRON_MODEL)) M.FS_createDataFile("/", k, b64(v), true, false, false);
  const rec = createOnlineRecognizer(M, { type: 0, decodingMethod: "greedy_search", enableEndpoint: 0,
    modelConfig: { transducer: { encoder: "/encoder.onnx", decoder: "/decoder.onnx", joiner: "/joiner.onnx" }, tokens: "/tokens.txt", modelingUnit: "", debug: 0, numThreads: 1 } });
  const t2 = performance.now();
  window.recognize = samples => {
    const t = performance.now(), s = rec.createStream();
    s.acceptWaveform(16000, new Float32Array(4800)); s.acceptWaveform(16000, Float32Array.from(samples)); s.acceptWaveform(16000, new Float32Array(16000)); s.inputFinished();
    while (rec.isReady(s)) rec.decode(s);
    const r = rec.getResult(s); s.free();
    return { tokens: r.tokens, timestamps: r.timestamps, raw: JSON.stringify(r).slice(0, 300), ms: Math.round(performance.now() - t) };
  };
  return { wasm: Math.round(t1 - t0), model: Math.round(t2 - t1), proto: location.protocol };
};
