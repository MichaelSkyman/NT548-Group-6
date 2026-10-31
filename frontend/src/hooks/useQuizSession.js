// HOOK: toàn bộ LOGIC làm quiz (không có giao diện).
// QuizPage chỉ cần gọi hook này rồi render theo ý mình.
//
// Luồng (khớp backend):
//   1. getQuiz(slug) -> { title, topic, questions:[{id, question_text, options}], quiz_token }
//   2. người dùng chọn đáp án -> answers = { [questionId]: optionIndex }
//   3. submitQuiz(quiz_token, answers)
//        -> { topic, score, correct, incorrect, answered, total }

import { useCallback, useMemo, useState } from 'react'
import { publicApi } from '../api/client'
import { useQuiz } from './useQuiz'
import { selectAnswer, countAnswered, isComplete, progressPercent } from '../lib/quiz'

export function useQuizSession(slug) {
  // Tải đề + quiz_token (dùng lại hook sẵn có).
  const { data: quiz, loading, error } = useQuiz(slug)

  // Trạng thái làm bài.
  const [answers, setAnswers] = useState({})   // { [questionId]: optionIndex }
  const [result, setResult] = useState(null)   // kết quả sau khi nộp
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const questions = useMemo(() => quiz?.questions ?? [], [quiz])
  const total = questions.length

  // Chọn đáp án cho 1 câu (bất biến, dùng helper thuần ở lib/quiz.js).
  const pick = useCallback((questionId, optionIndex) => {
    setAnswers((prev) => selectAnswer(prev, questionId, optionIndex))
  }, [])

  // Nộp bài: cần quiz_token lấy từ lúc tải đề.
  const submit = useCallback(async () => {
    if (!quiz?.quiz_token) {
      setSubmitError('Chưa có quiz_token để nộp bài.')
      return null
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await publicApi.submitQuiz(quiz.quiz_token, answers)
      setResult(res)
      return res
    } catch (err) {
      setSubmitError(err.message)
      return null
    } finally {
      setSubmitting(false)
    }
  }, [quiz, answers])

  // Làm lại từ đầu (giữ nguyên đề đã tải).
  const reset = useCallback(() => {
    setAnswers({})
    setResult(null)
    setSubmitError(null)
  }, [])

  return {
    // dữ liệu đề
    quiz,
    questions,
    total,
    loading,
    error,
    // trạng thái làm bài
    answers,
    selectAnswer: pick,
    answeredCount: countAnswered(answers),
    complete: isComplete(answers, total),
    progress: progressPercent(answers, total),
    // nộp bài
    submit,
    submitting,
    submitError,
    result,
    submitted: result !== null,
    reset,
  }
}
