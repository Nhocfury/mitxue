/* Đánh dấu xong một bước của bài (lần đầu +15 XP) và trả về bước kế tiếp. */
import { stepsOf, unitProg, type StepKey } from "../../lib/curriculum";
import { addXP } from "../../lib/progress";
import { day, save } from "../../lib/state.svelte";

export function completeStep(lv: number, u: number, k: StepKey): StepKey | null {
  const st = unitProg(lv, u);
  if (!st.steps[k]) { st.steps[k] = true; const d = day(); d.steps = (d.steps ?? 0) + 1; addXP(15); }
  save();
  const steps = stepsOf(lv, u); const i = steps.indexOf(k);
  return steps[i + 1] ?? null;
}
