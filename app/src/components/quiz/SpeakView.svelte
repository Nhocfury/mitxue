<!-- Câu nói: nghe mẫu → ghi âm 3 giây → nghe lại → tự chấm (app chưa chấm tự động câu này). -->
<script lang="ts">
  import { onMount } from "svelte";
  import { playWord } from "../../lib/audio";
  import { gloss } from "../../lib/data";
  import type { Rich, SpeakQ } from "../../lib/questions";
  import { S } from "../../lib/state.svelte";
  import Py from "../Py.svelte";
  let { q, onAnswered }: { q: SpeakQ; onAnswered: (ok: boolean, review?: Rich) => void } = $props();
  const w = q.w;
  let url = $state<string | null>(null);
  let recording = $state(false), canJudge = $state(false), judged = $state<null | boolean>(null);
  let note = $state("Đọc to theo mẫu. Nghe lại giọng mình rồi tự chấm thật lòng nha, chú ý thanh điệu.");
  onMount(() => { const h = setTimeout(() => playWord(w.c), 200); return () => clearTimeout(h); });
  async function rec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream); const chunks: Blob[] = [];
      r.ondataavailable = e => chunks.push(e.data);
      r.onstop = () => { stream.getTracks().forEach(t => t.stop()); url = URL.createObjectURL(new Blob(chunks)); recording = false; canJudge = true; new Audio(url).play(); };
      r.start(); recording = true; setTimeout(() => r.state !== "inactive" && r.stop(), 3000);
    } catch { note = "Không mở được micro. Em đọc to rồi tự chấm nha."; canJudge = true; }
  }
  function judge(ok: boolean) {
    if (judged !== null) return; judged = ok; S.speakCount++;
    onAnswered(ok, [{ k: "hz", v: w.c }, { k: "text", v: " " }, { k: "py", v: w.py }, { k: "muted", v: " (đọc lại theo mẫu)" }]);
  }
</script>

<div class="hz qmain">{w.c}</div>
<div style="font-size:22px"><Py py={w.py} /></div>
<div class="muted">{gloss(w)}</div>
<div class="row" style="justify-content:center;margin-top:10px">
  <button class="btn ghost" id="spModel" onclick={() => playWord(w.c)}>🔊 Nghe mẫu</button>
  <button class="btn" id="spRec" disabled={recording || judged !== null} onclick={rec}>{recording ? "🔴 Đang ghi…" : url ? "🎙️ Ghi lại" : "🎙️ Ghi âm 3 giây"}</button>
  <button class="btn ghost" id="spMine" disabled={!url} onclick={() => url && new Audio(url).play()}>▶ Nghe lại giọng em</button>
</div>
<div class="muted" style="margin-top:6px">{note}</div>
{#if canJudge && judged === null}
  <div class="row" style="justify-content:center;margin-top:10px">
    <button class="btn small" id="spOk" onclick={() => judge(true)}>✔ Giống mẫu, đúng thanh</button>
    <button class="btn ghost small" id="spBad" onclick={() => judge(false)}>✘ Chưa giống</button>
  </div>
{/if}
<div class="fb" id="qFb">{#if judged !== null}<span style="color:var({judged ? '--ok' : '--bad'})">{judged ? "✔ Tốt lắm!" : "Nghe mẫu thêm vài lần, nhái theo cả thanh điệu nha."}</span>{/if}</div>
