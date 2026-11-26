<!-- Pinyin tô màu theo thanh. fade = làm mờ, bấm để hiện (luyện đọc chữ Hán không dựa pinyin). -->
<script lang="ts">
  import { hasPyLetter, splitSyl, toneOfSyl } from "../lib/pinyin";
  let { py, fade = false, size, cls = "" }: { py: string; fade?: boolean; size?: number; cls?: string } = $props();
  let shown = $state(false);
  const parts = $derived(splitSyl(py).map(s => ({ s, t: hasPyLetter(s) ? toneOfSyl(s) : 0 })));
</script>

{#if fade}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <span class="py pyfade {cls}" class:show={shown} style:font-size={size ? size + "px" : undefined} onclick={() => (shown = !shown)} title="Bấm để xem pinyin">
    {#each parts as p}{#if p.t}<span class="c{p.t}">{p.s}</span>{:else}{p.s}{/if}{/each}
  </span>
{:else}
  <span class="py {cls}" style:font-size={size ? size + "px" : undefined}>{#each parts as p}{#if p.t}<span class="c{p.t}">{p.s}</span>{:else}{p.s}{/if}{/each}</span>
{/if}
