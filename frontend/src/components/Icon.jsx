// Bọc Material Symbols cho gọn: <Icon name="search" /> thay cho
// <span className="material-symbols-outlined">search</span>.
// `fill` để bật biến thể nét đặc (FILL 1); `className` để chỉnh cỡ/màu.
export default function Icon({ name, className = '', fill = false, style, ...rest }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={fill ? { fontVariationSettings: "'FILL' 1", ...style } : style}
      aria-hidden="true"
      {...rest}
    >
      {name}
    </span>
  )
}
