<script lang="ts">
  import { TONE_PTS } from "../../lib/pron";
  let { t }: { t: number } = $props();
  const pts = TONE_PTS[t].map(([x, y]) => `${10 + x * 100},${58 - (y - 1) * 12}`).join(" ");
</script>
<svg width="120" height="66" viewBox="0 0 120 66" style="display:block;margin:6px 0">
  {#each [1, 2, 3, 4, 5] as i}<line x1="10" x2="110" y1={58 - (i - 1) * 12} y2={58 - (i - 1) * 12} stroke="var(--border)" />{/each}
  <polyline points={pts} fill="none" stroke="var(--t{t})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
</svg>
