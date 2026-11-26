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
  import Icon from "../../components/Icon.svelte";

  let { lv, u, step }: { lv: number; u: number; step?: string } = $props();
  const open = unitOpen(lv, u);
  const steps = stepsOf(lv, u);
  const L = lessonOf(lv, u);
  const cur: StepKey = (steps as string[]).includes(step ?? "") ? (step as StepKey) : firstOpenStep(lv, u);
  const st = $derived(peekUnit(lv, u));
  if (open) { S.lastUnit = { lv, u }; save(); }
  else { toast("Bài này chưa mở khóa"); go("#/road"); }
  const goStep = (k: StepKey) => go({ name: "lesson", lv, u, step: k });
  let bar: HTMLDivElement | undefined = $state();
  $effect(() => { bar?.querySelector<HTMLElement>(".step.on")?.scrollIntoView({ inline: "center", block: "nearest" }); });
</script>

{#if open}
<section>
  <div class="lhead">
    <button class="iconbtn" aria-label="Bài trước" title="Bài trước" disabled={u <= 1} onclick={() => go({ name: "lesson", lv, u: u - 1 })}><Icon name="left" /></button>
    <div class="lt">
      <div class="muted">HSK {lv} · Bài {u}/{unitCount(lv)}</div>
      <h2>{unitTitle(lv, u)}</h2>
    </div>
    <button class="iconbtn" aria-label="Bài sau" title="Bài sau" disabled={u >= unitCount(lv) || !unitOpen(lv, u + 1)} onclick={() => go({ name: "lesson", lv, u: u + 1 })}><Icon name="right" /></button>
  </div>
  {#if L}
    <details class="goals" open={!st || !Object.values(st.steps).some(Boolean)}>
      <summary><b>🎯 Học xong bài này em sẽ…</b> <span class="muted">{L.topic}</span></summary>
      <ul>{#each L.goals as g}<li>{g}</li>{/each}</ul>
    </details>
  {/if}
  <div class="steps" role="tablist" bind:this={bar}>
    {#each steps as k, i}
      <button class="step" role="tab" aria-selected={cur === k} class:on={cur === k} class:ok={st?.steps[k]} onclick={() => goStep(k)}>
        <span class="num">{st?.steps[k] && cur !== k ? "✓" : i + 1}</span>{STEP_NAMES[k]}
      </button>
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

<style>
  .lhead{display:flex;align-items:center;gap:10px;margin:4px 0 10px}
  .lt{flex:1;min-width:0;text-align:center}
  .lt h2{margin:0;font-size:20px;line-height:1.25}
  .lhead .iconbtn:disabled{opacity:.35;cursor:default}
  .goals{background:var(--blue-soft);border-radius:14px;padding:10px 14px;margin-bottom:12px;font-size:14px}
  .goals summary{cursor:pointer;list-style:none;display:flex;gap:6px;flex-wrap:wrap;align-items:baseline}
  .goals summary::-webkit-details-marker{display:none}
  .goals summary::after{content:"▾";margin-left:auto;color:var(--muted)}
  .goals[open] summary::after{content:"▴"}
  .goals ul{margin:6px 0 0;padding-left:20px}
  .steps{display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -14px 12px;padding:2px 14px 4px;scroll-snap-type:x proximity;
    position:sticky;top:57px;z-index:30;background:var(--bg)}
  .steps::-webkit-scrollbar{display:none}
  .step{flex:none;display:flex;align-items:center;gap:6px;scroll-snap-align:center;white-space:nowrap;border-radius:99px;padding:6px 14px 6px 6px}
  .num{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--bg);border:1.5px solid var(--border);font-size:13px}
  .step.on .num{background:#fff;color:var(--red);border-color:#fff}
  .step.ok:not(.on) .num{background:var(--ok);color:#fff;border-color:var(--ok)}
  @media (min-width:900px){ .steps{margin:0 0 12px;padding:2px 0 4px;top:65px} }
</style>
