<!-- Bảng chúc mừng giữa màn hình (lên cấp, mở rương, đủ phút). Chỉ để nhìn: không chặn bấm, tự tắt. -->
<script lang="ts">
  import { ui } from "../lib/ui.svelte";
</script>

{#if ui.cele}
  {#key ui.cele.n}
    <div class="cele" aria-live="polite">
      <div class="ic">{ui.cele.icon}</div>
      <div class="t">{ui.cele.title}</div>
      {#if ui.cele.sub}<div class="s">{ui.cele.sub}</div>{/if}
    </div>
  {/key}
{/if}

<style>
  .cele{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:96;pointer-events:none;
    background:var(--card);border:2px solid var(--gold);border-radius:22px;padding:18px 34px;text-align:center;
    box-shadow:0 12px 40px rgba(0,0,0,.25);animation:pop .45s cubic-bezier(.2,1.6,.4,1) both, fade .4s ease 2.4s forwards}
  .ic{font-size:54px;line-height:1.1}
  .t{font-size:30px;font-weight:800;color:var(--red)}
  .s{color:var(--muted);font-size:15px;margin-top:2px}
  @keyframes pop{from{transform:translate(-50%,-50%) scale(.4);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
  @keyframes fade{to{opacity:0}}
</style>
