<!--
  Bộ chạy bài tập dùng chung cho mọi nơi (luyện nhanh, luyện tập, kiểm tra, ôn tập, phát âm).
  - Ghi điểm từng câu, cộng XP, cập nhật lịch ôn (câu có `item`).
  - Hết bài: hiện điểm, đạt/chưa đạt theo `pass`, danh sách câu sai.
  Muốn "Làm lại" ra bộ câu mới: truyền onRestart và bọc <Quiz> trong {#key}.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { stopAudio } from "../../lib/audio";
  import { addXP, logAnswer } from "../../lib/progress";
  import type { Question, Rich } from "../../lib/questions";
  import { answer as srsAnswer } from "../../lib/srs";
  import { S, save } from "../../lib/state.svelte";
  import { starsOf } from "../../lib/motivation";
  import { sfx } from "../../lib/sfx";
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
  let combo = $state(0);                 // số câu đúng liên tiếp
  let xp0 = $state(S.xp);                // để tính XP kiếm được trong lượt này

  const score = $derived(results.filter(Boolean).length);
  const pct = $derived(qs.length ? Math.round((score / qs.length) * 100) : 0);
  // Có ngưỡng đạt thì sao theo ngưỡng; không có (luyện nhanh, ôn tập) thì lấy 60% làm mốc 1 sao.
  const stars = $derived(starsOf(pct, pass || 60));
  const COMBO_BONUS = [5, 10, 15, 20];   // mốc combo được thưởng thêm 5 XP

  function onAnswered(ok: boolean, review?: Rich) {
    if (answered) return;
    answered = true; results[i] = ok;
    if (!ok && review) wrongs.push(review);
    const q = qs[i];
    if (q.type === "choice" && q.item) srsAnswer(q.item, ok);
    logAnswer(ok);
    if (ok) {
      combo++; sfx.ok(combo);
      if (combo > S.bestCombo) S.bestCombo = combo;
      if (COMBO_BONUS.includes(combo)) addXP(5);
    } else { combo = 0; sfx.bad(); }
    onAnswer?.(q, ok);
    save();
  }
  function next() {
    if (!answered) return;
    if (i + 1 >= qs.length) { finished = true; stopAudio(); sfx.done(pct >= pass); onDone?.(score, qs.length, pct, pct >= pass); return; }
    i++; answered = false;
  }
  function restart() {
    if (onRestart) return onRestart();
    i = 0; results = []; wrongs = []; answered = false; finished = false; myId = newQuizId(); combo = 0; xp0 = S.xp;
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
    <div class="qtitle">{title} · Câu {i + 1}/{qs.length} · {qs[i].prompt}{#if combo >= 3}{#key combo}<span class="combo">🔥 {combo} liên tiếp</span>{/key}{/if}</div>
    {#key i}
      {@const q = qs[i]}
      {#if q.type === "choice"}<ChoiceView {q} {onAnswered} bind:this={view} />
      {:else if q.type === "order"}<OrderView {q} {onAnswered} />
      {:else if q.type === "write"}<WriteView {q} {onAnswered} />
      {:else}<SpeakView {q} {onAnswered} />{/if}
    {/key}
    {#if answered}<button class="btn" id="qNext" style="margin-top:10px" onclick={next}>{i + 1 >= qs.length ? "Xem kết quả" : "Câu tiếp →"}</button>{/if}
  {:else}
    <div class="stars" aria-label="{stars} sao">{#each [1, 2, 3] as k}<span class:on={k <= stars} style="animation-delay:{k * 0.18}s">★</span>{/each}</div>
    <h2>{title || "Kết quả"}: {score}/{qs.length} ({pct}%)</h2>
    <div class="row" style="justify-content:center;gap:8px"><span class="pill">+{S.xp - xp0} XP</span>{#if S.bestCombo >= 3}<span class="pill">🔥 Kỷ lục combo: {S.bestCombo}</span>{/if}</div>
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

<style>
  .combo{display:inline-block;margin-left:8px;background:var(--gold-soft);color:var(--gold);border-radius:99px;padding:1px 9px;font-weight:700;animation:bump .35s ease}
  .stars{font-size:46px;letter-spacing:6px;line-height:1.2}
  .stars span{color:var(--border);display:inline-block}
  .stars span.on{color:var(--gold);animation:star .5s cubic-bezier(.2,1.6,.4,1) both}
  .pill{background:var(--gold-soft);border-radius:99px;padding:3px 12px;font-weight:700;font-size:14px}
  @keyframes bump{0%{transform:scale(1.5)}100%{transform:scale(1)}}
  @keyframes star{from{transform:scale(0) rotate(-40deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
</style>
