<!-- Phát âm (Giai đoạn 0): 4 tab, tab nằm trên địa chỉ #/pron/<tab>. -->
<script lang="ts">
  import { go } from "../../lib/router.svelte";
  import { S, save } from "../../lib/state.svelte";
  import Chart from "./Chart.svelte";
  import Learn from "./Learn.svelte";
  import Listen from "./Listen.svelte";
  import Speak from "./Speak.svelte";
  let { tab }: { tab: "learn" | "chart" | "listen" | "speak" } = $props();
  S.pron.opened = true; if (tab === "chart") S.pron.chartSeen = true; save();
  const TABS = [["learn", "📖 Bài học phát âm"], ["chart", "🔤 Bảng pinyin"], ["listen", "🎧 Luyện nghe"], ["speak", "🎙️ Luyện nói"]] as const;
</script>

<section>
  <div class="row" style="margin-bottom:12px" id="pronNav"><div class="seg">
    {#each TABS as [k, n]}<button class:on={tab === k} onclick={() => go("#/pron/" + k)}>{n}</button>{/each}
  </div></div>
  {#if tab === "learn"}<Learn />{:else if tab === "chart"}<Chart />{:else if tab === "listen"}<Listen />{:else}<Speak />{/if}
</section>
