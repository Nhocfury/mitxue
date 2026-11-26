<!-- Thanh trên: logo (điện thoại), cấp độ + XP, chuỗi ngày, phút hôm nay (máy tính), cài đặt. -->
<script lang="ts">
  import { lvOf, streak, todayMinutes } from "../lib/progress";
  import { S } from "../lib/state.svelte";
  import { toggleTheme } from "../lib/startup";
  import { openModal } from "../lib/ui.svelte";
  import Settings from "../screens/Settings.svelte";
  import Icon from "./Icon.svelte";

  const L = $derived(lvOf(S.xp));
  const days = $derived.by(() => { void S.days; return streak(); });
  const mins = $derived.by(() => { void S.days; return todayMinutes(); });
</script>

<header class="top">
  <div class="logo"><span class="seal hz">学</span><span class="name">Mít Xué</span></div>
  <div class="chips">
    <div class="chip" title="Chuỗi ngày học (mỗi tuần được nghỉ 1 ngày)"><span class="fire"><Icon name="fire" size={16} /></span><b id="streak">{days}</b></div>
    <div class="chip lvchip" title="Cấp độ · {L.into}/{L.need} XP">Lv <b id="lv">{L.lv}</b><div class="xpbar"><i style="width:{(L.into / L.need) * 100}%"></i></div><span id="xptxt" class="muted">{L.into}/{L.need} XP</span></div>
    <div class="chip wide" title="Thời gian học hôm nay">⏱ <b id="today">{mins}</b>/{S.settings.goalMin}′</div>
    <button class="iconbtn" id="themeBtn" title="Đổi sáng/tối" aria-label="Đổi sáng/tối" onclick={toggleTheme}><Icon name="moon" size={18} /></button>
    <button class="iconbtn" id="settingsBtn" title="Cài đặt" aria-label="Cài đặt" onclick={() => openModal(Settings, {})}><Icon name="gear" size={18} /></button>
  </div>
</header>
