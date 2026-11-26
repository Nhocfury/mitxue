<!-- Tập viết 2 lượt: lượt 1 có nét mờ, lượt 2 không nhìn mẫu. Ít lỗi thì tính "viết thuộc". -->
<script lang="ts">
  import { onMount } from "svelte";
  import { CHARS } from "../lib/data";
  import { addXP } from "../lib/progress";
  import { S, save } from "../lib/state.svelte";
  import { createWriter } from "../lib/writer";
  let { c }: { c: string } = $props();
  const d = $derived(CHARS[c] || {});
  let box: HTMLDivElement;
  let fb = $state<{ ok: boolean; msg: string } | null>(null);
  let replay = $state<() => void>(() => {});
  onMount(() => {
    const wr = createWriter(box, c, { size: 260 }); if (!wr) return;
    let round = 0, mist = 0;
    const run = () => wr.quiz({
      onMistake: () => { mist++; },
      onComplete: () => {
        if (round === 0) { round = 1; mist = 0; fb = { ok: true, msg: "Tốt! Giờ viết lại không nhìn mẫu nha." }; wr.hideOutline(); setTimeout(run, 600); return; }
        const ok = mist <= Math.max(2, Math.ceil((d.st || 4) / 3));
        S.chars[c] = Math.max(S.chars[c] || 0, ok ? 2 : 1); save(); addXP(ok ? 6 : 2);
        fb = ok ? { ok, msg: `✔ Viết thuộc rồi! (${mist} lỗi)` } : { ok, msg: `Sai ${mist} nét. Viết thêm vài lần trên giấy nha.` };
      },
    });
    replay = () => { wr.showOutline(); wr.animateCharacter({ onComplete: run }); };
    run();
  });
</script>

<div class="qbox">
  <h2><span class="hz">{c}</span> · {d.hv || ""}</h2>
  <div class="muted">Lượt 1: viết theo nét mờ · Lượt 2: viết không nhìn mẫu</div>
  <div class="writer mi" bind:this={box} style="margin-top:10px"></div>
  <div class="fb">{#if fb}<span style="color:var({fb.ok ? '--ok' : '--bad'})">{fb.msg}</span>{/if}</div>
  <button class="btn ghost small" onclick={() => replay()}>▶ Xem lại nét</button>
</div>
