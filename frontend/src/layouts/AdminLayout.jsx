import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminApi } from '../api/client'
import Icon from '../components/Icon'

// Khung khu Admin: sidebar trái + topbar + nội dung + footer.
// Chỉ render khi đã qua ProtectedRoute.
const NAV = [
  { to: '/admin', end: true, icon: 'dashboard', label: 'Dashboard' },
  { to: '/admin/topics', end: false, icon: 'menu_book', label: 'Chủ đề' },
  { to: '/admin/questions', end: false, icon: 'quiz', label: 'Câu hỏi' },
  { to: '/admin/architecture', end: false, icon: 'account_tree', label: 'Kiến trúc' },
  { to: '/admin/system-status', end: false, icon: 'dns', label: 'System Status' },
]

const linkClass = ({ isActive }) =>
  [
    'flex items-center gap-space-md px-3 py-2.5 rounded-lg transition-all',
    isActive
      ? 'bg-primary-container text-on-primary-container font-medium'
      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
  ].join(' ')

export default function AdminLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await adminApi.logout()                 // xoá token (dù lỗi vẫn clear)
    navigate('/', { replace: true })        // về lại web công khai (danh sách chủ đề)
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col">
          <div className="h-16 flex items-center px-6">
            <span className="inline-flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                <Icon name="deployed_code" className="text-[20px]" fill />
              </span>
              <span className="font-headline-sm text-[15px] font-bold tracking-tight text-primary">DevOpsLearn</span>
            </span>
          </div>
          <div className="px-4 py-2">
            <p className="px-3 mb-2 font-label-sm text-label-sm uppercase tracking-wider text-outline">Platform Core</p>
            <nav className="flex flex-col gap-space-xs">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                  <Icon name={item.icon} className="text-[20px]" />
                  <span className="font-body-md text-body-md">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-space-md px-3 py-2.5 rounded-lg text-error hover:bg-error-container hover:text-on-error-container transition-all"
          >
            <Icon name="logout" className="text-[20px]" />
            <span className="font-body-md text-body-md font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Vùng nội dung */}
      <div className="pl-[260px] min-h-screen flex flex-col justify-between">
        <header className="fixed top-0 left-[260px] right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 flex items-center justify-between px-margin shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-space-sm">
            <Icon name="terminal" className="text-outline text-[20px]" />
            <span className="font-headline-sm text-headline-sm text-primary">Console View</span>
          </div>
          <div className="flex items-center gap-space-md">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              Admin
            </span>
            <span className="hidden sm:inline-flex items-center gap-space-xs font-label-md text-label-md text-outline font-medium">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim" />
              v1.0 Production
            </span>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Icon name="person" className="text-on-primary text-[18px]" />
            </div>
          </div>
        </header>

        <main className="relative pt-16 bg-surface p-margin min-h-[calc(100vh-4rem)] flex-1">
          <Outlet />
        </main>

        <footer className="w-full bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-margin py-space-lg">
          <div className="max-w-7xl mx-auto text-center font-body-sm text-body-sm text-outline">
            © 2026 DevOps Learning Platform · Admin Console · Amazon EKS
          </div>
        </footer>
      </div>
    </div>
  )
}
