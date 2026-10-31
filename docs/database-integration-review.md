# Rà soát database sau khi hợp nhất các nhánh

Nhánh tích hợp: `feat/database-setup`. Đã fetch và tích hợp `feature-frontend`, `feature-backend`, `k8s-development`, `infra/ToThiThanhNhi`. Frontend đã chứa backend; Kubernetes đã chứa nhánh hạ tầng nên hai nhánh này không cần merge thêm lần nữa. `main` trên GitHub là tổ tiên của nhánh hiện tại.

## Xung đột Git

| File | Cách xử lý |
| --- | --- |
| `.env.example` | Gộp cấu hình DB, Flask, JWT, quiz; không đặt tài khoản Admin mặc định |
| `.gitignore` | Gộp quy tắc Python, frontend, Terraform và credential |
| `README.md` | Giữ hướng dẫn frontend/backend, sửa cách seed/tạo Admin, liên kết tài liệu DB; giữ tài liệu hạ tầng ở `infra/README.md` |
| `backend/requirements.txt` | Giữ thư viện backend và SQLAlchemy/Alembic/psycopg |
| `backend/requirements-dev.txt` | Gộp pytest, coverage và YAML parser |
| `backend/pytest.ini` | Giữ đường dẫn import để chạy cả API test và database test |
| `backend/migrations/env.py` | Dùng chung metadata cho Alembic CLI, Flask-Migrate và integration test |
| `backend/migrations/script.py.mako` | Dùng một template sinh migration |

Khi merge Kubernetes, `.gitignore` và `README.md` lại xung đột; đã xử lý theo cùng nguyên tắc trên.

## Xung đột chức năng và thay đổi database

| Vấn đề | File liên quan | Sửa |
| --- | --- | --- |
| Hai bộ ORM cùng định nghĩa `topics`, `questions`, `admins` | `app/models.py`, `database/models.py`, `app/extensions.py` | Models chuẩn ở `database/models.py`; backend import lại đúng các class đó, Flask-SQLAlchemy dùng chung Base/metadata |
| Backend thiếu trường của DB và DB thiếu trường backend cần | Models, migration | Giữ `content`, `explanation`, `updated_at`; bổ sung `Topic.video_url` và `Admin.token_version`, giữ API serializer frontend đang gọi |
| Hai root migration đều tạo ba bảng | `migrations/versions/` | Một chuỗi: `0001 → 0001_initial → 0002_topic_video_url → 0003_reconcile`; `0001_initial` trở thành bước tương thích thêm token, không tạo lại bảng |
| Các DB cũ khác JSON/JSONB, index, default và constraint | `0003_reconcile_database.py` | Nâng cấp JSONB, thống nhất tên/ràng buộc/default, thêm trường còn thiếu, giữ hàng dữ liệu và hash mật khẩu |
| API chấp nhận số options/độ dài vượt schema | `question_service.py`, `topic_service.py` | Trả HTTP 400 với options ngoài 2–8 hoặc vượt độ dài cột |
| Hai đường kết nối và tên biến DB khác nhau | `app/config.py`, `database/connection.py` | Chung URL builder, SSL/pool options; hỗ trợ cả `DB_USERNAME` và `DB_USER`, password ký tự đặc biệt; Session Flask dùng chung với repositories |
| Hai seed khác nội dung và tự tạo Admin mặc định | `seed.py`, `database/seed.py` | Chung nguồn seed 5 chủ đề/10 câu; Admin chỉ tạo khi được cấu hình rõ hoặc qua CLI; không reset mật khẩu |
| Hai bộ YAML dùng hai namespace và lệnh migration khác nhau | `k8s/`, `k8s/database/` | Bộ manifest chuẩn ở `k8s/`, namespace `devops-app`; Job gọi `python -m database migrate`, seed chạy riêng |
| Nội suy URL Kubernetes làm hỏng password có `@`, `:`, `%` | `k8s/backend.yaml`, `k8s/migration_job.yaml` | Bỏ nội suy `DATABASE_URL`; backend tự tạo URL từ các trường DB |
| Alias DNS Kubernetes không khớp certificate RDS khi verify-full | `k8s/configmap.yaml`, backend và Job | Dùng RDS hostname thật cho kết nối, mount CA; giữ ExternalName để kiểm tra DNS |
| Manifest cần image backend nhưng repo chưa có Dockerfile backend | `backend/Dockerfile` | Thêm image chạy Flask/Gunicorn, chứa cả models, CLI và migrations |

SQLite chỉ dùng cho API test nhanh. PostgreSQL là database production và nơi kiểm tra ràng buộc JSONB/regex/khóa ngoại/migration thực.

## Kiểm tra

Đã chạy toàn bộ suite bằng Python 3.12 và PostgreSQL 15 portable chỉ lắng nghe loopback: **38 test đạt, không skip**. Kiểm tra bao gồm:

- API public/Admin, CRUD Topic/Question, JWT login/logout, quiz chấm điểm theo thứ tự option đã ký.
- Upgrade lặp lại, downgrade/upgrade, seed không trùng/không ghi đè, cascade delete và ràng buộc PostgreSQL.
- Nâng cấp từ database `0001`, backend `0001_initial`, backend `0002_topic_video_url`; giữ nội dung/câu hỏi/hash Admin, đăng nhập và đọc dữ liệu qua backend sau nâng cấp.
- Metadata sau migration khớp models; chỉ có một Alembic head; cả `flask db upgrade` và Alembic CLI dùng cùng chuỗi.

Chưa build image Docker hoặc apply Kubernetes/Terraform vì môi trường chưa có các công cụ/runtime đó. Cấu hình production vẫn phải thay endpoint RDS, image registry/tag, Secret và CA bằng thông tin triển khai thật. Không thay đổi tài nguyên AWS.

## Khi nâng cấp DB có dữ liệu thật

Backup và chạy thử migration trên bản sao trước. DB cũ có thể chứa Topic trùng tên, câu hỏi trùng nội dung trong cùng Topic, slug/username sai định dạng, options không hợp lệ hoặc đáp án ngoài phạm vi. Migration sẽ dừng và rollback nếu dữ liệu vi phạm ràng buộc mới, không tự xóa/sửa nội dung để vượt qua lỗi. Sửa dữ liệu sau khi nhóm xác nhận rồi chạy lại; không dùng `stamp` để bỏ qua migration trên production.

Ràng buộc duy nhất `(topic_id, question_text)` được giữ theo yêu cầu chống câu hỏi trùng của backend. PostgreSQL giới hạn kích thước khóa B-tree; nếu nhập câu hỏi rất dài và gặp lỗi kích thước index, cần thay chiến lược chống trùng bằng fingerprint trong migration riêng.
