<script lang="ts">
  import { playWord } from "../lib/audio";
  import { gloss } from "../lib/data";
  import type { Word } from "../lib/types";
  import { openModal } from "../lib/ui.svelte";
  import Py from "./Py.svelte";
  import WordModal from "./WordModal.svelte";
  let { w }: { w: Word } = $props();
</script>

<button class="wcard" data-k={w.key} onclick={() => { playWord(w.c); openModal(WordModal, { w }); }}>
  <div class="zh hz">{w.c}</div>
  <div style="text-align:left"><div><Py py={w.py} /></div><div class="hv">{w.hv || ""}</div><div>{gloss(w)}</div></div>
</button>
