<!--
  Khung "Đọc to – máy chấm": nghe mẫu → bấm đọc → tự dừng khi em nói xong → chấm từng âm tiết.
  Màu: xanh = đúng · vàng = sai thanh · đỏ = sai âm · xám gạch = thiếu. Dưới chữ sai hiện "em: …" (máy nghe được gì).
  Bộ chấm (lib/pronscore.ts + pron/engine.js) nạp lần đầu ~2 giây. Lỗi micro / bộ chấm thì báo rõ, cha tự xử lý (tự chấm).
-->
<script lang="ts">
  import { asr, ensureEngine, recognizePinyin } from "../lib/asr.svelte";
  import { Recorder, type Recording } from "../lib/mic";
  import { hanChars, scorePron, toneOf, splitSyl, type PronResult } from "../lib/pronscore";
  import { S, save } from "../lib/state.svelte";
  import { sfx } from "../lib/sfx";

  let { zh, sy, play, onResult, onError, compact = false }: {
    zh: string; sy: string[]; play?: () => void;
    onResult?: (r: PronResult) => void; onError?: (why: "mic" | "engine") => void; compact?: boolean;
  } = $props();

  const chars = hanChars(zh);
  type Phase = "idle" | "rec" | "think" | "done" | "error";
  let phase = $state<Phase>("idle");
  let level = $state(0);
  let res = $state<PronResult | null>(null);
  let rec = $state<Recording | null>(null);
  let msg = $state("");
  let recorder: Recorder | null = null;
  let tries = $state(0);

  const TONE_VI = ["", "thanh 1 (ngang, cao)", "thanh 2 (đi lên)", "thanh 3 (xuống rồi lên)", "thanh 4 (đi xuống)", "thanh nhẹ"];

  async function start() {
    if (phase === "rec") { recorder?.stop(); return; }
    msg = ""; res = null;
    void ensureEngine();                                  // nạp song song trong lúc em nói
    recorder = new Recorder();
    let r: Recording | null;
    try {
      // câu dài thì cho thêm thời gian: 2,5 s + 0,6 s mỗi âm tiết
      const maxMs = Math.min(15000, 2500 + chars.length * 600);
      phase = "rec";
      r = await recorder.record(v => (level = v), maxMs);
    } catch {
      phase = "error";
      msg = "Không mở được micro. Em kiểm tra: biểu tượng 🔒/🎙️ trên thanh địa chỉ của Edge → cho phép micro, rồi thử lại.";
      onError?.("mic"); return;
    }
    level = 0;
    if (!r || r.peak < 0.03 || r.seconds < 0.3) { phase = "idle"; msg = "Chị không nghe thấy gì. Em nói to và gần micro hơn chút nha."; return; }
    rec = r; phase = "think";
    try {
      const heard = await recognizePinyin(r.samples);
      if (!heard.length) { phase = "idle"; msg = "Chị nghe chưa ra chữ nào. Em đọc chậm, rõ từng chữ thử lại nha."; return; }
      const out = scorePron(chars, sy, heard);
      res = out; phase = "done"; tries++;
      S.speakCount++; if (out.score > S.speakBest) S.speakBest = out.score; save();
      out.score >= 80 ? sfx.ok(out.score === 100 ? 5 : 0) : sfx.bad();
      onResult?.(out);
    } catch (e) {
      phase = "error";
      msg = `Bộ chấm chưa chạy được (${asr.error || (e as Error).message}). Em nghe lại giọng mình rồi tự chấm nha.`;
      onError?.("engine");
    }
  }

  const mine = () => rec && new Audio(rec.url).play();

  /** Lời nhận xét: chỉ ra tối đa 2 chữ cần sửa, cụ thể thanh nào / âm nào. */
  const advice = $derived.by(() => {
    if (!res) return "";
    if (res.score === 100) return "Chuẩn hết rồi! 👏";
    const bad = res.syl.filter(s => s.status === "tone" || s.status === "sound" || s.status === "missed").slice(0, 2);
    const parts = bad.map(s => {
      if (s.status === "missed") return `chị chưa nghe thấy <b>${s.ch}</b> (${s.sy})`;
      if (s.status === "tone") return `<b>${s.ch}</b> là ${TONE_VI[toneOf(splitSyl(s.sy)[1])]}, em đọc thành <b>${s.heard}</b> (${TONE_VI[toneOf(s.heard)].split(" (")[0]})`;
      return `<b>${s.ch}</b> đọc là <b>${s.sy}</b>, chị nghe ra <b>${s.heard}</b>`;
    });
    return (res.score >= 80 ? "Tốt rồi, còn chút xíu: " : "Thử lại nha: ") + parts.join("; ") + ".";
  });
</script>

<div class="pc" class:compact>
  <div class="row btns">
    {#if play}<button class="btn ghost small" onclick={play}>🔊 Mẫu</button>{/if}
    <button class="btn small" class:recording={phase === "rec"} data-pron-rec disabled={phase === "think"} onclick={start}>
      {phase === "rec" ? "⏹ Xong" : phase === "think" ? "⏳ Đang chấm…" : tries ? "🎙️ Đọc lại" : "🎙️ Đọc to"}
    </button>
    {#if rec}<button class="btn ghost small" onclick={mine}>▶ Giọng em</button>{/if}
    {#if phase === "rec"}<span class="meter"><i style="width:{Math.round(level * 100)}%"></i></span>{/if}
  </div>

  {#if phase === "rec"}<div class="muted small">Đang nghe… em đọc xong im 1 giây là chị tự dừng.</div>{/if}
  {#if asr.status === "loading" && phase !== "rec"}<div class="muted small">Đang nạp bộ chấm (lần đầu khoảng 2 giây)…</div>{/if}
  {#if msg}<div class="msg" data-pron-msg>{msg}</div>{/if}

  {#if res && phase === "done"}
    <div class="res" data-pron-score={res.score}>
      <div class="syls">
        {#each res.syl as s}
          {#if s.status !== "skip"}
            <div class="syl {s.status}" title={s.status === "ok" ? "đúng" : s.status === "tone" ? "sai thanh" : s.status === "sound" ? "sai âm" : "thiếu"}>
              <span class="hz">{s.ch}</span><span class="py">{s.sy}</span>
              {#if s.status !== "ok"}<span class="heard">{s.status === "missed" ? "—" : "em: " + s.heard}</span>{/if}
            </div>
          {:else}
            <div class="syl skip"><span class="hz">{s.ch}</span><span class="py">{s.sy === "r" ? "(r)" : ""}</span></div>
          {/if}
        {/each}
      </div>
      <div class="sum"><b class:good={res.score >= 80}>{res.okCount}/{res.scored} âm tiết đúng · {res.score}%</b></div>
      <div class="adv">{@html advice}</div>
      <div class="legend muted"><span class="k ok"></span>đúng <span class="k tone"></span>sai thanh <span class="k sound"></span>sai âm <span class="k missed"></span>thiếu · máy có thể nghe nhầm, nhất là từ 1 chữ</div>
    </div>
  {/if}
</div>

<style>
  .pc{margin-top:8px}
  .btns{gap:8px;align-items:center;flex-wrap:wrap}
  .small{font-size:12px}
  .recording{background:var(--bad);border-color:var(--bad);animation:pulse 1s ease-in-out infinite}
  .meter{display:inline-block;width:90px;height:8px;border-radius:9px;background:var(--red-soft);overflow:hidden}
  .meter i{display:block;height:100%;background:var(--ok);transition:width .05s}
  .msg{margin-top:6px;color:var(--bad);font-size:14px}
  .res{margin-top:10px;padding:10px;border-radius:12px;background:var(--bg);border:1px solid var(--border)}
  .syls{display:flex;flex-wrap:wrap;gap:6px}
  .syl{display:flex;flex-direction:column;align-items:center;min-width:38px;padding:4px 5px;border-radius:9px;border:2px solid transparent}
  .syl .hz{font-size:24px;line-height:1.2}
  .syl .py{font-size:12px;color:var(--muted)}
  .syl .heard{font-size:11px;font-weight:700}
  .syl.ok{background:var(--ok-soft);border-color:var(--ok)}
  .syl.tone{background:var(--gold-soft);border-color:var(--gold)}
  .syl.tone .heard{color:var(--gold)}
  .syl.sound{background:var(--bad-soft);border-color:var(--bad)}
  .syl.sound .heard{color:var(--bad)}
  .syl.missed{border:2px dashed var(--border);opacity:.7}
  .syl.skip{opacity:.5}
  .sum{margin-top:8px}
  .sum b{color:var(--bad)} .sum b.good{color:var(--ok)}
  .adv{margin-top:4px;font-size:14px}
  .legend{margin-top:6px;font-size:11px}
  .k{display:inline-block;width:10px;height:10px;border-radius:3px;margin:0 3px 0 8px;vertical-align:middle}
  .k.ok{background:var(--ok)} .k.tone{background:var(--gold)} .k.sound{background:var(--bad)} .k.missed{border:1px dashed var(--muted)}
  .compact .syl .hz{font-size:20px}
  @keyframes pulse{50%{opacity:.75}}
</style>
