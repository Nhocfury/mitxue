<script lang="ts">
  import Py from "../../components/Py.svelte";
  import { playAll, playSentence } from "../../lib/audio";
  import { pyHidden, type StepKey } from "../../lib/curriculum";
  import { S, save } from "../../lib/state.svelte";
  import type { Lesson } from "../../lib/types";
  import NextStep from "./NextStep.svelte";
  import PronCheck from "../../components/PronCheck.svelte";
  let { lv, L, goStep }: { lv: number; L: Lesson; goStep: (k: StepKey) => void } = $props();
  const speakers = [...new Set(L.dialogue.map(d => d.sp!))];
  let showPy = $state(S.settings.showPy), showVi = $state(true), role = $state("");
  const fade = pyHidden(lv);
  let speakAt = $state(-1);                 // câu đang mở khung "đọc to"
</script>

<div class="card">
  <div class="row between"><h2>Hội thoại</h2>
    <div class="row">
      <label class="row"><input type="checkbox" id="dPy" bind:checked={showPy} onchange={() => { S.settings.showPy = showPy; save(); }}> Pinyin</label>
      <label class="row"><input type="checkbox" bind:checked={showVi}> Nghĩa</label>
      <button class="btn ghost small" onclick={() => playAll(L.dialogue, playSentence, 500)}>🔊 Nghe cả bài</button>
      <select class="text" bind:value={role}><option value="">Đóng vai: không</option>{#each speakers as s}<option>{s}</option>{/each}</select>
    </div>
  </div>
  <p class="muted">Nghe cả bài 2 lần → bấm 🎙️ ở từng câu để đọc to, chị chấm từng chữ → chọn "Đóng vai" để tự nói phần của một nhân vật (câu đó sẽ bị che).</p>
  <div id="dlg">
    {#each L.dialogue as d, i}
      {@const hide = role !== "" && d.sp === role}
      <div class="dlg" class:b={speakers.indexOf(d.sp!) % 2 === 1}>
        <div class="sp hz">{d.sp}</div>
        <div class="line"><div class="row" style="align-items:flex-start">
          <div class="col">
            <button class="iconbtn" onclick={() => playSentence(d)} aria-label="Nghe">🔊</button>
            {#if d.sy}<button class="iconbtn" class:on={speakAt === i} data-speak={i} onclick={() => (speakAt = speakAt === i ? -1 : i)} aria-label="Đọc to">🎙️</button>{/if}
          </div>
          <div style="flex:1">
            <div class="zh hz" style:visibility={hide ? "hidden" : "visible"}>{d.zh}</div>
            {#if showPy && !hide}<div class="muted"><Py py={d.py} {fade} /></div>{/if}
            {#if showVi}<div class="vi">{d.vi}</div>{/if}
            {#if speakAt === i && d.sy}{#key i}<PronCheck zh={d.zh} sy={d.sy} play={() => playSentence(d)} compact />{/key}{/if}
          </div>
        </div></div>
      </div>
    {/each}
  </div>
  <NextStep lv={L.lv} u={L.u} k="dialogue" {goStep} />
</div>

<style>
  .col{display:flex;flex-direction:column;gap:4px}
  .iconbtn.on{background:var(--red-soft);border-radius:8px}
</style>
