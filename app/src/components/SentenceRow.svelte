<!-- Một câu ví dụ: nút nghe, chữ Hán (tô từ trọng tâm), pinyin, nghĩa. -->
<script lang="ts">
  import { playSentence } from "../lib/audio";
  import type { Sentence } from "../lib/types";
  import Py from "./Py.svelte";
  let { s, fade = false, showVi = true }: { s: Sentence; fade?: boolean; showVi?: boolean } = $props();
</script>

<div class="ex">
  <div class="row" style="align-items:flex-start">
    <button class="iconbtn" onclick={() => playSentence(s)} aria-label="Nghe">🔊</button>
    <div style="flex:1">
      <div class="zh hz">{#each s.t as t}{#if s.k?.includes(t)}<span class="key">{t}</span>{:else}{t}{/if}{/each}</div>
      <div><Py py={s.py} {fade} /></div>
      {#if showVi}<div>{s.vi}</div>{/if}
    </div>
  </div>
</div>
