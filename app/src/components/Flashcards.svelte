<script lang="ts">
  import { playWord } from "../lib/audio";
  import { gloss } from "../lib/data";
  import type { Word } from "../lib/types";
  import { closeModal } from "../lib/ui.svelte";
  import { shuffle } from "../lib/util";
  import Py from "./Py.svelte";
  let { words }: { words: Word[] } = $props();
  const list = shuffle(words);
  let i = $state(0), flip = $state(false);
  const w = $derived(list[i]);
  function toggle() { flip = !flip; if (flip) playWord(w.c); }
</script>

<div class="qbox">
  <div class="muted">Thẻ {i + 1}/{list.length} · bấm thẻ để lật</div>
  <button class="card fc" onclick={toggle}>
    {#if !flip}<div class="hz" style="font-size:72px">{w.c}</div>
    {:else}<div class="hz" style="font-size:44px">{w.c}</div><div style="font-size:22px"><Py py={w.py} /></div><div class="hv">{w.hv || ""}</div><div style="font-size:20px">{gloss(w)}</div>{/if}
  </button>
  <div class="row" style="justify-content:center">
    <button class="btn ghost" disabled={i === 0} onclick={() => { i--; flip = false; }}>←</button>
    <button class="btn ghost" onclick={() => playWord(w.c)}>🔊</button>
    <button class="btn" onclick={() => { if (i < list.length - 1) { i++; flip = false; } else closeModal(); }}>{i < list.length - 1 ? "→" : "Xong"}</button>
  </div>
</div>
