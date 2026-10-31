// Gợi ý icon + nhãn nhóm theo tên/slug chủ đề, để thẻ chủ đề sinh động mà
// KHÔNG phụ thuộc backend phải trả thêm field. Có thì dùng, không có thì fallback.

const TABLE = [
  { re: /docker/i, icon: 'deployed_code', accent: 'sky', category: 'Foundations' },
  { re: /kubernetes|k8s/i, icon: 'hub', accent: 'indigo', category: 'Orchestration' },
  { re: /jenkins/i, icon: 'sync_alt', accent: 'amber', category: 'Automation' },
  { re: /terraform/i, icon: 'architecture', accent: 'purple', category: 'Infrastructure as Code' },
  { re: /github|actions/i, icon: 'all_inclusive', accent: 'slate', category: 'CI/CD & GitOps' },
  { re: /linux|shell|bash/i, icon: 'terminal', accent: 'emerald', category: 'System Essentials' },
  { re: /git/i, icon: 'fork_right', accent: 'orange', category: 'Version Control' },
]

const ACCENTS = {
  sky: 'bg-sky-50 text-sky-600 border-sky-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  slate: 'bg-slate-100 text-slate-800 border-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  default: 'bg-surface-container text-secondary border-surface-container-high',
}

export function topicMeta(topic = {}) {
  const key = `${topic.name || ''} ${topic.slug || ''} ${topic.title || ''}`
  const hit = TABLE.find((t) => t.re.test(key))
  const accentKey = hit?.accent || 'default'
  return {
    icon: hit?.icon || 'menu_book',
    category: topic.category || hit?.category || 'DevOps',
    accentClass: ACCENTS[accentKey] || ACCENTS.default,
  }
}

// Đếm câu hỏi của 1 chủ đề từ nhiều cách đặt tên field khác nhau của backend.
export function topicQuestionCount(topic = {}) {
  const v =
    topic.question_count ??
    topic.questions_count ??
    topic.num_questions ??
    (Array.isArray(topic.questions) ? topic.questions.length : undefined)
  return Number.isFinite(v) ? v : null
}

// Chủ đề có video nhúng không?
export function topicHasVideo(topic = {}) {
  return Boolean(topic.video_url || topic.youtube_url || topic.video || topic.has_video)
}
