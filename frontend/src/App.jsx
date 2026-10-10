import { Routes, Route, Navigate } from 'react-router-dom'
import GuestLayout from './layouts/GuestLayout'
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import TopicsPage from './pages/TopicsPage'
import TopicDetailPage from './pages/TopicDetailPage'
import QuizPage from './pages/QuizPage'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'

export default function App() {
  return (
    <Routes>
      {/* ----- Khu GUEST: dùng chung GuestLayout ----- */}
      <Route element={<GuestLayout />}>
        <Route index element={<TopicsPage />} />           {/* "/" */}
        <Route path="topics" element={<TopicsPage />} />    {/* "/topics" */}
        <Route path="topics/:slug" element={<TopicDetailPage />} />
        <Route path="quiz/:slug" element={<QuizPage />} />
      </Route>

      {/* Đăng nhập admin: để NGOÀI layout admin (chưa cần sidebar) */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* ----- Khu ADMIN: phải đăng nhập mới vào ----- */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />         {/* "/admin" */}
        {/* sau này tạo thêm:
        <Route path="topics" element={<TopicsAdminPage />} />
        <Route path="questions" element={<QuestionsAdminPage />} /> */}
      </Route>

      {/* 404: gì không khớp thì đẩy về trang chủ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
