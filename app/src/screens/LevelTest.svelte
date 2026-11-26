<script lang="ts">
  import Quiz from "../components/quiz/Quiz.svelte";
  import { allUnitsDone, PASS_LEVEL } from "../lib/curriculum";
  import { addXP } from "../lib/progress";
  import { levelTestQs, type Question } from "../lib/questions";
  import { go } from "../lib/router.svelte";
  import { S, save } from "../lib/state.svelte";
  import { confetti, say, toast } from "../lib/ui.svelte";
  let { lv }: { lv: number } = $props();
  const open = allUnitsDone(lv) || S.settings.unlockAll;
  if (!open) { toast("Học xong hết các bài của cấp này rồi mới thi tổng nha"); go("#/road"); }
  let run = $state(0), qs = $state<Question[]>([]);
  function start() { qs = levelTestQs(lv); run++; }
  function onDone(_s: number, _t: number, pct: number, ok: boolean) {
    const L = (S.levels[lv] ??= { best: 0 });
    L.best = Math.max(L.best || 0, pct);
    if (ok) { L.passed = true; addXP(300); confetti(); say(`<b>ĐẠT HSK ${lv}</b> với ${pct}%!! 🎉🎉 Chị tự hào về em thiệt sự. Giờ có thể đăng ký thi thật được rồi đó.`, "happy"); }
    else say(`${pct}%, chưa qua. Không sao, xem lại phần sai, ôn mấy bài yếu rồi thi lại.`, "smirk");
    save();
  }
</script>

{#if open}
<section>
  <div class="card"><h2>🏁 Thi tổng HSK {lv}</h2>
    <p>40 câu mô phỏng cấu trúc đề HSK: <b>Nghe (15) · Đọc (15) · Viết (10)</b>. Cần ≥ {PASS_LEVEL}% để đạt và mở HSK {lv + 1}. Làm một mạch, đừng tra từ nha.</p>
    {#if S.levels[lv]?.best}<p class="muted">Điểm cao nhất: {S.levels[lv].best}%</p>{/if}
    {#if !run}<button class="btn" id="ltStart" onclick={start}>Bắt đầu</button>{/if}
  </div>
  {#if run}<div class="card" id="ltBody">{#key run}<Quiz questions={qs} title="Thi tổng HSK {lv}" pass={PASS_LEVEL} {onDone} onRestart={start} nextLabel="Về lộ trình" onNext={() => go("#/road")} />{/key}</div>{/if}
</section>
{/if}
