import Icon from './Icon'

// Các khối trạng thái dùng lại ở nhiều trang: đang tải / lỗi / rỗng.

export function LoadingBlock({ label = 'Đang tải…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-space-sm py-16 text-on-surface-variant ${className}`}>
      <Icon name="progress_activity" className="animate-spin text-[32px] text-secondary" />
      <p className="font-body-md text-body-md">{label}</p>
    </div>
  )
}

export function ErrorBlock({ error, onRetry, className = '' }) {
  const message = typeof error === 'string' ? error : error?.message || 'Đã có lỗi xảy ra.'
  return (
    <div
      className={`flex flex-col items-center justify-center gap-space-sm py-16 text-center ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
        <Icon name="error" className="text-[26px]" />
      </div>
      <p className="font-headline-sm text-headline-sm text-on-surface">Không tải được dữ liệu</p>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-space-xs inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-colors"
        >
          <Icon name="refresh" className="text-[18px]" />
          Thử lại
        </button>
      )}
    </div>
  )
}

export function EmptyBlock({ icon = 'inbox', title = 'Chưa có dữ liệu', hint, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-space-xs py-16 text-center ${className}`}>
      <Icon name={icon} className="text-[40px] text-outline-variant" />
      <p className="font-headline-sm text-headline-sm text-on-surface">{title}</p>
      {hint && <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{hint}</p>}
    </div>
  )
}
