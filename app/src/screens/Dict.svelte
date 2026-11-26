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
  <div class="card"><h2>📚 Từ điển HSK 1–5 ({WORDS.length} từ)</h2>
    <div class="row">
      <input class="text" id="dq" bind:value={q} placeholder="Gõ chữ Hán, pinyin (không dấu cũng được), nghĩa Việt/Anh, Hán Việt…" style="flex:1;min-width:260px">
      <select class="text" bind:value={lv}><option value={0}>Mọi cấp</option>{#each LEVELS as l}<option value={l}>HSK {l}</option>{/each}</select>
      <label class="row"><input type="checkbox" bind:checked={learned}> Chỉ từ đã học</label>
    </div>
    <div style="margin-top:10px">
      <div class="muted">{res.length} kết quả{res.length > 200 ? " (hiện 200 đầu)" : ""}</div>
      <table><thead><tr><th>Chữ</th><th>Pinyin</th><th>Hán Việt</th><th>Nghĩa</th><th>Cấp</th><th></th></tr></thead>
        <tbody>{#each res.slice(0, 200) as w (w.key)}
          <tr class="dictrow" onclick={() => open(w)}><td class="hz" style="font-size:22px">{w.c}</td><td><Py py={w.py} /></td><td class="hv">{w.hv || ""}</td><td>{w.vi || w.en}</td><td>HSK {w.lv}<div class="muted">bài {w.u}</div></td><td>{S.srs[w.key] ? "✅" : ""}</td></tr>
        {/each}</tbody></table>
    </div>
  </div>
</section>
