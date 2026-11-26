<!-- Ôn tập: thẻ đến hạn (tối đa 20/lượt), hoặc ôn ngẫu nhiên khi hết thẻ. five = chế độ 5 phút (10 thẻ, tự bắt đầu). -->
<script lang="ts">
  import Quiz from "../components/quiz/Quiz.svelte";
  import { reviewQs, type Question } from "../lib/questions";
  import { dueKeys, learnedCount, matureCount, MATURE_DAYS } from "../lib/srs";
  import { S } from "../lib/state.svelte";
  import { say } from "../lib/ui.svelte";
  import { shuffle } from "../lib/util";
  let { five = false }: { five?: boolean } = $props();
  let due = $state(dueKeys());
  let run = $state(0), qs = $state<Question[]>([]), title = $state("");
  const reps = (k: string) => S.srs[k]?.reps ?? 0;
  function start(keys: string[], t: string) { qs = reviewQs(keys, reps); title = t; run++; }
  function onDone(_s: number, _t: number, pct: number) {
    say(pct >= 80 ? `Ôn xong, đúng ${pct}%. Trí nhớ ngon đó :3` : `Đúng ${pct}%. Mấy từ sai chị sẽ hỏi lại sau ít phút nữa nha.`, pct >= 80 ? "happy" : "smirk");
  }
  function again() { due = dueKeys(); run = 0; }
  if (five) { const keys = (due.length ? due : shuffle(Object.keys(S.srs))).slice(0, 10); if (keys.length) start(keys, "⚡ 5 phút"); }
</script>

<section>
  <div class="card">
    <h2>🔁 Ôn tập</h2>
    <div class="rvstats">
      <div class="stat"><div class="n">{due.length}</div><div class="muted">đến hạn</div></div>
      <div class="stat"><div class="n">{learnedCount()}</div><div class="muted">từ đã học</div></div>
      <div class="stat" title="Khoảng ôn ≥ {MATURE_DAYS} ngày"><div class="n">{matureCount()}</div><div class="muted">thuộc lâu</div></div>
    </div>
    {#if !run}
      {#if due.length}<button class="btn" id="rvStart" onclick={() => start(due.slice(0, 20), "Ôn tập")}>Ôn {Math.min(20, due.length)} thẻ</button>
      {:else if learnedCount()}<p>Hết thẻ đến hạn rồi 👍 Muốn ôn thêm thì luyện ngẫu nhiên các từ đã học.</p><button class="btn ghost" id="rvFree" onclick={() => start(shuffle(Object.keys(S.srs)).slice(0, 15), "Ôn ngẫu nhiên")}>Ôn ngẫu nhiên 15 từ</button>
      {:else}<p>Chưa có từ nào. Học xong phần từ mới đầu tiên của Bài 1 là từ sẽ vào đây.</p>{/if}
    {/if}
  </div>
  <details class="card how"><summary>App chọn thẻ ôn thế nào?</summary><p class="muted">App tính lúc nào em sắp quên để hỏi lại (thuật toán FSRS, giống Anki): đúng thì lần sau hỏi thưa dần (vài ngày → vài tuần → vài tháng), sai thì hỏi lại sau 10 phút. "Thuộc lâu" = từ có khoảng ôn ≥ {MATURE_DAYS} ngày.</p></details>
  {#if run}<div class="card" id="rvBody">{#key run}<Quiz questions={qs} {title} {onDone} onRestart={again} focus onClose={again} nextLabel="Ôn tiếp" onNext={again} />{/key}</div>{/if}
</section>

<style>
  .rvstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;margin:6px 0 12px}
  .rvstats :global(.stat){padding:8px 4px}
  .rvstats :global(.stat .n){font-size:24px;line-height:1.2}
  .rvstats :global(.stat .muted){font-size:12.5px}
  .how summary{cursor:pointer;font-weight:600;font-size:14px}
  .how p{margin:8px 0 0}
  #rvStart,#rvFree{width:100%;justify-content:center;padding:14px;font-size:17px}
</style>
