# Hướng dẫn cho agent lập trình

File này dành cho mọi agent (OpenCode, Claude Code, Codex...). Đọc hết trước khi làm việc trong repo.

## Đọc theo thứ tự

1. [docs/PLAN.md](docs/PLAN.md): kế hoạch hiện hành, danh sách task, ai làm gì, tiêu chí xong. **Đây là nguồn chuẩn.**
2. [docs/AGENT_CONTEXT.md](docs/AGENT_CONTEXT.md): bối cảnh, lịch sử nhánh, rủi ro bảo mật.
3. [docs/INFRA_TASKS_JUNIOR.md](docs/INFRA_TASKS_JUNIOR.md): việc của thành viên infra. **Agent không làm thay các task `JR-*`.**

## Dự án

Ứng dụng học DevOps 3 tầng: React + Vite (`frontend/`), Flask + SQLAlchemy + Alembic (`backend/`), PostgreSQL. Triển khai lên AWS EKS bằng Terraform (`infra/`) và Helm (`charts/devops-app/`, sẽ thay cho `k8s/`).

## Quy tắc bắt buộc

- **Nhánh làm việc:** `k8s-development`. Không làm trên `main`, `feature-backend` hay `feature-frontend`.
- **Không commit, push, merge, rebase hay xoá nhánh** khi người dùng chưa yêu cầu rõ ràng.
- **Không ghi bí mật** (mật khẩu, access key, endpoint RDS thật, email cá nhân) vào file sẽ commit, và không gửi chúng ra dịch vụ bên ngoài. Dùng placeholder dạng `<YOUR_...>`.
- **Không tạo, sửa hay xoá tài nguyên AWS.** Các task `L*` trong PLAN.md do người dùng chạy trên máy Linux.
- Chỉ nhận task có người làm là `AGENT` hoặc `OWNER` trong PLAN.md. Tôn trọng bảng "Ai sở hữu file nào".
- Làm xong task nào thì tick `[x]` trong PLAN.md và ghi một dòng vào mục "Nhật ký".
- Tài liệu viết bằng tiếng Việt; tên biến, code và commit message bằng tiếng Anh.

## Môi trường

- Máy chính là **Windows**: có Docker Desktop (kèm Kubernetes), kubectl, Node 24, Python 3.14 và 3.10. **Không có** terraform, aws, helm; muốn dùng thì chạy qua Docker (PLAN.md, phụ lục A).
- Python của production là **3.12**. Chạy test backend trong container `python:3.12-slim`.
- File `.sh`, `.yaml`, `.tf` phải dùng xuống dòng **LF** (có `.gitattributes`).
- Máy Linux của người dùng có AWS CLI, Helm, eksctl, Terraform. Script viết cho máy này là bash.

## Kiểm tra trước khi báo xong

Chạy những lệnh liên quan trong PLAN.md, phụ lục B. Công cụ nào không chạy được thì ghi rõ "chưa kiểm: <lý do>", không được báo là đã xong.

## Quy ước git (khi người dùng yêu cầu commit)

- Message dạng Conventional Commits: `feat(scope): ...`, `fix(...)`, `docs(...)`, `chore(...)`.
- Thêm dòng attribution theo đúng công cụ agent đang dùng, nếu người dùng yêu cầu.
