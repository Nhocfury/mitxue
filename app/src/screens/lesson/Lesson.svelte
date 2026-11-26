<!-- Một bài học: tiêu đề, mục tiêu, thanh các bước, nội dung bước hiện tại. Bước nằm trên địa chỉ (#/lesson/lv/u/bước). -->
<script lang="ts">
  import { firstOpenStep, peekUnit, STEP_NAMES, stepsOf, unitOpen, type StepKey } from "../../lib/curriculum";
  import { lessonOf, unitCount, unitTitle } from "../../lib/data";
  import { go } from "../../lib/router.svelte";
  import { S, save } from "../../lib/state.svelte";
  import { toast } from "../../lib/ui.svelte";
  import Chars from "./Chars.svelte";
  import Dialogue from "./Dialogue.svelte";
  import Grammar from "./Grammar.svelte";
  import Practice from "./Practice.svelte";
  import UnitTest from "./UnitTest.svelte";
  import Vocab from "./Vocab.svelte";

  let { lv, u, step }: { lv: number; u: number; step?: string } = $props();
  const open = unitOpen(lv, u);
  const steps = stepsOf(lv);
  const L = lessonOf(lv, u);
  const cur: StepKey = (steps as string[]).includes(step ?? "") ? (step as StepKey) : firstOpenStep(lv, u);
  const st = $derived(peekUnit(lv, u));
  if (open) { S.lastUnit = { lv, u }; save(); }
  else { toast("Bài này chưa mở khóa"); go("#/road"); }
  const goStep = (k: StepKey) => go({ name: "lesson", lv, u, step: k });
</script>

{#if open}
<section>
  <div class="card">
    <div class="row between">
      <div>
        <div class="muted">HSK {lv} · Bài {u}/{unitCount(lv)}</div>
        <h2 style="margin:2px 0">{unitTitle(lv, u)}</h2>
        {#if L}<div class="muted">{L.topic}</div>{/if}
      </div>
      <div class="row">
        <button class="btn ghost small" disabled={u <= 1} onclick={() => go({ name: "lesson", lv, u: u - 1 })}>← Bài trước</button>
        <button class="btn ghost small" disabled={u >= unitCount(lv) || !unitOpen(lv, u + 1)} onclick={() => go({ name: "lesson", lv, u: u + 1 })}>Bài sau →</button>
      </div>
    </div>
    {#if L}<div class="info"><b>Học xong bài này em sẽ:</b><ul style="margin:4px 0">{#each L.goals as g}<li>{g}</li>{/each}</ul></div>{/if}
  </div>
  <div class="steps">
    {#each steps as k, i}
      <button class="step" class:on={cur === k} class:ok={st?.steps[k]} onclick={() => goStep(k)}>{st?.steps[k] ? "✓ " : ""}{"①②③④⑤⑥"[i]} {STEP_NAMES[k]}</button>
    {/each}
  </div>
  <div id="stepBody">
    {#if cur === "vocab"}<Vocab {lv} {u} {goStep} />
    {:else if cur === "chars"}<Chars {lv} {u} {goStep} />
    {:else if cur === "grammar" && L}<Grammar {lv} {u} {L} {goStep} />
    {:else if cur === "dialogue" && L}<Dialogue {lv} {L} {goStep} />
    {:else if cur === "practice"}<Practice {lv} {u} />
    {:else}<UnitTest {lv} {u} />{/if}
  </div>
</section>
{/if}
