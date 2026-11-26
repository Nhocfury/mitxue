<script lang="ts">
  import Py from "../components/Py.svelte";
  import WordModal from "../components/WordModal.svelte";
  import { playWord } from "../lib/audio";
  import { LEVELS, WORDS } from "../lib/data";
  import { noTone } from "../lib/pinyin";
  import { S } from "../lib/state.svelte";
  import type { Word } from "../lib/types";
  import { openModal } from "../lib/ui.svelte";
  const idx = WORDS.map(w => ({ w, py: noTone(w.py), txt: (w.vi + " " + w.en + " " + (w.hv || "")).toLowerCase() }));
  let q = $state(""), lv = $state(0), learned = $state(false);
  const res = $derived.by(() => {
    const qq = q.trim().toLowerCase(), qn = noTone(qq);
    return idx.filter(x => (!lv || x.w.lv === lv) && (!learned || S.srs[x.w.key]) && (!qq || x.w.c.includes(qq) || (qn && x.py.startsWith(qn)) || x.txt.includes(qq)))
      .sort((a, b) => (a.w.c === qq ? -1 : 0) - (b.w.c === qq ? -1 : 0) || a.w.lv - b.w.lv || a.w.u - b.w.u).map(x => x.w);
  });
  const open = (w: Word) => { playWord(w.c); openModal(WordModal, { w }); };
</script>

<section>
  <div class="card search">
    <h2>📚 Từ điển HSK 1–5 <span class="muted">· {WORDS.length} từ</span></h2>
    <input class="text" id="dq" type="search" bind:value={q} placeholder="Gõ chữ Hán, pinyin, nghĩa, Hán Việt…" autocomplete="off" enterkeyhint="search">
    <div class="filters">
      <select class="text" bind:value={lv} aria-label="Cấp"><option value={0}>Mọi cấp</option>{#each LEVELS as l}<option value={l}>HSK {l}</option>{/each}</select>
      <label class="tgl"><input type="checkbox" bind:checked={learned}> Chỉ từ đã học</label>
      <span class="muted cnt">{res.length} kết quả{res.length > 200 ? " · hiện 200" : ""}</span>
    </div>
  </div>
  <div class="list">
    {#each res.slice(0, 200) as w (w.key)}
      <button class="dictrow" onclick={() => open(w)}>
        <span class="hz zh">{w.c}</span>
        <span class="mid"><span class="l1"><Py py={w.py} />{#if w.hv}<span class="hv">{w.hv}</span>{/if}</span><span class="vi">{w.vi || w.en}</span></span>
        <span class="lvl">HSK {w.lv}<small>bài {w.u}</small>{#if S.srs[w.key]}<i title="Đã học">✓</i>{/if}</span>
      </button>
    {:else}
      <p class="muted" style="text-align:center;padding:20px">Không thấy từ nào. Thử gõ pinyin không dấu, ví dụ <b>nihao</b>.</p>
    {/each}
  </div>
</section>

<style>
  .search h2{margin-bottom:10px}
  #dq{width:100%;font-size:16px;min-height:46px}
  .filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px}
  .filters select{min-height:40px}
  .tgl{display:flex;gap:6px;align-items:center;font-size:14px;min-height:40px}
  .cnt{margin-left:auto}
  .list{display:flex;flex-direction:column;gap:6px}
  .dictrow{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:8px 12px;color:var(--text);min-height:60px}
  .dictrow:hover{border-color:var(--red);background:var(--card)}
  .zh{font-size:26px;min-width:64px;line-height:1.2}
  .mid{flex:1;min-width:0;display:flex;flex-direction:column}
  .l1{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-weight:600}
  .vi{font-size:14px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}
  .lvl{flex:none;text-align:right;font-size:12px;font-weight:700;color:var(--red);display:flex;flex-direction:column;align-items:flex-end}
  .lvl small{color:var(--muted);font-weight:500}
  .lvl i{font-style:normal;color:var(--ok);font-size:14px}
</style>
