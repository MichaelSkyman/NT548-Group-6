import { useEffect, useMemo, useRef, useState } from 'react'
import { useAdminQuestions } from '../../hooks/useAdminQuestions'
import { useAdminTopics } from '../../hooks/useAdminTopics'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '../../components/StateBlock'
import Icon from '../../components/Icon'

const LETTERS = ['A', 'B', 'C', 'D']
const emptyForm = () => ({ topic_id: '', question_text: '', options: ['', '', '', ''], correct_answer: 0 })

export default function QuestionsAdminPage() {
  const { topics } = useAdminTopics()
  const [topicId, setTopicId] = useState('') // '' = tất cả
  const { questions, loading, error, createQuestion, updateQuestion, removeQuestion, bulkCreate, saving, actionError } =
    useAdminQuestions(topicId ? { topicId } : {})

  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [bulkText, setBulkText] = useState('')
  const [bulkMsg, setBulkMsg] = useState(null)
  const [formError, setFormError] = useState(null) // lỗi kiểm tra phía client
  const [mode, setMode] = useState(null) // null = ẩn | 'create' | 'edit' | 'bulk'

  // Cuộn tới panel mỗi khi mở (tạo/sửa/bulk).
  const panelRef = useRef(null)
  useEffect(() => {
    if (mode && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [mode])

  const topicName = useMemo(() => {
    const map = {}
    topics.forEach((t) => (map[t.id] = t.name))
    return map
  }, [topics])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return questions
    return questions.filter((it) => (it.question_text || it.question || '').toLowerCase().includes(q))
  }, [questions, search])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setMode('create')
  }
  const startEdit = (it) => {
    setEditingId(it.id)
    const opts = Array.isArray(it.options) ? [...it.options] : []
    while (opts.length < 4) opts.push('')
    setForm({
      topic_id: it.topic_id ?? '',
      question_text: it.question_text || it.question || '',
      options: opts.slice(0, 4),
      correct_answer: Number(it.correct_answer ?? 0),
    })
    setFormError(null)
    setMode('edit')
  }
  const openBulk = () => {
    setBulkMsg(null)
    setMode('bulk')
  }
  const closePanel = () => {
    setMode(null)
    setEditingId(null)
    setForm(emptyForm())
    setBulkMsg(null)
    setFormError(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    // Chuẩn hoá đáp án: bỏ khoảng trắng thừa, lấy đáp án đúng theo NỘI DUNG
    // (không theo chỉ số) để không bị lệch khi có ô trống ở giữa.
    const trimmed = form.options.map((o) => o.trim())
    const correctText = trimmed[Number(form.correct_answer)] || ''
    const nonEmpty = trimmed.filter((o) => o !== '')

    if (nonEmpty.length < 2) {
      setFormError('Cần ít nhất 2 đáp án.')
      return
    }
    if (correctText === '') {
      setFormError('Đáp án đúng đang để trống — hãy điền hoặc chọn lại đáp án đúng.')
      return
    }
    if (new Set(nonEmpty).size !== nonEmpty.length) {
      setFormError('Các đáp án không được trùng nhau.')
      return
    }

    const payload = {
      topic_id: form.topic_id ? Number(form.topic_id) : undefined,
      question_text: form.question_text.trim(),
      options: nonEmpty,
      correct_answer: nonEmpty.indexOf(correctText),
    }
    const res = editingId ? await updateQuestion(editingId, payload) : await createQuestion(payload)
    if (res !== null) closePanel()
  }

  const onDelete = async (it) => {
    if (!window.confirm('Xoá câu hỏi này?')) return
    await removeQuestion(it.id)
    if (editingId === it.id) closePanel()
  }

  const fillSample = () => {
    const tid = topics[0]?.id ?? 1
    setBulkText(
      JSON.stringify(
        [
          {
            topic_id: tid,
            question_text: 'Câu hỏi mẫu?',
            options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
            correct_answer: 0,
          },
        ],
        null,
        2,
      ),
    )
    setBulkMsg(null)
  }

  const onBulk = async () => {
    setBulkMsg(null)
    let parsed
    try {
      parsed = JSON.parse(bulkText)
    } catch (err) {
      setBulkMsg({ type: 'error', text: `JSON không hợp lệ: ${err.message}` })
      return
    }
    // Backend mong MỘT MẢNG câu hỏi; object đơn -> bọc thành mảng 1 phần tử.
    const list = Array.isArray(parsed) ? parsed : [parsed]
    const res = await bulkCreate(list)
    if (res) {
      setBulkMsg({ type: 'ok', text: `Đã nhập: ${res.success ?? list.length} thành công, ${res.failed ?? 0} lỗi.` })
      setBulkText('')
    }
  }

  const setOpt = (i) => (e) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? e.target.value : o)) }))

  const showForm = mode === 'create' || mode === 'edit'

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
        <div className="flex flex-col gap-space-xs">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold w-fit">
            Assessment Engine
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Quản lý câu hỏi</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Tạo, sửa và nhập hàng loạt câu hỏi trắc nghiệm theo từng chủ đề.
          </p>
        </div>
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <button
            type="button"
            onClick={openBulk}
            className="h-10 px-4 bg-surface-container-high text-on-surface rounded-lg font-label-lg text-label-lg font-medium flex items-center gap-space-xs hover:bg-surface-container-highest transition-all"
          >
            <Icon name="file_upload" className="text-[18px]" />
            Nhập hàng loạt
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-4 bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg font-semibold flex items-center gap-space-xs shadow-md hover:bg-primary transition-all"
          >
            <Icon name="add_circle" className="text-[18px]" />
            Câu hỏi mới
          </button>
        </div>
      </div>

      {/* Toolbar lọc */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex flex-col sm:flex-row items-center gap-space-md w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Icon name="filter_list" className="absolute inset-y-0 left-3 flex items-center text-outline text-[18px] h-full" />
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full h-10 pl-9 pr-8 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-secondary outline-none"
            >
              <option value="">Tất cả chủ đề</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full sm:w-80">
            <Icon name="search" className="absolute inset-y-0 left-3 flex items-center text-outline text-[18px] h-full" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg border-0 focus:ring-2 focus:ring-secondary outline-none placeholder:text-outline"
              placeholder="Tìm câu hỏi theo từ khoá..."
            />
          </div>
        </div>
        <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">{filtered.length} câu hỏi</span>
      </div>

      {/* Bảng */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        {loading && <LoadingBlock label="Đang tải câu hỏi…" />}
        {error && <ErrorBlock error={error} />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyBlock icon="quiz" title="Không có câu hỏi" hint="Đổi bộ lọc hoặc tạo câu hỏi mới." />
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                  <th className="py-3.5 px-space-lg">Nội dung câu hỏi</th>
                  <th className="py-3.5 px-space-md w-44">Chủ đề</th>
                  <th className="py-3.5 px-space-md w-28">Đáp án</th>
                  <th className="py-3.5 px-space-lg text-right w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filtered.map((it, i) => (
                  <tr key={it.id} className={editingId === it.id ? 'bg-surface-container-low' : 'hover:bg-surface-container-low transition-colors'}>
                    <td className="py-4 px-space-lg">
                      <div className="flex items-start gap-space-sm">
                        <span className="font-label-md text-label-md text-secondary font-semibold mt-0.5">Q{i + 1}.</span>
                        <span className="font-body-md text-body-md text-on-surface font-medium">{it.question_text || it.question}</span>
                      </div>
                    </td>
                    <td className="py-4 px-space-md">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        {topicName[it.topic_id] || it.topic || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-space-md">
                      <span className="font-label-md text-label-md text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
                        {Array.isArray(it.options) ? it.options.length : 0} lựa chọn
                      </span>
                    </td>
                    <td className="py-4 px-space-lg text-right">
                      <div className="inline-flex items-center gap-space-xs">
                        <button onClick={() => startEdit(it)} type="button" className="h-8 px-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-medium transition-colors flex items-center gap-1">
                          <Icon name="edit" className="text-[16px]" /> Sửa
                        </button>
                        <button onClick={() => onDelete(it)} type="button" className="h-8 px-2.5 rounded-lg bg-error-container/40 hover:bg-error-container text-error font-label-md text-label-md font-medium transition-colors flex items-center gap-1">
                          <Icon name="delete" className="text-[16px]" /> Xoá
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

      {/* Form tạo/sửa — chỉ hiện khi bấm "Câu hỏi mới" hoặc "Sửa" */}
      {showForm && (
        <div ref={panelRef} className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md max-w-3xl w-full scroll-mt-20">
          <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
            <div className="flex items-center gap-space-xs">
              <Icon name="edit_note" className="text-secondary text-[20px]" />
              <h2 className="font-headline-sm text-headline-sm text-primary">{mode === 'edit' ? 'Sửa câu hỏi' : 'Tạo câu hỏi'}</h2>
            </div>
            <button type="button" onClick={closePanel} className="text-outline hover:text-on-surface" title="Đóng">
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>

          {(formError || actionError) && (
            <p className="text-sm text-error bg-error-container/50 border border-error-container rounded-lg px-3 py-2" role="alert">{formError || actionError}</p>
          )}

          <form className="flex flex-col gap-space-md" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md font-medium text-on-surface">Chủ đề</label>
              <select
                required
                value={form.topic_id}
                onChange={(e) => setForm((f) => ({ ...f, topic_id: e.target.value }))}
                className="w-full h-10 px-3 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-secondary outline-none"
              >
                <option value="" disabled>-- Chọn chủ đề --</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md font-medium text-on-surface">Nội dung câu hỏi</label>
              <textarea
                required
                rows="3"
                value={form.question_text}
                onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
                className="w-full p-3 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg border-0 focus:ring-2 focus:ring-secondary outline-none resize-y"
              />
            </div>

            <div className="flex flex-col gap-space-sm">
              <label className="font-label-md text-label-md font-medium text-on-surface">Lựa chọn (chọn đáp án đúng)</label>
              {form.options.map((opt, i) => {
                const correct = Number(form.correct_answer) === i
                return (
                  <div key={i} className={`flex items-center gap-space-sm p-space-sm rounded-lg ${correct ? 'bg-tertiary-fixed/30' : 'bg-surface-container-low'}`}>
                    <input
                      type="radio"
                      name="correct"
                      checked={correct}
                      onChange={() => setForm((f) => ({ ...f, correct_answer: i }))}
                      className="w-4 h-4 text-secondary focus:ring-secondary cursor-pointer"
                    />
                    <span className={`font-label-md text-label-md font-semibold w-6 ${correct ? 'text-on-tertiary-fixed' : 'text-outline'}`}>{LETTERS[i]}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={setOpt(i)}
                      required={i < 2}
                      placeholder={`Đáp án ${LETTERS[i]}`}
                      className="flex-1 h-9 px-3 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded border-0 focus:ring-1 focus:ring-secondary outline-none"
                    />
                    {correct && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold shrink-0">
                        <Icon name="check" className="text-[14px]" /> Đúng
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-xs">
              <button type="button" onClick={closePanel} className="h-10 px-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg font-medium rounded-lg transition-colors">
                Huỷ
              </button>
              <button type="submit" disabled={saving} className="h-10 px-4 bg-primary-container text-on-primary hover:bg-primary font-label-lg text-label-lg font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60">
                <Icon name={saving ? 'progress_activity' : 'save'} className={`text-[18px] ${saving ? 'animate-spin' : ''}`} />
                {mode === 'edit' ? 'Cập nhật' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk import — chỉ hiện khi bấm "Nhập hàng loạt" */}
      {mode === 'bulk' && (
        <div ref={panelRef} className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md max-w-3xl w-full scroll-mt-20">
          <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
            <div className="flex items-center gap-space-xs">
              <Icon name="file_upload" className="text-secondary text-[20px]" />
              <h2 className="font-headline-sm text-headline-sm text-primary">Nhập hàng loạt</h2>
            </div>
            <button type="button" onClick={closePanel} className="text-outline hover:text-on-surface" title="Đóng">
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Dán MẢNG JSON các câu hỏi để nhập nhiều câu cùng lúc.</p>

          {bulkMsg && (
            <div
              className={`p-space-sm rounded-lg flex items-center gap-space-sm font-label-md text-label-md ${
                bulkMsg.type === 'ok' ? 'bg-tertiary-fixed/30 text-tertiary-container' : 'bg-error-container text-on-error-container'
              }`}
              role="status"
            >
              <Icon name={bulkMsg.type === 'ok' ? 'check_circle' : 'error'} className="text-[18px]" />
              {bulkMsg.text}
            </div>
          )}

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows="10"
            spellCheck={false}
            className="w-full bg-primary text-surface-bright font-code-block text-code-block rounded-lg p-3 focus:outline-none resize-y leading-relaxed"
            placeholder={`[
  {
    "topic_id": 1,
    "question_text": "kube-proxy làm gì?",
    "options": ["Định tuyến mạng", "Lên lịch pod", "Runtime", "Mount storage"],
    "correct_answer": 0
  }
]`}
          />

          <div className="flex items-center justify-end gap-space-sm">
            <button type="button" onClick={fillSample} className="h-10 px-4 bg-surface-container-low hover:bg-surface-container text-secondary font-label-lg text-label-lg font-medium rounded-lg transition-colors flex items-center gap-1">
              <Icon name="auto_fix_high" className="text-[18px]" />
              Chèn mẫu
            </button>
            <button type="button" onClick={() => setBulkText('')} className="h-10 px-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg font-medium rounded-lg transition-colors">
              Xoá
            </button>
            <button type="button" onClick={onBulk} disabled={saving || !bulkText.trim()} className="h-10 px-4 bg-primary-container text-on-primary hover:bg-primary font-label-lg text-label-lg font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1 disabled:opacity-60">
              <Icon name="publish" className="text-[18px]" />
              Nhập câu hỏi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
