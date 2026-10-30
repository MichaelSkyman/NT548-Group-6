import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTopic } from '../hooks/useTopic'
import { renderMarkdown, slugify } from '../lib/markdown'
import { topicMeta } from '../lib/topicMeta'
import { LoadingBlock, ErrorBlock } from '../components/StateBlock'
import Icon from '../components/Icon'

// Lấy id video YouTube từ nhiều dạng URL để nhúng iframe.
function youtubeEmbed(url = '') {
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  )
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

export default function TopicDetailPage() {
  const { slug } = useParams()
  const { data: topic, loading, error } = useTopic(slug)

  const html = useMemo(() => renderMarkdown(topic?.content || ''), [topic])
  const contentRef = useRef(null)
  const [toc, setToc] = useState([])

  // Sau khi render markdown: gán id cho các heading và dựng mục lục.
  useEffect(() => {
    if (!contentRef.current) return
    const nodes = contentRef.current.querySelectorAll('h2, h3')
    const items = []
    const seen = {}
    nodes.forEach((node) => {
      let id = slugify(node.textContent)
      if (!id) return
      if (seen[id]) id = `${id}-${(seen[id] += 1)}`
      else seen[id] = 1
      node.id = id
      items.push({ id, text: node.textContent, depth: node.tagName === 'H3' ? 3 : 2 })
    })
    setToc(items)
  }, [html])

  if (loading) {
    return (
      <div className="max-w-content mx-auto px-6 py-16">
        <LoadingBlock label="Đang tải bài học…" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-content mx-auto px-6 py-16">
        <ErrorBlock error={error} />
      </div>
    )
  }
  if (!topic) return null

  const meta = topicMeta(topic)
  const embed = youtubeEmbed(topic.video_url || topic.youtube_url || topic.video || '')

  return (
    <>
      {/* Header strip + breadcrumb */}
      <div className="w-full bg-gradient-to-b from-surface-container-low via-surface to-background border-b border-outline-variant/20 pb-space-lg">
        <div className="max-w-content mx-auto px-6 pt-space-md">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
            <Link to="/topics" className="hover:text-primary transition-colors flex items-center gap-1">
              <Icon name={meta.icon} className="text-base" />
              Chủ đề
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-semibold truncate">{topic.name || topic.title}</span>
          </nav>
          <div className="mt-space-md flex flex-col gap-space-xs">
            <h1 className="font-headline-xl text-[32px] md:text-headline-xl text-primary tracking-tight">
              {topic.name || topic.title}
            </h1>
            {topic.description && (
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl leading-relaxed">
                {topic.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Workspace 2 cột */}
      <div className="max-w-content mx-auto px-6 py-space-lg w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* Cột trái */}
          <article className="lg:col-span-8 flex flex-col gap-space-lg">
            {embed && (
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/40">
                <div className="relative w-full aspect-video bg-slate-950">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={embed}
                    title={`Video: ${topic.name || topic.title}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            <section className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/40">
              {html ? (
                <div ref={contentRef} className="md-content" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <p className="font-body-md text-on-surface-variant">Chủ đề này chưa có nội dung bài học.</p>
              )}
            </section>

            {/* CTA Quiz */}
            <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-space-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-primary">Kiểm tra kiến thức {topic.name || topic.title}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Hoàn thành bài quiz để củng cố nội dung vừa học.</p>
              </div>
              <Link
                to={`/quiz/${topic.slug}`}
                className="h-10 px-6 rounded-lg font-semibold text-sm text-on-secondary bg-secondary hover:bg-secondary-container hover:text-on-secondary-container transition-all shadow shrink-0 inline-flex items-center justify-center gap-2"
              >
                <span>Làm quiz</span>
                <Icon name="arrow_forward" className="text-base" />
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-space-lg lg:sticky lg:top-20">
            {toc.length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/40 flex flex-col gap-space-sm">
                <div className="flex items-center gap-2 text-primary font-semibold font-headline-sm text-base pb-space-xs border-b border-outline-variant/20">
                  <Icon name="toc" className="text-secondary text-lg" />
                  <span>Nội dung trang</span>
                </div>
                <nav className="flex flex-col gap-1 text-sm font-body-md text-on-surface-variant pt-1">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`py-1 px-2 rounded hover:bg-surface-container-low hover:text-primary transition-colors ${
                        item.depth === 3 ? 'pl-5 text-[13px]' : ''
                      }`}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/40 flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 bg-secondary-fixed text-on-secondary-fixed px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold">
                  <Icon name="quiz" className="text-sm" /> Quiz
                </span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-primary font-semibold">Bài kiểm tra {topic.name || topic.title}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                  Trắc nghiệm nhiều lựa chọn để đánh giá mức độ nắm vững chủ đề.
                </p>
              </div>
              <Link
                to={`/quiz/${topic.slug}`}
                className="w-full h-10 px-5 rounded-lg font-semibold text-sm text-on-secondary bg-secondary hover:bg-secondary-container hover:text-on-secondary-container shadow transition-all flex items-center justify-center gap-2"
              >
                <span>Bắt đầu quiz</span>
                <Icon name="arrow_forward" className="text-base" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
