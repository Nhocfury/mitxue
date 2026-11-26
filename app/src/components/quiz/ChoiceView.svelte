<script lang="ts">
  import { onMount } from "svelte";
  import type { ChoiceQ, Rich } from "../../lib/questions";
  import { BAD_LINES, OK_LINES } from "../../lib/ui.svelte";
  import { pick } from "../../lib/util";
  import RichView from "../RichView.svelte";
  import { isTestMode } from "../../lib/debug";
  let { q, onAnswered }: { q: ChoiceQ; onAnswered: (ok: boolean, review?: Rich) => void } = $props();
  let picked = $state<number | null>(null);
  const testMode = isTestMode();
  const ok = $derived(picked !== null && !!q.opts[picked].ok);
  const line = $derived(picked === null ? "" : pick(ok ? OK_LINES : BAD_LINES));

  export function choose(k: number) {
    if (picked !== null || !q.opts[k]) return;
    picked = k;
    const right = q.opts.find(o => o.ok)!;
    if (q.afterAudio) q.afterAudio(); else if (q.audio && !q.autoplay) q.audio();
    onAnswered(!!q.opts[k].ok, [...q.main, { k: "text", v: " → " }, ...right.rich, { k: "text", v: "  " }, ...(q.reveal || [])]);
  }
  export function replay() { q.audio?.(); }
  onMount(() => { if (q.autoplay && q.audio) { const h = setTimeout(() => q.audio!(), 200); return () => clearTimeout(h); } });
</script>

<div class="qmainbox"><RichView rich={q.main} /></div>
{#if q.play}<button class="play" data-play onclick={() => q.audio?.()} aria-label="Nghe lại">▶</button>{/if}
<div class="opts">
  {#each q.opts as o, k}
    <button class="opt" data-ok={testMode && o.ok ? "1" : undefined} class:ok={picked !== null && o.ok} class:bad={picked === k && !o.ok} onclick={() => choose(k)}>
      <RichView rich={o.rich} /><div class="muted" style="font-size:11px">{k + 1}</div>
    </button>
  {/each}
</div>
<div class="fb" id="qFb">{#if picked !== null}<span style="color:var({ok ? '--ok' : '--bad'})">{ok ? "✔" : "✘"} {line}</span>{/if}</div>
{#if picked !== null && q.reveal}<div id="qReveal"><RichView rich={q.reveal} /></div>{/if}
