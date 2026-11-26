<script lang="ts">
  import Py from "../components/Py.svelte";
  import Quiz from "../components/quiz/Quiz.svelte";
  import { playAll, playSentence } from "../lib/audio";
  import { pyHidden, storyOpen } from "../lib/curriculum";
  import { STORIES } from "../lib/data";
  import { addXP } from "../lib/progress";
  import type { ChoiceQ } from "../lib/questions";
  import { go } from "../lib/router.svelte";
  import { S, save } from "../lib/state.svelte";
  import { toast } from "../lib/ui.svelte";
  import { shuffle } from "../lib/util";
  let { id }: { id: number } = $props();
  const st = STORIES.find(x => x.id === id);
  const ok = !!st && storyOpen(st);
  if (!ok) { toast("Truyện này chưa mở"); go("#/road"); }
  let showVi = $state(false), run = $state(0);
  const qs = (): ChoiceQ[] => st!.qs.map(q => ({ type: "choice", prompt: "Đọc hiểu", main: [{ k: "text", v: q.q, big: true }],
    opts: shuffle(q.o.map((o, i) => ({ rich: [{ k: "text" as const, v: o }], ok: i === q.a }))) }));
  let questions = $state<ChoiceQ[]>([]);
  function start() { questions = qs(); run++; }
  function onDone(_s: number, _t: number, pct: number) { if (pct >= 67 && !S.stories[id]) { S.stories[id] = pct; addXP(30); } save(); }
</script>

{#if st && ok}
<section>
  <div class="card"><div class="muted">Truyện đọc thêm · HSK {st.lv}</div><h2 style="margin:2px 0">{st.title}</h2>
    <p class="muted">Đọc chữ Hán trước, chỗ nào không chắc thì bấm vào pinyin mờ để xem. Bấm 🔊 để nghe từng câu. Đọc xong trả lời 3 câu hỏi.</p>
    <div class="row"><button class="btn ghost small" onclick={() => playAll(st.lines, playSentence, 500)}>🔊 Nghe cả truyện</button><label class="row"><input type="checkbox" bind:checked={showVi}> Hiện nghĩa tiếng Việt</label></div>
  </div>
  <div class="card">
    {#each st.lines as s}
      <div class="ex"><div class="row" style="align-items:flex-start"><button class="iconbtn" onclick={() => playSentence(s)}>🔊</button>
        <div style="flex:1"><div class="zh hz" style="font-size:24px">{s.zh}</div><div><Py py={s.py} fade={pyHidden(st.lv)} /></div>{#if showVi}<div class="vi">{s.vi}</div>{/if}</div></div></div>
    {/each}
  </div>
  <div class="card">
    {#if !run}<button class="btn" id="stQ" onclick={start}>Trả lời câu hỏi →</button>
    {:else}{#key run}<Quiz {questions} title={st.title} pass={67} {onDone} onRestart={start} nextLabel="Về lộ trình" onNext={() => go("#/road")} />{/key}{/if}
  </div>
</section>
{/if}
