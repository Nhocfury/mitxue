# Công thức sửa nhanh

Mỗi mục: muốn làm gì → sửa file nào → chạy lệnh gì. Sửa xong luôn chạy `npm run all` trong thư mục `app/`.

## Nội dung học

### Sửa nghĩa / pinyin một từ HSK 1–2
1. Mở `content/hsk1_words.py` (hoặc `hsk2_words.py`), tìm dòng `chữ|pinyin|nghĩa`, sửa.
2. Chạy `python3 content/build_data.py` → sinh lại `app/public/data/data.js`.
3. Chạy `python3 content/build_audio.py` → đọc câu mới, chuẩn hóa âm thanh (câu cũ không đọc lại).
4. Build lại app (`npm run build`).

### Sửa / thêm câu trong hội thoại, ví dụ ngữ pháp
- File `content/hsk1_lessons.py` / `hsk2_lessons.py`. Mỗi bài có `dialogue` (người nói, chữ Hán, nghĩa) và `grammar` (tiêu đề, công thức, giải thích HTML, ví dụ, lưu ý).
- Từ trọng tâm để đục lỗ điền từ: đặt trong ngoặc vuông, ví dụ `"我[是]学生。"`.
- Pinyin câu do máy sinh. Sai thì thêm vào bảng ghi đè trong `build_data.py` (tìm `'同学们': 'tóngxuémen'`).
- `build_data.py` in ra dòng `OOS ...` nếu câu dùng từ chưa học. Sửa câu, hoặc thêm từ vào `extra.py` kèm pinyin + nghĩa.

### Thêm giáo án HSK 3
1. Tạo `content/hsk3_words.py` (giống `hsk2_words.py`, chia bài theo chủ đề) và `content/hsk3_lessons.py` (giống `hsk2_lessons.py`).
2. Trong `build_data.py`: import 2 file mới, làm như khối HSK 2 (tìm `UNIT_WORDS2`, `UNITS2`), đổi `LEVEL_UNITS[3]`.
3. App **tự nhận**: cấp nào có giáo án thì bài có đủ 6 bước (`hasLesson()` trong `data.ts`). Không cần sửa giao diện.

### Âm thanh
- Sửa/thêm câu nào thì chạy lại `content/build_audio.py`. Chỉ câu mới bị đọc lại (có bộ đệm `content/.cache/`).
- Xem `content/audio_report.txt`: câu nào máy nhận dạng nghe khác chữ gốc thì nghe lại bằng tai. Đọc sai thì sửa cách viết câu, hoặc thêm dấu phẩy để ngắt nhịp.
- Đổi giọng/tốc độ/độ lớn: các hằng `SPEED`, `TARGET_I` trong `build_audio.py`.
- Kiểm độ lớn: `python3 content/check_audio.py`.

### Thêm truyện đọc
- `content/stories.py`: `lv` (cấp), `after` (mở sau bài số mấy), `lines`, `qs` (câu hỏi, 3 lựa chọn, chỉ số đáp án đúng).

## Luật học

| Muốn đổi | File | Chỗ |
|---|---|---|
| Điểm đạt bài / thi tổng / phần từ mới / bộ luyện tập | `app/src/lib/curriculum.ts` | `PASS_UNIT`, `PASS_LEVEL`, `PASS_CHUNK`, `PASS_SET` |
| Số từ mỗi phần | `curriculum.ts` | `CHUNK_SIZE` |
| Ngưỡng chặn từ mới khi dồn thẻ ôn | `curriculum.ts` | `REVIEW_GATE` |
| Mặc định số từ mới/ngày, phút/ngày | `app/src/lib/storage.ts` | `blankState()` (người dùng vẫn đổi được trong Cài đặt) |
| Mục tiêu nhớ của FSRS, học lại sau mấy phút | `app/src/lib/srs.ts` | `request_retention`, `RELEARN_MIN` |
| Bài kiểm tra cuối bài gồm câu gì | `app/src/lib/questions.ts` | `unitTestQs()` |
| Đề thi tổng | `questions.ts` | `levelTestQs()` |
| Khóa phát âm 4 bài | `app/src/lib/pron.ts` | `PRON_COURSE` |
| Lời Mít | `app/src/lib/startup.ts` (lời chào), `ui.svelte.ts` (`OK_LINES`, `BAD_LINES`) và các màn gọi `say()` |

## Giao diện

- **Màu, cỡ chữ, sáng/tối**: `app/src/styles/app.css`. Biến màu (`--red`, `--t1`…`--t4` cho 4 thanh) ở đầu file.
- **Thêm một màn hình mới**:
  1. Tạo `app/src/screens/TenMan.svelte`.
  2. Thêm route trong `app/src/lib/router.svelte.ts` (kiểu `Route`, `parse`, `href`).
  3. Thêm 1 dòng `{:else if r.name === ...}` trong `app/src/App.svelte`.
- **Thêm dạng câu hỏi mới**:
  1. Thêm kiểu + hàm `qXxx()` trong `questions.ts`.
  2. Nếu cần giao diện riêng: tạo `components/quiz/XxxView.svelte` (nhận `q`, gọi `onAnswered(đúng/sai, nộiDungXemLại)`), rồi thêm nhánh trong `Quiz.svelte`.

## Chạy, kiểm thử, cài đặt

```bash
cd app
npm install            # lần đầu
npm run dev            # chạy thử có tự tải lại: mở http://localhost:5173
npm run all            # kiểm kiểu + test logic + build + test bấm thật
```

**Cài lên máy Long:** chép `app/dist/` đè vào `E:\Long\05_Code\T O O L S\MitXue\`. Thư mục `audio/` không đổi thì không cần chép lại. Tiến độ không mất vì nằm trong trình duyệt.

**Gỡ lỗi trên máy Long:** mở app, bấm F12 → Console:
- `mitxue.S` xem toàn bộ tiến độ
- `mitxue.S.settings.unlockAll = true; mitxue.save()` mở khóa tất cả bài
- `mitxue.go("#/road")` chuyển màn

## Lấy lại dữ liệu gốc (khi cần chạy `build_data.py` trên máy mới)

Tải 4 nguồn vào `content/.sources/`:

| Thư mục | Nguồn |
|---|---|
| `hsk30/` | github.com/krmanik/HSK-3.0 (cần `New HSK (2025)/` và thư mục audio) |
| `cedict/cedict_ts.u8` | CC-CEDICT (mdbg.net) |
| `hv/hanviet.csv` | danh sách Hán Việt – pinyin (hanviet-pinyin-wordlist) |
| `mmah/dictionary.txt`, `graphics.txt` | github.com/skishore/makemeahanzi |

Python cần: `pip install pypinyin opencc-python-reimplemented sherpa-onnx soundfile numpy` và `ffmpeg`. Mô hình đọc (Matcha zh-baker, MeloTTS) và nhận dạng giọng nói (Paraformer) tự tải từ GitHub vào `content/.sources/models/` lần đầu chạy `build_audio.py`.
