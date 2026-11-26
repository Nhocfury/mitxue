<!-- Hôm nay: một nút lớn "việc tiếp theo", vài nút phụ, nhắc truyện mới và sao lưu. -->
<script lang="ts">
  import { exportBackup, daysSinceBackup } from "../lib/backup";
  import { freshStories, nextAction, nextUnit } from "../lib/curriculum";
  import { unitCount } from "../lib/data";
  import { go } from "../lib/router.svelte";
  import { dueCount, learnedCount } from "../lib/srs";
  import { S } from "../lib/state.svelte";
  import { toast } from "../lib/ui.svelte";
  import { fiveMinute } from "../lib/actions";

  const a = nextAction();
  const due = dueCount();
  const nx = nextUnit();
  const fresh = freshStories();
  let since = $state(daysSinceBackup());
  const needBackup = $derived(learnedCount() >= 10 && since >= 7);
  function backup() { exportBackup(); since = 0; toast("Đã tải file sao lưu ✓ Cất nó vào ổ E hoặc Google Drive nha"); }
</script>

<section>
  <div class="card hero">
    <div class="muted">Việc tiếp theo của em</div>
    <button class="bigbtn" onclick={() => go(a.route)}>▶ {a.label}<small>{a.sub}</small></button>
    <div class="row" style="justify-content:center;margin-top:12px">
      {#if due}<button class="btn ghost" onclick={() => go("#/review")}>🔁 Ôn tập ({due})</button>{/if}
      {#if S.pron.lessonDone || S.lastUnit}<button class="btn ghost" onclick={() => go("#/pron/learn")}>🔤 Phát âm</button>{/if}
      <button class="btn ghost" onclick={fiveMinute}>⚡ 5 phút</button>
      <button class="btn ghost" onclick={() => go("#/stats")}>📊 Tiến độ</button>
    </div>
  </div>
  {#if fresh.length}
    <div class="card row between"><div>📖 Có truyện mới để đọc: <b>{fresh[0].title}</b></div><button class="btn small ghost" onclick={() => go({ name: "story", id: fresh[0].id })}>Đọc</button></div>
  {/if}
  {#if needBackup}
    <div class="card row between"><div>💾 Tiến độ chỉ lưu trong trình duyệt này. {S.lastBackup ? `Lần sao lưu gần nhất: ${since} ngày trước.` : "Em chưa sao lưu lần nào."}</div><button class="btn small" onclick={backup}>Sao lưu ngay</button></div>
  {/if}
  <div class="card"><b>Em đang ở:</b> {nx && nx.u !== "test" ? `HSK ${nx.lv} · ${nx.u}/${unitCount(nx.lv)} bài` : nx ? `Thi tổng HSK ${nx.lv}` : "Hoàn thành"} <span class="muted">· Mục tiêu HSK 5, mỗi ngày học đều một chút là được.</span></div>
</section>
