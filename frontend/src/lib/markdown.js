import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: false })

// Chuỗi -> slug để làm id cho heading (phục vụ mục lục "On this page").
export function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// Markdown -> HTML đã làm sạch (chống XSS vì nội dung hiển thị công khai).
export function renderMarkdown(md = '') {
  const raw = marked.parse(md || '')
  return DOMPurify.sanitize(raw)
}
