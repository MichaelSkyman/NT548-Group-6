# NT548-Group-6

Dự án môn học NT548 - Triển khai ứng dụng 3-tier (React + Flask + PostgreSQL) trên hạ tầng AWS EKS bằng Terraform, Kubernetes và CI/CD.

---

## 🏗️ Hạ tầng (Infrastructure - Terraform)

Toàn bộ tài nguyên hạ tầng tự động hóa trên AWS được quản lý trong thư mục `infra/` theo mô hình Multi-AZ chuẩn Production:

* **VPC**: Cấu hình DNS hostnames và DNS support.
* **Public Subnets**: Đặt Internet Gateway, Application Load Balancer (ALB) và NAT Gateway.
* **Private App Subnets**: Dành riêng cho EKS Worker Nodes (chạy Frontend/Backend Pods), kết nối Internet qua NAT Gateway.
* **Private Database Subnets**: Dành riêng cho RDS PostgreSQL, cách ly hoàn toàn khỏi Internet.
* **RDS PostgreSQL**: Cấu hình DB Subnet Group phủ qua 2 Availability Zones (`ap-south-1a`, `ap-south-1b`), Security Group giới hạn kết nối qua port 5432 nội bộ từ App Subnets.

---

## 📁 Cấu trúc thư mục `infra/`

```text
infra/
├── .gitkeep
├── provider.tf        # Khai báo nhà cung cấp AWS
├── variables.tf       # Khai báo các biến đầu vào (Region, VPC CIDR, DB Credentials)
├── terraform.tfvars   # Gán giá trị cụ thể cho các biến môi trường
├── network.tf         # Cấu hình VPC Multi-AZ, Public/Private Subnets, IGW, NAT Gateway, Route Tables
└── database.tf        # Cấu hình RDS Subnet Group, Security Group & PostgreSQL Instance