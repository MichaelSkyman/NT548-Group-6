import { useState } from 'react'
import { useLogin } from '../../hooks/useLogin'
import Icon from '../../components/Icon'

// TRANG: Đăng nhập Admin. Form nối thẳng useLogin() (đã tự lưu token + điều hướng).
export default function LoginPage() {
  const { username, setUsername, password, setPassword, submit, submitting, error } = useLogin({ redirectTo: '/admin' })
  const [showPw, setShowPw] = useState(false)

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col justify-between">
      <header className="w-full py-space-lg flex justify-center">
        <span className="inline-flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
            <Icon name="deployed_code" className="text-[20px]" fill />
          </span>
          <span className="font-headline-sm text-[15px] font-bold tracking-tight text-primary">DevOpsLearn</span>
        </span>
      </header>

      <main className="w-full flex-1 flex items-center justify-center px-margin py-space-lg">
        <div className="w-full max-w-md relative">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative w-full bg-surface-container-lowest rounded-xl shadow-xl p-space-xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center mb-space-lg">
              <Icon name="admin_panel_settings" className="text-[26px]" fill />
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-semibold text-center tracking-tight mb-space-xs">
              Đăng nhập Admin
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-xs mb-space-lg leading-relaxed">
              Nhập thông tin quản trị để truy cập bảng điều khiển.
            </p>

            <form className="w-full flex flex-col gap-space-md" onSubmit={submit}>
              {error && (
                <div className="w-full bg-error-container text-on-error-container rounded-lg p-space-sm flex items-start gap-space-xs" role="alert">
                  <Icon name="error" className="text-error text-[18px] mt-0.5" />
                  <div className="flex flex-col flex-1">
                    <span className="font-label-sm text-label-sm font-semibold">Đăng nhập thất bại</span>
                    <span className="font-body-sm text-body-sm">{error}</span>
                  </div>
                </div>
              )}

              <Field label="Tên đăng nhập" htmlFor="username">
                <Icon name="account_circle" className="absolute left-3 text-outline text-[18px] pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full h-10 bg-surface-container-low text-on-surface rounded-lg pl-9 pr-3 font-label-md text-label-md border-0 focus:ring-2 focus:ring-secondary outline-none transition"
                />
              </Field>

              <Field label="Mật khẩu" htmlFor="password">
                <Icon name="key" className="absolute left-3 text-outline text-[18px] pointer-events-none" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 bg-surface-container-low text-on-surface rounded-lg pl-9 pr-10 font-label-md text-label-md border-0 focus:ring-2 focus:ring-secondary outline-none transition"
                />
                <button
                  type="button"
                  aria-label="Hiện/ẩn mật khẩu"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 p-1 text-outline hover:text-on-surface transition flex items-center justify-center"
                >
                  <Icon name={showPw ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                </button>
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 mt-space-xs bg-primary-container hover:bg-primary text-on-primary rounded-lg font-label-lg text-label-lg font-medium shadow-md transition flex items-center justify-center gap-space-xs tracking-wide disabled:opacity-60"
              >
                <Icon name={submitting ? 'progress_activity' : 'lock_open'} className={`text-[18px] ${submitting ? 'animate-spin' : ''}`} />
                <span>{submitting ? 'Đang xác thực…' : 'Đăng nhập'}</span>
              </button>
            </form>

            <div className="mt-space-lg w-full flex items-center justify-center gap-1.5 text-center">
              <Icon name="verified_user" className="text-[14px] text-outline" />
              <p className="font-body-sm text-[11px] text-on-surface-variant leading-snug">
                Chỉ dành cho quản trị. Mọi truy cập trái phép đều được ghi nhận.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-space-lg text-center font-body-sm text-body-sm text-outline">
        © 2026 DevOps Learning Platform. All rights reserved.
      </footer>
    </div>
  )
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={htmlFor} className="font-label-sm text-label-sm text-on-surface-variant font-medium">
        {label}
      </label>
      <div className="relative flex items-center w-full">{children}</div>
    </div>
  )
}
