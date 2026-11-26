#!/usr/bin/env bash
# Chạy mọi test e2e, in bảng tổng kết. Lỗi ở bất kỳ bộ nào → mã thoát khác 0.
# Dùng: bash tests/e2e/all.sh        (file://)    ·    bash tests/e2e/all.sh web   (giả lập Cloudflare)
cd "$(dirname "$0")/../.."
if [ "$1" = "web" ]; then T="sync_check pwa_check"; else T="run_e2e audio_check pron_check ux_check"; fi
fail=0
for t in $T; do
  out=$(python3 "tests/e2e/$t.py" 2>&1); code=$?
  ok=$(grep -c '✔' <<<"$out"); bad=$(grep -c '✘' <<<"$out")
  if [ $code -eq 0 ]; then echo "✅ $t: $ok đạt"; else echo "❌ $t: $ok đạt, $bad hỏng, mã thoát $code"; echo "$out" | tail -15; fail=1; fi
done
exit $fail
