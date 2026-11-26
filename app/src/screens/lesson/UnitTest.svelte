<script lang="ts">
  import Quiz from "../../components/quiz/Quiz.svelte";
  import { PASS_UNIT, unitProg } from "../../lib/curriculum";
  import { unitCount, wordsOf } from "../../lib/data";
  import { addXP } from "../../lib/progress";
  import { unitTestQs, type Question } from "../../lib/questions";
  import { go } from "../../lib/router.svelte";
  import { intro } from "../../lib/srs";
  import { save } from "../../lib/state.svelte";
  import { confetti, say } from "../../lib/ui.svelte";
  let { lv, u }: { lv: number; u: number } = $props();
  const st = unitProg(lv, u);
  let run = $state(0);
  let qs = $state<Question[]>([]);
  function start() { qs = unitTestQs(lv, u); run++; }
  function onDone(_s: number, _t: number, pct: number, ok: boolean) {
    st.best = Math.max(st.best || 0, pct);
    if (ok && !st.done) {
      st.done = true; st.steps.test = true;
      wordsOf(lv, u).forEach(w => intro(w.key));
      addXP(60); confetti();
      say(`Qua bài ${u} với <b>${pct}%</b>! 🎉 ${u + 1 <= unitCount(lv) ? `Bài ${u + 1}` : "Thi tổng"} mở rồi đó.`, "happy");
    } else if (!ok) say(`Được ${pct}%, thiếu chút nữa thôi. Xem lại câu sai, ôn từ rồi làm lại nha. Chị chờ.`, "smirk");
    save();
  }
</script>

<div class="card"><h2>Bài kiểm tra · HSK {lv} Bài {u}</h2>
  <p>20 câu trộn ngẫu nhiên: từ vựng, nghe, ngữ pháp, sắp xếp câu, dịch, viết chữ, đọc to. <b>Cần ≥ {PASS_UNIT}%</b> để hoàn thành bài và mở bài tiếp theo.</p>
  {#if st.best}<p class="muted">Điểm cao nhất: {st.best}%</p>{/if}
  {#if !run}<button class="btn" id="tStart" onclick={start}>Bắt đầu kiểm tra</button>{/if}
</div>
{#if run}
  <div class="card" id="tBody">
    {#key run}<Quiz questions={qs} title="Kiểm tra" pass={PASS_UNIT} {onDone} onRestart={start} nextLabel="Về lộ trình" onNext={() => go("#/road")} />{/key}
  </div>
{/if}
