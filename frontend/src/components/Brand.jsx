import { Link } from 'react-router-dom'
import Icon from './Icon'

// Logo thương hiệu (thay ô "LOGO" placeholder trong bản thiết kế Stitch).
// tone="light" cho nền sáng (navbar); tone="dark" cho footer nền tối.
export default function Brand({ to = '/', tone = 'light', className = '' }) {
  const dark = tone === 'dark'
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="DevOps Learning Platform">
      <span className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
        <Icon name="deployed_code" className="text-[20px]" fill />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-headline-sm text-[15px] font-bold tracking-tight ${dark ? 'text-white' : 'text-primary'}`}>
          DevOpsLearn
        </span>
        <span className={`font-label-sm text-[10px] tracking-wider ${dark ? 'text-slate-400' : 'text-outline'}`}>
          LEARNING PLATFORM
        </span>
      </span>
    </Link>
  )
}
