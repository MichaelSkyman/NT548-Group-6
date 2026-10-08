// =====================================================================
// API CLIENT (KHUNG MẪU — bạn tự điền phần TODO)
//
// Nhiệm vụ của file này: gom MỌI lời gọi tới backend về một chỗ, mỗi tên
// hàm khớp với một endpoint. Component không gọi fetch trực tiếp, chỉ gọi
// các hàm ở đây.
//
// HỢP ĐỒNG API THẬT của backend (đây là "đề bài", bám theo cái này):
//   1. Admin đăng nhập bằng JWT:
//        POST /api/admin/login  -> { access_token, token_type, admin }
//      Sau đó MỌI request admin phải gửi header:
//        Authorization: Bearer <access_token>
//   2. Quiz:
//        GET  /api/quiz/:slug     -> { ..., questions:[...], quiz_token }
//        POST /api/quiz/submit    body { quiz_token, answers }
//      answers là OBJECT dạng { "<questionId>": optionIndex }, vd { "12": 0 }
//      => phải giữ lại quiz_token từ lúc GET để nộp kèm.
//   3. Khi lỗi, backend trả JSON: { error: "..." } kèm status != 2xx.
//   4. logout / delete trả 204 (không có body).
//
// GỢI Ý THỨ TỰ LÀM:
//   (a) viết object `token` (lưu/đọc/xóa JWT trong localStorage)
//   (b) viết hàm `request()` dùng chung: ghép URL, gắn header, bắt lỗi
//   (c) điền thân các hàm trong publicApi và adminApi (chỉ là gọi request)
// =====================================================================

// Dùng proxy "/api" trong vite.config.js (trỏ sang Flask cổng 5000).
// Muốn trỏ nơi khác thì đặt VITE_API_BASE trong file .env.
const BASE = import.meta.env.VITE_API_BASE || ''

const TOKEN_KEY = 'access_token'

// ---- (a) Lưu / lấy / xoá JWT trong localStorage ----
// TODO: hiện thực 4 phương thức dưới đây bằng localStorage.
export const token = {
  get: () => {
    return localStorage.getItem(TOKEN_KEY)
  },
  set: (t) => {
    return localStorage.setItem(TOKEN_KEY, t)
  },
  clear: () => {
    return localStorage.removeItem(TOKEN_KEY)
  },
  exists: () => {
    // TODO: trả về true/false tuỳ token có tồn tại không
    return !!localStorage.getItem(TOKEN_KEY)
  },
}

// ---- (b) Hàm fetch dùng chung cho tất cả ----
// Gợi ý luồng xử lý:
//   - ghép URL = BASE + path
//   - headers mặc định có 'Content-Type': 'application/json'
//   - nếu options.auth === true và có token -> thêm Authorization: Bearer ...
//   - gọi fetch; nếu res.status === 401 thì token.clear()
//   - nếu !res.ok -> đọc { error } từ body rồi throw new Error(message)
//   - nếu res.status === 204 -> return null; còn lại return res.json()
async function request(path, { auth = false, ...options } = {}) {
  const url = BASE + path
  const headers = { 'Content-Type' : 'application/json',...(options.headers || {}) }
  if (auth && token.exists()) {
    const t = token.get()
    if (t) headers['Authorization'] = `Bearer ${t}`
  }
  const res = await fetch(url, { ...options, headers})
  if (res.status === 401) token.clear()
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body.error || message   // backend để câu lỗi ở khóa "error"
    } catch (_) { /* body không phải JSON thì thôi */ }
    throw new Error(message)
  }
  if (res.status === 204) return null
  return res.json()
}

// ========================= PUBLIC API (Guest) =========================
export const publicApi = {
  // GET /api/topics -> [{ slug, name, title, description, content }, ...]
  getTopics: () => {
     return request('/api/topics')
  },

  // GET /api/topics/:slug -> 1 topic
  getTopic: (slug) => {
    return request(`/api/topics/${slug}`)
  },

  // GET /api/quiz/:slug
  // -> { title, topic, questions:[{id, question, question_text, options}], quiz_token }
  // LƯU Ý: nhớ giữ lại quiz_token để nộp bài.
  getQuiz: (slug) => {
    return request(`/api/quiz/${slug}`)
  },

  // POST /api/quiz/submit  body { quiz_token, answers }
  //   answers: OBJECT { [questionId]: optionIndex }
  // -> { topic, score, correct, incorrect, answered, total }
  submitQuiz: (quizToken, answers) => {
    return request(`/api/quiz/submit`, {
      method: 'POST',
      body: JSON.stringify({ quiz_token: quizToken, answers })
    })
  },
}

// ========================= ADMIN API (cần JWT) =========================
export const adminApi = {
  // --- Auth ---
  // POST /api/admin/login -> { access_token, token_type, admin }
  // Nhớ: đăng nhập thành công thì token.set(access_token) trước khi return.
  login: async (username, password) => {
    const res = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
    token.set(res.access_token)
    return res
  },

  // POST /api/admin/logout -> 204 (cần token). Dù lỗi hay không vẫn phải token.clear().
  logout: async () => {
    try {
      await request('/api/admin/logout', { method: 'POST', auth: true })
    } catch (_) {
      // ignore error
    } finally {
      token.clear()
    }
  },

  // GET /api/admin/me -> dùng để kiểm tra token còn hạn (bảo vệ route).
  me: () => {
    return request('/api/admin/me', {auth: true})
  },

  // --- Dashboard ---
  // GET /api/admin/dashboard -> { total_topics, total_questions, ... }
  getDashboard: () => {
    return request('/api/admin/dashboard', {auth:true})
  },

  // --- Topic CRUD ---
  getTopics: () => {
    return request('/api/admin/topics', {auth:true})
  },
  getTopic: (id) => {
    return request(`/api/admin/topics/${id}`, {auth:true})
  },
  createTopic: (data) => {
    return request('/api/admin/topics',{ method: 'POST', auth:true, body: JSON.stringify(data) })
  },
  updateTopic: (id, data) => {
    return request(`/api/admin/topics/${id}`, { method: 'PUT', auth:true, body: JSON.stringify(data) })
  },
  deleteTopic: (id) => {
    return request(`/api/admin/topics/${id}`, {method: 'DELETE', auth:true})
  },

  // --- Question CRUD ---
  // Lọc theo topic: getQuestions({ topicSlug: 'docker' }) hoặc { topicId: 1 }
  // Gợi ý: build query string bằng URLSearchParams (topic_slug / topic_id).
  getQuestions: ({ topicSlug, topicId } = {}) => {
    const params = new URLSearchParams()
    if (topicSlug) params.set('topic_slug', topicSlug)
    if (topicId) params.set('topic_id', topicId)
    return request(`/api/admin/questions?${params.toString()}`, {auth:true})
  },
  getQuestion: (id) => {
    return request(`/api/admin/questions/${id}`, {auth:true})
  },
  // data: { topic_id, question_text, options:[...], correct_answer: <index> }
  createQuestion: (data) => {
    return request('/api/admin/questions',{ method: 'POST', auth:true, body: JSON.stringify(data) })
  },
  updateQuestion: (id, data) => {
    return request(`/api/admin/questions/${id}`, { method: 'PUT', auth:true, body: JSON.stringify(data) })
  },
  deleteQuestion: (id) => {
    return request(`/api/admin/questions/${id}`, {method: 'DELETE', auth:true})
  },
  // POST /api/admin/questions/bulk -> { success, failed }
  bulkCreateQuestions: (payload) => {
    return request('/api/admin/questions/bulk', {method: 'POST', auth:true, body:JSON.stringify(payload)})
  },
}
