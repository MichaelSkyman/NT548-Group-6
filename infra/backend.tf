# State của Terraform lưu trên S3 để cả nhóm dùng chung một state (không mỗi người một bản).
#
# Block backend KHÔNG đọc được biến, nên bucket và region truyền khi init:
#   cp infra/backend.hcl.example infra/backend.hcl     # điền tên bucket lấy từ output của infra/bootstrap
#   terraform -chdir=infra init -backend-config=backend.hcl
#
# Chỉ để kiểm tra cú pháp (CI, máy không có AWS):
#   terraform -chdir=infra init -backend=false
#
# use_lockfile: khoá state bằng một file .tflock ngay trong S3 (Terraform >= 1.10),
# nên không cần bảng DynamoDB nữa.
terraform {
  backend "s3" {
    key          = "nt548/terraform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}
