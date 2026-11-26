<script lang="ts">
  import Py from "../components/Py.svelte";
  import WordModal from "../components/WordModal.svelte";
  import { exportBackup, importBackup } from "../lib/backup";
  import { levelPassed, unitDone, unitsDoneIn } from "../lib/curriculum";
  import { gloss, LEVELS, unitCount, W, wordsOfLevel } from "../lib/data";
  import { lvOf, streak } from "../lib/progress";
  import { learnedCount, matureCount, weakWords } from "../lib/srs";
  import { S, resetState } from "../lib/state.svelte";
  import { openModal, toast } from "../lib/ui.svelte";
  import { todayStr } from "../lib/util";

  const days = Object.values(S.days);
  const totalMin = Math.round(days.reduce((a, d) => a + d.sec, 0) / 60);
  const totalQ = days.reduce((a, d) => a + d.q, 0), totalOk = days.reduce((a, d) => a + d.ok, 0);
  const written = Object.values(S.chars).filter(v => v >= 2).length;
  const unitsDone = Object.values(S.units).filter(u => u.done).length;
  const sk = streak();
  const tiles: [string, string | number][] = [["Tổng phút học", totalMin], ["Từ đã học", learnedCount()], ["Từ thuộc lâu", matureCount()], ["Chữ viết được", written],
    ["Bài đã qua", unitsDone], ["Câu đã làm", totalQ], ["Tỉ lệ đúng", totalQ ? Math.round((totalOk / totalQ) * 100) + "%" : "–"], ["Streak", sk + " ngày"]];
  const heat = Array.from({ length: 56 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 55 + i); const ds = todayStr(d); const x = S.days[ds];
    return { ds, x, m: x ? x.sec / 60 + x.q * 0.3 : 0 }; });
  const weak = weakWords();
  const badges: [string, string, boolean][] = [["🐣", "Câu đúng đầu tiên", S.correct >= 1], ["🎯", "100 câu đúng", S.correct >= 100], ["🏹", "1000 câu đúng", S.correct >= 1000],
    ["📖", "Qua bài 1", unitDone(1, 1)], ["📚", "Qua 5 bài", unitsDone >= 5], ["🏆", "Đạt HSK 1", levelPassed(1)], ["🥈", "Đạt HSK 2", levelPassed(2)], ["🥇", "Đạt HSK 3", levelPassed(3)],
    ["💎", "Đạt HSK 5", levelPassed(5)], ["🔥", "Streak 7 ngày", sk >= 7], ["🗓️", "Streak 30 ngày", sk >= 30], ["✍️", "Viết được 50 chữ", written >= 50],
    ["🎙️", "Điểm nói ≥ 80", S.speakBest >= 80], ["🧠", "100 từ thuộc lâu", matureCount() >= 100], ["⭐", "Level 10", lvOf(S.xp).lv >= 10]];
  async function restore(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (!f) return;
    if (!confirm("Khôi phục sẽ thay toàn bộ tiến độ hiện tại bằng file sao lưu. Tiếp tục?")) return;
    toast((await importBackup(f)) ? "Khôi phục xong ✓" : "File này không phải file sao lưu của Mít Xué");
  }
</script>

<section>
  <div class="tiles">{#each tiles as [a, b]}<div class="stat"><div class="n">{b}</div><div class="muted">{a}</div></div>{/each}</div>
  <div class="card" style="margin-top:14px"><h2>Tiến độ theo cấp</h2>
    {#each LEVELS as lv}
      {@const n = unitCount(lv)}{@const ws = wordsOfLevel(lv)}{@const d = unitsDoneIn(lv)}
      <div class="lvrow"><b>HSK {lv}</b><div class="bar"><i style="width:{(d / n) * 100}%;background:var(--red)"></i></div>
        <span class="muted">{d}/{n} bài · {ws.filter(w => S.srs[w.key]).length}/{ws.length} từ {#if levelPassed(lv)}· <b style="color:var(--ok)">ĐẠT</b>{/if}</span></div>
    {/each}
  </div>
  <div class="grid g2">
    <div class="card"><h2>Nghe thanh điệu</h2>
      {#each [1, 2, 3, 4] as t}{@const [c, n] = S.tones[t] || [0, 0]}{@const p = n ? Math.round((c / n) * 100) : 0}
        <div class="lvrow"><b class="c{t}">Thanh {t}</b><div class="bar"><i style="width:{p}%;background:var(--t{t})"></i></div><span class="muted">{n ? `${p}% (${n})` : "chưa làm"}</span></div>
      {/each}
    </div>
    <div class="card"><h2>8 tuần gần nhất</h2>
      <div class="heat">{#each heat as h}<span title="{h.ds}: {h.x ? `${Math.floor(h.x.sec / 60)} phút, ${h.x.q} câu` : 'chưa học'}" style:background={h.m > 0 ? `color-mix(in srgb, var(--red) ${Math.min(100, 15 + h.m)}%, transparent)` : undefined}></span>{/each}</div>
      <p class="muted">Ô đậm = học nhiều. Mỗi tuần được nghỉ 1 ngày mà không mất streak.</p>
    </div>
  </div>
  <div class="card"><h2>Từ hay quên nhất</h2>
    {#if weak.length}
      <table><thead><tr><th>Từ</th><th>Pinyin</th><th>Nghĩa</th><th>Số lần quên</th></tr></thead><tbody>
        {#each weak as [k, c]}{@const w = W[k]}<tr class="dictrow" onclick={() => openModal(WordModal, { w })}><td class="hz" style="font-size:20px">{w.c}</td><td><Py py={w.py} /></td><td>{gloss(w)}</td><td style="color:var(--bad)">{c.lapses}</td></tr>{/each}
      </tbody></table>
    {:else}<p class="muted">Chưa có. Ôn tập vài hôm là có số liệu.</p>{/if}
  </div>
  <div class="card"><h2>Huy hiệu</h2>{#each badges as [i, n, ok]}<span class="badge" class:lock={!ok}>{i} {n}</span>{/each}</div>
  <div class="card"><h2>Sao lưu dữ liệu</h2><p class="muted">Tiến độ lưu trong trình duyệt trên máy này. Mỗi tuần tải file sao lưu một lần; đổi máy hay đổi trình duyệt thì bấm Khôi phục.</p>
    <div class="row">
      <button class="btn" onclick={() => { exportBackup(); toast("Đã tải file sao lưu ✓"); }}>⬇️ Tải file sao lưu</button>
      <label class="btn ghost">⬆️ Khôi phục<input type="file" accept=".json" hidden onchange={restore}></label>
      <button class="btn ghost" style="border-color:var(--bad);color:var(--bad)" onclick={() => { if (confirm("Xóa hết tiến độ? Không hoàn tác được đâu nha.")) { resetState(); toast("Đã xóa"); } }}>Xóa hết làm lại</button>
    </div>
  </div>
</section>

<style>
  .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:12px}
  .tiles :global(.stat){background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:10px 8px}
  .tiles :global(.stat .n){font-size:24px;line-height:1.2}
  .tiles :global(.stat .muted){font-size:13px}
  .lvrow{display:grid;grid-template-columns:72px 1fr auto;gap:10px;align-items:center;margin:8px 0}
  .lvrow span{font-size:13px;text-align:right}
  @media (max-width:520px){ .tiles{grid-template-columns:1fr 1fr} .lvrow{grid-template-columns:64px 1fr} .lvrow span{grid-column:2;text-align:left;margin-top:-6px} }
  .heat{max-width:none}
</style>
