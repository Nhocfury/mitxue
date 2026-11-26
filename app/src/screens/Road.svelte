<!-- Lộ trình: Giai đoạn 0 + HSK 1→5, mỗi cấp gập/mở; cấp đang học tự mở. -->
<script lang="ts">
  import { allUnitsDone, estimatedFinish, levelOpen, levelPassed, nextUnit, peekUnit, PASS_UNIT, storyOpen, unitDone, unitOpen, unitsDoneIn } from "../lib/curriculum";
  import { hasLesson, LEVEL_INFO, LEVELS, lessonOf, STORIES, unitCount, wordsOf, wordsOfLevel } from "../lib/data";
  import { go } from "../lib/router.svelte";
  import { S, save } from "../lib/state.svelte";
  import { starsOf } from "../lib/motivation";

  // Đường đi kiểu "con đường": các bài lệch trái/phải theo hình sóng
  const OFF = [0, 46, 72, 46, 0, -46, -72, -46];

  const nx = nextUnit();
  const finish = estimatedFinish().toLocaleDateString("vi-VN");
  const units = (lv: number) => Array.from({ length: unitCount(lv) }, (_, k) => k + 1);
  const label = (lv: number, u: number) => lessonOf(lv, u)?.title ?? wordsOf(lv, u).slice(0, 3).map(w => w.c).join(" ");
  const lessonsIn = (lv: number) => units(lv).filter(u => lessonOf(lv, u)).length;
</script>

<section>
  <div class="card"><h2>🗺️ Lộ trình HSK 1 → 5</h2>
    <div class="muted">Đi lần lượt từng giai đoạn. Mỗi bài qua kiểm tra ≥ {PASS_UNIT}% mới mở bài sau; hết mỗi cấp có bài thi tổng. Dự kiến xong ~{finish} nếu học {S.settings.goalMin} phút/ngày.</div>
  </div>

  <details class="level" class:cur={!S.pron.lessonDone} open={!S.pron.lessonDone}>
    <summary><span class="lvbadge">0</span><b>Giai đoạn 0 · Phát âm</b><span class="muted">{S.pron.lessonDone ? "✔ xong" : "~2 tuần"}</span></summary>
    <p class="muted">Pinyin, 4 thanh điệu, âm khó với người Việt. Qua 4 bài kiểm tra ngắn là xong.</p>
    <div class="row">
      <button class="btn" onclick={() => go("#/pron/learn")}>{S.pron.lessonDone ? "Ôn phát âm" : "Học phát âm"}</button>
      <label class="row"><input type="checkbox" checked={S.pron.lessonDone} onchange={e => { S.pron.lessonDone = e.currentTarget.checked; save(); }}> Đã học xong (tự đánh dấu)</label>
    </div>
  </details>

  {#each LEVELS as lv}
    {@const lock = !levelOpen(lv)}
    {@const isCur = !!nx && nx.lv === lv}
    <details class="level" class:lock class:cur={isCur} open={isCur}>
      <summary><span class="lvbadge">HSK {lv}</span><b>{wordsOfLevel(lv).length} từ mới · {unitCount(lv)} bài</b>
        <span class="muted">{levelPassed(lv) ? `✔ đã đạt ${S.levels[lv].best}%` : lock ? "🔒" : `${unitsDoneIn(lv)}/${unitCount(lv)}`}</span></summary>
      <p class="muted">{LEVEL_INFO[lv].can}</p>
      {#if !hasLesson(lv)}<div class="info">HSK {lv}: đã có từ vựng, chữ Hán, audio, bài tập. Bài giảng ngữ pháp + hội thoại + nghĩa tiếng Việt sẽ được bổ sung dần (hiện nghĩa tạm bằng tiếng Anh).</div>
      {:else if lessonsIn(lv) < unitCount(lv)}<div class="info">HSK {lv}: bài 1–{lessonsIn(lv)} có hội thoại + ngữ pháp. Các bài sau hiện chỉ học từ vựng, giáo trình đang soạn tiếp.</div>{/if}
      {#if lock}<div class="muted">🔒 Mở khi đạt bài thi tổng HSK {lv - 1}.</div>
      {:else}
        <div class="path">
          {#each units(lv) as u, k}
            {@const open = unitOpen(lv, u)}
            {@const st = peekUnit(lv, u)}
            {@const done = unitDone(lv, u)}
            {@const here = open && isCur && nx?.u === u}
            {@const stars = starsOf(st?.best ?? 0, PASS_UNIT)}
            <button class="unit pnode" class:done class:next={here} class:locked={!open} disabled={!open} style="--x:{OFF[k % OFF.length]}px" onclick={() => go({ name: "lesson", lv, u })}>
              {#if here}<span class="here">Đang học</span>{/if}
              <span class="circle">{done ? "✓" : !open ? "🔒" : u}</span>
              <span class="stars">{#each [1, 2, 3] as j}<i class:on={j <= stars}>★</i>{/each}</span>
              <b>Bài {u}</b><span class="cap">{label(lv, u)}</span>
            </button>
          {/each}
          <button class="unit pnode final" class:done={levelPassed(lv)} class:next={allUnitsDone(lv) && !levelPassed(lv)} class:locked={!allUnitsDone(lv)} disabled={!allUnitsDone(lv) && !S.settings.unlockAll} onclick={() => go({ name: "levelTest", lv })}>
            <span class="circle">🏆</span><b>🏁 Thi tổng</b><span class="cap">40 câu{levelPassed(lv) ? ` · ${S.levels[lv].best}%` : ""}</span>
          </button>
        </div>
        {#if STORIES.some(x => x.lv === lv)}
          <div style="margin-top:10px"><b>📖 Truyện đọc thêm</b>
            <div class="units">
              {#each STORIES.filter(x => x.lv === lv) as x}
                {@const open = storyOpen(x)}
                <button class="unit" class:done={!!S.stories[x.id]} class:locked={!open} disabled={!open} onclick={() => go({ name: "story", id: x.id })}>
                  <b>{x.title}</b>{open ? (S.stories[x.id] ? "✓ đã đọc" : "mới mở") : "mở sau bài " + x.after}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </details>
  {/each}
  <div class="card muted" style="font-size:12px">Nguồn: đề cương HSK 3.0 (krmanik/HSK-3.0), nét chữ Make Me a Hanzi, Hán Việt hanviet-pinyin-wordlist, CC-CEDICT.</div>
</section>

<style>
  .path{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 0 4px;position:relative}
  .path::before{content:"";position:absolute;top:20px;bottom:30px;left:50%;border-left:4px dotted var(--border);transform:translateX(-2px)}
  .pnode{position:relative;transform:translateX(var(--x));background:none;border:none;min-height:0;padding:0;display:flex;flex-direction:column;align-items:center;width:150px;text-align:center;color:var(--text)}
  .pnode .circle{width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;
    background:var(--card);border:3px solid var(--border);box-shadow:0 5px 0 var(--border);transition:transform .15s}
  .pnode:not(:disabled):hover .circle{transform:translateY(-2px)}
  .pnode.done .circle{background:var(--ok);border-color:var(--ok);color:#fff;box-shadow:0 5px 0 #136b39}
  .pnode.next .circle{background:var(--red);border-color:var(--red);color:#fff;box-shadow:0 5px 0 #8f0b20;animation:pulse 1.6s ease-in-out infinite}
  .pnode.final .circle{background:var(--gold-soft);border-color:var(--gold);box-shadow:0 5px 0 var(--gold)}
  .pnode.locked{opacity:.55}
  .pnode .stars{font-size:15px;letter-spacing:1px;margin-top:6px;line-height:1}
  .pnode .stars i{font-style:normal;color:var(--border)}
  .pnode .stars i.on{color:var(--gold)}
  .pnode b{font-size:13px;margin-top:2px}
  .pnode .cap{font-size:12px;color:var(--muted);line-height:1.25;background:var(--card);border-radius:6px;padding:0 4px}
  .here{position:absolute;top:-18px;background:var(--red);color:#fff;font-size:11px;font-weight:700;border-radius:8px;padding:2px 8px;white-space:nowrap;z-index:1}
  @keyframes pulse{50%{box-shadow:0 5px 0 #8f0b20,0 0 0 8px rgba(200,16,46,.18)}}
</style>
