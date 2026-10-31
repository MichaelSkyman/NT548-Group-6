import { useDashboard } from '../../hooks/useDashboard'
import { LoadingBlock, ErrorBlock } from '../../components/StateBlock'
import Icon from '../../components/Icon'

// Chuẩn hoá "questions_per_topic" về mảng [{ name, count, slug }] dù backend
// trả mảng hay object map.
function normalizeQPT(input) {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.map((it) => ({
      name: it.name || it.topic || it.title || it.slug || '—',
      slug: it.slug,
      // Backend trả field tên "question_count" (app/repositories.py).
      count: Number(it.question_count ?? it.count ?? it.questions ?? it.total ?? 0),
    }))
  }
  if (typeof input === 'object') {
    return Object.entries(input).map(([name, count]) => ({ name, count: Number(count) || 0 }))
  }
  return []
}

const BAR_COLORS = ['bg-primary-container', 'bg-secondary', 'bg-secondary-container', 'bg-surface-tint', 'bg-primary', 'bg-tertiary-fixed-dim']

export default function DashboardPage() {
  const { data, loading, error } = useDashboard()

  if (loading) return <LoadingBlock label="Đang tải số liệu…" />
  if (error) return <ErrorBlock error={error} />

  const d = data || {}
  const qpt = normalizeQPT(d.questions_per_topic)
  const co = d.content_overview || {}

  const totalTopics = d.total_topics ?? qpt.length
  const totalQuestions = d.total_questions ?? qpt.reduce((s, t) => s + t.count, 0)
  // content_overview.empty_topics / low_content_topics là DANH SÁCH (backend trả).
  const unpopulated = co.empty_topics?.length ?? qpt.filter((t) => t.count === 0).length
  const lowContent = co.low_content_topics?.length ?? qpt.filter((t) => t.count > 0 && t.count < 5).length
  const maxCount = Math.max(40, ...qpt.map((t) => t.count))

  return (
    <div className="flex flex-col gap-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-inner">
            <Icon name="grid_view" className="text-[26px]" />
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Dashboard</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Tổng quan chương trình học, phân bổ câu hỏi và tình trạng nội dung.
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <StatCard label="Tổng chủ đề" value={totalTopics} icon="menu_book" hint="Lộ trình đang hoạt động" />
        <StatCard label="Tổng câu hỏi" value={totalQuestions} icon="quiz" hint={`Trên ${totalTopics} chủ đề`} />
        <StatCard
          label="Chủ đề ít câu hỏi (<5)"
          value={lowContent}
          icon="error_outline"
          hint={lowContent ? 'Nên bổ sung thêm' : 'Không có chủ đề nào thiếu'}
          tone={lowContent ? 'tertiary' : 'ok'}
        />
        <StatCard label="Chủ đề chưa có câu hỏi" value={unpopulated} icon="warning" hint={unpopulated ? 'Cần bổ sung' : 'Tất cả đã có câu hỏi'} tone={unpopulated ? 'error' : 'ok'} />
      </div>

      {/* Bar chart câu hỏi / chủ đề */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
        <div className="pb-space-md">
          <h2 className="font-headline-sm text-headline-sm text-primary">Câu hỏi theo chủ đề</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Phân bổ câu hỏi giữa các chủ đề.</p>
        </div>
        {qpt.length === 0 ? (
          <p className="font-body-sm text-on-surface-variant py-6">Chưa có dữ liệu phân bổ.</p>
        ) : (
          <div className="flex flex-col gap-5 my-2">
            {qpt.map((t, i) => {
              const pct = Math.round((t.count / maxCount) * 100)
              return (
                <div key={t.slug || t.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-label-md text-label-md">
                    <span className="text-on-surface font-semibold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-sm ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                      {t.name}
                    </span>
                    <span className="text-primary font-bold">{t.count} <span className="text-outline font-normal">/ {totalQuestions}</span></span>
                  </div>
                  <div className="h-6 w-full bg-surface-container-low rounded-lg overflow-hidden flex items-center p-1">
                    <div
                      className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]} rounded transition-all duration-700 flex items-center justify-end px-2`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    >
                      <span className="font-label-sm text-label-sm text-white text-[10px]">{pct}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bảng chủ đề */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col">
        <div className="mb-space-md">
          <h2 className="font-headline-sm text-headline-sm text-primary">Danh sách chủ đề</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Trạng thái các chủ đề trong chương trình.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-4 rounded-l-lg">Chủ đề</th>
                <th className="py-3 px-4">Số câu hỏi</th>
                <th className="py-3 px-4 rounded-r-lg">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm text-on-surface">
              {qpt.map((t) => (
                <tr key={t.slug || t.name} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-primary flex items-center gap-2">
                    <Icon name="layers" className="text-secondary text-[20px]" />
                    {t.name}
                  </td>
                  <td className="py-3.5 px-4 font-label-md text-label-md font-semibold text-primary">{t.count}</td>
                  <td className="py-3.5 px-4">
                    {t.count > 0 ? (
                      <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-tertiary-container">
                        <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container" /> Hoàn chỉnh
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-error">
                        <span className="w-1.5 h-1.5 rounded-full bg-error" /> Thiếu câu hỏi
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, hint, tone }) {
  const tones = {
    tertiary: 'text-on-tertiary-container',
    error: 'text-error',
    ok: 'text-on-tertiary-container',
    default: 'text-secondary',
  }
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-medium">{label}</span>
        <span className={`w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center ${tones[tone] || tones.default}`}>
          <Icon name={icon} className="text-[18px]" />
        </span>
      </div>
      <div className="mt-4">
        <span className="font-headline-xl text-headline-xl text-primary font-bold">{value}</span>
      </div>
      <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{hint}</p>
    </div>
  )
}
