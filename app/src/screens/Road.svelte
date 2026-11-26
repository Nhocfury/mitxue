<!-- Lộ trình: Giai đoạn 0 + HSK 1→5, mỗi cấp gập/mở; cấp đang học tự mở. -->
<script lang="ts">
  import { allUnitsDone, estimatedFinish, levelOpen, levelPassed, nextUnit, peekUnit, PASS_UNIT, storyOpen, unitDone, unitOpen, unitsDoneIn } from "../lib/curriculum";
  import { hasLesson, LEVEL_INFO, LEVELS, lessonOf, STORIES, unitCount, wordsOf, wordsOfLevel } from "../lib/data";
  import { go } from "../lib/router.svelte";
  import { S, save } from "../lib/state.svelte";

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
        <div class="units">
          {#each units(lv) as u}
            {@const open = unitOpen(lv, u)}
            {@const st = peekUnit(lv, u)}
            <button class="unit" class:done={unitDone(lv, u)} class:next={open && isCur && nx?.u === u} class:locked={!open} disabled={!open} onclick={() => go({ name: "lesson", lv, u })}>
              <b>Bài {u}</b>{label(lv, u)}{#if st?.best}<div class="muted">{st.best}%</div>{/if}
            </button>
          {/each}
          <button class="unit" class:done={levelPassed(lv)} class:next={allUnitsDone(lv) && !levelPassed(lv)} class:locked={!allUnitsDone(lv)} disabled={!allUnitsDone(lv) && !S.settings.unlockAll} onclick={() => go({ name: "levelTest", lv })}><b>🏁 Thi tổng</b>40 câu</button>
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
