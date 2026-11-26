<!-- Từ mới theo phần ~8 từ: xem thẻ → luyện nhanh ≥70% → vào lịch ôn → phần sau. Có chặn khi đủ chỉ tiêu ngày. -->
<script lang="ts">
  import Flashcards from "../../components/Flashcards.svelte";
  import Quiz from "../../components/quiz/Quiz.svelte";
  import WordCard from "../../components/WordCard.svelte";
  import { playAll, playWord } from "../../lib/audio";
  import { addNew, newGate, newToday, PASS_CHUNK, unitProg, vocabChunks, type StepKey } from "../../lib/curriculum";
  import { hasLesson, wordsOf, wordsUpTo } from "../../lib/data";
  import { qHanzi, qListen, qMeaning, wordQs } from "../../lib/questions";
  import { go } from "../../lib/router.svelte";
  import { intro } from "../../lib/srs";
  import { S, save } from "../../lib/state.svelte";
  import { openModal } from "../../lib/ui.svelte";
  import { todayStr } from "../../lib/util";
  import { completeStep } from "./complete";
  import NextStep from "./NextStep.svelte";

  let { lv, u, goStep }: { lv: number; u: number; goStep: (k: StepKey) => void } = $props();
  const st = unitProg(lv, u);
  const chunks = vocabChunks(lv, u);
  const N = chunks.length;
  if (st.steps.vocab) st.vc = N;
  let vc = $state(st.vc ?? 0);
  let gate = $state(newGate());
  let quizRun = $state(0);           // 0 = chưa bắt đầu luyện
  const ch = $derived(chunks[Math.min(vc, N - 1)]);
  const qs = $derived(quizRun ? wordQs(ch, wordsUpTo(lv, u), ch.length, [qMeaning, qListen, qHanzi]) : []);
  let passed = $state(false);

  function onDone(_s: number, _t: number, _p: number, ok: boolean) {
    if (!ok) return;
    ch.forEach(w => intro(w.key)); addNew(ch.length);
    st.vc = vc + 1; passed = true; save();
    if (st.vc >= N) completeStep(lv, u, "vocab");
  }
  function nextChunk() {
    if (!passed) { quizRun++; return; }
    if ((st.vc ?? 0) >= N) { goStep("chars"); return; }
    vc = st.vc ?? 0; passed = false; quizRun = 0; gate = newGate(); scrollTo({ top: 0 });
  }
</script>

<div class="card">
  {#if vc >= N}
    <div class="row between"><h2>Từ mới ({wordsOf(lv, u).length} từ) ✓</h2><div class="row" style="gap:6px">{#each chunks as _}<span class="dot ok"></span>{/each}</div></div>
    <p class="muted">Đã học hết từ của bài. Bấm thẻ để nghe lại.</p>
    <div class="grid g3">{#each wordsOf(lv, u) as w (w.key)}<WordCard {w} />{/each}</div>
    <NextStep {lv} {u} k="vocab" {goStep} label="Học tiếp →" />
  {:else}
    <div class="row between"><h2>Từ mới · phần {vc + 1}/{N}{gate ? "" : ` (${ch.length} từ)`}</h2>
      <div class="row" style="gap:6px">{#each chunks as _, i}<span class="dot" class:ok={i < vc} class:cur={i === vc}></span>{/each}</div></div>
    {#if gate}
      <div class="warn">{@html gate.html}</div>
      <div class="row" style="margin-top:10px">
        <button class="btn" onclick={() => go("#/review")}>🔁 Ôn tập</button>
        {#if hasLesson(lv)}<button class="btn ghost" onclick={() => goStep("grammar")}>📐 Học ngữ pháp</button>{/if}
        <button class="btn ghost small" id="gateOff" onclick={() => { S.gateOff = todayStr(); save(); gate = null; }}>Vẫn học tiếp hôm nay</button>
      </div>
    {:else}
      <p class="muted">① Bấm từng thẻ nghe 2–3 lần, đọc to theo. ② Nhìn âm Hán Việt để đoán nghĩa. ③ Làm luyện nhanh {ch.length} câu, đạt ≥ {PASS_CHUNK}% là qua phần này. Hôm nay đã học {newToday()}/{S.settings.newPerDay} từ mới.</p>
      <div class="row">
        <button class="btn ghost small" onclick={() => playAll(ch, w => playWord(w.c), 400)}>🔊 Nghe cả phần</button>
        <button class="btn ghost small" onclick={() => openModal(Flashcards, { words: ch })}>🃏 Học bằng thẻ</button>
      </div>
      <div class="grid g3" style="margin-top:10px">{#each ch as w (w.key)}<WordCard {w} />{/each}</div>
      {#if !quizRun}<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" id="vQuiz" onclick={() => quizRun++}>Luyện nhanh phần này →</button></div>{/if}
    {/if}
  {/if}
</div>
{#if quizRun && vc < N && !gate}
  <div class="card" id="vqBox">
    {#key quizRun}
      <Quiz questions={qs} title="Luyện nhanh phần {vc + 1}" pass={PASS_CHUNK} {onDone} onRestart={() => { passed = false; quizRun++; }}
        nextLabel={passed ? ((st.vc ?? 0) >= N ? "Qua bước Chữ Hán →" : "Phần tiếp →") : "Làm lại"} onNext={nextChunk} />
    {/key}
  </div>
{/if}
