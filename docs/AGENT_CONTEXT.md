# Context cho agent: kế hoạch hoàn thiện repo NT548-Group-6

> Tài liệu này tóm tắt trạng thái repo và kế hoạch đã thống nhất. Agent đọc file này trước khi làm việc.
> Ngày rà soát: 2026-11-17. Repo gốc: https://github.com/MichaelSkyman/NT548-Group-6
>
> **Cập nhật 2026-11-21. Các quyết định dưới đây thay cho mọi chỗ mâu thuẫn trong file này:**
> - Kế hoạch hiện hành nằm ở [PLAN.md](PLAN.md). Mục 7 của file này chỉ còn giá trị tham khảo.
> - Nhánh làm việc là `k8s-development` (fast-forward lên `feature-backend`), không tạo nhánh mới như khuyến nghị ở mục 6.
> - Dùng Helm chart thay cho manifest thô; region `us-east-1`; EKS 1.35 (1.31 đang ở extended support, giá 0,60 USD/giờ).
> - Máy Windows đã có `docker` và `kubectl` (mục 3 ghi là chưa có). Terraform và Helm chạy trên máy Linux, hoặc qua Docker.
> - Rà lại 2026-11-21: remote không có commit mới kể từ 2026-11-17.

## 1. Mục tiêu

Hoàn thiện repo thành một hệ thống 3-tier (React + Flask + PostgreSQL) chạy trên AWS EKS, có hạ tầng bằng Terraform, manifest Kubernetes, CI/CD, và tài liệu vận hành. Tham chiếu so sánh: https://github.com/NotHarshhaa/DevOps-Projects/tree/master/DevOps-Project-36

## 2. Trạng thái các nhánh (remote `origin`)

| Nhánh | Trạng thái |
|---|---|
| `feature-backend` = `feature-frontend` (commit `9a56611`) | Nhánh tích hợp đầy đủ nhất. Chứa toàn bộ commit của các nhánh khác, kể cả 3 commit mới hơn `feat/database-setup` (xem dưới) |
| `feat/database-setup` (commit `a6daf57`) | Đang là head của PR #2 (mở) → `main`. Thiếu 3 commit so với `feature-backend`: `ae71d9c`, `e3b96e6`, `9a56611` |
| `k8s-development` (`70807d8`) | Đã gộp hết vào `feature-backend`. Không còn nội dung riêng |
| `infra/ToThiThanhNhi` (`212ec30`) | Đã gộp hết vào `feature-backend`. Không còn nội dung riêng |
| `main` (`01936b3`) | Gần như trống: chỉ có `README.md`, `backend/`, `frontend/`, `infra/`, `k8s/` chứa `.gitkeep` |

Ghi chú:
- PR #1 (`k8s-development` → `main`) đã đóng, không merge.
- PR #3 (`k8s-development` → `feature-backend`) đã đóng.
- PR #4 (`feature-frontend` → `feature-backend`) đã merge.
- Nhánh local `k8s-development` chậm 2 commit so với remote và có 3 file sửa dở chưa commit (xem mục 6).

## 3. Trạng thái code trên `feature-backend`

Đã kiểm tra trong thư mục tạm (không đụng repo):
- **Backend:** `pytest` đạt 26 test, 12 test bị bỏ qua (cần PostgreSQL thật qua `TEST_DATABASE_URL`).
- **Frontend:** `npm run lint` sạch; `npm run build` thành công.
- **Chưa kiểm được:** Docker build, Terraform validate/plan, kubectl apply. Máy hiện không có `terraform`, `kubectl`, `docker`, `helm`, `aws`, `eksctl`, `gh`.

Cấu trúc chính:
- `backend/`: Flask app factory, models trong `database/models.py`, Alembic migrations `0001 → 0001_initial → 0002_topic_video_url → 0003_reconcile`, CLI `python -m database {migrate,seed,create-admin,check}`, Dockerfile (gunicorn, user non-root 10001).
- `frontend/`: React + Vite + Tailwind, Dockerfile multi-stage với nginx, `/healthz` và SPA fallback.
- `infra/`: Terraform gồm `modules/network` (VPC 2 AZ, public/private-app/private-db subnet, NAT), `eks.tf` (module `terraform-aws-modules/eks` ~> 20, EKS 1.31, managed node group `t3.small` 2–3 node), `database.tf` (RDS PostgreSQL 15, single-AZ, `db.t3.micro`, SG chỉ cho phép 5432 từ subnet app).
- `k8s/`: `namespace.yaml` (`devops-app`), `configmap.yaml`, `secrets.yaml` (template), `database-service.yaml` (ExternalName `postgres`), `migration_job.yaml` (Job `db-migrate`), `backend.yaml`, `frontend.yaml` (2 replica, probe), `ingress.yaml` (IngressClass `alb`, path `/api` → backend, `/` → frontend).
- `compose.yaml`: chỉ có PostgreSQL + service `database` (profile `tools`). Chưa có backend/frontend.
- Chưa có thư mục `.github/`, chưa có CI/CD, chưa có HPA, chưa có TLS.

## 4. So sánh với repo tham chiếu DevOps-Project-36

Điểm repo nhóm đã có hoặc tốt hơn:
- Probe liveness/readiness, container non-root, TLS tới RDS (`verify-full` + CA bundle), migration tách riêng bằng Job có `backoffLimit`/`activeDeadlineSeconds`.
- Mật khẩu không nội suy vào URL trong YAML; backend tự ghép URL.
- Test tự động cho backend và database.
- Security group RDS giới hạn theo CIDR subnet app (tham chiếu mở `0.0.0.0/0`).

Điểm thiếu so với tham chiếu:
1. Image chưa có registry: manifest dùng `backend:latest`, `frontend:latest`.
2. Thiếu file IAM policy và bước cài AWS Load Balancer Controller (Helm + IRSA). README chỉ nhắc.
3. Job migrate không seed dữ liệu; DB lên sẽ rỗng.
4. Không có GitHub Actions và IAM role OIDC cho CI/CD.
5. Không có HPA/metrics-server.
6. Không có HTTPS (ACM hoặc cert-manager + domain).
7. Không có Prometheus/Grafana.
8. RDS single-AZ, chưa mã hoá, chưa có backup rõ ràng; README ghi "Multi-AZ" nhưng chưa đúng.
9. Thiếu state Terraform dùng chung (S3 backend).
10. README gốc là README của frontend, thiếu kiến trúc, runbook, phân công, ảnh minh chứng.
11. `compose.yaml` chưa chạy được cả 3 tầng.

## 5. Rủi ro bảo mật cần xử lý ngay

- **Commit `7f7a418`** (thuộc `feature-backend`, public repo) chứa `db_password` dạng plain text trong `infra/terraform.tfvars`. Commit `136f01d` và `df271a2` cũng liên quan đến file tfvars. Không ghi giá trị mật khẩu vào tài liệu này.
  - Hành động: đổi mật khẩu RDS đang dùng ngay; nếu RDS còn chạy thì kiểm tra chi phí và quyền truy cập.
  - Xoá file khỏi nhánh hiện tại và `.gitignore` đã chặn `*.tfvars` (chỉ commit `*.example.tfvars`). Lịch sử git cần làm sạch bằng `git filter-repo` nếu nhóm muốn, nhưng phải thống nhất trước vì ảnh hưởng mọi clone.
- `infra/terraform.tfvars` và `k8s/secrets.yaml` (template) không được có giá trị thật khi commit.
- Trong lịch sử có RDS hostname thật (xuất hiện trong nhiều commit `k8s/database-service.yaml`, `configmap.yaml`). Hostname không phải bí mật, nhưng cần đối chiếu với mục rủi ro.
- Thay đổi tên host trong `database-service.yaml`: nhóm đã thống nhất tên `postgres`.

## 6. Trạng thái thay đổi chưa commit trên máy người dùng

Nhánh local `k8s-development` có 3 file sửa dở:
- `k8s/database-service.yaml`: đổi tên Service thành `postgres-db`, thêm label và port. Không khớp với tên `postgres` mà `configmap.yaml` và `backend.yaml` đang dùng (`nc -z postgres 5432`).
- `k8s/namespace.yaml`: thêm label, không có vấn đề lớn.
- `k8s/secrets.yaml`: đổi tên thành `db-secrets`, dùng `data:` với giá trị placeholder không phải base64 hợp lệ, và khác với `app-secrets` mà `backend.yaml` đang tham chiếu.

Khuyến nghị: không commit 3 thay đổi này. Bỏ chúng (hoặc lưu stash) rồi chuyển sang nhánh làm việc mới từ `feature-backend`.

## 7. Kế hoạch thực hiện (cũ, đã thay bằng [PLAN.md](PLAN.md))

### Bước 1. Gộp code và dọn nhánh
1. Đóng PR #2 (`feat/database-setup` → `main`) hoặc đổi head sang `feature-backend`. Mở PR `feature-backend` → `main`.
2. Sau khi merge: xoá các nhánh đã gộp (`feat/database-setup`, `feature-frontend`, `k8s-development`, `infra/ToThiThanhNhi`); bật branch protection cho `main`.
3. Xử lý rủi ro mục 5: đổi mật khẩu RDS, xoá `terraform.tfvars` khỏi nhánh, quyết định về làm sạch lịch sử.

### Bước 2. Làm cho deploy chạy được
1. Thêm ECR repository vào Terraform cho `backend` và `frontend`; cập nhật image trong `k8s/backend.yaml`, `k8s/frontend.yaml`, `k8s/migration_job.yaml` sang tag cụ thể (không dùng `:latest`).
2. Thêm IAM policy (`iam_policy.json`), IRSA role cho `aws-load-balancer-controller` và lệnh Helm cài đặt vào `infra/` và tài liệu.
3. Sửa runbook: thay `DB_HOST` trong ConfigMap, tạo ConfigMap `rds-ca`, thứ tự apply. Gộp `infra/README.md` và `backend/database/README.md` thành một runbook.
4. Thêm Job seed và tạo admin (chạy sau migration, dùng secret `ADMIN_PASSWORD`).
5. Deploy thật một lần, chụp ảnh minh chứng, ghi quy trình teardown (xoá Ingress trước khi `terraform destroy` để ALB không bị mồ côi).

### Bước 3. CI/CD
- CI (GitHub Actions): pytest với service PostgreSQL (để chạy 12 test đang bị bỏ qua), eslint + build frontend, `terraform fmt -check` và `terraform validate`, kiểm tra YAML.
- CD: IAM role OIDC cho GitHub Actions (trust policy giới hạn theo repo và nhánh), build → push ECR theo commit SHA → `kubectl set image` hoặc apply manifest.

### Bước 4. Phần nâng cao để ngang tham chiếu
- HPA cho backend và frontend + metrics-server.
- HTTPS: ACM (nếu có domain Route53) hoặc cert-manager + Let's Encrypt.
- Prometheus + Grafana; cân nhắc nâng node lên `t3.medium` (`t3.small` có thể không đủ tài nguyên).
- RDS: bật `storage_encrypted`, backup retention, Multi-AZ thật nếu ngân sách cho phép; ghi rõ trong README nếu không làm.
- Terraform state trên S3 + DynamoDB lock.

### Bước 5. Tài liệu và demo local
- Viết lại `README.md` gốc: kiến trúc, cách chạy, runbook deploy, phân công thành viên, ảnh minh chứng.
- Thêm backend và frontend vào `compose.yaml` để chạy local bằng một lệnh.

## 8. Quy ước cho agent

- Không commit, push, hay xoá nhánh khi người dùng chưa yêu cầu rõ ràng.
- Không đưa mật khẩu, endpoint RDS thật, hay email cá nhân vào file commit hoặc vào request ra dịch vụ bên ngoài.
- Trước khi sửa file trong `k8s/` hoặc `infra/`, đọc lại bản trên nhánh `feature-backend` vì đó là nguồn chuẩn.
- Chạy `terraform validate`, `kubectl apply --dry-run=client`, `pytest` trước khi báo hoàn thành; nếu công cụ không có trên máy thì nói rõ là chưa kiểm được.
- Commit message: kết thúc bằng dòng `Co-Authored-By: <tên model> <noreply@anthropic.com>` theo chỉ dẫn của người dùng.
- Pull request: kết thúc bằng `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
