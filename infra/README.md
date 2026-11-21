# NT548-Group-6

Dự án môn học NT548 - Triển khai ứng dụng 3-tier (React + Flask + PostgreSQL) trên hạ tầng AWS EKS bằng Terraform, Kubernetes và CI/CD.

---

## 🏗️ Hạ tầng (Infrastructure - Terraform)

Toàn bộ tài nguyên hạ tầng tự động hóa trên AWS được quản lý trong thư mục `infra/` theo mô hình VPC trải 2 AZ. Lưu ý để tiết kiệm chi phí: RDS mặc định Single-AZ (bật Multi-AZ bằng biến `db_multi_az`) và chỉ có 1 NAT Gateway:

* **VPC**: Cấu hình DNS hostnames và DNS support.
* **Public Subnets**: Đặt Internet Gateway, Application Load Balancer (ALB) và NAT Gateway.
* **Private App Subnets**: Dành riêng cho EKS Worker Nodes (chạy Frontend/Backend Pods), kết nối Internet qua NAT Gateway.
* **Private Database Subnets**: Dành riêng cho RDS PostgreSQL, cách ly hoàn toàn khỏi Internet.
* **EKS**: Cluster `nt548-group6` (Kubernetes 1.35) với Managed Node Group `standard-workers` (t3.small, 1–3 node) đặt trong Private App Subnets, bật IRSA cho AWS Load Balancer Controller.
* **RDS PostgreSQL**: mã hoá ổ đĩa, backup tự động 1 ngày; DB Subnet Group phủ qua 2 Availability Zones (`us-east-1a`, `us-east-1b`), Security Group giới hạn kết nối qua port 5432 nội bộ từ App Subnets.

---

## 📁 Cấu trúc thư mục `infra/`

```text
infra/
├── .gitkeep
├── provider.tf        # Khai báo nhà cung cấp AWS
├── variables.tf       # Khai báo các biến đầu vào (Region, VPC CIDR, DB Credentials)
├── terraform.example.tfvars # File mẫu, copy thành terraform.tfvars (không commit) để điền giá trị thật
├── main.tf            # Gọi module network (VPC Multi-AZ, Subnets, IGW, NAT Gateway, Route Tables)
├── modules/network/   # Module mạng: main.tf, variables.tf, output.tf
├── ecr.tf             # 2 kho ECR (backend, frontend) + lifecycle giữ 10 image mới nhất
├── budget.tf          # AWS Budgets gửi email cảnh báo chi phí
├── eks.tf             # EKS Cluster + Managed Node Group (module terraform-aws-modules/eks/aws)
├── database.tf        # Cấu hình RDS Subnet Group, Security Group & PostgreSQL Instance
└── outputs.tf         # VPC ID, RDS endpoint, EKS endpoint/OIDC, URL ECR và lệnh cập nhật kubeconfig
```

---

## 🚀 Triển khai

Terraform tạo toàn bộ hạ tầng: VPC, EKS và RDS (region `us-east-1`, tên cluster `nt548-group6`).

```bash
# 0. Tạo file biến từ mẫu rồi điền db_password (file này đã được .gitignore)
cp infra/terraform.example.tfvars infra/terraform.tfvars

# 1. Hạ tầng mạng + EKS + database
terraform -chdir=infra init
terraform -chdir=infra apply

# 2. Cấu hình kubectl kết nối tới cluster
$(terraform -chdir=infra output -raw eks_kubeconfig_command)
kubectl get nodes

# 3. Trỏ Service "postgres" tới RDS
sed -i "s|externalName: .*|externalName: $(terraform -chdir=infra output -raw rds_address)|" k8s/database-service.yaml

# 4. Triển khai ứng dụng
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml -f k8s/secrets.yaml -f k8s/database-service.yaml
kubectl apply -f k8s/migration_job.yaml
kubectl apply -f k8s/backend.yaml -f k8s/frontend.yaml -f k8s/ingress.yaml
```

> `k8s/ingress.yaml` dùng IngressClass `alb`, cần cài AWS Load Balancer Controller (IAM policy `iam_policy.json` + IRSA qua `eks_oidc_provider_arn`) thì ALB mới được tạo.

---

## 🧹 Dọn dẹp sau khi demo

EKS, NAT Gateway và ALB tính tiền theo giờ, nhớ xoá ngay sau khi demo:

```bash
# 1. Xoá app Helm (để Load Balancer Controller xoá ALB)
helm uninstall <RELEASE_NAME> -n devops-app

# 2. Chờ ALB biến mất khỏi EC2 > Load Balancers, rồi destroy hạ tầng
terraform -chdir=infra destroy
```

Kiểm tra trên AWS Console (region `us-east-1`) không còn: **NAT Gateway**, **Elastic IP**, **Load Balancer**.

---

## ⚙️ Biến đầu vào

| Biến | Ý nghĩa | Mặc định | Bắt buộc |
|---|---|---|---|
| `aws_region` | Region deploy | `us-east-1` | Không |
| `project_name` | Tiền tố tên tài nguyên | `nt548-group6` | Không |
| `environment` | Môi trường (dev, prod) | `dev` | Không |
| `vpc_cidr` | CIDR của VPC | `10.0.0.0/16` | Không |
| `db_username` | Tài khoản admin RDS | `postgres` | Không |
| `db_password` | Mật khẩu admin RDS (sensitive) | — | **Có** |
| `db_multi_az` | Bật RDS Multi-AZ | `false` | Không |
| `alert_email` | Email nhận cảnh báo AWS Budgets | — | **Có** |
| `monthly_budget_usd` | Ngân sách hàng tháng (USD) | `20` | Không |
