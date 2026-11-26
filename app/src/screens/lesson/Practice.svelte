<script lang="ts">
  import Quiz from "../../components/quiz/Quiz.svelte";
  import { PASS_SET, unitProg } from "../../lib/curriculum";
  import { practiceSets, type Question } from "../../lib/questions";
  import { save } from "../../lib/state.svelte";
  import { say, toast } from "../../lib/ui.svelte";
  import { completeStep } from "./complete";
  let { lv, u }: { lv: number; u: number } = $props();
  const st = unitProg(lv, u); st.sets ??= {};
  const sets = practiceSets(lv, u);
  let best = $state({ ...st.sets });
  let cur = $state<{ i: number; qs: Question[]; run: number } | null>(null);
  function start(i: number) {
    const qs = sets[i].make();
    if (!qs.length) { toast("Không có câu hỏi cho phần này"); return; }
    cur = { i, qs, run: (cur?.run ?? 0) + 1 };
  }
  function done(name: string, pct: number) {
    st.sets![name] = Math.max(st.sets![name] || 0, pct); best = { ...st.sets }; save();
    if (sets.every(s => (st.sets![s.name] || 0) >= PASS_SET) && !st.steps.practice) {
      completeStep(lv, u, "practice");
      say("Luyện tập xong hết rồi! Qua làm <b>bài kiểm tra</b> nha, chị tin em :3", "happy");
    }
  }
</script>

<div class="card"><h2>Luyện tập</h2><p class="muted">Làm hết các bộ bài tập (mỗi bộ ≥ {PASS_SET}% là đạt). Câu sai sẽ tự động được đưa vào Ôn tập nhiều hơn.</p>
  <div class="grid g3">
    {#each sets as s, i}
      <div class="charbox" style="text-align:left"><b>{s.name}</b>
        {#if best[s.name]}<span style="color:var({best[s.name] >= PASS_SET ? '--ok' : '--bad'})">{best[s.name] >= PASS_SET ? "✓" : ""} {best[s.name]}%</span>{/if}
        <div class="muted">{s.desc}</div>
        <button class="btn small" data-set={i} style="margin-top:8px" onclick={() => start(i)}>Làm bài</button>
      </div>
    {/each}
  </div>
</div>
{#if cur}
  {@const c = cur}
  <div class="card" id="pBody">
    {#key c.run}
      <Quiz questions={c.qs} title={sets[c.i].name} pass={PASS_SET} onDone={(_s, _t, pct) => done(sets[c.i].name, pct)}
        onRestart={() => start(c.i)} focus onClose={() => (cur = null)} nextLabel="Về danh sách bài tập" onNext={() => { cur = null; scrollTo({ top: 0 }); }} />
    {/key}
  </div>
{/if}
