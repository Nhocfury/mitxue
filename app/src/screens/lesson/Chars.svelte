<script lang="ts">
  import CharBox from "../../components/CharBox.svelte";
  import type { StepKey } from "../../lib/curriculum";
  import { introducedChars } from "../../lib/data";
  import NextStep from "./NextStep.svelte";
  let { lv, u, goStep }: { lv: number; u: number; goStep: (k: StepKey) => void } = $props();
  const cs = introducedChars(lv, u);
</script>

<div class="card">
  <h2>Chữ Hán mới ({cs.length} chữ)</h2>
  <p class="muted">Quy tắc viết cơ bản: <b>ngang trước sổ sau · phẩy trước mác sau · trên trước dưới sau · trái trước phải sau · ngoài trước trong sau · vào nhà rồi mới đóng cửa · giữa trước hai bên sau</b>. Chữ có huy hiệu ✍️ là chữ đề thi HSK yêu cầu viết tay, ưu tiên luyện kỹ.</p>
  <div class="grid g2">{#each cs as c (c)}<CharBox {c} />{:else}<p>Bài này không có chữ mới, toàn chữ đã học 👍</p>{/each}</div>
  <NextStep {lv} {u} k="chars" {goStep} />
</div>
