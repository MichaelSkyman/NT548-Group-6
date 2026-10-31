// LOGIC QUIZ (hàm thuần, KHÔNG dùng React) — dễ test, không dính giao diện.
// QuizPage sẽ gọi các hàm này để quản lý câu trả lời + tiến độ.
//
// answers có dạng: { [questionId]: optionIndex }   vd { "12": 0, "15": 2 }

// Chọn đáp án cho 1 câu -> trả về object answers MỚI (bất biến, đừng sửa trực tiếp answers cũ).
export function selectAnswer(answers, questionId, optionIndex) {
  return { ...answers, [questionId]: optionIndex }
}

// Số câu đã trả lời.
export function countAnswered(answers) {
  return Object.keys(answers).length
}

// Đã làm hết chưa (để bật/tắt nút Nộp bài).
export function isComplete(answers, totalQuestions) {
  return countAnswered(answers) >= totalQuestions
}

// % tiến độ 0–100 (để vẽ thanh progress). Nhớ chặn chia cho 0.
export function progressPercent(answers, totalQuestions) {
  if (!totalQuestions) return 0;
  return Math.round(countAnswered(answers) / totalQuestions * 100);
}
