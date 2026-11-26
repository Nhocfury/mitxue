# Kiến trúc Mít Xué (v1.0)

Tài liệu này giải thích app được ghép từ những phần nào, dữ liệu chạy đi đâu, và mỗi file làm gì. Đọc xong phần 1–3 là đủ hình dung; phần 4–7 để tra khi cần sửa.

> Các sơ đồ viết bằng **Mermaid** (một cách viết sơ đồ bằng chữ). VS Code (cài extension "Markdown Preview Mermaid Support") và GitHub đều hiển thị được. Bản hình vẽ sẵn: [`architecture.svg`](architecture.svg).

---

## 1. Bức tranh tổng thể

Mít Xué là một **web app tĩnh chạy offline** (static web app): chỉ có frontend (FE), **không có backend (BE)**, không cần server. Bấm đôi `index.html` (hoặc `MO MIT XUE.bat`) là trình duyệt mở app từ ổ đĩa (giao thức `file://`).

Có 3 khối tách biệt:

| Khối | Thư mục | Viết bằng | Chạy khi nào | Sinh ra |
|---|---|---|---|---|
| **Nội dung** (content pipeline) | `content/` | Python | Khi sửa bài học, từ vựng | `app/public/data/*.js` |
| **Âm thanh** (audio pipeline) | `content/build_audio.py` | Python + ffmpeg + sherpa-onnx | Sau khi sửa nội dung | `app/public/audio/{w,s,c,x}/`, `data/audio-index.js` |
| **App** (frontend) | `app/src/` | TypeScript + Svelte 5 | Khi sửa giao diện, logic | `app/dist/` (bản build) |
| **Bản cài** (deploy) | `T O O L S\MitXue\` trên máy Long | n/a | Khi học | Tiến độ trong trình duyệt (localStorage) |

```mermaid
flowchart LR
  subgraph SRC["Nguồn dữ liệu gốc (tải về content/.sources)"]
    H[Đề cương HSK 3.0<br/>krmanik/HSK-3.0]
    C[Từ điển CC-CEDICT]
    V[Hán Việt<br/>hanviet.csv]
    M[Nét chữ<br/>Make Me a Hanzi]
  end
  subgraph CONTENT["content/ (Python)"]
    L1[hsk1_words.py · hsk1_lessons.py<br/>hsk2_words.py · hsk2_lessons.py<br/>stories.py · extra.py]
    B[build_data.py]
  end
  subgraph APP["app/ (Svelte + TypeScript)"]
    P[public/data/data.js<br/>public/data/strokes.js<br/>public/data/pinyin.js<br/>public/audio/]
    S[src/ code app]
    D[dist/ bản build]
  end
  subgraph PC["Máy Long: E:\Long\05_Code\T O O L S\MitXue"]
    E[index.html + app/ + data/ + audio/]
    LS[(localStorage<br/>trình duyệt Edge)]
  end
  H & C & V & M --> B
  L1 --> B
  B --> P
  P --> D
  S -->|npm run build| D
  D -->|cài đặt / cập nhật| E
  E <-->|lưu tiến độ| LS
```

**Vì sao không có backend?** Long học một mình trên một máy, nên lưu tiến độ ngay trong trình duyệt là đủ, chạy được cả khi mất mạng. Khi cần đồng bộ điện thoại ↔ laptop (bước 2), chỉ cần thay 2 hàm trong `app/src/lib/storage.ts` (xem mục 6).

---

## 1b. Âm thanh

```mermaid
flowchart LR
  W[Audio từ HSK<br/>hsk30/Audio] --> N
  SY[Audio âm tiết gốc<br/>.sources/audio_s_raw] --> N
  T[Câu trong bài + truyện<br/>từ ngoài HSK] --> TTS[Matcha zh-baker đọc câu<br/>dự phòng MeloTTS<br/>sherpa-onnx, offline] --> ASR{ASR nghe lại<br/>sai > 15% pinyin?}
  ASR -->|đúng| N
  ASR -->|sai| R[thử tốc độ khác,<br/>ghi audio_report.txt] --> N
  N[Chuẩn hóa -16 LUFS<br/>đỉnh ≤ -2 dBTP<br/>mono 22,05 kHz] --> OUT[app/public/audio/<br/>w · s · c · x]
```

| Thư mục | Nội dung | Nguồn |
|---|---|---|
| `audio/w/` | 3.557 từ HSK | Bộ audio của đề cương HSK 3.0 |
| `audio/s/` | 1.627 âm tiết × thanh (bảng pinyin, luyện nghe) | Bản v0.1, gốc cất ở `.sources/audio_s_raw` |
| `audio/c/` | Mọi câu trong bài học và truyện | Matcha zh-baker (giọng nữ; dữ liệu Biaobei chỉ dùng phi thương mại), dự phòng MeloTTS (MIT); đọc chậm 0,9×. Câu trùng 1 từ HSK dùng audio người thật |
| `audio/x/` | Từ ngoài đề cương dùng trong câu (extra.py) | Matcha / MeloTTS |

**Thứ tự phát câu** (`playSentence` trong `audio.ts`): file `audio/c/` → giọng đọc của trình duyệt (Edge) → ghép audio từng từ. Cái sau chỉ dùng khi cái trước không có hoặc lỗi.

**Độ lớn:** mọi file được đưa về **-16 LUFS** (chuẩn EBU R128, mức thường dùng cho giọng nói/podcast) bằng `loudnorm` 2 lượt, tăng giảm tuyến tính nên không méo tiếng. Kiểm bằng `python3 content/check_audio.py`.

## 1c. Chấm phát âm (máy nghe em đọc)

```mermaid
flowchart LR
  MIC[Micro] -->|MediaRecorder| MIC2[lib/mic.ts<br/>tự dừng khi im 1 s<br/>đổi về 16 kHz]
  MIC2 --> ENG[pron/engine.js<br/>sherpa-onnx WASM<br/>mô hình pinyin 3.3M]
  ENG -->|token: x · ué · sh · ēng| SC[lib/pronscore.ts<br/>căn với pinyin từng chữ 'sy']
  D[data.js: sy] --> SC
  SC --> UI[PronCheck.svelte<br/>xanh / vàng / đỏ]
```

- **Lazy**: `lib/asr.svelte.ts` chỉ chèn 3 thẻ `<script>` (`pron/wasm.js` 18 MB, `pron/model.js` 6,7 MB, `pron/engine.js`) khi em bấm 🎙️ lần đầu. Wasm + mô hình nằm dạng base64 trong `.js` vì `file://` không cho `fetch`.
- **Dùng ở**: câu hỏi "đọc to" trong kiểm tra (`SpeakView`) và nút 🎙️ từng câu hội thoại (`Dialogue`).
- **Đạt** (SpeakView): từ 1–2 chữ phải đúng hết, dài hơn ≥ 80%. Luôn có nút tự chấm (máy có thể nghe nhầm / micro hỏng).
- Số liệu, lý do chọn mô hình, giới hạn: `docs/PRON-ASR.md`. Đóng gói lại: `npm run build:pron`.

## 1d. Đồng bộ nhiều máy + bản trên mạng

```mermaid
sequenceDiagram
  participant A as Máy A (app)
  participant API as /api/sync (Pages Function)
  participant KV as Workers KV
  A->>API: GET (X-Sync-Key: mã)
  API->>KV: đọc s:sha256(mã)
  API-->>A: {rev, state}
  A->>A: mergeState(máy A, bản mạng)
  A->>API: PUT {baseRev: rev, state: đã gộp}
  alt rev vẫn vậy
    API->>KV: ghi rev+1
  else máy khác vừa ghi
    API-->>A: 409 + bản mới → gộp lại, gửi lại
  end
```

- `lib/merge.ts`: phép gộp giao hoán, lũy đẳng, không mất tiến độ (thẻ ôn: ôn nhiều hơn thắng; bài/cấp: xong ở đâu cũng tính; XP: theo máy `xpBy`, tổng = cộng; cài đặt: `settingsAt` mới nhất).
- `lib/sync.svelte.ts`: mã đồng bộ (100 bit), lúc mở app + sau khi lưu (gom ≥ 2 phút) + khi ẩn tab. Link `?sync=MÃ` (mã QR) tự nối.
- `functions/api/sync.js`: Cloudflare Pages Function, KV binding `SYNC`, CORS mở cho bản `file://`.
- Bản trên mạng là PWA: `public/manifest.webmanifest`, `public/sw.js` (vỏ app theo phiên bản build, audio/bộ chấm lưu dần), `public/_headers`.
- Cách đưa lên: `docs/DEPLOY.md`.

## 2. Bên trong app: các lớp (layers)

Code app chia 3 lớp, lớp trên chỉ gọi lớp dưới, không gọi ngược:

```mermaid
flowchart TB
  subgraph UI["Lớp giao diện: src/screens/, src/components/ (.svelte)"]
    direction LR
    Home & Road & Lesson & Review & Dict & Stats & Pron & Story
    Quiz[components/quiz/Quiz.svelte<br/>bộ chạy bài tập dùng chung]
  end
  subgraph LOGIC["Lớp logic: src/lib/ (.ts thuần, có test)"]
    direction LR
    curriculum[curriculum.ts<br/>lộ trình, mở khóa]
    questions[questions.ts<br/>sinh câu hỏi]
    srs[srs.ts<br/>FSRS ôn tập]
    pron[pron.ts<br/>phát âm, chấm thanh]
    progress[progress.ts<br/>XP, streak, thời gian]
    audio[audio.ts]
    pinyin[pinyin.ts]
    backup[backup.ts]
  end
  subgraph DATA["Lớp dữ liệu"]
    direction LR
    data[data.ts<br/>đọc window.DATA, chỉ đọc]
    state[state.svelte.ts<br/>S = tiến độ, reactive]
    storage[storage.ts<br/>localStorage + chuyển bản cũ]
  end
  UI --> LOGIC --> DATA
  state --> storage
```

- **Lớp dữ liệu** biết dữ liệu nằm ở đâu và trông thế nào.
- **Lớp logic** là luật học: khi nào mở bài, ra câu hỏi gì, khi nào ôn. Không đụng tới giao diện, nên test được bằng `npm test`.
- **Lớp giao diện** chỉ hiển thị và gọi logic.

Nhờ vậy sửa luật (ví dụ điểm đạt 80% → 75%) chỉ cần đổi 1 dòng trong `curriculum.ts`, không phải lùng trong giao diện.

---

## 3. Luồng học của Long

```mermaid
flowchart LR
  A[Mở app] --> H{Hôm nay<br/>nextAction}
  H -->|chưa học phát âm| P0[Giai đoạn 0<br/>4 bài kiểm tra phát âm ≥80%]
  H -->|≥10 thẻ đến hạn| R[Ôn tập FSRS]
  H -->|còn lại| U[Bài kế tiếp]
  P0 --> U
  subgraph U[Một bài học]
    direction TB
    V[① Từ mới<br/>phần ~8 từ, luyện nhanh ≥70%] --> C[② Chữ Hán] --> G[③ Ngữ pháp] --> D[④ Hội thoại] --> Pr[⑤ Luyện tập<br/>mỗi bộ ≥70%] --> T[⑥ Kiểm tra 20 câu ≥80%]
  end
  V -->|từ vào lịch ôn| R
  T -->|đạt| N[Mở bài sau]
  N -->|hết bài của cấp| LT[Thi tổng 40 câu ≥80%] --> NL[Mở cấp sau]
```

- Bài HSK 1–2 có đủ 6 bước. Bài HSK 3–5 (chưa có giáo án) chỉ có ① ② ⑤ ⑥.
- Mỗi ngày tối đa `settings.newPerDay` từ mới (mặc định 10). Quá 50 thẻ chờ ôn thì chặn từ mới, bấm "Vẫn học tiếp hôm nay" để bỏ qua.

### Ôn tập FSRS

```mermaid
stateDiagram-v2
  [*] --> Moi: qua phần từ mới (intro)
  Moi --> On: ôn đúng (4h sáng hôm sau)
  On --> On: đúng → giãn xa dần (3 → 14 → 40… ngày)
  On --> HocLai: sai → tính 1 lần quên, hỏi lại sau 10 phút
  Moi --> HocLai: sai → hỏi lại sau 10 phút
  HocLai --> On: đúng
```

Thư viện **ts-fsrs** (cùng thuật toán với Anki bản mới) tính khoảng cách, mục tiêu lúc ôn còn nhớ 90%. App bổ sung 2 luật: làm đúng một từ **chưa đến hạn** (trong bài tập) thì không đổi lịch; sai thì hẹn lại sau 10 phút trong ngày.

---

## 4. Bản đồ thư mục

```
mitxue/                         ← repo git
├─ README.md                    cách chạy, lệnh hay dùng
├─ CHANGELOG.md                 lịch sử phiên bản
├─ docs/
│  ├─ ARCHITECTURE.md           (file này)
│  ├─ HOW-TO.md                 công thức sửa những việc hay gặp
│  └─ architecture.svg          sơ đồ hình
├─ content/                     NỘI DUNG (Python)
│  ├─ build_data.py             gom mọi thứ → app/public/data + audio/w
│  ├─ hsk1_words.py             300 từ HSK 1 chia 15 bài (chữ|pinyin|nghĩa)
│  ├─ hsk1_lessons.py           15 bài: hội thoại, ngữ pháp, mẹo
│  ├─ hsk2_words.py             203 từ HSK 2 chia 11 bài
│  ├─ hsk2_lessons.py           11 bài HSK 2
│  ├─ stories.py                truyện đọc thêm
│  ├─ extra.py                  từ ngoài đề cương dùng trong câu + tên bộ thủ
│  ├─ build_audio.py            đọc câu bằng TTS, chuẩn hóa độ lớn mọi file
│  ├─ check_audio.py            đo độ lớn để kiểm tra
│  ├─ audio_report.txt          câu ASR nghe khác chữ gốc (cần nghe lại)
│  └─ .sources/                 dữ liệu gốc tải về (không đưa vào git)
└─ app/                         APP (Svelte 5 + TypeScript + Vite)
   ├─ index.html                khung trang, nạp data/*.js rồi app
   ├─ vite.config.ts            cấu hình build (1 file JS, chạy được file://)
   ├─ public/                   chép nguyên vào bản build
   │  ├─ data/data.js           từ, bài, chữ, truyện (do build_data.py sinh)
   │  ├─ data/strokes.js        nét chữ cho tập viết
   │  ├─ data/pinyin.js         bảng âm tiết hợp lệ
   │  ├─ audio/w/               audio từ (tên = mã băm của chữ)
   │  ├─ audio/s/               audio âm tiết (ma1.mp3, luu4.mp3…)
   │  ├─ audio/c/               audio đọc nguyên câu
   │  ├─ audio/x/               audio từ ngoài HSK
   │  ├─ data/audio-index.js    bảng tra câu/từ → file (build_audio.py sinh)
   │  ├─ MO MIT XUE.bat         mở app bằng Edge
   │  └─ HUONG DAN.txt
   ├─ src/
   │  ├─ main.ts                khởi động
   │  ├─ App.svelte             khung: thanh trên, Mít, điều hướng, màn hình
   │  ├─ lib/                   LOGIC + DỮ LIỆU (xem mục 5)
   │  ├─ components/            mảnh giao diện dùng lại
   │  │  ├─ quiz/               Quiz + 4 dạng câu (chọn, sắp xếp, viết, nói)
   │  │  ├─ Py.svelte           pinyin tô màu theo thanh, có chế độ mờ
   │  │  ├─ RichView.svelte     hiển thị nội dung câu hỏi
   │  │  ├─ WordCard / WordModal / CharBox / WriteModal / Flashcards / SentenceRow
   │  │  └─ TopBar / Mit / Nav / Modal / Toast
   │  ├─ screens/               mỗi màn hình một file
   │  │  ├─ Home, Road, Review, Dict, Stats, Story, LevelTest, Settings
   │  │  ├─ lesson/             Lesson + 6 bước (Vocab, Chars, Grammar, Dialogue, Practice, UnitTest)
   │  │  └─ pron/               Pron + Learn, Chart, Listen, Speak
   │  └─ styles/app.css         toàn bộ CSS (biến màu sáng/tối ở đầu file)
   └─ tests/
      ├─ unit/                  test logic (vitest), chạy bằng npm test
      └─ e2e/run_e2e.py         test bấm thật trên trình duyệt (Playwright)
```

---

## 5. Từng file trong `src/lib/`

| File | Việc | Hàm chính |
|---|---|---|
| `types.ts` | Kiểu dữ liệu: `Word`, `Lesson`, `Sentence`, `State`, `SrsCard`… | — |
| `data.ts` | Đọc `window.DATA`, tạo chỉ mục | `W`, `BY_C`, `wordsOf`, `lessonOf`, `sentsUpTo`, `introducedChars` |
| `pinyin.ts` | Tách âm tiết, thanh điệu, dấu | `splitSyl`, `toneOfSyl`, `markSyl`, `plainSyl`, `noTone` |
| `storage.ts` | Đọc/ghi localStorage, **chuyển dữ liệu bản cũ** | `migrate`, `loadRaw`, `persist`, `blankState` |
| `state.svelte.ts` | `S` = tiến độ (reactive). Sửa `S` xong gọi `save()` | `S`, `save`, `replaceState`, `day` |
| `srs.ts` | Ôn tập FSRS | `intro`, `answer`, `dueKeys`, `dueCount` |
| `curriculum.ts` | Luật lộ trình, mở khóa, chia phần, chặn từ mới | `unitOpen`, `nextUnit`, `nextAction`, `vocabChunks`, `newGate`, hằng `PASS_*` |
| `questions.ts` | Sinh câu hỏi (dữ liệu thuần, không HTML) | `qMeaning`… `unitTestQs`, `levelTestQs`, `practiceSets`, `reviewQs` |
| `pron.ts` | Phát âm: mẹo, câu nghe, khóa 4 bài, **chấm thanh** | `toneQ`, `soundQ`, `PRON_COURSE`, `scoreTone`, `autoCorr` |
| `progress.ts` | XP, cấp, streak, đếm phút học | `addXP`, `lvOf`, `streak`, `logAnswer` |
| `motivation.ts` | Nhiệm vụ ngày + rương, dải 7 ngày, sao của bài, nhắc ngủ 23:00 | `quests`, `openChest`, `lastDays`, `starsOf`, `checkBedtime` |
| `sfx.ts` | Tiếng hiệu ứng tổng hợp bằng Web Audio (tắt được trong Cài đặt) | `sfx.ok`, `sfx.bad`, `sfx.done`, `sfx.reward` |
| `audio.ts` | Phát audio từ, âm tiết, câu (file câu → giọng Edge → ghép) | `playWord`, `playSyl`, `playSentence`, `playAll`, `stopAudio` |
| `pronscore.ts` | Chấm từng âm tiết từ token pinyin nghe được (biến điệu, thanh nhẹ, 儿 hóa) | `scorePron`, `buildTarget` |
| `asr.svelte.ts` | Nạp bộ máy chấm (lazy), trạng thái nạp | `ensureEngine`, `recognizePinyin`, `asr` |
| `mic.ts` | Ghi âm, đo mức, tự dừng, đổi về 16 kHz | `Recorder`, `to16k` |
| `merge.ts` | Gộp tiến độ 2 máy (an toàn, không mất dữ liệu) | `mergeState`, `pickCard`, `sameProgress` |
| `sync.svelte.ts` | Đồng bộ qua `/api/sync`, mã đồng bộ, tự đồng bộ | `syncNow`, `connect`, `startSync`, `newCode` |
| `config.ts` | Địa chỉ bản trên mạng (cho bản file:// gọi API) | `SITE_URL` |
| `router.svelte.ts` | Điều hướng theo `#/...` | `go`, `parse`, `href` |
| `ui.svelte.ts` | Lời Mít, toast, modal, pháo giấy, bảng chúc mừng | `say`, `toast`, `openModal`, `confetti`, `celebrate` |
| `backup.ts` | Sao lưu/khôi phục file JSON | `exportBackup`, `importBackup` |
| `writer.ts` | Khung tập viết (hanzi-writer) | `createWriter` |
| `startup.ts` | Sáng/tối, Mít chào | `applyTheme`, `greet` |
| `actions.ts` | Chế độ 5 phút | `fiveMinute` |
| `debug.ts` | `mitxue` trong Console (F12), chế độ test | `exposeDebug` |

### Địa chỉ (routes)

| Địa chỉ | Màn hình |
|---|---|
| `#/home` | Hôm nay |
| `#/road` | Lộ trình |
| `#/lesson/1/3/grammar` | HSK 1 · Bài 3 · bước Ngữ pháp |
| `#/level-test/2` | Thi tổng HSK 2 |
| `#/review` · `#/review/five` | Ôn tập · chế độ 5 phút |
| `#/pron/learn\|chart\|listen\|speak` | Phát âm |
| `#/story/4` | Truyện số 4 |
| `#/dict` · `#/stats` | Từ điển · Tiến độ |

---

## 6. Dữ liệu tiến độ (State v3)

Lưu ở `localStorage["mitxue_v3"]` (JSON). Khóa cũ `mitxue_v2`/`mitxue_v1` được giữ nguyên, không xóa.

```mermaid
classDiagram
  class State {
    ver = 3
    xp, created, lastSeen
    days: ngày → sec, q, ok, xp?, steps?, chest?, bed?
    settings: newPerDay, reviewMax, goalMin, pyMode, rate, unlockAll
    pron: lessonDone, q (điểm 4 bài)
    units: "lv:u" → UnitProgress
    levels: lv → best, passed
    srs: "lv:từ" → SrsCard
    chars: chữ → 1 tập / 2 thuộc
    stories, newToday, lastUnit, lastBackup
  }
  class UnitProgress { steps, best, done, vc (số phần từ mới đã qua), sets }
  class SrsCard { due, stability, difficulty, scheduled, reps, lapses, state, lastReview, added }
  State --> UnitProgress
  State --> SrsCard
```

**Đổi cấu trúc dữ liệu thì sao?** Tăng `VERSION` trong `storage.ts` và viết thêm bước chuyển trong `migrate()`, kèm test trong `tests/unit/storage.test.ts`. Không bao giờ xóa khóa cũ.

**Khi làm đồng bộ (bước 2)**: thay `loadRaw()` / `persist()` trong `storage.ts` bằng bản đọc/ghi Firebase (vẫn giữ localStorage làm bản đệm offline). Các phần khác không cần đổi.

---

## 7. Vì sao chạy được khi bấm đôi (file://)

Trình duyệt **chặn** `<script type="module">` và `fetch()` trên `file://`. Nên:

1. Dữ liệu nội dung là **script thường** gán vào `window.DATA`, `window.STROKES`, `window.SYL_RAW` (không dùng `fetch` JSON).
2. Vite build app thành **một file `app/app.js` dạng IIFE**; plugin `mitxue-classic-script` trong `vite.config.ts` đổi thẻ `<script type="module">` thành `<script defer>`.
3. Không chia nhỏ code (`inlineDynamicImports`), CSS gom một file `app/app.css`.
4. Bộ máy chấm phát âm (WebAssembly + mô hình) cũng là script thường chứa base64, nạp bằng thẻ `<script>` khi cần.

Tiến độ: Chromium/Edge dùng chung localStorage cho mọi file mở bằng `file://` trên cùng máy, nên chuyển thư mục app vẫn giữ tiến độ. **Đổi trình duyệt thì không** → dùng Sao lưu/Khôi phục.

---

## 8. Kiểm thử

| Lệnh | Kiểm gì | Bao lâu |
|---|---|---|
| `npm run check` | Kiểu TypeScript + lỗi Svelte | ~10 s |
| `npm test` | 45 test logic: pinyin, chuyển dữ liệu, FSRS, lộ trình, câu hỏi mọi bài, chấm thanh, audio đủ file, động lực, **bộ chấm phát âm khớp bản Python 560/560** | ~3 s |
| `npm run build` | Tạo `dist/` | ~5 s |
| `npm run e2e` (in bảng ✅/❌ từng bộ) | Bot đi hết: phát âm → bài 1 → kiểm tra → ôn → từ điển → truyện → sao lưu → chuyển dữ liệu v0.4, chụp ảnh `tests/e2e/shots/`; kiểm audio câu; **micro giả** phát file wav để chấm phát âm (đúng → 100%, sai thanh → đánh dấu) | ~2 phút |
| `npm run all` | Cả 4 lệnh trên | ~2,5 phút |
| `npm run e2e:web` | Giả lập Cloudflare (wrangler): đồng bộ 2 máy học offline cùng lúc, mã QR, CORS file://, PWA mất mạng, khung điện thoại | ~1 phút |

Quy tắc: **chạy `npm run all` trước mỗi lần cài bản mới lên máy Long.**
