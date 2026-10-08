# DevOps Learning Platform — Frontend

Giao diện web (React + Vite) cho nền tảng học DevOps theo mô hình **Guest học tự do / Admin quản trị nội dung**. Frontend gọi tới Flask REST API của backend qua tiền tố `/api`.

## Chức năng chính

- **Guest**: xem danh sách topic, đọc nội dung học, làm quiz và nộp bài nhận điểm.
- **Admin**: đăng nhập JWT, xem dashboard, quản lý (CRUD) topic và câu hỏi.

## Cấu trúc thư mục

```
frontend/
├─ src/
│  ├─ api/client.js        # Gom toàn bộ lời gọi API (publicApi, adminApi, token)
│  ├─ pages/
│  │  ├─ TopicsPage.jsx        # Danh sách topic
│  │  ├─ TopicDetailPage.jsx   # Nội dung 1 topic
│  │  ├─ QuizPage.jsx          # Làm & nộp quiz
│  │  └─ admin/
│  │     ├─ LoginPage.jsx      # Đăng nhập admin
│  │     └─ DashboardPage.jsx  # Trang quản trị
│  ├─ App.jsx / main.jsx    # Khởi tạo app & routing
│  └─ *.css
└─ vite.config.js          # Dev server (port 3000) + proxy /api -> backend
```

## Chạy frontend

Yêu cầu Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

App chạy tại `http://localhost:3000`.

## Kết nối backend

- Khi dev, mọi request `/api/...` được **proxy** sang Flask ở `http://localhost:8000`
  (cấu hình trong `vite.config.js`), nên không lo CORS.
- **Phải bật backend trước** (xem README ở thư mục gốc để chạy Flask + PostgreSQL).
- Muốn trỏ API sang địa chỉ khác thì đặt biến `VITE_API_BASE` trong file `.env`.

## Kiểm tra đã kết nối backend chưa

1. Bật backend (port 8000) và frontend (port 3000).
2. Mở `http://localhost:3000`, trang hiển thị được danh sách topic là OK.
3. Hoặc mở DevTools (F12) → tab **Network**, các request `/api/...` trả về **200**.
