// HOOK: LOGIC dashboard admin (không có giao diện).
// Lấy số liệu tổng quan + cung cấp hàm đăng xuất.
//
//   getDashboard() -> { total_topics, total_questions, questions_per_topic, content_overview }
//   logout() -> xoá token (dù lỗi vẫn xoá) rồi về trang đăng nhập.

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../api/client'
import { useApi } from './useApi'

export function useDashboard({ onLogoutRedirect = '/admin/login' } = {}) {
  const navigate = useNavigate()
  const { data, loading, error } = useApi(() => adminApi.getDashboard(), [])

  const logout = useCallback(async () => {
    await adminApi.logout()
    navigate(onLogoutRedirect, { replace: true })
  }, [navigate, onLogoutRedirect])

  return { data, loading, error, logout }
}
