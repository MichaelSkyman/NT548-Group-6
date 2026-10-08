// TRANG: Làm quiz (Guest)
//
// Luồng:
//   1. getQuiz(slug) -> { questions:[{id, question_text, options}], quiz_token }
//      => NHỚ lưu quiz_token vào state.
//   2. Người dùng chọn đáp án cho từng câu. Gom lại thành OBJECT:
//        answers = { [question.id]: optionIndex }   vd { "12": 0, "15": 2 }
//   3. submitQuiz(quiz_token, answers)
//      -> { topic, score, correct, incorrect, answered, total }  => hiện kết quả.
//
// GỢI Ý state: questions, quizToken, answers (object), result, loading.
//
// TODO: hiện thực component.
export default function QuizPage() {
  return <div>{/* TODO: render câu hỏi + nộp bài + kết quả */}</div>
}
