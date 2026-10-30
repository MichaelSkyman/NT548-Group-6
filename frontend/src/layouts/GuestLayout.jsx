import { NavLink, Outlet } from 'react-router-dom'
import Brand from '../components/Brand'
import GuestFooter from '../components/guest/GuestFooter'

// Khung cho khu Guest: navbar công khai + nội dung + footer tối.
// Các trang con render vào <Outlet/>.
const navClass = ({ isActive }) =>
  [
    'h-full flex items-center border-b-2 text-sm tracking-tight transition-colors',
    isActive
      ? 'text-primary font-semibold border-primary-container'
      : 'text-slate-600 hover:text-primary font-medium border-transparent',
  ].join(' ')

export default function GuestLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
          <Brand />
          <nav className="flex items-center gap-8 h-full">
            <NavLink to="/topics" className={navClass}>Chủ đề</NavLink>
            <NavLink to="/admin/login" className={navClass}>Admin</NavLink>
          </nav>
        </div>
      </header>

      <main className="w-full flex-1">
        <Outlet />
      </main>

      <GuestFooter />
    </div>
  )
}
