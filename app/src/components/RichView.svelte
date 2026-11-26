<!-- Hiển thị nội dung câu hỏi dạng Rich (xem lib/questions.ts). -->
<script lang="ts">
  import type { Rich } from "../lib/questions";
  import { markSyl } from "../lib/pinyin";
  import Py from "./Py.svelte";
  let { rich }: { rich: Rich } = $props();
</script>

{#each rich as seg}
  {#if seg.k === "text"}{#if seg.big}<div class="qtext">{seg.v}</div>{:else}<span>{seg.v}</span>{/if}
  {:else if seg.k === "hz"}<span class="hz" style:font-size={seg.size ? seg.size + "px" : undefined} class:qmain={seg.size && seg.size >= 60}>{seg.v}</span>
  {:else if seg.k === "py"}<Py py={seg.v} size={seg.size} />
  {:else if seg.k === "hv"}<span class="hv">{seg.v}</span>
  {:else if seg.k === "muted"}<span class="muted">{seg.v}</span>
  {:else if seg.k === "syl"}<span class={seg.color ? "c" + seg.t : ""} style:font-size={seg.size ? seg.size + "px" : undefined}>{markSyl(seg.b, seg.t)}</span>
  {:else if seg.k === "blank"}
    {@const idx = seg.s.t.indexOf(seg.key)}
    {#if idx >= 0}
      <div class="hz qblank">{#each seg.s.t as t, i}{#if i === idx}<span class="key">＿＿</span>{:else}{t}{/if}{/each}</div>
    {:else}
      {@const [a, ...rest] = seg.s.zh.split(seg.key)}
      <div class="hz qblank">{a}<span class="key">＿＿</span>{rest.join(seg.key)}</div>
    {/if}
  {/if}
{/each}
