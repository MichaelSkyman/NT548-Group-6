# Database — DevOps Learning Platform

Thiết kế dựa trên `backend-guest-admin-architecture.md` và `Deploying a production.docx` do nhóm cung cấp: Flask + PostgreSQL 15, Guest học/làm quiz tự do, Admin đăng nhập quản trị nội dung; production dùng RDS private và migration Job trên EKS. Repo ban đầu chỉ có các thư mục khung, nên phần này là nền tảng database để backend tích hợp tiếp.

## Các file

| File | Chức năng |
| --- | --- |
| `backend/database/models.py` | SQLAlchemy models và hàm xuất câu hỏi cho Guest |
| `backend/database/connection.py` | Kết nối, transaction và Flask session |
| `backend/database/__main__.py` | CLI migrate/check/seed/create-admin |
| `backend/migrations/` và `backend/alembic.ini` | Lịch sử migration có upgrade/downgrade |
| `backend/database/seed_data.json` | 5 Topic, 10 Question, nội dung tiếng Việt |
| `.env.example`, `compose.yaml` | PostgreSQL local có persistent volume |
| `backend/Dockerfile.database` | Image chạy migration và CLI database |
| `k8s/database/` | Namespace, RDS DNS Service, ConfigMap, Secret mẫu, migration Job |
| `backend/tests/test_database.py` | Unit test và integration test PostgreSQL |

## Mô hình dữ liệu

```mermaid
erDiagram
    TOPICS ||--o{ QUESTIONS : contains
    TOPICS {
        int id PK
        varchar name
        varchar slug UK
        text description
        text content
        timestamptz created_at
        timestamptz updated_at
    }
    QUESTIONS {
        int id PK
        int topic_id FK
        text question_text
        jsonb options
        int correct_answer
        text explanation
        timestamptz created_at
        timestamptz updated_at
    }
    ADMINS {
        int id PK
        varchar username UK
        varchar password_hash
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
```

- `topics.slug` duy nhất, chữ thường/số và dấu `-`, ví dụ `github-actions`.
- `content` lưu nội dung bài học dạng Markdown; `description` là mô tả ngắn.
- `questions.options` là JSONB gồm 2–8 chuỗi không rỗng. ORM loại bỏ khoảng trắng đầu/cuối và từ chối lựa chọn chỉ có khoảng trắng.
- `correct_answer` là vị trí **bắt đầu từ 0**, ví dụ `["A", "B", "C"]` có đáp án B thì lưu `1`. CHECK constraint ngăn đáp án ngoài phạm vi và options sai kiểu, kể cả khi ghi bằng SQL trực tiếp.
- Có index trên `questions.topic_id`; khóa ngoại ngăn câu hỏi mồ côi. **Xóa Topic sẽ xóa toàn bộ Question thuộc Topic đó** (`ON DELETE CASCADE`). API quản trị cần hiển thị rõ hành vi này khi xác nhận xóa.
- Username Admin được CLI chuẩn hóa sang chữ thường, dài 3–80 ký tự; mật khẩu tối thiểu 12 ký tự và lưu hash scrypt, không lưu mật khẩu gốc. Không tạo sẵn Admin hoặc mật khẩu mặc định.
- Timestamp dùng timezone UTC; `updated_at` tự cập nhật qua SQLAlchemy. SQL thủ công phải tự đặt `updated_at = now()`.
- Guest không có bảng tài khoản, profile hay tiến độ. Chưa lưu lượt làm quiz/kết quả vì tài liệu hiện tại không yêu cầu lịch sử cá nhân.

## Chạy local bằng Docker Compose

Chạy PowerShell từ thư mục gốc repo. Cần Docker Engine và Docker Compose hoạt động.

```powershell
Copy-Item .env.example .env
# Sửa DB_PASSWORD trong .env trước khi chạy.
docker compose up -d postgres
docker compose run --rm database python -m database migrate
docker compose run --rm database python -m database seed
docker compose run --rm database python -m database create-admin --username admin
docker compose run --rm database python -m database check
```

CLI tạo Admin sẽ yêu cầu nhập và xác nhận mật khẩu, không cần đưa mật khẩu vào lịch sử shell. `migrate` chạy lại an toàn; `seed` chỉ bổ sung nội dung mẫu còn thiếu, không ghi đè nội dung đã sửa và không tạo tài khoản. Seed là thao tác riêng, không tự chạy trên production.

PostgreSQL chỉ bind cổng trên `127.0.0.1`. Dữ liệu nằm trong volume `postgres_data`; `docker compose down` giữ volume. Các biến `POSTGRES_*` chỉ khởi tạo DB/tài khoản khi volume còn trống; đổi `.env` không tự đổi mật khẩu đã lưu trong PostgreSQL.

## Dùng Python trên máy

Cần Python 3.12+ và PostgreSQL đang chạy. `.env` ở thư mục gốc được đọc tự động; biến môi trường có sẵn được ưu tiên.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Set-Location backend
..\.venv\Scripts\python.exe -m database migrate
..\.venv\Scripts\python.exe -m database seed
..\.venv\Scripts\python.exe -m database create-admin --username admin
..\.venv\Scripts\python.exe -m database check
```

`DATABASE_URL` nếu có sẽ ưu tiên hơn các trường `DB_*`; hỗ trợ dạng `postgresql://` và `postgresql+psycopg://`. Khi dùng URL, phải URL-encode ký tự đặc biệt trong username/password. Dùng các trường rời `DB_USERNAME`/`DB_PASSWORD` thì không cần encode.

## Tích hợp vào Flask

Chạy backend với thư mục `backend` trong Python path. Gọi `init_app` một lần trong application factory; không tạo bảng hoặc chạy migration khi worker khởi động.

```python
from flask import Flask
from sqlalchemy import select, text
from database import Topic, get_session, init_app

def create_app():
    app = Flask(__name__)
    init_app(app)

    @app.get("/api/topics")
    def topics():
        rows = get_session().scalars(select(Topic).order_by(Topic.name)).all()
        return [{"id": t.id, "name": t.name, "slug": t.slug,
                 "description": t.description} for t in rows]

    return app
```

`get_session()` trả Session riêng cho Flask context; khi kết thúc request, Session đóng và rollback phần chưa commit. Service ghi dữ liệu cần dùng `with session.begin(): ...` hoặc commit rõ ràng; khi tự xử lý lỗi transaction cần rollback trước khi dùng tiếp Session. Code ngoài Flask dùng `with session_scope(engine) as session: ...` để commit/rollback tự động.

Trong repository, dùng `select(Topic).where(Topic.slug == slug)` và `select(Question).where(Question.topic_id == topic_id)`. `AdminService` có thể đếm nội dung bằng:

```sql
SELECT t.id, t.name, t.slug, count(q.id) AS question_count
FROM topics AS t
LEFT JOIN questions AS q ON q.topic_id = t.id
GROUP BY t.id, t.name, t.slug
ORDER BY t.name;
```

`Question.to_quiz_dict()` chỉ trả `id`, `question_text`, `options`; mỗi option có `id` là chỉ số gốc và `text`. QuizService có thể shuffle thứ tự options nhưng giữ ID gốc để chấm. Không serialize nguyên model câu hỏi hoặc gửi `correct_answer`/`explanation` trước khi submit. Backend cần kiểm tra câu hỏi thuộc Topic và lượt quiz được phát; nếu cần chống thay đổi đề giữa lúc làm bài, bổ sung quiz snapshot/token tại service layer. Phần này chưa triển khai API quiz hoặc session/token đăng nhập Admin. API quản trị phải được bảo vệ bằng `verify_admin`; database không thay thế lớp xác thực HTTP.

## Migration tiếp theo

Từ `backend/`, sau khi sửa models:

```powershell
python -m alembic revision --autogenerate -m "describe schema change"
# Đọc và kiểm tra file migration được sinh trước khi áp dụng.
python -m database migrate
python -m alembic current
```

Không sửa revision đã triển khai. `python -m alembic downgrade base` xóa cả ba bảng và dữ liệu; chỉ dùng trên DB thử nghiệm hoặc sau khi có kế hoạch phục hồi. Migration có transaction và advisory lock để tránh hai Job cùng thay đổi schema.

## RDS và EKS

Các YAML là template; thay endpoint, image registry/tag, DB name và credentials bằng thông tin của nhóm. Chưa provision AWS/RDS hoặc chạy deployment. Không dùng account ID, security group, endpoint hay mật khẩu ví dụ trong tài liệu tham khảo.

1. Tạo RDS PostgreSQL 15 trong private subnets, cùng VPC hoặc có routing tới EKS. Tạo database `devops_learning` trước khi migrate. Bật backup/encryption theo cấu hình của nhóm; Security Group chỉ cho nguồn EKS phù hợp tới TCP 5432.
2. Tài khoản migration cần quyền tạo/thay đổi bảng trong schema ứng dụng. Backend production nên dùng tài khoản riêng chỉ có quyền cần thiết; không dùng RDS master cho request hằng ngày. Quyền đọc `admins.password_hash` chỉ dành cho backend, không cung cấp kết nối DB trực tiếp cho trình duyệt/Guest.
3. Build/push image và điền image tag vào `migration-job.yaml`:

```powershell
docker build -f backend/Dockerfile.database -t YOUR_REGISTRY/nt548-database:0001 backend
docker push YOUR_REGISTRY/nt548-database:0001
kubectl apply -f k8s/database/namespace.yaml
kubectl apply -f k8s/database/service.yaml
kubectl apply -f k8s/database/configmap.yaml
Copy-Item k8s/database/secret.example.yaml k8s/database/secret.yaml
# Điền credential thực trong secret.yaml (đã được gitignore).
kubectl apply -f k8s/database/secret.yaml
```

4. Tải CA bundle từ AWS, kiểm tra nguồn, tạo ConfigMap chứa certificate công khai:

```powershell
Invoke-WebRequest https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -OutFile "$env:TEMP\nt548-rds-ca.pem"
kubectl create configmap rds-ca --from-file="global-bundle.pem=$env:TEMP\nt548-rds-ca.pem" -n devops-learning
kubectl apply -f k8s/database/migration-job.yaml
kubectl wait --for=condition=complete --timeout=300s job/database-migration-0001 -n devops-learning
kubectl logs job/database-migration-0001 -n devops-learning
```

5. Chỉ rollout backend sau khi Job thành công. Backend dùng cùng cấu hình kết nối và mount CA ở `/certs`, nhưng dùng Secret tài khoản runtime riêng. Mỗi release đặt tên Job và image tag mới. Nếu muốn tạo Admin, dùng container có cùng package và cấu hình DB chạy CLI `create-admin` với terminal tương tác.

Service `postgres-db` cung cấp alias DNS tới RDS như tài liệu triển khai. Tuy nhiên, `verify-full` kiểm tra hostname trên certificate nên `DB_HOST` dùng **endpoint RDS thật**; alias Kubernetes thường không khớp certificate RDS. Nếu thay endpoint phải cập nhật cả Service và ConfigMap. Không tắt xác minh TLS để dùng alias.

Tham khảo: [SQLAlchemy connection URL](https://docs.sqlalchemy.org/en/20/core/engines.html), [Alembic migration](https://alembic.sqlalchemy.org/en/latest/tutorial.html), [PostgreSQL JSON](https://www.postgresql.org/docs/15/functions-json.html), [AWS RDS TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html), [PostgreSQL verify-full](https://www.postgresql.org/docs/15/libpq-ssl.html).

## Kiểm thử

Từ `backend/`:

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
# Để bật integration tests, dùng DB test riêng cho phép CREATE SCHEMA:
$env:TEST_DATABASE_URL = 'postgresql+psycopg://USER:URL_ENCODED_PASSWORD@localhost:5432/TEST_DB'
python -m pytest -q
```

Khi chưa đặt `TEST_DATABASE_URL`, các bài kiểm tra cần PostgreSQL được skip. Integration tests tạo schema có tên ngẫu nhiên rồi dọn schema đó sau khi chạy; kiểm tra upgrade chạy lại, seed không trùng/không ghi đè, model khớp migration, cascade delete, rollback migration và ràng buộc SQL. Chỉ trỏ biến này tới DB test.
