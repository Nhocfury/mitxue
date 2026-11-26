/* Chỉ một bài quiz nhận phím tắt (1–4, Enter, Space) tại một thời điểm: cái được bấm/khởi tạo gần nhất. */
let seq = 0;
export const active = { id: 0 };
export const newQuizId = () => (active.id = ++seq);
