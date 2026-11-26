/* =========================================================================
 * GHI ÂM CHO BỘ CHẤM: micro → MediaRecorder → giải mã → 16 kHz mono (Float32Array).
 * Có đo âm lượng để vẽ thanh mức và tự dừng khi em nói xong (im lặng ~1 giây).
 * ========================================================================= */
export interface Recording { samples: Float32Array; url: string; seconds: number; peak: number }

export class Recorder {
  private stream: MediaStream | null = null;
  private mr: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private ctx: AudioContext | null = null;
  private an: AnalyserNode | null = null;
  private timer = 0;
  private done: ((r: Recording | null) => void) | null = null;
  level = 0;                       // 0..1, cập nhật liên tục khi đang ghi

  /** Ghi âm tới khi: em bấm dừng (stop), hoặc đã nói rồi im lặng silenceMs, hoặc quá maxMs.
   *  Lỗi micro → ném lỗi ngay (trước khi ghi). onLevel: gọi ~20 lần/giây. */
  async record(onLevel: (v: number) => void, maxMs = 8000, silenceMs = 1100): Promise<Recording | null> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.ctx = new AudioContext();
    this.an = this.ctx.createAnalyser(); this.an.fftSize = 1024;
    this.ctx.createMediaStreamSource(this.stream).connect(this.an);
    this.mr = new MediaRecorder(this.stream); this.chunks = [];
    this.mr.ondataavailable = e => e.data.size && this.chunks.push(e.data);
    const result = new Promise<Recording | null>(res => (this.done = res));
    this.mr.onstop = () => void this.finish();
    this.mr.start();
    const buf = new Float32Array(this.an.fftSize);
    const t0 = performance.now(); let spoke = false, lastLoud = t0;
    this.timer = window.setInterval(() => {
      if (!this.an) return;
      this.an.getFloatTimeDomainData(buf);
      let s = 0; for (const v of buf) s += v * v;
      const rms = Math.sqrt(s / buf.length);
      this.level = Math.min(1, rms * 8); onLevel(this.level);
      const now = performance.now();
      if (rms > 0.02) { spoke = true; lastLoud = now; }
      if ((spoke && now - lastLoud > silenceMs && now - t0 > 900) || now - t0 > maxMs) this.stop();
    }, 50);
    return result;
  }

  /** Dừng sớm (em bấm "Xong"); kết quả trả qua promise của record(). */
  stop(): void {
    clearInterval(this.timer);
    if (this.mr && this.mr.state !== "inactive") this.mr.stop();
  }

  private async finish() {
    clearInterval(this.timer);
    this.stream?.getTracks().forEach(t => t.stop());
    const blob = new Blob(this.chunks, { type: this.mr?.mimeType || "audio/webm" });
    let rec: Recording | null = null;
    try {
      if (blob.size > 0 && this.ctx) {
        const audio = await this.ctx.decodeAudioData(await blob.arrayBuffer());
        rec = { samples: await to16k(audio), url: URL.createObjectURL(blob), seconds: audio.duration, peak: 0 };
        for (const v of rec.samples) rec.peak = Math.max(rec.peak, Math.abs(v));
      }
    } catch { rec = null; }
    await this.ctx?.close().catch(() => {});
    this.ctx = null; this.an = null; this.mr = null; this.stream = null;
    this.done?.(rec); this.done = null;
  }
}

/** Đổi tần số mẫu về 16 kHz mono (mô hình được train ở 16 kHz). */
export async function to16k(audio: AudioBuffer): Promise<Float32Array> {
  const len = Math.max(1, Math.ceil(audio.duration * 16000));
  const off = new OfflineAudioContext(1, len, 16000);
  const src = off.createBufferSource(); src.buffer = audio; src.connect(off.destination); src.start();
  return (await off.startRendering()).getChannelData(0);
}
