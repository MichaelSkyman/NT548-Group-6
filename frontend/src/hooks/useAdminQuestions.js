// HOOK: LOGIC quản lý Question phía admin (CRUD + bulk, không có giao diện).
// Dùng cho trang quản lý câu hỏi (/admin/questions) khi dựng UI sau này.
//
//   getQuestions({ topicSlug | topicId }) -> [ { id, question_text, options, ... }, ... ]
//   data câu hỏi: { topic_id, question_text, options:[...], correct_answer: <index> }
//   bulk payload -> { success, failed }
//
// Truyền filter để lọc theo chủ đề; đổi filter sẽ tự tải lại.

import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../api/client'

export function useAdminQuestions({ topicSlug, topicId } = {}) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [tick, setTick] = useState(0)   // tăng để buộc tải lại

  // Tải lại (gọi được từ UI sau mỗi thao tác hoặc nút "Làm mới").
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = (await adminApi.getQuestions({ topicSlug, topicId })) ?? []
        if (alive) setQuestions(data)
      } catch (err) {
        if (alive) setError(err.message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [topicSlug, topicId, tick])

  const run = useCallback(async (fn) => {
    setSaving(true)
    setActionError(null)
    try {
      const res = await fn()
      reload()
      return res
    } catch (err) {
      setActionError(err.message)
      return null
    } finally {
      setSaving(false)
    }
  }, [reload])

  const createQuestion = useCallback((data) => run(() => adminApi.createQuestion(data)), [run])
  const updateQuestion = useCallback((id, data) => run(() => adminApi.updateQuestion(id, data)), [run])
  const removeQuestion = useCallback((id) => run(() => adminApi.deleteQuestion(id)), [run])
  const bulkCreate = useCallback((payload) => run(() => adminApi.bulkCreateQuestions(payload)), [run])

  return {
    questions, loading, error,
    reload,
    createQuestion, updateQuestion, removeQuestion, bulkCreate,
    saving, actionError,
  }
}
