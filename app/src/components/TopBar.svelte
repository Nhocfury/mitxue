<script lang="ts">
  import { lvOf, streak, todayMinutes } from "../lib/progress";
  import { S } from "../lib/state.svelte";
  import { toggleTheme } from "../lib/startup";
  import { openModal } from "../lib/ui.svelte";
  import Settings from "../screens/Settings.svelte";

  const L = $derived(lvOf(S.xp));
  const days = $derived.by(() => { void S.days; return streak(); });
  const mins = $derived.by(() => { void S.days; return todayMinutes(); });
</script>

<header>
  <div class="logo"><span class="seal hz">学</span> Mít Xué <span class="ver">v1.0</span></div>
  <div class="chips">
    <div class="chip" title="Cấp độ">⭐ Lv <b id="lv">{L.lv}</b> <div class="xpbar"><i style="width:{(L.into / L.need) * 100}%"></i></div> <span id="xptxt" class="muted">{L.into}/{L.need} XP</span></div>
    <div class="chip" title="Chuỗi ngày học (mỗi tuần được nghỉ 1 ngày)">🔥 <b id="streak">{days}</b> ngày</div>
    <div class="chip" title="Thời gian học hôm nay">⏱️ <b id="today">{mins}</b>/{S.settings.goalMin} phút</div>
    <button class="iconbtn" id="settingsBtn" title="Cài đặt" onclick={() => openModal(Settings, {})}>⚙️</button>
    <button class="iconbtn" id="themeBtn" title="Đổi sáng/tối" onclick={toggleTheme}>🌓</button>
  </div>
</header>
