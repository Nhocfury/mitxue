# Chấm phát âm bằng AI: nghiên cứu (B1)

> Ngày 27/11/2026. Mục tiêu: chấm **từng âm tiết** (đúng / sai thanh / sai âm / thiếu) khi em đọc to,
> chạy **ngay trong trình duyệt, offline, mở bằng `file://`**, không cần server.

## 1. Kết luận

**Chọn:** mô hình `sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01` (k2-fsa, 3,3 triệu tham số, ~5 MB int8)
dùng như một bộ nhận dạng ra **pinyin** (phụ âm đầu + vần có dấu thanh), chạy bằng sherpa-onnx WebAssembly.
Kết quả nhận dạng được căn với pinyin của câu mẫu để đánh dấu từng âm tiết.

| Cách | Bắt lỗi thanh | Bắt lỗi âm | Báo nhầm (câu đúng) | Báo nhầm (từ người thật) | Kích thước |
|---|---|---|---|---|---|
| Web Speech API (Edge) | không đo được offline | | | | 0 (cần mạng, gửi giọng lên Microsoft) |
| CTC chữ Hán + đối thủ (cách của chilearn) | 24% | 34% | 1,1% | 12,9% | 63 MB |
| **Mô hình pinyin, greedy** | **68%** | **81%** | 2,5% | 10,4% | **5 MB** |
| Mô hình pinyin + gợi ý câu đích 1.0 | 58% | 73% | 2,4% | 6,2% | 5 MB |

(Bộ đánh giá: 120 câu đúng, 240 câu sai 1 chữ do TTS đọc, 200 từ HSK người thật đọc. "Đúng loại": khi đã bắt được thì gọi đúng là lỗi thanh 85%, lỗi âm 100%.)

## 2. Vì sao không dùng mô hình chữ Hán

Mô hình nhận dạng ra **chữ Hán** học cả ngữ cảnh, nên tự "sửa" lỗi của người nói:
nói 很**号** (hào) vẫn ra 很**好**, nói 你们学校有多少**血**生 vẫn ra 学生. Thử nghiệm với âm tiết ghép rời thì bắt tốt,
nhưng với câu nói liền thì gần như không thấy lỗi thanh (24%). Đây cũng là điều tác giả "Ear" (simedw.com) cảnh báo.

Mô hình pinyin xuất ra token như `x`, `ué`, `sh`, `ēng`: thanh nằm ngay trong token, nên đọc sai thanh là ra token khác.

## 3. Chạy trong trình duyệt

- Bản npm `sherpa-onnx` chỉ chạy Node (NODERAWFS). Dùng gói **`@sherpaw/asr` 0.3.0** (Apache-2.0): bản build WASM cho trình duyệt của sherpa-onnx, hệ thống file trong bộ nhớ (MEMFS).
- `file://` không cho `fetch`, nên **wasm (13,8 MB) và mô hình (5 MB) được nhúng base64 trong file `.js`** (giống `data.js`), truyền vào bằng `wasmBinary` và `FS_createDataFile`.
- Đo trong Chromium (file://): khởi động 1,8–2,2 s (chỉ 1 lần), chấm 1 câu **trung vị 124 ms**, chậm nhất 0,4 s; bộ nhớ ~90 MB.
- Kết quả trình duyệt trùng Python **544/560** mẫu (chênh lệch nhỏ do phiên bản sherpa khác nhau).
- Chỉ tải khi mở phần luyện nói (lazy), không làm chậm app.

## 4. Luật chấm (đã kiểm)

- **儿 hóa**: 哪儿, 一点儿… không chấm riêng chữ 儿.
- **Thanh nhẹ**: 个们子么的了吗呢吧着过得地 và âm tiết thanh nhẹ: chấp nhận mọi thanh.
- **Biến điệu**: 3-3 → 2-3, 不 trước thanh 4 → bú, 一 → yí / yì: chấp nhận cả thanh gốc và thanh biến.
- Căn chuỗi bằng quy hoạch động; mỗi âm tiết ra `ok` / `tone` (đúng âm, sai thanh) / `sound` (sai phụ âm/vần) / `missed`.

## 5. Giới hạn (nói thật)

- Lỗi "đọc sai" trong bộ đánh giá là **TTS đọc chữ khác**, chưa phải người học thật. Cần Long đọc thử để chỉnh ngưỡng.
- Từ **một chữ đọc riêng** dễ bị nghe nhầm (báo nhầm ~10%). Nên ưu tiên chấm câu / từ 2 chữ trở lên, và nói "có thể" thay vì "sai".
- Mô hình có xu hướng ra **thanh gốc** của từ quen (你好 → nǐ hǎo) nên một số lỗi thanh ở cụm từ rất quen bị bỏ sót.
- Bản quyền: sherpa-onnx, @sherpaw/asr, mã icefall: Apache-2.0. Mô hình train trên **WenetSpeech** (dữ liệu chỉ cho nghiên cứu / phi thương mại): dùng cá nhân được, bán app thì phải đổi mô hình.

## 6. Tham khảo

- sherpa-onnx (k2-fsa): https://github.com/k2-fsa/sherpa-onnx
- Mô hình KWS: https://k2-fsa.github.io/sherpa/onnx/kws/pretrained_models/index.html
- @sherpaw/asr: https://github.com/sumimakito/sherpaw
- "A 9M-parameter Mandarin pronunciation tutor" (Ear): https://simedw.com/2026/01/31/ear-pronunication-via-ctc/
- chilearn (cách chấm bằng đối thủ): https://github.com/ChromMob/chilearn
