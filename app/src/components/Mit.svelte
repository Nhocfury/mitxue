<!-- Mít: chớp mắt, đổi miệng theo tâm trạng. Lời nói là HTML do app tự viết (xem ui.svelte.ts).
     Mặc định là thẻ ở màn Hôm nay; `pop` = bong bóng nổi ở các màn khác, tự ẩn sau vài giây, bấm để tắt. -->
<script lang="ts">
  import { onMount } from "svelte";
  import { hideMit, ui } from "../lib/ui.svelte";

  let { pop = false }: { pop?: boolean } = $props();
  const MOUTH = { happy: "M40 68 Q50 82 60 68", sad: "M42 74 Q50 67 58 74", smirk: "M42 72 Q52 76 60 68", normal: "M42 70 Q50 77 58 70" };
  let blink = $state(false);
  onMount(() => {
    const h = setInterval(() => { blink = true; setTimeout(() => (blink = false), 140); }, 4200);
    return () => clearInterval(h);
  });
</script>

{#snippet face()}
  <svg width="70" height="70" viewBox="0 0 100 100" aria-label="Mít">
    <circle cx="50" cy="54" r="38" fill="#ffd9c7" />
    <path d="M14 50 Q16 14 50 14 Q84 14 86 50 Q80 30 50 28 Q22 30 14 50Z" fill="#3b2420" />
    <circle cx="20" cy="40" r="10" fill="#3b2420" /><circle cx="80" cy="40" r="10" fill="#3b2420" />
    <path d="M70 18 l12 -8 l2 12 z M70 18 l14 4 l-8 8 z" fill="#c8102e" />
    <ellipse cx="37" cy="56" rx="4.5" ry={blink ? 1 : 5.5} fill="#2a1a1c" />
    <ellipse cx="63" cy="56" rx="4.5" ry={blink ? 1 : 5.5} fill="#2a1a1c" />
    <circle cx="28" cy="66" r="5" fill="#ff9aa2" opacity=".7" /><circle cx="72" cy="66" r="5" fill="#ff9aa2" opacity=".7" />
    <path d={MOUTH[ui.mit.mood]} stroke="#2a1a1c" stroke-width="3" fill="none" stroke-linecap="round" />
  </svg>
{/snippet}

{#if pop}
  <button class="mit mitpop" id="mitPop" aria-live="polite" title="Bấm để ẩn" onclick={hideMit}>{@render face()}<span class="bubble">{@html ui.mit.html}</span></button>
{:else}
  <div class="mit">{@render face()}<div class="bubble" id="mitSay">{@html ui.mit.html}</div></div>
{/if}
