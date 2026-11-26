<script lang="ts">
  import type { StepKey } from "../../lib/curriculum";
  import { completeStep } from "./complete";
  let { lv, u, k, goStep, label = "Xong phần này, học tiếp →" }: { lv: number; u: number; k: StepKey; goStep: (k: StepKey) => void; label?: string } = $props();
</script>
<div class="row" style="justify-content:flex-end;margin-top:12px">
  <button class="btn" onclick={() => { const n = completeStep(lv, u, k); if (n) goStep(n); }}>{label}</button>
</div>
