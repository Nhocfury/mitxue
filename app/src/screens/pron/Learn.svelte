<script lang="ts">
  import Quiz from "../../components/quiz/Quiz.svelte";
  import { playSyl } from "../../lib/audio";
  import { markSyl } from "../../lib/pinyin";
  import { FINAL_TIP, HARD_INIT, INIT_TIP, PASS_PRON, PRON_COURSE, pronCourseDone, recordSyl, TONE_INFO, type PronQ } from "../../lib/pron";
  import { addXP } from "../../lib/progress";
  import type { ChoiceQ, Question } from "../../lib/questions";
  import { go } from "../../lib/router.svelte";
  import { S, save } from "../../lib/state.svelte";
  import { confetti, say } from "../../lib/ui.svelte";
  import ToneSvg from "./ToneSvg.svelte";

  let cur = $state<{ i: number; qs: ChoiceQ[]; run: number } | null>(null);
  let scores = $state({ ...S.pron.q });
  const doneN = $derived(PRON_COURSE.filter(x => (scores[x.k] || 0) >= PASS_PRON).length);
  function start(i: number) { cur = { i, qs: PRON_COURSE[i].make(), run: (cur?.run ?? 0) + 1 }; }
  function onDone(k: string, pct: number) {
    S.pron.q[k] = Math.max(S.pron.q[k] || 0, pct); scores = { ...S.pron.q };
    if (!S.pron.lessonDone && pronCourseDone()) {
      S.pron.lessonDone = true; addXP(100); confetti();
      say("Xong <b>Giai đoạn 0: Phát âm</b>! Tai em nhạy hơn nhiều rồi đó. Qua HSK 1 thôi :3", "happy");
    }
    save();
  }
  const onAnswer = (q: Question, ok: boolean) => { if ("syl" in q) recordSyl((q as PronQ).syl, ok); };
</script>

<div class="card" id="pcBox">
  <div class="row between"><h2 style="margin:0">🎯 Khóa phát âm: {doneN}/4 bài đạt</h2>{#if S.pron.lessonDone}<b style="color:var(--ok)">✔ Đã hoàn thành</b>{/if}</div>
  <p class="muted">Đọc phần lý thuyết bên dưới, rồi làm 4 bài kiểm tra ngắn. Mỗi bài cần ≥ {PASS_PRON}%. Qua cả 4 bài là xong Giai đoạn 0.</p>
  <div class="grid g2">
    {#each PRON_COURSE as x, i}
      <div class="charbox" style="text-align:left"><b>{x.title}</b>
        {#if scores[x.k]}<span style="color:var({scores[x.k] >= PASS_PRON ? '--ok' : '--bad'})">{scores[x.k] >= PASS_PRON ? "✓" : ""} {scores[x.k]}%</span>{/if}
        <div class="muted">{x.desc}</div>
        <button class="btn small" data-pc={i} style="margin-top:6px" onclick={() => start(i)}>{scores[x.k] ? "Làm lại" : "Làm bài"}</button>
      </div>
    {/each}
  </div>
  {#if S.pron.lessonDone}<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" onclick={() => go("#/home")}>Về Hôm nay → học HSK 1</button></div>{/if}
  {#if cur}
    {@const c = cur}
    <div id="pcQuiz" style="margin-top:10px">
      {#key c.run}<Quiz questions={c.qs} title={PRON_COURSE[c.i].title} pass={PASS_PRON} onDone={(_s, _t, pct) => onDone(PRON_COURSE[c.i].k, pct)} {onAnswer}
        onRestart={() => start(c.i)} nextLabel="Về khóa phát âm" onNext={() => (cur = null)} />{/key}
    </div>
  {/if}
</div>

<div class="card">
  <h2>Bài 1 · 4 thanh điệu + thanh nhẹ</h2>
  <p class="muted">Mỗi âm tiết tiếng Trung = phụ âm đầu (声母) + vần (韵母) + thanh điệu (声调). Đổi thanh là đổi nghĩa: <span class="hz">妈 mā</span> (mẹ) · <span class="hz">麻 má</span> (cây gai) · <span class="hz">马 mǎ</span> (ngựa) · <span class="hz">骂 mà</span> (mắng). Bấm từng thẻ để nghe.</p>
  <div class="grid g4">
    {#each TONE_INFO as o}
      <button class="tone-card" style="border-color:var(--t{o.t})" onclick={() => playSyl("ma", o.t)}>
        <div class="big c{o.t}">{markSyl("ma", o.t)}</div><b>{o.name}</b> <span class="muted">({o.chao})</span>
        {#if o.t < 5}<ToneSvg t={o.t} />{/if}
        <div style="font-size:14px">{o.vi}</div><div class="muted hz">{o.ex}</div>
      </button>
    {/each}
  </div>
  <div class="tip">💡 So với tiếng Việt chỉ là <b>gần đúng</b> để dễ hình dung. Tai em mới là thước đo, nghe mẫu nhiều lần rồi bắt chước.</div>
</div>
<div class="card">
  <h2>Bài 2 · Mấy âm người Việt hay sai</h2>
  <div class="grid g2">
    {#each FINAL_TIP as [a, b]}<div class="tip" style="margin:0"><b>{a}</b><br>{b}</div>{/each}
    {#each HARD_INIT as i}<div class="tip" style="margin:0"><b>{i}</b> · {INIT_TIP[i]}</div>{/each}
  </div>
</div>
<div class="card">
  <h2>Bài 3 · Quy tắc đánh dấu thanh & biến điệu</h2>
  <ul>
    <li>Dấu đặt trên nguyên âm theo thứ tự ưu tiên <b>a → o/e → i/u</b>: <i>hǎo, gěi, duō</i>. Gặp <b>iu</b> thì dấu trên u (<i>liù</i>), gặp <b>ui</b> thì dấu trên i (<i>guì</i>).</li>
    <li><b>j, q, x, y</b> + <b>u</b> thì u đó là <b>ü</b> (ghi tắt bỏ 2 chấm): <i>ju = jü, qu = qü, xu = xü, yu = yü</i>. Chỉ có <b>n, l</b> mới phải viết rõ <b>nü, lü</b>.</li>
    <li><b>Hai thanh 3 đứng liền nhau</b> → thanh 3 đầu đọc thành thanh 2: <span class="hz">你好</span> nǐ hǎo đọc là <b>ní hǎo</b>.</li>
    <li><b>不 bù</b> đứng trước thanh 4 đọc thành <b>bú</b>: <span class="hz">不是</span> bú shì. <b>一 yī</b> trước thanh 4 thành <b>yí</b>, trước thanh 1/2/3 thành <b>yì</b>.</li>
    <li>Thanh 3 trong lời nói thường chỉ đọc <b>nửa dưới</b> (xuống thấp, không lên lại), chỉ khi đọc riêng hoặc cuối câu mới đủ "xuống rồi lên".</li>
  </ul>
  <button class="btn" onclick={() => go("#/pron/chart")}>Qua bảng pinyin nghe thử →</button>
</div>
