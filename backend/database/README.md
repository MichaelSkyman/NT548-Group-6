# Database — DevOps Learning Platform

Flask + PostgreSQL 15 cho mô hình Guest học/làm quiz tự do, Admin đăng nhập quản trị. Sau khi merge các nhánh, backend và CLI dùng chung models, metadata, session Flask và lịch sử migration. Chi tiết xung đột: [báo cáo tích hợp](../../docs/database-integration-review.md).

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `database/models.py` | Model chuẩn Topic, Question, Admin và serializers |
| `app/models.py` | Import lại model chuẩn cho API, không định nghĩa bảng lần hai |
| `database/connection.py` | URL, SSL/pool, Session; hỗ trợ DB_USERNAME và DB_USER |
| `database/__main__.py` | CLI migrate/check/seed/create-admin |
| `database/seed_data.json` | 5 chủ đề, 10 câu hỏi tiếng Việt |
| `migrations/versions/` | Một chuỗi migration, có bước hòa giải schema backend cũ |
| `seed.py` | Entry point tương thích, gọi chung seed; Admin phải cấu hình rõ |
| `../compose.yaml` (từ repo root: `compose.yaml`) | PostgreSQL local và container CLI |
| `../k8s/` (từ repo root: `k8s/`) | Bộ manifest chuẩn, namespace devops-app |

Các đường dẫn ở cột đầu tính từ `backend/` trừ nơi ghi rõ repo root.

## Schema

```mermaid
erDiagram
    TOPICS ||--o{ QUESTIONS : contains
    TOPICS {
        int id PK
        varchar name UK
        varchar slug UK
        text description
        text content
        varchar video_url
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
        int token_version
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
```

- Topic có tên/slug duy nhất, slug chữ thường/số/dấu gạch ngang; content dạng Markdown và video_url YouTube tùy chọn. API kiểm tra URL trước khi lưu.
- Question có options JSONB gồm 2–8 chuỗi không rỗng; ORM trim và từ chối lựa chọn chỉ có khoảng trắng. correct_answer là chỉ số bắt đầu từ **0**. Khóa duy nhất `(topic_id, question_text)` giữ hành vi chống câu hỏi trùng của backend.
- Khóa ngoại và index trên topic_id; **xóa Topic sẽ xóa tất cả câu hỏi thuộc Topic**.
- Admin có username chữ thường, mật khẩu tối thiểu 12 ký tự, hash scrypt; token_version phục vụ vô hiệu hóa JWT khi đăng xuất. Không có Admin/mật khẩu mặc định.
- Timestamp timezone UTC; updated_at được SQLAlchemy cập nhật khi ghi. SQL thủ công cần tự đặt updated_at = now().
- Guest không có bảng tài khoản, profile hay lịch sử cá nhân. API public phải dùng serializer của service, không trả correct_answer hoặc hash Admin.

## Local bằng Docker Compose

Chạy PowerShell từ repo root; cần Docker hoạt động:

```powershell
Copy-Item .env.example .env
# Đổi DB_PASSWORD, SECRET_KEY, JWT_SECRET_KEY trong .env.
docker compose up -d postgres
docker compose run --rm database python -m database migrate
docker compose run --rm database python -m database seed
docker compose run --rm database python -m database create-admin --username admin
docker compose run --rm database python -m database check
```

create-admin hỏi và xác nhận mật khẩu. migrate/seed chạy lại an toàn; seed không ghi đè nội dung đã sửa, không tạo Admin. PostgreSQL bind 127.0.0.1 và lưu vào volume postgres_data. docker compose down giữ volume. Đổi biến POSTGRES_* không tự cập nhật tài khoản trong volume đã khởi tạo.

## Chạy backend bằng Python

Cần Python 3.12+, PostgreSQL đang chạy. Từ repo root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
Copy-Item .env.example .env
# Điền cấu hình trước khi chạy.
Set-Location backend
..\.venv\Scripts\python.exe -m database migrate
..\.venv\Scripts\python.exe -m database seed
..\.venv\Scripts\python.exe -m database create-admin --username admin
..\.venv\Scripts\python.exe run.py
```

API chạy cổng 8000, ví dụ /api/health và /api/topics. Các lệnh cũ `flask --app run.py db upgrade` và `python seed.py` vẫn dùng cùng schema/seed. seed.py chỉ tạo Admin nếu ADMIN_PASSWORD được đặt rõ; tài khoản tồn tại không bị reset.

Biến môi trường của process ưu tiên cao nhất, tiếp đến backend/.env rồi root .env. DATABASE_URL ưu tiên hơn DB_*; nhận postgresql:// hoặc postgresql+psycopg://. Với URL phải URL-encode credential; dùng DB_USERNAME (hoặc DB_USER) và DB_PASSWORD rời thì không cần encode.

API đã gọi db.init_app trong application factory. `database.get_session()` trả cùng Session với app.extensions.db/repositories; không gọi thêm engine riêng cho request. Service ghi dữ liệu phải commit hoặc dùng transaction; khi xử lý lỗi cần rollback. Ngoài Flask, dùng `with session_scope(engine) as session: ...`.

## Migration

Chuỗi thống nhất:

```text
0001 -> 0001_initial -> 0002_topic_video_url -> 0003_reconcile
```

0001 là baseline database; 0001_initial là bước tương thích bổ sung token_version, không tạo lại bảng. Revision ID của backend được giữ để DB đã stamped 0001_initial/0002_topic_video_url cũng nâng cấp được qua bước reconcile. DB cũ được thêm cột/default/ràng buộc và chuyển options từ JSON sang JSONB, giữ dữ liệu.

Từ backend/:

```powershell
python -m alembic current
python -m alembic revision --autogenerate -m "describe schema change"
# Kiểm tra file sinh ra trước khi áp dụng.
python -m database migrate
```

Migration có transaction và advisory lock. Backup và thử trên bản sao trước khi nâng cấp DB thật. Dữ liệu cũ vi phạm uniqueness, slug/username hoặc options/đáp án sẽ khiến migration dừng/rollback; không tự xóa dữ liệu. Không stamp để bỏ qua lỗi. downgrade base xóa cả ba bảng và dữ liệu, chỉ dùng trên DB thử nghiệm có thể bỏ.

## RDS / EKS

Dùng bộ manifest duy nhất tại **k8s/**, namespace **devops-app**. Bộ YAML devops-learning cũ đã được hợp nhất, không apply thêm lần nữa. Chưa deploy AWS trong lần rà soát này.

1. RDS PostgreSQL private do infra/database.tf khai báo, database devops_learning. Dùng `terraform -chdir=infra output -raw rds_address` để lấy hostname. Thay hostname vào k8s/database-service.yaml và DB_HOST trong k8s/configmap.yaml; cấu hình mạng phải cho EKS tới RDS TCP 5432.
2. Copy k8s/secrets.yaml thành k8s/secrets.local.yaml (gitignored), điền credential thật. Cùng image backend chứa Flask, CLI database và migrations. Production nên dùng tài khoản migration và runtime riêng với quyền phù hợp.
3. Build/push image, thay image trong k8s/backend.yaml và k8s/migration_job.yaml bằng cùng tag:

```powershell
docker build -t YOUR_REGISTRY/nt548-backend:TAG backend
docker push YOUR_REGISTRY/nt548-backend:TAG
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/database-service.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.local.yaml
Invoke-WebRequest https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -OutFile "$env:TEMP\nt548-rds-ca.pem"
kubectl create configmap rds-ca --from-file="global-bundle.pem=$env:TEMP\nt548-rds-ca.pem" -n devops-app
kubectl apply -f k8s/migration_job.yaml
kubectl wait --for=condition=complete --timeout=600s job/db-migrate -n devops-app
kubectl logs job/db-migrate -n devops-app
# Chỉ khi migration thành công:
kubectl apply -f k8s/backend.yaml
```

Job chỉ migrate; seed và tạo Admin chạy riêng theo lựa chọn triển khai. Khi chạy lại Job, dùng tên mới cho release hoặc xóa Job đã hoàn tất theo hướng dẫn ở đầu manifest. initContainer kiểm tra DNS/TCP qua alias postgres; kết nối thật dùng endpoint RDS để TLS verify-full khớp hostname trên certificate. Backend và Job mount CA ở /certs. Không nội suy mật khẩu vào URL trong YAML.

Tham khảo: [Flask-SQLAlchemy Base](https://flask-sqlalchemy.palletsprojects.com/en/stable/models/), [SQLAlchemy URL](https://docs.sqlalchemy.org/en/20/core/engines.html), [Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html), [RDS TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html), [PostgreSQL verify-full](https://www.postgresql.org/docs/15/libpq-ssl.html).

## Kiểm thử

Từ backend/:

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
$env:TEST_DATABASE_URL = 'postgresql+psycopg://USER:URL_ENCODED_PASSWORD@localhost:5432/TEST_DB'
python -m pytest -q
```

Không đặt TEST_DATABASE_URL thì skip các bài cần PostgreSQL. Dùng DB test riêng có quyền CREATE SCHEMA: test tạo schema ngẫu nhiên, chạy migration/seed/API rồi dọn đúng schema đó. Đã chạy **38 test đạt, không skip** với PostgreSQL 15 tạm, gồm nâng cấp từ cả ba revision của hai nhánh, giữ mật khẩu/nội dung và kiểm tra backend sau migration.