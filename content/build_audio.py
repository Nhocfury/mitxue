"""
BỘ TẠO & CHUẨN HÓA ÂM THANH cho Mít Xué.  Chạy sau build_data.py:

    python3 content/build_audio.py

Làm 4 việc:
 1. Đọc nguyên câu (bài học + truyện) bằng TTS offline (sherpa-onnx) → app/public/audio/c/<mã>.mp3.
    Có ngữ điệu, biến điệu thật, không ghép từng từ. Hai giọng:
      - Matcha "zh-baker" (giọng nữ, dữ liệu Biaobei: chỉ dùng phi thương mại), giọng chính;
      - MeloTTS zh_en (MIT), dự phòng khi Matcha đọc sai.
    Câu trùng y một từ HSK (谢谢！, 星期一…) thì dùng luôn audio người thật của từ đó.
 2. Đọc các từ ngoài đề cương HSK (extra.py) → app/public/audio/x/<mã>.mp3
 3. Chuẩn hóa ĐỘ LỚN mọi file (từ, âm tiết, câu) về cùng mức -16 LUFS, đỉnh ≤ -2 dBTP
    (đo chuẩn EBU R128; tăng/giảm cả file một lượng, limiter chỉ chặn đỉnh nhọn) → mono 22,05 kHz.
 4. Kiểm tra: nhận dạng giọng nói (ASR Paraformer) nghe lại từng câu vừa tạo, so PINYIN với câu gốc
    (他/她/它 đọc giống nhau nên không tính là sai). Câu sai nhiều ghi vào content/audio_report.txt.
Sinh thêm app/public/data/audio-index.js (bảng tra câu/từ → tên file).

Bộ nhớ đệm ở content/.cache/ (tts/, norm/): chạy lại chỉ làm phần mới/đổi.
Cần: pip install sherpa-onnx soundfile numpy; ffmpeg. Mô hình tải từ GitHub (xem MODELS bên dưới)
vào content/.sources/models/.
"""
import hashlib, json, os, re, shutil, subprocess, sys, tarfile, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent / "app" / "public"
SRC = Path(os.environ.get("MITXUE_SRC", ROOT / ".sources"))
CACHE = ROOT / ".cache"
MODELS_DIR = SRC / "models"
H = SRC / "hsk30" / "New HSK (2025)"
RAW_SYL = SRC / "audio_s_raw"          # bản gốc audio âm tiết (giữ nguyên, không sửa)

TARGET_I, TARGET_TP, TARGET_LRA = -16.0, -2.0, 11.0   # đỉnh -2 dBTP: chừa chỗ cho mp3 vọt đỉnh
SPEED = 0.9                             # đọc chậm hơn chút cho người học
MODELS = {
    "matcha-icefall-zh-baker": "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-zh-baker.tar.bz2",
    "vits-melo-tts-zh_en": "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-melo-tts-zh_en.tar.bz2",
    "sherpa-onnx-paraformer-zh-small-2024-03-09": "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-small-2024-03-09.tar.bz2",
}
VOCODER = "https://github.com/k2-fsa/sherpa-onnx/releases/download/vocoder-models/vocos-22khz-univ.onnx"
ENGINES = ("matcha", "melo")            # thứ tự ưu tiên
MAX_ERR = 0.15                          # sai quá 15% âm tiết thì thử cách khác / ghi báo cáo
JOBS = max(1, (os.cpu_count() or 2))

def h10(s: str) -> str: return hashlib.md5(s.encode("utf8")).hexdigest()[:10]
def han(s: str) -> str: return "".join(re.findall(r"[一-鿿]", s))

def ensure_models():
    if not (MODELS_DIR / "vocos-22khz-univ.onnx").exists():
        MODELS_DIR.mkdir(parents=True, exist_ok=True); urllib.request.urlretrieve(VOCODER, MODELS_DIR / "vocos-22khz-univ.onnx")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    for name, url in MODELS.items():
        if (MODELS_DIR / name).exists(): continue
        print("tải mô hình", name); tmp = MODELS_DIR / (name + ".tar.bz2")
        urllib.request.urlretrieve(url, tmp)
        with tarfile.open(tmp) as t: t.extractall(MODELS_DIR)
        tmp.unlink()

# ---------------------------------------------------------------- chuẩn hóa độ lớn
def loud_measure(src: Path) -> dict | None:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af",
                        f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    return json.loads(m.group(0)) if m else None

def normalize(src: Path, dst: Path) -> None:
    """Đưa file về -16 LUFS (tuyến tính, 2 lượt). Có bộ đệm theo nội dung file gốc."""
    key = hashlib.sha1(src.read_bytes() + f"{TARGET_I}{TARGET_TP}v3".encode()).hexdigest()
    cached = CACHE / "norm" / (key + ".mp3")
    if not cached.exists():
        cached.parent.mkdir(parents=True, exist_ok=True)
        m = loud_measure(src)
        enc = ["-ar", "22050", "-ac", "1", "-c:a", "libmp3lame", "-q:a", "5"]
        if m and float(m["input_i"]) > -60:
            # Tăng/giảm đúng số dB cho tới -16 LUFS, rồi bộ hạn biên (limiter) chỉ chặn vài đỉnh nhọn.
            # (loudnorm tuyến tính không tăng được file nhiều đỉnh nhọn như giọng TTS → câu bị nhỏ hơn từ.)
            gain = TARGET_I - float(m["input_i"])
            af = f"volume={gain:.2f}dB,alimiter=limit={10 ** ((TARGET_TP - 0.5) / 20):.3f}:attack=2:release=40:level=false"
        else:   # file quá ngắn/quá nhỏ để đo LUFS: chuẩn theo đỉnh
            af = "dynaudnorm=p=0.84:m=20"
        tmp = cached.with_suffix(".tmp.mp3")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-af", af, *enc, str(tmp)], check=True)
        tmp.rename(cached)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(cached, dst)

# ---------------------------------------------------------------- đọc bằng TTS + kiểm bằng ASR
_tts = _asr = None
_tts = {}
def tts_model(engine: str):
    if engine not in _tts:
        import sherpa_onnx as so
        if engine == "melo":
            d = MODELS_DIR / "vits-melo-tts-zh_en"
            m = so.OfflineTtsModelConfig(vits=so.OfflineTtsVitsModelConfig(
                model=str(d / "model.onnx"), lexicon=str(d / "lexicon.txt"), tokens=str(d / "tokens.txt"), dict_dir=str(d / "dict")), num_threads=JOBS)
        else:
            d = MODELS_DIR / "matcha-icefall-zh-baker"
            m = so.OfflineTtsModelConfig(matcha=so.OfflineTtsMatchaModelConfig(
                acoustic_model=str(d / "model-steps-3.onnx"), vocoder=str(MODELS_DIR / "vocos-22khz-univ.onnx"),
                lexicon=str(d / "lexicon.txt"), tokens=str(d / "tokens.txt"), dict_dir=str(d / "dict")), num_threads=JOBS)
        _tts[engine] = so.OfflineTts(so.OfflineTtsConfig(model=m, max_num_sentences=1,
            rule_fsts=",".join(str(d / f) for f in ["date.fst", "phone.fst", "number.fst"])))
    return _tts[engine]

def asr_model():
    global _asr
    if _asr is None:
        import sherpa_onnx
        d = MODELS_DIR / "sherpa-onnx-paraformer-zh-small-2024-03-09"
        _asr = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=str(d / "model.int8.onnx"), tokens=str(d / "tokens.txt"), num_threads=JOBS)
    return _asr

def transcribe(path: Path) -> str:
    import numpy as np
    pcm = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    pad = np.zeros(8000, dtype=np.float32)            # 0,5 s lặng hai đầu: ASR lỗi với câu quá ngắn
    wave = np.concatenate([pad, np.frombuffer(pcm, dtype=np.float32), pad])
    s = asr_model().create_stream(); s.accept_waveform(16000, wave); asr_model().decode_stream(s)
    return s.result.text

def py(s: str) -> list[str]:
    from pypinyin import lazy_pinyin, Style
    return lazy_pinyin(han(s), style=Style.TONE3, neutral_tone_with_five=True)

def cer(ref: str, hyp: str) -> float:
    """Tỉ lệ sai âm tiết (Levenshtein trên pinyin có thanh / số âm tiết câu gốc)."""
    a, b = py(ref), py(hyp)
    if not a: return 0.0
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        prev, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (ca != cb))
    return d[len(b)] / len(a)

def synth(text: str, speed: float = SPEED, engine: str = "melo") -> Path:
    """Đọc 1 câu/từ → file wav trong bộ đệm. Không đổi nội dung thì không đọc lại."""
    import soundfile as sf
    key = text + "|" + str(speed) + ("" if engine == "melo" else "|" + engine)
    out = CACHE / "tts" / f"{h10(key)}.wav"
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        a = tts_model(engine).generate(text, sid=0, speed=speed)
        sf.write(out, a.samples, a.sample_rate)
    return out

# ---------------------------------------------------------------- chương trình chính
def load_data():
    t = (APP / "data" / "data.js").read_text(encoding="utf8")
    return json.loads(t[t.index("{"): t.rindex("}") + 1])

def main():
    ensure_models()
    D = load_data()

    # 1) audio từ HSK: lấy từ nguồn gốc rồi chuẩn hóa (tên file giữ như data.js)
    by_file = {f: c for c, f in D["audio"].items()}
    jobs = [(H / "Audio" / f"cmn-{c}.mp3", APP / "audio" / "w" / f) for f, c in by_file.items()]
    # 2) audio âm tiết: bản gốc cất ở .sources/audio_s_raw (lần đầu chép từ app)
    if not RAW_SYL.exists():
        shutil.copytree(APP / "audio" / "s", RAW_SYL)
    jobs += [(p, APP / "audio" / "s" / p.name) for p in sorted(RAW_SYL.glob("*.mp3"))]

    # 3) câu + từ ngoài HSK: đọc bằng TTS
    sents = []
    for L in D["lessons"]:
        sents += [s["zh"] for s in L["dialogue"]] + [s["zh"] for g in L["grammar"] for s in g["ex"]]
    for st in D["stories"]:
        sents += [s["zh"] for s in st["lines"]]
    sents = list(dict.fromkeys(sents))
    extra = [w for w in D["extra"] if w not in D["audio"]]
    print(f"câu: {len(sents)} · từ ngoài HSK: {len(extra)} · file cần chuẩn hóa: {len(jobs)}")

    report, sent_map, extra_map = [], {}, {}
    for i, text in enumerate(dict.fromkeys(sents + extra)):
        word = han(text)
        if word in D["audio"] and text not in extra:   # câu = đúng 1 từ HSK → audio người thật
            wav, e = H / "Audio" / f"cmn-{word}.mp3", 0.0
        else:
            best = None
            for sp in (SPEED, 0.8):
                for eng in ENGINES:                    # Matcha trước; sai thì Melo; rồi đọc chậm hơn
                    w = synth(text, sp, eng); err = cer(text, transcribe(w))
                    if best is None or err < best[1]: best = (w, err)
                    if err <= MAX_ERR: break
                if best[1] <= MAX_ERR: break
            wav, e = best
        if e > MAX_ERR: report.append(f"{e:.2f}\t{text}\t(ASR nghe: {transcribe(wav)})")
        name = h10(text) + ".mp3"
        if text in extra: jobs.append((wav, APP / "audio" / "x" / name)); extra_map[text] = name
        if text in sents: jobs.append((wav, APP / "audio" / "c" / name)); sent_map[text] = name   # vừa là từ vừa là câu → cả hai
        if (i + 1) % 50 == 0: print(f"  đã đọc {i + 1}/{len(sents) + len(extra)}")

    # 4) chuẩn hóa tất cả (song song)
    for d in ("c", "x"): shutil.rmtree(APP / "audio" / d, ignore_errors=True)
    with ThreadPoolExecutor(JOBS) as ex:
        for k, _ in enumerate(ex.map(lambda j: normalize(*j), jobs), 1):
            if k % 500 == 0: print(f"  chuẩn hóa {k}/{len(jobs)}")

    (APP / "data" / "audio-index.js").write_text(
        "window.AUDIO_X=" + json.dumps({"sent": sent_map, "extra": extra_map}, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf8")
    (ROOT / "audio_report.txt").write_text(
        "# Câu ASR nghe khác chữ gốc (tỉ lệ sai > 15%). Nên nghe lại bằng tai.\n" + "\n".join(report) + "\n", encoding="utf8")
    print(f"xong · câu {len(sent_map)} · từ ngoài HSK {len(extra_map)} · cần nghe lại {len(report)} câu (content/audio_report.txt)")

if __name__ == "__main__":
    main()
