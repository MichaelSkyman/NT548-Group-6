# Stack "bootstrap": tạo S3 bucket chứa state cho stack chính (infra/).
#
# Vì sao tách riêng: stack chính cần bucket này để lưu state, nên bucket không thể do chính nó tạo
# (con gà và quả trứng). Stack này dùng state LOCAL (file terraform.tfstate cạnh đây, đã bị
# .gitignore chặn); chỉ chạy một lần, và vì nhỏ nên mất state cũng dễ import lại.
#
# Cách chạy (một lần, trên máy có quyền AWS):
#   terraform -chdir=infra/bootstrap init
#   terraform -chdir=infra/bootstrap apply
#   terraform -chdir=infra/bootstrap output -raw state_bucket     # dán vào infra/backend.hcl

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "aws_region" {
  description = "Region của bucket state (nên trùng region của stack chính)"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Tiền tố tên tài nguyên"
  type        = string
  default     = "nt548-group6"
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      Component = "terraform-state"
    }
  }
}

data "aws_caller_identity" "current" {}

# Tên bucket phải duy nhất toàn cầu trên AWS nên gắn thêm account id.
locals {
  bucket_name = "${var.project_name}-tfstate-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "state" {
  bucket = local.bucket_name
}

# Bật versioning để khôi phục được state cũ nếu lỡ ghi đè hoặc hỏng
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# State chứa thông tin nhạy cảm (kể cả mật khẩu RDS), tuyệt đối không được public
resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "state_bucket" {
  description = "Tên bucket, điền vào infra/backend.hcl"
  value       = aws_s3_bucket.state.bucket
}
