import { Link, NavLink, Outlet } from 'react-router-dom'

// Khung cho khu Guest: navbar trên cùng + vùng nội dung bên dưới.
// Các trang con (TopicsPage, TopicDetailPage, QuizPage) render vào <Outlet/>.
export default function GuestLayout() {
  return (
    <div className="app">
      <header className="navbar">
        <Link to="/" className="brand">DevOpsLearn</Link>
        <nav>
          <NavLink to="/topics">Chủ đề</NavLink>
          <NavLink to="/admin/login">Admin</NavLink>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
