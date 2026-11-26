<!--
  Bộ chạy bài tập dùng chung cho mọi nơi (luyện nhanh, luyện tập, kiểm tra, ôn tập, phát âm).
  - Ghi điểm từng câu, cộng XP, cập nhật lịch ôn (câu có `item`).
  - Hết bài: hiện điểm, đạt/chưa đạt theo `pass`, danh sách câu sai.
  Muốn "Làm lại" ra bộ câu mới: truyền onRestart và bọc <Quiz> trong {#key}.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { stopAudio } from "../../lib/audio";
  import { logAnswer } from "../../lib/progress";
  import type { Question, Rich } from "../../lib/questions";
  import { answer as srsAnswer } from "../../lib/srs";
  import { save } from "../../lib/state.svelte";
  import RichView from "../RichView.svelte";
  import { active, newQuizId } from "./active";
  import ChoiceView from "./ChoiceView.svelte";
  import OrderView from "./OrderView.svelte";
  import SpeakView from "./SpeakView.svelte";
  import WriteView from "./WriteView.svelte";

  interface Props {
    questions: Question[]; title?: string; pass?: number;
    onDone?: (score: number, total: number, pct: number, ok: boolean) => void;
    onAnswer?: (q: Question, ok: boolean) => void;
    onRestart?: () => void; nextLabel?: string; onNext?: () => void;
  }
  let { questions, title = "", pass = 0, onDone, onAnswer, onRestart, nextLabel = "Tiếp →", onNext }: Props = $props();

  let qs = $state(questions);
  let i = $state(0);
  let results = $state<(boolean | undefined)[]>([]);
  let wrongs = $state<Rich[]>([]);
  let answered = $state(false);
  let finished = $state(false);
  let root: HTMLDivElement;
  let view: { choose?: (k: number) => void; replay?: () => void } | undefined = $state();
  let myId = newQuizId();

  const score = $derived(results.filter(Boolean).length);
  const pct = $derived(qs.length ? Math.round((score / qs.length) * 100) : 0);

  function onAnswered(ok: boolean, review?: Rich) {
    if (answered) return;
    answered = true; results[i] = ok;
    if (!ok && review) wrongs.push(review);
    const q = qs[i];
    if (q.type === "choice" && q.item) srsAnswer(q.item, ok);
    logAnswer(ok);
    onAnswer?.(q, ok);
    save();
  }
  function next() {
    if (!answered) return;
    if (i + 1 >= qs.length) { finished = true; stopAudio(); onDone?.(score, qs.length, pct, pct >= pass); return; }
    i++; answered = false;
  }
  function restart() {
    if (onRestart) return onRestart();
    i = 0; results = []; wrongs = []; answered = false; finished = false; myId = newQuizId();
  }
  function onKey(e: KeyboardEvent) {
    if (active.id !== myId || finished || !root?.isConnected) return;
    const tag = (e.target as HTMLElement).tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (/^[1-4]$/.test(e.key)) view?.choose?.(+e.key - 1);
    else if (e.key === "Enter" && answered) { e.preventDefault(); next(); }
    else if (e.code === "Space" && view?.replay) { e.preventDefault(); view.replay(); }
  }
  onMount(() => {
    const r = root.getBoundingClientRect();
    if (r.top < 0 || r.top > innerHeight * 0.5) root.scrollIntoView({ behavior: "smooth", block: "start" });
  });
</script>

<svelte:window onkeydown={onKey} />
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="qbox quiz" bind:this={root} onpointerdown={() => (active.id = myId)}>
  {#if !qs.length}
    <p class="muted">Không có câu hỏi cho phần này.</p>
  {:else if !finished}
    <div class="scorebar">{#each qs as _, k}<span class:ok={results[k] === true} class:bad={results[k] === false} class:cur={k === i && results[k] === undefined}></span>{/each}</div>
    <div class="qtitle">{title} · Câu {i + 1}/{qs.length} · {qs[i].prompt}</div>
    {#key i}
      {@const q = qs[i]}
      {#if q.type === "choice"}<ChoiceView {q} {onAnswered} bind:this={view} />
      {:else if q.type === "order"}<OrderView {q} {onAnswered} />
      {:else if q.type === "write"}<WriteView {q} {onAnswered} />
      {:else}<SpeakView {q} {onAnswered} />{/if}
    {/key}
    {#if answered}<button class="btn" id="qNext" style="margin-top:10px" onclick={next}>{i + 1 >= qs.length ? "Xem kết quả" : "Câu tiếp →"}</button>{/if}
  {:else}
    <div style="font-size:48px">{pct >= pass ? "🎉" : "💪"}</div>
    <h2>{title || "Kết quả"}: {score}/{qs.length} ({pct}%)</h2>
    {#if pass}
      <p>{#if pct >= pass}<b style="color:var(--ok)">ĐẠT</b> (cần ≥ {pass}%){:else}<b style="color:var(--bad)">CHƯA ĐẠT</b>, cần ≥ {pass}%. Ôn lại phần sai rồi làm lại nha.{/if}</p>
    {/if}
    {#if wrongs.length}
      <div class="card" style="text-align:left"><h3>Câu sai, xem lại nè</h3>{#each wrongs as w}<div class="ex"><RichView rich={w} /></div>{/each}</div>
    {/if}
    <div class="row" style="justify-content:center">
      <button class="btn" id="qAgain" onclick={restart}>↻ Làm lại</button>
      {#if onNext}<button class="btn ghost" id="qNextStep" onclick={onNext}>{nextLabel}</button>{/if}
    </div>
  {/if}
</div>
