<!-- Ngữ pháp: giải thích (HTML soạn sẵn trong content/), ví dụ có audio, kiểm tra nhanh 3 câu mỗi điểm. -->
<script lang="ts">
  import Quiz from "../../components/quiz/Quiz.svelte";
  import SentenceRow from "../../components/SentenceRow.svelte";
  import { pyHidden, type StepKey } from "../../lib/curriculum";
  import { wordsUpTo } from "../../lib/data";
  import { orderable, qFill, qOrder, type Question } from "../../lib/questions";
  import type { Grammar, Lesson } from "../../lib/types";
  import { shuffle } from "../../lib/util";
  import NextStep from "./NextStep.svelte";
  let { lv, u, L, goStep }: { lv: number; u: number; L: Lesson; goStep: (k: StepKey) => void } = $props();
  let quizzes = $state<Record<number, Question[]>>({});
  function quick(g: Grammar): Question[] {
    const pool = wordsUpTo(lv, u);
    const qs: Question[] = shuffle(g.ex.filter(s => s.k.length)).slice(0, 2).map(s => qFill(s, s.k[0], pool));
    const o = shuffle(g.ex.filter(orderable))[0]; if (o) qs.push(qOrder(o));
    return qs;
  }
</script>

<div class="card"><h2>Ngữ pháp ({L.grammar.length} điểm)</h2><p class="muted">Đọc giải thích → nghe ví dụ và đọc to theo → làm 2–3 câu kiểm tra nhanh ở cuối mỗi điểm.</p></div>
{#each L.grammar as g, i}
  <div class="card">
    <h3 style="margin-top:0">{i + 1}. {g.title}</h3>
    <div class="formula hz">{g.formula}</div>
    <div>{@html g.explain}</div>
    <h3>Ví dụ</h3>
    {#each g.ex as s}<SentenceRow {s} fade={pyHidden(lv)} />{/each}
    <div class="warn">⚠️ {g.note}</div>
    {#if quizzes[i]}<Quiz questions={quizzes[i]} title="Kiểm tra nhanh" />
    {:else}<button class="btn ghost small" onclick={() => (quizzes[i] = quick(g))}>✏️ Kiểm tra nhanh</button>{/if}
  </div>
{/each}
<div class="card">{#if L.tip}<div class="tip">🏮 {L.tip}</div>{/if}<NextStep {lv} {u} k="grammar" {goStep} /></div>
