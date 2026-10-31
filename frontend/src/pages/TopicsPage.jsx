import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTopics } from '../hooks/useTopics'
import { topicMeta, topicQuestionCount, topicHasVideo } from '../lib/topicMeta'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '../components/StateBlock'
import Icon from '../components/Icon'

// TRANG: Danh sách chủ đề (Guest). Hero + ô tìm kiếm + lưới thẻ chủ đề.
export default function TopicsPage() {
  const { data, loading, error } = useTopics()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')

  const topics = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return topics
    return topics.filter((t) =>
      `${t.name || ''} ${t.title || ''} ${t.description || ''} ${t.slug || ''}`.toLowerCase().includes(q),
    )
  }, [topics, query])

  return (
    <>
      {/* Hero */}
      <section className="w-full bg-gradient-to-b from-indigo-50/70 via-slate-50/50 to-background py-16 border-b border-slate-200/60">
        <div className="max-w-content mx-auto px-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/70 border border-indigo-200 text-indigo-900 text-xs font-mono font-medium mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Interactive Cloud Engineering Curriculum
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl">
            DevOps Learning Platform
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed">
            Làm chủ DevOps hiện đại qua chủ đề được tuyển chọn, bài giảng video và quiz tương tác.
          </p>
          <a
            href="#topics-catalog"
            className="mt-8 h-10 px-5 rounded-lg font-semibold bg-indigo-900 text-white hover:bg-indigo-950 transition-all shadow-sm inline-flex items-center gap-2 text-sm"
          >
            <span>Xem chủ đề</span>
            <Icon name="arrow_downward" className="text-lg" />
          </a>
        </div>
      </section>

      {/* Catalog */}
      <section id="topics-catalog" className="max-w-content mx-auto px-6 py-12 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Chủ đề hiện có</h2>
            <p className="text-sm text-slate-500 mt-1">
              Khám phá kiến trúc cloud thực tế, container và pipeline.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Icon name="search" className="absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              placeholder="Tìm chủ đề (vd: Docker, Kubernetes)..."
              type="text"
            />
          </div>
        </div>

        {loading && <LoadingBlock label="Đang tải chủ đề…" />}
        {error && <ErrorBlock error={error} />}

        {!loading && !error && (
          <>
            {filtered.length === 0 ? (
              <EmptyBlock
                icon="search_off"
                title="Không tìm thấy chủ đề phù hợp"
                hint='Thử từ khoá khác như "Docker", "Kubernetes" hoặc "Jenkins".'
                className="mt-8 bg-white rounded-xl border border-slate-200"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
                {filtered.map((topic) => (
                  <TopicCard key={topic.slug || topic.id} topic={topic} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}

function TopicCard({ topic }) {
  const meta = topicMeta(topic)
  const count = topicQuestionCount(topic)
  const hasVideo = topicHasVideo(topic)
  const to = `/topics/${topic.slug}`

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${meta.accentClass}`}>
            <Icon name={meta.icon} className="text-2xl" />
          </div>
          <div className="flex items-center gap-2">
            {count != null && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                {count} câu hỏi
              </span>
            )}
            {hasVideo && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 inline-flex items-center gap-1">
                <Icon name="play_circle" className="text-xs" /> Video
              </span>
            )}
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mt-4">{topic.name || topic.title || topic.slug}</h3>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed line-clamp-3">
          {topic.description || 'Chủ đề DevOps — bấm để xem bài học và làm quiz.'}
        </p>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-mono">{meta.category}</span>
        <Link
          to={to}
          className="h-10 px-5 rounded-lg border border-slate-300 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 font-semibold text-sm transition-colors inline-flex items-center gap-1"
        >
          Bắt đầu học
        </Link>
      </div>
    </div>
  )
}
