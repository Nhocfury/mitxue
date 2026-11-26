<script lang="ts">
  import { onMount } from "svelte";
  import { BY_C, CHARS, gloss } from "../../lib/data";
  import type { Rich, WriteQ } from "../../lib/questions";
  import { S } from "../../lib/state.svelte";
  import { createWriter } from "../../lib/writer";
  import Py from "../Py.svelte";
  let { q, onAnswered }: { q: WriteQ; onAnswered: (ok: boolean, review?: Rich) => void } = $props();
  const c = CHARS[q.ch] || {}; const w = BY_C[q.ch];
  let box: HTMLDivElement;
  let done = $state(false);
  let fb = $state<{ ok: boolean; msg: string } | null>(null);
  let hint = $state<() => void>(() => {});
  const review = (m: string): Rich => [{ k: "text", v: "Viết chữ " }, { k: "hz", v: q.ch }, { k: "muted", v: m }];
  function finish(ok: boolean, msg: string, extra = "") {
    if (done) return; done = true; fb = { ok, msg }; onAnswered(ok, review(extra));
  }
  onMount(() => {
    let mist = 0;
    const wr = createWriter(box, q.ch, { size: 240, showOutline: false, showCharacter: false });
    if (!wr) { finish(true, "Chưa có dữ liệu nét, bỏ qua câu này."); return; }
    const opts = {
      onMistake: () => { mist++; },
      onComplete: () => {
        const ok = mist <= Math.max(2, Math.ceil((c.st || 4) / 3));
        S.chars[q.ch] = Math.max(S.chars[q.ch] || 0, ok ? 2 : 1);
        finish(ok, ok ? `✔ Viết đúng! (${mist} lỗi)` : `Xong nhưng sai ${mist} nét, luyện thêm nha.`, `: sai ${mist} nét`);
      },
    };
    hint = () => { mist += 2; wr.animateCharacter({ onComplete: () => wr.quiz(opts) }); };
    wr.quiz(opts);
  });
</script>

<div class="row" style="justify-content:center;align-items:flex-start;gap:20px">
  <div><div class="writer mi" id="wq" bind:this={box}></div><div class="muted">Vẽ từng nét vào ô</div></div>
  <div style="text-align:left;max-width:260px">
    <div class="hv" style="font-size:16px">{c.hv || ""}</div>
    <div style="font-size:20px;font-weight:600"><Py py={w?.py || ""} /></div>
    <div>{gloss(w)}</div>
    <div class="muted" style="margin-top:6px">{c.st || "?"} nét · Bộ {c.rad || ""} {c.radvi || ""}</div>
    <button class="btn ghost small" id="wHint" style="margin-top:8px" disabled={done} onclick={() => hint()}>💡 Xem mẫu</button>
    <button class="btn ghost small" id="wSkip" style="margin-top:8px" disabled={done} onclick={() => finish(false, "Đã bỏ qua. Nhớ luyện viết chữ này trong phần Chữ Hán nha.")}>Bỏ qua (tính sai)</button>
  </div>
</div>
<div class="fb" id="qFb">{#if fb}<span style="color:var({fb.ok ? '--ok' : '--bad'})">{fb.msg}</span>{/if}</div>
