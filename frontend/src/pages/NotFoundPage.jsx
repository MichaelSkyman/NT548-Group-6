import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'

// TRANG 404 (Guest). Có ô tìm kiếm -> /topics?q= và gợi ý chủ đề phổ biến.
const POPULAR = ['Kubernetes', 'Docker', 'Terraform', 'Jenkins']

export default function NotFoundPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    navigate(`/topics?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="relative flex items-center justify-center py-16 px-6 overflow-hidden min-h-[70vh]">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #070235 1px, transparent 1px), linear-gradient(to bottom, #070235 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="relative w-full max-w-[680px] mx-auto text-center flex flex-col items-center">
        <div className="relative flex flex-col items-center mb-6">
          <div className="select-none font-bold text-[120px] sm:text-[150px] leading-none text-surface-container-high tracking-tight">404</div>
          <div className="absolute bottom-2 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md shadow-sm border border-outline-variant/40">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
            <span className="font-semibold tracking-wide">Error 404 — Không tìm thấy trang</span>
          </div>
        </div>

        <div className="max-w-xl mx-auto space-y-3 mb-8">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Lạc giữa cloud architecture?</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            Trang hoặc tài nguyên bạn tìm không tồn tại, đã được chuyển đi hoặc đang bảo trì.
          </p>
        </div>

        <form className="w-full max-w-lg mb-6" onSubmit={onSubmit}>
          <div className="relative flex items-center">
            <Icon name="search" className="absolute left-4 text-outline text-[20px] pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-11 pr-28 py-3 rounded-xl bg-surface-container-lowest border border-slate-300 shadow-sm text-on-surface text-sm placeholder:text-outline focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
              placeholder="Tìm chủ đề, video hoặc quiz (vd: Kubernetes)..."
              type="text"
            />
            <button
              type="submit"
              className="absolute right-2 px-4 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-container transition-colors font-medium text-xs shadow-sm flex items-center gap-1.5"
            >
              <span>Tìm</span>
              <Icon name="arrow_forward" className="text-sm" />
            </button>
          </div>
        </form>

        <Link
          to="/topics"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-on-primary font-medium text-sm transition-all shadow hover:shadow-md bg-primary-container hover:bg-primary mb-10"
        >
          <Icon name="arrow_back" className="text-base" />
          <span>Về danh sách chủ đề</span>
        </Link>

        <div className="pt-6 border-t border-surface-container-high w-full max-w-lg flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-on-surface-variant font-medium">Chủ đề phổ biến:</span>
          {POPULAR.map((name) => (
            <Link
              key={name}
              to={`/topics?q=${encodeURIComponent(name)}`}
              className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-secondary-fixed text-secondary hover:text-on-secondary-fixed transition-colors font-medium font-mono"
            >
              {name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
