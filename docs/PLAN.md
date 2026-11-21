# Kế hoạch hoàn thiện NT548-Group-6

> **Đối tượng đọc:** agent lập trình (OpenCode, Claude Code, Codex...) và các thành viên nhóm.
> **Cập nhật:** 2026-11-21. Thay thế mục 7 "Kế hoạch thực hiện" trong [AGENT_CONTEXT.md](AGENT_CONTEXT.md).
> Bối cảnh, lịch sử nhánh và rủi ro bảo mật: xem [AGENT_CONTEXT.md](AGENT_CONTEXT.md).
> Việc giao cho thành viên infra: xem [INFRA_TASKS_JUNIOR.md](INFRA_TASKS_JUNIOR.md).

## Cách dùng file này

- Mỗi task có **mã** (ví dụ `P4.3`), **người làm**, **máy làm** và **tiêu chí xong**.
- Agent chỉ nhận task có người làm là `OWNER` hoặc `AGENT`. Không làm task `JR`; đó là phần học của thành viên infra.
- Làm xong task nào thì đổi `- [ ]` thành `- [x]` và ghi ngày. Nếu không kiểm được (thiếu công cụ) thì ghi rõ `(chưa kiểm: <lý do>)`.
- Làm theo thứ tự các phase. Trong một phase, các task không phụ thuộc nhau có thể làm song song.

## 1. Các quyết định đã chốt

| Chủ đề | Quyết định | Lý do |
|---|---|---|
| Nhánh làm việc | **`k8s-development`**. Nhánh này kéo code từ `feature-backend` về rồi làm tiếp trên đó | Nhánh của OWNER. `feature-backend` là nhánh tích hợp đầy đủ nhất |
| Nhánh của thành viên infra | `infra/jr-tasks`, tạo từ `k8s-development`, mở PR vào `k8s-development` | Tránh hai người cùng sửa một nhánh |
| Đóng gói k8s | **Helm chart** tự viết, đặt tại `charts/devops-app/` | Một chart dùng cho cả local và EKS, khác nhau ở file values |
| Region | **`us-east-1`** (AZ `us-east-1a`, `us-east-1b`) | Rẻ hơn `ap-southeast-1` khoảng 20–30% |
| Phiên bản EKS | **1.35**, có standard support tới 2027-03-27 | 1.31 đang ở extended support, giá 0,60 USD/giờ, gấp 6 lần |
| Node | 2 × `t3.small`, **bật prefix delegation** của VPC CNI | Không bật thì `t3.small` chỉ chạy được 11 pod mỗi node |
| Database | Local dùng Postgres chạy riêng (Compose hoặc manifest riêng). EKS dùng RDS. **Chart không chứa DB** | Job migrate là Helm hook chạy trước các tài nguyên khác, nên DB phải có sẵn trước khi cài chart |
| Secret | Tạo bằng `kubectl create secret` từ file `.env` không commit. Chart chỉ tham chiếu tên `app-secrets` | Không để mật khẩu trong values hay trong git |
| Chạy app trên AWS | Chỉ bật khi kiểm tích hợp hoặc demo, xong thì `terraform destroy` ngay | Khoảng 0,24 USD/giờ, bỏ quên cả tháng thì mất khoảng 175 USD |

## 2. Phân vai và máy làm

| Vai | Ai | Máy | Làm gì |
|---|---|---|---|
| `OWNER` | Chủ nhánh `k8s-development` | Windows và Linux | Duyệt, commit, push. Chạy mọi lệnh có tạo tài nguyên AWS |
| `AGENT` | Agent lập trình | Windows | Viết code, chart, CI, tài liệu; kiểm bằng Docker. **Không có quyền AWS** |
| `JR` | Thành viên infra | Máy của mình | Các task Terraform đơn giản trong [INFRA_TASKS_JUNIOR.md](INFRA_TASKS_JUNIOR.md). Chỉ chạy `validate`, **không chạy `apply`** |

**Máy Windows (máy chính hiện tại):** có Docker Desktop (kèm Kubernetes), kubectl, Python 3.14 và 3.10, Node 24, WSL Ubuntu. **Không có** terraform, aws, helm.
- Muốn dùng Terraform hay Helm trên Windows thì chạy qua Docker (xem phụ lục A). Không cần cài.
- Repo đang có `core.autocrlf=true`. Phải có `.gitattributes` (task P0.3) để file `.sh`, `.yaml`, `.tf` luôn dùng LF.

**Máy Linux:** có AWS CLI, Helm, eksctl, Terraform. Mọi bước có `apply`, `push ECR` hay `helm install` lên EKS đều làm ở đây.

**Đồng bộ giữa hai máy:** OWNER push `k8s-development` lên GitHub, máy Linux `git pull`.

### Ai sở hữu file nào (tránh conflict)

| File | Người sửa |
|---|---|
| `infra/variables.tf`, `infra/terraform.example.tfvars`, `infra/ecr.tf`, `infra/database.tf`, `infra/budget.tf`, `infra/outputs.tf`, `infra/README.md` | `JR` |
| `infra/eks.tf`, `infra/provider.tf`, `infra/iam_alb_controller.tf`, `infra/iam_github_oidc.tf`, `infra/backend.tf`, `infra/bootstrap/**` | `OWNER`/`AGENT` |
| Mọi thứ ngoài `infra/` | `OWNER`/`AGENT` |

Quy tắc: `variable` và `output` mới của `OWNER`/`AGENT` đặt **ngay trong file của mình** (ví dụ output role ARN để trong `iam_alb_controller.tf`), không thêm vào `variables.tf` hay `outputs.tf` của JR. Terraform đọc mọi file `.tf` trong thư mục, nên để ở đâu cũng chạy.

---

## 3. PHẦN A: Làm trên Windows (không tốn tiền AWS)

### P0. Git và môi trường (`AGENT` làm, `OWNER` duyệt)

- [x] **P0.1** (2026-11-21) Cất 3 file sửa dở cũ (`k8s/database-service.yaml`, `k8s/namespace.yaml`, `k8s/secrets.yaml`): `git stash push -m "k8s-wip-old" -- k8s/`. Không commit 3 file này (lý do ở mục 6 của AGENT_CONTEXT).
- [x] **P0.2** (2026-11-21) Đưa `k8s-development` lên ngang `feature-backend`. Cả hai lệnh đều là fast-forward, không tạo merge commit:
  ```bash
  git fetch origin
  git merge --ff-only origin/k8s-development
  git merge --ff-only origin/feature-backend
  ```
  Xong khi `git log -1` ra `9a56611`, hoặc commit mới hơn nếu `feature-backend` đã có thêm.
- [x] **P0.3** (2026-11-21) Thêm `.gitattributes`: `* text=auto`; `*.sh *.yaml *.yml *.tf *.tpl Dockerfile* text eol=lf`.
- [x] **P0.4** (2026-11-21) Bật Docker Desktop và Kubernetes trong Settings. Xong khi `kubectl config current-context` ra `docker-desktop` và `kubectl get nodes` thấy `Ready`.
- [ ] **P0.5** `OWNER` push `k8s-development` để JR tạo nhánh `infra/jr-tasks` từ đó.

### P1. Kiểm tra code hiện có (`AGENT`)

- [x] **P1.1** (2026-11-21) Frontend: `npm ci`, `npm run lint`, `npm run build` trong `frontend/`.
- [x] **P1.2** (2026-11-21) Backend: chạy pytest trong container `python:3.12-slim` (giống image production), cùng một container `postgres:15` trên chung Docker network, đặt `TEST_DATABASE_URL` để chạy cả 12 test cần DB thật.
- [x] **P1.3** (2026-11-21) Ghi kết quả (số test pass/skip/fail) vào mục "Nhật ký" cuối file này để làm mốc so sánh.

### P2. Docker và Compose chạy đủ 3 tầng (`AGENT`)

- [ ] **P2.1** Build `backend:dev`, `frontend:dev`. Kiểm tra `docker run --rm backend:dev id` ra uid 10001.
- [ ] **P2.2** Mở rộng `compose.yaml` thành các service `postgres`, `migrate`, `seed`, `backend`, `frontend`, `proxy`:
  - `migrate` chạy `python -m database migrate`, `depends_on: postgres: service_healthy`.
  - `seed` chạy sau `migrate` (`service_completed_successfully`); tạo admin khi có `ADMIN_PASSWORD`.
  - `backend` chờ `migrate` xong.
  - `proxy` là nginx ở cổng `8080`: `/api` chuyển sang `backend:8000`, còn lại sang `frontend`. Proxy này giả lập ALB Ingress; `frontend/nginx.conf` cố ý không proxy `/api`.
- [ ] **P2.3** Cập nhật `.env.example` đủ biến; `.env` thật vẫn bị `.gitignore` chặn.

Xong khi `docker compose up -d`, mở `http://localhost:8080` thấy danh sách topic, đăng nhập admin được.

### P3. Sửa app cho đạt chuẩn production (`AGENT`)

- [ ] **P3.1** Thêm `GET /api/live` trả 200 và không truy vấn DB. Viết test cho endpoint này.
  Lý do: `/api/health` trả 503 khi mất DB. Nếu liveness dùng endpoint đó, chỉ cần RDS chập chờn là mọi pod backend bị restart. Liveness dùng `/api/live`, readiness giữ `/api/health`.
- [ ] **P3.2** Frontend đổi image runtime sang `nginxinc/nginx-unprivileged` (cổng 8080, không chạy root). Sửa `nginx.conf` cho khớp.
- [ ] **P3.3** Ghi phiên bản cụ thể cho mọi image phụ (`postgres`, `busybox`, `nginx`...).
- [ ] **P3.4** Xoá `k8s/get_helm.sh` (đây là script cài Helm chép nguyên, không phải manifest) và xoá các comment `TODO` cũ trong `frontend/src/api/client.js` (code bên dưới đã viết xong).

Xong khi pytest vẫn pass hết và compose vẫn chạy.

### P4. Helm chart và chạy trên Kubernetes local (`AGENT`)

Cấu trúc:
```
charts/devops-app/
  Chart.yaml
  values.yaml          # mặc định dùng chung
  values-local.yaml    # Docker Desktop: ingress nginx, image :dev, DB_SSLMODE=disable
  values-eks.yaml      # EKS: ingress alb, image ECR, ExternalName -> RDS, rds-ca
  templates/
    _helpers.tpl
    configmap.yaml           # hook pre-install,pre-upgrade, weight -10
    rds-ca-configmap.yaml    # chỉ render khi rdsCa.enabled; hook weight -10
    database-service.yaml    # ExternalName, chỉ render khi database.externalName có giá trị
    job-migrate.yaml         # hook pre-install,pre-upgrade, weight 0
    job-seed.yaml            # hook post-install,post-upgrade, weight 5
    backend-deployment.yaml, backend-service.yaml
    frontend-deployment.yaml, frontend-service.yaml
    ingress.yaml             # className và annotation lấy từ values
    hpa.yaml, pdb.yaml, networkpolicy.yaml   # bật/tắt theo values
    NOTES.txt
deploy/local/postgres.yaml   # Postgres cho cluster local, apply TRƯỚC khi cài chart
```

- [ ] **P4.1** Tạo chart từ các manifest trong `k8s/` (bản trên `feature-backend`). Giữ nguyên tên: namespace `devops-app`, ConfigMap `app-config`, Secret `app-secrets`, Service `postgres`, `backend`, `frontend`.
- [ ] **P4.2** Hook: ConfigMap và rds-ca có weight -10, migrate 0, seed 5 (post). Đặt `helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded` cho Job.
  Lưu ý: hook chạy **trước** tài nguyên thường, nên Secret phải được tạo trước bằng `kubectl` (xem P4.5).
- [ ] **P4.3** Probe: liveness `/api/live`, readiness `/api/health`. Thêm `securityContext` (`runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`).
- [ ] **P4.4** HPA cho backend và frontend (CPU 70%, min 2, max 4), PDB `minAvailable: 1`, NetworkPolicy chỉ cho ingress và frontend gọi tới backend.
- [ ] **P4.5** Chạy trên Docker Desktop:
  ```bash
  helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
  # metrics-server cần thêm cờ --kubelet-insecure-tls trên Docker Desktop
  kubectl create namespace devops-app
  kubectl -n devops-app create secret generic app-secrets --from-env-file=.env.k8s.local
  kubectl apply -f deploy/local/postgres.yaml
  helm upgrade --install devops-app charts/devops-app -n devops-app -f charts/devops-app/values-local.yaml
  ```
  Không có helm trên Windows thì dùng Docker (phụ lục A).
- [ ] **P4.6** Bài tập debug: cố ý dùng sai image để thấy `ImagePullBackOff`, tắt postgres để thấy readiness rớt nhưng liveness vẫn giữ pod. Ghi những gì học được vào mục "Nhật ký".
- [ ] **P4.7** Chuyển `k8s/*.yaml` cũ vào `k8s/legacy/`, kèm README ghi "đã thay bằng `charts/devops-app`". Xoá hẳn sau khi deploy EKS thành công.

Xong khi `helm lint` pass; `helm template` render được với cả 2 file values; app chạy ở `http://localhost`; `kubectl get hpa` có số liệu CPU.
Lưu ý: CNI của Docker Desktop không thực thi NetworkPolicy. Lên EKS thì bật network policy trong VPC CNI (P5.1) mới kiểm được.

### P5. Terraform phần OWNER/AGENT (song song với task JR)

Chỉ viết code và chạy `fmt` / `validate` qua Docker. **Không `apply` trên Windows.**

- [ ] **P5.1** `infra/eks.tf`:
  - `cluster_version = "1.35"`.
  - Addon `vpc-cni` thêm `configuration_values = jsonencode({ env = { ENABLE_PREFIX_DELEGATION = "true", WARM_PREFIX_TARGET = "1" }, enableNetworkPolicy = "true" })`.
  - Thêm biến `cluster_endpoint_public_access_cidrs` (khai báo ngay trong `eks.tf`), mặc định `["0.0.0.0/0"]`; khi apply đặt IP của máy Linux.
  - Giữ nguyên tên node group `standard-workers`, chỉ sửa thuộc tính. Đổi tên sẽ khiến Terraform xoá rồi tạo lại node group.
- [ ] **P5.2** `infra/iam_alb_controller.tf`: IRSA role cho ServiceAccount `kube-system/aws-load-balancer-controller`. Dùng module `terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks` (bản 5.x, tương thích AWS provider 5) với `attach_load_balancer_controller_policy = true`, nhờ vậy không phải tự chép file IAM policy JSON. Output `alb_controller_role_arn`.
- [ ] **P5.3** `infra/iam_github_oidc.tf`: OIDC provider của GitHub, cùng role cho GitHub Actions. Trust policy chỉ cho `repo:MichaelSkyman/NT548-Group-6:ref:refs/heads/main` (hoặc environment `production`). Quyền gồm push ECR và `eks:DescribeCluster`; thêm access entry EKS cho role này. Output `github_actions_role_arn`.
- [ ] **P5.4** `infra/bootstrap/`: stack riêng tạo S3 bucket chứa state (bật versioning, mã hoá, chặn public). Stack chính thêm `infra/backend.tf` dùng S3 backend; nếu Terraform ≥ 1.10 thì dùng `use_lockfile = true`, khỏi cần DynamoDB.
- [ ] **P5.5** `infra/provider.tf`: nâng `required_version` lên `>= 1.10` nếu dùng `use_lockfile`.

Xong khi `terraform fmt -check -recursive` và `terraform init -backend=false && terraform validate` pass cho `infra/` và `infra/bootstrap/`.

### P6. CI/CD với GitHub Actions (`AGENT`)

- [ ] **P6.1** `.github/workflows/ci.yml`, chạy trên `pull_request` và `push`, gồm các job:
  - `backend`: Python 3.12, service `postgres:15`, `pytest --cov`.
  - `frontend`: Node 20, `npm ci`, `lint`, `build`.
  - `docker`: build 2 image, không push.
  - `terraform`: `fmt -check -recursive`, `validate` cho `infra/` và `infra/bootstrap/`.
  - `helm`: `helm lint`, rồi `helm template` với từng file values, đưa kết quả qua `kubeconform -strict`.
- [ ] **P6.2** `.github/workflows/cd.yml`, chạy thủ công (`workflow_dispatch`) và trên `main`: assume role qua OIDC, build và push ECR với tag `${{ github.sha }}`, rồi `helm upgrade --install ... --set backend.image.tag=... --set frontend.image.tag=...`. Workflow này **chỉ chạy được sau L7**.

### P7. Script và tài liệu (`AGENT`)

- [ ] **P7.1** `scripts/deploy-eks.sh`: lấy output Terraform, cập nhật kubeconfig, build và push ECR, cài ALB Controller bằng Helm, tạo secret, `helm upgrade --install` app, in ra DNS của ALB.
- [ ] **P7.2** `scripts/teardown-eks.sh`: `helm uninstall devops-app`, **chờ ALB bị xoá** (kiểm bằng `aws elbv2 describe-load-balancers`), `helm uninstall` ALB Controller, rồi `terraform destroy`. Nếu đảo thứ tự, ALB và Security Group sẽ bị mồ côi và chặn việc xoá VPC.
- [ ] **P7.3** Viết lại `README.md` gốc: sơ đồ kiến trúc, chạy local (Compose và Helm), deploy EKS, teardown, chi phí, phân công thành viên, chỗ để ảnh minh chứng.
- [ ] **P7.4** Cập nhật [AGENT_CONTEXT.md](AGENT_CONTEXT.md) cho khớp trạng thái mới.

---

## 4. PHẦN B: Làm trên Linux (`OWNER`, có tính tiền AWS)

Điều kiện bắt đầu: P4, P5 và các task JR-1 → JR-4 đã merge vào `k8s-development`; CI xanh.

- [ ] **L0** Kiểm tra tài nguyên cũ ở **cả hai** region `ap-southeast-1` và `us-east-1`: `aws eks list-clusters`, `aws rds describe-db-instances`, `aws ec2 describe-nat-gateways`, `aws ec2 describe-addresses`, `aws elbv2 describe-load-balancers`. Thấy tài nguyên cũ còn chạy thì xoá. Đổi hoặc vô hiệu mật khẩu RDS đã bị lộ (xem mục 5 của AGENT_CONTEXT).
  Ghi chú: đổi region nghĩa là toàn bộ hạ tầng được tạo mới. State cũ ở `ap-southeast-1` (nếu còn) phải `destroy` bằng code cũ trước.
- [ ] **L1** `terraform -chdir=infra/bootstrap apply`, tạo S3 state. Sau đó `terraform -chdir=infra init -migrate-state`.
- [ ] **L2** Apply riêng phần budget trước: `terraform -chdir=infra apply -target=aws_budgets_budget.monthly`. Nhận email xác nhận cảnh báo.
- [ ] **L3** `terraform -chdir=infra apply`, mất khoảng 15–20 phút. **Từ đây bắt đầu tính khoảng 0,24 USD/giờ.**
- [ ] **L4** `scripts/deploy-eks.sh`.
- [ ] **L5** Kiểm tra: mở DNS ALB, xem trang topic, đăng nhập admin, chạy thử quiz; `kubectl get pods,hpa,ingress -n devops-app`; chạy load test ngắn để thấy HPA scale.
- [ ] **L6** Chụp ảnh minh chứng, lưu vào `docs/images/`.
- [ ] **L7** Thêm `AWS_ROLE_ARN` (lấy từ output `github_actions_role_arn`) vào GitHub Secrets, chạy `cd.yml`, kiểm tra image mới được deploy.
- [ ] **L8** `scripts/teardown-eks.sh`. Mở Console kiểm tra không còn EKS, NAT, EIP, ALB, RDS. **Bắt buộc làm sau mỗi buổi.**

## 5. Lộ trình

| Buổi | Máy | Task | Tiến độ ước lượng |
|---|---|---|---|
| 1 (2026-11-21) | Windows | P0, P1, P2, P3; bắt đầu P4 | ~55% |
| 2 | Windows | P4, P5. JR làm JR-1 → JR-3 | ~70% |
| 3 | Windows | P6, P7. JR làm JR-4, JR-5 | ~80% |
| 4 | Linux | L0 → L6, sửa lỗi phát sinh | ~90% |
| 5 | Linux | L7, L8, demo thử | ~95–100% |

Để sau nếu còn thời gian và ngân sách: HTTPS (ACM, cần domain), Prometheus/Grafana (cần node lớn hơn hoặc thêm node), RDS Multi-AZ.

## 6. Chi phí ước lượng ở us-east-1

| Thành phần | USD/giờ |
|---|---|
| EKS control plane (bản standard support) | 0,10 |
| 2 × t3.small | ~0,042 |
| NAT Gateway | ~0,045 |
| ALB | ~0,025 |
| RDS db.t3.micro | ~0,018 |
| Public IPv4, EBS | ~0,015 |
| **Tổng** | **~0,24** |

Một buổi 4 giờ tốn khoảng 1 USD. Bỏ quên cả tháng tốn khoảng 175 USD. Kiểm lại giá bằng AWS Pricing Calculator trước buổi L3.

## 7. Nhật ký

Agent ghi ở đây: ngày, task, kết quả kiểm tra, vấn đề gặp phải.

- 2026-11-21: Tạo kế hoạch. Đã kiểm nhánh: `k8s-development` không có commit riêng nào so với `feature-backend`, nên fast-forward được.
- 2026-11-21: P0.1 → P0.3 xong. Stash `k8s-wip-old` còn trong `git stash list` (không xoá). `k8s-development` đã ở `9a56611` (= `feature-backend`), local đang trước `origin/k8s-development` 23 commit, chưa push. Thêm `.gitattributes`; index không có file CRLF; `k8s/get_helm.sh` ngoài working tree đang là CRLF (sẽ xoá ở P3.4).
- 2026-11-21 (cập nhật): mở lại Docker Desktop thì daemon sẵn sàng sau ~5 giây (server 29.9.3, 16 CPU, ~7,6 GB RAM). Lần trước chỉ là khởi động treo, không có lỗi cấu hình. Phần còn lại của P0.4: **Kubernetes chưa bật** (`kubectl config get-contexts` trống). Lưu ý riêng: distro WSL `Ubuntu` hỏng (`ext4.vhdx` thiếu ở `C:\Users\Admin\AppData\Local\wsl\{...}`), không ảnh hưởng Docker; chưa động vào.
- 2026-11-21: P0.4 xong. Kubernetes của Docker Desktop online: node `docker-desktop` Ready (v1.36.1), 9 pod hệ thống Running, context `docker-desktop`. Ubuntu WSL hỏng nhưng **không cần** cho kế hoạch (Docker dùng distro `docker-desktop` riêng).
- 2026-11-21: **Mốc kiểm tra (P1)** trên commit `9a56611`, trước khi sửa code:
  - Backend (Python 3.12.16 + Postgres 15 trong container): **38 passed, 0 skipped** (tài liệu cũ ghi 26 pass, 12 skip; nay đủ cả 12 test cần DB thật).
  - Frontend (Node 24): `npm ci` ok, `npm run lint` sạch, `npm run build` ok (57 module, JS 427 kB / gzip 128 kB). `npm ci` báo 4 lỗ hổng (3 moderate, 1 high) trong dependency, chưa xử lý; xem lại bằng `npm audit` sau.
- 2026-11-21: (ghi chú cũ) P0.4 **chưa xong**. Docker Desktop cài ở `F:\Docker\Program\Docker Desktop.exe` (không phải `C:\Program Files`). Đã khởi động nhưng sau ~5 phút daemon vẫn chưa sẵn sàng (distro WSL `docker-desktop` còn `Stopped`, log không báo lỗi). Nghi chờ thao tác trong cửa sổ Docker Desktop. Ngoài ra `kubectl config get-contexts` đang trống, nên cần bật Kubernetes trong Settings.

---

## Phụ lục A. Chạy Terraform và Helm trên Windows qua Docker

Chạy từ thư mục gốc repo trong Git Bash (PowerShell thì đổi `$(pwd)` thành `${PWD}`). Thay `<TF_VERSION>` bằng đúng phiên bản `terraform version` trên máy Linux để hai máy giống nhau.

```bash
# Terraform (không cần quyền AWS cho fmt/validate)
docker run --rm -v "$(pwd)/infra:/w" -w /w hashicorp/terraform:<TF_VERSION> fmt -check -recursive
docker run --rm -v "$(pwd)/infra:/w" -w /w hashicorp/terraform:<TF_VERSION> init -backend=false
docker run --rm -v "$(pwd)/infra:/w" -w /w hashicorp/terraform:<TF_VERSION> validate

# Helm (lint/template không cần cluster)
docker run --rm -v "$(pwd):/w" -w /w alpine/helm:<HELM_VERSION> lint charts/devops-app
docker run --rm -v "$(pwd):/w" -w /w alpine/helm:<HELM_VERSION> template devops-app charts/devops-app -f charts/devops-app/values-local.yaml
```

Muốn `helm install` lên cluster Docker Desktop từ container thì phải mount `~/.kube` và trỏ server về `host.docker.internal`. Nếu phiền, cách đơn giản hơn là cài `helm.exe` (winget: `Helm.Helm`).

## Phụ lục B. Lệnh kiểm tra trước khi báo xong

| Phạm vi | Lệnh |
|---|---|
| Backend | pytest trong container `python:3.12-slim`, có `TEST_DATABASE_URL` |
| Frontend | `npm run lint && npm run build` |
| Helm | `helm lint charts/devops-app` và `helm template` với cả hai file values |
| Terraform | `fmt -check -recursive`, `init -backend=false`, `validate` |
| Compose | `docker compose config` và `docker compose up -d`, rồi `curl localhost:8080/api/health` |
