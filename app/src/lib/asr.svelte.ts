/* =========================================================================
 * NẠP BỘ MÁY CHẤM PHÁT ÂM (lazy): chỉ tải ~25 MB khi em mở phần đọc to lần đầu.
 * 3 file nằm cạnh index.html: pron/wasm.js, pron/model.js, pron/engine.js (scripts/build-pron.mjs sinh ra).
 * ========================================================================= */
export const asr = $state({ status: "idle" as "idle" | "loading" | "ready" | "error", error: "" });

declare global {
  interface Window { MitPronEngine?: { init(): Promise<void>; recognize(s: Float32Array): { tokens: string[]; timestamps: number[] } } }
}

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error("không tải được " + src));
    document.head.appendChild(s);
  });
}

let loading: Promise<boolean> | null = null;
/** Nạp và khởi động bộ máy (1 lần). Trả false nếu lỗi: giao diện quay về tự chấm. */
export function ensureEngine(): Promise<boolean> {
  if (asr.status === "ready") return Promise.resolve(true);
  loading ??= (async () => {
    asr.status = "loading";
    try {
      if (!window.MitPronEngine) for (const f of ["pron/wasm.js", "pron/model.js", "pron/engine.js"]) await loadScript(f);
      await window.MitPronEngine!.init();
      asr.status = "ready"; return true;
    } catch (e) {
      asr.status = "error"; asr.error = String((e as Error)?.message ?? e); loading = null; return false;
    }
  })();
  return loading;
}

/** Nhận dạng âm thanh 16 kHz mono → token pinyin (phụ âm đầu + vần có thanh). */
export async function recognizePinyin(samples: Float32Array): Promise<string[]> {
  if (!(await ensureEngine())) throw new Error(asr.error || "bộ chấm chưa sẵn sàng");
  return window.MitPronEngine!.recognize(samples).tokens;
}
