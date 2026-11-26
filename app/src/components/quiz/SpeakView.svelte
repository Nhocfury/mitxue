<!--
  Câu hỏi "đọc to": nghe mẫu → em đọc → máy chấm từng âm tiết (PronCheck).
  Đạt: từ 1–2 chữ phải đúng hết; từ dài hơn ≥ 80%. Máy có thể nghe nhầm nên luôn có nút "tự chấm".
  Không có micro / bộ chấm lỗi / từ không có pinyin từng chữ → quay về cách cũ: ghi âm, nghe lại, tự chấm.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { playWord } from "../../lib/audio";
  import { gloss } from "../../lib/data";
  import type { PronResult } from "../../lib/pronscore";
  import type { Rich, SpeakQ } from "../../lib/questions";
  import { S } from "../../lib/state.svelte";
  import Py from "../Py.svelte";
  import PronCheck from "../PronCheck.svelte";
  let { q, onAnswered }: { q: SpeakQ; onAnswered: (ok: boolean, review?: Rich) => void } = $props();
  const w = q.w;
  const auto = !!w.sy?.length;
  let manual = $state(!auto);                    // true = tự chấm (cách cũ)
  let last = $state<PronResult | null>(null);
  let judged = $state<null | boolean>(null);
  const need = (r: PronResult) => (r.scored <= 2 ? r.score === 100 : r.score >= 80);

  // --- cách cũ (tự chấm) ---
  let url = $state<string | null>(null), recording = $state(false), canJudge = $state(false);
  let note = $state("Đọc to theo mẫu. Nghe lại giọng mình rồi tự chấm thật lòng nha, chú ý thanh điệu.");
  async function recOld() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream); const chunks: Blob[] = [];
      r.ondataavailable = e => chunks.push(e.data);
      r.onstop = () => { stream.getTracks().forEach(t => t.stop()); url = URL.createObjectURL(new Blob(chunks)); recording = false; canJudge = true; new Audio(url).play(); };
      r.start(); recording = true; setTimeout(() => r.state !== "inactive" && r.stop(), 3000);
    } catch { note = "Không mở được micro. Em đọc to rồi tự chấm nha."; canJudge = true; }
  }

  onMount(() => { const h = setTimeout(() => playWord(w.c), 200); return () => clearTimeout(h); });
  function judge(ok: boolean) {
    if (judged !== null) return; judged = ok; if (manual) S.speakCount++;
    onAnswered(ok, [{ k: "hz", v: w.c }, { k: "text", v: " " }, { k: "py", v: w.py }, { k: "muted", v: " (đọc lại theo mẫu)" }]);
  }
</script>

<div class="hz qmain">{w.c}</div>
<div style="font-size:22px"><Py py={w.py} /></div>
<div class="muted">{gloss(w)}</div>

{#if !manual}
  <div class="center">
    <PronCheck zh={w.c} sy={w.sy!} play={() => playWord(w.c)} onResult={r => (last = r)} onError={() => (manual = true)} />
  </div>
  {#if judged === null && !(last && need(last))}
    <div class="center"><button class="linkbtn" id="spManual" onclick={() => (manual = true)}>Micro có vấn đề? Chuyển sang tự chấm</button></div>
  {/if}
  {#if last && judged === null}
    <div class="row" style="justify-content:center;margin-top:10px">
      {#if need(last)}
        <button class="btn" id="spOk" onclick={() => judge(true)}>✔ Đạt, câu tiếp</button>
      {:else}
        <button class="btn ghost small" id="spBad" onclick={() => judge(false)}>Bỏ qua (tính chưa đạt)</button>
        <button class="btn ghost small" id="spSelf" onclick={() => judge(true)} title="Máy có thể nghe nhầm">Máy nghe nhầm, chị tính đúng giùm</button>
      {/if}
    </div>
  {/if}
{:else}
  <div class="row" style="justify-content:center;margin-top:10px">
    <button class="btn ghost" id="spModel" onclick={() => playWord(w.c)}>🔊 Nghe mẫu</button>
    <button class="btn" id="spRec" disabled={recording || judged !== null} onclick={recOld}>{recording ? "🔴 Đang ghi…" : url ? "🎙️ Ghi lại" : "🎙️ Ghi âm 3 giây"}</button>
    <button class="btn ghost" id="spMine" disabled={!url} onclick={() => url && new Audio(url).play()}>▶ Nghe lại giọng em</button>
  </div>
  <div class="muted" style="margin-top:6px">{note}</div>
  {#if canJudge && judged === null}
    <div class="row" style="justify-content:center;margin-top:10px">
      <button class="btn small" id="spOk" onclick={() => judge(true)}>✔ Giống mẫu, đúng thanh</button>
      <button class="btn ghost small" id="spBad" onclick={() => judge(false)}>✘ Chưa giống</button>
    </div>
  {/if}
{/if}
<div class="fb" id="qFb">{#if judged !== null}<span style="color:var({judged ? '--ok' : '--bad'})">{judged ? "✔ Tốt lắm!" : "Nghe mẫu thêm vài lần, nhái theo cả thanh điệu nha."}</span>{/if}</div>

<style>.center{display:flex;flex-direction:column;align-items:center}
  .linkbtn{background:none;border:none;color:var(--muted);text-decoration:underline;font-size:12px;cursor:pointer;margin-top:6px}</style>
