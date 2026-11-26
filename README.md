# Mít Xué 学

App học tiếng Trung từ số 0 đến HSK 5 (đề cương HSK 3.0), giao diện tiếng Việt, có Hán Việt. Chạy offline bằng cách bấm đôi file, không cần cài đặt hay server.

- **Người học:** mở `MO MIT XUE.bat` trong thư mục app đã cài.
- **Người sửa app:** đọc [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (app ghép từ những gì) và [`docs/HOW-TO.md`](docs/HOW-TO.md) (sửa việc hay gặp ở đâu).

## Có gì

- Lộ trình: Giai đoạn 0 (phát âm, 4 bài kiểm tra) → HSK 1 (15 bài) → HSK 2 (11 bài) → HSK 3–5 (từ vựng + bài tập, giáo án đang soạn).
- Mỗi bài: từ mới theo phần ~8 từ · chữ Hán (xem nét, tập viết) · ngữ pháp · hội thoại · luyện tập · kiểm tra 20 câu.
- Ôn tập ngắt quãng bằng **FSRS**, giới hạn từ mới mỗi ngày.
- Phát âm: bảng pinyin có audio thật, luyện nghe thanh/âm khó, luyện nói có chấm thanh điệu theo cao độ giọng.
- Truyện đọc thêm, từ điển 3.661 từ, thống kê, sao lưu/khôi phục.

## Công nghệ

Svelte 5 · TypeScript · Vite 7 · ts-fsrs · hanzi-writer · Vitest · Playwright. Nội dung sinh bằng Python (`content/`).

## Lệnh

```bash
cd app
npm install
npm run dev      # chạy thử
npm run all      # kiểm kiểu + 32 test logic + build + test end-to-end
```

Bản build nằm ở `app/dist/`. Thư mục `app/public/audio/` (~60 MB) không nằm trong git: lấy từ bản đã cài (`MitXue/audio`) hoặc sinh lại bằng `content/build_data.py`.
