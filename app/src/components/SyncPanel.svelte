<!-- Cài đặt → Đồng bộ nhiều máy: tạo/nhập mã, mã QR để mở trên điện thoại, trạng thái, đồng bộ ngay, ngắt. -->
<script lang="ts">
  import qrcode from "qrcode-generator";
  import { apiUrl, connect, disconnect, newCode, normalizeCode, shareLink, sync, syncNow } from "../lib/sync.svelte";
  import { toast } from "../lib/ui.svelte";

  let input = $state("");
  let showCode = $state(false);
  const ready = apiUrl() !== "";
  const when = $derived(sync.lastAt ? new Date(sync.lastAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "");
  const qr = $derived.by(() => {
    const link = sync.code ? shareLink() : "";
    if (!link) return "";
    const q = qrcode(0, "M"); q.addData(link); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  });

  async function create() {
    if (!(await connect(newCode()))) return;
    showCode = true; toast("Đã bật đồng bộ ✓ Ghi lại mã hoặc quét QR trên điện thoại");
  }
  async function join() {
    const c = normalizeCode(input);
    if (!c) { toast("Mã chưa đúng: dạng MX-XXXXX-XXXXX-XXXXX-XXXXX"); return; }
    if (await connect(c)) { input = ""; toast("Đã nối với máy kia, tiến độ đã gộp ✓"); }
  }
  function off() {
    if (!confirm("Ngắt đồng bộ trên máy này? Tiến độ trên máy vẫn giữ nguyên. Muốn nối lại thì nhập lại mã.")) return;
    disconnect(); toast("Đã ngắt đồng bộ trên máy này");
  }
  async function copy() {
    try { await navigator.clipboard.writeText(sync.code); toast("Đã chép mã"); } catch { showCode = true; }
  }
</script>

<div class="info sync" id="syncPanel">
  <b>🔄 Đồng bộ nhiều máy</b>
  {#if !ready}
    <p>Cần đưa app lên mạng trước (đang làm). Xong thì em học được trên điện thoại, tiến độ tự gộp giữa các máy.</p>
  {:else if !sync.code}
    <p>Học trên máy tính và điện thoại chung một tiến độ. Không cần tài khoản: app tạo một <b>mã đồng bộ</b> bí mật, máy nào nhập cùng mã thì chung tiến độ.</p>
    <div class="row">
      <button class="btn small" id="syncCreate" disabled={sync.status === "busy"} onclick={create}>Tạo mã (máy đầu tiên)</button>
    </div>
    <div class="row" style="margin-top:8px">
      <input class="text" id="syncInput" placeholder="MX-XXXXX-XXXXX-XXXXX-XXXXX" bind:value={input} style="flex:1;min-width:220px;font-family:monospace" />
      <button class="btn ghost small" id="syncJoin" disabled={sync.status === "busy"} onclick={join}>Nối với máy khác</button>
    </div>
  {:else}
    <p class="st" data-sync-status={sync.status}>
      {#if sync.status === "busy"}⏳ Đang đồng bộ…
      {:else if sync.status === "error"}⚠️ {sync.msg}
      {:else if sync.lastAt}✅ Đã đồng bộ lúc {when}
      {:else}Đang chờ đồng bộ…{/if}
    </p>
    <div class="row">
      <button class="btn small" id="syncNow" disabled={sync.status === "busy"} onclick={() => syncNow()}>Đồng bộ ngay</button>
      <button class="btn ghost small" onclick={() => (showCode = !showCode)}>{showCode ? "Ẩn mã" : "Xem mã / QR"}</button>
      <button class="btn ghost small" id="syncOff" onclick={off}>Ngắt trên máy này</button>
    </div>
    {#if showCode}
      <div class="codebox">
        <div class="qr">{@html qr}</div>
        <div>
          <div class="code" id="syncCode">{sync.code}</div>
          <button class="btn ghost small" onclick={copy}>📋 Chép mã</button>
          <p class="muted small">Trên điện thoại: quét QR bằng camera (mở luôn app và tự nối), hoặc mở app → Cài đặt → nhập mã này.
            <b>Giữ mã bí mật</b>: ai có mã là xem và sửa được tiến độ của em.</p>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .sync p{margin:6px 0}
  .small{font-size:12px}
  .st[data-sync-status="error"]{color:var(--bad)}
  .codebox{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:10px}
  .qr{width:150px;height:150px;background:#fff;border-radius:8px;padding:4px}
  .qr :global(svg){width:100%;height:100%}
  .code{font-family:monospace;font-size:17px;font-weight:700;letter-spacing:1px;margin-bottom:6px;user-select:all}
</style>
