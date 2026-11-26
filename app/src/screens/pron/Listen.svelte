<!-- Luyện nghe không giới hạn: đoán thanh / phân biệt âm / trộn. Ưu tiên âm hay sai. Có combo. -->
<script lang="ts">
  import ChoiceView from "../../components/quiz/ChoiceView.svelte";
  import { active, newQuizId } from "../../components/quiz/active";
  import { initialOf, INIT_TIP, recordSyl, soundQ, toneQ, type PronQ } from "../../lib/pron";
  import { addXP } from "../../lib/progress";
  import { S, day, markActive, save } from "../../lib/state.svelte";
  import { say } from "../../lib/ui.svelte";
  let mode = $state<"tone" | "sound" | "mix">("tone");
  let q = $state<PronQ>(toneQ()), n = $state(0), answered = $state(false), combo = $state(0), tip = $state("");
  let view: { choose?: (k: number) => void; replay?: () => void } | undefined = $state();
  const myId = newQuizId();
  function make() { const m = mode === "mix" ? (Math.random() < 0.5 ? "tone" : "sound") : mode; return m === "tone" ? toneQ() : soundQ(); }
  function next() { q = make(); n++; answered = false; tip = ""; }
  function onAnswered(ok: boolean) {
    answered = true; recordSyl(q.syl, ok);
    const d = day(); d.q++; markActive();
    if (ok) { d.ok++; S.correct++; combo++; if (combo > S.bestCombo) S.bestCombo = combo; addXP(10 + Math.min(combo, 10)); if (combo % 5 === 0) say(`Combo <b>${combo}</b> 🔥 tai em xịn thiệt chứ hông phải đùa.`, "happy"); }
    else { combo = 0; addXP(2); if (q.syl.mode === "sound") tip = INIT_TIP[initialOf(q.syl.s)] || ""; }
    save();
  }
  function onKey(e: KeyboardEvent) {
    if (active.id !== myId) return;
    if (/^[1-4]$/.test(e.key)) view?.choose?.(+e.key - 1);
    else if (e.key === "Enter" && answered) next();
    else if (e.code === "Space") { e.preventDefault(); view?.replay?.(); }
  }
</script>

<svelte:window onkeydown={onKey} />
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="card" onpointerdown={() => (active.id = myId)}>
  <div class="row" style="justify-content:space-between">
    <div class="seg">
      {#each [["tone", "Đoán thanh"], ["sound", "Phân biệt âm"], ["mix", "Trộn"]] as [k, l]}<button class:on={mode === k} onclick={() => { mode = k as typeof mode; next(); }}>{l}</button>{/each}
    </div>
    <div class="muted">Phím tắt: <span class="kbd">Space</span> nghe lại · <span class="kbd">1</span>–<span class="kbd">4</span> chọn · <span class="kbd">Enter</span> câu tiếp</div>
  </div>
  <div class="qbox quiz">
    <div class="qtitle">{q.prompt}</div>
    {#key n}<ChoiceView {q} {onAnswered} bind:this={view} />{/key}
    {#if tip}<div class="muted">{tip}</div>{/if}
    <div class="combo">{combo >= 2 ? `Combo x${combo}` : ""}</div>
    {#if answered}<button class="btn" id="qNext" style="margin-top:10px" onclick={next}>Câu tiếp →</button>{/if}
  </div>
</div>
