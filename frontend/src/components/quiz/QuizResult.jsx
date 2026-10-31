import { Link } from 'react-router-dom'
import Icon from '../Icon'

// Màn KẾT QUẢ quiz.
// Lưu ý: API /quiz/submit chỉ trả tổng hợp { score, correct, incorrect,
// answered, total } — KHÔNG có đáp án đúng/giải thích từng câu. Nên phần
// "ôn lại" chỉ liệt kê trung thực đáp án người dùng đã chọn, không chấm đúng/sai.
export default function QuizResult({ result, questions = [], answers = {}, slug, onRetry }) {
  const total = result.total ?? questions.length
  const correct = result.correct ?? 0
  const incorrect = result.incorrect ?? Math.max((result.answered ?? 0) - correct, 0)
  const answered = result.answered ?? Object.keys(answers).length
  const score = Number.isFinite(result.score) ? Math.round(result.score) : total ? Math.round((correct / total) * 100) : 0
  const passed = score >= 70

  // Vòng cung điểm (SVG).
  const r = 66
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-space-lg">
      {/* Thẻ tổng quan */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg md:p-space-xl shadow-sm relative overflow-hidden border border-outline-variant/30">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-secondary via-on-tertiary-container to-secondary-container" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
          <div className="lg:col-span-7 space-y-space-md">
            <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container-low text-secondary font-label-md text-label-md">
              <Icon name="task_alt" className="text-body-md" fill />
              <span>Đã hoàn thành bài kiểm tra</span>
            </div>
            <div className="space-y-space-xs">
              <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
                Kết quả quiz: {result.topic || slug}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                Bạn đã trả lời {answered}/{total} câu. {passed ? 'Chúc mừng, bạn đã đạt!' : 'Hãy ôn lại và thử lại nhé.'}
              </p>
            </div>
            <div className="p-space-md rounded-lg bg-surface-container-low border border-surface-container-high/60 flex items-start gap-space-sm">
              <div className="w-8 h-8 rounded-full bg-tertiary-fixed-dim/40 flex items-center justify-center shrink-0 text-on-tertiary-fixed mt-0.5">
                <Icon name="military_tech" className="text-body-lg" />
              </div>
              <div>
                <span className="font-headline-sm text-[16px] text-on-surface block font-semibold leading-snug">
                  Điểm tổng: {correct}/{total} câu đúng — {score}%
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant block mt-1">
                  Điểm đạt yêu cầu khi ≥ 70%.
                </span>
              </div>
            </div>
          </div>

          {/* Vòng điểm */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-space-md rounded-xl bg-surface-container-low/70 border border-outline-variant/20">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#006398" />
                    <stop offset="100%" stopColor="#1a998d" />
                  </linearGradient>
                </defs>
                <circle cx="80" cy="80" r={r} fill="none" stroke="#d3e4fe" strokeWidth="12" />
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Điểm</span>
                <span className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">{score}%</span>
                <span className="font-label-md text-label-md text-secondary font-semibold">{correct}/{total} đúng</span>
              </div>
            </div>
            <div className="mt-space-sm text-center">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold ${
                  passed ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-error-container text-on-error-container'
                }`}
              >
                <Icon name={passed ? 'check_circle' : 'info'} className="text-body-sm" fill />
                <span>{passed ? 'Đạt yêu cầu (≥70%)' : 'Chưa đạt (<70%)'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 ô thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <StatTile label="Số câu đúng" value={correct} sub={`${score}% chính xác`} icon="check_circle" tone="tertiary" />
        <StatTile label="Số câu sai" value={incorrect} sub={`${incorrect} câu cần ôn lại`} icon="cancel" tone="error" />
        <StatTile label="Tổng số câu" value={total} sub={`${answered} câu đã trả lời`} icon="format_list_numbered" tone="secondary" />
      </div>

      {/* Ôn lại các câu đã trả lời */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg md:p-space-xl shadow-sm border border-outline-variant/30 space-y-space-md">
        <div className="pb-space-sm border-b border-surface-container">
          <h2 className="font-headline-sm text-headline-sm text-primary">Các câu đã trả lời</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Bản ghi lựa chọn của bạn. (Hệ thống chỉ trả điểm tổng hợp nên không hiển thị đúng/sai từng câu.)
          </p>
        </div>
        <div className="space-y-space-sm">
          {questions.map((q, i) => {
            const picked = answers[q.id]
            const options = q.options || []
            const pickedText = Number.isInteger(picked) ? options[picked] : null
            return (
              <div key={q.id ?? i} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-space-md">
                <div className="flex items-start gap-space-sm">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono font-bold mt-0.5">
                    Q{String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="w-full">
                    <p className="font-body-md text-body-md text-on-surface font-medium">{q.question_text || q.question}</p>
                    <div className="p-2.5 rounded-lg bg-surface-container-low text-body-sm font-body-sm mt-1.5">
                      <span className="text-on-surface-variant text-label-sm block font-medium">Câu trả lời của bạn:</span>
                      {pickedText != null ? (
                        <span className="text-on-surface font-medium flex items-center gap-1.5 mt-0.5">
                          <Icon name="radio_button_checked" className="text-[16px] text-secondary" />
                          {pickedText}
                        </span>
                      ) : (
                        <span className="text-outline flex items-center gap-1.5 mt-0.5">
                          <Icon name="radio_button_unchecked" className="text-[16px]" /> Chưa trả lời
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Nút hành động */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            type="button"
            onClick={onRetry}
            className="h-11 px-6 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all shadow-sm inline-flex items-center justify-center gap-2"
          >
            <Icon name="restart_alt" className="text-[18px]" />
            <span>Làm lại</span>
          </button>
          {slug && (
            <Link
              to={`/topics/${slug}`}
              className="h-11 px-5 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container transition-all inline-flex items-center justify-center gap-2 border border-outline-variant/40"
            >
              <Icon name="arrow_back" className="text-[18px]" />
              <span>Về chủ đề</span>
            </Link>
          )}
        </div>
        <Link
          to="/topics"
          className="h-11 px-5 rounded-lg bg-surface-container-low text-secondary font-label-md text-label-md font-semibold hover:bg-surface-container hover:text-on-secondary-container transition-all inline-flex items-center justify-center gap-2 border border-outline-variant/30"
        >
          <span>Danh sách chủ đề</span>
          <Icon name="grid_view" className="text-[18px]" />
        </Link>
      </div>
    </div>
  )
}

function StatTile({ label, value, sub, icon, tone }) {
  const tones = {
    tertiary: { ring: 'bg-tertiary-fixed/40 text-on-tertiary-container', value: 'text-primary' },
    error: { ring: 'bg-error-container text-on-error-container', value: 'text-error' },
    secondary: { ring: 'bg-surface-container-high text-secondary', value: 'text-primary' },
  }
  const t = tones[tone] || tones.secondary
  return (
    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
      <div className="space-y-0.5">
        <span className="font-label-md text-label-md text-on-surface-variant font-medium block">{label}</span>
        <span className={`font-headline-lg text-headline-lg font-bold ${t.value}`}>{value}</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant block">{sub}</span>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${t.ring}`}>
        <Icon name={icon} className="text-headline-md" fill />
      </div>
    </div>
  )
}
