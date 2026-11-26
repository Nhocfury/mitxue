<!-- Chi tiết một từ: phát âm, Hán Việt, nghĩa, từng chữ (xem nét, tập viết), câu ví dụ trong bài. -->
<script lang="ts">
  import { playWord } from "../lib/audio";
  import { allSentences } from "../lib/data";
  import type { Word } from "../lib/types";
  import { isHan } from "../lib/util";
  import CharBox from "./CharBox.svelte";
  import Py from "./Py.svelte";
  import SentenceRow from "./SentenceRow.svelte";
  let { w }: { w: Word } = $props();
  const sents = $derived(allSentences().filter(s => s.t.includes(w.c)).slice(0, 4));
  const chars = $derived([...w.c].filter(isHan));
</script>

<div class="row" style="gap:18px;align-items:flex-start">
  <div class="hz" style="font-size:64px;line-height:1">{w.c}</div>
  <div>
    <div style="font-size:22px;font-weight:600"><Py py={w.py} /> <button class="iconbtn" onclick={() => playWord(w.c)}>🔊</button></div>
    <div class="hv">{w.hv || ""}</div>
    <div style="font-size:18px">{w.vi || ""}</div>
    <div class="muted">EN: {w.en || ""}</div>
    <div class="muted">HSK {w.lv} · Bài {w.u}</div>
  </div>
</div>
<h3>Từng chữ</h3>
<div class="grid g2">{#each chars as c (c)}<CharBox {c} />{/each}</div>
{#if sents.length}<h3>Ví dụ trong bài</h3>{#each sents as s}<SentenceRow {s} />{/each}{/if}
