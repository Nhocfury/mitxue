<!-- Thẻ một chữ Hán: hoạt hình nét, Hán Việt, bộ thủ, cấu tạo, nút tập viết. -->
<script lang="ts">
  import { onMount } from "svelte";
  import { BY_C, CHARS, gloss } from "../lib/data";
  import { openModal } from "../lib/ui.svelte";
  import { createWriter, type Writer } from "../lib/writer";
  import Py from "./Py.svelte";
  import WriteModal from "./WriteModal.svelte";
  let { c }: { c: string } = $props();
  const d = $derived(CHARS[c] || {});
  const w = $derived(BY_C[c]);
  let box: HTMLDivElement;
  let wr: Writer | null = null;
  onMount(() => { wr = createWriter(box, c, { size: 130 }); });
</script>

<div class="charbox" data-ch={c}>
  <div class="row" style="justify-content:center;gap:16px">
    <div class="writer mi" bind:this={box}></div>
    <div style="text-align:left;max-width:230px">
      <div class="hv" style="font-size:18px">{d.hv || ""}</div>
      <div>{#if w}<Py py={w.py} /> · {gloss(w)}{:else}{d.en || ""}{/if}</div>
      <div class="muted">{d.st || "?"} nét · Bộ <b class="hz">{d.rad || ""}</b> {d.radvi || ""}</div>
      {#if d.dec && d.dec !== "？"}<div class="muted">Cấu tạo: <span class="hz">{d.dec}</span></div>{/if}
      {#if d.ety}<div class="muted" style="font-size:12px">Gợi ý nhớ (EN): {d.ety}</div>{/if}
      {#if d.hw}<div class="badge" style="margin:4px 0 0">✍️ Đề thi yêu cầu viết tay</div>{/if}
      <div class="row" style="margin-top:6px">
        <button class="btn ghost small" onclick={() => wr?.animateCharacter()}>▶ Xem nét</button>
        <button class="btn small" onclick={() => openModal(WriteModal, { c })}>✍️ Tập viết</button>
      </div>
    </div>
  </div>
</div>
