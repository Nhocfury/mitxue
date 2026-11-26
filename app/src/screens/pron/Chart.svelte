<script lang="ts">
  import { playSyl } from "../../lib/audio";
  import { markSyl, plainShow } from "../../lib/pinyin";
  import { initialOf, INIT_ORDER, INIT_TIP, isHard, PSYL } from "../../lib/pron";
  import { go } from "../../lib/router.svelte";
  let filter = $state<"all" | "hard">("all"), q = $state(""), sel = $state<string | null>(null);
  const groups: Record<string, string[]> = {};
  for (const s of Object.keys(PSYL)) (groups[initialOf(s)] ??= []).push(s);
  const rows = $derived.by(() => {
    const qq = q.trim().toLowerCase().replace(/ü|v/g, "uu");
    return INIT_ORDER.map(i => ({ i, list: (groups[i] || []).filter(s => (filter === "all" || isHard(s)) && (!qq || s.includes(qq))) })).filter(r => r.list.length);
  });
  function open(s: string) { sel = s; playSyl(s, PSYL[s].includes(1) ? 1 : PSYL[s][0]); }
</script>

<div class="card">
  <h2>Bảng pinyin</h2>
  <p class="muted">Bấm vào âm tiết để nghe 4 thanh (giọng người thật). Rê chuột lên chữ đỏ bên trái để xem mẹo phát âm. Âm viền nét đứt là âm người Việt hay sai.</p>
  <div class="row" style="margin:8px 0 4px">
    <div class="seg"><button class:on={filter === "all"} onclick={() => (filter = "all")}>Tất cả</button><button class:on={filter === "hard"} onclick={() => (filter = "hard")}>Chỉ âm khó</button></div>
    <input class="text" bind:value={q} placeholder="Tìm: zhi, lü, xiang...">
  </div>
  {#if sel}
    {@const s = sel}{@const i = initialOf(s)}
    <div class="pop" id="pop">
      <div class="row" style="justify-content:space-between"><div><b style="font-size:22px">{plainShow(s)}</b> <span class="muted">· phụ âm đầu <b>{i || "(không có)"}</b>: {INIT_TIP[i] || ""}</span></div><button class="iconbtn" onclick={() => (sel = null)}>✕</button></div>
      {#if /^(zh|ch|sh|r|z|c|s)i$/.test(s)}<div class="tip">-i ở đây KHÔNG đọc là 'i', giữ lưỡi ở vị trí phụ âm rồi phát ra 'ư'.</div>{/if}
      {#if s.includes("uu") || /^(j|q|x|y)u/.test(s)}<div class="tip">Có âm <b>ü</b>: đọc 'i' rồi chu môi tròn lại.</div>{/if}
      <div class="row" style="margin-top:10px">
        {#each PSYL[s] as t}<button class="tbtn c{t}" onclick={() => playSyl(s, t)}>{markSyl(s, t)}</button>{/each}
        <button class="btn ghost" onclick={() => go(`#/pron/speak`)}>🎙️ Tập nói</button>
      </div>
    </div>
  {/if}
  <div id="chart">
    {#each rows as r (r.i)}
      <div class="initrow"><div class="initlab" title={INIT_TIP[r.i] || ""}>{r.i || "∅"}</div>
        <div class="row" style="flex:1">{#each r.list as s (s)}<button class="syl" class:hard={isHard(s)} class:sel={sel === s} onclick={() => open(s)}>{plainShow(s)}</button>{/each}</div>
      </div>
    {/each}
  </div>
</div>
