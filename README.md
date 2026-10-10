# DevOps Learning Platform — Frontend

Giao diện web (React + Vite) cho nền tảng học DevOps theo mô hình **Guest học tự do / Admin quản trị nội dung**. Frontend gọi tới Flask REST API của backend qua tiền tố `/api`.

## Chức năng chính

- **Guest**: xem danh sách topic, đọc nội dung học, làm quiz và nộp bài nhận điểm.
- **Admin**: đăng nhập JWT, xem dashboard, quản lý (CRUD) topic và câu hỏi.

## Trạng thái hiện tại

- ✅ **Kết nối frontend ↔ backend**: `api/client.js` + proxy `/api` (dev) / Ingress (prod).
- ✅ **Tầng logic (headless hooks)**: data fetching, state quiz, đăng nhập, dashboard, CRUD admin — không dính giao diện.
- ✅ **Đóng gói triển khai**: `Dockerfile` (multi-stage) + `nginx.conf` (SPA fallback, health check) + `.env.example`.
- ⏳ **Giao diện (UI) của các trang**: đang để stub chờ nhóm chốt thiết kế. Khi có UI, mỗi trang chỉ cần gọi hook tương ứng rồi render.

## Cấu trúc thư mục

```
frontend/
├─ Dockerfile              # Build multi-stage: node build dist/ -> nginx phục vụ
├─ nginx.conf             # SPA fallback (try_files) + /healthz cho ALB
├─ .dockerignore
├─ .env.example           # Mẫu biến VITE_API_BASE
├─ vite.config.js         # Dev server (port 3000) + proxy /api -> backend :8000
├─ index.html
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
   │  └─ quiz.js          # Hàm thuần: chọn đáp án, đếm, tiến độ (dễ test)
   ├─ layouts/
   │  ├─ GuestLayout.jsx  # Khung Guest: navbar + nội dung
   │  └─ AdminLayout.jsx  # Khung Admin: sidebar + nội dung + đăng xuất
   ├─ components/
   │  └─ ProtectedRoute.jsx   # Chặn route admin nếu chưa đăng nhập
   ├─ pages/
   │  ├─ TopicsPage.jsx       # Danh sách topic           (UI: stub)
   │  ├─ TopicDetailPage.jsx  # Nội dung 1 topic          (UI: stub)
   │  ├─ QuizPage.jsx         # Làm & nộp quiz            (UI: stub)
   │  └─ admin/
   │     ├─ LoginPage.jsx     # Đăng nhập admin           (UI: stub)
   │     └─ DashboardPage.jsx # Trang quản trị            (UI: stub)
   ├─ App.jsx / main.jsx  # Khởi tạo app & định tuyến (react-router)
   └─ *.css
```

> **Phân tầng:** `pages` (giao diện) → gọi `hooks` (logic/state) → gọi `api/client.js` (HTTP) → backend.
> UI chưa chốt nên `pages/*` còn là stub; toàn bộ logic đã nằm sẵn trong `hooks/` và `lib/`.

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
