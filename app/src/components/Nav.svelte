<script lang="ts">
  import { go, navTab, router } from "../lib/router.svelte";
  import { dueCount } from "../lib/srs";
  import { S } from "../lib/state.svelte";

  const tab = $derived(navTab(router.route));
  const due = $derived.by(() => { void S.srs; void router.n; return dueCount(); });
  const TABS = [["home", "🏠 Hôm nay"], ["road", "🗺️ Lộ trình"], ["review", "🔁 Ôn tập"], ["dict", "📚 Từ điển"]] as const;
</script>

<nav id="nav">
  {#each TABS as [k, label]}
    <button data-tab={k} class:on={tab === k} onclick={() => go("#/" + k)}>
      {label}{#if k === "review"} <span class="badge-n" id="dueN">{due}</span>{/if}
    </button>
  {/each}
</nav>
