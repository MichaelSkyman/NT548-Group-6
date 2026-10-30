import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuizSession } from '../hooks/useQuizSession'
import QuizResult from '../components/quiz/QuizResult'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '../components/StateBlock'
import Icon from '../components/Icon'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function QuizPage() {
  const { slug } = useParams()
  const session = useQuizSession(slug)
  const { questions, total, loading, error, answers, selectAnswer, answeredCount, progress, submit, submitting, submitError, result, submitted, reset } = session
  const [current, setCurrent] = useState(0)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16">
        <LoadingBlock label="Đang tải đề quiz…" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16">
        <ErrorBlock error={error} />
      </div>
    )
  }
  if (!total) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16">
        <EmptyBlock icon="quiz" title="Chủ đề này chưa có câu hỏi" hint="Quay lại chọn chủ đề khác nhé." />
        <div className="text-center mt-4">
          <Link to="/topics" className="text-secondary font-semibold hover:underline">← Danh sách chủ đề</Link>
        </div>
      </div>
    )
  }

  // Đã nộp -> màn kết quả.
  if (submitted && result) {
    return (
      <QuizResult
        result={result}
        questions={questions}
        answers={answers}
        slug={slug}
        onRetry={() => {
          reset()
          setCurrent(0)
        }}
      />
    )
  }

  const q = questions[current]
  const options = q.options || []
  const isLast = current === total - 1

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
      {/* Header + progress */}
      <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 font-mono">Bài kiểm tra</span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{session.quiz?.title || session.quiz?.topic || slug}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Câu {current + 1} / {total}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">{progress}% hoàn thành</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </section>

      {/* Câu hỏi + đáp án */}
      <section className="bg-white rounded-xl p-6 md:p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6">
        <div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 mb-3">
            Câu {current + 1}
          </span>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-900 leading-snug">{q.question_text || q.question}</h2>
        </div>

        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Các lựa chọn">
          {options.map((opt, idx) => {
            const selected = answers[q.id] === idx
            return (
              <label
                key={idx}
                className={`relative flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                  selected ? 'border-2 border-indigo-600 bg-indigo-50/40' : 'border border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  className="sr-only"
                  checked={selected}
                  onChange={() => selectAnswer(q.id, idx)}
                />
                <div
                  className={`w-7 h-7 rounded-full font-mono text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5 ${
                    selected ? 'bg-indigo-600 text-white' : 'border border-slate-300 text-slate-600'
                  }`}
                >
                  {LETTERS[idx] || idx + 1}
                </div>
                <div className={`flex-1 text-sm md:text-base leading-relaxed ${selected ? 'text-slate-900 font-medium' : 'text-slate-800'}`}>
                  {opt}
                </div>
                <div
                  className={`w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center ${
                    selected ? 'border-2 border-indigo-600' : 'border border-slate-300'
                  }`}
                >
                  {selected && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                </div>
              </label>
            )
          })}
        </div>
      </section>

      {/* Navigator + actions */}
      <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Danh sách câu</span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-indigo-600" /> Đã trả lời ({answeredCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded border border-slate-300 bg-slate-50" /> Chưa ({total - answeredCount})</span>
            </div>
          </div>
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 pt-1">
            {questions.map((item, idx) => {
              const done = Number.isInteger(answers[item.id])
              const isCurrent = idx === current
              const cls = isCurrent
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : done
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
              return (
                <button
                  key={item.id ?? idx}
                  type="button"
                  onClick={() => setCurrent(idx)}
                  className={`h-10 rounded-lg font-mono text-xs font-semibold transition-colors ${cls}`}
                >
                  {String(idx + 1).padStart(2, '0')}
                </button>
              )
            })}
          </div>
        </div>

        <div className="h-px w-full bg-slate-100" />

        {submitError && (
          <p className="text-sm text-error bg-error-container/50 border border-error-container rounded-lg px-3 py-2" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            <span>Trước</span>
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
            {!isLast && (
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Câu tiếp theo</span>
                <Icon name="arrow_forward" className="text-[18px]" />
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={submitting || answeredCount === 0}
              title={answeredCount === 0 ? 'Hãy trả lời ít nhất 1 câu' : 'Nộp bài'}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                submitting || answeredCount === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container'
              }`}
            >
              <Icon name={submitting ? 'progress_activity' : 'check_circle'} className={`text-[18px] ${submitting ? 'animate-spin' : ''}`} />
              <span>{submitting ? 'Đang nộp…' : 'Nộp bài'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
