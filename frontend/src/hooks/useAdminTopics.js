// HOOK: LOGIC quản lý Topic phía admin (CRUD, không có giao diện).
// Dùng cho trang quản lý chủ đề (/admin/topics) khi dựng UI sau này.
//
//   getTopics() -> [ { id, name, slug, ... }, ... ]   (mảng)
//   create/update/delete xong sẽ tự tải lại danh sách.

import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../api/client'

export function useAdminTopics() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)      // lỗi khi tải danh sách
  const [saving, setSaving] = useState(false)    // đang chạy 1 thao tác ghi
  const [actionError, setActionError] = useState(null) // lỗi của thao tác ghi
  const [tick, setTick] = useState(0)            // tăng để buộc tải lại

  // Tải lại danh sách (gọi được từ UI sau mỗi thao tác hoặc nút "Làm mới").
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = (await adminApi.getTopics()) ?? []
        if (alive) setTopics(data)
      } catch (err) {
        if (alive) setError(err.message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [tick])

  // Gói chung: chạy 1 thao tác ghi -> tải lại danh sách -> trả kết quả (null nếu lỗi).
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

  const createTopic = useCallback((data) => run(() => adminApi.createTopic(data)), [run])
  const updateTopic = useCallback((id, data) => run(() => adminApi.updateTopic(id, data)), [run])
  const removeTopic = useCallback((id) => run(() => adminApi.deleteTopic(id)), [run])

  return {
    topics, loading, error,
    reload,
    createTopic, updateTopic, removeTopic,
    saving, actionError,
  }
}
