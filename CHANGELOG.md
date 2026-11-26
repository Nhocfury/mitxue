# Lịch sử phiên bản

## 1.5.0 (27/11/2026): Máy chấm phát âm

- **Đọc to có máy chấm**: nút 🎙️ ở từng câu hội thoại và câu hỏi "đọc to" trong bài kiểm tra. Em đọc xong im 1 giây là tự dừng; mỗi chữ tô **xanh** (đúng), **vàng** (sai thanh), **đỏ** (sai âm), gạch (thiếu), kèm "em: …" là máy nghe ra gì và lời nhận xét cụ thể.
- Chạy **offline trong trình duyệt** (sherpa-onnx WebAssembly + mô hình pinyin 3,3M ~5 MB), chỉ tải khi bấm 🎙️ lần đầu (~2 giây).
- Hiểu biến điệu (你好 ní hǎo, 不是 bú shì, 一), thanh nhẹ (的了吗…), 儿 hóa (哪儿).
- Luôn có nút tự chấm: micro hỏng hoặc máy nghe nhầm vẫn đi tiếp được.
- Dữ liệu: thêm pinyin từng chữ `sy` cho 988 câu, 3.657 từ. Sửa 得了 đọc **dé** (trước nhầm děi).
- Test: bộ chấm TypeScript khớp bản Python 560/560 mẫu; e2e micro giả.

## 1.4.0 (27/11/2026): HSK 3 đầy đủ

- Soạn xong giáo trình HSK 3 **bài 11–21**: hội thoại + 33 điểm ngữ pháp mới (为了, 关于/根据, 或者/还是, 其实, 又…又…, 一…也不, 遍/次, 难/好/容易 + V, 怎么办, 是不是, 用 + vật + V, 借给/跟…借, 咱们, 跟…见面, 让 + cảm xúc, 对…满意, 挺…的, 差不多/几乎/大概, 像…一样, 以为/认为, V + 成, 受到/得到, 又/再, 到处都, 以上/以下, 得 děi/应该/需要, 最好, 地).
- HSK 3 giờ cả 21 bài đều 6 bước.
- Pinyin: 得 đọc **děi** khi nghĩa "phải", 还给 đọc **huán**, số đầu câu ghép liền (Shíbā).
- 406 câu mới có audio đọc nguyên câu.

## 1.3.0 (26/11/2026): Giao diện tạo động lực

- **Hôm nay**: vòng mục tiêu phút học, chuỗi ngày + dải 7 ngày (✓ có học, ★ đủ mục tiêu), **3 nhiệm vụ ngày** (1 bước bài mới · 20 câu đúng · đủ phút) và **rương +50 XP** khi xong cả 3.
- **Lộ trình** thành con đường: bài lệch trái/phải, bài đang học nhấp nháy, mỗi bài có **1–3 sao** theo điểm kiểm tra (qua / ≥ 90% / 100%).
- **Bài tập**: đếm combo đúng liên tiếp (thưởng +5 XP ở mốc 5/10/15/20), tiếng hiệu ứng đúng/sai/hết bài, kết quả có sao + số XP kiếm được + kỷ lục combo.
- **Chúc mừng** giữa màn hình khi lên cấp, mở rương, đủ phút.
- **23:00** Mít nhắc tắt màn hình đi ngủ (1 lần/đêm, chỉ nhắc, không khóa app).
- Cài đặt: bật/tắt tiếng hiệu ứng.

## 1.2.0 (26/11/2026): HSK 3 (bài 1–10)

- HSK 3 có giáo trình đầy đủ cho **bài 1–10**: hội thoại, 30 điểm ngữ pháp (把, 被, 越…越, bổ ngữ khả năng, 只要…就, 只有…才…), nghĩa tiếng Việt cho cả 506 từ.
- Bài 11–21 tạm học theo kiểu từ vựng (4 bước) cho tới khi soạn xong.
- Số bước mỗi bài tính **theo từng bài** (`stepsOf(lv, u)`), không theo cả cấp nữa.
- Thêm từ ngoài đề cương HSK 3 (淋, 美元, 中秋节, 旱季…) và danh sách `PREVIEW` cho từ cấp cao dùng sớm (钥匙, 警察, 厉害…).
- 193 câu mới có audio đọc nguyên câu.

## 1.1.0 (26/11/2026): Âm thanh

- Mọi câu trong bài học và truyện có **file đọc nguyên câu** (TTS offline Matcha, dự phòng MeloTTS), có ngữ điệu, không ghép từng từ nữa.
- **Chuẩn hóa độ lớn** toàn bộ ~5.800 file về -16 LUFS: không còn file to file nhỏ (trước đây âm tiết nhỏ hơn từ ~13 dB).
- Từ ngoài đề cương HSK cũng có file đọc riêng.
- Kiểm tra tự động: máy nhận dạng giọng nói nghe lại từng câu; test đảm bảo câu nào cũng có file.
- Sửa: câu ví dụ im lặng khi giọng đọc của Edge lỗi.

## 1.0.0 (26/11/2026): Làm lại nền

- Viết lại toàn bộ bằng **Svelte 5 + TypeScript** (trước: JavaScript thuần, ghép HTML bằng chuỗi).
- Tách lõi logic (`src/lib/`) khỏi giao diện; thêm 32 test đơn vị và test end-to-end.
- Ôn tập chuyển từ SM-2 sang **FSRS** (ts-fsrs). Tiến độ bản cũ tự chuyển sang, giữ nguyên lịch ôn.
- Điều hướng theo địa chỉ `#/...`: F5 vẫn ở nguyên màn, nút Back dùng được.
- Câu hỏi là dữ liệu thuần, không nhúng HTML (an toàn và dễ test hơn).
- Sửa: bài sắp xếp câu không còn lấy câu có ngoặc kép (mất dấu khi xếp).
- Mã nguồn có git, tài liệu kiến trúc + công thức sửa.

## 0.4 (23/11/2026)
Khóa phát âm 4 bài, từ mới theo phần, giới hạn từ mới/ngày, HSK 2 đủ 11 bài, 7 truyện đọc, pinyin mờ dần, sao lưu.

## 0.3 (23/11/2026)
Sửa audio phát nhầm từ, màn "Hôm nay" một nút, bỏ EXE (mở bằng trình duyệt).

## 0.2
Lộ trình HSK 1 → 5, giáo án HSK 1, bài tập, kiểm tra, ôn tập, từ điển.

## 0.1
Phát âm: bảng pinyin, luyện nghe, luyện nói chấm thanh.
