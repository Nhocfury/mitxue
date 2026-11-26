# Lịch sử phiên bản

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
