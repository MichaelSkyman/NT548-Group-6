import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { adminApi, token } from '../api/client'

// Bọc các route cần đăng nhập. Kiểm tra token còn hạn bằng adminApi.me().
// 3 trạng thái: 'checking' (đang hỏi API) | 'ok' | 'denied'.
export default function ProtectedRoute({ children }) {
  // Chưa có token -> 'denied' ngay; có token -> 'checking' rồi mới hỏi API.
  const [status, setStatus] = useState(() => (token.exists() ? 'checking' : 'denied'))

  useEffect(() => {
    if (status !== 'checking') return      // không có token -> khỏi gọi API
    let alive = true                       // tránh setState sau khi unmount
    adminApi.me()                          // token còn hạn không?
      .then(() => { if (alive) setStatus('ok') })
      .catch(() => { if (alive) setStatus('denied') })  // 401 -> client.js tự xoá token
    return () => { alive = false }
  }, [status])

  if (status === 'checking') return <p>Đang kiểm tra đăng nhập…</p>
  if (status === 'denied') return <Navigate to="/admin/login" replace />
  return children                          // hợp lệ -> render children (AdminLayout)
}
