<!-- Hôm nay: vòng mục tiêu + chuỗi ngày, nút lớn "việc tiếp theo", nhiệm vụ ngày + rương, nhắc truyện mới, sao lưu. -->
<script lang="ts">
  import { exportBackup, daysSinceBackup } from "../lib/backup";
  import { freshStories, nextAction, nextUnit } from "../lib/curriculum";
  import { unitCount } from "../lib/data";
  import { go } from "../lib/router.svelte";
  import { dueCount, learnedCount } from "../lib/srs";
  import { S } from "../lib/state.svelte";
  import { toast, ui } from "../lib/ui.svelte";
  import { fiveMinute } from "../lib/actions";
  import { streak } from "../lib/progress";
  import { CHEST_XP, chestOpened, chestReady, isBedtime, lastDays, openChest, quests } from "../lib/motivation";
  import { todayStr } from "../lib/util";
  import Mit from "../components/Mit.svelte";

  const a = nextAction();
  const due = dueCount();
  const nx = nextUnit();
  const fresh = freshStories();
  let since = $state(daysSinceBackup());
  const needBackup = $derived(learnedCount() >= 10 && since >= 7);
  function backup() { exportBackup(); since = 0; toast("Đã tải file sao lưu ✓ Cất nó vào ổ E hoặc Google Drive nha"); }

  // S.days đổi (mỗi 15 giây, mỗi câu trả lời) thì mấy số này tự cập nhật
  const today = $derived(S.days[todayStr()] ?? { sec: 0, q: 0, ok: 0 });
  const mins = $derived(Math.floor(today.sec / 60));
  const goal = $derived(S.settings.goalMin);
  const frac = $derived(Math.min(1, mins / goal));
  const qList = $derived.by(() => { void S.days; return quests(); });
  const ready = $derived.by(() => { void S.days; return chestReady(); });
  const opened = $derived.by(() => { void S.days; return chestOpened(); });
  const week = $derived.by(() => { void S.days; return lastDays(); });
  const days = $derived.by(() => { void S.days; return streak(); });
  const R = 34, C = 2 * Math.PI * R;
  const late = isBedtime();
</script>

<section>
  <Mit />
  {#if late && !/ngủ/.test(ui.mit.html)}
    <div class="card night">🌙 Khuya rồi. Giờ ngủ em đặt: <b>{S.settings.bedHour}:00 tắt màn hình</b>. Ôn vài thẻ cho xong rồi đi ngủ nha, mai học tiếp.</div>
  {/if}

  <div class="card hero">
    <div class="muted">Việc tiếp theo của em</div>
    <button class="bigbtn" onclick={() => go(a.route)}>▶ {a.label}<small>{a.sub}</small></button>
    <div class="quick">
      {#if due}<button class="btn ghost" onclick={() => go("#/review")}>🔁 Ôn tập ({due})</button>{/if}
      {#if S.pron.lessonDone || S.lastUnit}<button class="btn ghost" onclick={() => go("#/pron/learn")}>🔤 Phát âm</button>{/if}
      <button class="btn ghost" onclick={fiveMinute}>⚡ 5 phút</button>
    </div>
  </div>

  <div class="card today">
    <div class="ring" title="Thời gian học hôm nay">
      <svg viewBox="0 0 80 80" width="96" height="96">
        <circle cx="40" cy="40" r={R} class="track" />
        <circle cx="40" cy="40" r={R} class="fill" class:full={frac >= 1} stroke-dasharray={C} stroke-dashoffset={C * (1 - frac)} />
      </svg>
      <div class="mid"><b>{mins}</b><small>/{goal} phút</small></div>
    </div>
    <div class="grow">
      <div class="streak"><span class="fire" class:cold={!week[6].studied}>🔥</span> <b id="homeStreak">{days}</b> ngày liên tiếp</div>
      <div class="wk">
        {#each week as d}
          <div class="wd" class:on={d.studied} class:goal={d.goal} class:now={d.today} title={d.ds}>
            <i>{d.goal ? "★" : d.studied ? "✓" : ""}</i><small>{d.wd}</small>
          </div>
        {/each}
      </div>
      <div class="muted small">{week[6].studied ? "Hôm nay có học rồi, giữ chuỗi thành công ✓" : "Làm 1 câu bất kỳ là giữ được chuỗi hôm nay."} Mỗi tuần được nghỉ 1 ngày.</div>
    </div>
  </div>

  <div class="card">
    <div class="row between"><h3 style="margin:0">🎯 Nhiệm vụ hôm nay</h3><span class="muted small">{qList.filter(q => q.done).length}/{qList.length}</span></div>
    {#each qList as q}
      <div class="quest" class:done={q.done}>
        <span class="qi">{q.done ? "✅" : q.icon}</span>
        <div class="grow"><div>{q.label}</div><div class="bar"><i style="width:{(q.cur / q.need) * 100}%"></i></div></div>
        <span class="muted small">{q.cur}/{q.need}</span>
      </div>
    {/each}
    <button class="chest" class:ready class:opened disabled={!ready} id="chestBtn" onclick={openChest}>
      <span class="box">{opened ? "🎉" : "🎁"}</span>
      {#if opened}Đã mở rương hôm nay (+{CHEST_XP} XP). Mai có rương mới!
      {:else if ready}<b>Mở rương!</b> +{CHEST_XP} XP
      {:else}Xong cả 3 nhiệm vụ để mở rương +{CHEST_XP} XP{/if}
    </button>
  </div>

  {#if fresh.length}
    <div class="card row between"><div>📖 Có truyện mới để đọc: <b>{fresh[0].title}</b></div><button class="btn small ghost" onclick={() => go({ name: "story", id: fresh[0].id })}>Đọc</button></div>
  {/if}
  {#if needBackup}
    <div class="card row between"><div>💾 Tiến độ chỉ lưu trong trình duyệt này. {S.lastBackup ? `Lần sao lưu gần nhất: ${since} ngày trước.` : "Em chưa sao lưu lần nào."}</div><button class="btn small" onclick={backup}>Sao lưu ngay</button></div>
  {/if}
  <div class="card"><b>Em đang ở:</b> {nx && nx.u !== "test" ? `HSK ${nx.lv} · ${nx.u}/${unitCount(nx.lv)} bài` : nx ? `Thi tổng HSK ${nx.lv}` : "Hoàn thành"} <span class="muted">· Mục tiêu HSK 5, mỗi ngày học đều một chút là được.</span></div>
</section>

<style>
  .small{font-size:12px}
  .quick{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:12px}
  .quick :global(.btn){justify-content:center}
  .hero .bigbtn{margin-top:6px}
  .grow{flex:1;min-width:0}
  .night{background:#1d2340;color:#e6e9ff;border-color:#2e3766}
  .night b{color:#ffd76a}
  .today{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
  .ring{position:relative;width:96px;height:96px;flex:none}
  .ring svg{transform:rotate(-90deg)}
  .track{fill:none;stroke:var(--red-soft);stroke-width:9}
  .fill{fill:none;stroke:var(--red);stroke-width:9;stroke-linecap:round;transition:stroke-dashoffset .6s ease}
  .fill.full{stroke:var(--gold)}
  .mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
  .mid b{font-size:24px}
  .mid small{font-size:11px;color:var(--muted)}
  .streak{font-size:17px;margin-bottom:6px}
  .fire{display:inline-block;animation:flick 1.6s ease-in-out infinite}
  .fire.cold{filter:grayscale(1);opacity:.5;animation:none}
  .wk{display:flex;gap:4px;margin-bottom:6px;justify-content:space-between;max-width:260px}
  .wd{display:flex;flex-direction:column;align-items:center;gap:2px}
  .wd i{width:26px;height:26px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-style:normal;font-size:13px;color:#fff}
  .wd.on i{background:var(--ok);border-color:var(--ok)}
  .wd.goal i{background:var(--gold);border-color:var(--gold)}
  .wd.now i{box-shadow:0 0 0 2px var(--card),0 0 0 4px var(--red)}
  .wd small{font-size:10px;color:var(--muted)}
  .quest{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--border)}
  .quest.done{opacity:.75}
  .qi{font-size:20px;width:26px;text-align:center}
  .bar{height:7px;background:var(--red-soft);border-radius:9px;overflow:hidden;margin-top:4px}
  .bar i{display:block;height:100%;background:var(--red);transition:width .5s ease}
  .quest.done .bar i{background:var(--ok)}
  .chest{width:100%;margin-top:10px;display:flex;align-items:center;gap:10px;justify-content:center;padding:10px;border-radius:12px;border:1.5px dashed var(--border);background:var(--bg);color:var(--muted)}
  .chest .box{font-size:26px}
  .chest.ready{border:2px solid var(--gold);background:var(--gold-soft);color:var(--text);cursor:pointer}
  .chest.ready .box{display:inline-block;animation:wiggle 1.2s ease-in-out infinite}
  .chest.opened{border-style:solid;color:var(--text)}
  @keyframes flick{50%{transform:scale(1.12) rotate(-4deg)}}
  @keyframes wiggle{0%,100%{transform:rotate(0) scale(1)}20%{transform:rotate(-14deg) scale(1.1)}40%{transform:rotate(12deg) scale(1.1)}60%{transform:rotate(-8deg)}}
</style>
