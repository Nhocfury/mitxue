# Phòng thí nghiệm chấm phát âm (B1)

Script dùng để **chọn mô hình và đo độ chính xác** trước khi đưa vào app. Không chạy trong app.
Kết luận và số liệu: `docs/PRON-ASR.md`.

| File | Việc |
|---|---|
| `ref.py` | Bản tham chiếu: fbank (kaldi) → mô hình CTC chữ Hán → log-prob. Đối chiếu khớp sherpa-onnx. |
| `rivals.py` | Bảng "chữ đại diện" cho mỗi âm tiết + thanh (dùng cho cách chấm bằng đối thủ). |
| `scorer.py` | Cách 1: CTC chữ Hán + so với đối thủ (khác thanh / âm gần / bỏ sót). **Bị loại.** |
| `kws2.py` | Cách 2: mô hình pinyin (KWS 3.3M) nhận dạng ra phụ âm đầu + vần có thanh → căn với pinyin đích. **Được chọn.** |
| `syl.py` | Ghép audio âm tiết thành câu (thử nhanh lỗi thanh nhân tạo). |
| `evalset.py` | Sinh bộ đánh giá: 120 câu TTS đúng, 240 câu TTS sai 1 chữ (120 sai thanh, 120 sai âm), 200 từ người thật đọc. |
| `kws2eval.py` | Chạy cách 2 với các biến thể (greedy / beam / gợi ý câu đích) và in bảng số liệu. |
| `poc/entry.js` | Trang thử trong trình duyệt: sherpa-onnx WASM (@sherpaw/asr) + mô hình base64, chạy được qua `file://`. |
| `poc/run.py` | So kết quả trình duyệt với Python trên toàn bộ bộ đánh giá. |

Chạy lại:

```bash
cd content/asr_lab
python3 evalset.py      # ~5 phút, sinh ev/
python3 kws2eval.py     # bảng so sánh
```

Cần: `pip install sherpa-onnx onnxruntime kaldi-native-fbank sentencepiece pypinyin soundfile` + ffmpeg.
Mô hình tải vào `content/.sources/models/` (xem `docs/PRON-ASR.md`).
