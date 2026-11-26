<script lang="ts">
  import { daysSinceBackup, exportBackup, importBackup } from "../lib/backup";
  import SyncPanel from "../components/SyncPanel.svelte";
  import { voiceName } from "../lib/audio";
  import { go, router } from "../lib/router.svelte";
  import { S, save } from "../lib/state.svelte";
  import { closeModal, toast } from "../lib/ui.svelte";
  import { href } from "../lib/router.svelte";
  const s = $state({ ...S.settings });
  let bed = $state(s.bedHour === null ? "off" : String(s.bedHour));
  const voice = voiceName();
  function apply() {
    s.goalMin = Math.min(240, Math.max(10, +s.goalMin || 60));
    s.newPerDay = Math.min(40, Math.max(3, +s.newPerDay || 10));
    s.reviewMax = Math.min(500, Math.max(20, +s.reviewMax || 150));
    s.name = (s.name || "").trim().slice(0, 30);
    s.bedHour = bed === "off" ? null : Number(bed);
    Object.assign(S.settings, s); save(); closeModal(); toast("Đã lưu ✓"); go(href(router.route));
  }
  async function restore(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (!f) return;
    if (!confirm("Khôi phục sẽ thay toàn bộ tiến độ hiện tại bằng file sao lưu. Tiếp tục?")) return;
    if (await importBackup(f)) { closeModal(); toast("Khôi phục xong ✓"); go("#/home"); } else toast("File này không phải file sao lưu của Mít Xué");
  }
</script>

<h2>⚙️ Cài đặt</h2>
<p><label>Tên (Mít gọi em là): <input class="text" id="stName" maxlength="30" bind:value={s.name} style="width:160px"></label></p>
<p><label>Nhắc đi ngủ lúc: <select class="text" id="stBed" bind:value={bed}><option value="off">Không nhắc</option><option value="21">21:00</option><option value="22">22:00</option><option value="23">23:00</option><option value="0">0:00</option></select></label></p>
<p><label>Mục tiêu mỗi ngày: <input type="number" class="text" id="stGoal" min="10" max="240" step="5" bind:value={s.goalMin} style="width:90px"> phút</label></p>
<p><label>Số từ mới tối đa mỗi ngày: <input type="number" class="text" id="stNew" min="3" max="40" bind:value={s.newPerDay} style="width:90px"></label> <span class="muted">(khuyên 8–12)</span></p>
<p><label>Pinyin trong câu: <select class="text" id="stPyM" bind:value={s.pyMode}>
  <option value="auto">Tự động (HSK 1 hiện, từ HSK 2 làm mờ, bấm để xem)</option><option value="show">Luôn hiện</option><option value="hide">Luôn làm mờ</option></select></label></p>
<p><label>Số thẻ ôn tối đa mỗi ngày: <input type="number" class="text" id="stMax" min="20" max="500" step="10" bind:value={s.reviewMax} style="width:90px"></label></p>
<p><label>Tốc độ đọc audio: <select class="text" bind:value={s.rate}><option value={0.75}>Chậm</option><option value={1}>Bình thường</option><option value={1.15}>Nhanh</option></select></label></p>
<p><label><input type="checkbox" bind:checked={s.showPy}> Hiện pinyin trong hội thoại</label></p>
<p><label><input type="checkbox" id="stSfx" bind:checked={s.sfx}> Tiếng hiệu ứng khi trả lời đúng/sai, mở rương</label></p>
<p><label><input type="checkbox" id="stUnlock" bind:checked={s.unlockAll}> Mở khóa tất cả bài (không khuyến khích: học lướt dễ hổng gốc)</label></p>
<div class="info">Âm thanh: mọi từ và câu trong bài đã có file đọc sẵn, chạy cả khi không có mạng. Câu nào chưa có file thì app dùng giọng đọc của trình duyệt (mở bằng <b>Microsoft Edge</b> có giọng tiếng Trung tốt). Giọng trình duyệt hiện tại: <b>{voice ?? "chưa có giọng tiếng Trung"}</b>.</div>
<SyncPanel />
<div class="info"><b>💾 Sao lưu tiến độ</b><br>Tiến độ lưu trong trình duyệt. Xóa lịch sử duyệt web hoặc đổi trình duyệt là mất, nên sao lưu mỗi tuần.{#if S.lastBackup} Lần gần nhất: {S.lastBackup} ({daysSinceBackup()} ngày trước).{/if}
  <div class="row" style="margin-top:6px">
    <button class="btn small" onclick={() => { exportBackup(); toast("Đã tải file sao lưu ✓"); }}>Tải file sao lưu</button>
    <label class="btn ghost small" style="cursor:pointer">Khôi phục từ file<input type="file" accept=".json" style="display:none" onchange={restore}></label>
  </div>
</div>
<button class="btn" id="stSave" onclick={apply}>Lưu</button>
