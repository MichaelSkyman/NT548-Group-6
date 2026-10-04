# NT548-Group-6

test commit 

## 🏗️ Infrastructure (Terraform)

Hệ thống hạ tầng tự động hóa cho dự án được quản lý trong thư mục `infra/`.

### 📂 Sơ đồ cấu trúc thư mục `infra/`
```text
infra/
├── .gitkeep
├── variables.tf
└── terraform.tfvars
* **`variables.tf`**: Khai báo các biến cấu hình đầu vào:
  * `aws_region`: Khu vực AWS triển khai (`ap-southeast-1`).
  * `project_name`: Tiền tố tên định danh tài nguyên (`nt548-group6`).
  * `environment`: Môi trường triển khai (`dev`).
  * `vpc_cidr`: Dải địa chỉ IP cho VPC (`10.0.0.0/16`).

* **`terraform.tfvars`**: Gán giá trị thực tế cho các biến cấu hình:
  ```hcl
  aws_region   = "ap-southeast-1"
  project_name = "nt548-group6"
  environment  = "dev"
  vpc_cidr     = "10.0.0.0/16"