import { Routes, Route } from 'react-router-dom'
import GuestLayout from './layouts/GuestLayout'
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import TopicsPage from './pages/TopicsPage'
import TopicDetailPage from './pages/TopicDetailPage'
import QuizPage from './pages/QuizPage'
import ArchitecturePage from './pages/ArchitecturePage'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import TopicsAdminPage from './pages/admin/TopicsAdminPage'
import QuestionsAdminPage from './pages/admin/QuestionsAdminPage'
import SystemStatusPage from './pages/admin/SystemStatusPage'

export default function App() {
  return (
    <Routes>
      {/* ----- Khu GUEST: dùng chung GuestLayout ----- */}
      <Route element={<GuestLayout />}>
        <Route index element={<TopicsPage />} />           {/* "/" */}
        <Route path="topics" element={<TopicsPage />} />    {/* "/topics" */}
        <Route path="topics/:slug" element={<TopicDetailPage />} />
        <Route path="quiz/:slug" element={<QuizPage />} />
        {/* 404: nằm trong GuestLayout để vẫn có navbar + footer */}
        <Route path="*" element={<NotFoundPage />} />
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
        <Route index element={<DashboardPage />} />            {/* "/admin" */}
        <Route path="topics" element={<TopicsAdminPage />} />
        <Route path="questions" element={<QuestionsAdminPage />} />
        <Route path="architecture" element={<ArchitecturePage />} />
        <Route path="system-status" element={<SystemStatusPage />} />
      </Route>
    </Routes>
  )
}
