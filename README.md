# NT548 - Nhóm 6: DevOps Learning Platform trên AWS EKS

Ứng dụng web 3 tầng (**React + Flask + PostgreSQL**) học DevOps theo mô hình *Guest học tự do / Admin quản trị nội dung*, được đóng gói bằng Docker, triển khai lên **AWS EKS** bằng **Terraform** (hạ tầng) và **Helm** (ứng dụng), có CI/CD bằng **GitHub Actions**.

> **Trạng thái kiểm chứng.** Đã chạy và kiểm tra thật trên máy local: Docker Compose, Kubernetes của Docker Desktop (Helm chart, HPA, probe, hook migrate/seed), toàn bộ test, `terraform validate`. **Phần AWS (EKS, RDS, ALB, OIDC) mới được viết và kiểm cú pháp; chưa deploy thực tế.** Cập nhật mục này sau lần deploy đầu tiên.

## Kiến trúc

```
                      Internet
                         │
                ┌────────▼────────┐        Public subnet (2 AZ)
                │  ALB (Ingress)  │        + NAT Gateway
                └───┬─────────┬───┘
            /api/*  │         │  /*
        ┌───────────▼──┐   ┌──▼───────────┐     Private-app subnet (2 AZ)
        │ backend (x2) │   │ frontend (x2)│     EKS managed node group
        │ Flask :8000  │   │ nginx  :8080 │     (t3.small x2, HPA 2-4 pod)
        └──────┬───────┘   └──────────────┘
               │ TLS (verify-full)
        ┌──────▼───────┐                        Private-db subnet (2 AZ)
        │ RDS Postgres │                        không ra Internet
        └──────────────┘
```

| Tầng | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | React, Vite, Tailwind, nginx | Image chạy user không phải root (nginx-unprivileged) |
| Backend | Flask, SQLAlchemy, Alembic, gunicorn | `/api/health` (readiness), `/api/live` (liveness) |
| Database | PostgreSQL 15 | Local: container. AWS: RDS trong subnet riêng |
| Hạ tầng | Terraform | VPC 2 AZ, EKS 1.35, RDS, ECR, IAM (IRSA, GitHub OIDC), state trên S3 |
| Triển khai | Helm chart `charts/devops-app` | Hook migrate (trước) và seed (sau), HPA, PDB, NetworkPolicy |
| CI/CD | GitHub Actions | CI: test, lint, build, validate. CD: build, push ECR, `helm upgrade` |

## Cấu trúc repo

```
backend/            Flask API, migrations (Alembic), CLI database, test
frontend/           React + Vite, Dockerfile, nginx.conf (xem frontend/README.md)
charts/devops-app/  Helm chart (values.yaml, values-local.yaml, values-eks.yaml)
deploy/             compose/nginx.conf (proxy giả lập ALB), local/postgres.yaml (DB cho cluster local)
infra/              Terraform: VPC, EKS, RDS, IAM...   (infra/bootstrap = bucket S3 chứa state)
k8s/legacy/         Manifest thô cũ, đã thay bằng Helm chart (không dùng để deploy)
scripts/            deploy-eks.sh, teardown-eks.sh
.github/workflows/  ci.yml, cd.yml
docs/               database-integration-review.md (báo cáo tích hợp các nhánh)
compose.yaml        Chạy cả 3 tầng ở local
```

## 1. Chạy local bằng Docker Compose (nhanh nhất)

Cần: Docker.

```bash
cp .env.example .env     # điền DB_PASSWORD, SECRET_KEY, JWT_SECRET_KEY, ADMIN_PASSWORD (>= 12 ký tự)
docker compose up -d --build
```

Mở **http://localhost:8080**. Thứ tự khởi động: `postgres` → `migrate` → `seed` → `backend` → `proxy`. Đăng nhập admin bằng `ADMIN_USERNAME` / `ADMIN_PASSWORD` trong `.env`.

```bash
docker compose down        # dừng, giữ dữ liệu
docker compose down -v     # dừng và xoá cả dữ liệu
```

## 2. Chạy trên Kubernetes local (Docker Desktop) bằng Helm

Cần: Docker Desktop (bật **Settings → Kubernetes**), `kubectl`, `helm` (3.14+).

```bash
# Ingress controller (Traefik) và metrics-server (cho HPA)
helm repo add traefik https://traefik.github.io/charts
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm upgrade --install traefik traefik/traefik --version 42.4.1 -n traefik --create-namespace --wait
helm upgrade --install metrics-server metrics-server/metrics-server --version 3.14.0 \
  -n kube-system --set 'args={--kubelet-insecure-tls}' --wait

# Image local (cùng tên với compose: nt548-backend:dev, nt548-frontend:dev)
docker compose build backend frontend

# Secret: tạo file .env.k8s.local (bị .gitignore chặn) gồm các dòng
#   DB_USER=devops_app  DB_PASSWORD=...  SECRET_KEY=...  JWT_SECRET_KEY=...
#   ADMIN_USERNAME=admin  ADMIN_PASSWORD=...        (mỗi biến một dòng)
kubectl create namespace devops-app
kubectl -n devops-app create secret generic app-secrets --from-env-file=.env.k8s.local

# Database local (thay cho RDS) rồi ứng dụng
kubectl apply -f deploy/local/postgres.yaml
helm upgrade --install devops-app charts/devops-app -n devops-app \
  -f charts/devops-app/values-local.yaml --wait --timeout 5m
```

Mở **http://localhost**. Kiểm tra: `kubectl -n devops-app get pods,hpa,ingress`.
Gỡ: `helm uninstall devops-app -n devops-app && kubectl delete ns devops-app`.

> **Vì sao dùng Traefik mà không dùng ingress-nginx?** Ingress NGINX đã ngừng bảo trì từ 03/2026 (không còn bản vá bảo mật).

## 3. Triển khai lên AWS EKS

**Chi phí: khoảng 0,24 USD/giờ khi bật** (xem mục Chi phí). Chỉ bật khi cần, và **luôn chạy teardown sau buổi làm việc**.

Cần (máy Linux): AWS CLI đã đăng nhập, `terraform >= 1.10`, `helm >= 3.14`, `kubectl`, `docker`, `python3`, `git`.

```bash
# 1. State trên S3 (làm một lần)
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap apply
terraform -chdir=infra/bootstrap output -raw state_bucket      # tên bucket

# 2. Cấu hình (các file này bị .gitignore chặn, không commit)
cp infra/terraform.example.tfvars infra/terraform.tfvars        # điền db_password, alert_email
cp infra/backend.hcl.example infra/backend.hcl                  # điền tên bucket ở bước 1

# 3. Hạ tầng: VPC, EKS, RDS, ECR, IAM (mất 15-20 phút)
terraform -chdir=infra init -backend-config=backend.hcl
terraform -chdir=infra plan
terraform -chdir=infra apply

# 4. Ứng dụng: build + push image, cài ALB Controller, tạo Secret, cài chart, in địa chỉ ALB
bash scripts/deploy-eks.sh
```

`deploy-eks.sh` chạy lại an toàn. Chỉ cập nhật image mà không cài lại add-on: `bash scripts/deploy-eks.sh --tag <tag>`; hoặc dùng workflow **CD** trên GitHub (xem mục CI/CD).

### Công cụ kiểm tra và đo

Tất cả đều là script bash trong `scripts/`, xem `--help` của từng script.

| Script | Dùng khi nào |
|---|---|
| `bash scripts/preflight.sh --stage apply` | Trước `terraform apply`: kiểm công cụ, đăng nhập AWS, `terraform.tfvars` và `backend.hcl` đã điền, bucket state truy cập được |
| `bash scripts/aws-audit.sh` | Trước khi bắt đầu và sau mỗi buổi: quét tài nguyên còn tính tiền ở hai region, ước lượng USD/giờ. Chỉ đọc, không xoá gì |
| `bash scripts/smoke-test.sh <url>` | Sau khi deploy: kiểm trang chủ, health, topic, quiz không lộ đáp án, phân quyền, đăng nhập admin (đặt `ADMIN_USERNAME` và `ADMIN_PASSWORD` nếu muốn). Dùng được với Compose (`http://localhost:8080`), cluster local (`http://localhost`) và ALB |
| `bash scripts/loadtest.sh <url>` | Minh chứng HPA: sinh tải bằng k6 và lưu dòng thời gian HPA vào `docs/images/`. Chạy ngắn trên EKS vì tải kéo thêm pod và có thể cần thêm node |

`deploy-eks.sh` tự gọi `preflight.sh` ở đầu và `smoke-test.sh` ở cuối.

### Gỡ toàn bộ (bắt buộc sau mỗi buổi)

```bash
bash scripts/teardown-eks.sh
```

Script xoá Ingress, **chờ ALB biến mất**, gỡ ALB Controller rồi mới `terraform destroy`. Thứ tự này quan trọng: ALB do controller tạo, không nằm trong state Terraform, nếu `destroy` trước thì ALB thành mồ côi, vẫn tính tiền và chặn việc xoá VPC. Cuối cùng script kiểm tra không còn NAT Gateway, Elastic IP, Load Balancer, EKS, RDS. Bucket state ở `infra/bootstrap` được giữ lại (chi phí gần như bằng 0).

## 4. CI/CD (GitHub Actions)

- **CI** (`ci.yml`, mỗi Pull Request và push lên `main`): pytest với PostgreSQL thật, lint và build frontend, build 2 image Docker, `terraform fmt/validate`, `helm lint` và `kubeconform`, `docker compose config`.
- **CD** (`cd.yml`, chạy tay hoặc khi bật biến `DEPLOY_ENABLED=true`): đăng nhập AWS bằng **OIDC** (không lưu access key), build và push image lên ECR theo commit SHA, `helm upgrade --atomic` (lỗi thì tự rollback). Chỉ **nâng cấp** release đã được cài bằng `deploy-eks.sh`.
- Cần GitHub Secret `AWS_ROLE_ARN` = output `github_actions_role_arn` của Terraform.

## Chi phí ước lượng (us-east-1)

| Thành phần | USD/giờ |
|---|---|
| EKS control plane | 0,10 |
| 2 × t3.small | ~0,042 |
| NAT Gateway | ~0,045 |
| ALB | ~0,025 |
| RDS db.t3.micro | ~0,018 |
| Public IPv4, EBS | ~0,015 |
| **Tổng** | **~0,24** |

Một buổi 4 giờ khoảng 1 USD; **bỏ quên cả tháng khoảng 175 USD**. Đơn giá là ước lượng, kiểm lại bằng AWS Pricing Calculator. Terraform tạo sẵn cảnh báo AWS Budgets qua email.

## Xử lý sự cố nhanh

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Pod `ImagePullBackOff` | Sai tên/tag image, hoặc image chưa push lên ECR | `kubectl -n devops-app describe pod <tên>`, xem mục Events |
| Pod kẹt `ContainerCreating` | Thiếu ConfigMap `rds-ca` hoặc Secret `app-secrets` | Chạy `deploy-eks.sh` (script tạo cả hai) |
| `/api/*` trả 503, trang chủ vẫn lên | Backend mất kết nối DB (readiness rớt, pod không bị restart) | Kiểm tra RDS và security group; xem `kubectl -n devops-app logs deploy/backend` |
| Ingress không có địa chỉ | ALB Controller chưa chạy hoặc thiếu quyền IAM | `kubectl -n kube-system logs deploy/aws-load-balancer-controller` |
| `helm upgrade` treo lâu | Job migrate lỗi (image sai, DB chưa lên) | `kubectl -n devops-app logs job/db-migrate`; `--atomic` sẽ rollback sau timeout |
| Teardown báo ALB chưa mất | Controller chưa kịp xoá | Chờ thêm; xem log controller; **không** gỡ controller thủ công trước khi ALB mất |

## Phân công

> TODO: điền tên thành viên và phần phụ trách thật trước khi nộp.

| Thành viên | Phần phụ trách |
|---|---|
| `<Họ tên>` | Backend (Flask, database, migration) |
| `<Họ tên>` | Frontend (React) |
| `<Họ tên>` | Kubernetes và Helm |
| `<Họ tên>` | Hạ tầng Terraform (VPC, EKS, RDS, ECR) |
| `<Họ tên>` | CI/CD |

## Ảnh minh chứng

> TODO: chụp sau lần deploy thật và lưu vào `docs/images/`.

- [ ] `terraform apply` thành công (danh sách tài nguyên)
- [ ] `kubectl get nodes,pods,hpa,ingress -n devops-app`
- [ ] Trang web mở qua địa chỉ ALB (trang chủ, quiz, trang admin)
- [ ] HPA tự tăng số pod khi chạy tải
- [ ] Pipeline CI xanh và CD thành công trên GitHub Actions
- [ ] Màn hình Billing/Budgets và kết quả `teardown-eks.sh` (không còn tài nguyên)

## Tài liệu liên quan

- [backend/database/README.md](backend/database/README.md): database, migration, tài khoản admin
- [frontend/README.md](frontend/README.md): chi tiết frontend
