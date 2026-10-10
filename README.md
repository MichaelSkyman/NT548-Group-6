# DevOps Learning Platform — Backend

Flask REST API cho mô hình **Guest học tự do / Admin quản trị nội dung**, được dựng lại từ đặc tả `backend-guest-admin-architecture.md`

## Chức năng

- Guest không cần tài khoản: xem topic, nội dung học, nhận quiz và nộp bài.
- Topic có `content` dạng text và `video_url` tùy chọn; nếu có video thì chỉ chấp nhận URL HTTPS từ YouTube.
- Quiz đảo câu hỏi/đáp án nhưng không trả `correct_answer`; `quiz_token` có chữ ký giúp server chấm đúng và chống sửa dữ liệu.
- Admin đăng nhập JWT, logout vô hiệu hóa token đang tồn tại.
- Admin CRUD Topic, CRUD Question, bulk import dạng JSON và xem dashboard thống kê.
- PostgreSQL, Alembic migration, seed idempotent và health check.
- Kiến trúc Route → Service → Repository → Model.

## Chạy backend

Yêu cầu Python 3.12+ và PostgreSQL đang hoạt động.

```bash
copy .env.example .env
# Cập nhật DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY và ADMIN_PASSWORD
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
flask --app run.py db upgrade
python seed.py
flask --app run.py run --port 8000
```

API chạy tại `http://localhost:8000`. Kiểm tra:

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/topics
```

## API chính

Public:

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/health` | Health của app và database |
| GET | `/api/topics` | Danh sách topic |
| GET | `/api/topics/{slug}` | Nội dung topic |
| GET | `/api/quiz/{slug}` | Sinh quiz và `quiz_token` |
| POST | `/api/quiz/submit` | Chấm quiz |

Admin (trừ login, các route cần `Authorization: Bearer <token>`):

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/admin/login` | Đăng nhập |
| POST | `/api/admin/logout` | Đăng xuất và vô hiệu hóa token |
| GET | `/api/admin/dashboard` | Tổng quan nội dung |
| GET/POST | `/api/admin/topics` | Liệt kê/tạo topic |
| GET/PUT/DELETE | `/api/admin/topics/{id}` | Xem/sửa/xóa topic |
| GET/POST | `/api/admin/questions` | Lọc/liệt kê/tạo câu hỏi |
| GET/PUT/DELETE | `/api/admin/questions/{id}` | Xem/sửa/xóa câu hỏi |
| POST | `/api/admin/questions/bulk` | Tạo nhiều câu hỏi nguyên tử |

Các endpoint `/api/admin/*` (ngoại trừ `/login`) bắt buộc Bearer JWT của admin hợp lệ. Guest không thể dùng đường dẫn hoặc ID trên admin API để xem/sửa/xóa dữ liệu.

Ví dụ đăng nhập:

```bash
curl -X POST http://localhost:8000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

Payload nộp quiz dùng token nhận từ endpoint sinh quiz:

```json
{
  "quiz_token": "signed-token",
  "answers": {"12": 0, "15": 2}
}
```

## Kiểm thử

```bash
cd backend
pytest
```
