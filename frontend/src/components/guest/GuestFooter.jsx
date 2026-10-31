import { Link } from 'react-router-dom'
import Brand from '../Brand'

// Footer nền tối, dùng chung cho mọi trang Guest (giống bản thiết kế Stitch).
export default function GuestFooter() {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-content mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-800">
          <div className="md:col-span-6 flex flex-col gap-3">
            <Brand tone="dark" />
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              Nền tảng học DevOps thực hành, kiến trúc cloud-native: Docker, Kubernetes, Terraform, CI/CD.
            </p>
          </div>
          <nav className="md:col-span-3 flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-1">Liên kết</h4>
            <Link className="text-sm text-slate-400 hover:text-white transition-colors" to="/topics">Chủ đề</Link>
            <Link className="text-sm text-slate-400 hover:text-white transition-colors" to="/topics">Quiz</Link>
          </nav>
          <div className="md:col-span-3 flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-1">Công nghệ</h4>
            <p className="text-xs font-mono text-indigo-300">React · Flask · PostgreSQL · Amazon EKS</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-400">Public Learning Portal</span>
            </div>
          </div>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 DevOps Learning Platform. All rights reserved.</p>
          <p className="font-mono text-slate-600">3-Tier Production Stack</p>
        </div>
      </div>
    </footer>
  )
}
