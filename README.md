# DevOps Learning Platform — Frontend

Giao diện web (React + Vite) cho nền tảng học DevOps theo mô hình **Guest học tự do / Admin quản trị nội dung**. Frontend gọi tới Flask REST API của backend qua tiền tố `/api`.

## Chức năng chính

- **Guest**: xem danh sách topic, đọc nội dung học, làm quiz và nộp bài nhận điểm.
- **Admin**: đăng nhập JWT, xem dashboard, quản lý (CRUD) topic và câu hỏi.

### Tài khoản admin (môi trường học/demo)

Admin được tạo bởi `backend/seed.py` theo `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong `.env`.
Không đặt mật khẩu mặc định trong mã nguồn; hãy tự cung cấp giá trị local/demo và **không commit mật khẩu thật** lên git.

## Trạng thái hiện tại

- ✅ **Kết nối frontend ↔ backend**: `api/client.js` + proxy `/api` (dev) / Ingress (prod).
- ✅ **Tầng logic (headless hooks)**: data fetching, state quiz, đăng nhập, dashboard, CRUD admin — không dính giao diện.
- ✅ **Đóng gói triển khai**: `Dockerfile` (multi-stage) + `nginx.conf` (SPA fallback, health check) + `.env.example`.
- ✅ **Giao diện (UI) đầy đủ**: toàn bộ trang Guest + Admin đã dựng bằng **Tailwind CSS** theo bộ token trong `DESIGN.md` — không còn stub.

## Giao diện đã bổ sung (bản `feature-frontend`)

Dựng toàn bộ UI từ bản thiết kế, nối trực tiếp với các `hooks/` + `api/client.js` sẵn có.

**Khu Guest (công khai):**

- **Danh sách chủ đề** — hero, ô tìm kiếm lọc theo tên/mô tả, lưới thẻ chủ đề (tự gợi ý icon/nhóm theo tên, badge số câu hỏi/video), có trạng thái tải/lỗi/rỗng.
- **Chi tiết chủ đề** — nhúng video YouTube, render **nội dung Markdown an toàn** (marked + DOMPurify), **mục lục "Nội dung trang"** tự sinh từ heading, nút làm quiz.
- **Quiz** — làm từng câu, bảng nhảy câu (navigator), thanh tiến độ, nộp bài; **màn Kết quả** (vòng điểm %, 3 ô thống kê, ôn lại đáp án đã chọn).
- **Trang 404** có ô tìm kiếm + gợi ý chủ đề phổ biến.
- Navbar + footer công khai dùng chung.

**Khu Admin (cần đăng nhập JWT):**

- **Đăng nhập** + bảo vệ route (`ProtectedRoute`); **đăng xuất** quay về trang công khai.
- **Dashboard** — 4 ô thống kê, biểu đồ câu hỏi/chủ đề, bảng trạng thái chủ đề.
- **Quản lý chủ đề** — bảng + form tạo/sửa (ẩn tới khi bấm, tự cuộn tới) + xoá.
- **Quản lý câu hỏi** — lọc theo chủ đề, tìm kiếm, bảng; form 4 đáp án (chọn đáp án đúng, **kiểm tra trùng/không để trống phía client**); **nhập hàng loạt JSON** (có nút "Chèn mẫu").
- **Kiến trúc hệ thống** — sơ đồ 3-tier trên EKS (đặt trong khu admin).
- **System Status** — gọi `GET /api/health`, hiển thị tình trạng Backend/Database + payload.
- Sidebar + topbar + footer admin.

**Hạ tầng UI thêm vào:**

- **Tailwind CSS v3** + `@tailwindcss/forms` + PostCSS; **design tokens** (màu/typography/spacing/radius) lấy từ `DESIGN.md` trong `tailwind.config.js`.
- Font **Geist** + **JetBrains Mono** + **Material Symbols** (nạp trong `index.html`).
- **marked** + **dompurify** để render Markdown an toàn.
- Component dùng chung: `Brand`, `Icon`, `StateBlock` (loading/error/empty), `guest/GuestFooter`, `quiz/QuizResult`.
- `api/client.js` thêm `getHealth()`; `App.jsx` thêm route: `/architecture` (nằm trong `/admin/architecture`), `/admin/topics`, `/admin/questions`, `/admin/system-status`, và trang 404.

## Cấu trúc thư mục

```
frontend/
├─ Dockerfile              # Build multi-stage: node build dist/ -> nginx phục vụ
├─ nginx.conf             # SPA fallback (try_files) + /healthz cho ALB
├─ .dockerignore
├─ .env.example           # Mẫu biến VITE_API_BASE
├─ vite.config.js         # Dev server (port 3000) + proxy /api -> backend :8000
├─ tailwind.config.js     # Design tokens (theo DESIGN.md) + @tailwindcss/forms
├─ postcss.config.js      # Tailwind + autoprefixer
├─ index.html             # Nạp font Geist / JetBrains Mono / Material Symbols
└─ src/
   ├─ api/
   │  └─ client.js        # Gom toàn bộ lời gọi API (publicApi, adminApi, token)
   ├─ hooks/              # LOGIC (không UI) — tái sử dụng cho các trang
   │  ├─ useApi.js            # Gom loading/error/data cho mọi lời gọi API
   │  ├─ useTopics.js         # Danh sách topic (Guest)
   │  ├─ useTopic.js          # Nội dung 1 topic theo slug
   │  ├─ useQuiz.js           # Tải đề quiz + quiz_token
   │  ├─ useQuizSession.js    # Toàn bộ luồng làm quiz: chọn đáp án, nộp, kết quả
   │  ├─ useLogin.js          # Logic đăng nhập admin + điều hướng
   │  ├─ useDashboard.js      # Số liệu dashboard + đăng xuất
   │  ├─ useAdminTopics.js    # CRUD topic (admin)
   │  └─ useAdminQuestions.js # CRUD + bulk câu hỏi (admin)
   ├─ lib/
   │  ├─ quiz.js          # Hàm thuần: chọn đáp án, đếm, tiến độ (dễ test)
   │  ├─ markdown.js      # Render Markdown an toàn (marked + DOMPurify) + slug
   │  └─ topicMeta.js     # Gợi ý icon/nhóm + đếm câu hỏi / 'có video' theo topic
   ├─ layouts/
   │  ├─ GuestLayout.jsx  # Navbar công khai + nội dung + footer
   │  └─ AdminLayout.jsx  # Sidebar + topbar + footer + đăng xuất
   ├─ components/
   │  ├─ ProtectedRoute.jsx   # Chặn route admin nếu chưa đăng nhập
   │  ├─ Brand.jsx            # Logo/thương hiệu
   │  ├─ Icon.jsx             # Bọc Material Symbols
   │  ├─ StateBlock.jsx       # Khối Loading / Error / Empty dùng chung
   │  ├─ guest/GuestFooter.jsx
   │  └─ quiz/QuizResult.jsx  # Màn kết quả quiz
   ├─ pages/
   │  ├─ TopicsPage.jsx       # Danh sách chủ đề + tìm kiếm
   │  ├─ TopicDetailPage.jsx  # Video + Markdown + mục lục
   │  ├─ QuizPage.jsx         # Làm & nộp quiz + kết quả
   │  ├─ NotFoundPage.jsx     # Trang 404
   │  ├─ ArchitecturePage.jsx # Sơ đồ kiến trúc (hiển thị trong khu admin)
   │  └─ admin/
   │     ├─ LoginPage.jsx          # Đăng nhập admin
   │     ├─ DashboardPage.jsx      # Thống kê + biểu đồ
   │     ├─ TopicsAdminPage.jsx    # CRUD chủ đề
   │     ├─ QuestionsAdminPage.jsx # CRUD + nhập hàng loạt câu hỏi
   │     └─ SystemStatusPage.jsx   # Health check backend/DB
   ├─ App.jsx / main.jsx  # Khởi tạo app & định tuyến (react-router)
   └─ index.css           # Tailwind directives + base + style Markdown
```

> **Phân tầng:** `pages` (giao diện) → gọi `hooks` (logic/state) → gọi `api/client.js` (HTTP) → backend.
> `pages/*` nay đã có UI đầy đủ; logic vẫn tách riêng trong `hooks/` và `lib/`.

## Chạy frontend (dev)

Yêu cầu Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

App chạy tại `http://localhost:3000`.

## Build & kiểm tra chất lượng

```bash
npm run lint      # ESLint — kỳ vọng 0 lỗi
npm run build     # Vite build ra thư mục dist/
npm run preview   # Chạy thử bản build (có SPA fallback), mặc định http://localhost:4173
```

## Chạy bằng Docker (giống môi trường EKS)

```bash
cd frontend
docker build -t devopslearn-frontend:dev .
docker run --rm -p 8080:80 devopslearn-frontend:dev
```

Kiểm tra tại `http://localhost:8080`:

- `/healthz` → trả `ok` (health check cho ALB).
- Vào thẳng `/admin` hoặc `/topics/docker` rồi **refresh (F5)** → **không 404** (SPA fallback trong `nginx.conf`).

> Container frontend **không tự proxy `/api`**. Trên EKS, **ALB Ingress** định tuyến theo path:
> `/api/*` → Service backend, còn `/*` → Service frontend (container này).

## Kết nối backend

- Khi dev, mọi request `/api/...` được **proxy** sang Flask ở `http://localhost:8000`
  (cấu hình trong `vite.config.js`), nên không lo CORS.
- **Phải bật backend trước** (xem phần chạy backend bên dưới).
- Mặc định `VITE_API_BASE` để trống → gọi same-origin, để nginx/Ingress lo `/api`.
  Chỉ đặt `VITE_API_BASE` khi muốn trỏ thẳng API sang domain khác (tạo file `.env` từ `.env.example`).

## Kiểm tra đã kết nối backend chưa

1. Bật backend (port 8000) và frontend (port 3000).
2. Gọi `curl http://localhost:3000/api/topics` → nhận được **danh sách topic** (đi qua proxy) là OK.
3. Hoặc mở DevTools (F12) → tab **Network**, các request `/api/...` trả về **200**.

---

## Chạy backend (tham khảo — phần của nhóm backend)

Yêu cầu Python 3.12+ và PostgreSQL đang chạy.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements-dev.txt
copy .env.example .env           # sửa DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY, ADMIN_PASSWORD
flask --app run.py db upgrade    # tạo bảng (migration)
python seed.py                   # nạp dữ liệu mẫu + tài khoản admin
flask --app run.py run --port 8000
```

API chạy tại `http://localhost:8000` (ví dụ `GET /api/health`, `GET /api/topics`).
