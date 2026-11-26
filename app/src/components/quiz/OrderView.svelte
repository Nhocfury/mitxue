<script lang="ts">
  import { playSentence } from "../../lib/audio";
  import type { OrderQ, Rich } from "../../lib/questions";
  import { OK_LINES } from "../../lib/ui.svelte";
  import { pick, shuffle } from "../../lib/util";
  import Py from "../Py.svelte";
  import { isTestMode } from "../../lib/debug";
  let { q, onAnswered }: { q: OrderQ; onAnswered: (ok: boolean, review?: Rich) => void } = $props();
  const toks = shuffle(q.toks.map((t, k) => ({ t, k })));
  let chosen = $state<number[]>([]);
  let result = $state<null | boolean>(null);
  let warn = $state("");
  function check() {
    if (chosen.length < toks.length) { warn = "Chọn hết các từ đã nha."; return; }
    const ans = chosen.map(k => toks[k].t).join("");
    result = ans === q.toks.join("");
    playSentence(q.s);
    onAnswered(result, [{ k: "text", v: q.vi + " → " }, { k: "hz", v: q.s.zh }, { k: "muted", v: ` (em xếp: ${ans})` }]);
  }
</script>

<div class="qtext">{q.vi}</div>
<div class="answer-line hz" id="ansLine">{#each chosen as k}<span class="tok">{toks[k].t}</span>{/each}{chosen.length === toks.length ? q.end : ""}</div>
<div id="tokArea">
  {#each toks as x, k}<button class="tok hz" data-i={isTestMode() ? x.k : undefined} class:used={chosen.includes(k)} disabled={result !== null} onclick={() => { if (!chosen.includes(k)) chosen = [...chosen, k]; warn = ""; }}>{x.t}</button>{/each}
</div>
<div class="row" style="justify-content:center;margin-top:8px">
  <button class="btn ghost small" id="oUndo" disabled={result !== null} onclick={() => (chosen = chosen.slice(0, -1))}>↶ Xóa</button>
  <button class="btn small" id="oCheck" disabled={result !== null} onclick={check}>Kiểm tra</button>
</div>
<div class="fb" id="qFb">
  {#if warn}<span style="color:var(--bad)">{warn}</span>{/if}
  {#if result !== null}<span style="color:var({result ? '--ok' : '--bad'})">{result ? "✔ " + pick(OK_LINES) : "✘ Chưa đúng trật tự."}</span>{/if}
</div>
{#if result !== null}<div id="qReveal"><div class="hz" style="font-size:22px">{q.s.zh}</div><Py py={q.s.py} /></div>{/if}
