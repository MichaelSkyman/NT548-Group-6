import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminApi } from '../api/client'

// Khung cho khu Admin: sidebar trái + vùng nội dung phải.
// Chỉ render khi đã qua ProtectedRoute (đăng nhập hợp lệ).
export default function AdminLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await adminApi.logout()                 // xoá token (dù lỗi vẫn clear)
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin">
      <aside className="sidebar">
        <NavLink to="/admin" end>Dashboard</NavLink>   {/* end: chỉ active đúng "/admin" */}
        <NavLink to="/admin/topics">Chủ đề</NavLink>
        <NavLink to="/admin/questions">Câu hỏi</NavLink>
        <button type="button" onClick={handleLogout}>Đăng xuất</button>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  )
}
