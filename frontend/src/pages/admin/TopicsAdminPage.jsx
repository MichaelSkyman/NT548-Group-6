import { useEffect, useRef, useState } from 'react'
import { useAdminTopics } from '../../hooks/useAdminTopics'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '../../components/StateBlock'
import Icon from '../../components/Icon'

const EMPTY = { name: '', slug: '', description: '', content: '', video_url: '' }

export default function TopicsAdminPage() {
  const { topics, loading, error, createTopic, updateTopic, removeTopic, saving, actionError } = useAdminTopics()
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [mode, setMode] = useState(null) // null = ẩn panel | 'create' | 'edit'

  // Cuộn tới form mỗi khi mở (tạo/sửa).
  const panelRef = useRef(null)
  useEffect(() => {
    if (mode && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [mode])

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY)
    setMode('create')
  }
  const startEdit = (t) => {
    setEditingId(t.id)
    setForm({
      name: t.name || '',
      slug: t.slug || '',
      description: t.description || '',
      content: t.content || '',
      video_url: t.video_url || t.youtube_url || '',
    })
    setMode('edit')
  }
  const closePanel = () => {
    setMode(null)
    setEditingId(null)
    setForm(EMPTY)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const res = editingId ? await updateTopic(editingId, { ...form }) : await createTopic({ ...form })
    if (res !== null) closePanel()
  }

  const onDelete = async (t) => {
    if (!window.confirm(`Xoá chủ đề "${t.name}"? Hành động này không thể hoàn tác.`)) return
    await removeTopic(t.id)
    if (editingId === t.id) closePanel()
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">Curriculum Engine</span>
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Quản lý chủ đề</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Cấu hình lộ trình học, video và nội dung markdown của từng chủ đề.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="h-10 px-4 bg-primary-container text-on-primary rounded-lg font-body-md text-body-md font-semibold hover:bg-primary transition-all shadow-sm flex items-center gap-space-xs"
        >
          <Icon name="add" className="text-[18px]" />
          <span>Chủ đề mới</span>
        </button>
      </div>

      <div className={mode ? 'grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start' : ''}>
        {/* Bảng */}
        <div className={`${mode ? 'xl:col-span-7' : ''} bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col`}>
          <div className="px-space-md py-space-sm bg-surface-container-low flex items-center justify-between">
            <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold flex items-center gap-space-sm">
              <Icon name="layers" className="text-secondary text-[20px]" /> Chủ đề đã xuất bản
            </span>
            <span className="font-label-sm text-label-sm text-outline">{topics.length} chủ đề</span>
          </div>

          {loading && <LoadingBlock label="Đang tải chủ đề…" />}
          {error && <ErrorBlock error={error} />}
          {!loading && !error && topics.length === 0 && (
            <EmptyBlock icon="menu_book" title="Chưa có chủ đề" hint='Bấm "Chủ đề mới" để tạo chủ đề đầu tiên.' />
          )}

          {!loading && !error && topics.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-md text-body-md">
                <thead>
                  <tr className="bg-surface-container-high/40 text-on-surface-variant font-label-md text-label-md">
                    <th className="py-3 px-space-md">Tên</th>
                    <th className="py-3 px-space-md">Slug</th>
                    <th className="py-3 px-space-md text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {topics.map((t) => (
                    <tr key={t.id} className={editingId === t.id ? 'bg-surface-container-low/70' : 'hover:bg-surface-container-high/30 transition-colors'}>
                      <td className="py-3.5 px-space-md">
                        <div className="font-headline-sm text-headline-sm text-primary">{t.name}</div>
                        {t.description && <div className="font-label-sm text-label-sm text-outline line-clamp-1 max-w-xs">{t.description}</div>}
                      </td>
                      <td className="py-3.5 px-space-md">
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">{t.slug}</span>
                      </td>
                      <td className="py-3.5 px-space-md text-right">
                        <div className="flex items-center justify-end gap-space-xs">
                          <button
                            type="button"
                            onClick={() => startEdit(t)}
                            className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-medium hover:bg-surface-container-highest transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(t)}
                            className="px-2.5 py-1 rounded bg-surface-container-low text-error font-label-sm text-label-sm font-medium hover:bg-error-container transition-colors"
                          >
                            Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Form — chỉ hiện khi bấm "Chủ đề mới" hoặc "Sửa" */}
        {mode && (
          <div ref={panelRef} className="xl:col-span-5 bg-surface-container-lowest rounded-xl shadow-md p-space-lg flex flex-col gap-space-md scroll-mt-20">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-primary text-on-primary">
                  {mode === 'edit' ? 'Đang sửa' : 'Tạo mới'}
                </span>
                <h2 className="font-headline-md text-headline-md text-primary">{mode === 'edit' ? form.name || 'Sửa chủ đề' : 'Chủ đề mới'}</h2>
              </div>
              <button type="button" onClick={closePanel} className="text-outline hover:text-on-surface" title="Đóng">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            {actionError && (
              <p className="text-sm text-error bg-error-container/50 border border-error-container rounded-lg px-3 py-2" role="alert">
                {actionError}
              </p>
            )}

            <form className="flex flex-col gap-space-md" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Labeled label="Tên" required>
                  <input className={inputCls} value={form.name} onChange={setField('name')} placeholder="vd: Kubernetes" required />
                </Labeled>
                <Labeled label="Slug" required>
                  <input className={inputCls} value={form.slug} onChange={setField('slug')} placeholder="vd: kubernetes" required />
                </Labeled>
              </div>
              <Labeled label="Mô tả">
                <textarea className={inputCls} rows="2" value={form.description} onChange={setField('description')} placeholder="Mô tả ngắn hiển thị ở thẻ chủ đề." />
              </Labeled>
              <Labeled label="Video URL (YouTube)">
                <input className={inputCls} value={form.video_url} onChange={setField('video_url')} placeholder="https://youtu.be/..." />
              </Labeled>
              <Labeled label="Nội dung (Markdown)">
                <textarea className={`${inputCls} font-mono text-[13px] leading-relaxed`} rows="10" value={form.content} onChange={setField('content')} placeholder={'## Giới thiệu\n\n- Ý 1\n- Ý 2'} />
              </Labeled>

              <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                <button type="button" onClick={closePanel} className="h-10 px-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg font-medium rounded-lg transition-colors">
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-4 bg-primary-container text-on-primary hover:bg-primary font-label-lg text-label-lg font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Icon name={saving ? 'progress_activity' : 'save'} className={`text-[18px] ${saving ? 'animate-spin' : ''}`} />
                  {mode === 'edit' ? 'Cập nhật' : 'Tạo chủ đề'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary outline-none transition-all resize-y'

function Labeled({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between">
        <span>{label}</span>
        {required && <span className="text-secondary font-label-sm text-label-sm font-normal">Bắt buộc</span>}
      </label>
      {children}
    </div>
  )
}
