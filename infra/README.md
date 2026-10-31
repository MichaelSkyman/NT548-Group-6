# NT548-Group-6

Dự án môn học NT548 - Triển khai ứng dụng 3-tier (React + Flask + PostgreSQL) trên hạ tầng AWS EKS bằng Terraform, Kubernetes và CI/CD.

---

## 🏗️ Hạ tầng (Infrastructure - Terraform)

Toàn bộ tài nguyên hạ tầng tự động hóa trên AWS được quản lý trong thư mục `infra/` theo mô hình Multi-AZ chuẩn Production:

* **VPC**: Cấu hình DNS hostnames và DNS support.
* **Public Subnets**: Đặt Internet Gateway, Application Load Balancer (ALB) và NAT Gateway.
* **Private App Subnets**: Dành riêng cho EKS Worker Nodes (chạy Frontend/Backend Pods), kết nối Internet qua NAT Gateway.
* **Private Database Subnets**: Dành riêng cho RDS PostgreSQL, cách ly hoàn toàn khỏi Internet.
* **EKS**: Cluster `nt548-group6` (Kubernetes 1.31) với Managed Node Group `standard-workers` (t3.small, 1–3 node) đặt trong Private App Subnets, bật IRSA cho AWS Load Balancer Controller.
* **RDS PostgreSQL**: Cấu hình DB Subnet Group phủ qua 2 Availability Zones (`ap-southeast-1a`, `ap-southeast-1b`), Security Group giới hạn kết nối qua port 5432 nội bộ từ App Subnets.

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
├── eks.tf             # EKS Cluster + Managed Node Group (module terraform-aws-modules/eks/aws)
├── database.tf        # Cấu hình RDS Subnet Group, Security Group & PostgreSQL Instance
└── outputs.tf         # VPC ID, RDS endpoint, EKS endpoint/OIDC và lệnh cập nhật kubeconfig
```

---

## 🚀 Triển khai

Terraform tạo toàn bộ hạ tầng: VPC, EKS và RDS (region `ap-southeast-1`, tên cluster `nt548-group6`).

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
