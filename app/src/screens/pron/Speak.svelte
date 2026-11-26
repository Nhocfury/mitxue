<!-- Luyện nói: thu 2 giây, đo cao độ giọng (lib/pron.ts › scoreTone), vẽ đường giọng em so với đường chuẩn. -->
<script lang="ts">
  import { onMount } from "svelte";
  import { playSyl } from "../../lib/audio";
  import { markSyl, plainShow } from "../../lib/pinyin";
  import { autoCorr, PSYL, randomCommon, scoreTone, template, TONE_HINT, type ToneScore } from "../../lib/pron";
  import { addXP } from "../../lib/progress";
  import { S, day, markActive, save } from "../../lib/state.svelte";
  import { toast } from "../../lib/ui.svelte";
  let input = $state("ma"), t = $state(1), recording = $state(false), mine = $state<string | null>(null);
  let result = $state<ToneScore | null>(null), unclear = $state(false);
  let canvas: HTMLCanvasElement;
  const syl = $derived(input.trim().toLowerCase().replace(/ü|v/g, "uu"));
  const valid = $derived(!!PSYL[syl]?.includes(t));

  function draw() {
    if (!canvas) return;
    const g = canvas.getContext("2d")!; const W = canvas.width, H = canvas.height; const css = getComputedStyle(document.documentElement);
    g.clearRect(0, 0, W, H); g.strokeStyle = css.getPropertyValue("--border"); g.lineWidth = 1; g.font = "22px Segoe UI"; g.fillStyle = css.getPropertyValue("--muted");
    for (let i = 1; i <= 5; i++) { const y = H - 30 - ((i - 1) * (H - 60)) / 4; g.beginPath(); g.moveTo(40, y); g.lineTo(W - 20, y); g.stroke(); g.fillText(String(i), 12, y + 7); }
    const N = 24, X = (i: number) => 40 + (i / (N - 1)) * (W - 60), Y = (v: number) => H - 30 - (v / 2.6 + 2) * ((H - 60) / 4);
    const tp = template(t, N), tm = tp.reduce((a, b) => a + b, 0) / N;
    g.setLineDash([12, 10]); g.lineWidth = 5; g.strokeStyle = css.getPropertyValue("--t" + t); g.beginPath(); tp.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke(); g.setLineDash([]);
    if (result) { g.lineWidth = 6; g.strokeStyle = css.getPropertyValue("--red"); g.beginPath(); result.contour.forEach((v, i) => { const y = Math.max(10, Math.min(H - 10, Y(v + tm))); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke(); }
    g.fillStyle = css.getPropertyValue("--muted"); g.fillText("- - - chuẩn     ━ giọng em", W - 330, 30);
  }
  onMount(draw);
  $effect(() => { void t; void result; void syl; draw(); });
  function setSyl(s: string, tt: number) { input = plainShow(s); t = tt; result = null; unclear = false; }

  async function rec() {
    if (recording) return; if (!valid) { toast("Chọn âm hợp lệ trước nha"); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } }); }
    catch { toast("Chưa có quyền micro, kiểm tra lại cài đặt trình duyệt nha"); return; }
    recording = true;
    const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 2048; ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize); const frames: number[] = []; const t0 = performance.now();
    const chunks: Blob[] = []; let mr: MediaRecorder | null = null;
    try { mr = new MediaRecorder(stream); mr.ondataavailable = e => chunks.push(e.data); mr.start(); } catch { /* không ghi được thì vẫn chấm */ }
    await new Promise<void>(res => { const loop = () => { an.getFloatTimeDomainData(buf); frames.push(autoCorr(buf, ctx.sampleRate)); if (performance.now() - t0 < 2000) requestAnimationFrame(loop); else res(); }; loop(); });
    if (mr) { mr.onstop = () => { if (mine) URL.revokeObjectURL(mine); mine = URL.createObjectURL(new Blob(chunks, { type: mr!.mimeType })); }; mr.stop(); }
    stream.getTracks().forEach(x => x.stop()); ctx.close(); recording = false;
    result = scoreTone(frames, t); unclear = !result;
    if (result) {
      S.speakCount++; if (result.score > S.speakBest) S.speakBest = result.score; day().q++; markActive(); save();
      addXP(result.score >= 80 ? 15 : result.score >= 60 ? 8 : 3);
    }
  }
</script>

<div class="card">
  <h2>Luyện nói thanh điệu</h2>
  <p class="muted">Nghe mẫu → bấm thu âm → đọc to 1 âm tiết. App vẽ đường cao độ giọng em (đỏ) so với hình dạng chuẩn (nét đứt) rồi chấm điểm.</p>
  <div class="tip">⚠️ Đây là chấm <b>gần đúng</b>, chỉ xét hình dạng thanh điệu, chưa chấm phụ âm/vần. Ngồi chỗ yên tĩnh, đọc rõ và hơi kéo dài một chút. Lần đầu trình duyệt sẽ hỏi quyền dùng micro.</div>
  <div class="row" style="margin:12px 0">
    <input class="text" bind:value={input} style="width:120px;font-size:16px" oninput={() => (result = null)}>
    <div class="seg">{#each [1, 2, 3, 4] as x}<button class:on={t === x} onclick={() => { t = x; result = null; }}>Thanh {x}</button>{/each}</div>
    <button class="btn ghost" onclick={() => { const r = randomCommon(); setSyl(r.s, r.t); playSyl(r.s, r.t); }}>🎲 Ngẫu nhiên</button>
  </div>
  <div class="row" style="margin-bottom:12px">
    <div class="qbig" style="font-size:40px;margin:0 12px 0 0">{#if PSYL[syl]}<span class="c{t}">{markSyl(syl, t)}</span>{:else}<span class="muted" style="font-size:18px">Không có âm "{input}"</span>{/if}</div>
    <button class="btn ghost" disabled={!valid} onclick={() => playSyl(syl, t)}>🔊 Nghe mẫu</button>
    <button class="btn" class:rec={recording} onclick={rec}>{recording ? "🔴 Đang thu... đọc đi!" : "🎙️ Thu âm (2 giây)"}</button>
    <button class="btn ghost" disabled={!mine} onclick={() => mine && new Audio(mine).play()}>▶ Nghe lại giọng em</button>
  </div>
  <canvas bind:this={canvas} width="1120" height="440" id="sCanvas"></canvas>
  <div class="feedback">
    {#if PSYL[syl] && !valid}Âm này không có thanh {t} trong dữ liệu.{/if}
    {#if unclear}<span style="color:var(--bad)">Chị chưa nghe rõ giọng em. Đọc to hơn, gần micro hơn xíu nha.</span>{/if}
    {#if result}
      Điểm: <b style="font-size:24px;color:var({result.score >= 80 ? '--ok' : result.score >= 60 ? '--gold' : '--bad'})">{result.score}</b>/100 · Chị nghe giống <b class="c{result.heard}">thanh {result.heard}</b> nhất.
      {#if result.score < 80}<div class="muted" style="font-weight:400">💡 {TONE_HINT[t]}</div>{/if}
    {/if}
  </div>
</div>
