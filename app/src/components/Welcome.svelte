<!--
  Màn chào lần đầu (máy chưa đăng nhập): tạo tài khoản (tên + mật khẩu + mục tiêu + giờ ngủ)
  hoặc đăng nhập để lấy tiến độ từ máy khác. Có thể bỏ qua (chỉ học trên máy này).
  Tên + mật khẩu → mã đồng bộ: lib/account.ts. Gọi máy chủ: signIn() trong lib/sync.svelte.ts.
-->
<script lang="ts">
  import { signIn, sync } from "../lib/sync.svelte";
  import { S, save } from "../lib/state.svelte";
  import { say, toast, ui } from "../lib/ui.svelte";
  import { learnedCount } from "../lib/srs";

  let mode = $state<"new" | "login">("new");
  let name = $state(S.settings.name || ""), pw = $state(""), pw2 = $state("");
  let goal = $state(S.settings.goalMin || 30), bed = $state<string>(S.settings.bedHour === null ? "off" : String(S.settings.bedHour ?? 23));
  let err = $state(""), busy = $state(false);
  const hasProgress = S.xp > 0 || learnedCount() > 0;

  export function markWelcomed() { try { localStorage.setItem("mitxue_welcomed", "1"); } catch { /* bỏ qua */ } }

  async function submit(e: Event) {
    e.preventDefault(); err = "";
    if (mode === "new" && pw !== pw2) { err = "Hai lần nhập mật khẩu chưa giống nhau."; return; }
    busy = true;
    if (mode === "new") {
      S.settings.name = name.trim(); S.settings.goalMin = Number(goal); S.settings.bedHour = bed === "off" ? null : Number(bed); save();
    }
    err = await signIn(name, pw, mode);
    busy = false;
    if (err) return;
    markWelcomed(); ui.welcome = false;
    if (mode === "login" && !S.settings.name) { S.settings.name = name.trim(); save(); }
    say(mode === "new" ? `Chào <b>${S.settings.name}</b>! Từ giờ học ở máy nào cũng được, nhớ tên + mật khẩu nha :3` : `Mừng <b>${S.settings.name || name}</b> quay lại! Tiến độ đã về máy này rồi nè.`, "happy");
    toast(mode === "new" ? "Đã tạo tài khoản ✓" : "Đã đăng nhập, tiến độ đã gộp ✓");
  }
  function skip() { markWelcomed(); ui.welcome = false; }
</script>

<div class="wrap" role="dialog" aria-modal="true" aria-label="Chào mừng">
  <form class="card box" onsubmit={submit}>
    <div class="head"><span class="logo">学</span><div><h2>Chào bạn! Mình là Mít</h2><p class="muted">Học tiếng Trung từ số 0 tới HSK 5, có chị đi cùng :3</p></div></div>
    <div class="tabs">
      <button type="button" class:on={mode === "new"} id="wNew" onclick={() => { mode = "new"; err = ""; }}>Bắt đầu mới</button>
      <button type="button" class:on={mode === "login"} id="wLogin" onclick={() => { mode = "login"; err = ""; }}>Đã có tài khoản</button>
    </div>

    <label>Tên (Mít gọi em là gì?)<input class="text" id="wName" bind:value={name} autocomplete="username" maxlength="30" required /></label>
    <label>Mật khẩu (ít nhất 6 ký tự)<input class="text" id="wPw" type="password" bind:value={pw} autocomplete={mode === "new" ? "new-password" : "current-password"} required /></label>
    {#if mode === "new"}
      <label>Nhập lại mật khẩu<input class="text" id="wPw2" type="password" bind:value={pw2} autocomplete="new-password" required /></label>
      <div class="two">
        <label>Mục tiêu mỗi ngày
          <select class="text" id="wGoal" bind:value={goal}><option value={15}>15 phút</option><option value={30}>30 phút</option><option value={45}>45 phút</option><option value={60}>60 phút</option></select>
        </label>
        <label>Nhắc đi ngủ lúc
          <select class="text" id="wBed" bind:value={bed}><option value="off">Không nhắc</option><option value="22">22:00</option><option value="23">23:00</option><option value="0">0:00</option></select>
        </label>
      </div>
      <p class="note">Nhớ <b>tên + mật khẩu</b>: sang máy khác nhập lại là học tiếp. Quên là chị không lấy lại giúp được đâu nha.
        {#if hasProgress}<br>Tiến độ đang có trên máy này sẽ được giữ và lưu vào tài khoản.{/if}</p>
    {:else}
      <p class="note">Tiến độ trên máy này (nếu có) sẽ được gộp với tài khoản, không mất gì.</p>
    {/if}

    {#if err}<p class="err" id="wErr">{err}</p>{/if}
    <button class="btn" id="wGo" type="submit" disabled={busy}>{busy ? "⏳ Chờ chút…" : mode === "new" ? "Tạo tài khoản" : "Đăng nhập"}</button>
    <button class="skip" type="button" id="wSkip" onclick={skip} disabled={busy}>Chỉ học trên máy này, không tạo tài khoản</button>
    {#if sync.status === "busy"}<p class="muted small">Đang kết nối…</p>{/if}
  </form>
</div>

<style>
  .wrap{position:fixed;inset:0;z-index:90;background:rgba(40,20,24,.45);display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto}
  .box{width:100%;max-width:440px;display:flex;flex-direction:column;gap:10px;margin:auto}
  .head{display:flex;gap:12px;align-items:center}
  .head h2{margin:0;font-size:20px}
  .head p{margin:2px 0 0}
  .logo{width:52px;height:52px;flex:none;border-radius:14px;background:var(--red);color:#fff;font-size:32px;display:flex;align-items:center;justify-content:center;font-weight:700}
  .tabs{display:flex;gap:6px;background:var(--bg);padding:4px;border-radius:12px}
  .tabs button{flex:1;border:none;background:none;padding:8px;border-radius:9px;font-weight:600;color:var(--muted);cursor:pointer}
  .tabs button.on{background:var(--card);color:var(--red);box-shadow:0 1px 4px rgba(0,0,0,.08)}
  label{display:flex;flex-direction:column;gap:4px;font-size:14px;font-weight:600}
  label :global(.text){font-weight:400}
  .two{display:flex;gap:10px}
  .two label{flex:1}
  .note{font-size:13px;color:var(--muted);margin:0}
  .err{color:var(--bad);margin:0;font-size:14px}
  .skip{background:none;border:none;color:var(--muted);text-decoration:underline;font-size:13px;cursor:pointer}
  .small{font-size:12px;margin:0}
</style>
