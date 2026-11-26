"""Đo độ lớn (LUFS, chuẩn EBU R128) của mẫu ngẫu nhiên file âm thanh trong app. Chạy: python3 content/check_audio.py [số mẫu]
Đạt khi mọi nhóm có trung vị ≈ -16 LUFS và độ lệch chuẩn ≤ 1,5 dB, không file nào chạm 0 dBFS."""
import random, re, statistics as st, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
A = Path(__file__).resolve().parent.parent / "app" / "public" / "audio"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 120
def lufs(p):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", r); pk = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)
    return float(i[-1]), float(pk[-1])
ok = True
for g in ["w", "s", "c", "x"]:
    files = sorted((A / g).glob("*.mp3"))
    if not files: continue
    random.seed(1); sample = random.sample(files, min(N, len(files)))
    with ThreadPoolExecutor(4) as ex: vals = list(ex.map(lufs, sample))
    I = [v[0] for v in vals if v[0] > -60]; P = [v[1] for v in vals]
    med = st.median(I); spread = max(abs(x - med) for x in I)
    good = abs(med + 16) <= 1.5 and st.pstdev(I) <= 1.5 and max(P) <= -0.1   # mp3 có thể vọt đỉnh chút ít; miễn không chạm 0 dBFS (rè)
    ok &= good
    print(f"{'✔' if good else '✘'} {g}: {len(files)} file · trung vị {med:.1f} LUFS · độ lệch chuẩn {st.pstdev(I):.1f} dB · lệch xa nhất {spread:.1f} dB · đỉnh cao nhất {max(P):.1f} dBFS")
sys.exit(0 if ok else 1)
