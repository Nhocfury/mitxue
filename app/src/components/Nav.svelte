<!-- Điều hướng chính. Điện thoại: thanh tab dưới đáy (vùng ngón cái). Máy tính: cột trái cố định. -->
<script lang="ts">
  import { go, navTab, router } from "../lib/router.svelte";
  import { dueCount } from "../lib/srs";
  import { S } from "../lib/state.svelte";
  import Icon from "./Icon.svelte";

  const tab = $derived(navTab(router.route));
  const due = $derived.by(() => { void S.srs; void router.n; return dueCount(); });
  const TABS = [["home", "Hôm nay"], ["road", "Lộ trình"], ["review", "Ôn tập"], ["dict", "Từ điển"], ["stats", "Tiến độ"]] as const;
</script>

<nav id="nav" aria-label="Điều hướng chính">
  <div class="brand"><span class="seal hz">学</span> Mít Xué</div>
  {#each TABS as [k, label]}
    <button data-tab={k} class:on={tab === k} aria-current={tab === k ? "page" : undefined} onclick={() => go("#/" + k)}>
      <span class="ic"><Icon name={k} />{#if k === "review" && due}<span class="badge-n" id="dueN">{due > 99 ? "99+" : due}</span>{/if}</span>
      <span class="lb">{label}</span>
    </button>
  {/each}
</nav>
