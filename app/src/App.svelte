<!-- Khung app: thanh trên, Mít, thanh điều hướng, màn hình theo địa chỉ, hộp thoại, thông báo. -->
<script lang="ts">
  import TopBar from "./components/TopBar.svelte";
  import Mit from "./components/Mit.svelte";
  import Nav from "./components/Nav.svelte";
  import Modal from "./components/Modal.svelte";
  import Toast from "./components/Toast.svelte";
  import Celebrate from "./components/Celebrate.svelte";
  import Welcome from "./components/Welcome.svelte";
  import { ui } from "./lib/ui.svelte";
  import Home from "./screens/Home.svelte";
  import Road from "./screens/Road.svelte";
  import Lesson from "./screens/lesson/Lesson.svelte";
  import LevelTest from "./screens/LevelTest.svelte";
  import Review from "./screens/Review.svelte";
  import Dict from "./screens/Dict.svelte";
  import Stats from "./screens/Stats.svelte";
  import Story from "./screens/Story.svelte";
  import Pron from "./screens/pron/Pron.svelte";
  import { router } from "./lib/router.svelte";

  const r = $derived(router.route);
</script>

<div class="wrap">
  <TopBar />
  <Mit />
  <Nav />
  <main id="main">
    {#key router.n}
      {#if r.name === "home"}<Home />
      {:else if r.name === "road"}<Road />
      {:else if r.name === "lesson"}<Lesson lv={r.lv} u={r.u} step={r.step} />
      {:else if r.name === "levelTest"}<LevelTest lv={r.lv} />
      {:else if r.name === "review"}<Review five={r.five} />
      {:else if r.name === "dict"}<Dict />
      {:else if r.name === "stats"}<Stats />
      {:else if r.name === "story"}<Story id={r.id} />
      {:else if r.name === "pron"}<Pron tab={r.tab} />
      {/if}
    {/key}
  </main>
</div>
<Modal />
<Toast />
<Celebrate />
{#if ui.welcome}<Welcome />{/if}
{#if ui.update}
  <button class="upd" id="updBtn" onclick={() => location.reload()}>✨ Có bản Mít Xué mới · bấm để tải lại</button>
{/if}

<style>
  .upd{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:95;background:var(--red);color:#fff;border:none;border-radius:99px;padding:10px 18px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer}
</style>
